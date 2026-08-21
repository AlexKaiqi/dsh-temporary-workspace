import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'

describe('temporary Session client composition', () => {
  it('claims the existing New Session event and coalesces repeated clicks', async () => {
    const ctx = new Context()
    let finishConnect!: (sessionId: string) => void
    const connect = new Promise<string>(resolve => { finishConnect = resolve })
    const disposeRemote = vi.fn(async () => {})
    const temporarySessions = {
      reserve: vi.fn(async () => ({
        ok: true as const,
        value: { reservationId: 'reservation', path: '/scratch/task-1' },
      })),
      keep: vi.fn(async () => ({ ok: true as const, value: { found: true } })),
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
          name: 'remote.temporarySessions',
          apply: namespaceCtx => namespaceCtx.provide('remote.temporarySessions', temporarySessions),
        })
        await namespaceFiber
        return async () => {
          await namespaceFiber.dispose()
          await disposeRemote()
        }
      })
    }
    const workspaces = {
      create: vi.fn(async () => ({ workspaceId: 'workspace' })),
      connectWorkspace: vi.fn(() => connect),
      delete: vi.fn(async () => {}),
    }
    const sessionListeners = new Set<() => void>()
    const sessionById: Record<string, { blank: boolean } | undefined> = {
      session: { blank: true },
    }
    const sessions = {
      list: {
        getSnapshot: () => ({ byId: sessionById }),
        subscribe: vi.fn((listener: () => void) => {
          sessionListeners.add(listener)
          return () => { sessionListeners.delete(listener) }
        }),
      },
      open: vi.fn(),
    }
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
    expect(locale.register).toHaveBeenCalledWith('temporarySession', expect.any(Object))
    expect(slots.inject).toHaveBeenCalledWith('settings.plugin.item', expect.any(Function))
    expect(slots.inject).toHaveBeenCalledWith('sidebar.footer.action', expect.any(Function))
    expect(slots.register).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'sidebar.footer.action', id: 'temporary-session' }),
      expect.any(Function),
    )
    expect(ctx.bail('sidebar/new-session')).toBe(true)
    expect(ctx.bail('sidebar/new-session')).toBe(true)
    expect(temporarySessions.reserve).toHaveBeenCalledOnce()

    finishConnect('session')
    await vi.waitFor(() => { expect(sessions.open).toHaveBeenCalledWith('session') })
    expect(workspaces.delete).not.toHaveBeenCalled()

    sessionById.session = { blank: false }
    for (const listener of sessionListeners) listener()
    await vi.waitFor(() => { expect(workspaces.delete).toHaveBeenCalledWith('workspace') })

    await Promise.resolve()
    expect(ctx.bail('sidebar/new-session')).toBe(true)
    await vi.waitFor(() => {
      expect(temporarySessions.reserve).toHaveBeenCalledTimes(2)
      expect(sessions.open).toHaveBeenCalledTimes(2)
      expect(workspaces.delete).toHaveBeenCalledTimes(2)
    })

    await fiber.dispose()
    expect(disposeRemote).toHaveBeenCalledOnce()
    expect(ctx.bail('sidebar/new-session')).toBeUndefined()
  })
})
