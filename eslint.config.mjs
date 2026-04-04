import js from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // Ignore folders that should never be linted
  globalIgnores([
    'node_modules/*',
    'dist/*',
    'logs/*',
    'prisma/*',
    'scripts/*',
  ]),

  // JavaScript rules
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    rules: {
      'no-console': [
        'warn',
        { allow: ['warn', 'error', 'info', 'group', 'groupEnd'] },
      ],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-unused-expressions': 'error',
    },
  },

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Shared rules for JS + TS files
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'warn',
      'no-undef': 'off',
    },
  },

  // Prettier integration
  eslintPluginPrettierRecommended,
]);
