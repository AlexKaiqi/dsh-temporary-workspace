import { mkdir, mkdtemp, readFile, realpath, rm, stat, symlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_RESERVATION_RETENTION_MS, MIN_RESERVATION_RETENTION_MS, TemporaryDirectoryReservations } from '../src/reservations.ts'
import { resolveReservationRetentionMs, resolveReservationRoot } from '../src/config.ts'
import { DEFAULT_TEMPORARY_SESSION_ROOT, normalizeTemporarySessionRoot } from '../src/settings.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function store(): Promise<TemporaryDirectoryReservations> {
  const parent = await mkdtemp(join(tmpdir(), 'dsh-temporary-session-test-'))
  roots.push(parent)
  return new TemporaryDirectoryReservations(join(parent, 'scratch'))
}

describe('TemporaryDirectoryReservations', () => {
  it('creates a distinct private directory for every reservation', async () => {
    const reservations = await store()
    const first = await reservations.reserve()
    const second = await reservations.reserve()

    expect(first.reservationId).not.toBe(second.reservationId)
    expect(first.path).not.toBe(second.path)
    expect(first.path.startsWith(`${reservations.root}/task-`)).toBe(true)
    expect((await stat(first.path)).isDirectory()).toBe(true)
    expect((await stat(second.path)).isDirectory()).toBe(true)
  })

  it('keeps an adopted directory and makes the opaque id single-use', async () => {
    const reservations = await store()
    const reserved = await reservations.reserve()

    expect(await reservations.keep(reserved.reservationId)).toEqual({ found: true })
    expect(await reservations.keep(reserved.reservationId)).toEqual({ found: false })
    expect(await reservations.discard(reserved.reservationId)).toEqual({ found: false })
    await expect(stat(reserved.path)).resolves.toBeDefined()
  })

  it('discards only a directory addressed by a live reservation id', async () => {
    const reservations = await store()
    const reserved = await reservations.reserve()

    await expect(reservations.discard('caller-supplied-path')).resolves.toEqual({ found: false })
    await expect(reservations.discard(reserved.reservationId)).resolves.toEqual({ found: true })
    await expect(stat(reserved.path)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(reservations.discard(reserved.reservationId)).resolves.toEqual({ found: false })
  })

  it('reclaims a reservation abandoned by a crashed Host process', async () => {
    const reservations = await store()
    const abandoned = await reservations.reserve()

    // A crashed Host loses `pending`, so the reservation id no longer exists
    // anywhere. Model that with a fresh instance over the same root: without a
    // sweep this directory is unreachable forever.
    const restarted = new TemporaryDirectoryReservations(reservations.root)
    await expect(restarted.discard(abandoned.reservationId)).resolves.toEqual({ found: false })

    // Inside the grace period it is left alone: a concurrent Host may own it.
    expect(await restarted.sweepAbandoned()).toEqual({ reclaimed: 0 })
    await expect(stat(abandoned.path)).resolves.toBeDefined()

    // Past the grace period it is reclaimed.
    const past = Date.now() + restarted.retentionMs + 1_000
    expect(await restarted.sweepAbandoned(past)).toEqual({ reclaimed: 1 })
    await expect(stat(abandoned.path)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('never reclaims a directory a Session already adopted', async () => {
    const reservations = await store()
    const adopted = await reservations.reserve()
    await writeFile(join(adopted.path, 'session-state.json'), '{"live":true}')
    await reservations.keep(adopted.reservationId)

    // `keep` clears the pending marker, which is what makes the directory
    // durable. Sweeping far in the future must not touch it, or resuming a
    // Session would find its workspace deleted.
    const restarted = new TemporaryDirectoryReservations(reservations.root)
    const farFuture = Date.now() + restarted.retentionMs * 100
    expect(await restarted.sweepAbandoned(farFuture)).toEqual({ reclaimed: 0 })
    await expect(stat(adopted.path)).resolves.toBeDefined()
    expect(await readFile(join(adopted.path, 'session-state.json'), 'utf8')).toBe('{"live":true}')
  })

  it('never reclaims a reservation still live in this process', async () => {
    const reservations = await store()
    const live = await reservations.reserve()

    // Even past the grace period, an in-flight reservation owned by THIS
    // process is protected: adoption may still be in progress.
    const farFuture = Date.now() + reservations.retentionMs * 100
    expect(await reservations.sweepAbandoned(farFuture)).toEqual({ reclaimed: 0 })
    await expect(stat(live.path)).resolves.toBeDefined()
  })

  it('reclaims abandoned reservations while allocating a new one', async () => {
    const reservations = await store()
    const abandoned = await reservations.reserve()
    // Age the marker beyond the grace period.
    const stale = new Date(Date.now() - reservations.retentionMs - 60_000)
    await utimes(join(abandoned.path, '.reservation-pending'), stale, stale)

    // A restarted Host reclaims on its first allocation, so orphans do not
    // accumulate for the lifetime of the installation.
    const restarted = new TemporaryDirectoryReservations(reservations.root)
    const fresh = await restarted.reserve()

    await expect(stat(abandoned.path)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(stat(fresh.path)).resolves.toBeDefined()
  })

  it('ignores unrelated directories in the reservation root', async () => {
    const reservations = await store()
    await reservations.reserve()
    const unrelated = join(reservations.root, 'not-a-reservation')
    await mkdir(unrelated, { recursive: true })

    const farFuture = Date.now() + reservations.retentionMs * 100
    expect(await reservations.sweepAbandoned(farFuture)).toEqual({ reclaimed: 0 })
    await expect(stat(unrelated)).resolves.toBeDefined()
  })

  it('is a no-op when the reservation root does not exist yet', async () => {
    const reservations = await store()
    expect(await reservations.sweepAbandoned()).toEqual({ reclaimed: 0 })
  })

  it('raises a too-small retention to the safe floor', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'dsh-temporary-session-test-'))
    roots.push(parent)
    // A zero or tiny grace would delete reservations mid-adoption.
    const reservations = new TemporaryDirectoryReservations(join(parent, 'scratch'), 0)
    expect(reservations.retentionMs).toBe(MIN_RESERVATION_RETENTION_MS)
  })

  it('refuses every caller-supplied path shape, so no escape is addressable', async () => {
    const reservations = await store()
    const reserved = await reservations.reserve()

    // The opaque-id capability is the containment boundary: discard() takes an
    // id, never a path, so an absolute path, a `..` traversal, or a symlink
    // target cannot be named by a caller at all. Each of these is a path a
    // compromised Client might try; all are unauthorized to address.
    for (const attempt of [
      reserved.path,
      `${reservations.root}/task-does-not-exist`,
      '/etc/passwd',
      '/',
      '../../etc/passwd',
      `${reservations.root}/../..`,
      './',
      '',
    ]) {
      await expect(
        reservations.discard(attempt),
        `discard(${JSON.stringify(attempt)}) must not be honored`,
      ).resolves.toEqual({ found: false })
    }

    // The live reservation survived every attempt.
    await expect(stat(reserved.path)).resolves.toBeDefined()
    // And the real id still works, proving the refusals were not blanket failure.
    await expect(reservations.discard(reserved.reservationId)).resolves.toEqual({ found: true })
  })

  it('confines every reservation to the configured root', async () => {
    const reservations = await store()
    for (let index = 0; index < 3; index++) {
      const reserved = await reservations.reserve()
      // Containment: the canonical path must stay under the root, so a Session
      // can never be pointed outside the configured scratch area.
      const real = await realpath(reserved.path)
      const rootReal = await realpath(reservations.root)
      expect(real.startsWith(`${rootReal}/`)).toBe(true)
      expect(relative(rootReal, real).startsWith('..')).toBe(false)
    }
  })

  it('does not follow a symlink planted in the reservation root', async () => {
    const reservations = await store()
    await reservations.reserve()
    // A symlink named like a reservation, pointing outside the root. The sweep
    // must not traverse it and must not delete the outside target.
    const outsideDir = await mkdtemp(join(tmpdir(), 'dsh-temporary-session-outside-'))
    roots.push(outsideDir)
    await writeFile(join(outsideDir, 'keep-me.txt'), 'precious')
    await symlink(outsideDir, join(reservations.root, 'task-symlink'))

    const farFuture = Date.now() + reservations.retentionMs * 100
    expect(await reservations.sweepAbandoned(farFuture)).toEqual({ reclaimed: 0 })
    expect(await readFile(join(outsideDir, 'keep-me.txt'), 'utf8')).toBe('precious')
  })

  it('keeps the reservation root private to the owning user', async () => {
    const reservations = await store()
    await reservations.reserve()
    const mode = (await stat(reservations.root)).mode & 0o777
    expect(mode).toBe(0o700)
  })
})

describe('configuration', () => {
  it('derives the reservation root from the single root field', () => {
    // One configured directory owns all persistent state, so there is one thing
    // to configure, back up, or relocate.
    expect(resolveReservationRoot({ root: '/tmp/scratch-root' })).toBe('/tmp/scratch-root')
    // Relative input is resolved to an absolute path, never left ambiguous.
    expect(isAbsolute(resolveReservationRoot({ root: 'relative/scratch' }))).toBe(true)
  })

  it('falls back to the DSH home directory when root is omitted', () => {
    const derived = resolveReservationRoot({})
    expect(isAbsolute(derived)).toBe(true)
    expect(derived.endsWith('temporary-sessions')).toBe(true)
  })

  it('applies the retention floor to hostile or absent values', () => {
    expect(resolveReservationRetentionMs({})).toBe(DEFAULT_RESERVATION_RETENTION_MS)
    expect(resolveReservationRetentionMs({ reservationRetentionMs: 7_200_000 })).toBe(7_200_000)
    // A zero or negative grace would reclaim reservations mid-adoption.
    expect(resolveReservationRetentionMs({ reservationRetentionMs: 0 })).toBe(MIN_RESERVATION_RETENTION_MS)
    expect(resolveReservationRetentionMs({ reservationRetentionMs: -1 })).toBe(MIN_RESERVATION_RETENTION_MS)
  })

  it('normalizes page-entered roots and preserves the original default', () => {
    expect(normalizeTemporarySessionRoot('  /tmp/scratch  ')).toBe('/tmp/scratch')
    expect(normalizeTemporarySessionRoot('~/scratch')).toContain('/scratch')
    expect(DEFAULT_TEMPORARY_SESSION_ROOT.endsWith('temporary-sessions')).toBe(true)
  })

  it('rejects ambiguous or dangerously broad page-entered roots', () => {
    expect(() => normalizeTemporarySessionRoot('')).toThrow('cannot be empty')
    expect(() => normalizeTemporarySessionRoot('relative/scratch')).toThrow('absolute path')
    expect(() => normalizeTemporarySessionRoot('/')).toThrow('filesystem root')
  })
})
