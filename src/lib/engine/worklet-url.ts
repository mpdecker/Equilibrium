/**
 * Resolve AudioWorklet module URL for Vite + Capacitor.
 *
 * Production builds use `base: './'` so absolute `/worklets/...` fails inside the
 * native WebView asset root. Prefer `import.meta.env.BASE_URL` (always trailing `/`).
 */
export function resolveWorkletModuleUrl(
  baseUrl: string | undefined = typeof import.meta !== "undefined"
    ? (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL
    : undefined,
  fileName = "equilibrium-dsp-processor.js",
): string {
  const base = typeof baseUrl === "string" && baseUrl.length > 0 ? baseUrl : "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}worklets/${fileName}`;
}
