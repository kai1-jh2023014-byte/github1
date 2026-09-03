import { describe, expect, it } from "vitest";
import { GameEngine } from "./engine";
import { pieceCells } from "./piece";
import type { Board, TetrominoType } from "./types";

class SequenceSource {
  private index = 0;
  constructor(private readonly sequence: TetrominoType[]) {}
  next(): TetrominoType {
    const type = this.sequence[this.index % this.sequence.length];
    this.index += 1;
    return type;
  }
}

describe("GameEngine", () => {
  it("starts in ready state and begins playing on start", () => {
    const engine = new GameEngine({ randomizer: new SequenceSource(["T", "I"]) });
    expect(engine.getStatus()).toBe("ready");
    engine.start();
    expect(engine.getStatus()).toBe("playing");
    expect(engine.getCurrent()?.type).toBe("T");
    expect(engine.getNext()).toBe("I");
  });

  it("moves, rotates and hard-drops through the public input API", () => {
    const engine = new GameEngine({ randomizer: new SequenceSource(["T", "I", "O"]) });
    engine.start();
    expect(engine.input("left")).toBe(true);
    expect(engine.getCurrent()?.x).toBe(2);
    expect(engine.input("rotateCW")).toBe(true);
    expect(engine.getCurrent()?.rotation).toBe(1);
    expect(engine.input("hardDrop")).toBe(true);
    expect(engine.getSnapshot().score).toBeGreaterThan(0);
    expect(engine.getCurrent()?.type).toBe("I");
  });

  it("pauses and resumes", () => {
    const engine = new GameEngine();
    engine.start();
    engine.pause();
    expect(engine.getStatus()).toBe("paused");
    expect(engine.input("left")).toBe(false);
    engine.resume();
    expect(engine.getStatus()).toBe("playing");
  });

  it("game-overs when O pieces stack to the top", () => {
    const engine = new GameEngine({
      randomizer: new SequenceSource(Array<TetrominoType>(40).fill("O")),
    });
    engine.start();
    for (let i = 0; i < 20; i++) engine.input("hardDrop");
    expect(engine.getStatus()).toBe("gameover");
  });

  it("clears a line when an I piece completes the bottom row", () => {
    const engine = new GameEngine({
      randomizer: new SequenceSource(["I", "O", "T"]),
    });
    engine.start();
    const board = engine.getBoard();
    board[19] = ["J", "J", "J", 0, 0, 0, 0, "L", "L", "L"];
    engine.input("hardDrop");
    expect(engine.getSnapshot().lines).toBe(1);
    expect(engine.getSnapshot().score).toBeGreaterThanOrEqual(100);
    expect(engine.getBoard()[19].every((cell) => cell === 0)).toBe(true);
  });

  it("Case A: empty hold stores T and promotes next", () => {
    const engine = new GameEngine({ randomizer: new SequenceSource(["T", "I", "O"]) });
    engine.start();
    expect(engine.getCurrent()?.type).toBe("T");
    expect(engine.input("hold")).toBe(true);
    expect(engine.getHold()).toBe("T");
    expect(engine.getCurrent()?.type).toBe("I");
    expect(engine.getCanHold()).toBe(false);
  });

  it("Case B: hold swaps I and T when hold is occupied and canHold is true", () => {
    const engine = new GameEngine({ randomizer: new SequenceSource(["I", "O", "T", "S"]) });
    engine.start();
    expect(engine.input("hold")).toBe(true);
    expect(engine.getHold()).toBe("I");
    expect(engine.getCurrent()?.type).toBe("O");
    engine.input("hardDrop");
    expect(engine.getCanHold()).toBe(true);
    expect(engine.getHold()).toBe("I");
    expect(engine.getCurrent()?.type).toBe("T");
    expect(engine.input("hold")).toBe(true);
    expect(engine.getHold()).toBe("T");
    expect(engine.getCurrent()?.type).toBe("I");
  });

  it("Case C: two holds on the same falling piece are rejected", () => {
    const engine = new GameEngine({ randomizer: new SequenceSource(["T", "I", "O"]) });
    engine.start();
    expect(engine.input("hold")).toBe(true);
    expect(engine.input("hold")).toBe(false);
    expect(engine.getHold()).toBe("T");
    expect(engine.getCurrent()?.type).toBe("I");
  });

  it("Case D: lock restores hold permission", () => {
    const engine = new GameEngine({ randomizer: new SequenceSource(["T", "I", "O"]) });
    engine.start();
    expect(engine.input("hold")).toBe(true);
    expect(engine.getCanHold()).toBe(false);
    engine.input("hardDrop");
    expect(engine.getCanHold()).toBe(true);
    expect(engine.getCurrent()?.type).toBe("O");
    expect(engine.input("hold")).toBe(true);
    expect(engine.getHold()).toBe("O");
    expect(engine.getCanHold()).toBe(false);
  });

  it("increments REN on consecutive clears and resets when a drop clears nothing", () => {
    const engine = new GameEngine({ randomizer: new SequenceSource(["I", "I", "O"]) });
    engine.start();
    fillIWell(engine.getBoard(), 1);
    engine.input("hardDrop");
    expect(engine.getCombo()).toBe(1);
    fillIWell(engine.getBoard(), 1);
    engine.input("hardDrop");
    expect(engine.getCombo()).toBe(2);
    engine.input("hardDrop");
    expect(engine.getCombo()).toBe(0);
  });

  it("activates B2B on a tetris and awards a B2B tetris on the next qualifying clear", () => {
    const engine = new GameEngine({
      randomizer: new SequenceSource(["I", "I", "I", "I"]),
    });
    engine.start();
    dropVerticalITetris(engine);
    expect(engine.getSnapshot().lines).toBe(4);
    expect(engine.getBackToBack()).toBe(true);
    expect(engine.getStats().b2bClears).toBe(0);
    dropVerticalITetris(engine);
    expect(engine.getSnapshot().lines).toBe(8);
    expect(engine.getBackToBack()).toBe(true);
    expect(engine.getStats().b2bClears).toBe(1);
    expect(engine.getSnapshot().score).toBeGreaterThan(800 + 1200);
  });
});

function fillIWell(board: Board, rows: number) {
  for (let i = 0; i < rows; i++) {
    const y = 19 - i;
    for (let x = 0; x < 10; x++) {
      board[y][x] = x >= 3 && x <= 6 ? 0 : "J";
    }
  }
}

function fillColumnWell(board: Board, col: number, rows: number) {
  for (let i = 0; i < rows; i++) {
    const y = 19 - i;
    for (let x = 0; x < 10; x++) {
      board[y][x] = x === col ? 0 : "J";
    }
  }
}

function dropVerticalITetris(engine: GameEngine) {
  const current = engine.getCurrent();
  if (!current || current.type !== "I") {
    throw new Error("expected I piece");
  }
  for (let i = 0; i < 4; i++) {
    const cells = pieceCells(engine.getCurrent()!);
    const xs = new Set(cells.map((cell) => cell.x));
    if (xs.size === 1) {
      fillColumnWell(engine.getBoard(), [...xs][0], 4);
      engine.input("hardDrop");
      return;
    }
    engine.input("rotateCW");
  }
  throw new Error("could not rotate I to vertical");
}
