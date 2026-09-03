export type TetrisAction =
  | { type: "moveLeft" }
  | { type: "moveRight" }
  | { type: "rotateCW" }
  | { type: "rotateCCW" }
  | { type: "softDrop" }
  | { type: "hardDrop" }
  | { type: "hold" };

export type TetrisActionType = TetrisAction["type"];
