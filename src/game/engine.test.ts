import { describe, expect, it } from "vitest";
import { GameEngine } from "./engine";
import type { TetrominoType } from "./types";

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
});
