import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine.js';

describe('GameEngine', () => {
  describe('constructor and getState', () => {
    it('initializes with parsed vehicles, moveCount 0, empty history, null times, not won', () => {
      const engine = new GameEngine('..AA................................');
      const state = engine.getState();

      expect(state.vehicles).toHaveLength(1);
      expect(state.vehicles[0].id).toBe('A');
      expect(state.moveCount).toBe(0);
      expect(state.moveHistory).toEqual([]);
      expect(state.startTime).toBeNull();
      expect(state.endTime).toBeNull();
      expect(state.isWon).toBe(false);
    });

    it('getState returns immutable snapshot (modifying returned object does not affect engine)', () => {
      const engine = new GameEngine('..AA................................');
      const state1 = engine.getState();
      state1.moveCount = 999;
      state1.vehicles.push({ id: 'Z', position: { row: 0, col: 0 }, size: 2, orientation: 'horizontal' });
      const state2 = engine.getState();

      expect(state2.moveCount).toBe(0);
      expect(state2.vehicles).toHaveLength(1);
    });
  });

  describe('move validation', () => {
    it('valid horizontal move left: A from col 2-3 to col 0-1', () => {
      const engine = new GameEngine('..AA................................');
      const result = engine.move('A', 0, 0);

      expect(result.success).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.state.vehicles[0].position).toEqual({ row: 0, col: 0 });
    });

    it('valid horizontal move right: A from col 2-3 to col 4-5', () => {
      const engine = new GameEngine('..AA................................');
      const result = engine.move('A', 0, 4);

      expect(result.success).toBe(true);
      expect(result.state.vehicles[0].position).toEqual({ row: 0, col: 4 });
    });

    it('rejects move that collides with another vehicle', () => {
      // A at col 0-1, B at col 2-3
      const engine = new GameEngine('AABB................................');
      const result = engine.move('A', 0, 2);

      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason!.toLowerCase()).toMatch(/blocked|collision|occupied/);
    });

    it('rejects move out of bounds (negative col)', () => {
      const engine = new GameEngine('..AA................................');
      const result = engine.move('A', 0, -1);

      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('rejects move out of bounds (exceeds grid)', () => {
      const engine = new GameEngine('..AA................................');
      // Size 2 at col 5 means occupying col 5 and col 6 (out of bounds)
      const result = engine.move('A', 0, 5);

      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('rejects move on wrong axis (horizontal vehicle to different row)', () => {
      const engine = new GameEngine('..AA................................');
      const result = engine.move('A', 1, 2);

      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('vertical vehicle can move down but not left/right', () => {
      // Vertical truck A at rows 0-2, col 0
      const engine = new GameEngine('A.....A.....A.......................');
      // Move down to rows 3-5
      const resultDown = engine.move('A', 3, 0);
      expect(resultDown.success).toBe(true);

      // Fresh engine: move left (wrong axis)
      const engine2 = new GameEngine('A.....A.....A.......................');
      const resultLeft = engine2.move('A', 0, 1);
      expect(resultLeft.success).toBe(false);
      expect(resultLeft.reason).toBeDefined();
    });

    it('rejects move for unknown vehicle id', () => {
      const engine = new GameEngine('..AA................................');
      const result = engine.move('Z', 0, 0);

      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('validates path is clear -- cannot teleport past blockers', () => {
      // A at col 0-1, B at col 3-4, trying to move A to col 4 (past B)
      const engine = new GameEngine('AA.BB...............................');
      const result = engine.move('A', 0, 4);

      expect(result.success).toBe(false);
      expect(result.reason!.toLowerCase()).toMatch(/blocked|collision|occupied|path/);
    });
  });

  describe('win detection', () => {
    it('X at row 0 is NOT a win (must be row 2)', () => {
      // X at row 0, cols 4-5
      const engine = new GameEngine('....XX..............................');
      expect(engine.getState().isWon).toBe(false);
    });

    it('moving X to col 4 on row 2 triggers win', () => {
      // X at row 2, cols 0-1: "............XX......................"
      const engine = new GameEngine('............XX......................');
      const result = engine.move('X', 2, 4);

      expect(result.success).toBe(true);
      expect(result.state.isWon).toBe(true);
    });

    it('win sets endTime to a non-null value', () => {
      const engine = new GameEngine('............XX......................');
      const result = engine.move('X', 2, 4);

      expect(result.state.endTime).not.toBeNull();
      expect(typeof result.state.endTime).toBe('number');
    });

    it('after win, further moves are rejected', () => {
      const engine = new GameEngine('............XX......................');
      engine.move('X', 2, 4);
      const result = engine.move('X', 2, 2);

      expect(result.success).toBe(false);
      expect(result.reason!.toLowerCase()).toMatch(/won|over|finished/);
    });
  });

  describe('move counter', () => {
    it('each valid move increments moveCount by 1', () => {
      const engine = new GameEngine('..AA................................');
      engine.move('A', 0, 0);
      expect(engine.getState().moveCount).toBe(1);
      engine.move('A', 0, 4);
      expect(engine.getState().moveCount).toBe(2);
    });

    it('invalid moves do NOT increment moveCount', () => {
      const engine = new GameEngine('..AA................................');
      engine.move('A', 0, 5); // out of bounds
      expect(engine.getState().moveCount).toBe(0);
    });

    it('multi-cell slide counts as 1 move', () => {
      // A at col 0-1, move to col 4 (slides 4 cells)
      const engine = new GameEngine('AA..................................');
      engine.move('A', 0, 4);
      expect(engine.getState().moveCount).toBe(1);
    });
  });

  describe('timer', () => {
    it('before any move, startTime is null', () => {
      const engine = new GameEngine('..AA................................');
      expect(engine.getState().startTime).toBeNull();
    });

    it('after first valid move, startTime is set', () => {
      const engine = new GameEngine('..AA................................');
      engine.move('A', 0, 0);
      const state = engine.getState();

      expect(state.startTime).not.toBeNull();
      expect(typeof state.startTime).toBe('number');
    });

    it('startTime does not change on subsequent moves', () => {
      const engine = new GameEngine('..AA................................');
      engine.move('A', 0, 0);
      const startTime1 = engine.getState().startTime;
      engine.move('A', 0, 4);
      const startTime2 = engine.getState().startTime;

      expect(startTime2).toBe(startTime1);
    });
  });

  describe('undo', () => {
    it('returns MoveResult', () => {
      const engine = new GameEngine('..AA................................');
      engine.move('A', 0, 0);
      const result = engine.undo();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('state');
    });

    it('restores vehicle to previous position after one move', () => {
      const engine = new GameEngine('..AA................................');
      engine.move('A', 0, 0);
      const result = engine.undo();

      expect(result.success).toBe(true);
      expect(result.state.vehicles[0].position).toEqual({ row: 0, col: 2 });
    });

    it('undo increments moveCount (does NOT decrement)', () => {
      const engine = new GameEngine('..AA................................');
      engine.move('A', 0, 0); // moveCount = 1
      engine.undo(); // moveCount = 2 (increments!)

      expect(engine.getState().moveCount).toBe(2);
    });

    it('undo on fresh game returns failure', () => {
      const engine = new GameEngine('..AA................................');
      const result = engine.undo();

      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason!.toLowerCase()).toMatch(/no moves/);
    });

    it('multiple undos: can undo entire move history one step at a time', () => {
      const engine = new GameEngine('..AA................................');
      engine.move('A', 0, 0); // A at col 0
      engine.move('A', 0, 4); // A at col 4

      engine.undo(); // A back to col 0
      expect(engine.getState().vehicles[0].position.col).toBe(0);

      engine.undo(); // A back to col 2
      expect(engine.getState().vehicles[0].position.col).toBe(2);
    });

    it('each undo increments moveCount', () => {
      const engine = new GameEngine('..AA................................');
      engine.move('A', 0, 0); // moveCount = 1
      engine.move('A', 0, 4); // moveCount = 2
      engine.undo(); // moveCount = 3
      engine.undo(); // moveCount = 4

      expect(engine.getState().moveCount).toBe(4);
    });

    it('after win + undo: isWon becomes false, endTime resets to null', () => {
      const engine = new GameEngine('............XX......................');
      engine.move('X', 2, 4); // win
      expect(engine.getState().isWon).toBe(true);

      engine.undo();
      expect(engine.getState().isWon).toBe(false);
      expect(engine.getState().endTime).toBeNull();
    });

    it('undo does NOT affect startTime', () => {
      const engine = new GameEngine('..AA................................');
      engine.move('A', 0, 0);
      const startTime = engine.getState().startTime;
      engine.undo();

      expect(engine.getState().startTime).toBe(startTime);
    });
  });

  describe('reset', () => {
    it('returns GameState', () => {
      const engine = new GameEngine('..AA................................');
      const state = engine.reset();

      expect(state).toHaveProperty('vehicles');
      expect(state).toHaveProperty('moveCount');
    });

    it('restores all vehicles to initial positions after moves', () => {
      const engine = new GameEngine('..AA................................');
      engine.move('A', 0, 0);
      const state = engine.reset();

      expect(state.vehicles[0].position).toEqual({ row: 0, col: 2 });
    });

    it('sets moveCount to 0, clears moveHistory, nulls times, clears isWon', () => {
      const engine = new GameEngine('............XX......................');
      engine.move('X', 2, 4); // win state

      const state = engine.reset();
      expect(state.moveCount).toBe(0);
      expect(state.moveHistory).toEqual([]);
      expect(state.startTime).toBeNull();
      expect(state.endTime).toBeNull();
      expect(state.isWon).toBe(false);
    });

    it('after reset, first move sets startTime again', () => {
      const engine = new GameEngine('..AA................................');
      engine.move('A', 0, 0);
      engine.reset();

      expect(engine.getState().startTime).toBeNull();

      engine.move('A', 0, 0);
      expect(engine.getState().startTime).not.toBeNull();
    });
  });
});
