import { Context } from '@deepseek-ai/cordis'
import { mkdtemp, realpath, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { TemporaryWorkspaceService } from '../lib/index.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('TemporaryWorkspaceService settings', () => {
  it('persists a picked root, exposes its canon, and uses it for the next reservation', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'dsh-temporary-workspace-settings-'))
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
      describe: () => [{ ns: 'temporary-workspace', revision }],
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
    const attached: string[] = []
    const ctx = new Context()
    ctx.provide('settings', settings as never)
    ctx.provide('directoryPicker', directoryPicker as never)
    ctx.provide('workspaceRegistry', {
      create: async (path: string) => ({
        id: `workspace:${path}`,
        path,
        attachSession: async (sessionId: string) => { attached.push(sessionId) },
      }),
      insertBefore: async () => [],
    } as never)
    const service = new TemporaryWorkspaceService(ctx, { root: defaultRoot })

    await expect(service.describeSettings()).resolves.toMatchObject({ root: defaultRoot, defaultRoot })
    await expect(service.pickRoot()).resolves.toEqual({ supported: true, path: chosenRoot })
    await expect(service.saveSettings({ expectedRevision: 0, root: chosenRoot })).resolves.toMatchObject({
      revision: 1,
      root: chosenRoot,
    })
    await expect(stat(chosenRoot)).resolves.toBeDefined()
    await expect(service.prepareGroup()).resolves.toEqual({ root: await realpath(chosenRoot) })

    const reservation = await service.reserve()
    expect(reservation.path.startsWith(`${chosenRoot}/workspace-`)).toBe(true)
    await expect(service.adopt({ reservationId: reservation.reservationId, sessionId: 'session-1' }))
      .resolves.toEqual({ found: true, workspaceId: `workspace:${reservation.path}` })
    expect(attached).toEqual(['session-1'])
  })
})
