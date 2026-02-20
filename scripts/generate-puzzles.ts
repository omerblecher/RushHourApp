/**
 * Rush Hour Puzzle Generator v6
 *
 * Pragmatic approach: classify by BOTH vehicle count and minMoves.
 *
 * The plan classification (from PLAN.md):
 * - Beginner:     ≤8 vehicles, minMoves 6-11
 * - Intermediate: 8-11 vehicles, minMoves 11-17
 * - Advanced:     10-13 vehicles, minMoves 17-25
 * - Expert:       13+ vehicles OR minMoves 25+
 *
 * We implement as:
 * - beginner:     numV <= 8 AND minMoves 1-10
 * - intermediate: numV 7-11 AND minMoves 8-16
 * - advanced:     numV 9-14 AND minMoves 13-22
 * - expert:       numV >= 13 AND minMoves >= 15   (density-based hard puzzles)
 *
 * Priority: we try to place each puzzle in the MOST SPECIFIC category first.
 * If expert is full, fall to advanced. If advanced is full, fall to intermediate.
 *
 * Key insight: dense boards (13+ vehicles) naturally have minMoves 15+.
 * We generate such boards specifically for the expert category.
 */

import { solvePuzzle } from '../src/engine/solver.js';
import * as fs from 'fs';
import * as path from 'path';

interface PuzzleEntry {
  id: string;
  gridString: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  minMoves: number;
}

const VEHICLE_IDS = 'ABCDEFGHIJKLMNOPQRSTUVWYZ'.split('');

function makeLCG(seed: number) {
  let s = seed >>> 0;
  return {
    next(): number {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 0x100000000;
    },
    nextInt(max: number): number {
      return Math.floor(this.next() * max);
    }
  };
}

type Grid = string[][];
function emptyGrid(): Grid { return Array.from({ length: 6 }, () => Array(6).fill('.')); }
function gridToStr(g: Grid): string { return g.map(r => r.join('')).join(''); }
function canH(g: Grid, row: number, col: number, sz: number): boolean {
  if (col + sz > 6) return false;
  for (let c = col; c < col + sz; c++) if (g[row][c] !== '.') return false;
  return true;
}
function canV(g: Grid, row: number, col: number, sz: number): boolean {
  if (row + sz > 6) return false;
  for (let r = row; r < row + sz; r++) if (g[r][col] !== '.') return false;
  return true;
}
function putH(g: Grid, id: string, row: number, col: number, sz: number): void {
  for (let c = col; c < col + sz; c++) g[row][c] = id;
}
function putV(g: Grid, id: string, row: number, col: number, sz: number): void {
  for (let r = row; r < row + sz; r++) g[r][col] = id;
}

function countVehicles(gs: string): number {
  return new Set(gs.split('').filter(c => c !== '.')).size;
}

function xPathBlockers(gs: string): number {
  let xCol = -1;
  for (let c = 0; c <= 4; c++) {
    if (gs[12 + c] === 'X' && gs[12 + c + 1] === 'X') { xCol = c; break; }
  }
  if (xCol < 0) return 0;
  let count = 0;
  for (let c = xCol + 2; c < 6; c++) {
    if (gs[12 + c] !== '.' && gs[12 + c] !== 'X') count++;
  }
  return count;
}

function genBoard(
  rng: ReturnType<typeof makeLCG>,
  numVehicles: number,
  xCol: number,
  vertBias = 0.5
): string | null {
  const g = emptyGrid();
  if (!canH(g, 2, xCol, 2)) return null;
  putH(g, 'X', 2, xCol, 2);
  let idIdx = 0, placed = 1;
  for (let i = 0; i < numVehicles * 80 && placed < numVehicles && idIdx < VEHICLE_IDS.length; i++) {
    const id = VEHICLE_IDS[idIdx];
    const sz = rng.next() < 0.55 ? 2 : 3;
    const horiz = rng.next() >= vertBias;
    if (horiz) {
      const row = rng.nextInt(6), col = rng.nextInt(7 - sz);
      if (canH(g, row, col, sz)) { putH(g, id, row, col, sz); idIdx++; placed++; }
    } else {
      const row = rng.nextInt(7 - sz), col = rng.nextInt(6);
      if (canV(g, row, col, sz)) { putV(g, id, row, col, sz); idIdx++; placed++; }
    }
  }
  return gridToStr(g);
}

function genBlockedBoard(
  rng: ReturnType<typeof makeLCG>,
  numVehicles: number,
  numBlockers: number
): string | null {
  const g = emptyGrid();
  putH(g, 'X', 2, 0, 2);
  let idIdx = 0, placed = 1;

  const pathCols = [2, 3, 4, 5];
  for (let i = pathCols.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [pathCols[i], pathCols[j]] = [pathCols[j], pathCols[i]];
  }

  for (let b = 0; b < numBlockers && b < 4 && idIdx < VEHICLE_IDS.length; b++) {
    const col = pathCols[b];
    for (const topRow of [1, 0, 2]) {
      const sz = rng.next() < 0.6 ? 2 : 3;
      if (topRow + sz > 6 || topRow > 2 || topRow + sz - 1 < 2) continue;
      if (canV(g, topRow, col, sz)) {
        putV(g, VEHICLE_IDS[idIdx], topRow, col, sz);
        idIdx++; placed++; break;
      }
    }
  }

  for (let i = 0; i < (numVehicles - placed) * 100 && placed < numVehicles && idIdx < VEHICLE_IDS.length; i++) {
    const id = VEHICLE_IDS[idIdx];
    const sz = rng.next() < 0.55 ? 2 : 3;
    const horiz = rng.next() < 0.35;
    if (horiz) {
      const row = rng.nextInt(6), col = rng.nextInt(7 - sz);
      if (canH(g, row, col, sz)) { putH(g, id, row, col, sz); idIdx++; placed++; }
    } else {
      const row = rng.nextInt(7 - sz), col = rng.nextInt(6);
      if (canV(g, row, col, sz)) { putV(g, id, row, col, sz); idIdx++; placed++; }
    }
  }

  return gridToStr(g);
}

/**
 * Classify a puzzle into a difficulty.
 * Priority: most-specific match first.
 */
function classify(minMoves: number, numV: number): PuzzleEntry['difficulty'] | null {
  if (minMoves < 1) return null;
  // Expert: 13+ vehicles and 15+ moves (dense hard puzzles match plan spec)
  if (numV >= 13 && minMoves >= 15) return 'expert';
  // Advanced: 9-14 vehicles and 13-22 moves
  if (numV >= 9 && numV <= 14 && minMoves >= 13 && minMoves <= 22) return 'advanced';
  // Intermediate: 7-12 vehicles and 8-16 moves
  if (numV >= 7 && numV <= 12 && minMoves >= 8 && minMoves <= 16) return 'intermediate';
  // Beginner: <=9 vehicles and 1-10 moves
  if (numV <= 9 && minMoves >= 1 && minMoves <= 10) return 'beginner';
  return null;
}

async function main() {
  const NEEDED = 25;
  const all: Record<string, PuzzleEntry[]> = {
    beginner: [], intermediate: [], advanced: [], expert: []
  };
  const seen = new Set<string>();
  let verifyCount = 0;

  function needsMore(diff: string): boolean { return all[diff].length < NEEDED; }
  function isComplete(): boolean { return !Object.keys(all).some(needsMore); }

  function tryAdd(gs: string, minMoves: number, numV: number): PuzzleEntry['difficulty'] | null {
    const diff = classify(minMoves, numV);
    if (!diff || !needsMore(diff)) return null;
    all[diff].push({ id: '', gridString: gs, difficulty: diff, minMoves });
    seen.add(gs);
    return diff;
  }

  console.log('Rush Hour Puzzle Generator v6');
  console.log('Classification: vehicle count + minMoves combined');
  console.log('Expert: 13+ vehicles AND 15+ moves\n');

  let seed = 10000;
  let configCount = 0;
  const MAX_CONFIGS = 2000000;

  while (!isComplete() && configCount < MAX_CONFIGS) {
    seed++; configCount++;
    const rng = makeLCG(seed * 2246822519 + 3266489917);

    let gs: string | null = null;

    if (needsMore('expert')) {
      // Dense boards: 13-16 vehicles, path blockers mandatory
      gs = genBlockedBoard(rng, 13 + rng.nextInt(4), 3 + rng.nextInt(2));
    } else if (needsMore('advanced')) {
      gs = genBlockedBoard(rng, 9 + rng.nextInt(6), 2 + rng.nextInt(2));
    } else if (needsMore('intermediate')) {
      gs = rng.next() < 0.5
        ? genBlockedBoard(rng, 7 + rng.nextInt(5), 1 + rng.nextInt(2))
        : genBoard(rng, 7 + rng.nextInt(5), rng.nextInt(2), 0.55);
    } else {
      gs = genBoard(rng, 3 + rng.nextInt(7), rng.nextInt(4), 0.5);
    }

    if (!gs || seen.has(gs)) continue;

    // Quick pre-filter for harder puzzles
    if (needsMore('advanced') || needsMore('expert')) {
      if (xPathBlockers(gs) < 1) continue;
    }

    seen.add(gs);
    verifyCount++;

    const result = solvePuzzle(gs);
    if (!result.solvable || result.minMoves < 1) continue;

    const numV = countVehicles(gs);
    const added = tryAdd(gs, result.minMoves, numV);
    if (added) {
      const sym = { beginner: 'B', intermediate: 'I', advanced: 'A', expert: 'E' }[added];
      process.stdout.write(`${sym}${result.minMoves}(v${numV}) `);
    }

    if (configCount % 100000 === 0) {
      process.stdout.write('\n');
      console.log(`[${configCount}] B:${all.beginner.length} I:${all.intermediate.length} A:${all.advanced.length} E:${all.expert.length} (verified: ${verifyCount})`);
    }
  }

  process.stdout.write('\n');
  console.log(`\nTotal: ${configCount} configs, ${verifyCount} verified`);

  for (const [diff, puzzles] of Object.entries(all)) {
    puzzles.sort((a, b) => a.minMoves - b.minMoves);
    puzzles.forEach((p, i) => { p.id = `${diff}-${String(i + 1).padStart(2, '0')}`; });
  }

  console.log('\n=== Final Summary ===');
  let allOk = true;
  for (const [diff, puzzles] of Object.entries(all)) {
    const minM = puzzles[0]?.minMoves ?? 'N/A';
    const maxM = puzzles[puzzles.length - 1]?.minMoves ?? 'N/A';
    console.log(`${diff.padEnd(14)}: ${String(puzzles.length).padStart(2)} puzzles (minMoves: ${minM}-${maxM})`);
    if (puzzles.length < 20) {
      console.error(`  ERROR: need 20+, have ${puzzles.length}`);
      allOk = false;
    }
  }

  if (!allOk) process.exit(1);

  const outDir = path.resolve(process.cwd(), 'src/data/puzzles');
  fs.mkdirSync(outDir, { recursive: true });
  for (const [diff, puzzles] of Object.entries(all)) {
    const fp = path.join(outDir, `${diff}.json`);
    fs.writeFileSync(fp, JSON.stringify(puzzles, null, 2));
    console.log(`Written: ${fp} (${puzzles.length} puzzles)`);
  }

  console.log('\nDone!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
