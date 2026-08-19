/** Host configuration facts for scratch-directory placement. */

import { resolve } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import {
  DEFAULT_RESERVATION_RETENTION_MS,
  MIN_RESERVATION_RETENTION_MS,
} from './reservations.ts'

/** Host configuration for scratch-directory placement. */
export interface Config {
  /** Durable parent directory. Defaults to `$DSH_HOME/temporary-sessions`. */
  readonly root?: string
  /**
   * Grace before an unadopted reservation is treated as abandoned and reclaimed.
   * Defaults to one hour; values below one minute are raised to that floor so a
   * reservation is never swept while a Session is still adopting it.
   */
  readonly reservationRetentionMs?: number
}

/**
 * Resolve the single runtime root every reservation path derives from.
 *
 * All persistent state this plugin owns lives under exactly one directory, so
 * there is one thing to configure, back up, or relocate. Reservation directories
 * are created inside it by `mkdtemp` and are never addressed by a
 * caller-supplied path.
 *
 * Kept out of the service module so configuration can be resolved and tested
 * without loading the decorated Remote class.
 *
 * @param config - host configuration.
 * @returns the absolute root directory.
 */
export function resolveReservationRoot(config: Config): string {
  return resolve(config.root ?? dshHomePath('temporary-sessions'))
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
