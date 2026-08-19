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
  // No cloud SDK anywhere in the tree. This is the mechanism that makes
  // "cloud-agnostic" a property rather than a claim: without it the first AWS
  // import lands quietly and the portable profile stops building.
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@aws-sdk/*', 'aws-sdk', '@aws-cdk/*'],
              message:
                'No cloud SDK in application code. A cloud dependency belongs behind an interface, not inlined at the call site.',
            },
          ],
        },
      ],
    },
  },
);
