/** Safe lifecycle owner for not-yet-adopted scratch directories. */

import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type {
  TemporarySessionReservation,
  TemporarySessionReservationResult,
} from './types.ts'

/** Creates unique scratch directories and allows only opaque-id cleanup. */
export class TemporaryDirectoryReservations {
  private readonly pending = new Map<string, string>()
  readonly root: string

  /** @param root - parent directory for every isolated temporary task. */
  constructor(root: string) {
    this.root = resolve(root)
  }

  /**
   * Allocate one private scratch directory.
   * @returns the opaque reservation id and its new absolute path.
   */
  async reserve(): Promise<TemporarySessionReservation> {
    await mkdir(this.root, { recursive: true, mode: 0o700 })
    const path = await mkdtemp(join(this.root, 'task-'))
    const reservationId = randomUUID()
    this.pending.set(reservationId, path)
    return { reservationId, path }
  }

  /**
   * Retire a reservation after a Session has adopted its directory. The
   * directory remains because the Session may be resumed later.
   * @param reservationId - opaque id minted by `reserve`.
   * @returns whether the reservation was still live.
   */
  keep(reservationId: string): TemporarySessionReservationResult {
    return { found: this.pending.delete(reservationId) }
  }

  /**
   * Remove an unadopted reservation without accepting a caller-supplied path.
   * @param reservationId - opaque id minted by `reserve`.
   * @returns whether the reservation was still live and removed.
   */
  async discard(reservationId: string): Promise<TemporarySessionReservationResult> {
    const path = this.pending.get(reservationId)
    if (path === undefined) return { found: false }
    this.pending.delete(reservationId)
    try {
      await rm(path, { recursive: true, force: true })
    } catch (error) {
      this.pending.set(reservationId, path)
      throw error
    }
    return { found: true }
  }
}
