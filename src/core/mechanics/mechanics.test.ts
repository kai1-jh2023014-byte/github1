import { describe, expect, it } from "vitest";
import { createBoard } from "../../game/board";
import { createPiece } from "../../game/piece";
import { DEFAULT_WEIGHTS } from "../../ai/weights";
import {
  applyHold,
  detectTSpin,
  isB2BQualifying,
  lockScore,
  nextBackToBack,
  nextCombo,
} from "./index";

describe("applyHold", () => {
  it("Case A: empty hold stores current and pulls next", () => {
    const result = applyHold({
      current: "T",
      hold: null,
      nextQueue: ["I", "O"],
      canHold: true,
    });
    expect(result.ok).toBe(true);
    expect(result.hold).toBe("T");
    expect(result.current).toBe("I");
    expect(result.nextQueue).toEqual(["O"]);
    expect(result.canHold).toBe(false);
  });

  it("Case B: occupied hold swaps with current", () => {
    const result = applyHold({
      current: "T",
      hold: "I",
      nextQueue: ["O", "S"],
      canHold: true,
    });
    expect(result.ok).toBe(true);
    expect(result.hold).toBe("T");
    expect(result.current).toBe("I");
    expect(result.nextQueue).toEqual(["O", "S"]);
    expect(result.canHold).toBe(false);
  });

  it("Case C: second hold before lock is rejected", () => {
    const first = applyHold({
      current: "T",
      hold: null,
      nextQueue: ["I"],
      canHold: true,
    });
    const second = applyHold({
      current: first.current!,
      hold: first.hold,
      nextQueue: first.nextQueue,
      canHold: first.canHold,
    });
    expect(second.ok).toBe(false);
    expect(second.hold).toBe("T");
    expect(second.current).toBe("I");
  });
});

describe("T-spin detection", () => {
  it("returns none when the piece is not T or the last action was not rotate", () => {
    const board = createBoard();
    const t = createPiece("T");
    t.x = 3;
    t.y = 16;
    expect(detectTSpin(board, t, false)).toBe("none");
    const i = createPiece("I");
    expect(detectTSpin(board, i, true)).toBe("none");
  });

  it("classifies 3 occupied corners as mini and 4 as full", () => {
    const piece = createPiece("T");
    piece.x = 3;
    piece.y = 16;
    const mini = createBoard();
    mini[16][3] = "J";
    mini[16][5] = "L";
    mini[18][3] = "J";
    expect(detectTSpin(mini, piece, true)).toBe("mini");

    const full = createBoard();
    full[16][3] = "J";
    full[16][5] = "L";
    full[18][3] = "J";
    full[18][5] = "L";
    expect(detectTSpin(full, piece, true)).toBe("full");
  });

  it("returns none with fewer than 3 occupied corners", () => {
    const board = createBoard();
    const piece = createPiece("T");
    piece.x = 3;
    piece.y = 16;
    board[16][3] = "J";
    board[16][5] = "L";
    expect(detectTSpin(board, piece, true)).toBe("none");
  });
});

describe("REN and B2B transitions", () => {
  it("increments combo on a clear and resets on no clear", () => {
    expect(nextCombo(0, 1)).toBe(1);
    expect(nextCombo(1, 2)).toBe(2);
    expect(nextCombo(4, 0)).toBe(0);
  });

  it("sets B2B on tetris or T-spin clear, keeps it on no clear, breaks on a normal clear", () => {
    expect(nextBackToBack(false, 4, "none")).toBe(true);
    expect(nextBackToBack(false, 2, "full")).toBe(true);
    expect(nextBackToBack(true, 0, "none")).toBe(true);
    expect(nextBackToBack(true, 1, "none")).toBe(false);
    expect(isB2BQualifying(3, "none")).toBe(false);
  });
});

describe("lockScore", () => {
  it("keeps guideline single/double/tetris points", () => {
    expect(lockScore({
      cleared: 1,
      tSpin: "none",
      combo: 0,
      backToBack: false,
      level: 1,
      perfectClear: false,
    })).toBe(100);
    expect(lockScore({
      cleared: 4,
      tSpin: "none",
      combo: 0,
      backToBack: false,
      level: 1,
      perfectClear: false,
    })).toBe(800);
  });

  it("applies T-spin double, B2B, and combo additively", () => {
    const tsd = lockScore({
      cleared: 2,
      tSpin: "full",
      combo: 0,
      backToBack: false,
      level: 1,
      perfectClear: false,
    });
    expect(tsd).toBe(1200);
    const b2b = lockScore({
      cleared: 4,
      tSpin: "none",
      combo: 0,
      backToBack: true,
      level: 1,
      perfectClear: false,
    });
    expect(b2b).toBe(1200);
    const combo = lockScore({
      cleared: 1,
      tSpin: "none",
      combo: 3,
      backToBack: false,
      level: 1,
      perfectClear: false,
    });
    expect(combo).toBe(250);
  });
});

describe("baseline evaluator freeze", () => {
  it("does not change DEFAULT_WEIGHTS semantics", () => {
    expect(DEFAULT_WEIGHTS).toEqual({
      linesCleared: 0.76,
      holes: -0.36,
      aggregateHeight: -0.51,
      bumpiness: -0.18,
      maxHeight: -0.22,
      wells: -0.20,
      density: 0.35,
      rowTransitions: -0.18,
      colTransitions: -0.45,
    });
  });
});
