/** Transactional client workflow for creating and opening one isolated temporary Workspace. */

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
  rename: (workspaceId: WorkspaceId, title: string) => Promise<unknown>
  insertBefore: (workspaceId: WorkspaceId, beforeWorkspaceId?: WorkspaceId) => Promise<void>
  delete: (workspaceId: WorkspaceId) => Promise<void>
}

/** Minimal Session navigation face consumed by the workflow. */
export interface TemporaryWorkspaceNavigationPort<SessionId> {
  open: (sessionId: SessionId) => void
}

/** Diagnostic sink for best-effort presentation and cleanup failures. */
export interface TemporaryWorkspaceDiagnostics {
  warn: (message: string, error: unknown) => void
}

/** Completion details useful to callers and tests. */
export interface TemporaryWorkspaceStartResult<WorkspaceId, SessionId> {
  readonly path: string
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
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

/** Give each generated Workspace a recognizable, collision-safe display title. */
function generatedWorkspaceTitle(path: string, title: string): string {
  const basename = path.replace(/[\\/]+$/, '').split(/[\\/]/).at(-1) ?? path
  return `${title} · ${basename}`
}

/**
 * Allocate a unique child below the configured root, register that child as a
 * Workspace, create its first Session, and retain both for history/resume.
 * Every invocation starts from a fresh reservation, so blank-session reuse can
 * never cross temporary Workspace boundaries.
 */
export async function startTemporaryWorkspace<WorkspaceId, SessionId>(ports: {
  readonly remote: TemporaryWorkspaceRemotePort
  readonly workspaces: TemporaryWorkspaceRegistryPort<WorkspaceId, SessionId>
  readonly sessions: TemporaryWorkspaceNavigationPort<SessionId>
  readonly title: string
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

  // Naming and ordering are presentation-only. Either may fail without
  // sacrificing an otherwise valid isolated Workspace.
  try {
    await ports.workspaces.rename(
      workspace.workspaceId,
      generatedWorkspaceTitle(workspace.path, ports.title),
    )
  } catch (error) {
    diagnostics.warn('temporary Workspace rename failed', error)
  }
  try {
    await ports.workspaces.insertBefore(workspace.workspaceId)
  } catch (error) {
    diagnostics.warn('temporary Workspace ordering failed', error)
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
  return {
    path: workspace.path,
    workspaceId: workspace.workspaceId,
    sessionId,
  }
}
