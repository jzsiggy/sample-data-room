export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/**
 * fetch wrapper that always sends the session cookie (`credentials: include`,
 * required because the API is a separate origin — see ADR-0001) and defaults to
 * JSON.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

/**
 * apiFetch + JSON parse that throws on a non-2xx response, surfacing the API's
 * `error` message when present.
 */
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body as { error?: string }).error ?? "Something went wrong.",
    );
  }
  return body as T;
}
