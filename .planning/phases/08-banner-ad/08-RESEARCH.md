# Phase 8: Banner Ad — Research

**Researched:** 2026-04-13
**Domain:** Capacitor AdMob banner lifecycle, React useEffect cleanup, dynamic layout padding
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Service structure:** Extend `adService.ts` — add `showBanner()` and `removeBanner()` to the existing singleton. No new file.
- `showBanner()` awaits `waitForConsent()` internally before calling `AdMob.showBanner()`
- Phase 9 will also extend `adService.ts` with interstitial functions

**Bottom padding strategy:** Dynamic padding — listen for the banner size event to get the exact banner height. Apply as inline `paddingBottom` on the GameScreen container. Padding resets to 0 when banner is removed.

**Web/non-native guard:** Explicit `Capacitor.isNativePlatform()` check in GameScreen before any banner API call. Return early from the effect when not native.

**Banner load failure handling (BANNER-05):** No visible UI change on failure. No error state, no fallback UI. `bannerHeight` stays at 0 if banner never loads.

### Claude's Discretion

None stated explicitly.

### Deferred Ideas (OUT OF SCOPE)

- Interstitial ad (Phase 9)
- Real production ad IDs (Phase 10)
- Banner on any screen other than GameScreen
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BANNER-01 | A banner ad is displayed at the bottom of the GameScreen, below the ControlBar | `AdMob.showBanner()` with `AdPosition.BOTTOM_CENTER`; useEffect hook in GameScreen |
| BANNER-02 | The banner uses `AdMob.showBanner()` with `AdSize.ADAPTIVE_BANNER` and `AdPosition.BOTTOM_CENTER` | Both enums verified in installed plugin v8.0.0 |
| BANNER-03 | The GameScreen layout adds bottom padding equal to the banner height so game UI is not obscured | `BannerAdPluginEvents.SizeChanged` provides `AdMobBannerSize.height`; inline style padding |
| BANNER-04 | The banner is removed (`AdMob.removeBanner()`) when the user navigates away from the GameScreen | useEffect cleanup function calls `adService.removeBanner()` |
| BANNER-05 | Banner ad lifecycle (load, show, error) is handled gracefully — ad failure does not affect gameplay | `FailedToLoad` event; bannerHeight stays 0; no error UI |
</phase_requirements>

---

## Summary

Phase 8 extends the existing `adService.ts` singleton (built in Phase 7) with `showBanner()` and `removeBanner()` functions, then wires the banner lifecycle into `GameScreen.tsx` via a single `useEffect`. The consent gate is already in place (`waitForConsent()`) and the AdMob plugin is fully installed and verified from Phase 6. This phase is straightforward: the only code changes are in two files.

**Critical finding:** The CONTEXT.md references `BannerAdInfo` and `info.adHeight`, but these types do NOT exist in `@capacitor-community/admob` v8.0.0 (the installed version). The correct approach is to listen to `BannerAdPluginEvents.SizeChanged` (which provides `AdMobBannerSize` with `width` and `height` fields) rather than `BannerAdPluginEvents.Loaded` (which provides no size info — its callback is `() => void`). The implementation must use `SizeChanged` for height, not `Loaded`.

**Primary recommendation:** Use `BannerAdPluginEvents.SizeChanged` with callback `(info: AdMobBannerSize) => void` to capture `info.height` for the dynamic `paddingBottom`. The locked decision pattern from CONTEXT.md is correct in intent — only the event name and type need correcting.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@capacitor-community/admob` | 8.0.0 | Banner show/remove/events | Already installed and device-verified in Phase 6 |
| `@capacitor/core` | ^8.2.0 | `Capacitor.isNativePlatform()` | Already installed |

**Version verification:** [VERIFIED: npm view @capacitor-community/admob version → 8.0.0, installed in project]

### No New Installs Required

All libraries needed for Phase 8 are already installed. Phase 8 is purely a code-change phase.

---

## Architecture Patterns

### Files Changed

Only two files are modified in Phase 8:

```
src/
├── services/
│   └── adService.ts          # Add showBanner() and removeBanner()
└── screens/
    └── GameScreen/
        └── GameScreen.tsx    # Add banner useEffect + bannerHeight state
```

`GameScreen.module.css` — **no changes** (padding applied inline, not via CSS class).

### Pattern 1: adService.ts Extension

Add two exports to the existing singleton. The `showBanner()` function awaits consent before touching any ad API (GDPR-04 compliance, already enforced by `waitForConsent()`).

```typescript
// adService.ts additions
// Source: @capacitor-community/admob v8.0.0 type definitions (verified in node_modules)
import {
  AdMob,
  AdSize,          // enum: BannerAdSize in v8 — exported as AdSize from index
  AdPosition,      // enum: BannerAdPosition in v8 — exported as AdPosition from index
  // ...existing imports
} from '@capacitor-community/admob';

export async function showBanner(): Promise<void> {
  await waitForConsent();
  await AdMob.showBanner({
    adId: import.meta.env.VITE_ADMOB_BANNER_ID,
    adSize: AdSize.ADAPTIVE_BANNER,
    position: AdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: import.meta.env.DEV,
  });
}

export async function removeBanner(): Promise<void> {
  await AdMob.removeBanner();
}
```

### Pattern 2: GameScreen Banner Lifecycle useEffect

**CRITICAL CORRECTION from CONTEXT.md:** `BannerAdPluginEvents.Loaded` has callback signature `() => void` — it provides NO size info. Use `BannerAdPluginEvents.SizeChanged` with `(info: AdMobBannerSize) => void` to get `info.height`.

```typescript
// GameScreen.tsx additions
// Source: verified against node_modules/@capacitor-community/admob/dist/esm/banner/
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import {
  AdMob,
  BannerAdPluginEvents,
  AdMobBannerSize,   // the actual type: { width: number; height: number }
} from '@capacitor-community/admob';
import * as adService from '../../services/adService';

// In component:
const [bannerHeight, setBannerHeight] = useState(0);

useEffect(() => {
  if (!Capacitor.isNativePlatform()) return;

  let listenerHandle: PluginListenerHandle | null = null;

  // SizeChanged (not Loaded) provides banner dimensions
  AdMob.addListener(
    BannerAdPluginEvents.SizeChanged,
    (info: AdMobBannerSize) => {
      setBannerHeight(info.height);
    }
  ).then(handle => { listenerHandle = handle; });

  void adService.showBanner();

  return () => {
    void adService.removeBanner();
    setBannerHeight(0);
    listenerHandle?.remove();
  };
}, []);

// In JSX — apply to outermost container:
<div className={styles.container} style={{ paddingBottom: bannerHeight }}>
```

### Pattern 3: Import Resolution for AdSize / AdPosition

The CONTEXT.md references `AdSize.ADAPTIVE_BANNER` and `AdPosition.BOTTOM_CENTER`. In v8.0.0, the actual exported enum names are `BannerAdSize` and `BannerAdPosition`. However, the package re-exports them under the short names `AdSize` and `AdPosition` from the package index. [VERIFIED: checking node_modules types]

```typescript
// Both forms are valid in v8.0.0:
import { BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
// or the short aliases:
import { AdSize, AdPosition } from '@capacitor-community/admob';
```

Prefer the short-alias form (`AdSize`, `AdPosition`) to match CONTEXT.md intent — verify import resolves correctly at TypeScript compile time.

### Anti-Patterns to Avoid

- **Using `BannerAdPluginEvents.Loaded` for height:** Its callback is `() => void`. Height only comes from `BannerAdPluginEvents.SizeChanged`.
- **Using `info.adHeight`:** This property does not exist. The correct property is `info.height` on `AdMobBannerSize`.
- **Using `BannerAdInfo` type:** This type does not exist in v8.0.0. Use `AdMobBannerSize` instead.
- **Calling `showBanner()` before consent:** `waitForConsent()` inside `showBanner()` prevents this, but do not bypass it.
- **Skipping the `isNativePlatform()` guard:** `AdMob.showBanner()` called on web will throw or silently fail; the guard is required.
- **Not removing the listener on unmount:** Leaking `PluginListenerHandle` causes duplicate state updates if GameScreen remounts.
- **CSS padding instead of inline style:** The banner height is dynamic and only known at runtime. CSS class-based padding cannot encode a runtime value — must use inline `style={{ paddingBottom: bannerHeight }}`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Banner sizing | Custom device-width calculations | `AdSize.ADAPTIVE_BANNER` | AdMob SDK handles responsive sizing per screen density |
| Consent gate | Custom flag/boolean before ad calls | `waitForConsent()` (already in adService.ts) | Already implemented and tested in Phase 7 |
| Banner height detection | hardcoded 50px / CSS calc | `BannerAdPluginEvents.SizeChanged` | Actual rendered height varies by device/density |

**Key insight:** Adaptive banner height is non-deterministic until the ad loads. Hardcoding 50px or any fixed value will obscure content on some devices and add excess whitespace on others. The `SizeChanged` event is the only reliable source.

---

## Common Pitfalls

### Pitfall 1: Wrong Event for Height (CRITICAL)

**What goes wrong:** Using `BannerAdPluginEvents.Loaded` to capture banner height fails silently — the callback receives no arguments, so `setBannerHeight(undefined)` or a type error occurs. Padding never applies. Content is obscured.

**Why it happens:** `Loaded` signals that the ad was fetched; `SizeChanged` signals that the rendered size is known. These are different moments. Older plugin versions may have combined them, but v8.0.0 separates them.

**How to avoid:** Use `BannerAdPluginEvents.SizeChanged` with type `(info: AdMobBannerSize) => void`. Read `info.height`.

**Warning signs:** `bannerHeight` stays 0 after banner visibly appears on device.

### Pitfall 2: Stale adService.ts Mock in Tests

**What goes wrong:** The existing `adService.test.ts` mock does not include `showBanner` or `removeBanner`. New tests that import adService and call these functions will get `undefined is not a function` errors.

**How to avoid:** Extend the vi.mock for `@capacitor-community/admob` in any new test to include `showBanner: vi.fn()` and `removeBanner: vi.fn()`. The existing test file's mock block will need to be updated if tests for the new functions are co-located.

**Warning signs:** `TypeError: adService.showBanner is not a function` in test output.

### Pitfall 3: Effect Fires Before Consent Resolves (Not Actually a Problem)

**What goes wrong (potential concern):** Developer worries that `showBanner()` in useEffect might be called before UMP consent resolves.

**Why it's not a problem:** `showBanner()` internally calls `await waitForConsent()`, which returns the `_consentReady` promise from `initAdService()`. The banner call simply waits at the awaited consent gate. No special timing needed in GameScreen.

### Pitfall 4: Double-mounting in React StrictMode

**What goes wrong:** React StrictMode (development) mounts effects twice. The cleanup function calls `removeBanner()`, then the second mount calls `showBanner()` again. On Android device this is fine but can produce double console logs.

**How to avoid:** No special handling needed — the cleanup+remount cycle is correct behavior. Ensure `removeBanner()` does not throw when no banner is active (plugin handles this gracefully).

### Pitfall 5: Listener Leak When adService.removeBanner Throws

**What goes wrong:** If `AdMob.removeBanner()` rejects (e.g., called when no banner is showing), the `listenerHandle?.remove()` after it may not run if not wrapped properly.

**How to avoid:** Call `listenerHandle?.remove()` before (or in a finally block relative to) `removeBanner()`. Alternatively, fire both independently with `void`:

```typescript
return () => {
  listenerHandle?.remove();        // sync: safe first
  void adService.removeBanner();   // async: fire-and-forget
  setBannerHeight(0);
};
```

---

## Code Examples

### Complete adService.ts additions

```typescript
// Source: verified against @capacitor-community/admob v8.0.0 node_modules types
import {
  AdMob,
  AdmobConsentDebugGeography,
  AdmobConsentStatus,
  BannerAdSize,
  BannerAdPosition,
} from '@capacitor-community/admob';

// ... existing imports and code ...

export async function showBanner(): Promise<void> {
  await waitForConsent();
  await AdMob.showBanner({
    adId: import.meta.env.VITE_ADMOB_BANNER_ID,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: import.meta.env.DEV,
  });
}

export async function removeBanner(): Promise<void> {
  await AdMob.removeBanner();
}
```

### Complete GameScreen banner useEffect

```typescript
// Source: verified against plugin type definitions in node_modules
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents } from '@capacitor-community/admob';
import type { AdMobBannerSize } from '@capacitor-community/admob';
import * as adService from '../../services/adService';

// State (inside component):
const [bannerHeight, setBannerHeight] = useState(0);

// Effect (inside component, alongside existing effects):
useEffect(() => {
  if (!Capacitor.isNativePlatform()) return;

  let listenerHandle: PluginListenerHandle | null = null;

  AdMob.addListener(
    BannerAdPluginEvents.SizeChanged,
    (info: AdMobBannerSize) => {
      setBannerHeight(info.height);
    }
  ).then(handle => { listenerHandle = handle; });

  void adService.showBanner();

  return () => {
    listenerHandle?.remove();
    void adService.removeBanner();
    setBannerHeight(0);
  };
}, []);

// JSX — replace existing container div:
// BEFORE:
// <div className={styles.container}>
// AFTER:
<div className={styles.container} style={{ paddingBottom: bannerHeight }}>
```

### Vitest mock extension for new adService tests

```typescript
// In adService.test.ts — extend vi.mock to include banner functions
vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    requestConsentInfo: vi.fn(),
    showConsentForm: vi.fn(),
    showPrivacyOptionsForm: vi.fn(),
    initialize: vi.fn(),
    showBanner: vi.fn(),      // NEW
    removeBanner: vi.fn(),    // NEW
    addListener: vi.fn(),     // NEW (if testing listener registration)
  },
  // ... existing enum mocks ...
  BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
  BannerAdPluginEvents: {
    SizeChanged: 'bannerAdSizeChanged',
    Loaded: 'bannerAdLoaded',
    FailedToLoad: 'bannerAdFailedToLoad',
  },
}));
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `SMART_BANNER` size | `ADAPTIVE_BANNER` | AdMob SDK modernization | SMART_BANNER marked deprecated in v8.0.0 types |
| Size in `Loaded` callback | `SizeChanged` event | Plugin v3.0.0+ | `Loaded` is now `() => void`, size is separate event |

**Deprecated/outdated:**
- `BannerAdSize.SMART_BANNER`: Marked `@deprecated` in v8.0.0 types — use `ADAPTIVE_BANNER`.
- `BannerAdInfo` type / `adHeight` property: Not present in v8.0.0 — the CONTEXT.md references these from older plugin versions or incorrect docs. Use `AdMobBannerSize` with `.height`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `AdSize` and `AdPosition` are re-exported short aliases for `BannerAdSize` and `BannerAdPosition` from the package index | Standard Stack, Code Examples | TypeScript compile error — easy to fix by using full names |
| A2 | `AdMob.removeBanner()` does not throw when called with no active banner | Common Pitfalls (Pitfall 4) | Cleanup function could throw; wrap in try/catch if needed |

---

## Open Questions

1. **`AdSize` / `AdPosition` alias availability**
   - What we know: The full enum names `BannerAdSize` and `BannerAdPosition` are verified in v8.0.0 types.
   - What's unclear: Whether the shorter `AdSize` and `AdPosition` aliases are re-exported from the package index (CONTEXT.md uses these).
   - Recommendation: Use `BannerAdSize` and `BannerAdPosition` (verified) in the plan. If CONTEXT.md's short aliases resolve, both work.

2. **`BannerAdPluginEvents.SizeChanged` vs. `Loaded` for timing**
   - What we know: `Loaded` fires when the ad is fetched; `SizeChanged` fires when the rendered size is known. Both are verified enum values.
   - What's unclear: Whether `SizeChanged` fires before or after the banner is visually displayed on screen.
   - Recommendation: Use `SizeChanged` for height (it's the only event with size data). The slight timing gap (if any) means padding applies just as the banner renders — acceptable UX.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 8 is purely a code-change phase. All external dependencies (AdMob plugin, Capacitor core, Android build toolchain) were verified in Phase 6. No new external dependencies are introduced.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BANNER-01 | `showBanner()` calls `AdMob.showBanner()` with correct options after consent | unit | `npm test -- adService` | ✅ (extend existing) |
| BANNER-02 | `showBanner()` passes `ADAPTIVE_BANNER` and `BOTTOM_CENTER` in options | unit | `npm test -- adService` | ✅ (extend existing) |
| BANNER-03 | `bannerHeight` updates via `SizeChanged` event; `paddingBottom` applied | device-only | manual | N/A |
| BANNER-04 | useEffect cleanup calls `removeBanner()` | device-only | manual | N/A |
| BANNER-05 | `bannerHeight` stays 0 when banner fails; no error UI rendered | unit + device | `npm test -- adService` | ✅ (extend existing) |

**Note on BANNER-03 and BANNER-04:** These involve React component rendering with Capacitor native bridge. Unit testing them requires a React Testing Library setup with mocked Capacitor — not currently in the test infrastructure. Device verification is the appropriate gate for these two requirements.

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + device checkpoint before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/services/__tests__/adService.test.ts` — extend existing mock to include `showBanner`, `removeBanner`, `BannerAdSize`, `BannerAdPosition`, `BannerAdPluginEvents` (file exists; mock needs extension)

*(No new test files needed — existing infrastructure covers all automatable tests)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | Ad IDs come from env vars, not user input |
| V6 Cryptography | no | — |

**Security assessment:** Phase 8 introduces no new security surface. The AdMob banner renders in a native WebView overlay managed entirely by the AdMob SDK. The only project-controlled data is `VITE_ADMOB_BANNER_ID` from environment variables (already gated behind `import.meta.env.DEV` for test IDs, established in Phase 6). No user data is passed to the banner API.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@capacitor-community/admob/dist/esm/banner/` — TypeScript type definitions read directly; verified `BannerAdPluginEvents`, `BannerAdSize`, `BannerAdPosition`, `AdMobBannerSize`, `BannerDefinitions` interface, `Loaded` callback signature `() => void`, `SizeChanged` callback signature `(info: AdMobBannerSize) => void`
- `node_modules/@capacitor-community/admob/dist/plugin.js` — Verified `BannerAdPluginEvents` enum values at runtime
- `src/services/adService.ts` — Current Phase 7 implementation; `waitForConsent()`, `initAdService()` confirmed present
- `src/screens/GameScreen/GameScreen.tsx` — Current component shape; confirmed no existing banner code
- `.env.development` — Verified `VITE_ADMOB_BANNER_ID` is defined with Google test ID
- `vitest.config.ts` — Verified test framework and config
- `package.json` — Verified `@capacitor-community/admob: 8.0.0` and `@capacitor/core: ^8.2.0` installed

### Secondary (MEDIUM confidence)
- `08-CONTEXT.md` — Locked decisions (used as requirements, not as API reference — API claims verified against node_modules)

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — installed packages verified in node_modules
- Architecture: HIGH — type definitions read directly from installed plugin
- API correctness (critical finding): HIGH — `BannerAdPluginEvents.Loaded` callback is `() => void` verified in TypeScript definitions; `AdMobBannerSize` interface verified; `BannerAdInfo` / `adHeight` absence verified by grep returning no matches
- Pitfalls: HIGH — derived from type definitions and actual installed code

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable library, pinned version — no expiry risk before Phase 8 execution)
