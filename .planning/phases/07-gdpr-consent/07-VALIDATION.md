---
phase: 7
slug: gdpr-consent
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run adService` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run adService`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | GDPR-01 | — | consentReady promise resolves before any ad API | unit | `npx vitest run adService` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 1 | GDPR-02 | — | showConsentForm called only when REQUIRED | unit | `npx vitest run adService` | ❌ W0 | ⬜ pending |
| 7-01-03 | 01 | 2 | GDPR-03 | — | non-EEA path skips dialog | unit | `npx vitest run adService` | ❌ W0 | ⬜ pending |
| 7-01-04 | 01 | 2 | GDPR-04 | — | waitForConsent blocks ad load | unit | `npx vitest run adService` | ❌ W0 | ⬜ pending |
| 7-01-05 | 01 | 3 | GDPR-05 | — | privacy settings entry point accessible | manual | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/services/__tests__/adService.test.ts` — stubs for GDPR-01 through GDPR-04
- [ ] Mock for `@capacitor-community/admob` UMP APIs

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Consent dialog appears on EEA device on first launch | GDPR-02 | Requires physical device or emulator with EEA debug geography | Set `debugGeography: EEA` in requestConsentInfoUpdate, launch fresh install, verify UMP dialog shown |
| No dialog shown for non-EEA geography | GDPR-03 | Requires device/emulator without EEA debug flag | Remove debugGeography, launch, verify no dialog |
| Privacy settings button navigates to consent form | GDPR-05 | UI navigation — not automatable via unit tests | Open ProfileScreen, tap Privacy Settings, verify UMP privacy options form appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
