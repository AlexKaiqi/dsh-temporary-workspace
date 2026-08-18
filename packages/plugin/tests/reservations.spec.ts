import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { TemporaryDirectoryReservations } from '../src/reservations.ts'

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

    expect(reservations.keep(reserved.reservationId)).toEqual({ found: true })
    expect(reservations.keep(reserved.reservationId)).toEqual({ found: false })
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
})
