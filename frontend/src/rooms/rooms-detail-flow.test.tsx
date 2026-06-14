import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { server } from "../test/server";

function renderApp(path: string) {
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

function roomDetail(room: { id: string; name: string }) {
  server.use(
    http.get(`http://localhost:3000/rooms/${room.id}`, () =>
      HttpResponse.json({ ...room, createdAt: new Date().toISOString() }),
    ),
  );
}

describe("room detail", () => {
  it("shows the room's name with rename and delete actions", async () => {
    signedIn();
    roomDetail({ id: "r1", name: "Acme Seed Round" });
    renderApp("/rooms/r1");

    expect(await screen.findByText("Acme Seed Round")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /rename/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete/i }),
    ).toBeInTheDocument();
  });

  it("renames the room and shows the new name", async () => {
    signedIn();
    roomDetail({ id: "r1", name: "Old Name" });
    server.use(
      http.patch("http://localhost:3000/rooms/r1", async ({ request }) => {
        const body = (await request.json()) as { name: string };
        return HttpResponse.json({
          id: "r1",
          name: body.name,
          createdAt: new Date().toISOString(),
        });
      }),
    );
    const user = userEvent.setup();
    renderApp("/rooms/r1");
    await screen.findByText("Old Name");

    await user.click(screen.getByRole("button", { name: /rename/i }));
    const input = screen.getByLabelText(/room name/i);
    await user.clear(input);
    await user.type(input, "New Name");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("New Name")).toBeInTheDocument();
  });

  it("deletes the room and returns to the dashboard without it", async () => {
    signedIn();
    roomDetail({ id: "r1", name: "Doomed Room" });
    server.use(
      http.delete(
        "http://localhost:3000/rooms/r1",
        () => new HttpResponse(null, { status: 204 }),
      ),
      // Dashboard list no longer includes the deleted room.
      http.get("http://localhost:3000/rooms", () => HttpResponse.json([])),
    );
    const user = userEvent.setup();
    renderApp("/rooms/r1");
    await screen.findByText("Doomed Room");

    await user.click(screen.getByRole("button", { name: /delete/i }));

    expect(
      await screen.findByRole("heading", { name: /rooms/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Doomed Room")).not.toBeInTheDocument();
  });
});
