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
  // Empty rooms list by default so the signed-in dashboard renders without each
  // unrelated test having to stub it.
  http.get("http://localhost:3000/rooms", () => HttpResponse.json([])),
  // Empty file list by default so the room-detail page renders without every
  // detail test having to stub the files endpoint.
  http.get("http://localhost:3000/rooms/:id/files", () =>
    HttpResponse.json([]),
  ),
);
