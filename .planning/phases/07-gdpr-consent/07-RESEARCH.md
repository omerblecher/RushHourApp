# Phase 7: GDPR Consent - Research

**Researched:** 2026-04-13
**Domain:** @capacitor-community/admob UMP consent flow, TypeScript singleton services, React/Capacitor startup integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**adService shape:** Plain TypeScript singleton module — same pattern as `soundService.ts` and `scoreService.ts`. No Zustand store.
- Export `initAdService()` — kicks off the UMP consent flow, stores result in a module-level promise
- Export `waitForConsent()` — returns that promise; Phase 8+ await this before any ad API call
- Export `showConsentForm()` — calls UMP's `showPrivacyOptionsForm` for the "revisit consent" entry point

**App startup integration:** `initAdService()` is called in `main.tsx` before `ReactDOM.createRoot`, fire-and-forget. The app never blocks on consent — it proceeds to render immediately.
- UMP consent dialog appears as a native overlay when required (EEA users on first launch)
- No loading screen, no React gate — the app is fully usable while consent resolves
- Phases 8 and 9 await `waitForConsent()` before touching any ad API

**Consent settings entry point:** "Privacy Settings" button added to ProfileScreen — no new screen or route needed.
- Button calls `adService.showConsentForm()` at the bottom of the profile section
- Satisfies GDPR-05

**EEA debug strategy:** `VITE_ADMOB_DEBUG_EEA=true` env var in `.env.development`.
- adService reads `import.meta.env.VITE_ADMOB_DEBUG_EEA` at runtime
- When `true`, sets `debugGeography = AdmobConsentDebugGeography.EEA` in the UMP request
- `VITE_ADMOB_DEBUG_DEVICE_ID` can optionally be set for UMP whitelisting
- NOT present in `.env.production`

**Phase Scope Boundary:** adService.ts singleton with UMP consent flow, consent state promise, and "Privacy Settings" entry point in ProfileScreen. No ad loading or showing this phase.

### Claude's Discretion

None stated — all implementation decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- Banner ad display (Phase 8)
- Interstitial ad display (Phase 9)
- Real production ad IDs (Phase 10)
- Any ad loading or showing — consent flow only
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GDPR-01 | App requests UMP consent info on every launch before any ad is initialized or loaded | `requestConsentInfo()` called in `initAdService()`, which fires from `main.tsx` before `createRoot` |
| GDPR-02 | EU/EEA users see a consent form on first launch (and whenever consent has expired or changed) | `showConsentForm()` plugin method wraps `loadAndShowConsentFormIfRequired` natively; triggers automatically when status is REQUIRED |
| GDPR-03 | Non-EU users are not shown a consent dialog and proceed directly to ad loading | UMP SDK sets `canRequestAds = true` and `status = NOT_REQUIRED` for non-EEA geography; no form shown |
| GDPR-04 | No ad (banner or interstitial) is loaded or displayed until the consent flow has completed | `_consentReady` promise resolves only after consent flow completes; Phases 8/9 await `waitForConsent()` |
| GDPR-05 | User can re-open the privacy/consent settings from within the app (privacy settings entry point) | "Privacy Settings" button in ProfileScreen calls `showConsentForm()` → `showPrivacyOptionsForm()` |
</phase_requirements>

---

## Summary

Phase 7 implements the GDPR User Messaging Platform (UMP) consent flow using the `@capacitor-community/admob` plugin (v8.0.0, already installed). The implementation is a single new file — `src/services/adService.ts` — plus surgical additions to two existing files (`src/main.tsx` and `src/screens/ProfileScreen/ProfileScreen.tsx`) and two lines to `.env.development`.

The core pattern is a module-level promise (`_consentReady`) that resolves when the consent flow completes. The app starts rendering immediately (no blocking), and all future ad code (Phases 8 and 9) gates itself behind `await waitForConsent()`. This satisfies GDPR-04 without introducing any React-layer complexity.

The plugin's `showConsentForm()` JS method is verified to call `UserMessagingPlatform.loadAndShowConsentFormIfRequired()` in native Android code — meaning it automatically shows the form only when the UMP SDK determines one is needed (EEA user, first launch, or expired consent). The `showPrivacyOptionsForm()` method is the separate "revisit" entry point used for the ProfileScreen button.

**Primary recommendation:** Implement `adService.ts` as a plain module with three exports (`initAdService`, `waitForConsent`, `showConsentForm`), call `initAdService()` fire-and-forget in `main.tsx`, add the Privacy Settings button to ProfileScreen, and add the two debug env vars to `.env.development`.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `@capacitor-community/admob` | 8.0.0 | UMP consent API: `requestConsentInfo`, `showConsentForm`, `showPrivacyOptionsForm` | [VERIFIED: node_modules package.json + npm registry] |

**No new npm installs required for this phase.** [VERIFIED: plugin already installed in Phase 6]

### Key Plugin Exports Verified from Type Definitions

| Export | Type | Verified Location |
|--------|------|-------------------|
| `AdMob` | plugin instance (default) | `dist/esm/index.d.ts` |
| `AdmobConsentDebugGeography` | enum (EEA=1, DISABLED=0, NOT_EEA=2 deprecated) | `dist/esm/consent/consent-debug-geography.enum.d.ts` |
| `AdmobConsentStatus` | enum (NOT_REQUIRED, OBTAINED, REQUIRED, UNKNOWN) | `dist/esm/consent/consent-status.enum.d.ts` |
| `PrivacyOptionsRequirementStatus` | enum (NOT_REQUIRED, REQUIRED, UNKNOWN) | `dist/esm/consent/privacy-options-requirement-status.enum.d.ts` |
| `AdmobConsentInfo` | interface with `status`, `canRequestAds`, `privacyOptionsRequirementStatus`, `isConsentFormAvailable?` | `dist/esm/consent/consent-info.interface.d.ts` |
| `AdmobConsentRequestOptions` | interface with `debugGeography?`, `testDeviceIdentifiers?[]`, `tagForUnderAgeOfConsent?` | `dist/esm/consent/consent-request-options.interface.d.ts` |

---

## Architecture Patterns

### Singleton Module Pattern (matches project convention)

The project uses plain TS module singletons — not classes, not Zustand — for services. `soundService.ts` exports a named object literal. `adService.ts` should follow the same module-level state pattern.

**Reference implementation (`soundService.ts`):**
- Module-level `let ctx: AudioContext | null = null` — private mutable state
- Named function exports for operations
- No class, no constructor, no default export

`adService.ts` uses the same idea but with a `Promise<void>` instead of `AudioContext`:
- `let _consentReady: Promise<void>` — private module-level promise
- `initAdService()` — sets `_consentReady = runConsentFlow()` (internal async function)
- `waitForConsent()` — returns `_consentReady`
- `showConsentForm()` — calls `AdMob.showPrivacyOptionsForm()`

### Startup Integration Pattern (matches existing `main.tsx`)

Current `main.tsx` already uses fire-and-forget for `initNative()`:
```ts
void initNative();          // fire-and-forget (line 24)
useAuthStore.getState().initAuth();   // sync call (line 25)
createRoot(...).render(...);          // immediate render (line 30)
```

`initAdService()` should be added the same way — before `createRoot`, no `await`, no `void` wrapper needed (the function itself returns void, not a promise).

### Consent Flow Logic (inside `runConsentFlow`)

The internal async function must:
1. Call `AdMob.requestConsentInfo(options)` — updates UMP SDK state, returns `AdmobConsentInfo`
2. If `info.isConsentFormAvailable` AND status is `REQUIRED` (or `UNKNOWN`): call `AdMob.showConsentForm()` — this triggers the native overlay
3. Resolve `_consentReady` when the above completes (including after form dismissed)

**Critical verified fact:** `AdMob.showConsentForm()` in the plugin's JS API calls `UserMessagingPlatform.loadAndShowConsentFormIfRequired()` in Android Java — it is NOT the same as `showPrivacyOptionsForm()`. [VERIFIED: AdConsentExecutor.java line 115]

- `showConsentForm()` → used during app startup flow, shows form if required
- `showPrivacyOptionsForm()` → used for the "revisit consent" entry point in ProfileScreen

### EEA Debug Strategy

```ts
const isDebugEEA = import.meta.env.VITE_ADMOB_DEBUG_EEA === 'true';
const options: AdmobConsentRequestOptions = {};
if (isDebugEEA) {
  options.debugGeography = AdmobConsentDebugGeography.EEA;
  const deviceId = import.meta.env.VITE_ADMOB_DEBUG_DEVICE_ID;
  if (deviceId) options.testDeviceIdentifiers = [deviceId];
}
```

### ProfileScreen Button Placement

ProfileScreen already has a `<section className={styles.section}>` pattern for grouping. The Privacy Settings button should be in its own section below "Sign Out" (or appended to the Sign Out section), using the existing CSS class vocabulary. The ProfileScreen CSS module has `.signOutButton` (red outline) as a reference — the privacy settings button should use a subtler style (e.g., transparent background, muted border color `rgba(255,255,255,0.2)`).

No new CSS file needed — add a `.privacyButton` class to the existing `ProfileScreen.module.css`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EEA geography detection | Custom IP-based geo detection | UMP SDK built into plugin | UMP uses Google's server-side geo data; hand-rolled detection violates GDPR if wrong |
| Consent form UI | React modal/dialog for consent | `AdMob.showConsentForm()` native overlay | Legal requirement: form must come from Google's certified UMP SDK |
| Consent state persistence | localStorage consent cache | UMP SDK manages persistence internally | UMP stores consent state natively (SharedPreferences on Android); don't double-store |
| "canShowAds" boolean | Derive from consent status enum | Use `info.canRequestAds` from `AdmobConsentInfo` | Plugin already computes this composite; the enum alone is insufficient |

**Key insight:** The UMP SDK is a Google-certified legal compliance tool. Any custom logic that replicates, extends, or shortcuts it creates legal exposure and certification failure.

---

## Common Pitfalls

### Pitfall 1: Calling `AdMob.initialize()` before consent resolves
**What goes wrong:** `AdMob.initialize()` must NOT be called before consent is obtained — calling it early causes AdMob to load ads before consent, violating GDPR. Phase 7 deliberately defers `initialize()` to Phase 8.
**Why it happens:** Developers follow AdMob quickstart guides that combine `initialize()` and consent in one block.
**How to avoid:** Phase 7 does NOT call `AdMob.initialize()` at all. Only the consent flow methods are called. Phase 8 will await `waitForConsent()` then call `initialize()`.
**Warning signs:** Any reference to `AdMob.initialize()` in `adService.ts` during Phase 7 is wrong.

### Pitfall 2: Confusing `showConsentForm()` with `showPrivacyOptionsForm()`
**What goes wrong:** Using `showPrivacyOptionsForm()` in the startup flow, or `showConsentForm()` in ProfileScreen — the two serve different purposes.
**Why it happens:** Both are in the plugin; names are similar.
**How to avoid:**
- Startup flow: `showConsentForm()` — shows form only if required (wraps `loadAndShowConsentFormIfRequired`)
- ProfileScreen button: `showPrivacyOptionsForm()` — always shows the privacy options form for revisit
[VERIFIED: AdConsentExecutor.java — confirmed different underlying UMP calls]

### Pitfall 3: `_consentReady` is `undefined` before `initAdService()` is called
**What goes wrong:** If Phase 8 code calls `waitForConsent()` before `initAdService()` has run, `_consentReady` is `undefined`, causing a crash.
**Why it happens:** Tree shaking or import order issues could delay `adService.ts` initialization.
**How to avoid:** Initialize `_consentReady` to a resolved promise as a safe default:
```ts
let _consentReady: Promise<void> = Promise.resolve();
```
Then `initAdService()` replaces it. This ensures `waitForConsent()` never throws even if called early.

### Pitfall 4: `debugGeography` persists in production if env var leaks
**What goes wrong:** If `VITE_ADMOB_DEBUG_EEA=true` appears in `.env.production`, all production users see the consent dialog regardless of location.
**Why it happens:** Copying `.env.development` to create `.env.production`.
**How to avoid:** `.env.production` must NOT contain `VITE_ADMOB_DEBUG_EEA`. Verify it is absent before Phase 10.
[VERIFIED: current `.env.production` does not contain this var]

### Pitfall 5: `showPrivacyOptionsForm()` called when `privacyOptionsRequirementStatus` is NOT_REQUIRED
**What goes wrong:** The plugin rejects the call or shows nothing; error may be swallowed silently.
**Why it happens:** Button always enabled in ProfileScreen regardless of consent state.
**How to avoid:** Either disable the button when `privacyOptionsRequirementStatus === NOT_REQUIRED`, or wrap the call in a try/catch and swallow the error gracefully. Since CONTEXT.md doesn't specify conditional hiding, a try/catch is simpler and lower risk.

---

## Code Examples

Verified patterns from plugin type definitions and codebase conventions:

### Import Pattern
```typescript
// Source: node_modules/@capacitor-community/admob/dist/esm/index.d.ts
import { AdMob, AdmobConsentDebugGeography } from '@capacitor-community/admob';
import type { AdmobConsentRequestOptions } from '@capacitor-community/admob';
```

### `runConsentFlow` Internal Logic
```typescript
// Source: consent-definition.interface.d.ts + AdConsentExecutor.java (verified)
async function runConsentFlow(): Promise<void> {
  const options: AdmobConsentRequestOptions = {};

  if (import.meta.env.VITE_ADMOB_DEBUG_EEA === 'true') {
    options.debugGeography = AdmobConsentDebugGeography.EEA;
    const deviceId = import.meta.env.VITE_ADMOB_DEBUG_DEVICE_ID;
    if (deviceId) options.testDeviceIdentifiers = [deviceId];
  }

  const info = await AdMob.requestConsentInfo(options);

  if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
    await AdMob.showConsentForm(); // native overlay; resolves when user dismisses
  }
  // _consentReady resolves here — canRequestAds is now reliable
}
```

### `adService.ts` Full Shape
```typescript
// Source: CONTEXT.md locked decision + soundService.ts pattern
import { AdMob, AdmobConsentDebugGeography, AdmobConsentStatus } from '@capacitor-community/admob';
import type { AdmobConsentRequestOptions } from '@capacitor-community/admob';

let _consentReady: Promise<void> = Promise.resolve(); // safe default

async function runConsentFlow(): Promise<void> {
  // ... (see above)
}

export function initAdService(): void {
  _consentReady = runConsentFlow();
}

export function waitForConsent(): Promise<void> {
  return _consentReady;
}

export function showConsentForm(): Promise<void> {
  return AdMob.showPrivacyOptionsForm();
}
```

### `main.tsx` Addition
```typescript
// Source: CONTEXT.md + existing main.tsx pattern (line 24: void initNative())
import { initAdService } from './services/adService';
initAdService(); // fire-and-forget — before createRoot
```

### `.env.development` Addition
```
VITE_ADMOB_DEBUG_EEA=true
VITE_ADMOB_DEBUG_DEVICE_ID=TEST_DEVICE_HASH
```

### ProfileScreen Button
```tsx
// Source: CONTEXT.md + ProfileScreen.tsx existing section pattern
import { showConsentForm } from '../../services/adService';

<section className={styles.section}>
  <button
    className={styles.privacyButton}
    onClick={() => void showConsentForm()}
  >
    Privacy Settings
  </button>
</section>
```

---

## Environment Availability

Step 2.6: Phase 7 is code-only changes. External dependencies are the AdMob plugin (already installed in Phase 6, device-verified) and Vite env var injection (already used for ad IDs). No new external tools required.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@capacitor-community/admob` | UMP consent API | Yes | 8.0.0 | — |
| Vite env vars (`import.meta.env`) | Debug EEA flag | Yes | via existing Vite 7.x | — |
| Android device / emulator | Manual testing of consent dialog | Yes (device-verified in Phase 6) | — | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GDPR-01 | `initAdService()` called before `createRoot` | Manual (Capacitor native bridge not testable in Vitest) | — | N/A |
| GDPR-02 | Consent form appears for EEA users | Manual (requires Android device + UMP debug flag) | — | N/A |
| GDPR-03 | No dialog for non-EEA users | Manual (device test without debug flag) | — | N/A |
| GDPR-04 | `waitForConsent()` promise pattern is correct | Unit | `npm test -- adService` | No — Wave 0 gap |
| GDPR-05 | Privacy Settings button calls `showPrivacyOptionsForm` | Manual (UI interaction) | — | N/A |

### GDPR-04 Unit Test Scope

The `_consentReady` promise pattern is the one testable behavior: that `waitForConsent()` returns the promise set by `initAdService()`, and that the safe default (resolved promise) works before `initAdService()` is called. AdMob plugin calls themselves cannot be unit-tested without mocking the Capacitor bridge.

### Sampling Rate
- **Per task commit:** `npm test` (engine tests only — adService unit test once created)
- **Per wave merge:** `npm test`
- **Phase gate:** Manual device test with `VITE_ADMOB_DEBUG_EEA=true` — verify consent dialog appears

### Wave 0 Gaps
- [ ] `src/services/__tests__/adService.test.ts` — unit test for `waitForConsent()` promise shape and safe default (covers GDPR-04 automated portion)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | No | Env vars are build-time constants; no user input |
| V6 Cryptography | No | — |
| V9 Data Protection | Yes | UMP consent must complete before any advertising ID access |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Ad loaded before consent resolves | Information Disclosure (advertising ID collected without consent) | `waitForConsent()` gate enforced in Phases 8/9; never bypass |
| Debug EEA flag in production build | Spoofing (false geography) | `VITE_ADMOB_DEBUG_EEA` absent from `.env.production` [VERIFIED] |
| `showPrivacyOptionsForm()` error swallowed silently | — | Wrap in try/catch; log errors to console in dev |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | UMP SDK caches consent state in Android SharedPreferences between app sessions; no manual persistence is needed | Don't Hand-Roll | If wrong, consent status would reset every launch; EEA users would see form every time |
| A2 | `AdmobConsentStatus.REQUIRED` is the only status that should trigger `showConsentForm()` (UNKNOWN should not) | Code Examples | If UNKNOWN also needs form: first-launch users with unknown status won't see dialog until next launch |

**Note on A2:** The CONTEXT.md implies "form appears when required" — UNKNOWN status typically means `requestConsentInfo` hasn't been called yet, which doesn't apply here since we call it first. OBTAINED means already consented. NOT_REQUIRED means non-EEA. Only REQUIRED needs the form.

---

## Open Questions

1. **Should the Privacy Settings button be hidden when `privacyOptionsRequirementStatus === NOT_REQUIRED`?**
   - What we know: UMP SDK sets this status for non-EEA users; calling `showPrivacyOptionsForm()` when NOT_REQUIRED may be a no-op or error
   - What's unclear: Plugin's behavior when called in NOT_REQUIRED state — reject or silently no-op?
   - Recommendation: Show button always (non-EEA users still get Google's privacy options page), wrap call in try/catch to handle any rejection gracefully. This is the lowest-risk approach.

2. **Should `adService.ts` export `AdmobConsentStatus` types for Phase 8/9 use?**
   - What we know: Phase 8 only needs `waitForConsent()`, not the raw status
   - What's unclear: Whether Phase 8 will need `canRequestAds` from the resolved consent info
   - Recommendation: For now, export only the three functions defined in CONTEXT.md. Phase 8 research can expand if needed.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@capacitor-community/admob/dist/esm/` — All type definitions verified directly from installed plugin v8.0.0
- `node_modules/@capacitor-community/admob/android/src/main/java/com/getcapacitor/community/admob/consent/AdConsentExecutor.java` — Native Android implementation verified; confirmed `showConsentForm()` calls `loadAndShowConsentFormIfRequired` and `showPrivacyOptionsForm()` calls `showPrivacyOptionsForm`
- `src/services/soundService.ts` — Reference singleton pattern (project codebase)
- `src/main.tsx` — Reference startup pattern (fire-and-forget with `void`)
- `src/screens/ProfileScreen/ProfileScreen.tsx` + `ProfileScreen.module.css` — Button insertion context
- `.env.development`, `.env.production` — Verified current contents; production does not contain debug flag

### Secondary (MEDIUM confidence)
- npm registry — `@capacitor-community/admob` latest version confirmed as 8.0.0

### Tertiary (LOW confidence)
- UMP SDK consent state persistence in Android SharedPreferences — [ASSUMED] based on standard Android UMP SDK behavior; not verified in plugin source

---

## Metadata

**Confidence breakdown:**
- Plugin API (exports, method signatures, enum values): HIGH — verified from installed type definitions
- Native behavior (`showConsentForm` vs `showPrivacyOptionsForm` distinction): HIGH — verified from Java source
- Singleton pattern: HIGH — verified from existing project services
- Startup integration pattern: HIGH — verified from existing `main.tsx`
- UMP consent state persistence: LOW — assumed from standard UMP behavior

**Research date:** 2026-04-13
**Valid until:** 2026-07-13 (plugin v8.0.0 stable; UMP API stable)
