# Architecture: AdMob Integration into Existing Rush Hour App

**Milestone:** v1.1 Ad Monetization
**Researched:** 2026-04-12
**Confidence:** HIGH — plugin API stable at v8.0.0, matches Capacitor 8; UMP behavior verified against Google docs

---

## Overview

`@capacitor-community/admob` v8.0.0 slots cleanly into the existing service-singleton architecture. All AdMob calls are fully imperative — the plugin renders native Android views positioned by the SDK, not by React. There is no "AdMob React component". This mirrors how `soundService.ts` works today: pure TS functions, no hooks, no JSX.

---

## New Files to Create

### `src/services/adService.ts`

A singleton matching the pattern of `soundService.ts`. Owns all AdMob state: initialization flag, interstitial-ready flag, and the full preload/show lifecycle.

**Responsibilities:**
- Call `AdMob.initialize()` once at app startup
- Run the UMP consent flow (`requestConsentInfo` → `showConsentForm` when required for EEA/UK)
- Expose `showBanner()` / `removeBanner()` for imperative call from `GameScreen`
- Expose `preloadInterstitial()` to load the next ad in background
- Expose `showInterstitialIfReady()` for the win flow — returns a `Promise<void>` that resolves when the ad closes (or immediately if no ad is loaded)
- Self-reload after each interstitial dismissal via event listener

**Why a singleton and not a Zustand store or hook:**
- Ad state is not UI state — no component needs to re-render when "interstitial becomes ready"
- The preload lifecycle must outlive any single component mount/unmount cycle
- Exactly matches the `soundService` precedent and the Capacitor pattern of imperative bridge calls

**Implementation skeleton (for the build phase to flesh out):**

```typescript
// src/services/adService.ts
import { Capacitor } from '@capacitor/core';
import {
  AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition,
  AdOptions, InterstitialAdPluginEvents, AdmobConsentStatus,
} from '@capacitor-community/admob';

// Replace with real IDs before production build
const BANNER_AD_ID      = 'ca-app-pub-3940256099942544/6300978111'; // test ID
const INTERSTITIAL_AD_ID = 'ca-app-pub-3940256099942544/1033173712'; // test ID

let initialized        = false;
let interstitialReady  = false;

async function initialize(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (initialized) return;
  initialized = true;

  try {
    await AdMob.initialize({ initializeForTesting: false });
    await runConsentFlow();
    void preloadInterstitial();
  } catch (err) {
    console.warn('[adService] initialization failed, ads disabled', err);
    initialized = false; // allow retry on next launch
  }
}

async function runConsentFlow(): Promise<void> {
  const { isConsentFormAvailable, status } = await AdMob.requestConsentInfo();
  // For non-EEA users, status is NOT_REQUIRED immediately — form never shown
  if (isConsentFormAvailable && status === AdmobConsentStatus.REQUIRED) {
    await AdMob.showConsentForm();
  }
}

async function preloadInterstitial(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  interstitialReady = false;
  await AdMob.removeAllListeners();
  await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID } as AdOptions);
  await AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
    interstitialReady = true;
  });
  await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
    interstitialReady = false;
    void preloadInterstitial(); // pre-warm for next level
  });
}

async function showBanner(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const options: BannerAdOptions = {
    adId: BANNER_AD_ID,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: false,
  };
  await AdMob.showBanner(options);
}

async function removeBanner(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await AdMob.removeBanner();
}

// Resolves when ad closes, or immediately if no ad is ready.
// Always resolves — never rejects — so the win flow is never blocked.
async function showInterstitialIfReady(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !interstitialReady) return;
  return new Promise<void>((resolve) => {
    // These listeners fire after the Dismissed/FailedToShow listeners
    // set up in preloadInterstitial(), so resolution happens correctly.
    void AdMob.addListener(InterstitialAdPluginEvents.Dismissed,   () => resolve());
    void AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => resolve());
    void AdMob.showInterstitial();
  });
}

export const adService = {
  initialize,
  showBanner,
  removeBanner,
  showInterstitialIfReady,
};
```

> Implementation note: `removeAllListeners()` is called at the start of each `preloadInterstitial()` to prevent duplicate event registrations across repeated preload cycles. The build phase must verify this API exists in v8.0.0 or use per-listener `remove()` handles instead.

---

## Modified Files

### `src/main.tsx`

Add one line alongside `initNative()`. Both are fire-and-forget at startup.

```typescript
import { adService } from './services/adService';

void initNative();
void adService.initialize();   // <-- add this line
useAuthStore.getState().initAuth();

createRoot(rootElement).render(...)
```

**Why here, not inside `initNative()`:**
`initNative()` has its own early-return guard for non-native platforms. `adService` has an identical guard. Keeping them separate preserves single-responsibility. `initNative()` owns the platform shell (StatusBar, backButton); `adService` owns monetization. Neither depends on the other.

**Why before `createRoot()`:**
AdMob and UMP need maximum lead time. The UMP consent dialog is a native Android overlay — it appears above everything including the WebView, so there is no need to wait for React to be ready. Starting early gives the interstitial preload time to complete before the user finishes their first puzzle.

**What does NOT change in `main.tsx`:**
`createRoot()` is not delayed. The `isLoading` auth gate is not modified. AdMob initialization never blocks the React tree.

---

### `src/screens/GameScreen/GameScreen.tsx`

Two changes: banner lifecycle and interstitial in win flow.

**Change 1 — Banner lifecycle:**

```typescript
// Add to GameScreen, alongside existing useEffects:
useEffect(() => {
  void adService.showBanner();
  return () => { void adService.removeBanner(); };
}, []);
```

The empty dependency array means: show banner when GameScreen mounts, remove it when GameScreen unmounts. This correctly handles both navigation away (PuzzleSelect, MainMenu) and the win flow (banner removed before interstitial, not re-shown unless player stays on GameScreen).

**Change 2 — Interstitial in win flow:**

The existing win `setTimeout` callback:
```typescript
const timer = setTimeout(() => {
  setIsWinAnimating(false);
  setShowWinModal(true);
}, 2000);
```

Changes to:
```typescript
const timer = setTimeout(() => {
  setIsWinAnimating(false);
  void (async () => {
    await adService.showInterstitialIfReady(); // resolves immediately if no ad
    setShowWinModal(true);
  })();
}, 2000);
```

The banner is already removed by the unmount path when the user navigates away; no explicit `removeBanner()` is needed in the win flow itself because `showInterstitialIfReady` will gracefully coexist or the banner `useEffect` cleanup runs on unmount.

If the banner and interstitial conflict on some devices (some AdMob versions raise an error if banner is visible when interstitial shows), add `await adService.removeBanner()` before `await adService.showInterstitialIfReady()` in the async block above.

---

### `android/app/src/main/AndroidManifest.xml`

Two additions: the AdMob App ID meta-data tag, and the `AD_ID` permission required for Android 13+.

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        ...existing attributes unchanged...>

        ...existing content unchanged...

        <!-- AdMob App ID — value sourced from strings.xml -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="@string/admob_app_id" />

    </application>

    <uses-permission android:name="android.permission.INTERNET" />
    <!-- Required for Android 13+ (API 33+) for ad personalization -->
    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />
</manifest>
```

The App ID value lives in `strings.xml` (not inline in the manifest) to keep it out of diffs and allow per-build-type overrides.

---

### `android/app/src/main/res/values/strings.xml`

Add the AdMob App ID string resource. This file may not exist yet; create it if absent.

```xml
<resources>
    <string name="admob_app_id">ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX</string>
</resources>
```

During development, use the Google test App ID: `ca-app-pub-3940256099942544~3347511713`.
Replace with the real App ID before the production build.

---

### `src/screens/GameScreen/GameScreen.module.css`

The ADAPTIVE_BANNER renders as a native Android view below the WebView, at the bottom of the screen. Without padding, it overlaps the `ControlBar`. Add bottom padding when running on native.

In `GameScreen.tsx`, conditionally apply a padding class:

```typescript
import { Capacitor } from '@capacitor/core';
const isNative = Capacitor.isNativePlatform();

// In the return JSX:
<div className={`${styles.container} ${isNative ? styles.withBanner : ''}`}>
```

In `GameScreen.module.css`:

```css
.withBanner {
  padding-bottom: 60px; /* ADAPTIVE_BANNER is ~50–56dp; 60px gives safe clearance */
}
```

---

### `android/app/build.gradle`

**No manual changes required.** The `@capacitor-community/admob` plugin auto-registers via Capacitor's sync mechanism. Running `npx cap sync` after `npm install @capacitor-community/admob` writes the plugin dependency into `android/app/capacitor.build.gradle` (the auto-generated file). Verify it appears there after sync.

---

## Initialization Sequence

```
App launch
  |
  +-- void initNative()              [non-blocking: StatusBar, backButton]
  |
  +-- void adService.initialize()    [non-blocking, runs in parallel]
  |     |
  |     +-- AdMob.initialize()
  |     +-- runConsentFlow()
  |     |     +-- requestConsentInfo()
  |     |     +-- showConsentForm()   [only if EEA user AND form available]
  |     |                             [native dialog over WebView — no React involvement]
  |     +-- preloadInterstitial()     [background HTTP fetch, ready before first win]
  |
  +-- useAuthStore.getState().initAuth()   [Firebase onAuthStateChanged]
  |
  +-- createRoot().render()
        |
        +-- App.tsx
              +-- isLoading=true  →  loading spinner  [Firebase resolving]
              +-- isLoading=false →  Routes rendered
                    |
                    +-- GameScreen mounts
                          +-- useEffect → adService.showBanner()
```

Key properties of this sequence:
- Firebase auth and AdMob init are parallel; neither waits for the other.
- The `isLoading` gate is unchanged — it gates only on `authStore.isLoading` (Firebase). AdMob never delays the UI.
- The UMP consent dialog (if shown) is a native Android overlay. It does not block React rendering and is independent of `isLoading`.
- If `adService.initialize()` throws (wrong App ID, no network), it is caught and logged. The app continues normally without ads.

---

## UMP Consent Flow — Non-Blocking Design

The `isLoading` gate in `App.tsx` is driven solely by `authStore.isLoading` (Firebase). UMP is independent.

| User Region | `requestConsentInfo` result | Consent form shown | Ads load |
|---|---|---|---|
| Non-EEA (most users) | `NOT_REQUIRED` immediately | No | Yes, immediately after init |
| EEA / UK (first launch) | `REQUIRED`, form available | Yes — native dialog | After user interacts with form |
| EEA / UK (returning) | `OBTAINED` | No | Yes, stored consent used |

The consent dialog is a native Android dialog, not anything in the React tree. It appears above the WebView regardless of what React is rendering. For non-EEA users (the majority for most Play Store apps), `requestConsentInfo` returns `NOT_REQUIRED` synchronously-fast and no form is shown. Gameplay is never blocked for non-EU users.

**Google enforcement note:** Since January 2024, Google requires publishers serving EEA/UK users to use a certified CMP. The `@capacitor-community/admob` v8.0.0 plugin delegates to the bundled Google UMP SDK, satisfying this requirement. No separate CMP vendor is needed.

---

## Interstitial Preload and Show Flow

```
App start
  └── preloadInterstitial()    [HTTP fetch starts in background]

User solves puzzle → state.isWon = true
  |
  +-- soundService.playWin()
  +-- canvas-confetti
  +-- setTimeout(2000ms)
        |
        +-- setIsWinAnimating(false)
        +-- adService.showInterstitialIfReady()
        |     |
        |     +-- interstitialReady=true  →  AdMob.showInterstitial()
        |     |     user watches interstitial ad
        |     |     user dismisses
        |     |       +-- InterstitialAdPluginEvents.Dismissed fires
        |     |             +-- Promise resolves
        |     |             +-- preloadInterstitial() called  [next ad warms up]
        |     |
        |     +-- interstitialReady=false  →  Promise resolves immediately
        |                                     [no ad shown, no delay]
        |
        +-- setShowWinModal(true)
              |
              +-- WinModal renders
                    |
                    +-- "Next Puzzle"         → navigate → GameScreen remounts → showBanner()
                    +-- "Back to Selection"   → PuzzleSelectScreen → no banner
                    +-- WinModal onClose      → setShowWinModal(false)
                                                GameScreen still mounted → banner still showing
```

**Frequency cap:** Do not attempt to enforce a frequency cap in code. Configure it in the AdMob console (minimum interval between interstitials, e.g., every 3 minutes or every 3 levels). The `interstitialReady` flag provides a soft natural cap because preloading takes 2–5 seconds on a normal connection — consecutive rapid wins will not all show ads.

---

## Banner Positioning

ADAPTIVE_BANNER for a typical Android phone is approximately 50–56 density-independent pixels tall. The plugin inserts it as a native view below the WebView. CSS `padding-bottom: 60px` on the `GameScreen` container div is the correct fix — the banner does not physically push content up; the WebView ignores it unless padding is applied manually.

Only `GameScreen` needs this padding. `PuzzleSelectScreen`, `MainMenuScreen`, and `ProfileScreen` do not show the banner (it is removed on GameScreen unmount).

---

## File Change Summary

| File | Change Type | What Changes |
|---|---|---|
| `src/services/adService.ts` | **New** | Full ad lifecycle singleton |
| `src/main.tsx` | Modified | One line: `void adService.initialize()` |
| `src/screens/GameScreen/GameScreen.tsx` | Modified | Banner `useEffect` + interstitial in win setTimeout |
| `src/screens/GameScreen/GameScreen.module.css` | Modified | `.withBanner { padding-bottom: 60px }` |
| `android/app/src/main/AndroidManifest.xml` | Modified | AdMob `<meta-data>` + `AD_ID` permission |
| `android/app/src/main/res/values/strings.xml` | Modified or Created | `admob_app_id` string resource |
| `android/app/build.gradle` | **No change** | `npx cap sync` handles plugin dependency |

---

## Suggested Build Order for Phases

**Phase 1 — Android native plumbing (zero JS changes)**
- `npm install @capacitor-community/admob`
- `npx cap sync`
- Add `<meta-data>` to `AndroidManifest.xml`
- Create/update `strings.xml` with test App ID
- Add `AD_ID` permission to `AndroidManifest.xml`
- Build and run; confirm no build errors

**Phase 2 — adService + initialization + UMP**
- Create `src/services/adService.ts` with `initialize()` and `runConsentFlow()`
- Add `void adService.initialize()` to `main.tsx`
- Test with `debugGeography: AdmobConsentDebugGeography.EEA` to force UMP dialog
- Verify non-EEA path: form never shown, no delay

**Phase 3 — Banner ad**
- Add `showBanner()` / `removeBanner()` to `adService.ts`
- Add `useEffect` to `GameScreen.tsx`
- Add `.withBanner` padding class to `GameScreen.module.css`
- Test: banner visible on GameScreen, absent on other screens, no ControlBar overlap

**Phase 4 — Interstitial ad**
- Add `preloadInterstitial()` and `showInterstitialIfReady()` to `adService.ts`
- Wire into the `setTimeout` callback in `GameScreen.tsx`
- Test: WinModal appears only after ad is dismissed, not during it
- Test: Win without a loaded interstitial — WinModal appears without delay

**Phase 5 — Production IDs and Play Store**
- Replace all test IDs with real AdMob App ID and ad unit IDs in `strings.xml` and `adService.ts`
- Update privacy policy to declare ad serving and data collection
- Update Play Store data safety section
- Verify consent dialog in production AdMob account (requires real GDPR message configured in AdMob console)

This order is strictly dependency-driven: Android native support must exist before any JS bridge calls work; consent must execute before ad requests; the simpler banner must work before the more stateful interstitial.

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Banner overlaps ControlBar | Medium | `padding-bottom: 60px` on `.withBanner` class |
| Duplicate event listeners on repeated `preloadInterstitial()` | Medium | Call `AdMob.removeAllListeners()` before re-registering; or track and call `remove()` on prior handle |
| UMP form not appearing (AdMob account misconfigured) | Low | Always test with `debugGeography: EEA` and a registered test device |
| Missing `AD_ID` permission causes Play Store rejection | High | Add to manifest before submission; required for Android 13+ |
| `adService.initialize()` throws silently | Low | Wrap in try/catch; log; continue; never let ad errors reach the user |
| Interstitial and banner conflict on same screen | Low | If needed, `await adService.removeBanner()` before `showInterstitialIfReady()` in win flow |
| `showInterstitialIfReady()` never resolves if event does not fire | Medium | Add a timeout fallback in the Promise (5–8 seconds) that resolves and continues to WinModal |

---

## Sources

- [@capacitor-community/admob npm (v8.0.0)](https://www.npmjs.com/package/@capacitor-community/admob) — HIGH confidence
- [capacitor-community/admob GitHub](https://github.com/capacitor-community/admob) — HIGH confidence
- [Google UMP SDK for Android](https://developers.google.com/admob/android/privacy) — HIGH confidence
- [Capacitor Ads guide](https://capacitorjs.com/docs/guides/ads) — HIGH confidence
