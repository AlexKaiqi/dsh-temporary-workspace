import { rm } from 'node:fs/promises'

await Promise.all([
  rm(new URL('../packages/plugin/lib', import.meta.url), { recursive: true, force: true }),
])
