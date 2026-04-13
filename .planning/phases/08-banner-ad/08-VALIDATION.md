---
phase: 8
slug: banner-ad
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green + device checkpoint passed
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | BANNER-01, BANNER-02 | — | N/A | unit | `npm test -- adService` | ✅ extend existing | ⬜ pending |
| 8-01-02 | 01 | 1 | BANNER-05 | — | N/A | unit | `npm test -- adService` | ✅ extend existing | ⬜ pending |
| 8-01-03 | 01 | 2 | BANNER-03, BANNER-04 | — | N/A | device-only | manual device checkpoint | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/services/__tests__/adService.test.ts` — extend existing vi.mock to include `showBanner`, `removeBanner`, `BannerAdSize`, `BannerAdPosition`, `BannerAdPluginEvents` (file exists; mock block needs extension before new tests can run)

*No new test files needed — existing infrastructure covers all automatable tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Banner appears at bottom of GameScreen below ControlBar | BANNER-01 | Requires native AdMob bridge + physical/emulated device | Build APK, launch GameScreen, confirm banner visible at bottom |
| Banner uses ADAPTIVE_BANNER at BOTTOM_CENTER | BANNER-02 | Rendered size/position only verifiable on device or in AdMob console logs | Check Android logcat for AdMob position log or verify in AdMob console |
| Bottom padding equals banner height — content not obscured | BANNER-03 | `BannerAdPluginEvents.SizeChanged` fires only on native; padding is runtime value | Scroll game content to verify bottom row not hidden behind banner |
| Navigating away removes banner | BANNER-04 | React useEffect cleanup on native bridge | Navigate to another screen, confirm no banner persists |
| Banner load failure: no visible error, gameplay unaffected | BANNER-05 (device aspect) | Requires triggering a failed load (e.g., bad ad unit ID or no network) | Test in airplane mode — confirm no error UI, puzzle playable |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
