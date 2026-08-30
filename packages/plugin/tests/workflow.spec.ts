import { describe, expect, it, vi } from 'vitest'
import { startTemporaryWorkspace } from '../src/client/workflow.ts'

function bench() {
  const calls: string[] = []
  let next = 0
  const remote = {
    reserve: vi.fn(async () => {
      next += 1
      calls.push(`reserve-${next}`)
      return {
        ok: true as const,
        value: { reservationId: `reservation-${next}`, path: `/scratch/workspace-${next}` },
      }
    }),
    adopt: vi.fn(async ({ reservationId, sessionId }: { reservationId: string; sessionId: string }) => {
      calls.push(`adopt-${reservationId}-${sessionId}`)
      return { ok: true as const, value: { found: true, workspaceId: `adopted-${reservationId}` } }
    }),
    retain: vi.fn(async ({ reservationId }: { reservationId: string }) => {
      calls.push(`retain-${reservationId}`)
      return { ok: true as const, value: { found: true } }
    }),
    discard: vi.fn(async ({ reservationId }: { reservationId: string }) => {
      calls.push(`discard-${reservationId}`)
      return { ok: true as const, value: { found: true } }
    }),
  }
  const workspaces = {
    create: vi.fn(async ({ path }: { path: string }) => {
      calls.push(`create-${path}`)
      return { workspaceId: `id-${path}`, path }
    }),
    delete: vi.fn(async (workspaceId: string) => { calls.push(`delete-${workspaceId}`) }),
  }
  const sessions = {
    create: vi.fn(async ({ workspaceId }: { workspaceId: string }) => {
      const id = `session-${workspaceId}`
      calls.push(`session-create-${workspaceId}`)
      return id
    }),
  }
  const diagnostics = { warn: vi.fn() }
  return { calls, remote, workspaces, sessions, diagnostics }
}

describe('startTemporaryWorkspace', () => {
  it('creates a distinct child and guaranteed-fresh Session on every call', async () => {
    const b = bench()

    await expect(startTemporaryWorkspace(b)).resolves.toEqual({
      path: '/scratch/workspace-1',
      workspaceId: 'id-/scratch/workspace-1',
      sessionId: 'session-id-/scratch/workspace-1',
      workspaceDetached: true,
    })
    await expect(startTemporaryWorkspace(b)).resolves.toEqual({
      path: '/scratch/workspace-2',
      workspaceId: 'id-/scratch/workspace-2',
      sessionId: 'session-id-/scratch/workspace-2',
      workspaceDetached: true,
    })

    expect(b.sessions.create).toHaveBeenNthCalledWith(1, { workspaceId: 'id-/scratch/workspace-1' })
    expect(b.sessions.create).toHaveBeenNthCalledWith(2, { workspaceId: 'id-/scratch/workspace-2' })
    expect(b.workspaces.delete).toHaveBeenCalledTimes(2)
    expect(b.remote.reserve).toHaveBeenCalledTimes(2)
  })

  it('discards the child when Workspace registration fails', async () => {
    const b = bench()
    b.workspaces.create.mockRejectedValueOnce(new Error('registration failed'))

    await expect(startTemporaryWorkspace(b)).rejects.toThrow('registration failed')
    expect(b.remote.discard).toHaveBeenCalledWith({ reservationId: 'reservation-1' })
    expect(b.sessions.create).not.toHaveBeenCalled()
  })

  it('rolls back the Workspace and child when Session creation fails', async () => {
    const b = bench()
    b.sessions.create.mockRejectedValueOnce(new Error('session failed'))

    await expect(startTemporaryWorkspace(b)).rejects.toThrow('session failed')
    expect(b.workspaces.delete).toHaveBeenCalledWith('id-/scratch/workspace-1')
    expect(b.remote.discard).toHaveBeenCalledWith({ reservationId: 'reservation-1' })
  })

  it('retains the child when rollback cannot remove its Workspace', async () => {
    const b = bench()
    b.sessions.create.mockRejectedValueOnce(new Error('session failed'))
    b.workspaces.delete.mockRejectedValueOnce(new Error('delete failed'))

    await expect(startTemporaryWorkspace(b)).rejects.toThrow('session failed')
    expect(b.remote.retain).toHaveBeenCalledWith({ reservationId: 'reservation-1' })
    expect(b.diagnostics.warn).toHaveBeenCalledWith(
      'temporary Workspace rollback failed; preserving its registered directory',
      expect.any(Error),
    )
  })

  it('keeps the Session when transient Workspace deletion fails', async () => {
    const b = bench()
    b.workspaces.delete.mockRejectedValueOnce(new Error('delete failed'))

    await expect(startTemporaryWorkspace(b)).resolves.toMatchObject({ workspaceDetached: false })
    expect(b.diagnostics.warn).toHaveBeenCalledWith(
      'temporary Workspace opened but its registration remains',
      expect.any(Error),
    )
  })

  it('retains the child when Session adoption fails after creation', async () => {
    const b = bench()
    b.remote.adopt.mockResolvedValueOnce({
      ok: false as const,
      error: { code: 'internal', message: 'accounting failed' },
    })

    await expect(startTemporaryWorkspace(b)).resolves.toMatchObject({
      path: '/scratch/workspace-1', workspaceDetached: true,
    })
    expect(b.remote.retain).toHaveBeenCalledWith({ reservationId: 'reservation-1' })
  })

  it('surfaces a typed Host reservation failure without touching Workspaces', async () => {
    const b = bench()
    b.remote.reserve.mockResolvedValueOnce({
      ok: false as const,
      error: { code: 'internal', message: 'disk unavailable' },
    })

    await expect(startTemporaryWorkspace(b)).rejects.toThrow(
      'temporary Workspace reservation failed: internal: disk unavailable',
    )
    expect(b.workspaces.create).not.toHaveBeenCalled()
  })
})
