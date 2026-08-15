# apps/mobile

Expo SDK 54, React Native. **Patient only.**

Staff on mobile is a different product with a different threat model. It is deliberately out of scope.

```
app/          Expo Router, file-based
components/
lib/          typed api client, secure storage, notifications
```

## The flagship screen

The live queue: token number, position, current token, estimated wait, updating over WebSocket with a **5-second polling fallback**. Hospital wifi drops constantly and this screen must never look frozen.

## Notifications

`expo-notifications` with EAS Push. **Android channels per category**, so a patient can mute billing without muting "your turn". Deep links go from a notification straight to the exact screen (`/queue/[tokenId]`).

SMS is the fallback when no push token is registered, and the only channel that works before the app is installed.

## Updates

EAS Update for JS-only changes, a Play In-App Updates prompt for native ones. **Check on foreground, download in background, apply on next cold start.** Never swap the bundle out from under a patient watching the live queue.

`expo-secure-store` holds tokens, backed by Keychain and Keystore.
