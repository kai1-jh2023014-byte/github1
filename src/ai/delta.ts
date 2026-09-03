import { COLS } from "../game/constants";
import type { TetrisWell } from "./structure";

/**
 * Experimental parent-relative terms. Not part of DEFAULT_WEIGHTS / 2-ply.
 * Linear (child - parent) of a feature already in the leaf score is just a
 * weight change among siblings — these terms are hinged at the parent instead.
 */
export interface DeltaWeights {
  wellDestroy: number;
  wellCreate: number;
  holeCreate: number;
  holeFill: number;
  surfaceDamage: number;
}

export const ZERO_DELTA: DeltaWeights = {
  wellDestroy: 0,
  wellCreate: 0,
  holeCreate: 0,
  holeFill: 0,
  surfaceDamage: 0,
};

/** Destroy-only: extra loss-aversion. Create stays 0 so we do not restack well/I. */
export const WELL_SMALL: DeltaWeights = { ...ZERO_DELTA, wellDestroy: 1.2 };
export const WELL_MEDIUM: DeltaWeights = { ...ZERO_DELTA, wellDestroy: 2.4, wellCreate: 0.2 };
export const WELL_LARGE: DeltaWeights = { ...ZERO_DELTA, wellDestroy: 4.0, wellCreate: 0.45 };

/** New holes only at small; fill is already in DEFAULT_WEIGHTS.holes. */
export const HOLE_SMALL: DeltaWeights = { ...ZERO_DELTA, holeCreate: 0.12 };
export const HOLE_MEDIUM: DeltaWeights = { ...ZERO_DELTA, holeCreate: 0.22, holeFill: 0.04 };
export const HOLE_LARGE: DeltaWeights = { ...ZERO_DELTA, holeCreate: 0.4, holeFill: 0.08 };

export const SURFACE_SMALL: DeltaWeights = { ...ZERO_DELTA, surfaceDamage: 0.035 };
export const SURFACE_MEDIUM: DeltaWeights = { ...ZERO_DELTA, surfaceDamage: 0.07 };
export const SURFACE_LARGE: DeltaWeights = { ...ZERO_DELTA, surfaceDamage: 0.14 };

export function mergeDeltaWeights(...parts: DeltaWeights[]): DeltaWeights {
  const out = { ...ZERO_DELTA };
  for (const part of parts) {
    out.wellDestroy += part.wellDestroy;
    out.wellCreate += part.wellCreate;
    out.holeCreate += part.holeCreate;
    out.holeFill += part.holeFill;
    out.surfaceDamage += part.surfaceDamage;
  }
  return out;
}

/**
 * Same peaked depth curve as well reservation *shape*, without the wells-penalty
 * offset or I-hold bonus — those stay on the absolute Phase 2 term.
 * Depth past 6 is not worth more (no unbounded deep-well farming).
 */
export function wellShapeQuality(depth: number): number {
  if (depth < 3) return 0;
  if (depth === 3) return 0.12;
  if (depth === 4) return 0.32;
  if (depth === 5) return 0.38;
  if (depth === 6) return 0.3;
  if (depth === 7 || depth === 8) return 0.16;
  return 0.05;
}

export function wellQuality(well: TetrisWell | null | undefined): number {
  return wellShapeQuality(well?.depth ?? 0);
}

/**
 * Asymmetric well change. Tetris (4-line) destruction is skipped by the caller —
 * filling the reserved well for a tetris is the point of reservation.
 */
export function scoreWellDelta(parentQuality: number, childQuality: number, weights: DeltaWeights): number {
  const d = childQuality - parentQuality;
  if (d < 0) return weights.wellDestroy * d;
  if (d > 0) return weights.wellCreate * d;
  return 0;
}

export function scoreHoleDelta(parentHoles: number, childHoles: number, weights: DeltaWeights): number {
  const d = childHoles - parentHoles;
  if (d > 0) return -weights.holeCreate * d;
  if (d < 0) return weights.holeFill * -d;
  return 0;
}

/**
 * Only *new* adjacent roughness. Well-edge cliffs (tetris well) are excluded so
 * this does not fight well/I reservation or restack absolute bumpiness.
 */
export function scoreSurfaceDelta(
  parentHeights: number[],
  childHeights: number[],
  weights: DeltaWeights,
  parentWellCol: number,
  childWellCol: number,
): number {
  if (weights.surfaceDamage === 0) return 0;
  let damage = 0;
  for (let x = 0; x < COLS - 1; x++) {
    if (isWellEdge(x, parentWellCol) || isWellEdge(x, childWellCol)) continue;
    const parentCliff = Math.abs(parentHeights[x]! - parentHeights[x + 1]!);
    const childCliff = Math.abs(childHeights[x]! - childHeights[x + 1]!);
    if (childCliff <= parentCliff) continue;
    damage += childCliff - parentCliff;
    if (parentCliff < 3 && childCliff >= 3) damage += 1;
  }
  if (damage === 0) return 0;
  return -weights.surfaceDamage * damage;
}

function isWellEdge(x: number, wellCol: number): boolean {
  return wellCol >= 0 && (x === wellCol || x + 1 === wellCol);
}

export interface DeltaActivations {
  well: number;
  hole: number;
  surface: number;
}

export function emptyDeltaActivations(): DeltaActivations {
  return { well: 0, hole: 0, surface: 0 };
}

export interface DeltaDist {
  n: number;
  pos: number;
  neg: number;
  zero: number;
  sum: number;
  samples: number[];
}

export function emptyDeltaDist(): DeltaDist {
  return { n: 0, pos: 0, neg: 0, zero: 0, sum: 0, samples: [] };
}

export function observeDelta(dist: DeltaDist, value: number, sampleCap = 512): void {
  dist.n += 1;
  if (value > 1e-12) dist.pos += 1;
  else if (value < -1e-12) dist.neg += 1;
  else dist.zero += 1;
  dist.sum += value;
  if (dist.samples.length < sampleCap) dist.samples.push(value);
  else if (dist.n % 11 === 0) dist.samples[dist.n % sampleCap] = value;
}

export function mergeDeltaDist(into: DeltaDist, from: DeltaDist, sampleCap = 2048): void {
  into.n += from.n;
  into.pos += from.pos;
  into.neg += from.neg;
  into.zero += from.zero;
  into.sum += from.sum;
  for (const sample of from.samples) {
    if (into.samples.length < sampleCap) into.samples.push(sample);
    else if (into.n % 17 === 0) into.samples[into.n % sampleCap] = sample;
  }
}

export function summarizeDelta(dist: DeltaDist): {
  n: number;
  mean: number;
  median: number;
  p95: number;
  pos: number;
  neg: number;
  zero: number;
  activeShare: number;
} {
  const sorted = dist.samples.length ? [...dist.samples].sort((a, b) => a - b) : [0];
  const mean = dist.n === 0 ? 0 : dist.sum / dist.n;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  const p95Index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(0.95 * sorted.length) - 1));
  return {
    n: dist.n,
    mean,
    median,
    p95: sorted[p95Index]!,
    pos: dist.pos,
    neg: dist.neg,
    zero: dist.zero,
    activeShare: dist.n === 0 ? 0 : (dist.pos + dist.neg) / dist.n,
  };
}

export interface DeltaBundle {
  well: DeltaDist;
  hole: DeltaDist;
  surface: DeltaDist;
}

export function emptyDeltaBundle(): DeltaBundle {
  return { well: emptyDeltaDist(), hole: emptyDeltaDist(), surface: emptyDeltaDist() };
}

export function mergeDeltaBundle(into: DeltaBundle, from: DeltaBundle): void {
  mergeDeltaDist(into.well, from.well);
  mergeDeltaDist(into.hole, from.hole);
  mergeDeltaDist(into.surface, from.surface);
}
