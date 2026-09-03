import { cloneBoard, createBoard } from "../game/board";
import { createPiece } from "../game/piece";
import { placeAndClear } from "../game/lineClear";
import { generateMoves, generateMovesWithSpins } from "../ai/moveGenerator";
import { detectTSpin } from "../core/mechanics/tspin";
import { applyHold, nextBackToBack, nextCombo } from "../core/mechanics/hold";
import type { TetrisGameState } from "../core/state";
import type { Placement } from "../ai/types";
import type { ActivePiece, TetrominoType } from "../game/types";
import type { HumanAction } from "./types";
import type { TSpinKind } from "../core/mechanics";

export function cloneState(state: TetrisGameState): TetrisGameState {
  return {
    board: cloneBoard(state.board),
    current: state.current ? { ...state.current } : null,
    nextPieces: state.nextPieces.slice(),
    holdPiece: state.holdPiece,
    canHold: state.canHold,
    combo: state.combo,
    backToBack: state.backToBack,
    phase: state.phase,
    extras: state.extras ? { ...state.extras } : undefined,
  };
}

export function emptyPlayingState(queue: TetrominoType[]): TetrisGameState {
  const [current, ...rest] = queue;
  return {
    board: createBoard(),
    current: current ? createPiece(current) : null,
    nextPieces: rest,
    holdPiece: null,
    canHold: true,
    combo: 0,
    backToBack: false,
    phase: "playing",
    extras: { score: 0, level: 1, lines: 0 },
  };
}

export function findGenerated(
  board: TetrisGameState["board"],
  type: TetrominoType,
  placement: Pick<Placement, "rotation" | "x" | "hold">,
): ActivePiece | null {
  const moves = generateMovesWithSpins(board, type);
  const match =
    moves.find(
      (m) =>
        m.placement.rotation === placement.rotation && m.placement.x === placement.x,
    ) ?? generateMoves(board, type).find(
      (m) => m.placement.rotation === placement.rotation && m.placement.x === placement.x,
    );
  return match?.piece ?? null;
}

export function applyAction(
  state: TetrisGameState,
  action: Pick<HumanAction, "hold" | "rotation" | "x">,
): { next: TetrisGameState; applied: HumanAction } | null {
  if (!state.current) return null;
  let working = cloneState(state);
  let type = working.current!.type;
  const usedHold = action.hold;
  if (usedHold) {
    const held = applyHold({
      current: type,
      hold: working.holdPiece,
      nextQueue: working.nextPieces,
      canHold: working.canHold,
    });
    if (!held.ok || !held.current) return null;
    working.holdPiece = held.hold;
    working.nextPieces = held.nextQueue;
    working.canHold = false;
    type = held.current;
    working.current = createPiece(type);
  }

  const piece = findGenerated(working.board, type, action);
  if (!piece) return null;
  const tSpin: TSpinKind = detectTSpin(working.board, piece, Boolean(
    generateMovesWithSpins(working.board, type).find(
      (m) => m.placement.rotation === action.rotation && m.placement.x === action.x,
    )?.placement.spinPre,
  ));
  const placed = placeAndClear(working.board, piece);
  const remainder = working.nextPieces.slice();
  const incoming = remainder.shift() ?? null;
  const next: TetrisGameState = {
    board: placed.board,
    current: incoming ? createPiece(incoming) : null,
    nextPieces: remainder,
    holdPiece: working.holdPiece,
    canHold: true,
    combo: nextCombo(working.combo, placed.cleared),
    backToBack: nextBackToBack(working.backToBack, placed.cleared, tSpin),
    phase: incoming ? "playing" : "gameover",
    extras: {
      ...working.extras,
      lines: (working.extras?.lines ?? 0) + placed.cleared,
    },
  };
  return {
    next,
    applied: {
      spawn: true,
      hold: usedHold,
      rotation: piece.rotation,
      x: piece.x,
      y: piece.y,
      hardDrop: true,
      pieceType: type,
      linesCleared: placed.cleared,
      tSpin,
      comboAfter: next.combo,
      b2bAfter: next.backToBack,
    },
  };
}

export function placementKey(p: Pick<Placement, "rotation" | "x" | "y" | "hold">): string {
  return `${p.hold ? 1 : 0}:${p.rotation}:${p.x}:${p.y ?? ""}`;
}

export function samePlacement(
  a: Pick<Placement, "rotation" | "x" | "y" | "hold"> | null,
  b: Pick<Placement, "rotation" | "x" | "y" | "hold"> | null,
): boolean {
  if (!a || !b) return false;
  if (Boolean(a.hold) !== Boolean(b.hold)) return false;
  if (a.rotation !== b.rotation || a.x !== b.x) return false;
  if (a.y !== undefined && b.y !== undefined) return a.y === b.y;
  return true;
}
