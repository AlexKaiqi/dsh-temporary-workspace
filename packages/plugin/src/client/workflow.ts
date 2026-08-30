/** Transactional workflow for creating one isolated temporary Session. */

/** Structural result used by generated Typert Remote methods. */
export type RemoteResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

/** Minimal generated Remote face consumed by the workflow. */
export interface TemporaryWorkspaceRemotePort {
  reserve: () => Promise<RemoteResult<{ reservationId: string; path: string }>>
  adopt: (request: {
    reservationId: string
    sessionId: string
  }) => Promise<RemoteResult<{ found: boolean; workspaceId?: string }>>
  retain: (request: { reservationId: string }) => Promise<RemoteResult<{ found: boolean }>>
  discard: (request: { reservationId: string }) => Promise<RemoteResult<{ found: boolean }>>
}

/** Minimal Workspace service face consumed by the workflow. */
export interface TemporaryWorkspaceRegistryPort<WorkspaceId> {
  create: (input: { path: string }) => Promise<{ workspaceId: WorkspaceId; path: string }>
  delete: (workspaceId: WorkspaceId) => Promise<void>
}

/** Minimal fresh-Session creation face consumed by the workflow. */
export interface TemporaryWorkspaceNavigationPort<WorkspaceId, SessionId> {
  create: (input: { workspaceId: WorkspaceId }) => Promise<SessionId>
}

/** Diagnostic sink for cleanup failures after the Session is durable. */
export interface TemporaryWorkspaceDiagnostics {
  warn: (message: string, error: unknown) => void
}

/** Completion details useful to the contributed group and tests. */
export interface TemporaryWorkspaceStartResult<WorkspaceId, SessionId> {
  readonly path: string
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
  readonly workspaceDetached: boolean
}

/** Turn a generated Remote failure into one workflow error. */
function remoteError(operation: string, result: RemoteResult<unknown> & { readonly ok: false }): Error {
  return new Error(`${operation} failed: ${result.error.code}: ${result.error.message}`)
}

/** Best-effort Remote cleanup whose failure is diagnostic, not a second outcome. */
async function settleRemote(
  operation: string,
  request: () => Promise<RemoteResult<{ found: boolean }>>,
  diagnostics: TemporaryWorkspaceDiagnostics,
): Promise<void> {
  try {
    const result = await request()
    if (!result.ok) diagnostics.warn(`${operation} failed`, remoteError(operation, result))
  } catch (error) {
    diagnostics.warn(`${operation} failed`, error)
  }
}

/**
 * Create a guaranteed-fresh Session in one reserved child directory. The
 * transient Host Workspace exists only long enough for Session creation and
 * exact-cwd attachment; sidebar grouping is a Client projection by cwd family.
 */
export async function startTemporaryWorkspace<WorkspaceId, SessionId>(ports: {
  readonly remote: TemporaryWorkspaceRemotePort
  readonly workspaces: TemporaryWorkspaceRegistryPort<WorkspaceId>
  readonly sessions: TemporaryWorkspaceNavigationPort<WorkspaceId, SessionId>
  readonly diagnostics?: TemporaryWorkspaceDiagnostics
}): Promise<TemporaryWorkspaceStartResult<WorkspaceId, SessionId>> {
  const diagnostics = ports.diagnostics ?? console
  const reserved = await ports.remote.reserve()
  if (!reserved.ok) throw remoteError('temporary Workspace reservation', reserved)
  const { reservationId, path } = reserved.value

  let workspace: { workspaceId: WorkspaceId; path: string }
  try {
    workspace = await ports.workspaces.create({ path })
  } catch (error) {
    await settleRemote(
      'temporary Workspace discard',
      () => ports.remote.discard({ reservationId }),
      diagnostics,
    )
    throw error
  }

  let sessionId: SessionId
  try {
    sessionId = await ports.sessions.create({ workspaceId: workspace.workspaceId })
  } catch (error) {
    try {
      await ports.workspaces.delete(workspace.workspaceId)
      await settleRemote(
        'temporary Workspace discard',
        () => ports.remote.discard({ reservationId }),
        diagnostics,
      )
    } catch (cleanupError) {
      diagnostics.warn(
        'temporary Workspace rollback failed; preserving its registered directory',
        cleanupError,
      )
      await settleRemote(
        'temporary Workspace retain',
        () => ports.remote.retain({ reservationId }),
        diagnostics,
      )
    }
    throw error
  }

  try {
    const adopted = await ports.remote.adopt({ reservationId, sessionId: String(sessionId) })
    if (!adopted.ok || !adopted.value.found) {
      const reason = adopted.ok
        ? new Error('temporary Workspace adoption returned no live reservation')
        : remoteError('temporary Workspace adoption', adopted)
      diagnostics.warn('temporary Workspace adoption failed; retaining its Session directory', reason)
      await settleRemote(
        'temporary Workspace retain',
        () => ports.remote.retain({ reservationId }),
        diagnostics,
      )
    }
  } catch (error) {
    diagnostics.warn('temporary Workspace adoption failed; retaining its Session directory', error)
    await settleRemote(
      'temporary Workspace retain',
      () => ports.remote.retain({ reservationId }),
      diagnostics,
    )
  }

  let workspaceDetached = true
  try {
    await ports.workspaces.delete(workspace.workspaceId)
  } catch (error) {
    workspaceDetached = false
    diagnostics.warn('temporary Workspace opened but its registration remains', error)
  }

  return { path: workspace.path, workspaceId: workspace.workspaceId, sessionId, workspaceDetached }
}
