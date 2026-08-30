/** Host configuration facts for scratch-directory placement. */

import { resolve } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import {
  DEFAULT_RESERVATION_RETENTION_MS,
  MIN_RESERVATION_RETENTION_MS,
} from './reservations.ts'

/** Host configuration for scratch-directory placement. */
export interface Config {
  /** Parent for isolated scratch Workspaces. Defaults to `$DSH_HOME/temporary-workspaces`. */
  readonly root?: string
  /**
   * Grace before an unadopted reservation is treated as abandoned and reclaimed.
   * Defaults to one hour; values below one minute are raised to that floor so a
   * reservation is never swept while a Session is still adopting it.
   */
  readonly reservationRetentionMs?: number
}

/**
 * Resolve the parent for isolated temporary Workspace directories.
 *
 * Every reservation creates one direct `workspace-*` child below it. Cleanup
 * addresses those children only through opaque reservation ids.
 *
 * Kept out of the service module so configuration can be resolved and tested
 * without loading the decorated Remote class.
 *
 * @param config - host configuration.
 * @returns the absolute root directory.
 */
export function resolveTemporaryWorkspaceRoot(config: Config): string {
  return resolve(config.root ?? dshHomePath('temporary-workspaces'))
}


/**
 * Resolve the reservation grace period, applying the safety floor.
 * @param config - host configuration.
 * @returns the retention in milliseconds, never below the floor.
 */
export function resolveReservationRetentionMs(config: Config): number {
  return Math.max(
    MIN_RESERVATION_RETENTION_MS,
    config.reservationRetentionMs ?? DEFAULT_RESERVATION_RETENTION_MS,
  )
}
