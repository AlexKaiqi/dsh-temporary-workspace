/** Persistent, live settings for temporary Workspace placement. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import { settingsNamespace, type SettingsScope } from '@deepseek-ai/dsh-settings'
import { homedir } from 'node:os'
import { isAbsolute, parse, resolve } from 'node:path'
import type { Config } from './config.ts'
import { resolveTemporaryWorkspaceRoot } from './config.ts'

/** User-owned placement settings edited from the Web plugin settings page. */
export interface TemporaryWorkspaceSettings {
  /** Absolute parent below which isolated temporary Workspaces are created. */
  readonly root: string
}

export const TEMPORARY_WORKSPACE_SETTINGS_NAMESPACE = settingsNamespace('temporary-workspace')

/** Default parent under DSH Home (`~/.dsh` unless DSH_HOME is overridden). */
export const DEFAULT_TEMPORARY_WORKSPACE_ROOT = dshHomePath('temporary-workspaces')

/** Persistent settings schema shared by the Host runtime and Web settings card. */
export const TEMPORARY_WORKSPACE_SETTINGS_SCHEMA: z<TemporaryWorkspaceSettings> = z.object({
  root: z.string().default(DEFAULT_TEMPORARY_WORKSPACE_ROOT),
})

/** Normalize a page-entered path without ever resolving `~` against the process cwd. */
export function normalizeTemporaryWorkspaceRoot(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '') throw new TypeError('temporary Workspace parent directory cannot be empty')
  const expanded = trimmed === '~'
    ? homedir()
    : trimmed.startsWith('~/')
      ? resolve(homedir(), trimmed.slice(2))
      : trimmed
  if (!isAbsolute(expanded)) throw new TypeError('temporary Workspace parent directory must be an absolute path')
  const normalized = resolve(expanded)
  if (normalized === parse(normalized).root) {
    throw new TypeError('temporary Workspace parent directory cannot be the filesystem root')
  }
  return normalized
}

/** Register the live settings namespace, using composition config as its reset value. */
export function registerTemporaryWorkspaceSettings(
  ctx: Context,
  config: Config,
): SettingsScope<TemporaryWorkspaceSettings> {
  const root = resolveTemporaryWorkspaceRoot(config)
  return ctx.settings.register(TEMPORARY_WORKSPACE_SETTINGS_NAMESPACE, TEMPORARY_WORKSPACE_SETTINGS_SCHEMA, {
    base: { root },
    applies: 'live',
    validate: settings => { normalizeTemporaryWorkspaceRoot(settings.root) },
  })
}
