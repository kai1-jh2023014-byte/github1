import { describe, expect, it } from "vitest";
import { createBoard } from "../game/board";
import { ROWS } from "../game/constants";
import { shouldExploreHold } from "./holdGate";
import { canITetris, findTetrisWell, overhangCount, wellReservationScore } from "./structure";

function sideWell(wall = 8, wellFill = 2): ReturnType<typeof createBoard> {
  const board = createBoard();
  for (let x = 0; x < 9; x++) {
    for (let i = 0; i < wall; i++) board[ROWS - 1 - i]![x] = "L";
  }
  for (let i = 0; i < wellFill; i++) board[ROWS - 1 - i]![9] = "J";
  return board;
}

describe("hold gate", () => {
  it("stays closed on an empty board", () => {
    expect(
      shouldExploreHold({
        board: createBoard(),
        current: "T",
        hold: null,
        nextQueue: ["I", "J", "L"],
        canHold: true,
      }),
    ).toBe(false);
  });

  it("opens for I-save when a tetris well exists and I cannot tetris now", () => {
    const board = sideWell(8, 2);
    expect(findTetrisWell(board)?.col).toBe(9);
    expect(canITetris(board)).toBe(false);
    expect(
      shouldExploreHold({
        board,
        current: "I",
        hold: null,
        nextQueue: ["J", "L"],
        canHold: true,
      }),
    ).toBe(true);
  });

  it("opens to use a held I on a ready well", () => {
    expect(
      shouldExploreHold({
        board: sideWell(8, 2),
        current: "T",
        hold: "I",
        nextQueue: ["J"],
        canHold: true,
      }),
    ).toBe(true);
  });

  it("stays closed when hold is disabled", () => {
    expect(
      shouldExploreHold({
        board: sideWell(8, 2),
        current: "I",
        hold: null,
        nextQueue: ["J"],
        canHold: false,
      }),
    ).toBe(false);
  });
});

describe("structure features", () => {
  it("finds a 1-wide well and does not treat a 2-wide trench as tetris", () => {
    const one = sideWell(8, 2);
    expect(findTetrisWell(one)?.depth).toBeGreaterThanOrEqual(4);
    const two = createBoard();
    for (let x = 0; x < 8; x++) {
      for (let i = 0; i < 6; i++) two[ROWS - 1 - i]![x] = "J";
    }
    expect(findTetrisWell(two)).toBeNull();
  });

  it("rewards I-in-hold more than an empty hold on the same well", () => {
    const board = sideWell(8, 2);
    const withI = wellReservationScore(board, "I", "T", ["J"]);
    const without = wellReservationScore(board, null, "T", ["J"]);
    expect(withI).toBeGreaterThan(without);
  });

  it("counts covered adjacent empties as overhangs", () => {
    const board = createBoard();
    board[ROWS - 1]![0] = "T";
    board[ROWS - 2]![0] = "T";
    board[ROWS - 2]![1] = "T";
    expect(overhangCount(board)).toBeGreaterThan(0);
  });
});
