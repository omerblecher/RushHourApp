---
phase: 06-android-native-setup
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - .env.development
  - .env.production
  - package.json
  - android/variables.gradle
  - android/app/src/main/AndroidManifest.xml
  - android/app/src/main/res/values/strings.xml
  - android/capacitor.settings.gradle
  - android/app/capacitor.build.gradle
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-04-12
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the Android native AdMob setup files introduced in Phase 6. The configuration is structurally sound: the native `strings.xml` correctly carries Google's public test App ID, `variables.gradle` pins `play-services-ads` with a documented rationale, and the Capacitor-generated files (`capacitor.settings.gradle`, `capacitor.build.gradle`) are consistent with `package.json` dependencies.

Two warnings are raised: (1) `.env.production` holds literal `TODO` placeholder values that will cause all JS-layer AdMob calls to fail if a production build is triggered before Phase 10, and (2) `android:allowBackup="true"` in `AndroidManifest.xml` permits unrestricted ADB/cloud backup of app data. One info item notes a minor indentation inconsistency in the manifest.

---

## Warnings

### WR-01: Production AdMob IDs are `TODO` — JS-layer ad calls will fail on any production build

**File:** `.env.production:3-5`
**Issue:** All three `VITE_ADMOB_*` variables are set to the literal string `"TODO"`. If `vite build` (production mode) is executed before Phase 10, the Capacitor/JS layer will call `AdMob.initialize()` and ad-show methods with `"TODO"` as the App ID and unit IDs. The native AdMob SDK reads the App ID from `strings.xml` (which is correct), so the app will not crash at launch, but every ad request will be rejected by the SDK with an invalid-unit-ID error. This will silently suppress all ads in production until the values are replaced.

**Fix:** Add a build-time guard so production builds fail fast if any `VITE_ADMOB_*` value is still `TODO`. Add to `vite.config.ts` (or a pre-build script):
```typescript
// vite.config.ts — in the production plugin/hook
if (mode === 'production') {
  const required = ['VITE_ADMOB_APP_ID', 'VITE_ADMOB_BANNER_ID', 'VITE_ADMOB_INTERSTITIAL_ID'];
  for (const key of required) {
    if (!env[key] || env[key] === 'TODO') {
      throw new Error(`Production build blocked: ${key} is not set in .env.production`);
    }
  }
}
```
This ensures a production build is impossible until Phase 10 provides real IDs, preventing a silent all-ads-broken release.

---

### WR-02: `android:allowBackup="true"` permits unrestricted ADB and cloud backup

**File:** `android/app/src/main/AndroidManifest.xml:4`
**Issue:** `android:allowBackup="true"` allows Android's backup system (both ADB and Google cloud backup) to read and restore all app data, including shared preferences, databases, and files stored in the app's private directory. For this puzzle game, the likely concern is the game-state store (Zustand/localStorage via WebView). A user could extract their save state with `adb backup`, modify it, and restore it — or backup/restore could create inconsistent state across devices/versions.

**Fix:** If backup is not an intentional feature, set `android:allowBackup="false"` to prevent data exfiltration and state-manipulation via backup. If cross-device save sync is desired later, implement it explicitly (e.g., Firebase) rather than relying on ADB backup:
```xml
<application
    android:allowBackup="false"
    ...>
```
If backup of certain data IS desired, use `android:fullBackupContent` with a rules file to be explicit about what is included/excluded.

---

## Info

### IN-01: Inconsistent indentation of AdMob `<meta-data>` element in AndroidManifest.xml

**File:** `android/app/src/main/AndroidManifest.xml:12-14`
**Issue:** The `<meta-data>` block for the AdMob App ID uses 12-space indentation, while the sibling `<activity>` element (line 15) uses 8-space indentation. This appears to be a copy-paste artifact from the insertion. It does not affect build or runtime behaviour but reduces readability.

**Fix:** Re-indent the `<meta-data>` block to 8 spaces to match the `<activity>` element:
```xml
    <application ...>
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="@string/admob_app_id"/>
        <activity
            ...>
```

---

_Reviewed: 2026-04-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
