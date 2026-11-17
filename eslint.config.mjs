import { defineConfig, globalIgnores } from 'eslint/config'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default defineConfig(
  globalIgnores(['**/.nuxt/', '**/.output/', '**/dist/', '**/coverage/']),
  {
    files: ['**/*.{ts,vue}'],
    extends: [tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    files: ['apps/web/app/pages/**/*.vue'],
    rules: { 'vue/multi-word-component-names': 'off' },
  },
)
