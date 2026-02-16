# Technology Stack

**Project:** Rush Hour Puzzle Game
**Researched:** 2026-02-16

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vite | ^6.x | Build tool + dev server | Fastest DX for SPAs, zero-config React-TS template, HMR in <50ms |
| React | ^19.x | UI framework | Project requirement, stable since Dec 2024 |
| TypeScript | ^5.6 | Type safety | Puzzle state, grid coords, Firebase types all benefit from static types |

### Database / Backend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Firebase Auth | ^11.x (firebase pkg) | Player identity | Google sign-in + anonymous auth for frictionless onboarding |
| Cloud Firestore | ^11.x (firebase pkg) | Scores + leaderboards | Composite index queries for leaderboard ranking, offline support |
| Local JSON | N/A | Puzzle definitions | Static data (80 puzzles) ships in bundle at ~16KB, no network dependency |

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | ^5.x | Game state | ~1KB, selector subscriptions prevent re-render cascade during drag |

### Interaction

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Pointer Events API | Built-in | Vehicle dragging | Single-axis constrained drag needs ~60 lines of custom code, not a library |

### Rendering

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| CSS Modules | Built into Vite | Scoped styling | Zero runtime cost, co-located with components |
| CSS Transforms | Built-in | Vehicle positioning | GPU-composited, avoids layout thrashing during drag |

### Audio

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Howler.js | ^2.2 | Sound effects | Handles autoplay policy, audio sprites, iOS quirks. ~7KB gzipped |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-router-dom | ^7.x | Routing | Menu, puzzle select, game, leaderboard screens |
| clsx | ^2.x | Class name helper | Conditional CSS classes |
| react-hot-toast | ^2.x | Notifications | Score submission, errors, achievements |
| @types/howler | latest | TypeScript defs | Howler does not ship own types |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Build tool | Vite | Next.js | SSR/SSG adds complexity with zero benefit for a client-side game |
| Build tool | Vite | CRA | Deprecated, unmaintained |
| State | Zustand | React Context | Re-renders all consumers on any change -- unacceptable during 60fps drag |
| State | Zustand | Redux Toolkit | Boilerplate-heavy for simple game state (vehicle positions array) |
| Drag | Pointer Events | react-dnd | Designed for container-to-container DnD, not constrained axis sliding |
| Drag | Pointer Events | @dnd-kit/core | 15KB for something achievable in 60 lines |
| Drag | Pointer Events | framer-motion drag | 30KB; viable if you also want spring animations elsewhere |
| Rendering | CSS | Phaser/PixiJS | 200-500KB canvas engine for colored rectangles on a grid -- massive overkill |
| Audio | Howler.js | Web Audio API direct | Autoplay, format fallback, mobile quirks -- you reimplement Howler |
| Styling | CSS Modules | Tailwind | Game UI is custom visual, not utility-class friendly |
| Styling | CSS Modules | styled-components | Runtime CSS-in-JS adds overhead during drag |
| DB | Firestore | Realtime DB | Firestore has better querying for leaderboard ORDER BY |

## Installation

```bash
# Scaffold project
npm create vite@latest rush-hour-app -- --template react-ts
cd rush-hour-app

# Core dependencies
npm install firebase zustand react-router-dom howler clsx react-hot-toast

# Dev dependencies
npm install -D @types/howler eslint @eslint/js typescript-eslint eslint-plugin-react-hooks
```

**IMPORTANT:** Verify all versions with `npm view <pkg> version` before installing. Version numbers in this document are from May 2025 training data.

## Sources

- Vite: widely established as standard React SPA tool (HIGH confidence)
- Firebase modular SDK: official Firebase docs (HIGH confidence)
- Zustand: GitHub repo + npm (HIGH confidence)
- Howler.js: GitHub repo (MEDIUM confidence -- verify still maintained)
- Pointer Events: W3C spec / MDN (HIGH confidence)
- Specific version numbers: training data (LOW confidence -- verify)
