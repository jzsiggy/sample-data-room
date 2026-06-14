import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { server } from "../test/server";

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("registration flow", () => {
  it("signs the owner in after a successful registration", async () => {
    server.use(
      http.post("http://localhost:3000/auth/register", () =>
        HttpResponse.json(
          {
            id: "owner_1",
            email: "ada@example.com",
            createdAt: new Date().toISOString(),
          },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderApp("/register");

    await user.type(await screen.findByLabelText(/email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/password/i), "correct horse");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/signed in as ada@example.com/i),
    ).toBeInTheDocument();
  });
});

describe("login flow", () => {
  it("shows an error when credentials are rejected", async () => {
    server.use(
      http.post("http://localhost:3000/auth/login", () =>
        HttpResponse.json(
          { error: "Invalid email or password." },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderApp("/login");

    await user.type(
      await screen.findByLabelText(/email/i),
      "nobody@example.com",
    );
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid email or password/i,
    );
  });
});

describe("session persistence", () => {
  it("shows the signed-in app when a session is found on load", async () => {
    server.use(
      http.get("http://localhost:3000/auth/me", () =>
        HttpResponse.json({
          id: "owner_9",
          email: "returning@example.com",
          createdAt: new Date().toISOString(),
        }),
      ),
    );
    renderApp("/rooms");

    expect(
      await screen.findByText(/signed in as returning@example.com/i),
    ).toBeInTheDocument();
  });
});

describe("logout", () => {
  it("returns to the login page after logging out", async () => {
    server.use(
      http.get("http://localhost:3000/auth/me", () =>
        HttpResponse.json({
          id: "owner_11",
          email: "bye@example.com",
          createdAt: new Date().toISOString(),
        }),
      ),
      http.post(
        "http://localhost:3000/auth/logout",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const user = userEvent.setup();
    renderApp("/rooms");

    await user.click(await screen.findByRole("button", { name: /log out/i }));

    expect(
      await screen.findByRole("heading", { name: /log in/i }),
    ).toBeInTheDocument();
  });
});
