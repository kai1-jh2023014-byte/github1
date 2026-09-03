import { TETROMINO_TYPES } from "./types";
import type { TetrominoType } from "./types";

export class BagRandomizer {
  private bag: TetrominoType[] = [];

  constructor(private readonly rng: () => number = Math.random) {}

  next(): TetrominoType {
    if (this.bag.length === 0) this.refill();
    return this.bag.pop()!;
  }

  peek(): TetrominoType {
    if (this.bag.length === 0) this.refill();
    return this.bag[this.bag.length - 1]!;
  }

  private refill(): void {
    this.bag = [...TETROMINO_TYPES];
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }
}
