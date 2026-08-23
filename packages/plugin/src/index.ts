/** Host half of the one-click temporary Session plugin. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-host-directory-picker'
import { access, constants, mkdir } from 'node:fs/promises'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { TemporaryDirectoryReservations, DEFAULT_RESERVATION_RETENTION_MS, MIN_RESERVATION_RETENTION_MS } from './reservations.ts'
import { resolveReservationRetentionMs, resolveReservationRoot, type Config } from './config.ts'
import {
  normalizeTemporarySessionRoot,
  registerTemporarySessionSettings,
  TEMPORARY_SESSION_SETTINGS_NAMESPACE,
  type TemporarySessionSettings,
} from './settings.ts'
import type {
  TemporarySessionReservation,
  TemporarySessionReservationRef,
  TemporarySessionReservationResult,
  TemporarySessionRootPickResult,
  TemporarySessionSettingsSaveRequest,
  TemporarySessionSettingsView,
  TemporarySessionWorkspace,
  TemporaryWorkspaceSessionRef,
  TemporaryWorkspaceSessionResult,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Fixed scratch Workspace and legacy reservation service for the local Client. */
    temporarySessions: TemporarySessionService
  }
}

interface TemporaryWorkspaceEntity {
  readonly id: string
  readonly path: string
  attachSession(sessionId: string): Promise<void>
}

interface TemporaryWorkspaceRegistry {
  create(path: string): Promise<TemporaryWorkspaceEntity>
  insertBefore(workspaceId: string): Promise<readonly string[]>
}

/** Host service that prepares the configurable temporary Workspace and owns legacy reservations. */
export class TemporarySessionService extends TypertRemoteService {
  static inject = ['settings', 'directoryPicker', 'workspaceRegistry']

  static Config: z<Config> = z.object({
    root: z.string(),
    reservationRetentionMs: z.number().min(MIN_RESERVATION_RETENTION_MS).default(DEFAULT_RESERVATION_RETENTION_MS),
  })

  private readonly scope: SettingsScope<TemporarySessionSettings>
  private readonly context: Context
  private readonly defaultRoot: string
  private readonly retentionMs: number
  private readonly managers = new Map<string, TemporaryDirectoryReservations>()
  private readonly reservationManagers = new Map<string, TemporaryDirectoryReservations>()

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'temporarySessions')
    this.context = ctx
    this.defaultRoot = resolveReservationRoot(config)
    this.retentionMs = resolveReservationRetentionMs(config)
    this.scope = registerTemporarySessionSettings(ctx, config)
    this.manager(this.scope.get().root)
  }

  /**
   * Prepare the one durable Workspace shared by all temporary Sessions.
   * @returns the absolute Host path that the Workspace API should register.
   */
  @Remote('prepareWorkspace')
  async prepareWorkspace(): Promise<TemporarySessionWorkspace> {
    const workspace = await this.ensureWorkspace()
    return { path: workspace.path, workspaceId: workspace.id }
  }

  /**
   * Account an already-created Host Session under the configured temporary
   * Workspace. Workspace validates that the Session cwd equals the configured
   * root, so callers cannot use this seam to relabel project Sessions.
   */
  async attachSession(request: TemporaryWorkspaceSessionRef): Promise<TemporaryWorkspaceSessionResult> {
    const workspace = await this.ensureWorkspace()
    await workspace.attachSession(request.sessionId)
    return { attached: true, workspaceId: workspace.id }
  }

  /**
   * Reserve one isolated working directory for a not-yet-created Session.
   * @returns the opaque reservation id and its new absolute path.
   */
  @Remote('reserve')
  async reserve(): Promise<TemporarySessionReservation> {
    const manager = this.manager(this.scope.get().root)
    const reservation = await manager.reserve()
    this.reservationManagers.set(reservation.reservationId, manager)
    return reservation
  }

  /**
   * Mark a reservation as adopted while retaining its directory.
   * @param request - opaque reservation minted by `reserve`.
   * @returns whether the reservation was still live.
   */
  @Remote('keep')
  async keep(request: TemporarySessionReservationRef): Promise<TemporarySessionReservationResult> {
    const manager = this.reservationManagers.get(request.reservationId)
    if (manager === undefined) return { found: false }
    const result = await manager.keep(request.reservationId)
    if (result.found) this.reservationManagers.delete(request.reservationId)
    return result
  }

  /**
   * Remove a reservation that failed before a Session adopted it.
   * @param request - opaque reservation minted by `reserve`.
   * @returns whether the reservation was still live and removed.
   */
  @Remote('discard')
  async discard(request: TemporarySessionReservationRef): Promise<TemporarySessionReservationResult> {
    const manager = this.reservationManagers.get(request.reservationId)
    if (manager === undefined) return { found: false }
    const result = await manager.discard(request.reservationId)
    if (result.found) this.reservationManagers.delete(request.reservationId)
    return result
  }

  /** Read the live directory setting and picker availability for the Web card. */
  @Remote('describeSettings')
  async describeSettings(): Promise<TemporarySessionSettingsView> {
    return this.settingsView()
  }

  /** Validate, persist, and activate a new fixed Workspace directory. */
  @Remote('saveSettings')
  async saveSettings(request: TemporarySessionSettingsSaveRequest): Promise<TemporarySessionSettingsView> {
    const root = normalizeTemporarySessionRoot(request.root)
    await mkdir(root, { recursive: true, mode: 0o700 })
    await access(root, constants.W_OK | constants.X_OK)
    await this.context.settings.replace(TEMPORARY_SESSION_SETTINGS_NAMESPACE, { root }, request.expectedRevision)
    this.manager(root)
    return this.settingsView()
  }

  /** Open the Host-native directory chooser when the active backend supports one. */
  @Remote('pickRoot')
  async pickRoot(): Promise<TemporarySessionRootPickResult> {
    const capability = this.context.directoryPicker.capability()
    if (capability.kind !== 'native') return { supported: false, path: null }
    const path = await capability.pick(new AbortController().signal)
    return { supported: true, path: path === null ? null : normalizeTemporarySessionRoot(path) }
  }

  private manager(input: string): TemporaryDirectoryReservations {
    const root = normalizeTemporarySessionRoot(input)
    const current = this.managers.get(root)
    if (current !== undefined) return current
    const manager = new TemporaryDirectoryReservations(root, this.retentionMs)
    this.managers.set(root, manager)
    // A Host crash may have left pending markers. Each selected root is swept
    // once when it becomes live; adopted Session directories have no marker.
    void manager.sweepAbandoned().catch(() => undefined)
    return manager
  }

  private async ensureWorkspace(): Promise<TemporaryWorkspaceEntity> {
    const prepared = await this.manager(this.scope.get().root).prepareWorkspace()
    const registry = (this.context as Context & { workspaceRegistry: TemporaryWorkspaceRegistry }).workspaceRegistry
    const workspace = await registry.create(prepared.path)
    await registry.insertBefore(workspace.id)
    return workspace
  }

  private settingsView(): TemporarySessionSettingsView {
    const descriptor = this.context.settings.describe({ redactSecrets: true })
      .find(candidate => candidate.ns === TEMPORARY_SESSION_SETTINGS_NAMESPACE)
    if (descriptor === undefined) throw new Error('temporary-session settings namespace is unavailable')
    return {
      revision: descriptor.revision,
      writable: this.context.settings.writable,
      pickerSupported: this.context.directoryPicker.capability().kind === 'native',
      defaultRoot: this.defaultRoot,
      root: normalizeTemporarySessionRoot(this.scope.get().root),
    }
  }
}

export { TemporaryDirectoryReservations, DEFAULT_RESERVATION_RETENTION_MS, MIN_RESERVATION_RETENTION_MS } from './reservations.ts'
export { resolveReservationRetentionMs, resolveReservationRoot } from './config.ts'
export type { Config } from './config.ts'
export * from './settings.ts'
export type {
  TemporarySessionReservation,
  TemporarySessionReservationRef,
  TemporarySessionReservationResult,
  TemporarySessionSweepResult,
  TemporarySessionRootPickResult,
  TemporarySessionSettingsSaveRequest,
  TemporarySessionSettingsView,
  TemporarySessionWorkspace,
  TemporaryWorkspaceSessionRef,
  TemporaryWorkspaceSessionResult,
} from './types.ts'
export default TemporarySessionService
