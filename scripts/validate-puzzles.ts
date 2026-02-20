/**
 * Build-time puzzle validation script.
 *
 * Imports all 4 puzzle JSON files and validates each puzzle:
 * 1. gridString is exactly 36 characters
 * 2. X is present on row 2 as a horizontal vehicle
 * 3. solvePuzzle() confirms the puzzle is solvable
 * 4. solvePuzzle() returns minMoves matching the declared value
 *
 * Exits with code 0 on success, code 1 on any failure.
 */

import { solvePuzzle } from '../src/engine/solver.js';
import beginnerPuzzles from '../src/data/puzzles/beginner.json' assert { type: 'json' };
import intermediatePuzzles from '../src/data/puzzles/intermediate.json' assert { type: 'json' };
import advancedPuzzles from '../src/data/puzzles/advanced.json' assert { type: 'json' };
import expertPuzzles from '../src/data/puzzles/expert.json' assert { type: 'json' };

interface PuzzleEntry {
  id: string;
  gridString: string;
  difficulty: string;
  minMoves: number;
}

const allPuzzles: PuzzleEntry[] = [
  ...beginnerPuzzles,
  ...intermediatePuzzles,
  ...advancedPuzzles,
  ...expertPuzzles,
] as PuzzleEntry[];

const byCat: Record<string, PuzzleEntry[]> = {
  beginner: beginnerPuzzles as PuzzleEntry[],
  intermediate: intermediatePuzzles as PuzzleEntry[],
  advanced: advancedPuzzles as PuzzleEntry[],
  expert: expertPuzzles as PuzzleEntry[],
};

let errors = 0;
let validated = 0;

function validatePuzzle(p: PuzzleEntry): boolean {
  let ok = true;

  // 1. Grid string length
  if (p.gridString.length !== 36) {
    console.error(`  ERROR [${p.id}]: gridString length ${p.gridString.length}, expected 36`);
    ok = false;
  }

  // 2. X must be on row 2, horizontal, size 2
  const row2 = p.gridString.slice(12, 18);
  const xCells: number[] = [];
  for (let c = 0; c < 6; c++) {
    if (row2[c] === 'X') xCells.push(c);
  }
  if (xCells.length !== 2) {
    console.error(`  ERROR [${p.id}]: X occupies ${xCells.length} cells on row 2, expected 2`);
    ok = false;
  } else if (xCells[1] !== xCells[0] + 1) {
    console.error(`  ERROR [${p.id}]: X cells on row 2 are not adjacent (${xCells})`);
    ok = false;
  }

  // 3 + 4. Solve and verify minMoves
  if (ok) {
    const result = solvePuzzle(p.gridString);
    if (!result.solvable) {
      console.error(`  ERROR [${p.id}]: puzzle is not solvable`);
      ok = false;
    } else if (result.minMoves !== p.minMoves) {
      console.error(`  ERROR [${p.id}]: declared minMoves=${p.minMoves}, actual=${result.minMoves}`);
      ok = false;
    }
  }

  return ok;
}

console.log(`Validating ${allPuzzles.length} puzzles...\n`);

for (const [diff, puzzles] of Object.entries(byCat)) {
  process.stdout.write(`  ${diff.padEnd(14)}: `);
  let diffOk = true;

  for (const p of puzzles) {
    const ok = validatePuzzle(p);
    if (!ok) {
      errors++;
      diffOk = false;
    } else {
      validated++;
    }
  }

  if (diffOk) {
    const minM = puzzles[0]?.minMoves ?? 0;
    const maxM = puzzles[puzzles.length - 1]?.minMoves ?? 0;
    console.log(`${puzzles.length} puzzles OK (minMoves: ${minM}-${maxM})`);
  } else {
    console.log(`FAILED`);
  }
}

console.log(`\nResults: ${validated} valid, ${errors} failed`);

if (errors > 0) {
  console.error(`\nValidation FAILED: ${errors} puzzle(s) have errors.`);
  process.exit(1);
} else if (validated < 80) {
  console.error(`\nValidation FAILED: only ${validated} puzzles, need 80+.`);
  process.exit(1);
} else {
  console.log(`\nAll ${validated} puzzles valid. Build can proceed.`);
  process.exit(0);
}
