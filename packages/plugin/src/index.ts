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
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Scratch-directory reservation service exported to the local Client. */
    temporarySessions: TemporarySessionService
  }
}

/** Host Remote that allocates opaque, safely disposable scratch directories. */
export class TemporarySessionService extends TypertRemoteService {
  static inject = ['settings', 'directoryPicker']

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

  /** Validate, persist, and activate a new parent directory for future reservations. */
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
} from './types.ts'
export default TemporarySessionService
