/** Persistent, live settings for temporary Session placement. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import { settingsNamespace, type SettingsScope } from '@deepseek-ai/dsh-settings'
import { homedir } from 'node:os'
import { isAbsolute, parse, resolve } from 'node:path'
import type { Config } from './config.ts'
import { resolveReservationRoot } from './config.ts'

/** User-owned placement settings edited from the Web plugin settings page. */
export interface TemporarySessionSettings {
  /** Absolute parent directory under which unique `task-*` directories live. */
  readonly root: string
}

export const TEMPORARY_SESSION_SETTINGS_NAMESPACE = settingsNamespace('temporary-session')

/** Default placement preserved from the original composition-only plugin. */
export const DEFAULT_TEMPORARY_SESSION_ROOT = dshHomePath('temporary-sessions')

/** Persistent settings schema shared by the Host runtime and Web settings card. */
export const TEMPORARY_SESSION_SETTINGS_SCHEMA: z<TemporarySessionSettings> = z.object({
  root: z.string().default(DEFAULT_TEMPORARY_SESSION_ROOT),
})

/** Normalize a page-entered path without ever resolving `~` against the process cwd. */
export function normalizeTemporarySessionRoot(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '') throw new TypeError('temporary Session directory cannot be empty')
  const expanded = trimmed === '~'
    ? homedir()
    : trimmed.startsWith('~/')
      ? resolve(homedir(), trimmed.slice(2))
      : trimmed
  if (!isAbsolute(expanded)) throw new TypeError('temporary Session directory must be an absolute path')
  const normalized = resolve(expanded)
  if (normalized === parse(normalized).root) {
    throw new TypeError('temporary Session directory cannot be the filesystem root')
  }
  return normalized
}

/** Register the live settings namespace, using composition config as its reset value. */
export function registerTemporarySessionSettings(
  ctx: Context,
  config: Config,
): SettingsScope<TemporarySessionSettings> {
  const root = resolveReservationRoot(config)
  return ctx.settings.register(TEMPORARY_SESSION_SETTINGS_NAMESPACE, TEMPORARY_SESSION_SETTINGS_SCHEMA, {
    base: { root },
    applies: 'live',
    validate: settings => { normalizeTemporarySessionRoot(settings.root) },
  })
}
