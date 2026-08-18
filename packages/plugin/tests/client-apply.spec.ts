import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'

describe('temporary Session client composition', () => {
  it('claims the existing New Session event and coalesces repeated clicks', async () => {
    const ctx = new Context()
    let finishConnect!: (sessionId: string) => void
    const connect = new Promise<string>(resolve => { finishConnect = resolve })
    const disposeRemote = vi.fn(async () => {})
    const remote = {
      $mount: vi.fn(async () => disposeRemote),
      temporarySessions: {
        reserve: vi.fn(async () => ({
          ok: true as const,
          value: { reservationId: 'reservation', path: '/scratch/task-1' },
        })),
        keep: vi.fn(async () => ({ ok: true as const, value: { found: true } })),
        discard: vi.fn(async () => ({ ok: true as const, value: { found: true } })),
      },
    }
    const workspaces = {
      create: vi.fn(async () => ({ workspaceId: 'workspace' })),
      connectWorkspace: vi.fn(() => connect),
      delete: vi.fn(async () => {}),
    }
    const sessions = { open: vi.fn() }
    ctx.provide('remote', remote as never)
    ctx.provide('workspaces', workspaces as never)
    ctx.provide('sessions', sessions as never)

    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(ctx.bail('sidebar/new-session')).toBe(true)
    expect(ctx.bail('sidebar/new-session')).toBe(true)
    expect(remote.temporarySessions.reserve).toHaveBeenCalledOnce()

    finishConnect('session')
    await vi.waitFor(() => { expect(sessions.open).toHaveBeenCalledWith('session') })
    expect(workspaces.delete).toHaveBeenCalledWith('workspace')

    await Promise.resolve()
    expect(ctx.bail('sidebar/new-session')).toBe(true)
    await vi.waitFor(() => {
      expect(remote.temporarySessions.reserve).toHaveBeenCalledTimes(2)
      expect(sessions.open).toHaveBeenCalledTimes(2)
      expect(workspaces.delete).toHaveBeenCalledTimes(2)
    })

    await fiber.dispose()
    expect(disposeRemote).toHaveBeenCalledOnce()
    expect(ctx.bail('sidebar/new-session')).toBeUndefined()
  })
})
