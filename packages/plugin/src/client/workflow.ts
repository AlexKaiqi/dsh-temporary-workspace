/** Transactional client workflow for creating and opening one scratch Session. */

/** Structural result used by generated Typert Remote methods. */
export type RemoteResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

/** Minimal generated Remote face consumed by the workflow. */
export interface TemporarySessionRemotePort {
  prepareWorkspace: () => Promise<RemoteResult<{ path: string, workspaceId: string }>>
}

/** Minimal Workspace service face consumed by the workflow. */
export interface TemporarySessionWorkspacePort<WorkspaceId, SessionId> {
  create: (input: { path: string }) => Promise<{
    workspaceId: WorkspaceId
    path: string
    title: string
  }>
  connectWorkspace: (workspaceId: WorkspaceId) => Promise<SessionId>
  rename: (workspaceId: WorkspaceId, title: string) => Promise<unknown>
  insertBefore: (workspaceId: WorkspaceId, beforeWorkspaceId?: WorkspaceId) => Promise<void>
}

/** Fixed Workspace details shared by startup and legacy one-click flows. */
export interface TemporarySessionWorkspaceResult<WorkspaceId> {
  readonly workspaceId: WorkspaceId
}

/** Minimal Session navigation face consumed by the workflow. */
export interface TemporarySessionNavigationPort<SessionId> {
  open: (sessionId: SessionId) => void
}

/** Completion details useful to callers and tests. */
export interface TemporarySessionStartResult<SessionId> {
  readonly sessionId: SessionId
}

/** WorkspaceRegistry's create-time title is the canonical path basename. */
function defaultWorkspaceTitle(path: string): string {
  return path.replace(/[\\/]+$/, '').split(/[\\/]/).at(-1) ?? path
}

/**
 * Ensure the fixed scratch Workspace exists, give an untouched record its
 * localized title, and keep that special-purpose group below normal Workspaces.
 * Repeated calls are idempotent because Workspace create and insertBefore are.
 * @param ports - narrow Host Remote and Workspace faces.
 * @returns the fixed Workspace id.
 */
export async function ensureTemporaryWorkspace<WorkspaceId, SessionId>(ports: {
  readonly remote: TemporarySessionRemotePort
  readonly workspaces: TemporarySessionWorkspacePort<WorkspaceId, SessionId>
  readonly title: string
  readonly legacyTitles?: readonly string[]
}): Promise<TemporarySessionWorkspaceResult<WorkspaceId>> {
  const prepared = await ports.remote.prepareWorkspace()
  if (!prepared.ok) {
    throw new Error(`temporary Workspace preparation failed: ${prepared.error.code}: ${prepared.error.message}`)
  }
  const workspace = await ports.workspaces.create({ path: prepared.value.path })
  const migratesLegacyTitle = ports.legacyTitles?.includes(workspace.title) ?? false
  if ((workspace.title === defaultWorkspaceTitle(workspace.path) || migratesLegacyTitle) && workspace.title !== ports.title) {
    try {
      await ports.workspaces.rename(workspace.workspaceId, ports.title)
    } catch (error) {
      // Naming is presentation-only: a conflict must not block Workspace use.
      console.warn('[temporary-session] fixed Workspace rename failed', error)
    }
  }
  await ports.workspaces.insertBefore(workspace.workspaceId)
  return { workspaceId: workspace.workspaceId }
}

/**
 * Prepare one fixed scratch Workspace, connect its reusable or fresh blank
 * Session, and open that Session. Current shells use the Workspace group's own
 * action; this flow remains for the optional legacy extension event.
 * @param ports - narrow Host Remote, Workspace, and navigation faces.
 * @returns the opened Session id.
 */
export async function startTemporarySession<WorkspaceId, SessionId>(ports: {
  readonly remote: TemporarySessionRemotePort
  readonly workspaces: TemporarySessionWorkspacePort<WorkspaceId, SessionId>
  readonly sessions: TemporarySessionNavigationPort<SessionId>
  readonly title: string
  readonly legacyTitles?: readonly string[]
}): Promise<TemporarySessionStartResult<SessionId>> {
  const { workspaceId } = await ensureTemporaryWorkspace(ports)
  const sessionId = await ports.workspaces.connectWorkspace(workspaceId)
  ports.sessions.open(sessionId)
  return { sessionId }
}
