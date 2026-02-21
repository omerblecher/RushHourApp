# Phase 4: Firebase Integration - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can sign in with Google or play anonymously, and compete on per-puzzle global leaderboards with server-enforced data integrity. Covers: auth flow, anonymous→Google account linking, score submission, leaderboard display, display name management, and a basic profile/settings section. Social features, friend lists, notifications, and in-app purchases are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Sign-in & identity flow
- Sign-in prompt appears at **app launch**, before the user can play
- The prompt is **blocking** — user must choose: "Sign in with Google" or "Play anonymously"
- Anonymous users are prompted to link to Google **when they first try to view the leaderboard** (not after puzzles, not automatically)
- When an anonymous user links to Google, their **anonymous scores are preserved and merged** into the Google account

### Leaderboard presentation
- From the win screen: leaderboard appears as a **modal/overlay** (no navigation away)
- From the puzzle selection screen: leaderboard is also accessible (modal or navigation — Claude decides)
- The signed-in user's row is **highlighted** (bold, accent color, or distinct background)
- If the user is **outside the top 50**, their personal best is **pinned at the bottom** of the leaderboard, visually separated (e.g., "... Your best: #83 — 14 moves, 1:32")
- Row columns: **Rank + Display Name + Moves + Time**

### Score submission UX
- Scores are submitted **silently in the background** when a puzzle is solved — no explicit "Submit" button
- The **win screen shows** the user's current leaderboard rank (e.g., "#4 on this puzzle!") and a "View leaderboard" button
- **Anonymous users** — their scores are stored locally only and do not appear on the leaderboard; leaderboard participation requires a Google-linked account
- Score submission **failures are silent** — no error message shown to the user
- When a user **beats their personal best**, the win screen shows a "New personal best!" celebration callout

### Display names
- Default display name is pulled from the user's **Google account name**
- Users can **edit their display name** in a dedicated profile/settings section
- Validation: **length limit** (max characters) AND **uniqueness** across all users — no two users can have the same name
- The **profile/settings section** contains: display name editing + sign out button + personal stats summary (scores/rankings across puzzles)

### Claude's Discretion
- Exact character limit for display names
- Visual design of the "Play anonymously" vs "Sign in with Google" launch prompt
- Loading/skeleton states while leaderboard data fetches
- Exact layout of personal stats summary in profile section
- How uniqueness conflicts are communicated when a user picks an already-taken name

</decisions>

<specifics>
## Specific Ideas

- Leaderboard rank on the win screen should feel like a moment of celebration — e.g., "#4 on this puzzle!" not just a dry number
- Anonymous-to-Google linking should be clearly motivated by the leaderboard access gate, not feel like an interruption

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-firebase-integration*
*Context gathered: 2026-02-21*
