/** Safe JSON.parse for LLM outputs (handles fenced blocks). */
export function safeParseJsonObject(text: string): Record<string, unknown> {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  }
  try {
    const v = JSON.parse(s) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
  } catch {
    /* empty */
  }
  return {};
}
