/** Base URL for API when the SPA is hosted separately (e.g. Capacitor WebView). */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== "string" || !raw.trim()) return "";
  return raw.trim().replace(/\/+$/, "");
}

/** Build absolute URL for an API path (`/api/...`). Same-origin when base is unset. */
export function resolveApiUrl(apiPath: string): string {
  const base = getApiBaseUrl();
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  if (!base) return path;
  return `${base}${path}`;
}

export function apiFetch(apiPath: string, init?: RequestInit): Promise<Response> {
  return fetch(resolveApiUrl(apiPath), init);
}
