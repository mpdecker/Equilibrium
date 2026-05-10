import { describe, it, expect } from "vitest";
import { createSeededRng } from "./rng.js";

describe("createSeededRng", () => {
  it("is deterministic for a fixed seed", () => {
    const seq = (rng: () => number) => [rng(), rng(), rng()];
    expect(seq(createSeededRng(42))).toEqual(seq(createSeededRng(42)));
  });
});
