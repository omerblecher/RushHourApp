# Feature Landscape: AdMob Ad Monetization (v1.1)

**Domain:** Banner + interstitial ads in a Capacitor 8 / React puzzle game
**Researched:** 2026-04-12
**Plugin:** `@capacitor-community/admob` (Capacitor 8 compatible)

---

## 1. Banner Ad Placement

### Recommended: Bottom of GameScreen, below ControlBar

Place the banner at the very bottom of the `GameScreen` container, below the existing `ControlBar`. This keeps it outside the interactive game board entirely.

**Layout order (top → bottom):**
```
GameHeader       ← top nav / puzzle info
GameHUD          ← move counter, timer
Board            ← 6×6 interactive grid  ← CRITICAL: no ad adjacent here
ControlBar       ← reset / back buttons
[BannerAd]       ← bottom-anchored, full-width
```

**Why bottom, not top:**
- Google's own recommended implementations place the banner at the bottom for game screens. Top placement risks the banner visually competing with GameHeader content and makes it easier for the board drag area to bleed into the ad zone on smaller screens.
- Bottom placement is standard in casual/puzzle games (confirmed by Google's monetize-mobile-game guidance).
- The existing CSS layout (`display: flex; flex-direction: column`) makes appending a bottom banner element straightforward without restructuring.

**Size: `BannerAdSize.ADAPTIVE_BANNER` (preferred) or `BannerAdSize.BANNER` (320×50)**

- `ADAPTIVE_BANNER` respects safe area insets and adjusts width to device, avoiding overflow on narrow phones.
- `BANNER` (320×50 fixed) is simpler but may leave letterbox gaps on wide screens.
- Do NOT use `LARGE_BANNER` (320×100) — too tall on a 6×6 board that already has header + HUD + ControlBar competing for vertical space.

**Position constant:** `BannerAdPosition.BOTTOM_CENTER`

**Critical policy constraint — separation from interactive elements:**
Google's discouraged-banner policy explicitly prohibits banners "on a game play screen where users are continuously interacting with the app" and "next to interactive content." The 6×6 board is continuously interactive. A structural gap (the full ControlBar height, ~56px) between the board and the banner is the minimum safe buffer. Do NOT float the banner over the board or absolutely position it so it overlaps any part of the grid.

**Show/hide lifecycle:**
- Call `AdMob.showBanner()` in a `useEffect` when `GameScreen` mounts (after consent confirmed).
- Call `AdMob.hideBanner()` when `WinModal` is visible — the modal covers the screen, hiding the banner prevents layout jank and avoids rendering an invisible ad impression.
- Call `AdMob.removeBanner()` in the `useEffect` cleanup when `GameScreen` unmounts (navigating away).

---

## 2. Interstitial Timing

### Recommended: After every 3rd win, triggered on WinModal dismiss

**Exact trigger point:** When the user taps "Next Puzzle" or "Back to Selection" inside `WinModal` — i.e., after the modal is actively dismissed, not before it appears.

**Why not immediately on win:**
- The win sequence already has a 2-second confetti animation, then the WinModal appears. Interrupting that sequence with an interstitial would kill the celebration UX.
- Google's interstitial guidance explicitly warns against showing an interstitial "when users are still engaged with a previous action." The confetti + WinModal is part of the win action.
- Showing an interstitial before the user has read their stats (moves, time, rank) violates the natural flow expectation.

**Why not after every win:**
- Showing after every single level produces 15-25% session abandonment in the first session for casual puzzle games (industry data, 2025).
- Google's recommended interstitial implementations explicitly state: "avoid placing an interstitial ad every single time the user does an action."
- Every-level frequency in a 100-puzzle game with short completion times (beginner puzzles can be under 30 seconds) creates a hostile ad-to-gameplay ratio.

**Recommended frequency: every 3 completions**
- Track a win counter in a module-level variable or a lightweight Zustand slice (not persisted to localStorage — reset is fine on app restart).
- Increment on each `state.isWon` detection in `GameScreen`.
- When counter reaches 3, reset to 0 and show interstitial on next dismiss action.
- Every-3 is a widely cited baseline for casual puzzle games; adjust up (every 4-5) if retention data shows drop-off.

**App-level frequency cap:**
- Configure an AdMob app-level frequency cap in the AdMob console as a safety net: max 1 interstitial per 3 minutes per user. This is server-enforced and prevents bugs in your counter from over-serving.

**Prepare-ahead pattern (required for smooth UX):**
Interstitials must be loaded before they are shown. Load the next interstitial immediately after the current one is dismissed — do not wait until the next trigger point.

```
GameScreen mounts → prepareInterstitial() (preload #1)
Win #3 → user dismisses WinModal → showInterstitial()
  → in InterstitialAdPluginEvents.Dismissed handler → prepareInterstitial() (preload #2)
Win #6 → user dismisses WinModal → showInterstitial()
```

Never call `showInterstitial()` without a preceding `prepareInterstitial()` completing successfully. Guard with the `Loaded` event or an `isInterstitialReady` flag.

**Disallowed triggers (hard policy violations):**
- On app launch / cold start
- Immediately on puzzle load (before any interaction)
- When user taps the back button to exit
- Immediately after another interstitial was dismissed
- Mid-drag or while the board is in an animated state

---

## 3. GDPR Consent Flow (UMP SDK)

### Recommended: App-start, before initializing AdMob and before any ad is shown

**Flow:**

```
App starts (App.tsx / root effect)
  ↓
AdMob.initialize({ initializeForTesting: false })
  ↓
AdMob.requestConsentInfo({ debugGeography: ... })
  ↓
if (consentStatus === REQUIRED || consentStatus === UNKNOWN)
  → AdMob.showConsentForm()
  → await form dismissal
  ↓
if (consentStatus === OBTAINED || NOT_REQUIRED)
  → proceed to show ads
  ↓
Banner loads on GameScreen mount
Interstitial preload begins
```

**Key API methods (`@capacitor-community/admob`):**
- `AdMob.requestConsentInfo(options)` — checks whether consent is needed for the user's geography. Must be called on every app start (Google requirement — consent can expire or change).
- `AdMob.showConsentForm()` — shows the Google-hosted UMP form. Only call if status is REQUIRED.
- `AdMob.showPrivacyOptionsForm()` — lets users update their choices later (add a "Privacy Settings" link in your app's settings/menu).

**`debugGeography` for testing:**
```typescript
debugGeography: AdmobConsentDebugGeography.EEA
```
Forces the consent dialog to appear even when running from a non-EEA device, so you can test the full flow during development.

**Where to put consent in the React component tree:**
- Fire `requestConsentInfo` in a top-level `useEffect` in `App.tsx`, before `AuthProvider` renders ad-serving screens. This blocks ad initialization until consent is resolved.
- Do NOT fire it inside `GameScreen` — that's too late in the navigation flow and will cause a flash of un-consented ad loading.

**What changes if consent is NOT granted:**
- Non-personalized ads can still be served (the UMP SDK signals this automatically via Consent Mode). Revenue will be lower but ads will still appear.
- You do not need to manually suppress ads when consent is denied — the SDK handles it. But confirm this with the plugin's documentation for the exact version you install.

**Privacy policy requirement:**
The Play Store listing and in-app privacy policy link must declare that the app shows ads and uses AdMob. This is a Play Store requirement independent of GDPR. The project's privacy policy page already exists; it needs an "Advertising" section added.

---

## 4. Test Mode During Development

### Two-layer approach: `isTesting` flag + Google test ad unit IDs

**Layer 1 — `isTesting: true` on each ad call:**
Pass `isTesting: true` in `BannerAdOptions` and `AdOptions`. This tells the AdMob SDK to serve test creatives from your real ad unit IDs without charging advertisers. Safe to click freely.

```typescript
// Banner
AdMob.showBanner({
  adId: 'ca-app-pub-YOUR_REAL_ID/YOUR_BANNER_UNIT',
  adSize: BannerAdSize.ADAPTIVE_BANNER,
  position: BannerAdPosition.BOTTOM_CENTER,
  isTesting: true,  // dev only
});

// Interstitial
AdMob.prepareInterstitial({
  adId: 'ca-app-pub-YOUR_REAL_ID/YOUR_INTERSTITIAL_UNIT',
  isTesting: true,  // dev only
});
```

**Layer 2 — Google's published test ad unit IDs (Android):**
If you want to develop before your real ad units are approved, use the official Google test unit IDs:

| Ad Type | Test Ad Unit ID |
|---------|----------------|
| Banner | `ca-app-pub-3940256099942544/6300978111` |
| Interstitial | `ca-app-pub-3940256099942544/1033173712` |

These always return test creatives regardless of `isTesting`. Switch to your real unit IDs before release.

**Consent debug geography:**
Add `testDeviceIdentifiers: ['YOUR_DEVICE_ID']` to `requestConsentInfo` options. Your device ID appears in Android logcat as "Use RequestConfiguration.Builder().setTestDeviceIds(...)" when you first run without it.

**Environment variable gate:**
Gate the `isTesting` flag with an environment variable so you cannot accidentally ship it:
```typescript
isTesting: import.meta.env.DEV,
```
Vite sets `import.meta.env.DEV = true` in dev builds and `false` in production builds automatically.

---

## 5. Policy Compliance — What to Build and What to Avoid

### Table Stakes (required to avoid account suspension)

| Requirement | Implementation for Rush Hour |
|-------------|------------------------------|
| Banner not adjacent to interactive game elements | Banner placed below ControlBar with full-component separation from Board |
| Interstitial not on app launch | Never show on cold start; first interstitial only after 3 wins |
| Interstitial not immediately after user action (tap) | Show on WinModal dismiss, after a natural reading pause |
| Interstitial not chained (back-to-back) | Single interstitial per trigger; reload only after dismiss event fires |
| Consent collected before ads initialize | UMP flow in App.tsx before any ad unit is requested |
| Privacy policy declares ads | Update existing privacy policy page with advertising section |

### Differentiators (improves retention and revenue)

| Feature | Value | Notes |
|---------|-------|-------|
| Adaptive banner size | Correct sizing on all Android screen widths | `BannerAdSize.ADAPTIVE_BANNER` vs fixed 320×50 |
| Preload interstitial ahead of trigger | Eliminates "waiting for ad" delay on win #3 | Load immediately after previous dismiss |
| Hide banner during WinModal | Cleaner modal UX; avoids layout jank | `hideBanner()` when `showWinModal` becomes true |
| Per-session win counter (not persisted) | Prevents immediate ad on returning sessions | Counter resets on app restart; feels less aggressive |
| Privacy options re-entry point | GDPR compliance; required for app markets | `showPrivacyOptionsForm()` accessible from settings/menu |
| App-level frequency cap in AdMob console | Server-side safety net against counter bugs | Set in AdMob dashboard, not in code |

### Anti-Features (explicitly avoid)

| Anti-Feature | Why to Avoid | What to Do Instead |
|--------------|--------------|-------------------|
| Banner floating over or within the Board | Direct policy violation, account suspension risk | Structural layout separation, not z-index tricks |
| Interstitial on every win | 15-25% session abandonment; Google guidance prohibits it | Every 3rd win |
| Interstitial on app cold start | Disallowed implementation; immediate policy violation | First ad only after 3 gameplay wins |
| Interstitial on back-button exit | Disallowed; Google explicitly prohibits exit interstitials | Never trigger on navigation away from game |
| Interstitial mid-puzzle (e.g., after N moves) | Breaks gameplay; prohibited | Only at natural break points (between levels) |
| Showing an ad before consent | GDPR violation; can cause Play Store removal | UMP flow must complete first |
| Large banner (320×100) on game screen | Consumes ~15% of screen height on small phones; board becomes unplayable | Use 320×50 or ADAPTIVE_BANNER |
| Rewarded ads without a reward mechanic | Deceptive; requires implementing hint/skip system | Defer rewarded ads to v1.2 when hints are built |

---

## 6. Feature Dependencies

```
GDPR consent flow (App.tsx)
  → AdMob.initialize()
    → Banner ad (GameScreen mount)
    → Interstitial preload (GameScreen mount)
      → Win counter (per-session state)
        → Interstitial show (WinModal dismiss, every 3rd win)
          → Interstitial reload (after dismiss event)
```

The consent flow is the root dependency. No ad should appear before it completes.

---

## 7. MVP Scope for v1.1

**Build now:**
1. GDPR UMP consent flow in App.tsx (blocks everything else)
2. Banner ad on GameScreen — bottom position, hidden during WinModal
3. Interstitial preloaded on GameScreen mount, shown every 3rd win on WinModal dismiss
4. Privacy policy page updated with advertising declaration
5. Test mode with `import.meta.env.DEV` gate

**Defer:**
- Rewarded ads (require hint/skip mechanic — deferred to v1.2)
- iOS ad unit IDs (Android-only target for this milestone per PROJECT.md)
- AdMob mediation / waterfall (not needed at this scale; AdMob direct is sufficient)
- App-open ads (too aggressive for a puzzle game; poor retention impact)

---

## Sources

- [Recommended banner implementations — Google AdMob Help](https://support.google.com/admob/answer/6275335?hl=en)
- [Banner ad guidance — Google AdMob Help](https://support.google.com/admob/answer/6128877?hl=en)
- [Discouraged banner implementations — Google AdMob Help](https://support.google.com/admob/answer/6275345?hl=en)
- [Interstitial ad guidance — Google AdMob Help](https://support.google.com/admob/answer/6066980?hl=en)
- [Recommended interstitial implementations — Google AdMob Help](https://support.google.com/admob/answer/6201350?hl=en)
- [Disallowed interstitial implementations — Google AdMob Help](https://support.google.com/admob/answer/6201362?hl=en)
- [Set frequency caps for apps — Google AdMob Help](https://support.google.com/admob/answer/6244508?hl=en)
- [Set up UMP SDK — Android — Google for Developers](https://developers.google.com/admob/android/privacy)
- [Enable test ads — Android — Google for Developers](https://developers.google.com/admob/android/test-ads)
- [capacitor-community/admob — GitHub](https://github.com/capacitor-community/admob)
- [Game Monetization with AdMob — PolyCode](https://www.polycode.tech/game-monetization-with-admob/)
- [Ad Monetization in Mobile Games Benchmark Report 2025 — Gamigion](https://www.gamigion.com/ad-monetization-in-mobile-games-benchmark-report-2025/)
- [Mobile interstitial ads: implementation and best practices — Yango Ads](https://yango-ads.com/blog/mobile-interstitial-ads)
