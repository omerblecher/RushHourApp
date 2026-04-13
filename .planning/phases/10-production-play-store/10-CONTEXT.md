# Phase 10: Production & Play Store - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 delivers: real AdMob IDs wired into the app, a live privacy policy page (GitHub Pages) declaring AdMob data collection, Play Store listing updated with "Contains ads" + Data Safety section, version bumped to 1.1/versionCode 2, and a release AAB uploaded to the internal testing track with no Play Console errors.

This phase is primarily operational. Code changes are minimal (env vars, version bump). The bulk of the work is manual prerequisites (AdMob account setup), document creation (setup guide, privacy policy), and Play Store console actions.

</domain>

<decisions>
## Implementation Decisions

### AdMob Account & Real IDs

- **D-01:** No AdMob account exists yet. Account creation, app registration, and ad unit creation are **manual prerequisites** — the user completes these before running the code plan.
- **D-02:** The setup guide (RELEASE-01) documents these manual steps: create AdMob account → register app → create Banner unit → create Interstitial unit → copy all three IDs.
- **D-03:** Once IDs are in hand, the code step is: fill `.env.production` (replace the three `TODO` values with real IDs). No other code changes — the env file was pre-wired in Phase 6 exactly for this.
- **D-04:** `AndroidManifest.xml` also references the App ID via a `<meta-data>` tag (set in Phase 6). Verify whether this needs to be updated with the real App ID or is already read from env at build time.

### Privacy Policy

- **D-05:** No privacy policy currently exists. A new one must be created as part of this phase.
- **D-06:** Host on **GitHub Pages** — a standalone HTML page (or markdown rendered by GitHub Pages). Free, permanent URL, no server required.
- **D-07:** Content must declare: AdMob collects advertising ID and device info; Firebase Auth and Firestore usage; no personal data sold; contact info.
- **D-08:** The privacy policy URL must be added to the Play Store listing and ideally referenced in the app (e.g., in the UMP consent form configuration where it accepts a `privacyPolicyUrl` parameter).

### Play Store Status & Scope

- **D-09:** v1.0 is already live on the Play Store. This phase updates an existing listing — no full listing creation needed.
- **D-10:** Required Play Store updates: (1) check "Contains ads" in the app content section; (2) update Data Safety section to declare advertising ID collection (purpose: advertising, shared with third parties = Google AdMob).
- **D-11:** Upload release AAB to the internal testing track. "Passing" = AAB uploads cleanly, passes Play's automated checks, no policy violations flagged — no manual device smoke test required for this phase.

### Release Signing & AAB Build

- **D-12:** Keystore is already configured in the Gradle signing config — `android/app/release/app-release.apk` confirms this is working.
- **D-13:** Build command: `cd android && ./gradlew bundleRelease` — produces the AAB at `android/app/build/outputs/bundle/release/app-release.aab`.
- **D-14:** Before building, verify `versionCode` is bumped to `2` and `versionName` to `"1.1"` in `android/app/build.gradle` (currently `1` / `"1.0"`).

### Version Bump

- **D-15:** `android/app/build.gradle`: `versionCode 1 → 2`, `versionName "1.0" → "1.1"`. This is the only code file that needs editing.

### Claude's Discretion

- Setup guide format: Claude can choose markdown in `.planning/` or a `ADMOB-SETUP.md` in the repo root — whichever is cleaner. Lean toward planning directory to keep root uncluttered.
- Privacy policy HTML structure: Claude can write a clean, concise policy page — no specific template required.
- Whether to add the privacy policy URL to the UMP consent form config (`privacyPolicyUrl` / `termsOfServiceUrl` in `adService.ts`) — include it if the AdMob plugin supports it cleanly.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Env & Ad IDs
- `.env.production` — three `TODO` placeholders to fill with real AdMob IDs (App ID, Banner unit ID, Interstitial unit ID)
- `.env.development` — reference for the structure; contains Google test IDs

### Version
- `android/app/build.gradle` — `versionCode` and `versionName` to bump

### Ad Service
- `src/services/adService.ts` — Phase 9 final state; may need `privacyPolicyUrl` added to UMP config
- Phase 9 CONTEXT: `.planning/phases/09-interstitial-ad/09-CONTEXT.md`
- Phase 7 CONTEXT: `.planning/phases/07-gdpr-consent/07-CONTEXT.md` — UMP config shape

### Android Manifest
- `android/app/src/main/AndroidManifest.xml` — verify AdMob App ID meta-data tag (is it hardcoded or read from env?)

### Requirements
- `.planning/REQUIREMENTS.md` — RELEASE-01 through RELEASE-05

No external specs for privacy policy — content requirements are standard AdMob disclosure requirements.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.env.production` — already structured with the right variable names; just needs real values
- `android/app/build.gradle` — one-line version bump only
- `src/services/adService.ts` — no changes expected; may add `privacyPolicyUrl` if UMP config supports it

### Established Patterns
- `Capacitor.isNativePlatform()` guard — all ad code already behind this, no regressions on web
- `import.meta.env.VITE_*` — Vite reads `.env.production` automatically on `vite build` (no `--mode` flag needed)

### Integration Points
- Play Store console (manual): upload AAB, update listing metadata, Data Safety form
- GitHub Pages (manual): publish privacy policy HTML

</code_context>

<specifics>
## Specific Ideas

- The setup guide should be thorough enough that someone else (or future-you) could repeat the AdMob registration process from scratch — not just "go to admob.google.com".
- The privacy policy URL, once created, should be threaded into the Play Store listing AND the UMP consent form config (where Google surfaces it to EEA users during consent).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-production-play-store*
*Context gathered: 2026-04-13*
