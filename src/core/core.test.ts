import { describe, expect, it } from "vitest";
import { BrowserGameAdapter } from "../adapters/browser";
import { RecordingInputAdapter } from "../adapters/external/virtualPad";
import { TetrisAICore } from "../core/ai";
import { ControlLoop } from "../core/loop";
import { planActions } from "../core/planner";
import { BeamSearch, PlySearch } from "../core/search";
import { DEFAULT_WEIGHTS } from "../ai/weights";
import { GameEngine } from "../game/engine";
import { createPiece } from "../game/piece";

describe("Tetris AI Core", () => {
  it("plans rotate then shift then hard drop from a GameState", () => {
    const current = createPiece("T", 1);
    current.rotation = 0;
    current.x = 3;
    const actions = planActions(current, { rotation: 2, x: 5, y: 18 });
    expect(actions.map((a) => a.type)).toEqual([
      "rotateCW",
      "rotateCW",
      "moveRight",
      "moveRight",
      "hardDrop",
    ]);
  });

  it("thinks from a browser adapter state without calling GameEngine.input", () => {
    const engine = new GameEngine();
    engine.start();
    const adapter = new BrowserGameAdapter(engine);
    const core = new TetrisAICore(new PlySearch());
    const planned = core.plan(adapter.getState(), { weights: DEFAULT_WEIGHTS, depth: 1 });
    expect(planned.target).not.toBeNull();
    expect(planned.actions.at(-1)?.type).toBe("hardDrop");
    expect(engine.getCurrent()?.y).toBe(engine.getSnapshot().current?.y);
  });

  it("closed loop acts through the adapter, not the engine API directly", () => {
    const engine = new GameEngine();
    const browser = new BrowserGameAdapter(engine);
    const loop = new ControlLoop(
      new TetrisAICore(),
      { weights: DEFAULT_WEIGHTS, depth: 1 },
      () => 1,
    );
    engine.start();
    let acted = 0;
    for (let now = 0; now < 2000; now += 16) {
      engine.tick(now);
      const step = loop.tick(now, true, browser);
      if (step.acted) acted += 1;
    }
    expect(acted).toBeGreaterThan(0);
    expect(engine.getSnapshot().score).toBeGreaterThan(0);
  });

  it("plans HOLD as a first-class action", () => {
    const current = createPiece("T", 1);
    expect(planActions(current, { hold: true, rotation: 1, x: 4, y: 18 })).toEqual([
      { type: "hold" },
    ]);
  });

  it("PlySearch never emits a hold move", () => {
    const engine = new GameEngine();
    engine.start();
    const adapter = new BrowserGameAdapter(engine);
    const core = new TetrisAICore(new PlySearch());
    const planned = core.plan(adapter.getState(), { weights: DEFAULT_WEIGHTS, depth: 2 });
    expect(planned.target?.hold).toBeFalsy();
  });

  it("BeamSearch considers hold branches on an empty hold", () => {
    const engine = new GameEngine();
    engine.start();
    const adapter = new BrowserGameAdapter(engine);
    const core = new TetrisAICore(new BeamSearch({ depth: 2, beamWidth: 8, useHold: true }));
    const planned = core.plan(adapter.getState(), {
      weights: DEFAULT_WEIGHTS,
      depth: 2,
      beamWidth: 8,
      useHold: true,
    });
    expect(planned.target).not.toBeNull();
    expect(planned.search.candidates.some((c) => c.placement.hold)).toBe(true);
    expect(planned.search.nodes).toBeGreaterThan(0);
  });

  it("external recording adapter logs controller buttons", () => {
    const pad = new RecordingInputAdapter();
    pad.press({ type: "moveLeft" });
    pad.press({ type: "rotateCW" });
    pad.press({ type: "hardDrop" });
    expect(pad.log.map((e) => e.button)).toEqual(["DPadLeft", "B", "DPadUp"]);
  });
});
