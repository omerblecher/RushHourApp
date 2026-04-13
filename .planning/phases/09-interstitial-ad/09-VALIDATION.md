---
phase: 9
slug: interstitial-ad
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vite.config.ts |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | INTER-01 | — | N/A | unit | `npm run test -- --run` | ✅ | ⬜ pending |
| 9-01-02 | 01 | 1 | INTER-02 | — | N/A | unit | `npm run test -- --run` | ✅ | ⬜ pending |
| 9-01-03 | 01 | 1 | INTER-03 | — | N/A | unit | `npm run test -- --run` | ✅ | ⬜ pending |
| 9-01-04 | 01 | 1 | INTER-04 | — | N/A | unit | `npm run test -- --run` | ✅ | ⬜ pending |
| 9-01-05 | 01 | 1 | INTER-05 | — | N/A | unit | `npm run test -- --run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/services/__tests__/adService.interstitial.test.ts` — stubs for INTER-01, INTER-02, INTER-03, INTER-04, INTER-05
- [ ] `src/screens/GameScreen/__tests__/GameScreen.interstitial.test.tsx` — stubs for preload lifecycle and handleWinNavigate

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Interstitial appears on 3rd win on physical device | INTER-02 | Requires physical Android device + AdMob test ad | Win 3 puzzles in sequence, confirm interstitial appears |
| Ad dismissal resumes navigation within 5s | INTER-04 | Requires real ad lifecycle on device | Force ad failure, confirm WinModal opens within 5s |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
