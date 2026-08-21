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
  readonly list: {
    getSnapshot: () => {
      readonly byId: Readonly<Record<string, { readonly blank: boolean } | undefined>>
    }
    subscribe: (listener: () => void) => () => void
  }
  open: (sessionId: SessionId) => void
}

/** Diagnostic sink for best-effort cleanup failures. */
export interface TemporarySessionDiagnostics {
  warn: (message: string, error: unknown) => void
}

/** Completion details useful to callers and tests. */
export interface TemporarySessionStartResult<SessionId> {
  readonly sessionId: SessionId
  /** False at return time because detachment is deliberately deferred. */
  readonly workspaceDetached: false
  /** The temporary Workspace will be detached after the first prompt is accepted. */
  readonly workspaceDetachmentScheduled: true
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
 * Keep a blank Session attached so the composer can resolve its Workspace,
 * then detach once the first accepted prompt makes the Session self-sufficient.
 */
function detachWorkspaceAfterEngagement<WorkspaceId, SessionId>(ports: {
  readonly workspaces: TemporarySessionWorkspacePort<WorkspaceId, SessionId>
  readonly sessions: TemporarySessionNavigationPort<SessionId>
  readonly diagnostics: TemporarySessionDiagnostics
}, workspaceId: WorkspaceId, sessionId: SessionId): void {
  let unsubscribe: (() => void) | undefined
  let scheduled = false
  const reconcile = (): void => {
    if (scheduled) return
    const summary = ports.sessions.list.getSnapshot().byId[String(sessionId)]
    if (summary?.blank !== false) return
    scheduled = true
    unsubscribe?.()
    void ports.workspaces.delete(workspaceId).catch((error: unknown) => {
      ports.diagnostics.warn('temporary session engaged but its Workspace registration remains', error)
    })
  }
  unsubscribe = ports.sessions.list.subscribe(reconcile)
  reconcile()
  // Some observable implementations call the subscriber synchronously.
  if (scheduled) unsubscribe()
}

/**
 * Create an isolated directory, materialize a Session through the ordinary
 * Workspace API, open it, and retire the temporary Workspace account after
 * the first prompt is accepted. A blank Session must remain attached because
 * the current conversation shell disables its composer without an owning
 * Workspace.
 * @param ports - narrow Host Remote, Workspace, navigation, and diagnostic faces.
 * @returns the opened Session id and confirmation that deferred detachment is armed.
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
  detachWorkspaceAfterEngagement(
    { workspaces: ports.workspaces, sessions: ports.sessions, diagnostics },
    workspace.workspaceId,
    sessionId,
  )
  return { sessionId, workspaceDetached: false, workspaceDetachmentScheduled: true }
}
