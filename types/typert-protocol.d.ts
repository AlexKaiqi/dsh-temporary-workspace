/**
 * Analyzer-only declaration facade. The Typert generator recognizes its own
 * primitives through an ambient module when a plugin is built outside the
 * Harness monorepo; emitted JavaScript still imports the real npm package.
 */
declare module '@deepseek-ai/dsh-typert-protocol' {
  export interface TypertRemoteContribution {
    readonly package: string
    readonly descriptors: readonly unknown[]
  }

  export type RemoteResult<T> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

  export abstract class TypertRemoteService {
    protected constructor(ctx: unknown, serviceKey: string, options?: { readonly namespace?: string })
  }

  export function Remote<This extends object, Args extends unknown[], Result>(
    method: (this: This, ...args: Args) => Result,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Result>,
  ): void

  export function Remote(exportName: string):
  <This extends object, Args extends unknown[], Result>(
    method: (this: This, ...args: Args) => Result,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Result>,
  ) => void

  export interface TypertRemoteMap {}
  export interface TypertRemoteNamespaceMap {}
  export interface TypertRemoteScopeMap {}
}
