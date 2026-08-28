/** Transactional client workflow for opening one isolated temporary Session. */

/** Structural result used by generated Typert Remote methods. */
export type RemoteResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

/** Minimal generated Remote face consumed by the workflow. */
export interface TemporaryWorkspaceRemotePort {
  reserve: () => Promise<RemoteResult<{ reservationId: string; path: string }>>
  adopt: (request: { reservationId: string; sessionId: string }) => Promise<RemoteResult<{ found: boolean; workspaceId?: string }>>
  retain: (request: { reservationId: string }) => Promise<RemoteResult<{ found: boolean }>>
  discard: (request: { reservationId: string }) => Promise<RemoteResult<{ found: boolean }>>
}

/** Minimal Workspace service face consumed by the workflow. */
export interface TemporaryWorkspaceRegistryPort<WorkspaceId, SessionId> {
  create: (input: { path: string }) => Promise<{
    workspaceId: WorkspaceId
    path: string
    title: string
  }>
  connectWorkspace: (workspaceId: WorkspaceId) => Promise<SessionId>
  delete: (workspaceId: WorkspaceId) => Promise<void>
}

/** Minimal Session navigation face consumed by the workflow. */
export interface TemporaryWorkspaceNavigationPort<SessionId> {
  open: (sessionId: SessionId) => void
}

/** Diagnostic sink for best-effort accounting and cleanup failures. */
export interface TemporaryWorkspaceDiagnostics {
  warn: (message: string, error: unknown) => void
}

/** Completion details useful to callers and tests. */
export interface TemporaryWorkspaceStartResult<WorkspaceId, SessionId> {
  readonly path: string
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
  /** Whether the temporary registration was removed so the Session is Ungrouped. */
  readonly workspaceDetached: boolean
}

/** Turn a generated Remote failure into one workflow error. */
function remoteError(operation: string, result: RemoteResult<unknown> & { readonly ok: false }): Error {
  return new Error(`${operation} failed: ${result.error.code}: ${result.error.message}`)
}

/** Best-effort retirement of one opaque Host reservation. */
async function retire(
  remote: TemporaryWorkspaceRemotePort,
  operation: 'retain' | 'discard',
  reservationId: string,
  diagnostics: TemporaryWorkspaceDiagnostics,
): Promise<void> {
  try {
    const result = await remote[operation]({ reservationId })
    if (!result.ok) diagnostics.warn(`temporary Workspace ${operation} failed`, remoteError(operation, result))
    else if (!result.value.found) diagnostics.warn(`temporary Workspace ${operation} found no live reservation`, reservationId)
  } catch (error) {
    diagnostics.warn(`temporary Workspace ${operation} failed`, error)
  }
}

/** Adopt a created Session, falling back to retention if accounting fails. */
async function adopt(
  remote: TemporaryWorkspaceRemotePort,
  reservationId: string,
  sessionId: string,
  diagnostics: TemporaryWorkspaceDiagnostics,
): Promise<void> {
  try {
    const result = await remote.adopt({ reservationId, sessionId })
    if (result.ok && result.value.found) return
    const error = result.ok
      ? new Error('temporary Workspace adoption found no live reservation')
      : remoteError('temporary Workspace adoption', result)
    diagnostics.warn('temporary Workspace adoption failed', error)
  } catch (error) {
    diagnostics.warn('temporary Workspace adoption failed', error)
  }
  await retire(remote, 'retain', reservationId, diagnostics)
}

/**
 * Allocate a unique child below the configured root, use a short-lived
 * Workspace registration to create its first Session, then remove only that
 * registration. The directory and Session remain durable, and the Session is
 * shown under the sidebar's fixed-last Ungrouped section instead of creating a
 * competing Workspace group.
 */
export async function startTemporaryWorkspace<WorkspaceId, SessionId>(ports: {
  readonly remote: TemporaryWorkspaceRemotePort
  readonly workspaces: TemporaryWorkspaceRegistryPort<WorkspaceId, SessionId>
  readonly sessions: TemporaryWorkspaceNavigationPort<SessionId>
  readonly diagnostics?: TemporaryWorkspaceDiagnostics
}): Promise<TemporaryWorkspaceStartResult<WorkspaceId, SessionId>> {
  const diagnostics = ports.diagnostics ?? console
  const reserved = await ports.remote.reserve()
  if (!reserved.ok) throw remoteError('temporary Workspace reservation', reserved)
  const reservation = reserved.value

  let workspace: { workspaceId: WorkspaceId; path: string; title: string }
  try {
    workspace = await ports.workspaces.create({ path: reservation.path })
  } catch (error) {
    await retire(ports.remote, 'discard', reservation.reservationId, diagnostics)
    throw error
  }

  let sessionId: SessionId
  try {
    sessionId = await ports.workspaces.connectWorkspace(workspace.workspaceId)
  } catch (error) {
    try {
      await ports.workspaces.delete(workspace.workspaceId)
      await retire(ports.remote, 'discard', reservation.reservationId, diagnostics)
    } catch (cleanupError) {
      diagnostics.warn('temporary Workspace rollback failed; preserving its registered directory', cleanupError)
      await retire(ports.remote, 'retain', reservation.reservationId, diagnostics)
    }
    throw error
  }

  await adopt(ports.remote, reservation.reservationId, String(sessionId), diagnostics)
  ports.sessions.open(sessionId)

  // The Workspace is only a creation bridge. Removing its registration leaves
  // the Session and files intact while placing the Session in Ungrouped.
  try {
    await ports.workspaces.delete(workspace.workspaceId)
    return {
      path: workspace.path,
      workspaceId: workspace.workspaceId,
      sessionId,
      workspaceDetached: true,
    }
  } catch (error) {
    diagnostics.warn('temporary Workspace opened but its registration remains', error)
    return {
      path: workspace.path,
      workspaceId: workspace.workspaceId,
      sessionId,
      workspaceDetached: false,
    }
  }
}
