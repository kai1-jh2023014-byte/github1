import type { GameAction } from "../game/types";
import type { GameEngine } from "../game/engine";
import type { TetrisAction } from "../core/actions";
import type { TetrisGameAdapter } from "../core/adapters";
import type { TetrisGameState } from "../core/state";

const ACTION_MAP: Record<TetrisAction["type"], GameAction | null> = {
  moveLeft: "left",
  moveRight: "right",
  rotateCW: "rotateCW",
  rotateCCW: "rotateCCW",
  softDrop: "softDrop",
  hardDrop: "hardDrop",
  hold: "hold",
};

export function snapshotToState(engine: GameEngine): TetrisGameState {
  const snap = engine.getSnapshot();
  return {
    board: snap.board,
    current: snap.current,
    nextPieces: snap.nextQueue.length > 0 ? snap.nextQueue : snap.next ? [snap.next] : [],
    holdPiece: snap.hold,
    canHold: snap.canHold,
    combo: snap.combo,
    backToBack: snap.backToBack,
    phase: snap.status,
    extras: {
      score: snap.score,
      level: snap.level,
      lines: snap.lines,
    },
  };
}

export function toGameAction(action: TetrisAction): GameAction | null {
  return ACTION_MAP[action.type];
}

export class BrowserGameAdapter implements TetrisGameAdapter {
  constructor(private readonly engine: GameEngine) {}

  getState(): TetrisGameState {
    return snapshotToState(this.engine);
  }

  press(action: TetrisAction): boolean {
    const mapped = toGameAction(action);
    if (!mapped) return false;
    return this.engine.input(mapped);
  }

  execute(actions: TetrisAction[]): void {
    for (const action of actions) this.press(action);
  }
}
