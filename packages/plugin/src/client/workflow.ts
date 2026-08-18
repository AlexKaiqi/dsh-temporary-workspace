/** Transactional client workflow for creating and opening one scratch Session. */

/** Structural result used by generated Typert Remote methods. */
export type RemoteResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

/** Minimal generated Remote face consumed by the workflow. */
export interface TemporarySessionRemotePort {
  reserve: () => Promise<RemoteResult<{ reservationId: string; path: string }>>
  keep: (request: { reservationId: string }) => Promise<RemoteResult<{ found: boolean }>>
  discard: (request: { reservationId: string }) => Promise<RemoteResult<{ found: boolean }>>
}

/** Minimal Workspace service face consumed by the workflow. */
export interface TemporarySessionWorkspacePort<WorkspaceId, SessionId> {
  create: (input: { path: string }) => Promise<{ workspaceId: WorkspaceId }>
  connectWorkspace: (workspaceId: WorkspaceId) => Promise<SessionId>
  delete: (workspaceId: WorkspaceId) => Promise<void>
}

/** Minimal Session navigation face consumed by the workflow. */
export interface TemporarySessionNavigationPort<SessionId> {
  open: (sessionId: SessionId) => void
}

/** Diagnostic sink for best-effort cleanup failures. */
export interface TemporarySessionDiagnostics {
  warn: (message: string, error: unknown) => void
}

/** Completion details useful to callers and tests. */
export interface TemporarySessionStartResult<SessionId> {
  readonly sessionId: SessionId
  /** False only when Workspace deregistration failed after the Session opened. */
  readonly workspaceDetached: boolean
}

/** Turn a generated Remote failure into the one user-facing workflow error. */
function remoteError(operation: string, result: RemoteResult<unknown> & { readonly ok: false }): Error {
  return new Error(`${operation} failed: ${result.error.code}: ${result.error.message}`)
}

/** Best-effort retirement of the opaque Host reservation. */
async function retire(
  remote: TemporarySessionRemotePort,
  operation: 'keep' | 'discard',
  reservationId: string,
  diagnostics: TemporarySessionDiagnostics,
): Promise<void> {
  try {
    const result = await remote[operation]({ reservationId })
    if (!result.ok) diagnostics.warn(`temporary session ${operation} failed`, remoteError(operation, result))
  } catch (error) {
    diagnostics.warn(`temporary session ${operation} failed`, error)
  }
}

/**
 * Create an isolated directory, materialize a Session through the ordinary
 * Workspace API, open it, and remove only the temporary Workspace account.
 * @param ports - narrow Host Remote, Workspace, navigation, and diagnostic faces.
 * @returns the opened Session id and whether Workspace deregistration succeeded.
 */
export async function startTemporarySession<WorkspaceId, SessionId>(ports: {
  readonly remote: TemporarySessionRemotePort
  readonly workspaces: TemporarySessionWorkspacePort<WorkspaceId, SessionId>
  readonly sessions: TemporarySessionNavigationPort<SessionId>
  readonly diagnostics?: TemporarySessionDiagnostics
}): Promise<TemporarySessionStartResult<SessionId>> {
  const diagnostics = ports.diagnostics ?? console
  const reserved = await ports.remote.reserve()
  if (!reserved.ok) throw remoteError('temporary session reservation', reserved)
  const reservation = reserved.value

  let workspace: { workspaceId: WorkspaceId }
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
      diagnostics.warn('temporary session rollback failed; preserving its registered directory', cleanupError)
      await retire(ports.remote, 'keep', reservation.reservationId, diagnostics)
    }
    throw error
  }

  await retire(ports.remote, 'keep', reservation.reservationId, diagnostics)
  ports.sessions.open(sessionId)

  try {
    await ports.workspaces.delete(workspace.workspaceId)
    return { sessionId, workspaceDetached: true }
  } catch (error) {
    diagnostics.warn('temporary session opened but its Workspace registration remains', error)
    return { sessionId, workspaceDetached: false }
  }
}
