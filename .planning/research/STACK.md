# Technology Stack: AdMob Monetization (v1.1 Milestone)

**Project:** Rush Hour Puzzle Game  
**Researched:** 2026-04-12  
**Scope:** Additions only — what changes and additions are needed to add AdMob banner + interstitial ads to the existing Capacitor 8 Android app.

---

## Existing Stack (unchanged — do not re-research)

React 19 + TypeScript + Vite + Zustand + CSS Modules + React Router v7 + Firebase Auth + Firestore via `@capacitor-firebase/authentication 8.1.0` + Howler.js + canvas-confetti. All wrapped in Capacitor 8 (`@capacitor/core 8.2.0`, `@capacitor/android 8.2.0`).

---

## New npm Package

### Primary Addition

| Package | Version to Install | Purpose | Why This One |
|---------|-------------------|---------|--------------|
| `@capacitor-community/admob` | `latest` (resolves to **8.0.0**) | JS bridge to native AdMob SDK; banner + interstitial APIs; UMP consent built-in | Canonical Capacitor community plugin; follows Capacitor major-version parity; UMP APIs built-in since v5.0.0; actively maintained |

**Install command:**

```bash
npm install @capacitor-community/admob
npx cap update
```

`npx cap update` is mandatory. It registers the plugin in `android/app/capacitor.build.gradle` (the auto-generated file that already lists `capacitor-firebase-authentication`, `capacitor-app`, etc.). The plugin will not be available at runtime without this step.

**Version parity confirmed:** The plugin's major version tracks Capacitor's major version. `@capacitor-community/admob@8.0.0` targets `@capacitor/core ^8.x`. Install without an explicit version tag on Capacitor 8 to get v8.0.0 (the "latest" tag). Published approximately February 2026.

**Confidence:** MEDIUM — versioning convention is explicitly stated in the README ("if you use Capacitor 6: npm install --save @capacitor-community/admob@6"). v8.0.0 confirmed as latest on npm as of this research date.

### No Other npm Packages Needed

UMP (GDPR consent) is handled entirely by the plugin's built-in JS API (`AdMob.requestConsentInfo()`, `AdMob.showConsentForm()`), which wraps the native `com.google.android.ump:user-messaging-platform` Android SDK. That native SDK is a **transitive dependency** of the plugin — it is not a separate npm install.

---

## Android Gradle Changes

### 1. `android/variables.gradle` — Pin AdMob SDK version

The plugin reads `playServicesAdsVersion` from `variables.gradle` to determine which version of `com.google.android.gms:play-services-ads` to pull in. The plugin's own default is `23.0.0`, which is outdated and has known manifest-merger conflicts with Firebase.

**Add to the `ext {}` block:**

```groovy
ext {
    minSdkVersion = 24           // existing — unchanged
    compileSdkVersion = 36       // existing — unchanged
    targetSdkVersion = 36        // existing — unchanged
    // ... all existing vars ...

    // ADD THIS:
    playServicesAdsVersion = '24.3.0'
}
```

**Why v24.x, not the plugin default of v23.x:**

- Google Mobile Ads SDK v24.0.0 (announced February 2025) removed the `firebase-ads-lite` transitive dependency that caused the most common Firebase + AdMob manifest-merger conflict (`android.adservices.AD_SERVICES_CONFIG` resource collision between `play-services-ads-lite` and `play-services-measurement-api`).
- The current project already has `minSdkVersion = 24`, which satisfies v24's new hard requirement of minSdk 23. No minSdkVersion change needed.
- v24+ provides current 2025 privacy compliance features required for Google Play policy.

**Confidence on exact patch version:** MEDIUM. v24.x confirmed from Google Ads Developer Blog announcement (February 2025) and Google AdMob release notes. Specific patch `24.3.0` is an estimate based on typical release cadence — verify the latest v24.x patch at `https://developers.google.com/admob/android/rel-notes` before building.

### 2. `android/app/src/main/AndroidManifest.xml` — AdMob App ID meta-data

Add inside `<application>`, before `</application>`:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="@string/admob_app_id" />
```

Missing this tag causes an immediate runtime crash: "Missing application ID." Use a string resource reference (not a hardcoded literal) to keep the real App ID out of source control.

### 3. `android/app/src/main/res/values/strings.xml` — AdMob App ID string

```xml
<string name="admob_app_id">ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX</string>
```

Replace with the real AdMob App ID from the AdMob console. During development, use Google's official test App ID: `ca-app-pub-3940256099942544~3347511713` (this test ID serves real-looking test ads without policy violations).

### 4. `android/app/build.gradle` — No manual changes needed

`npx cap update` automatically injects the plugin as a project dependency via `capacitor.build.gradle`. Do NOT manually add `implementation 'com.google.android.gms:play-services-ads:...'` to `app/build.gradle` — the plugin manages that via `playServicesAdsVersion`, and duplicating it risks Gradle resolution conflicts.

The existing `apply plugin: 'com.google.gms.google-services'` block (already in `app/build.gradle`) and `classpath 'com.google.gms:google-services:4.4.4'` (already in root `build.gradle`) remain unchanged.

---

## UMP SDK (GDPR Consent)

### Delivery Mechanism

`com.google.android.ump:user-messaging-platform` **v4.0.0** is a transitive dependency of `@capacitor-community/admob`. It is pulled in automatically — no separate Gradle entry, no separate npm package.

UMP v4.0.0 is the version pinned by plugin v7.x/v8.x. It reflects the February 2025 behavioral change where US State Regulation Messages now return `ConsentStatus.OBTAINED` (rather than requiring explicit user action).

**Confidence:** MEDIUM — UMP v4.0.0 referenced in official Google UMP setup docs and confirmed as current. Transitive dependency confirmed by plugin documentation ("UMP is built into the plugin since v5.0.0").

### UMP JS API Workflow

The plugin exposes UMP as first-class async methods. Call this once at app startup (e.g., early in `App.tsx`):

```typescript
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';

async function initializeAds(): Promise<void> {
  // Step 1: Update consent info on every app launch (checks if form is needed)
  const consentInfo = await AdMob.requestConsentInfo({
    // For testing EEA dialog on a non-EEA device:
    // debugGeography: AdmobConsentDebugGeography.EEA,
    // testDeviceIdentifiers: ['YOUR_TEST_DEVICE_HASH'],
  });

  // Step 2: Show form only if required and available
  if (
    consentInfo.isConsentFormAvailable &&
    consentInfo.status === AdmobConsentStatus.REQUIRED
  ) {
    await AdMob.showConsentForm();
  }

  // Step 3: Initialize AdMob AFTER consent is resolved
  await AdMob.initialize({
    testingDevices: [],
    initializeForTesting: false, // set true during development
  });
}
```

`AdMob.initialize()` must be called after consent resolution, not before. Banner and interstitial APIs will not function correctly if called before `initialize()` completes.

---

## Firebase Conflict Assessment

### Root Cause of Known Conflicts

Pre-v24 versions of `play-services-ads` included `play-services-ads-lite`, which declares an `android.adservices.AD_SERVICES_CONFIG` resource that conflicts with the same resource in `play-services-measurement-api` (used by Firebase Analytics/Auth). This causes an `ERROR: Manifest merger failed` at build time.

### Status with This Stack

Using `playServicesAdsVersion = '24.x.x'` in `variables.gradle` eliminates this conflict because v24.0.0 removed the `firebase-ads-lite` dependency entirely.

The project's existing `@capacitor-firebase/authentication 8.1.0` + `com.google.gms:google-services 4.4.4` combination does not introduce overlapping resources that conflict with AdMob SDK v24+.

**Risk:** LOW when using `playServicesAdsVersion = '24.x.x'`. If a manifest merger failure appears anyway (e.g., from a transitive dependency introducing the old resource), the standard fix is:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          xmlns:tools="http://schemas.android.com/tools">
    <!-- then on the conflicting <property> element: -->
    <!-- tools:replace="android:resource" -->
```

Do not apply this preemptively — only if the build actually fails.

---

## Version Compatibility Table

| Component | Current | After Addition | Notes |
|-----------|---------|----------------|-------|
| `@capacitor/core` | 8.2.0 | 8.2.0 | Unchanged |
| `@capacitor/android` | 8.2.0 | 8.2.0 | Unchanged |
| `@capacitor-firebase/authentication` | 8.1.0 | 8.1.0 | Unchanged; no conflict with AdMob v24+ |
| `@capacitor-community/admob` | — | **8.0.0** | New; major version = Capacitor major version |
| Google Mobile Ads SDK (native) | — | **24.x.x** | Via `playServicesAdsVersion` in variables.gradle |
| UMP SDK (native) | — | **4.0.0** | Transitive via plugin; no manual entry needed |
| `com.google.gms:google-services` | 4.4.4 | 4.4.4 | Unchanged; already in root build.gradle |
| `minSdkVersion` | 24 | 24 | Unchanged; satisfies AdMob v24 minSdk-23 requirement |
| `compileSdkVersion` | 36 | 36 | Unchanged |

---

## What NOT to Add

| Temptation | Why to Avoid |
|------------|-------------|
| Separate Gradle line for `com.google.android.ump:user-messaging-platform` | Transitive dependency of the plugin; manual pin risks version conflicts |
| Separate Gradle line for `com.google.android.gms:play-services-ads` in `app/build.gradle` | Plugin manages this via `playServicesAdsVersion` in `variables.gradle`; duplicating causes resolution ambiguity |
| `admob-plus` (`@admob-plus/capacitor`) | Alternative fork; smaller community; `@capacitor-community/admob` is the standard |
| `Cap-go/capacitor-admob` | Commercial/alternative plugin; not needed when community plugin works |
| Ad mediation adapters (MoPub, ironSource, etc.) | Out of scope for v1.1; adds significant native SDK weight |
| Any iOS-specific changes (Info.plist GADApplicationIdentifier, SKAdNetworkItems) | This project targets Android / Google Play only |

---

## Sources

- [@capacitor-community/admob npm package](https://www.npmjs.com/package/@capacitor-community/admob) — latest version confirmation (v8.0.0), versioning convention — MEDIUM confidence
- [capacitor-community/admob GitHub README](https://github.com/capacitor-community/admob) — installation steps, variables.gradle, AndroidManifest setup, UMP API — MEDIUM confidence
- [Google Ads Developer Blog: Android GMA SDK v24.0.0 announcement (Feb 2025)](https://ads-developers.googleblog.com/2025/02/announcing-android-google-mobile-ads.html) — v24 breaking changes, minSdk-23 requirement, firebase-ads removal — HIGH confidence
- [Google AdMob Android release notes](https://developers.google.com/admob/android/rel-notes) — play-services-ads version history — HIGH confidence
- [Google UMP SDK setup guide](https://developers.google.com/admob/android/privacy) — UMP SDK v4.0.0, consent flow — HIGH confidence
- [Maven: com.google.android.ump](https://mvnrepository.com/artifact/com.google.android.ump/user-messaging-platform) — UMP SDK version history — HIGH confidence
- [capacitor-community/admob Issue #216](https://github.com/capacitor-community/admob/issues/216) — Firebase + AdMob conflict tracking — MEDIUM confidence
- [capacitor-community/admob Issue #273](https://github.com/capacitor-community/admob/issues/273) — UMP consent implementation status — MEDIUM confidence
