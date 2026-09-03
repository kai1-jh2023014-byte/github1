import type { TetrisAction } from "./actions";
import type { TetrisGameState } from "./state";

export interface TetrisStateProvider {
  getState(): TetrisGameState;
}

export interface TetrisInputAdapter {
  press(action: TetrisAction): boolean | Promise<boolean>;
}

export interface TetrisGameAdapter extends TetrisStateProvider, TetrisInputAdapter {
  execute?(actions: TetrisAction[]): void | Promise<void>;
}
