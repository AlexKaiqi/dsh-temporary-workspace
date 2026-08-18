/** Package-owned invariant companion for the temporary Session plugin. */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = 'dsh-temporary-session'

/** Cordis companion plugin name. */
export const name = 'temporary-session-invariant'
/** Service required before reserving package ownership. */
export const inject = ['invariants']

// No runtime invariant: reservation ownership crosses the generated Remote
// boundary and has no synchronous event/data relation; transaction and
// opaque-id cleanup behavior are covered by the package integration tests.
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis root carrying the invariant registry.
 * @returns disposer for package ownership.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
