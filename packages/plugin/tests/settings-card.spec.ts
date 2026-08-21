import { describe, expect, it, vi } from 'vitest'
import { TemporarySessionSettingsController } from '../src/client/settings-card.tsx'

describe('TemporarySessionSettingsController', () => {
  it('loads, picks, and revision-fences a live root save', async () => {
    const initial = {
      revision: 3,
      writable: true,
      pickerSupported: true,
      defaultRoot: '/default/temporary-sessions',
      root: '/default/temporary-sessions',
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
    const controller = new TemporarySessionSettingsController(remote, key => key)
    const face = controller.inject()
    await vi.waitFor(() => { expect(face.hooks.temporarySessionSettings.getSnapshot().status).toBe('ready') })

    face.pick()
    await vi.waitFor(() => {
      expect(face.hooks.temporarySessionSettings.getSnapshot().draftRoot).toBe('/chosen/scratch')
    })
    face.save()
    await vi.waitFor(() => {
      expect(remote.saveSettings).toHaveBeenCalledWith({ expectedRevision: 3, root: '/chosen/scratch' })
      expect(face.hooks.temporarySessionSettings.getSnapshot()).toMatchObject({
        revision: 4,
        persistedRoot: '/chosen/scratch',
      })
    })
  })
})
