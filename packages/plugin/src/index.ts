/** Host half of the one-click temporary Workspace plugin. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-host-directory-picker'
import { access, constants, mkdir } from 'node:fs/promises'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { TemporaryWorkspaceReservations, DEFAULT_RESERVATION_RETENTION_MS, MIN_RESERVATION_RETENTION_MS } from './reservations.ts'
import { resolveReservationRetentionMs, resolveTemporaryWorkspaceRoot, type Config } from './config.ts'
import {
  normalizeTemporaryWorkspaceRoot,
  registerTemporaryWorkspaceSettings,
  TEMPORARY_WORKSPACE_SETTINGS_NAMESPACE,
  type TemporaryWorkspaceSettings,
} from './settings.ts'
import type {
  TemporaryWorkspaceAdoptionRef,
  TemporaryWorkspaceAdoptionResult,
  TemporaryWorkspaceReservation,
  TemporaryWorkspaceReservationRef,
  TemporaryWorkspaceReservationResult,
  TemporaryWorkspaceRootPickResult,
  TemporaryWorkspaceSettingsSaveRequest,
  TemporaryWorkspaceSettingsView,
} from './types.ts'

interface TemporaryWorkspaceEntity {
  readonly id: string
  readonly path: string
  attachSession(sessionId: string): Promise<void>
}

interface TemporaryWorkspaceRegistry {
  create(path: string): Promise<TemporaryWorkspaceEntity>
  insertBefore(workspaceId: string): Promise<readonly string[]>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Isolated temporary-Workspace reservation service for the local Client. */
    temporaryWorkspaces: TemporaryWorkspaceService
  }
}

/** Host service that allocates isolated Workspaces below one configurable root. */
export class TemporaryWorkspaceService extends TypertRemoteService {
  static inject = ['settings', 'directoryPicker', 'workspaceRegistry']

  static Config: z<Config> = z.object({
    root: z.string(),
    reservationRetentionMs: z.number().min(MIN_RESERVATION_RETENTION_MS).default(DEFAULT_RESERVATION_RETENTION_MS),
  })

  private readonly scope: SettingsScope<TemporaryWorkspaceSettings>
  private readonly context: Context
  private readonly defaultRoot: string
  private readonly retentionMs: number
  private readonly managers = new Map<string, TemporaryWorkspaceReservations>()
  private readonly reservationManagers = new Map<string, TemporaryWorkspaceReservations>()

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'temporaryWorkspaces')
    this.context = ctx
    this.defaultRoot = resolveTemporaryWorkspaceRoot(config)
    this.retentionMs = resolveReservationRetentionMs(config)
    this.scope = registerTemporaryWorkspaceSettings(ctx, config)
    this.manager(this.scope.get().root)
  }

  /**
   * Reserve one isolated child directory for a not-yet-created Workspace.
   * @returns the opaque reservation id and its new absolute path.
   */
  @Remote('reserve')
  async reserve(): Promise<TemporaryWorkspaceReservation> {
    const manager = this.manager(this.scope.get().root)
    const reservation = await manager.reserve()
    this.reservationManagers.set(reservation.reservationId, manager)
    return reservation
  }

  /** Register the reserved path as a Workspace and attach its created Session. */
  @Remote('adopt')
  async adopt(request: TemporaryWorkspaceAdoptionRef): Promise<TemporaryWorkspaceAdoptionResult> {
    const manager = this.reservationManagers.get(request.reservationId)
    if (manager === undefined) return { found: false }
    const path = manager.pathOf(request.reservationId)
    if (path === undefined) return { found: false }
    try {
      const registry = (this.context as Context & { workspaceRegistry: TemporaryWorkspaceRegistry }).workspaceRegistry
      const workspace = await registry.create(path)
      await workspace.attachSession(request.sessionId)
      try {
        await registry.insertBefore(workspace.id)
      } catch (error) {
        // Ordering is presentation-only. The Workspace and Session are already
        // durably associated, so an ordering failure must not reject adoption.
        console.warn('[temporary-workspace] Workspace ordering failed', error)
      }
      const result = await manager.keep(request.reservationId)
      if (!result.found) return { found: false }
      this.reservationManagers.delete(request.reservationId)
      return { found: true, workspaceId: workspace.id }
    } catch (error) {
      // The caller creates the Session before adoption. Preserve its cwd even
      // when accounting fails, otherwise a later sweep could delete live work.
      await manager.keep(request.reservationId).catch(() => undefined)
      this.reservationManagers.delete(request.reservationId)
      throw error
    }
  }

  /** Retain a reservation when rollback cannot remove its Workspace record. */
  @Remote('retain')
  async retain(request: TemporaryWorkspaceReservationRef): Promise<TemporaryWorkspaceReservationResult> {
    const manager = this.reservationManagers.get(request.reservationId)
    if (manager === undefined) return { found: false }
    const result = await manager.keep(request.reservationId)
    if (result.found) this.reservationManagers.delete(request.reservationId)
    return result
  }

  /**
   * Remove a reservation that failed before a Workspace adopted it.
   * @param request - opaque reservation minted by `reserve`.
   * @returns whether the reservation was still live and removed.
   */
  @Remote('discard')
  async discard(request: TemporaryWorkspaceReservationRef): Promise<TemporaryWorkspaceReservationResult> {
    const manager = this.reservationManagers.get(request.reservationId)
    if (manager === undefined) return { found: false }
    const result = await manager.discard(request.reservationId)
    if (result.found) this.reservationManagers.delete(request.reservationId)
    return result
  }

  /** Read the live directory setting and picker availability for the Web card. */
  @Remote('describeSettings')
  async describeSettings(): Promise<TemporaryWorkspaceSettingsView> {
    return this.settingsView()
  }

  /** Validate, persist, and activate a new parent for future Workspaces. */
  @Remote('saveSettings')
  async saveSettings(request: TemporaryWorkspaceSettingsSaveRequest): Promise<TemporaryWorkspaceSettingsView> {
    const root = normalizeTemporaryWorkspaceRoot(request.root)
    await mkdir(root, { recursive: true, mode: 0o700 })
    await access(root, constants.W_OK | constants.X_OK)
    await this.context.settings.replace(TEMPORARY_WORKSPACE_SETTINGS_NAMESPACE, { root }, request.expectedRevision)
    this.manager(root)
    return this.settingsView()
  }

  /** Open the Host-native directory chooser when the active backend supports one. */
  @Remote('pickRoot')
  async pickRoot(): Promise<TemporaryWorkspaceRootPickResult> {
    const capability = this.context.directoryPicker.capability()
    if (capability.kind !== 'native') return { supported: false, path: null }
    const path = await capability.pick(new AbortController().signal)
    return { supported: true, path: path === null ? null : normalizeTemporaryWorkspaceRoot(path) }
  }

  private manager(input: string): TemporaryWorkspaceReservations {
    const root = normalizeTemporaryWorkspaceRoot(input)
    const current = this.managers.get(root)
    if (current !== undefined) return current
    const manager = new TemporaryWorkspaceReservations(root, this.retentionMs)
    this.managers.set(root, manager)
    // A Host crash may have left pending markers. Each selected root is swept
    // once when it becomes live; adopted Session directories have no marker.
    void manager.sweepAbandoned().catch(() => undefined)
    return manager
  }

  private settingsView(): TemporaryWorkspaceSettingsView {
    const descriptor = this.context.settings.describe({ redactSecrets: true })
      .find(candidate => candidate.ns === TEMPORARY_WORKSPACE_SETTINGS_NAMESPACE)
    if (descriptor === undefined) throw new Error('temporary Workspace settings namespace is unavailable')
    return {
      revision: descriptor.revision,
      writable: this.context.settings.writable,
      pickerSupported: this.context.directoryPicker.capability().kind === 'native',
      defaultRoot: this.defaultRoot,
      root: normalizeTemporaryWorkspaceRoot(this.scope.get().root),
    }
  }
}

export { TemporaryWorkspaceReservations, DEFAULT_RESERVATION_RETENTION_MS, MIN_RESERVATION_RETENTION_MS } from './reservations.ts'
export { resolveReservationRetentionMs, resolveTemporaryWorkspaceRoot } from './config.ts'
export type { Config } from './config.ts'
export * from './settings.ts'
export type {
  TemporaryWorkspaceAdoptionRef,
  TemporaryWorkspaceAdoptionResult,
  TemporaryWorkspaceReservation,
  TemporaryWorkspaceReservationRef,
  TemporaryWorkspaceReservationResult,
  TemporaryWorkspaceSweepResult,
  TemporaryWorkspaceRootPickResult,
  TemporaryWorkspaceSettingsSaveRequest,
  TemporaryWorkspaceSettingsView,
} from './types.ts'
export default TemporaryWorkspaceService
