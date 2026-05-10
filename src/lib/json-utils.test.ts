import { describe, it, expect } from "vitest";
import { safeParseJsonObject } from "./json-utils.js";

describe("safeParseJsonObject", () => {
  it("parses bare JSON objects", () => {
    expect(safeParseJsonObject(`{"a":1}`)).toEqual({ a: 1 });
  });

  it("strips fenced json blocks", () => {
    const raw = "```json\n{\"x\":\"y\"}\n```";
    expect(safeParseJsonObject(raw)).toEqual({ x: "y" });
  });

  it("strips fenced blocks without language tag", () => {
    expect(safeParseJsonObject("```\n{\"ok\":true}\n```")).toEqual({ ok: true });
  });

  it("returns empty object on malformed JSON", () => {
    expect(safeParseJsonObject("{")).toEqual({});
  });

  it("returns empty object for JSON arrays", () => {
    expect(safeParseJsonObject("[1,2]")).toEqual({});
  });
});
