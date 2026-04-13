# Phase 9: Interstitial Ad — Research

**Researched:** 2026-04-13
**Domain:** @capacitor-community/admob interstitial API, React component refactor, async event-driven promise patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **adService extension** — Extend `adService.ts` with `prepareInterstitial()` and `showInterstitialIfDue()`. No new file. Same singleton pattern from Phases 7–8.
2. **Win counter ownership** — `_winCount` lives as a module-level variable inside `adService.ts`. Session-only by definition. GameScreen never tracks wins for ad purposes.
3. **WinModal integration** — GameScreen passes `onNextPuzzle` and `onBackToSelection` callback props to WinModal. WinModal drops `useNavigate()` internally — becomes fully callback-driven. GameScreen owns all ad + navigate logic via `handleWinNavigate`.
4. **Timeout guard** — `Promise.race` inside `showInterstitialIfDue()`, 5-second timeout. Caller just `await`s.
5. **Interstitial preload lifecycle** — `prepareInterstitial()` called once in a GameScreen `useEffect` on mount, guarded by `Capacitor.isNativePlatform()`. No unmount cleanup — preloaded ad stays valid.
6. **Web/non-native guard** — `Capacitor.isNativePlatform()` check in `handleWinNavigate`, matching Phase 8 banner pattern.

### Claude's Discretion

None specified.

### Deferred Ideas (OUT OF SCOPE)

- Banner ad (Phase 8, complete)
- Real production ad IDs (Phase 10)
- Rewarded video ads (deferred to v1.2+ per REQUIREMENTS.md)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INTER-01 | An interstitial ad is preloaded when the GameScreen mounts | `prepareInterstitial()` in a `useEffect([], [])` on mount, guarded by `Capacitor.isNativePlatform()` |
| INTER-02 | The interstitial is shown every 3rd puzzle win, triggered when user taps "Next Puzzle" or "Back to Selection" in WinModal | `showInterstitialIfDue()` increments `_winCount`, shows on `_winCount % 3 === 0`; WinModal callbacks inject from GameScreen |
| INTER-03 | The interstitial is reloaded automatically after each showing via the `Dismissed` event | Inside `showInterstitialIfDue`, listener on `InterstitialAdPluginEvents.Dismissed` calls `void prepareInterstitial()` |
| INTER-04 | A timeout guard (5–8 seconds) ensures WinModal always appears even if interstitial fails | `Promise.race([showAndWait, timeout])` with 5 000 ms timeout inside `showInterstitialIfDue()` |
| INTER-05 | Win counter resets on app restart (session-only) | Module-level `_winCount` — JavaScript module scope resets on app restart; zero persistence code needed |
</phase_requirements>

---

## Summary

Phase 9 is a surgical extension to an already-established service pattern. The `adService.ts` singleton already handles GDPR consent gating (`waitForConsent()`), banner lifecycle, and the `Capacitor.isNativePlatform()` guard. The interstitial work adds two exported functions and refactors WinModal to be callback-driven so GameScreen can intercept navigation and inject ad logic.

The `@capacitor-community/admob` v8.0.0 plugin is already installed and confirmed working (Phase 8). All interstitial API methods (`AdMob.prepareInterstitial`, `AdMob.showInterstitial`, `InterstitialAdPluginEvents.Dismissed`) exist and are verified in the installed package. The test interstitial ad unit ID (`VITE_ADMOB_INTERSTITIAL_ID`) is already defined in `.env.development`.

The WinModal refactor is the most structurally significant change: replacing two internal `useNavigate()` calls with injected `onNextPuzzle` / `onBackToSelection` callback props. This is a net reduction in WinModal complexity (removes the `useNavigate` import and local navigation logic) while moving that authority to GameScreen, which is the correct owner.

**Primary recommendation:** Follow the locked CONTEXT.md design exactly — the shape is already specified at code level with no ambiguous choices remaining.

---

## Standard Stack

### Core (already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@capacitor-community/admob` | 8.0.0 | Interstitial API (`prepareInterstitial`, `showInterstitial`, `InterstitialAdPluginEvents`) | Already installed, Phase 8 proven [VERIFIED: node_modules] |
| `@capacitor/core` | (project version) | `Capacitor.isNativePlatform()`, `PluginListenerHandle` | Already in use throughout app [VERIFIED: GameScreen.tsx] |

### No new installations required

All packages needed for Phase 9 are already present in the project. [VERIFIED: package.json via Phase 8]

---

## Architecture Patterns

### Pattern 1: adService.ts module-level state

Module-level variables in `adService.ts` (like `_consentReady`) are the established pattern for singleton ad state. `_winCount` follows this exactly.

```typescript
// Source: verified in src/services/adService.ts
let _consentReady: Promise<void> = Promise.resolve();
// Phase 9 adds:
let _winCount = 0;
```

### Pattern 2: Promise.race for ad timeout

`showInterstitialIfDue()` races the Dismissed event promise against a 5-second timeout. If the ad never fires `Dismissed` (hang, error, or FailedToShow), the timeout wins and the caller proceeds. The reload (`void prepareInterstitial()`) still fires inside the Dismissed listener when/if it eventually fires — this is intentional and harmless.

```typescript
// Source: 09-CONTEXT.md locked design
export async function showInterstitialIfDue(): Promise<void> {
  _winCount++;
  if (_winCount % 3 !== 0) return;
  await waitForConsent();
  const showAndWait = new Promise<void>((resolve) => {
    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      void prepareInterstitial();
      resolve();
    });
    void AdMob.showInterstitial();
  });
  const timeout = new Promise<void>((res) => setTimeout(res, AD_TIMEOUT_MS));
  await Promise.race([showAndWait, timeout]);
}
```

### Pattern 3: Listener handle cleanup (Phase 8 established pattern)

Phase 8 stores the `addListener` result in a `PluginListenerHandle` and calls `handle.remove()` in the `useEffect` cleanup. The interstitial `addListener` inside `showInterstitialIfDue` is a one-shot listener inside an async function — it does not need cleanup because it resolves once and the function returns.

However, a subtle leak exists if `Promise.race` exits via timeout before `Dismissed` fires: the listener remains registered. For the test/dev build this is acceptable. If desired, the listener handle can be captured and `.remove()`'d after `Promise.race` resolves — see Pitfall 2 below.

### Pattern 4: WinModal callback injection

Current WinModal owns navigation internally via `useNavigate()`. After Phase 9 it receives `onNextPuzzle: () => void` and `onBackToSelection: () => void` props, and calls those instead. GameScreen provides async handlers that `await showInterstitialIfDue()` before calling `navigate()`.

```typescript
// Source: 09-CONTEXT.md locked design
const handleWinNavigate = async (action: () => void) => {
  if (Capacitor.isNativePlatform()) {
    await showInterstitialIfDue();
  }
  action();
};
```

### Anti-Patterns to Avoid

- **Calling `AdMob.showInterstitial()` before `prepareInterstitial()` completes:** Will result in `FailedToShow`. Always preload on mount and reload after each show.
- **Persisting `_winCount` to localStorage:** INTER-05 requires session-only; no persistence code should be added.
- **Blocking the WinModal render behind the ad promise:** The `await showInterstitialIfDue()` runs only when the user taps a button, not at win time. WinModal is already visible before the button tap.
- **Calling ad APIs on web:** The `Capacitor.isNativePlatform()` guard in `handleWinNavigate` and the preload `useEffect` must be maintained.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interstitial load/show/dismiss | Custom fetch/webview ad | `AdMob.prepareInterstitial` / `AdMob.showInterstitial` | Native full-screen ad with GDPR compliance baked in |
| Timeout guard | Async retry loop | `Promise.race` with `setTimeout` | Standard JS concurrency primitive — correct, no retries needed |
| Session counter | localStorage / Zustand | Module-level `let _winCount` | Module scope is reset on app restart — zero persistence code |

---

## Common Pitfalls

### Pitfall 1: Listener fires multiple times if `showInterstitialIfDue` is called rapidly
**What goes wrong:** If the user somehow triggers `handleWinNavigate` twice (double-tap), `_winCount` may increment twice and `Dismissed` listeners accumulate.
**Why it happens:** The async nature means the second call can enter before the first resolves.
**How to avoid:** The `_winCount % 3 !== 0` early-return means only every 3rd call proceeds to `addListener` + `showInterstitial`. Double-taps within a single win are extremely unlikely, but the WinModal being visible blocks further interaction. No specific guard is needed for this phase.
**Warning signs:** Stacked `Dismissed` events causing double `prepareInterstitial()` calls (harmless redundancy).

### Pitfall 2: Orphaned listener after timeout
**What goes wrong:** If the timeout branch wins `Promise.race`, the `Dismissed` listener remains registered. If the ad eventually fires `Dismissed` later (rare), `prepareInterstitial()` is called at an unexpected time.
**Why it happens:** `Promise.race` exits immediately without cleaning up the losing branch's side effects.
**How to avoid:** Capture the listener handle; remove it after `Promise.race` settles.

```typescript
// Safer pattern — listener cleanup after race:
let listenerHandle: PluginListenerHandle | null = null;
const showAndWait = new Promise<void>((resolve) => {
  AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
    void prepareInterstitial();
    resolve();
  }).then((h) => { listenerHandle = h; });
  void AdMob.showInterstitial();
});
const timeout = new Promise<void>((res) => setTimeout(res, AD_TIMEOUT_MS));
await Promise.race([showAndWait, timeout]);
listenerHandle?.remove();
```

The CONTEXT.md locked design does NOT include this cleanup. Follow the locked design exactly; the planner may note the pitfall in a verification step.

### Pitfall 3: `prepareInterstitial` throws if consent not yet resolved
**What goes wrong:** If `prepareInterstitial()` is called before `initAdService()` or before consent resolves, `waitForConsent()` blocks indefinitely (or the call throws on web).
**Why it happens:** The `useEffect` on mount fires early.
**How to avoid:** `prepareInterstitial()` internally `await waitForConsent()` — same gate as `showBanner()`. The `Capacitor.isNativePlatform()` guard prevents web calls entirely. [VERIFIED: adService.ts pattern]

### Pitfall 4: `VITE_ADMOB_INTERSTITIAL_ID` undefined in production build
**What goes wrong:** Production `AdMob.prepareInterstitial` uses `undefined` as adId.
**Why it happens:** `.env.production` only gets created in Phase 10.
**How to avoid:** Phase 9 is test/dev builds only. The `isTesting: import.meta.env.DEV` flag ensures Google's test response is returned regardless. This is a Phase 10 concern.

### Pitfall 5: WinModal `onClose` vs callback props conflict
**What goes wrong:** After refactor, WinModal still calls `onClose()` from `handleNextPuzzle` / `handleBackToSelection` internally. If the injected callbacks ALSO call `setShowWinModal(false)`, `onClose` is called twice.
**Why it happens:** The current WinModal calls `onClose()` at end of each handler. The CONTEXT.md locked design has GameScreen's lambda call `setShowWinModal(false)` as part of `action()`.
**How to avoid:** Remove `onClose()` calls from inside WinModal's navigation handlers. The new callbacks already include `setShowWinModal(false)`. Keep `onClose` prop only for the close/X button if one exists (not currently present in WinModal). [VERIFIED: WinModal.tsx — no X button; `onClose` is currently called inside `handleNextPuzzle` and `handleBackToSelection`]

---

## Code Examples

### Verified plugin enum values
```typescript
// Source: node_modules/@capacitor-community/admob/dist/esm/interstitial/interstitial-ad-plugin-events.enum.js [VERIFIED]
InterstitialAdPluginEvents.Dismissed = "interstitialAdDismissed"
InterstitialAdPluginEvents.FailedToLoad = "interstitialAdFailedToLoad"
InterstitialAdPluginEvents.FailedToShow = "interstitialAdFailedToShow"
InterstitialAdPluginEvents.Loaded = "interstitialAdLoaded"
InterstitialAdPluginEvents.Showed = "interstitialAdShowed"
```

### Verified: `AdMob.removeAllListeners()` exists
```typescript
// Source: node_modules/@capacitor-community/admob/dist/plugin.cjs.js [VERIFIED]
typeof AdMob.removeAllListeners === 'function'  // true
// STATE.md blocker [Phase 9] is resolved — removeAllListeners is available
```

### Current WinModal navigation — what must be removed
```typescript
// Source: src/screens/GameScreen/WinModal.tsx [VERIFIED — lines 49-60]
// REMOVE: internal useNavigate, handleNextPuzzle body, handleBackToSelection body
const navigate = useNavigate();  // <-- remove import + usage

const handleNextPuzzle = () => {
  if (nextPuzzle) {
    navigate(`/play/${nextPuzzle.difficulty}/${nextPuzzle.id}`);
  } else {
    navigate(`/puzzles?difficulty=${difficulty}`);
  }
  onClose();  // <-- this call must be removed (GameScreen callback handles it)
};

const handleBackToSelection = () => {
  navigate(`/puzzles?difficulty=${difficulty}`);
  onClose();  // <-- this call must be removed
};
```

### Current WinModal props interface — what changes
```typescript
// Source: src/screens/GameScreen/WinModal.tsx [VERIFIED — lines 11-18]
// Current:
interface WinModalProps {
  puzzleId: string;
  difficulty: string;
  moveCount: number;
  minMoves: number;
  timeMs: number;
  isNewPersonalBest: boolean;
  onClose: () => void;  // currently used for navigation; after Phase 9, still needed? No — remove or keep as optional
}

// After Phase 9 (add):
  onNextPuzzle: () => void;
  onBackToSelection: () => void;
// `difficulty` prop may become unused if WinModal no longer owns back-to-selection navigation.
// Keep `difficulty` for now — it is also used by the leaderboard display (none currently).
// Actually difficulty is currently only used in handleBackToSelection. After refactor it becomes unused in WinModal.
// Decision: keep it if needed by leaderboard, remove if truly unused.
```

### Current GameScreen WinModal usage — what changes
```typescript
// Source: src/screens/GameScreen/GameScreen.tsx [VERIFIED — lines 135-145]
// Current:
{showWinModal && puzzleId && (
  <WinModal
    puzzleId={puzzleId}
    difficulty={difficulty ?? 'beginner'}
    moveCount={state.moveCount}
    minMoves={minMoves}
    timeMs={(state.endTime ?? Date.now()) - (state.startTime ?? Date.now())}
    isNewPersonalBest={isNewPersonalBest}
    onClose={() => setShowWinModal(false)}
  />
)}
// After Phase 9: add onNextPuzzle and onBackToSelection; onClose may be removed or kept for other uses
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ad show + navigate in same tick | `await showInterstitialIfDue()` then navigate | AdMob SDK best practice | Ensures ad is fully dismissed before navigation |
| Interstitial on every win | Frequency cap via win counter | Standard monetization UX pattern | Prevents user fatigue |

---

## Runtime State Inventory

Step 2.5: SKIPPED — Phase 9 is a feature addition (new functions + component refactor), not a rename/refactor/migration phase. No stored strings, live service configs, or OS registrations are affected.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@capacitor-community/admob` | All interstitial API | Yes | 8.0.0 | — |
| `VITE_ADMOB_INTERSTITIAL_ID` env var | `prepareInterstitial()` | Yes | Google test ID configured | — |
| Android device/emulator | Test interstitial display | Yes (Phase 8 verified) | Android emulator + physical device | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

nyquist_validation not explicitly set to false in config.json — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual device testing (no automated test framework detected for Capacitor native flows) |
| Config file | None |
| Quick run command | `npx cap run android` |
| Full suite command | `npx cap run android` + manual win-3-puzzles flow |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTER-01 | Interstitial preloads on GameScreen mount | manual smoke | `npx cap run android` — check logcat for "Interstitial loaded" | N/A |
| INTER-02 | Ad shows on 3rd win, triggered by button tap | manual integration | Win 3 puzzles, tap "Next Puzzle" on 3rd win | N/A |
| INTER-03 | Interstitial reloads after dismiss | manual integration | Win 6 puzzles — ad must show on win 3 and win 6 | N/A |
| INTER-04 | WinModal appears within 5s even if ad fails | manual integration | Force FailedToShow (network off) — WinModal must appear | N/A |
| INTER-05 | Win counter resets on restart | manual integration | Win 2 puzzles, restart app, win 1 puzzle — no ad should show | N/A |

### Sampling Rate
- **Per task commit:** TypeScript compilation (`npx tsc --noEmit`)
- **Per wave merge:** `npx cap run android` smoke run
- **Phase gate:** Full manual INTER-01..05 verification flow before `/gsd-verify-work`

### Wave 0 Gaps
- None — no automated test files needed for this phase (native ad flow is manual-only)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | No | Ad IDs are env vars, not user input |
| V6 Cryptography | No | — |

No new security surface introduced. The GDPR consent gate (`waitForConsent()`) is already established in Phase 7 and is reused unchanged.

---

## Open Questions (RESOLVED)

1. **`difficulty` prop in WinModal after refactor**
   - What we know: `difficulty` is currently only used inside `handleBackToSelection` to build the navigate URL.
   - What's unclear: After GameScreen owns navigation, `difficulty` may become unused in WinModal, causing a TypeScript lint warning.
   - Recommendation: Remove `difficulty` from WinModal props if it has no other use in WinModal (currently it does not — leaderboard uses `puzzleId` not `difficulty`). GameScreen already has `difficulty` from `useParams`.
   - **RESOLVED:** Plan 02 Task 1 removes `difficulty` from `WinModalProps` per CONTEXT.md locked decision.

2. **`onClose` prop after refactor**
   - What we know: `onClose` is currently called inside both navigation handlers AND passed from GameScreen as `() => setShowWinModal(false)`.
   - What's unclear: After the refactor, if WinModal drops internal navigation, does `onClose` still serve a purpose?
   - Recommendation: Remove `onClose` entirely from WinModal since the new `onNextPuzzle`/`onBackToSelection` callbacks include `setShowWinModal(false)`. Only needed if WinModal has a dedicated close/X button (it does not currently).
   - **RESOLVED:** Plan 02 Task 1 removes `onClose` from `WinModalProps`; new `onNextPuzzle`/`onBackToSelection` callbacks already call `setShowWinModal(false)`.

3. **`nextPuzzle` logic in WinModal vs GameScreen**
   - What we know: WinModal calls `getNextPuzzle(puzzleId)` to decide whether to show "Next Puzzle" or "More Puzzles" button label, and to compute the navigate target.
   - What's unclear: The CONTEXT.md locked design has GameScreen build the navigation logic. GameScreen's lambda for `onNextPuzzle` uses `nextPuzzle` — so GameScreen needs to also call `getNextPuzzle(puzzleId)`.
   - Recommendation: Keep `getNextPuzzle` in both GameScreen (for the callback logic) and WinModal (for the button label). Or pass `hasNextPuzzle: boolean` as a prop. Either is fine — the planner should pick one.
   - **RESOLVED:** Plan 02 Task 2 keeps `getNextPuzzle` in both WinModal (button label) and adds it to GameScreen (callback navigation logic).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The interstitial listener inside `showInterstitialIfDue` will not fire during non-interstitial contexts (e.g., won't be triggered by a banner event) | Architecture Patterns | Stray `Dismissed` events could cause unexpected `prepareInterstitial()` calls — LOW risk given distinct event names [VERIFIED: enum values are distinct strings] |

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@capacitor-community/admob/dist/esm/interstitial/interstitial-ad-plugin-events.enum.js` — InterstitialAdPluginEvents enum values [VERIFIED]
- `node_modules/@capacitor-community/admob/dist/plugin.cjs.js` — `prepareInterstitial`, `showInterstitial`, `removeAllListeners` all confirmed as functions [VERIFIED]
- `src/services/adService.ts` — current service shape, `waitForConsent()` pattern [VERIFIED]
- `src/screens/GameScreen/GameScreen.tsx` — current Phase 8 implementation, listener handle pattern, WinModal usage [VERIFIED]
- `src/screens/GameScreen/WinModal.tsx` — current props interface, navigation logic, what must change [VERIFIED]
- `.env.development` — `VITE_ADMOB_INTERSTITIAL_ID` present with Google test ID [VERIFIED]
- `.planning/phases/09-interstitial-ad/09-CONTEXT.md` — all locked decisions [VERIFIED]

### Secondary (MEDIUM confidence)
- STATE.md blocker note: "Confirm `AdMob.removeAllListeners()` exists in plugin v8.0.0" — now resolved: confirmed present [VERIFIED: plugin.cjs.js]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in node_modules, no new installs
- Architecture: HIGH — all locked decisions verified against actual codebase files
- Pitfalls: HIGH — derived from direct code analysis of WinModal.tsx and adService.ts

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable — no external dependencies changing)
