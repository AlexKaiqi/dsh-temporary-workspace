import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Client composition tests exercise the source tree before Typert build
    // artifacts exist. Production builds still consume the generated module.
    alias: {
      'dsh-temporary-session/remote': fileURLToPath(
        new URL('./packages/plugin/tests/remote-fixture.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['packages/*/tests/**/*.spec.ts', 'packages/*/tests/**/*.spec.tsx'],
    restoreMocks: true,
  },
})
