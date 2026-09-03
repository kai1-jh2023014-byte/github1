import { describe, expect, it } from "vitest";
import { createBoard } from "./board";
import { COLS, ROWS } from "./constants";
import { clearLines, lockPiece, placeAndClear } from "./lineClear";
import { createPiece } from "./piece";
import { canPlace, dropToBottom, tryMove, tryRotate } from "./collision";
import { SHAPES } from "./tetrominoes";

describe("tetrominoes", () => {
  it("defines 4 cells for every rotation of every piece", () => {
    for (const [type, rotations] of Object.entries(SHAPES)) {
      expect(rotations).toHaveLength(4);
      for (const cells of rotations) {
        expect(cells, type).toHaveLength(4);
      }
    }
  });
});

describe("collision", () => {
  it("allows spawn of all seven pieces on an empty board", () => {
    const board = createBoard();
    for (const type of ["I", "O", "T", "S", "Z", "J", "L"] as const) {
      expect(canPlace(board, createPiece(type, 0))).toBe(true);
    }
  });

  it("rejects moves through walls and locked cells", () => {
    const board = createBoard();
    const piece = createPiece("O", 0);
    expect(tryMove(board, piece, -10, 0)).toBeNull();
    board[0][5] = "I";
    expect(tryMove(board, { ...piece, x: 4, y: 0 }, 1, 0)).toBeNull();
  });

  it("rotates with wall kicks near the left wall", () => {
    const board = createBoard();
    const piece = { ...createPiece("T", 0), x: 0, y: 0 };
    const rotated = tryRotate(board, piece, 1);
    expect(rotated).not.toBeNull();
    expect(canPlace(board, rotated!)).toBe(true);
  });
});

describe("line clear", () => {
  it("clears completed rows and stacks the rest downward", () => {
    const board = createBoard();
    board[ROWS - 1] = Array(COLS).fill("I");
    board[ROWS - 2][0] = "T";
    const { board: next, cleared } = clearLines(board);
    expect(cleared).toBe(1);
    expect(next[ROWS - 1][0]).toBe("T");
    expect(next[0].every((cell) => cell === 0)).toBe(true);
  });

  it("places an I piece and clears a nearly complete bottom row", () => {
    const board = createBoard();
    board[ROWS - 1] = ["J", "J", "J", 0, 0, 0, 0, "L", "L", "L"];
    const piece = dropToBottom(board, createPiece("I", 0));
    const result = placeAndClear(board, piece);
    expect(result.cleared).toBe(1);
    expect(result.board[ROWS - 1].every((cell) => cell === 0)).toBe(true);
  });

  it("locks cells onto the board", () => {
    const board = createBoard();
    const locked = lockPiece(board, dropToBottom(board, createPiece("O", 0)));
    expect(locked[ROWS - 1][4]).toBe("O");
    expect(locked[ROWS - 1][5]).toBe("O");
    expect(locked[ROWS - 2][4]).toBe("O");
    expect(locked[ROWS - 2][5]).toBe("O");
  });
});
