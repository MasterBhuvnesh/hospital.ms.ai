# apps/mobile/lib

The typed API client, `expo-secure-store` token storage backed by Keychain and Keystore, notification registration and channel setup, and the WebSocket client with its polling fallback.

Also the update policy: check on foreground, download in background, **apply on next cold start only**, never while a live-queue screen is mounted.
