/** Host half of the one-click temporary Session plugin. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { TemporaryDirectoryReservations } from './reservations.ts'
import type {
  TemporarySessionReservation,
  TemporarySessionReservationRef,
  TemporarySessionReservationResult,
} from './types.ts'

/** Host configuration for scratch-directory placement. */
export interface Config {
  /** Durable parent directory. Defaults to `$DSH_HOME/temporary-sessions`. */
  readonly root?: string
}

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
  })

  private readonly reservations: TemporaryDirectoryReservations

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'temporarySessions')
    this.reservations = new TemporaryDirectoryReservations(
      config.root ?? dshHomePath('temporary-sessions'),
    )
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
  keep(request: TemporarySessionReservationRef): TemporarySessionReservationResult {
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

export { TemporaryDirectoryReservations } from './reservations.ts'
export type {
  TemporarySessionReservation,
  TemporarySessionReservationRef,
  TemporarySessionReservationResult,
} from './types.ts'
export default TemporarySessionService
