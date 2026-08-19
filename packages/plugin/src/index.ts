/** Host half of the one-click temporary Session plugin. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { TemporaryDirectoryReservations, DEFAULT_RESERVATION_RETENTION_MS, MIN_RESERVATION_RETENTION_MS } from './reservations.ts'
import { resolveReservationRetentionMs, resolveReservationRoot, type Config } from './config.ts'
import type {
  TemporarySessionReservation,
  TemporarySessionReservationRef,
  TemporarySessionReservationResult,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Scratch-directory reservation service exported to the local Client. */
    temporarySessions: TemporarySessionService
  }
}

/** Host Remote that allocates opaque, safely disposable scratch directories. */
export class TemporarySessionService extends TypertRemoteService {
  static inject: string[] = []

  static Config: z<Config> = z.object({
    root: z.string(),
    reservationRetentionMs: z.number().min(MIN_RESERVATION_RETENTION_MS).default(DEFAULT_RESERVATION_RETENTION_MS),
  })

  private readonly reservations: TemporaryDirectoryReservations

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'temporarySessions')
    this.reservations = new TemporaryDirectoryReservations(
      resolveReservationRoot(config),
      resolveReservationRetentionMs(config),
    )
    // A Host that crashed between reserve and keep/discard left directories whose
    // reservation ids died with it. Reclaim them on startup so orphans cannot
    // accumulate across restarts even if no new reservation is ever requested.
    void this.reservations.sweepAbandoned().catch(() => undefined)
  }

  /**
   * Reserve one isolated working directory for a not-yet-created Session.
   * @returns the opaque reservation id and its new absolute path.
   */
  @Remote('reserve')
  reserve(): Promise<TemporarySessionReservation> {
    return this.reservations.reserve()
  }

  /**
   * Mark a reservation as adopted while retaining its directory.
   * @param request - opaque reservation minted by `reserve`.
   * @returns whether the reservation was still live.
   */
  @Remote('keep')
  keep(request: TemporarySessionReservationRef): Promise<TemporarySessionReservationResult> {
    return this.reservations.keep(request.reservationId)
  }

  /**
   * Remove a reservation that failed before a Session adopted it.
   * @param request - opaque reservation minted by `reserve`.
   * @returns whether the reservation was still live and removed.
   */
  @Remote('discard')
  discard(request: TemporarySessionReservationRef): Promise<TemporarySessionReservationResult> {
    return this.reservations.discard(request.reservationId)
  }
}

export { TemporaryDirectoryReservations, DEFAULT_RESERVATION_RETENTION_MS, MIN_RESERVATION_RETENTION_MS } from './reservations.ts'
export { resolveReservationRetentionMs, resolveReservationRoot } from './config.ts'
export type { Config } from './config.ts'
export type {
  TemporarySessionReservation,
  TemporarySessionReservationRef,
  TemporarySessionReservationResult,
  TemporarySessionSweepResult,
} from './types.ts'
export default TemporarySessionService
