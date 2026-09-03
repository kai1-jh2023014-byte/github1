import { BagRandomizer } from "./randomizer";
import type { TetrominoType } from "./types";

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandomizer(seed: number): BagRandomizer {
  return new BagRandomizer(mulberry32(seed));
}

export function pickType(rng: () => number, types: readonly TetrominoType[]): TetrominoType {
  return types[Math.floor(rng() * types.length)]!;
}
