import { describe, expect, it, vi } from 'vitest'
import { ensureTemporaryWorkspace, startTemporarySession } from '../src/client/workflow.ts'

function bench() {
  const calls: string[] = []
  let nextSession = 0
  let workspaceTitle = 'scratch'
  const remote = {
    prepareWorkspace: vi.fn(async () => {
      calls.push('prepare')
      return { ok: true as const, value: { path: '/scratch', workspaceId: 'workspace' } }
    }),
  }
  const workspaces = {
    create: vi.fn(async () => {
      calls.push('workspace')
      return { workspaceId: 'workspace', path: '/scratch', title: workspaceTitle }
    }),
    rename: vi.fn(async (_workspaceId: string, title: string) => {
      calls.push('rename')
      workspaceTitle = title
    }),
    insertBefore: vi.fn(async () => { calls.push('append') }),
    connectWorkspace: vi.fn(async () => {
      calls.push('session')
      nextSession += 1
      return `session-${nextSession}`
    }),
  }
  const sessions = {
    open: vi.fn(() => { calls.push('open') }),
  }
  return { calls, remote, workspaces, sessions, title: 'Temporary Workspace' }
}

describe('ensureTemporaryWorkspace', () => {
  it('creates the fixed group at the bottom without opening a Session', async () => {
    const b = bench()

    await expect(ensureTemporaryWorkspace(b)).resolves.toEqual({ workspaceId: 'workspace' })

    expect(b.calls).toEqual(['prepare', 'workspace', 'rename', 'append'])
    expect(b.workspaces.insertBefore).toHaveBeenCalledWith('workspace')
    expect(b.workspaces.connectWorkspace).not.toHaveBeenCalled()
    expect(b.sessions.open).not.toHaveBeenCalled()
  })
})

describe('startTemporarySession', () => {
  it('opens Sessions through one fixed scratch Workspace', async () => {
    const b = bench()
    await expect(startTemporarySession(b)).resolves.toEqual({ sessionId: 'session-1' })
    await expect(startTemporarySession(b)).resolves.toEqual({ sessionId: 'session-2' })
    expect(b.calls).toEqual([
      'prepare', 'workspace', 'rename', 'append', 'session', 'open',
      'prepare', 'workspace', 'append', 'session', 'open',
    ])
    expect(b.workspaces.create).toHaveBeenNthCalledWith(1, { path: '/scratch' })
    expect(b.workspaces.create).toHaveBeenNthCalledWith(2, { path: '/scratch' })
    expect(b.workspaces.insertBefore).toHaveBeenNthCalledWith(1, 'workspace')
    expect(b.workspaces.insertBefore).toHaveBeenNthCalledWith(2, 'workspace')
    expect(b.workspaces.connectWorkspace).toHaveBeenNthCalledWith(1, 'workspace')
    expect(b.workspaces.connectWorkspace).toHaveBeenNthCalledWith(2, 'workspace')
    expect(b.sessions.open).toHaveBeenNthCalledWith(1, 'session-1')
    expect(b.sessions.open).toHaveBeenNthCalledWith(2, 'session-2')
  })

  it('preserves a Workspace title the user already customized', async () => {
    const b = bench()
    b.workspaces.create.mockResolvedValueOnce({
      workspaceId: 'workspace', path: '/scratch', title: 'My Scratchpad',
    })

    await startTemporarySession(b)

    expect(b.workspaces.rename).not.toHaveBeenCalled()
    expect(b.sessions.open).toHaveBeenCalledWith('session-1')
  })

  it('surfaces a typed Host preparation failure without touching Workspaces', async () => {
    const b = bench()
    b.remote.prepareWorkspace.mockResolvedValueOnce({
      ok: false as const,
      error: { code: 'internal', message: 'disk unavailable' },
    })
    await expect(startTemporarySession(b)).rejects.toThrow(
      'temporary Workspace preparation failed: internal: disk unavailable',
    )
    expect(b.workspaces.create).not.toHaveBeenCalled()
  })

  it('does not open a Session when Host creation fails', async () => {
    const b = bench()
    b.workspaces.connectWorkspace.mockRejectedValueOnce(new Error('session failed'))
    await expect(startTemporarySession(b)).rejects.toThrow('session failed')
    expect(b.sessions.open).not.toHaveBeenCalled()
  })
})
