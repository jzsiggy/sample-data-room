import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { server } from "../test/server";

function renderApp(path = "/rooms") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function signedIn() {
  server.use(
    http.get("http://localhost:3000/auth/me", () =>
      HttpResponse.json({
        id: "o1",
        email: "ada@example.com",
        createdAt: new Date().toISOString(),
      }),
    ),
  );
}

describe("rooms dashboard", () => {
  it("lists the owner's rooms", async () => {
    signedIn();
    server.use(
      http.get("http://localhost:3000/rooms", () =>
        HttpResponse.json([
          { id: "r1", name: "Acme Seed Round", createdAt: new Date().toISOString() },
          { id: "r2", name: "Beta Diligence", createdAt: new Date().toISOString() },
        ]),
      ),
    );
    renderApp("/rooms");

    expect(await screen.findByText("Acme Seed Round")).toBeInTheDocument();
    expect(await screen.findByText("Beta Diligence")).toBeInTheDocument();
  });

  it("links each room to its detail page", async () => {
    signedIn();
    server.use(
      http.get("http://localhost:3000/rooms", () =>
        HttpResponse.json([
          { id: "r1", name: "Acme Seed Round", createdAt: new Date().toISOString() },
        ]),
      ),
    );
    renderApp("/rooms");

    const link = await screen.findByRole("link", { name: "Acme Seed Round" });
    expect(link).toHaveAttribute("href", "/rooms/r1");
  });

  it("creates a room and shows it in the list", async () => {
    signedIn();
    server.use(
      http.post("http://localhost:3000/rooms", async ({ request }) => {
        const body = (await request.json()) as { name: string };
        return HttpResponse.json(
          { id: "r-new", name: body.name, createdAt: new Date().toISOString() },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderApp("/rooms");
    await screen.findByRole("heading", { name: /rooms/i });

    await user.type(screen.getByLabelText(/room name/i), "Gamma Round");
    await user.click(screen.getByRole("button", { name: /create room/i }));

    expect(await screen.findByText("Gamma Round")).toBeInTheDocument();
  });
});
