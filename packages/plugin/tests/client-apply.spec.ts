import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'

describe('temporary Workspace client composition', () => {
  it('registers one contributed group, creates fresh Sessions, and no footer action', async () => {
    const ctx = new Context()
    let reservation = 0
    const disposeRemote = vi.fn(async () => {})
    const temporaryWorkspaces = {
      prepareGroup: vi.fn(async () => ({ ok: true as const, value: { root: '/scratch' } })),
      reserve: vi.fn(async () => {
        reservation += 1
        return {
          ok: true as const,
          value: {
            reservationId: `reservation-${reservation}`,
            path: `/scratch/workspace-${reservation}`,
          },
        }
      }),
      adopt: vi.fn(async () => ({ ok: true as const, value: { found: true } })),
      retain: vi.fn(async () => ({ ok: true as const, value: { found: true } })),
      discard: vi.fn(async () => ({ ok: true as const, value: { found: true } })),
      describeSettings: vi.fn(async () => ({
        ok: true as const,
        value: {
          revision: 0,
          writable: true,
          pickerSupported: true,
          defaultRoot: '/scratch',
          root: '/scratch',
        },
      })),
      saveSettings: vi.fn(),
      pickRoot: vi.fn(),
    }
    class TestRemoteService extends Service {
      $mount = vi.fn(async () => {
        const namespaceFiber = this.ctx.plugin({
          name: 'remote.temporaryWorkspaces',
          apply: namespaceCtx => namespaceCtx.provide('remote.temporaryWorkspaces', temporaryWorkspaces),
        })
        await namespaceFiber
        return async () => {
          await namespaceFiber.dispose()
          await disposeRemote()
        }
      })
    }
    const workspaces = {
      create: vi.fn(async ({ path }: { path: string }) => ({
        workspaceId: `workspace-${path}`,
        path,
      })),
      delete: vi.fn(async () => undefined),
    }
    let session = 0
    const sessions = {
      create: vi.fn(async () => {
        session += 1
        return `session-${session}`
      }),
    }
    const slots = {
      register: vi.fn(() => undefined),
      inject: vi.fn((_name: string, register: () => unknown) => register()),
    }
    const locale = {
      register: vi.fn(() => () => {}),
      bind: vi.fn(() => (key: string) => key === 'title' ? 'Temporary Workspace' : key),
    }
    const unregisterGroup = vi.fn()
    const uiWorkspace = { registerSessionGroup: vi.fn(() => unregisterGroup) }
    const remote = new TestRemoteService(ctx, 'remote')
    ctx.provide('workspaces', workspaces as never)
    ctx.provide('sessions', sessions as never)
    ctx.provide('uiWorkspace', uiWorkspace as never)
    ctx.provide('slots', slots as never)
    ctx.provide('locale', locale as never)

    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    await vi.waitFor(() => {
      expect(temporaryWorkspaces.prepareGroup).toHaveBeenCalledOnce()
      expect(uiWorkspace.registerSessionGroup).toHaveBeenCalledOnce()
    })
    expect(slots.inject).toHaveBeenCalledWith('settings.plugin.item', expect.any(Function))
    expect(slots.inject).not.toHaveBeenCalledWith('sidebar.footer.action', expect.any(Function))
    expect(slots.register.mock.calls.some(([descriptor]) => (
      descriptor as { name?: string }
    ).name === 'sidebar.footer.action')).toBe(false)

    const group = uiWorkspace.registerSessionGroup.mock.calls[0]![0]
    expect(group).toMatchObject({
      id: 'temporary-workspace',
      label: 'Temporary Workspace',
      cwd: { parent: '/scratch', immediateChildPrefix: 'workspace-' },
    })
    await expect(group.createSession()).resolves.toBe('session-1')
    await expect(group.createSession()).resolves.toBe('session-2')
    expect(temporaryWorkspaces.reserve).toHaveBeenCalledTimes(2)
    expect(sessions.create).toHaveBeenCalledTimes(2)
    expect(workspaces.delete).toHaveBeenCalledTimes(2)

    await fiber.dispose()
    expect(unregisterGroup).toHaveBeenCalledOnce()
    expect(disposeRemote).toHaveBeenCalledOnce()
  })
})
