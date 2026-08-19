/** Safe lifecycle owner for not-yet-adopted scratch directories. */

import { randomUUID } from 'node:crypto'
import type { Dirent } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type {
  TemporarySessionReservation,
  TemporarySessionReservationResult,
  TemporarySessionSweepResult,
} from './types.ts'

/**
 * Marker naming an outstanding, not-yet-adopted reservation.
 *
 * Written when the directory is reserved and removed when a Session adopts it,
 * so the marker's presence is exactly the crash window: if the Host dies between
 * `reserve` and `keep`/`discard`, the in-memory reservation id is lost and the
 * directory would otherwise be unreachable forever. Adopted directories carry no
 * marker and are therefore never swept.
 */
const PENDING_MARKER = '.reservation-pending'

/** Prefix given to every reserved directory by `mkdtemp`. */
const RESERVATION_PREFIX = 'task-'

/** Default grace before an unadopted reservation is treated as abandoned. */
export const DEFAULT_RESERVATION_RETENTION_MS = 3_600_000

/** Smallest accepted grace, so a live reservation is never swept mid-adoption. */
export const MIN_RESERVATION_RETENTION_MS = 60_000

/** Creates unique scratch directories and allows only opaque-id cleanup. */
export class TemporaryDirectoryReservations {
  private readonly pending = new Map<string, string>()
  readonly root: string
  /** Grace before an unadopted reservation is considered abandoned. */
  readonly retentionMs: number

  /**
   * @param root - parent directory for every isolated temporary task.
   * @param retentionMs - grace before an unadopted reservation is swept;
   *   clamped to at least {@link MIN_RESERVATION_RETENTION_MS}.
   */
  constructor(root: string, retentionMs: number = DEFAULT_RESERVATION_RETENTION_MS) {
    this.root = resolve(root)
    this.retentionMs = Math.max(MIN_RESERVATION_RETENTION_MS, retentionMs)
  }

  /**
   * Allocate one private scratch directory.
   *
   * Reclaims directories abandoned by an earlier Host process first, so orphans
   * cannot accumulate for the lifetime of the installation.
   *
   * @returns the opaque reservation id and its new absolute path.
   */
  async reserve(): Promise<TemporarySessionReservation> {
    await mkdir(this.root, { recursive: true, mode: 0o700 })
    // Best-effort: reclaiming is never allowed to fail an allocation.
    await this.sweepAbandoned().catch(() => undefined)
    const path = await mkdtemp(join(this.root, RESERVATION_PREFIX))
    const reservationId = randomUUID()
    // Marked before the id is handed out, so a crash at any later instant leaves
    // a directory this sweep can recognize.
    await writeFile(join(path, PENDING_MARKER), `${reservationId}\n`, { mode: 0o600 })
    this.pending.set(reservationId, path)
    return { reservationId, path }
  }

  /**
   * Retire a reservation after a Session has adopted its directory. The
   * directory remains because the Session may be resumed later.
   * @param reservationId - opaque id minted by `reserve`.
   * @returns whether the reservation was still live.
   */
  async keep(reservationId: string): Promise<TemporarySessionReservationResult> {
    const path = this.pending.get(reservationId)
    if (path === undefined) return { found: false }
    // Clearing the marker is what makes the directory durable: it is now owned
    // by a Session, so no future sweep may reclaim it.
    await rm(join(path, PENDING_MARKER), { force: true })
    this.pending.delete(reservationId)
    return { found: true }
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

  /**
   * Reclaim reservations abandoned by a crashed Host process.
   *
   * Only directories that still carry the pending marker, are not live in THIS
   * process, and whose marker is older than {@link retentionMs} are removed.
   * Adopted directories have no marker, so a resumable Session is never
   * destroyed; the grace period protects reservations owned by a concurrent Host
   * whose in-memory set this process cannot see.
   *
   * @param now - current epoch milliseconds; injectable for tests.
   * @returns how many abandoned reservations were reclaimed.
   */
  async sweepAbandoned(now: number = Date.now()): Promise<TemporarySessionSweepResult> {
    let entries: Dirent[]
    try {
      entries = await readdir(this.root, { withFileTypes: true })
    } catch {
      return { reclaimed: 0 }
    }

    const live = new Set(this.pending.values())
    let reclaimed = 0
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith(RESERVATION_PREFIX)) continue
      const path = join(this.root, entry.name)
      // Never touch a reservation this process is still holding.
      if (live.has(path)) continue
      let markerAge: number
      try {
        markerAge = now - (await stat(join(path, PENDING_MARKER))).mtimeMs
      } catch {
        // No marker: adopted by a Session, or not ours. Leave it alone.
        continue
      }
      if (markerAge < this.retentionMs) continue
      try {
        await rm(path, { recursive: true, force: true })
        reclaimed += 1
      } catch {
        // A racing Host may have removed it already; nothing to reconcile.
      }
    }
    return { reclaimed }
  }
}
