import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'

describe('temporary Workspace client composition', () => {
  it('registers the action and coalesces repeated creation clicks', async () => {
    const ctx = new Context()
    let finishConnect!: (sessionId: string) => void
    const firstConnect = new Promise<string>(resolve => { finishConnect = resolve })
    let reservation = 0
    const disposeRemote = vi.fn(async () => {})
    const temporaryWorkspaces = {
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
      adopt: vi.fn(async () => ({ ok: true as const, value: { found: true, workspaceId: 'workspace' } })),
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
    let connectCount = 0
    const workspaces = {
      create: vi.fn(async ({ path }: { path: string }) => ({
        workspaceId: `workspace-${path}`,
        path,
        title: path.split('/').at(-1),
      })),
      connectWorkspace: vi.fn(() => {
        connectCount += 1
        return connectCount === 1 ? firstConnect : Promise.resolve(`session-${connectCount}`)
      }),
      delete: vi.fn(async () => undefined),
    }
    const sessions = { open: vi.fn() }
    const slots = {
      register: vi.fn(() => undefined),
      inject: vi.fn((_name: string, register: () => unknown) => register()),
    }
    const locale = {
      register: vi.fn(() => () => {}),
      bind: vi.fn(() => (key: string) => key),
    }
    const remote = new TestRemoteService(ctx, 'remote')
    ctx.provide('workspaces', workspaces as never)
    ctx.provide('sessions', sessions as never)
    ctx.provide('slots', slots as never)
    ctx.provide('locale', locale as never)

    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(locale.register).toHaveBeenCalledWith('temporaryWorkspace', expect.any(Object))
    expect(slots.inject).toHaveBeenCalledWith('settings.plugin.item', expect.any(Function))
    expect(slots.inject).toHaveBeenCalledWith('sidebar.footer.action', expect.any(Function))
    expect(slots.register).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'sidebar.footer.action', id: 'temporary-workspace' }),
      expect.any(Function),
    )

    const action = slots.register.mock.calls
      .map(([descriptor]) => descriptor)
      .find(descriptor => descriptor.name === 'sidebar.footer.action')
    const start = action.inject().start as () => Promise<void>
    const first = start()
    const coalesced = start()
    expect(first).toBe(coalesced)
    expect(temporaryWorkspaces.reserve).toHaveBeenCalledOnce()

    finishConnect('session-1')
    await first
    await vi.waitFor(() => { expect(sessions.open).toHaveBeenCalledWith('session-1') })

    await Promise.resolve()
    await start()
    await vi.waitFor(() => {
      expect(temporaryWorkspaces.reserve).toHaveBeenCalledTimes(2)
      expect(sessions.open).toHaveBeenCalledWith('session-2')
    })

    expect(workspaces.create).toHaveBeenNthCalledWith(1, { path: '/scratch/workspace-1' })
    expect(workspaces.create).toHaveBeenNthCalledWith(2, { path: '/scratch/workspace-2' })
    expect(workspaces.delete).toHaveBeenCalledTimes(2)

    await fiber.dispose()
    expect(disposeRemote).toHaveBeenCalledOnce()
  })
})
