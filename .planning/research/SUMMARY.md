# Research Summary: Rush Hour Puzzle Game

**Domain:** Browser-based sliding puzzle game (React SPA + Firebase BaaS)
**Researched:** 2026-02-16
**Overall confidence:** MEDIUM (web verification tools unavailable; based on training data through May 2025 -- core patterns are stable, version numbers need verification)

## Executive Summary

Rush Hour is a well-defined, 30-year-old logic puzzle with formally specified rules. The digital implementation domain is mature with clear best practices. The core challenge is not "what to build" (the game design is known) but "how to build it well" -- specifically, smooth drag interaction on mobile, correct collision detection, Firebase cost control, and leaderboard integrity.

The recommended stack is Vite + React 19 + TypeScript + Zustand + Firebase (Auth + Firestore) + Howler.js for sound. This is a lightweight, well-understood stack with no exotic dependencies. The entire bundle should be under 160KB gzipped. The key architectural decision is separating pure game logic (an `engine/` module with zero React dependencies) from React rendering and Firebase I/O. This enables easy testing and clean component design.

The biggest risks are (1) collision detection bugs that break gameplay, (2) Firebase Firestore read costs spiraling from naive leaderboard queries, (3) shipping unsolvable puzzles without automated validation, and (4) leaderboard cheating undermining competitive value. All are preventable with upfront planning: unit-tested collision logic, denormalized leaderboard documents with `.limit()` queries, a BFS solver running at build time, and Cloud Functions for score validation.

The project is well-scoped for a phased delivery: a fully playable offline game first (no Firebase dependency), then backend integration and polish. This ordering de-risks the core gameplay loop before adding infrastructure complexity.

## Key Findings

**Stack:** Vite + React 19 + TypeScript + Zustand + Firebase 11 + Howler.js + CSS Modules. No game engine needed -- CSS transforms on DOM elements are sufficient for a grid-based puzzle.

**Architecture:** Pure game engine (`engine/`) separated from React components. Puzzles stored as local JSON (~16KB for 80 puzzles). Zustand for game state with selector-based subscriptions to prevent re-render cascade during drag. Pointer Events API for drag interaction (not a library).

**Critical pitfall:** Collision detection off-by-one errors. Must check ALL cells along the slide path, not just the destination. Build an occupancy grid as single source of truth and unit test exhaustively.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Core Game Engine + Board** - Build and test pure game logic first
   - Addresses: Grid rendering, vehicle positioning, collision detection, move validation, win detection
   - Avoids: Pitfall 1 (collision bugs) by establishing unit-tested engine before UI
   - Includes: BFS puzzle solver for validation

2. **Drag Interaction + Mobile** - Make the game playable
   - Addresses: Pointer event drag system, axis-constrained sliding, snap-to-grid, touch support
   - Avoids: Pitfall 8 (touch conflicts), Pitfall 7 (SVG performance), Pitfall 9 (responsive layout)
   - Key: Test on real mobile devices early

3. **Puzzle Data + Selection UI** - Load and navigate puzzles
   - Addresses: 80+ puzzle definitions, puzzle selection screen, difficulty levels, progress tracking (localStorage)
   - Avoids: Pitfall 3 (unsolvable puzzles) by running solver validation at build time

4. **Firebase Integration** - Auth + Leaderboards
   - Addresses: Firebase Auth (anonymous + Google), Firestore leaderboards, score submission, security rules
   - Avoids: Pitfall 2 (cost explosion) with denormalized top-scores documents, Pitfall 4 (cheating) with validation
   - Can use Cloud Functions for server-side score validation

5. **Polish** - Sound, animations, final touches
   - Addresses: Sound effects via Howler.js, win celebration animations, personal best tracking, UI polish
   - Avoids: Pitfall 6 (autoplay blocking) with user-gesture AudioContext unlock

**Phase ordering rationale:**
- Phase 1 before Phase 2: Game logic must be correct before adding drag interaction. Bugs in collision detection are harder to find when mixed with UI event handling.
- Phase 2 before Phase 3: A single playable puzzle proves the interaction model works before investing in 80+ puzzle definitions.
- Phase 3 before Phase 4: The game must be fully playable offline before adding Firebase. This avoids coupling game logic to network state.
- Phase 4 before Phase 5: Leaderboard functionality gives context for sound/animation polish (win celebration is more meaningful when it submits a score).

**Research flags for phases:**
- Phase 2: Likely needs deeper research on framer-motion vs custom pointer events if drag feel is unsatisfactory
- Phase 4: Firebase security rules and Cloud Functions may need phase-specific research for anti-cheat validation patterns
- Phase 1, 3, 5: Standard patterns, unlikely to need additional research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Vite + React + Zustand + Firebase is a well-established, uncontested stack for this use case |
| Features | HIGH | Rush Hour is a 30-year-old game with formally defined rules. Feature set is well-known. |
| Architecture | HIGH | Engine separation, Zustand selectors, Pointer Events -- all standard, proven patterns |
| Pitfalls | MEDIUM | Collision detection and Firebase cost pitfalls are well-documented. Specific version-related gotchas may be missed. |
| Library versions | LOW | Version numbers are from May 2025 training data. Verify with `npm view <pkg> version` before installing. |

## Gaps to Address

- **Exact library versions**: Could not verify current npm versions (Vite 6.x? 7.x? Zustand 5.x? Firebase 11.x? 12.x?). Run `npm view` before scaffolding.
- **Howler.js maintenance status**: Verify it is still actively maintained. If not, the built-in Web Audio API approach described in ARCHITECTURE.md is a viable fallback for just 3-4 sound effects.
- **Firebase pricing changes**: Verify current Spark plan (free tier) limits have not changed. Set billing alerts from day one.
- **React 19 stability**: Verify that React 19 is the current stable release and check for any known issues with Zustand or react-router-dom compatibility.
- **Puzzle sourcing**: Need to identify or create 80+ puzzles with verified solvability and difficulty classification. Michael Fogleman's Rush Hour database is a strong starting point but needs verification.
