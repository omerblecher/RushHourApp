---
phase: 08-banner-ad
reviewed: 2026-04-13T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/services/adService.ts
  - src/services/__tests__/adService.test.ts
  - src/screens/GameScreen/GameScreen.tsx
findings:
  critical: 0
  warning: 5
  info: 2
  total: 7
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-04-13
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Three files were reviewed: the ad service module, its unit test suite, and the GameScreen component that integrates the banner. The consent flow and the GDPR gating logic are implemented correctly. The main concerns are: unhandled rejection propagation from the consent flow, a banner-listener race condition in GameScreen, a potential listener leak, missing validation on the banner ad ID env var, and one test that stubs an env var with the wrong type causing a fragile assertion.

No critical (security/crash/data-loss) issues were found.

---

## Warnings

### WR-01: Unhandled consent-flow rejection poisons all future `waitForConsent()` calls

**File:** `src/services/adService.ts:27`

**Issue:** `_consentReady` is assigned the result of `AdMob.initialize().then(() => runConsentFlow())`. Neither `runConsentFlow` nor the `.then()` chain has a `.catch()` handler. If `requestConsentInfo` (or any other step in the chain) rejects, `_consentReady` settles as a rejected promise. Every subsequent call to `waitForConsent()` — and therefore every call to `showBanner()` — will then throw permanently for the lifetime of the app. In GameScreen the call site uses `void showBanner()`, so the error is silently swallowed and the banner never appears.

**Fix:** Add a catch handler that logs and swallows the error, leaving `_consentReady` resolved so ads can still attempt to show:

```ts
export function initAdService(): void {
  _consentReady = AdMob.initialize()
    .then(() => runConsentFlow())
    .catch((err) => {
      console.warn('[adService] Consent flow failed, proceeding without consent:', err);
    });
}
```

---

### WR-02: `AdMob.removeBanner()` called unconditionally — may throw when no banner was shown

**File:** `src/services/adService.ts:51-53`

**Issue:** `removeBanner()` delegates directly to `AdMob.removeBanner()` with no error handling. If `showBanner()` failed (e.g., due to the consent rejection in WR-01, a network error, or the banner never loading), calling `removeBanner()` on cleanup may throw a native exception. In GameScreen, the cleanup path uses `void removeBanner()`, silently discarding the error, which is acceptable for cleanup — but the underlying `removeBanner` export should be robust for other callers.

**Fix:**

```ts
export async function removeBanner(): Promise<void> {
  try {
    await AdMob.removeBanner();
  } catch {
    // Banner may not have been shown; ignore removal errors
  }
}
```

---

### WR-03: Listener registration race — `SizeChanged` event may fire before `listenerHandle` is captured

**File:** `src/screens/GameScreen/GameScreen.tsx:103-118`

**Issue:** `AdMob.addListener(...)` returns a `Promise<PluginListenerHandle>`. The handle is stored inside the `.then()` callback (line 108-110), but `showBanner()` is called immediately on line 112 without awaiting the listener registration. On fast devices, the banner can load and fire `BannerAdPluginEvents.SizeChanged` before the `.then()` resolves, so `listenerHandle` is still `null` at that point. The height update is received and processed correctly (the callback on line 104-107 runs fine), but see WR-04 for the related leak.

More impactfully: if the component unmounts before the `.then()` resolves, the cleanup function runs with `listenerHandle === null`, the listener is never removed, and the `setBannerHeight` state setter is called on an unmounted component indefinitely.

**Fix:** Await the listener registration before showing the banner:

```ts
useEffect(() => {
  if (!Capacitor.isNativePlatform()) return;

  let listenerHandle: PluginListenerHandle | null = null;
  let cancelled = false;

  const setup = async () => {
    listenerHandle = await AdMob.addListener(
      BannerAdPluginEvents.SizeChanged,
      (info: AdMobBannerSize) => {
        if (!cancelled) setBannerHeight(info.height);
      }
    );
    if (!cancelled) {
      await showBanner();
    }
  };

  void setup();

  return () => {
    cancelled = true;
    listenerHandle?.remove();
    void removeBanner();
    setBannerHeight(0);
  };
}, []);
```

---

### WR-04: Missing `VITE_ADMOB_BANNER_ID` validation — `undefined` passed to native SDK

**File:** `src/services/adService.ts:43`

**Issue:** `adId: import.meta.env.VITE_ADMOB_BANNER_ID` passes the env var value directly to `AdMob.showBanner()`. If the variable is unset (e.g., in a CI environment or a developer machine without a `.env.local`), `adId` will be `undefined`. The native AdMob SDK will receive an undefined ad unit ID and may crash, log a confusing native error, or silently fail. Because `isTesting: import.meta.env.DEV` is also passed, a test ad ID could be used as a fallback in dev.

**Fix:**

```ts
export async function showBanner(): Promise<void> {
  await waitForConsent();
  const adId = import.meta.env.VITE_ADMOB_BANNER_ID as string | undefined;
  if (!adId) {
    console.warn('[adService] VITE_ADMOB_BANNER_ID is not set; skipping banner');
    return;
  }
  await AdMob.showBanner({
    adId,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: import.meta.env.DEV,
  });
}
```

---

### WR-05: Test 12 stubs `DEV` as string `'true'` but asserts `isTesting: true` (boolean) — fragile assertion

**File:** `src/services/__tests__/adService.test.ts:232-248`

**Issue:** `vi.stubEnv('DEV', 'true')` sets `import.meta.env.DEV` to the string `'true'`. The production code then passes `isTesting: import.meta.env.DEV` which evaluates to `isTesting: 'true'` (a string). The assertion `expect.objectContaining({ isTesting: true })` uses Jest/Vitest deep-equality for the value, so it checks `'true' === true`, which is `false`. This test should fail but may pass in some Vitest versions depending on how env stubs and `import.meta` interop are handled. If it does pass today it is for the wrong reason and will become a false negative when behavior changes.

**Fix:** Stub DEV as the boolean or assert with a truthiness check:

```ts
// Option A: assert truthiness instead of strict boolean
expect(AdMob.showBanner).toHaveBeenCalledWith(
  expect.objectContaining({ isTesting: expect.any(Boolean) })
);
// and verify it's truthy:
const call = vi.mocked(AdMob.showBanner).mock.calls[0][0];
expect(call.isTesting).toBeTruthy();

// Option B: use vi.stubEnv with the boolean directly (Vitest supports this)
vi.stubEnv('DEV', true as any);
```

---

## Info

### IN-01: `initAdService()` can be called multiple times without guard

**File:** `src/services/adService.ts:26-28`

**Issue:** Calling `initAdService()` more than once overwrites `_consentReady` and re-runs `AdMob.initialize()` and `runConsentFlow()`. The plugin may reject a second `initialize()` call or show the consent form twice. There is no guard against re-entrancy.

**Fix:** Add an early-return guard:

```ts
let _initialized = false;

export function initAdService(): void {
  if (_initialized) return;
  _initialized = true;
  _consentReady = AdMob.initialize().then(() => runConsentFlow());
}
```

---

### IN-02: `showConsentForm` export name is misleading — it calls `showPrivacyOptionsForm`

**File:** `src/services/adService.ts:34-38`

**Issue:** The exported function is named `showConsentForm` but its own comment and implementation clarify it actually calls `AdMob.showPrivacyOptionsForm()`. This is a known intentional choice (the comment references Plan 02), but the mismatch between name and behavior is a maintenance hazard. Any caller who reads only the function name will misunderstand what it does.

**Fix:** Rename to `showPrivacyOptions` or `showPrivacyOptionsForm` to match the underlying API it delegates to. Update all call sites accordingly.

---

_Reviewed: 2026-04-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
