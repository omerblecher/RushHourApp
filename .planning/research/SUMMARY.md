# Project Research Summary

**Project:** Rush Hour v1.1 - AdMob Monetization Milestone
**Domain:** Mobile ad monetization in a Capacitor 8 / React Android puzzle game
**Researched:** 2026-04-12
**Confidence:** MEDIUM (plugin v8.0.0 versioning confirmed; specific patch versions estimated)

---

## Executive Summary

Adding AdMob banner and interstitial ads to the existing Rush Hour app is a well-bounded, single-plugin integration. The canonical tool is `@capacitor-community/admob@8.0.0` - it follows Capacitor major-version parity, bundles UMP consent support natively, and mirrors the imperative `soundService.ts` pattern already in the codebase. The total code surface is small: one new service file, two modified screens, two modified Android native files. The biggest source of developer friction is not ad complexity but Android build plumbing: manifest merge conflicts with Firebase, Gradle dependency resolution, and R8 shrinking are the most common failure modes.

The recommended approach is strictly dependency-ordered: Android native plumbing first (plugin install, manifest entries, Gradle version pin), then the `adService.ts` singleton with UMP consent, then the banner, then the interstitial. This order ensures every layer is verifiably working before the next is added. The UMP consent flow is the root dependency - no ad may load before it completes, and GDPR violations are account-suspension risks, not just code bugs.

The critical risks are threefold: (1) a missing or malformed AdMob App ID in `AndroidManifest.xml` causes an immediate app crash before any screen renders; (2) using production ad unit IDs during development without test mode can trigger AdMob account suspension; (3) the manifest merge conflict between Firebase and `play-services-ads` pre-v24 will break the build. All three are fully preventable with the patterns documented in this research. Using `playServicesAdsVersion = '24.3.0'` in `variables.gradle` eliminates the Firebase conflict at its root.

---

## Key Findings

### Recommended Stack

The only new npm dependency is `@capacitor-community/admob@8.0.0` (install without version tag on Capacitor 8; `latest` resolves to v8.0.0). Running `npx cap sync` after install is mandatory - without it the native Android plugin code is not deployed and all JS bridge calls silently fail. No separate UMP package is needed: the Google UMP SDK v4.0.0 is a transitive dependency of the plugin.

Two Android-native changes are required beyond the JS layer. First, pin `playServicesAdsVersion = '24.3.0'` in `android/variables.gradle` to pull in Google Mobile Ads SDK v24+ rather than the plugin's outdated v23 default - v24 eliminates the `AD_SERVICES_CONFIG` Firebase manifest merge conflict at the source. Second, add the AdMob App ID `<meta-data>` tag to `AndroidManifest.xml` referencing a string resource in `strings.xml`; omitting this causes a hard crash on every launch.

**Core technologies:**

| Addition | Version | Purpose |
|----------|---------|---------|
| `@capacitor-community/admob` | 8.0.0 | JS bridge to native AdMob SDK; banner, interstitial, UMP consent APIs |
| Google Mobile Ads SDK (native) | 24.x.x (pin via `playServicesAdsVersion`) | Ad serving; v24 eliminates Firebase manifest conflict |
| UMP SDK (native) | 4.0.0 | GDPR consent; transitive dependency of plugin, no manual entry |

**What NOT to add:** Do not manually add `play-services-ads` or `user-messaging-platform` to `app/build.gradle` - the plugin manages these through `variables.gradle`. Duplication causes Gradle resolution conflicts.

### Expected Features

**Must have (table stakes - required to avoid account suspension):**
- GDPR/UMP consent flow before any ad loads - consent is the root dependency of everything else
- Banner ad on `GameScreen`, bottom-positioned, below `ControlBar`, hidden during `WinModal`
- Interstitial ad shown every 3rd win, triggered on `WinModal` dismiss (not on win event itself)
- Privacy policy updated with AdMob data collection declaration
- Play Store Data Safety section updated; "Contains ads" checkbox ticked
- Test mode environment separation (`import.meta.env.DEV`) - must ship with prod IDs only
**Should have (UX and revenue quality):**
- `ADAPTIVE_BANNER` size over fixed 320x50 - correctly sizes on all Android widths
- Interstitial preloaded at `GameScreen` mount, not at win detection - eliminates loading delay
- Banner hidden during interstitial show - avoids native view conflicts on some devices
- `padding-bottom: 60px` on `GameScreen` container when native - prevents banner overlapping `ControlBar`
- Privacy options re-entry point in app UI - GDPR requires consent revocation access
- App-level frequency cap configured in AdMob console (server-side safety net, e.g. 1 per 3 minutes)

**Defer (v1.2+):**
- Rewarded ads - require a hint/skip mechanic that does not exist yet
- AdMob mediation / waterfall - not justified at current scale
- App-open ads - too aggressive for a puzzle game; poor retention impact
- iOS ad unit IDs - Android-only target for this milestone

### Architecture Approach

AdMob integration slots cleanly into the existing service-singleton pattern. The plugin is fully imperative - it renders native Android views, not React components. There is no AdMob React component to add; instead, a new `src/services/adService.ts` singleton owns all ad lifecycle logic, mirroring `soundService.ts` exactly. `adService.initialize()` is called fire-and-forget in `main.tsx` before `createRoot()`, running in parallel with `initNative()` and Firebase auth - neither blocks the other. The UMP consent dialog is a native Android overlay independent of the React tree.

**New file:**

| File | Responsibility |
|------|---------------|
| `src/services/adService.ts` | Singleton; owns `initialize()`, `runConsentFlow()`, `showBanner()`, `removeBanner()`, `preloadInterstitial()`, `showInterstitialIfReady()` |

**Modified files:**

| File | Change |
|------|--------|
| `src/main.tsx` | One line: `void adService.initialize()` alongside `initNative()` |
| `src/screens/GameScreen/GameScreen.tsx` | Banner `useEffect` (show on mount, remove on unmount); interstitial await in win `setTimeout` |
| `src/screens/GameScreen/GameScreen.module.css` | `.withBanner { padding-bottom: 60px }` conditional on `Capacitor.isNativePlatform()` |
| `android/app/src/main/AndroidManifest.xml` | AdMob `<meta-data>` App ID tag; `AD_ID` permission for Android 13+ |
| `android/app/src/main/res/values/strings.xml` | `admob_app_id` string resource (create if absent) |
| `android/variables.gradle` | `playServicesAdsVersion = '24.3.0'` in `ext {}` block |

**No change required:** `android/app/build.gradle` - `npx cap sync` handles plugin registration automatically via `capacitor.build.gradle`.

### Critical Pitfalls

1. **Missing AdMob App ID in `AndroidManifest.xml`** - App crashes immediately on every launch with `IllegalStateException`. Add the `<meta-data>` tag as the very first implementation step, before writing any JS. The App ID uses tilde (~) as separator; ad unit IDs use slash (/). These look similar but are different things - do not mix them up.

2. **Production ad unit IDs used during development** - Even one accidental click on your own production ad can trigger AdMob account suspension. Use Google's official test IDs (`ca-app-pub-3940256099942544/6300978111` for banner, `.../1033173712` for interstitial) and gate all IDs behind `import.meta.env.DEV`. Never side-load the release AAB on your own device and tap ads.

3. **Firebase + AdMob manifest merge conflict** - Pre-v24 `play-services-ads` conflicts with Firebase over `android.adservices.AD_SERVICES_CONFIG`. Prevention: pin `playServicesAdsVersion = '24.3.0'` in `variables.gradle` before the first Gradle build. If the conflict appears anyway, add `tools:replace="android:resource"` to the conflicting `<property>` element - do not apply preemptively.

4. **Ads shown before GDPR consent resolves** - Serving personalized ads to EEA/UK users without consent is a policy violation and account suspension risk. The full UMP flow (`requestConsentInfo` then `showConsentForm` if required) must complete before any banner or interstitial is requested. Test with `debugGeography: AdmobConsentDebugGeography.EEA` - without this, developers in non-EEA regions never see the form and assume it works.

5. **R8 stripping AdMob/UMP classes in release build** - Release builds have `minifyEnabled true`. The debug build works; the release build crashes. Verify `proguard-rules.pro` includes keep rules for `com.google.android.gms.ads.**` and `com.google.android.ump.**`. This project already has a prior R8 suppress commit - add AdMob rules in the same file. Always test the release AAB via the internal testing track before promoting to production.

---

## Implications for Roadmap

Based on strict dependency ordering from the architecture and pitfall research, 5 phases are recommended:

### Phase 1: Android Native Plumbing

**Rationale:** All JavaScript bridge calls fail silently if native setup is incomplete. Build failures are faster to diagnose when no ad code exists yet. The App ID crash must be resolved before any other work can be tested.

**Delivers:** A buildable app with the plugin registered, correct Gradle versions, and the AdMob App ID present - zero JS changes.

**Addresses:** Plugin registration, `playServicesAdsVersion` pin, `<meta-data>` tag, `AD_ID` permission, `strings.xml` test App ID.

**Avoids:** C1 (App ID crash), C3 (manifest merge), H3 (Gradle conflict), L1 (forgot cap sync).

**Research flag:** Standard patterns; no additional research needed.

### Phase 2: adService Singleton + UMP Consent

**Rationale:** Consent is the root dependency - no ad may be requested before it resolves. Building the singleton first (without showing ads) makes the consent flow independently testable.

**Delivers:** `src/services/adService.ts` with `initialize()` and `runConsentFlow()`; wired into `main.tsx`; UMP dialog verified with `debugGeography: EEA`.

**Addresses:** GDPR consent flow (table stakes), non-blocking initialization architecture.

**Avoids:** C4 (ads before consent), L2 (consent never tested).

**Research flag:** Standard patterns; plugin API is stable and documented.

### Phase 3: Banner Ad

**Rationale:** Banner is simpler than interstitial (no frequency logic, no event-driven lifecycle) and makes the layout side-effect - `padding-bottom: 60px` - verifiable in isolation before the interstitial is added.

**Delivers:** Banner visible on `GameScreen` (bottom, adaptive), hidden on all other screens, no `ControlBar` overlap on any device width.

**Addresses:** Banner placement (table stakes), `ADAPTIVE_BANNER` size (differentiator), `withBanner` CSS padding (differentiator).

**Avoids:** H2 (banner adjacent to interactive elements), M4 (WebView layout shift), L4 (banner not removed on navigation).

**Research flag:** Standard patterns.

### Phase 4: Interstitial Ad

**Rationale:** Requires banner infrastructure and `adService` singleton to exist. The frequency counter and preload-ahead pattern add statefulness that should be isolated from banner work.

**Delivers:** Interstitial preloaded on `GameScreen` mount, shown every 3rd win on `WinModal` dismiss, auto-reloaded after dismiss, `WinModal` shown only after ad resolves.

**Addresses:** Interstitial timing and frequency (table stakes), preload pattern (differentiator), session-scoped win counter (differentiator).

**Avoids:** H1 (interstitial at wrong trigger), M3 (ad not ready when needed).

**Research flag:** Verify `AdMob.removeAllListeners()` exists in v8.0.0 before using it in `preloadInterstitial()`. Add a 5-8 second timeout fallback to `showInterstitialIfReady()` Promise.

### Phase 5: Production IDs + Play Store Submission

**Rationale:** Only when all ad behavior is verified with test IDs should production credentials be introduced. Play Store submission is blocked until all three compliance domains are complete: code, AdMob console, and Play Console metadata.

**Delivers:** Release AAB with real App ID and ad unit IDs; updated privacy policy; Play Store Data Safety section updated; "Contains ads" ticked; `versionCode` bumped to 2.

**Addresses:** Privacy policy declaration (table stakes), Play Store data safety (table stakes), test mode removal.

**Avoids:** C2 (prod IDs in dev), H4 (R8 stripping release classes), M1 (data safety not updated), M2 (privacy policy not updated), L3 (versionCode not bumped).

**Research flag:** Verify exact latest `play-services-ads` v24.x patch at https://developers.google.com/admob/android/rel-notes before the production build. Research estimates `24.3.0`; the patch digit may be higher by build time.

### Phase Ordering Rationale

- Android native must precede any JS bridge work - the plugin does not exist at runtime until `cap sync` runs and the manifest is configured.
- Consent must precede ad display - GDPR compliance is non-negotiable and is the dependency root of the entire ad graph.
- Banner precedes interstitial - simpler lifecycle, layout verification isolated, no event-driven state machine to debug simultaneously.
- Production IDs come last - the single most dangerous step (account suspension risk) is deferred until all behavior is verified safe with test IDs.

### Research Flags

Needs verification during implementation:
- **Phase 4:** Confirm `AdMob.removeAllListeners()` exists in plugin v8.0.0. If absent, use per-listener `handle.remove()` pattern to avoid duplicate event registrations.
- **Phase 4:** Add a timeout fallback (5-8 seconds) to the `showInterstitialIfReady()` Promise to guard against the `Dismissed` event not firing on some devices.
- **Phase 5:** Check latest v24.x patch at developers.google.com/admob/android/rel-notes - `24.3.0` is a research estimate.

Standard patterns (no additional research needed):
- **Phase 1:** Capacitor plugin sync is fully documented and consistent across all community plugins.
- **Phase 2:** UMP JS API is stable; consent flow is identical across plugin versions 5.x-8.x.
- **Phase 3:** Banner `useEffect` cleanup pattern is standard Capacitor community plugin usage.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Plugin v8.0.0 confirmed on npm; `playServicesAdsVersion = '24.3.0'` is an estimate - verify patch at release notes before building |
| Features | HIGH | Feature list based on official Google AdMob policy docs; placement rules are unambiguous |
| Architecture | HIGH | Plugin API stable at v8.0.0; service singleton pattern directly verified against plugin README; initialization sequence is dependency-derived |
| Pitfalls | MEDIUM | C1-C4 and H1-H2 confirmed against official Google docs; H3/H4 from community issues (Capacitor 6/7 era, extrapolated to v8) |

**Overall confidence:** MEDIUM-HIGH - the integration is well-documented and the patterns are established. The only meaningful uncertainty is whether specific Gradle patch versions match exactly; all architectural and policy decisions are HIGH confidence.

### Gaps to Address

- **`playServicesAdsVersion` exact patch:** Research estimates `24.3.0`. Verify at https://developers.google.com/admob/android/rel-notes at build time. Major version `24.x` is certain; the patch digit may be higher.
- **`AdMob.removeAllListeners()` in v8.0.0:** The `adService.ts` skeleton calls this before re-registering interstitial listeners. Confirm the method exists in the installed version's TypeScript types; if absent, switch to tracking and calling `remove()` on each listener handle.
- **UMP form creation in AdMob console:** The consent dialog will not appear for real users unless a "Privacy and Messaging" consent form is configured in the AdMob console. This is a console-side step, not a code step - easy to forget until testing with a real EEA device.
- **AdMob account + app linking:** The app is already on the Play Store. Linking it in the AdMob console is typically fast for existing apps but must happen before Phase 5 begins to obtain the real App ID.

---

## Sources

### Primary (HIGH confidence)
- https://ads-developers.googleblog.com/2025/02/announcing-android-google-mobile-ads.html - v24 breaking changes, Firebase conflict resolution
- https://developers.google.com/admob/android/rel-notes - SDK version history
- https://developers.google.com/admob/android/privacy - UMP consent flow, v4.0.0
- https://support.google.com/admob/answer/6275335 - banner placement requirements
- https://support.google.com/admob/answer/6066980 - interstitial timing requirements
- https://support.google.com/admob/answer/6201362 - disallowed interstitial implementations
- https://developers.google.com/admob/android/privacy/play-data-disclosure - Data Safety section requirements

### Secondary (MEDIUM confidence)
- https://www.npmjs.com/package/@capacitor-community/admob - v8.0.0 version confirmation, versioning convention
- https://github.com/capacitor-community/admob - installation, variables.gradle, UMP API
- https://github.com/capacitor-community/admob/issues/216 - Firebase + AdMob conflict tracking
- https://github.com/capacitor-community/admob/issues/273 - UMP consent implementation status
- https://mvnrepository.com/artifact/com.google.android.ump/user-messaging-platform - UMP SDK version history

### Tertiary (MEDIUM-LOW - extrapolated from Capacitor 6/7)
- https://andresand.medium.com/fix-issue-with-the-dependencies-admob-and-firebase-d3747fcf123e - manifest merge workaround pattern

---
*Research completed: 2026-04-12*
*Ready for roadmap: yes*