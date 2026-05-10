import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";
import { uniformFloat64 } from "pure-rand/distribution/uniformFloat64";

/** Deterministic RNG for tests and parity harness (0 <= x < 1). */
export function createSeededRng(seed: number): () => number {
  const rng = xoroshiro128plus(seed);
  return () => uniformFloat64(rng);
}
