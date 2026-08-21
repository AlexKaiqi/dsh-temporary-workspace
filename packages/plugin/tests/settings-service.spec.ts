import { Context } from '@deepseek-ai/cordis'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { TemporarySessionService } from '../lib/index.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('TemporarySessionService settings', () => {
  it('persists a picked root and uses it for the next reservation', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'dsh-temporary-session-settings-'))
    roots.push(parent)
    const defaultRoot = join(parent, 'default')
    const chosenRoot = join(parent, 'chosen')
    let revision = 0
    let value = { root: defaultRoot }
    const scope = {
      get: () => value,
      watch: () => () => {},
      update: async () => {},
      replace: async () => {},
    }
    const settings = {
      writable: true,
      register: () => scope,
      describe: () => [{ ns: 'temporary-session', revision }],
      replace: async (_namespace: string, section: { root: string }, expectedRevision: number) => {
        expect(expectedRevision).toBe(revision)
        value = section
        revision += 1
      },
    }
    const directoryPicker = {
      capability: () => ({
        kind: 'native' as const,
        pick: async () => chosenRoot,
      }),
    }
    const ctx = new Context()
    ctx.provide('settings', settings as never)
    ctx.provide('directoryPicker', directoryPicker as never)
    const service = new TemporarySessionService(ctx, { root: defaultRoot })

    await expect(service.describeSettings()).resolves.toMatchObject({ root: defaultRoot, defaultRoot })
    await expect(service.pickRoot()).resolves.toEqual({ supported: true, path: chosenRoot })
    await expect(service.saveSettings({ expectedRevision: 0, root: chosenRoot })).resolves.toMatchObject({
      revision: 1,
      root: chosenRoot,
    })
    await expect(stat(chosenRoot)).resolves.toBeDefined()

    const reservation = await service.reserve()
    expect(reservation.path.startsWith(`${chosenRoot}/task-`)).toBe(true)
    await expect(service.keep({ reservationId: reservation.reservationId })).resolves.toEqual({ found: true })
  })
})
