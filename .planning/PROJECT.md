# Rush Hour Puzzle Game

## Overview
A React-based Rush Hour sliding puzzle game where the player slides blocking vehicles on a 6x6 grid to free the red car through the exit.

## Tech Stack
- **Frontend:** React
- **Backend:** Firebase (Auth + Firestore)
- **Visuals:** CSS/SVG car art (no external image assets)

## Key Decisions

| Setting | Choice |
|---------|--------|
| Puzzles | Pre-built, 20+ per level (80+ total) |
| Backend | Firebase (Auth + Firestore) |
| Leaderboard | Global (all players compete per puzzle) |
| Car visuals | CSS/SVG art (no external image assets) |
| Sounds | Win celebration, car slide, level start |
| Hints | No hints — players solve on their own |
| Scores | Cloud-backed via Firebase |

## Features
- 6x6 grid puzzle board
- Colorful CSS/SVG vehicle visuals
- 4 difficulty levels (Beginner, Intermediate, Advanced, Expert)
- 80+ pre-built puzzles (20+ per difficulty level)
- Global leaderboards per puzzle via Firebase
- Sound effects (win celebration, car slide, level start)
- Firebase Authentication for player identity
- Move counter and timer for scoring
