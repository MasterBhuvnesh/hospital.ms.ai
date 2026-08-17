import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/out/**', '**/node_modules/**', '**/*.d.ts'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // PHI must never reach stdout unredacted. Use @hms/logger.
      'no-console': 'error',
    },
  },

  // ARCHITECTURE CONSTRAINT, see .github/RULES.md.
  // No cloud SDK outside packages/platform-aws. This is the mechanism that
  // makes "cloud-agnostic" a property rather than a claim: without it the
  // first AWS import lands quietly and the portable profile stops building.
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    ignores: ['packages/platform-aws/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@aws-sdk/*', 'aws-sdk', '@aws-cdk/*'],
              message:
                'Cloud SDKs are confined to packages/platform-aws. Depend on the interface in @hms/platform instead.',
            },
          ],
        },
      ],
    },
  },

  // packages/platform declares interfaces. An implementation here would be a
  // dependency every profile inherits, which is exactly what it exists to stop.
  {
    files: ['packages/platform/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['*'], message: 'packages/platform is interfaces only. It imports nothing.' }] }],
    },
  },
);
