import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/coverage/**',
      'docker/**',
      'docs/**',
      '**/next-env.d.ts',
      // Accidental HOME=/…/frontend caches and vendored minified assets
      '**/200/**',
      '**/*.min.js',
      '**/*.min.mjs',
      '**/pdf.worker*.mjs',
      '**/public/pdf.worker.min.mjs',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
    },
  },
);
