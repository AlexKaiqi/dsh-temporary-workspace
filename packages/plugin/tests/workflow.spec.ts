import { describe, expect, it, vi } from 'vitest'
import { startTemporarySession } from '../src/client/workflow.ts'

function bench() {
  const calls: string[] = []
  const listeners = new Set<() => void>()
  const summaries: Record<string, { blank: boolean } | undefined> = {}
  const remote = {
    reserve: vi.fn(async () => {
      calls.push('reserve')
      return { ok: true as const, value: { reservationId: 'reservation', path: '/scratch/task-1' } }
    }),
    keep: vi.fn(async () => {
      calls.push('keep')
      return { ok: true as const, value: { found: true } }
    }),
    discard: vi.fn(async () => {
      calls.push('discard')
      return { ok: true as const, value: { found: true } }
    }),
  }
  const workspaces = {
    create: vi.fn(async () => {
      calls.push('create')
      return { workspaceId: 'workspace' }
    }),
    connectWorkspace: vi.fn(async () => {
      calls.push('connect')
      return 'session'
    }),
    delete: vi.fn(async () => { calls.push('delete') }),
  }
  const sessions = {
    list: {
      getSnapshot: () => ({ byId: summaries }),
      subscribe: vi.fn((listener: () => void) => {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      }),
    },
    open: vi.fn(() => { calls.push('open') }),
  }
  const diagnostics = { warn: vi.fn() }
  const engage = (sessionId = 'session'): void => {
    summaries[sessionId] = { blank: false }
    for (const listener of listeners) listener()
  }
  return { calls, remote, workspaces, sessions, diagnostics, summaries, engage }
}

describe('startTemporarySession', () => {
  it('keeps a blank Session attached, then detaches after its first accepted prompt', async () => {
    const b = bench()
    b.summaries.session = { blank: true }
    await expect(startTemporarySession(b)).resolves.toEqual({
      sessionId: 'session',
      workspaceDetached: false,
      workspaceDetachmentScheduled: true,
    })
    expect(b.calls).toEqual(['reserve', 'create', 'connect', 'keep', 'open'])
    expect(b.workspaces.create).toHaveBeenCalledWith({ path: '/scratch/task-1' })

    b.engage()
    await vi.waitFor(() => { expect(b.workspaces.delete).toHaveBeenCalledWith('workspace') })
    expect(b.calls).toEqual(['reserve', 'create', 'connect', 'keep', 'open', 'delete'])
  })

  it('discards the scratch directory when Workspace adoption fails', async () => {
    const b = bench()
    b.workspaces.create.mockRejectedValueOnce(new Error('adoption failed'))
    await expect(startTemporarySession(b)).rejects.toThrow('adoption failed')
    expect(b.calls).toEqual(['reserve', 'discard'])
    expect(b.remote.discard).toHaveBeenCalledWith({ reservationId: 'reservation' })
  })

  it('rolls back the Workspace and directory when Session creation fails', async () => {
    const b = bench()
    b.workspaces.connectWorkspace.mockRejectedValueOnce(new Error('session failed'))
    await expect(startTemporarySession(b)).rejects.toThrow('session failed')
    expect(b.calls).toEqual(['reserve', 'create', 'delete', 'discard'])
    expect(b.sessions.open).not.toHaveBeenCalled()
  })

  it('preserves a registered directory when rollback cannot remove its Workspace', async () => {
    const b = bench()
    b.workspaces.connectWorkspace.mockRejectedValueOnce(new Error('session failed'))
    b.workspaces.delete.mockRejectedValueOnce(new Error('delete failed'))
    await expect(startTemporarySession(b)).rejects.toThrow('session failed')
    expect(b.calls).toEqual(['reserve', 'create', 'keep'])
    expect(b.diagnostics.warn).toHaveBeenCalledWith(
      'temporary session rollback failed; preserving its registered directory',
      expect.any(Error),
    )
  })

  it('keeps the engaged Session usable when deferred Workspace detachment fails', async () => {
    const b = bench()
    b.summaries.session = { blank: true }
    b.workspaces.delete.mockRejectedValueOnce(new Error('delete failed'))
    await expect(startTemporarySession(b)).resolves.toEqual({
      sessionId: 'session',
      workspaceDetached: false,
      workspaceDetachmentScheduled: true,
    })
    expect(b.sessions.open).toHaveBeenCalledWith('session')
    expect(b.workspaces.delete).not.toHaveBeenCalled()

    b.engage()
    await vi.waitFor(() => {
      expect(b.diagnostics.warn).toHaveBeenCalledWith(
        'temporary session engaged but its Workspace registration remains',
        expect.any(Error),
      )
    })
  })

  it('surfaces a typed Host reservation failure without touching Workspaces', async () => {
    const b = bench()
    b.remote.reserve.mockResolvedValueOnce({
      ok: false as const,
      error: { code: 'internal', message: 'disk unavailable' },
    })
    await expect(startTemporarySession(b)).rejects.toThrow(
      'temporary session reservation failed: internal: disk unavailable',
    )
    expect(b.workspaces.create).not.toHaveBeenCalled()
  })
})
