# packages/platform-aws

The only package permitted to import an AWS SDK.

Enforced by an ESLint `no-restricted-imports` rule that fails the pull request if `@aws-sdk/*` appears anywhere else.

Today it holds only the Secrets Manager fetcher used by the External Secrets configuration. **If this package grows past a few hundred lines, that is a signal to re-examine the design rather than to keep going.**

Imported as `@hms/platform-aws`.
