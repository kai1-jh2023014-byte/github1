import { generateMovesWithSpins } from "../ai/moveGenerator";
import { applyHold } from "../core/mechanics/hold";
import type { PixelBuffer } from "../vision/render";
import type { Board } from "../game/types";
import type { TetrisGameState } from "../core/state";
import { detectNativeBoard, occupancyKey } from "./frameDetect";
import { applyAction, cloneState } from "./state";
import type { ReplayStep } from "./types";

/**
 * Reconstruct placements from sampled frames.
 * Hold-only frames (type change, same locked occupancy) are not guessed as
 * placements. A later occupancy change is matched against generated moves,
 * including the hold branch. Unmatched frames are dropped — never invented.
 */
export function reconstructFromFrames(
  frames: { time: number; buffer: PixelBuffer }[],
): ReplayStep[] {
  const steps: ReplayStep[] = [];
  let prev: TetrisGameState | null = null;
  let prevConf = { board: 0, current: 0, next: 0, hold: 0, action: 0 };
  let index = 0;

  for (const frame of frames) {
    const detected = detectNativeBoard(frame.buffer);
    if (!detected || detected.confidence.board < 0.35) continue;
    const state = detected.state;

    if (!prev) {
      prev = cloneState(state);
      prevConf = detected.confidence;
      continue;
    }

    const boardChanged = occupancyKey(prev.board) !== occupancyKey(state.board);
    const typeChanged = (prev.current?.type ?? null) !== (state.current?.type ?? null);

    if (!boardChanged && typeChanged) {
      // Possible Hold. Keep the pre-hold origin; do not invent an action yet.
      continue;
    }

    if (boardChanged && prev.current) {
      const inferred = inferPlacement(prev, state.board);
      if (inferred) {
        const actionConf = inferred.unique
          ? Math.min(prevConf.board, detected.confidence.board)
          : Math.min(0.65, prevConf.board, detected.confidence.board);
        steps.push({
          index,
          timestamp: frame.time,
          stateBefore: cloneState(prev),
          stateAfter: cloneState(inferred.applied.next),
          human: inferred.applied.applied,
          confidence: {
            board: Math.min(prevConf.board, detected.confidence.board),
            current: prevConf.current,
            next: 0,
            hold: inferred.applied.applied.hold ? 0.7 : 0,
            action: actionConf,
          },
          source: "video",
        });
        index += 1;
        prev = cloneState(inferred.applied.next);
        if (state.current) prev.current = state.current;
        prevConf = detected.confidence;
        continue;
      }
    }

    if (!boardChanged && state.current && !prev.current) {
      prev.current = state.current;
      prevConf = detected.confidence;
      continue;
    }

    prev = cloneState(state);
    prevConf = detected.confidence;
  }
  return steps;
}

function inferPlacement(
  before: TetrisGameState,
  afterLocked: Board,
): { applied: NonNullable<ReturnType<typeof applyAction>>; unique: boolean } | null {
  const noHold = matchOccupancy(before, afterLocked, false);
  if (noHold.length) {
    return { applied: noHold[0]!, unique: noHold.length === 1 };
  }
  const held = matchOccupancy(before, afterLocked, true);
  if (!held.length) return null;
  return { applied: held[0]!, unique: held.length === 1 };
}

function matchOccupancy(
  before: TetrisGameState,
  afterLocked: Board,
  hold: boolean,
): NonNullable<ReturnType<typeof applyAction>>[] {
  if (!before.current) return [];
  let type = before.current.type;
  if (hold) {
    const held = applyHold({
      current: before.current.type,
      hold: before.holdPiece,
      nextQueue: before.nextPieces,
      canHold: before.canHold,
    });
    if (!held.ok || !held.current) return [];
    type = held.current;
  }
  const matches: NonNullable<ReturnType<typeof applyAction>>[] = [];
  const seen = new Set<string>();
  for (const move of generateMovesWithSpins(before.board, type)) {
    const key = `${hold}:${move.placement.rotation}:${move.placement.x}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const applied = applyAction(before, {
      hold,
      rotation: move.placement.rotation,
      x: move.placement.x,
    });
    if (!applied) continue;
    if (occupancyKey(applied.next.board) === occupancyKey(afterLocked)) {
      matches.push(applied);
    }
  }
  return matches;
}
