# Phase 5: Sound and Polish - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

The game feels complete — sound feedback on vehicle interactions, a win celebration animation, keyboard navigation as an alternative to mouse/touch, cross-browser verification, and header UI for mute/help/about controls. Scope expanded by user to include Help modal and About credits alongside the originally planned phase items.

</domain>

<decisions>
## Implementation Decisions

### Sound design & feel
- Light and playful character — soft, bouncy, friendly (not mechanical or minimal)
- All three sound triggers are active: vehicle slide, puzzle win, and level start — each with a distinct sound
- Slide sound is the same every move regardless of distance moved (no scaling)
- Sound files sourced from Freesound or other open-license asset libraries (not programmatically synthesized)

### Win celebration animation
- Two visual effects combined: confetti burst + board flash/glow
- Animation plays first, then WinModal appears (~2 seconds of animation before modal)
- Board is locked during animation (input disabled while celebration plays)

### Keyboard interaction model
- Tab key cycles through vehicles to select; focus ring identifies selected vehicle
- Arrow keys move selected vehicle in its valid axis only; invalid-axis presses silently ignored
- Selected vehicle shows highlight + subtle glow as visual focus indicator
- Escape key deselects the current vehicle

### Mute control placement
- Mute toggle lives in the game header/top bar (always accessible)
- Icon: speaker with waves (unmuted) / speaker with X (muted) — standard volume icon
- Global mute — one setting controls all audio across all screens; persisted to localStorage
- Soft click/chime plays on unmute to confirm audio is restored

### Help & About
- Help button in game header: opens a how-to-play modal with text instructions only (no diagrams or animations)
- About button in game header: opens credits modal — who built it and tools used (no links or version number)
- Both buttons live in the header alongside the mute toggle

### Claude's Discretion
- Exact confetti implementation (library vs CSS/canvas)
- Board flash/glow timing and intensity
- Specific Freesound asset selection (pick light/playful ones matching the character)
- Exact spacing and layout of the header controls (mute, help, about)
- ARIA labels and screen reader behavior details (beyond keyboard nav)
- Cross-browser test matrix execution order

</decisions>

<specifics>
## Specific Ideas

- The win animation plays for ~2 seconds before the WinModal appears — enough time to enjoy the moment
- Confetti burst + board glow/flash as the combined win reaction (not just one or the other)
- Header mute icon should be recognizable without a label — standard speaker iconography

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope (Help/About was added to scope by user decision, not deferred)

</deferred>

---

*Phase: 05-sound-and-polish*
*Context gathered: 2026-02-21*
