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
