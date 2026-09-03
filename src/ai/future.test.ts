import { describe, expect, it } from "vitest";
import { createBoard } from "../game/board";
import { ROWS } from "../game/constants";
import { computeFutureFeatures, scoreFuture, SETUP_MEDIUM, TSPIN_MEDIUM, CLEAR_MEDIUM } from "./future";

describe("future leaf features", () => {
  it("does not reward an empty board for occupancy", () => {
    const f = computeFutureFeatures(createBoard());
    expect(f.step1).toBe(0);
    expect(f.jagged).toBe(0);
    expect(f.almost9).toBe(0);
    expect(f.tSlots).toBe(0);
  });

  it("counts 1-step surface and jagged non-well cliffs", () => {
    const board = createBoard();
    for (let x = 0; x < 10; x++) {
      const h = x < 5 ? 4 : 5;
      for (let i = 0; i < h; i++) board[ROWS - 1 - i]![x] = "L";
    }
    const stairs = computeFutureFeatures(board);
    expect(stairs.step1).toBeGreaterThan(0);
    expect(stairs.jagged).toBe(0);

    const jagged = createBoard();
    for (let i = 0; i < 8; i++) jagged[ROWS - 1 - i]![0] = "J";
    for (let i = 0; i < 2; i++) jagged[ROWS - 1 - i]![1] = "J";
    const cliffs = computeFutureFeatures(jagged);
    expect(cliffs.jagged).toBeGreaterThan(0);
  });

  it("skips tetris-well rows from almost-9 so well reservation is not double-counted", () => {
    const board = createBoard();
    for (let x = 0; x < 9; x++) {
      for (let i = 0; i < 6; i++) board[ROWS - 1 - i]![x] = "L";
    }
    const f = computeFutureFeatures(board);
    expect(f.almost9).toBe(0);
  });

  it("counts a 9-fill row whose hole is not the tetris well", () => {
    const board = createBoard();
    for (let x = 0; x < 10; x++) {
      if (x === 3) continue;
      board[ROWS - 1]![x] = "T";
    }
    expect(computeFutureFeatures(board).almost9).toBe(1);
  });

  it("detects a shallow 3-corner T-notch away from a tetris well", () => {
    const board = createBoard();
    for (let x = 0; x < 10; x++) {
      board[ROWS - 1]![x] = "J";
      if (x !== 4) board[ROWS - 2]![x] = "J";
    }
    board[ROWS - 3]![3] = "J";
    board[ROWS - 3]![5] = "J";
    const f = computeFutureFeatures(board);
    expect(f.tSlots).toBeGreaterThan(0);
  });

  it("keeps experimental weights off DEFAULT scoring when disabled", () => {
    const f = computeFutureFeatures(createBoard());
    const off = scoreFuture(f, SETUP_MEDIUM, { setup: false, tspin: false, clear: false });
    expect(off.score).toBe(0);
    const on = scoreFuture(f, { ...SETUP_MEDIUM, ...TSPIN_MEDIUM, ...CLEAR_MEDIUM }, {
      setup: true,
      tspin: true,
      clear: true,
    });
    expect(on.score).toBe(0);
  });
});
