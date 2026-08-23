---
name: expo-local-android-build
description: Use when building, running, or installing an Expo / React Native Android app locally on Windows without EAS - npx expo run:android, dev client on a USB device or emulator, gradlew assembleRelease/bundleRelease, signing a release APK or AAB - or when the local toolchain is missing or broken (no JDK, JAVA_HOME, ANDROID_HOME, sdkmanager, adb not recognized, device unauthorized, INSTALL_FAILED_VERIFICATION_FAILURE, port 8081 in use, Gradle failures).
---

# Local Android builds for Expo (Windows, no EAS)

Build and install Expo Android apps from a Windows machine with Gradle directly. No EAS account, no WSL, no macOS.

**Core split:** JS changes never need a rebuild — `npx expo start --dev-client` + Fast Refresh. Only native changes (new native module, config plugin, `app.json` native keys) need `npx expo run:android`.

## 1. Preflight — check before installing anything

Run in a **fresh** PowerShell (existing terminals don't see new env vars):

```powershell
node -v                      # need 20 LTS or newer
java -version                # need JDK 17 (Expo SDK 50+); 21 for RN 0.78+ / Gradle 8.10+
adb --version
echo $env:JAVA_HOME
echo $env:ANDROID_HOME
adb devices                  # want "device", not "unauthorized" / empty
```

Anything that errors → install it below. Everything passes → skip to §4.

Then, inside the project: `npx expo-doctor`.

## 2. Install what's missing

All via winget (IDs verified). Run PowerShell **as Administrator** for the JDK.

| Missing | Command |
|---|---|
| Node | `winget install OpenJS.NodeJS.LTS` |
| JDK 17 | `winget install Microsoft.OpenJDK.17` |
| adb / fastboot only | `winget install Google.PlatformTools` |
| Full SDK + emulator GUI | `winget install Google.AndroidStudio` |

Add `-e --accept-package-agreements --accept-source-agreements` for unattended runs.

**With Android Studio:** launch it once → the setup wizard installs SDK, platform-tools and an emulator image. Then More Actions → SDK Manager → SDK Tools tab → tick **Android SDK Command-line Tools (latest)**.

**Without Android Studio (headless, ~500MB instead of ~10GB):**

```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
New-Item -ItemType Directory -Force "$sdk\cmdline-tools" | Out-Null
Invoke-WebRequest https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip -OutFile "$env:TEMP\cmdtools.zip"
Expand-Archive "$env:TEMP\cmdtools.zip" -DestinationPath "$sdk\cmdline-tools" -Force
Rename-Item "$sdk\cmdline-tools\cmdline-tools" "latest"
```

Check https://developer.android.com/studio#command-line-tools-only for the current zip name if that URL 404s. The `latest` folder name is required — sdkmanager refuses to run from any other layout.

Then install SDK packages (set the env vars from §3 first, or pass `--sdk_root=$sdk`):

```powershell
& "$sdk\cmdline-tools\latest\bin\sdkmanager.bat" --licenses          # accept all
& "$sdk\cmdline-tools\latest\bin\sdkmanager.bat" "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

Match `platforms;android-<N>` to the app's `compileSdk`. Expo resolves that through the `expo-root-project` Gradle plugin rather than pinning it in `build.gradle` — after a prebuild, read it with `Select-String compileSdkVersion android\build.gradle`, or just use the Expo SDK's target (SDK 54 → 36).

Native modules with C++ also need `"ndk;27.1.12297006"` and `"cmake;3.22.1"`.

## 3. Environment variables

`setx` writes permanently but **does not affect the current shell** — open a new terminal after.

```powershell
setx JAVA_HOME "C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot"
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
setx ANDROID_SDK_ROOT "$env:LOCALAPPDATA\Android\Sdk"
```

Fix the JDK path to whatever `Get-ChildItem "C:\Program Files\Microsoft" -Filter jdk-17*` actually reports.

PATH needs `%ANDROID_HOME%\platform-tools`, `%ANDROID_HOME%\emulator`, `%ANDROID_HOME%\cmdline-tools\latest\bin`. Don't use `setx PATH` — it truncates at 1024 chars and can flatten machine PATH into user PATH. Append instead:

```powershell
$u = [Environment]::GetEnvironmentVariable("PATH", "User")
[Environment]::SetEnvironmentVariable("PATH",
  "$u;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%ANDROID_HOME%\cmdline-tools\latest\bin", "User")
```

Verify in a fresh terminal with the §1 block.

## 4. Device or emulator

**Physical device:** Developer options → enable **USB debugging**, **Install via USB**, and (Xiaomi / Realme / Oppo) **USB debugging (Security settings)**. Plug in, unlock, accept the RSA prompt, then `adb devices`.

**Emulator, no Studio:**

```powershell
sdkmanager "system-images;android-36;google_apis;x86_64"
avdmanager create avd -n pixel -k "system-images;android-36;google_apis;x86_64" -d pixel_7
emulator -avd pixel
```

## 5. Daily workflow

```powershell
npx expo start --dev-client        # JS-only changes — the normal case, no rebuild
npx expo run:android               # native change: prebuild -> Gradle -> install -> Metro
npx expo run:android --no-bundler  # build + install only
npx expo run:android --variant release
```

`run:android` is incremental — minutes, not tens of minutes, after the first build.

Debug APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`. Sideload elsewhere:

```powershell
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

Use `bunx` instead of `npx` when `bun.lock` is present.

## 6. Release APK / AAB

The debug keystore won't do. Generate one (keep it forever — losing it means you can never update the Play listing):

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore `
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Move it to `android/app/`, add to `android/gradle.properties` (never commit real passwords):

```properties
MYAPP_UPLOAD_STORE_FILE=my-release-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=*****
MYAPP_UPLOAD_KEY_PASSWORD=*****
```

Wire it into `android/app/build.gradle`:

```gradle
signingConfigs {
    release {
        storeFile file(MYAPP_UPLOAD_STORE_FILE)
        storePassword MYAPP_UPLOAD_STORE_PASSWORD
        keyAlias MYAPP_UPLOAD_KEY_ALIAS
        keyPassword MYAPP_UPLOAD_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release   // replace signingConfigs.debug
    }
}
```

```powershell
cd android
.\gradlew assembleRelease   # APK -> app/build/outputs/apk/release/
.\gradlew bundleRelease     # AAB -> app/build/outputs/bundle/release/  (Play Store format)
```

### ⚠️ `android/` is gitignored under CNG

With Continuous Native Generation the `android/` folder is generated, and **every hand-edit above is wiped by the next `npx expo prebuild --clean`**. For anything past a one-off local build, pick one:

- commit `android/` (drop it from `.gitignore`, give up CNG), or
- move the change into a **config plugin** (`app.json` → `plugins`), or
- use EAS Build, which manages signing: `bunx eas-cli build --platform android --profile production`.

### Before shipping

If `app.json` still has `"android": { "package": "com.anonymous.<name>" }`, that's Expo's placeholder. Change it — it's the permanent Play Store identity — then `npx expo prebuild --clean` and rebuild.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `adb` / `java` not recognized after install | Env vars only apply to **new** terminals. Open a fresh one. |
| Device `unauthorized` | Unlock phone, accept RSA prompt. No prompt → Developer options → Revoke USB debugging authorizations, replug. |
| Device not listed at all | Try another cable/port (many are charge-only), `adb kill-server; adb start-server`, set USB mode to File Transfer. |
| `INSTALL_FAILED_VERIFICATION_FAILURE` | Realme/ColorOS/MIUI blocks USB installs: `adb shell settings put global verifier_verify_adb_installs 0` and `adb shell settings put global package_verifier_enable 0` (undo with `1`). |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Installed copy signed by a different key. `adb uninstall <package>` first. |
| `Port 8081 is being used` | `Get-NetTCPConnection -LocalPort 8081 -State Listen \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` — or answer `y` to use 8082. |
| `SDK location not found` | `ANDROID_HOME` unset, or stale `android/local.properties`. Delete it and re-prebuild. |
| `Unsupported class file major version` / Gradle-JVM mismatch | Wrong JDK. `java -version` must be 17 (or 21 for RN 0.78+). Point `JAVA_HOME` at it. |
| `Failed to install the following SDK components` | Licences not accepted: `sdkmanager --licenses`. |
| Gradle weirdness, stale build | `cd android; .\gradlew clean` → still broken → `npx expo prebuild --clean`. |
| Daemon OOM / `Java heap space` | In `android/gradle.properties`: `org.gradle.jvmargs=-Xmx4096m`. |
| Anything else | `npx expo-doctor`, then `npx expo install --fix`. |

## Common mistakes

- Reusing an old terminal after `setx` — the env vars won't be there.
- Rebuilding natively for a JS-only change. Use `--dev-client` + Fast Refresh.
- Hand-editing `android/` while CNG is on, then losing it to `prebuild --clean`.
- `npm install <pkg>` instead of `npx expo install <pkg>` — installs SDK-incompatible versions.
- Installing a native module and expecting Expo Go to load it. It needs a dev build.
- Committing keystore passwords, or regenerating the keystore for an already-published app.
