/** Join className fragments, skipping falsy entries. */
export function cx(...parts: Array<string | undefined | null | false>): string {
  return parts.filter(Boolean).join(" ");
}
