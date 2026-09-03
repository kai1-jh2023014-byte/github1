import { placeAndClear } from "../game/lineClear";
import type { Board, TetrominoType } from "../game/types";
import { evaluateBoard } from "./evaluator";
import { generateMoves } from "./moveGenerator";
import type { EvalWeights, ScoredCandidate, SearchDepth, SearchResult } from "./types";

export function findBestMove(
  board: Board,
  current: TetrominoType,
  next: TetrominoType | null,
  weights: EvalWeights,
  depth: SearchDepth = 1,
): SearchResult {
  const started = nowMs();
  const candidates: ScoredCandidate[] = [];
  let nodes = 0;
  let best: ScoredCandidate | null = null;

  const useTwoPly = depth === 2 && next !== null;
  const currentMoves = generateMoves(board, current);

  for (const move of currentMoves) {
    const placed = placeAndClear(board, move.piece);
    nodes += 1;
    const first = evaluateBoard(placed.board, placed.cleared, weights);
    let score = first.score;

    if (useTwoPly) {
      const nextMoves = generateMoves(placed.board, next);
      let bestNext = Number.NEGATIVE_INFINITY;
      if (nextMoves.length === 0) {
        bestNext = first.score - 50;
      } else {
        for (const nextMove of nextMoves) {
          const nextPlaced = placeAndClear(placed.board, nextMove.piece);
          nodes += 1;
          const evaluated = evaluateBoard(
            nextPlaced.board,
            placed.cleared + nextPlaced.cleared,
            weights,
          );
          if (evaluated.score > bestNext) bestNext = evaluated.score;
        }
      }
      score = bestNext;
    }

    const candidate: ScoredCandidate = {
      placement: move.placement,
      score,
      features: first.features,
    };
    candidates.push(candidate);
    if (!best || candidate.score > best.score) best = candidate;
  }

  candidates.sort((a, b) => b.score - a.score);

  return {
    move: best?.placement ?? null,
    bestScore: best?.score ?? Number.NEGATIVE_INFINITY,
    candidates,
    elapsedMs: nowMs() - started,
    depth: useTwoPly ? 2 : 1,
    nodes,
  };
}

function nowMs(): number {
  if (typeof performance !== "undefined") return performance.now();
  return Date.now();
}
