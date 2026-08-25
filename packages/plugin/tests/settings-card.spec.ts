import { describe, expect, it, vi } from 'vitest'
import { TemporaryWorkspaceSettingsController } from '../src/client/settings-card.tsx'

describe('TemporaryWorkspaceSettingsController', () => {
  it('loads, picks, and revision-fences a live root save', async () => {
    const initial = {
      revision: 3,
      writable: true,
      pickerSupported: true,
      defaultRoot: '/default/temporary-workspaces',
      root: '/default/temporary-workspaces',
    }
    const remote = {
      describeSettings: vi.fn(async () => ({ ok: true as const, value: initial })),
      pickRoot: vi.fn(async () => ({
        ok: true as const,
        value: { supported: true, path: '/chosen/scratch' },
      })),
      saveSettings: vi.fn(async () => ({
        ok: true as const,
        value: { ...initial, revision: 4, root: '/chosen/scratch' },
      })),
    }
    const controller = new TemporaryWorkspaceSettingsController(remote, key => key)
    const face = controller.inject()
    await vi.waitFor(() => { expect(face.hooks.temporaryWorkspaceSettings.getSnapshot().status).toBe('ready') })

    face.pick()
    await vi.waitFor(() => {
      expect(face.hooks.temporaryWorkspaceSettings.getSnapshot().draftRoot).toBe('/chosen/scratch')
    })
    face.save()
    await vi.waitFor(() => {
      expect(remote.saveSettings).toHaveBeenCalledWith({ expectedRevision: 3, root: '/chosen/scratch' })
      expect(face.hooks.temporaryWorkspaceSettings.getSnapshot()).toMatchObject({
        revision: 4,
        persistedRoot: '/chosen/scratch',
      })
    })
  })
})
