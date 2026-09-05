import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `.claude/worktrees/` holds throwaway full-repo copies for background
  // agents; without this, ESLint descends into them and typescript-eslint
  // trips over the second tsconfig it finds there.
  globalIgnores(['dist', '.claude']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // The repo's documented timer/ref convention (see CLAUDE.md) deliberately
      // writes latest-value mirror refs during render and uses recursive
      // useCallbacks / reset-on-prop-change effects. The React Compiler lint
      // family flags those structurally; keep them visible as warnings rather
      // than failing lint or forcing behaviour-changing refactors.
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
