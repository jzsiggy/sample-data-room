# Auth sessions held in an httpOnly cookie, not a JWT

Owners authenticate with email + password, and the resulting session is held in a signed, httpOnly cookie set by the backend — not a JWT stored in the browser by client-side JavaScript.

We chose this for XSS safety: a token kept in `localStorage`/`sessionStorage` is readable by any script that runs on the page, so a single XSS flaw leaks the session. An httpOnly cookie is not script-readable, so the same flaw cannot exfiltrate it. The trade-off we accepted: the API is no longer statelessly authenticated by a self-contained token, and because the SPA and API are separate origins in development, we must configure CORS with credentials and scope the cookie correctly.

## Considered options

- **JWT in `localStorage`** (the common SPA + API default) — rejected: convenient and stateless, but exposes the token to XSS.
