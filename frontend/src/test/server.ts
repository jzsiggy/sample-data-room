import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// Default MSW handlers for the test suite. Individual tests override these with
// server.use(...) to exercise signed-in, error, and edge-case paths.
export const server = setupServer(
  http.get("http://localhost:3000/health", () =>
    HttpResponse.json({ status: "ok" }),
  ),
  // Signed-out by default; tests that need a session override this.
  http.get("http://localhost:3000/auth/me", () =>
    HttpResponse.json({ error: "Not authenticated." }, { status: 401 }),
  ),
);
