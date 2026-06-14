import { render, screen, waitFor } from "@testing-library/react";
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

interface FileRow {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

function filesList(roomId: string, files: FileRow[]) {
  server.use(
    http.get(`http://localhost:3000/rooms/${roomId}/files`, () =>
      HttpResponse.json(
        files.map((f) => ({ ...f, createdAt: new Date().toISOString() })),
      ),
    ),
  );
}

describe("room files", () => {
  it("lists the room's files with name, type, and size", async () => {
    signedIn();
    roomDetail({ id: "r1", name: "Acme Seed Round" });
    filesList("r1", [
      { id: "f1", name: "report.pdf", contentType: "application/pdf", size: 2048 },
    ]);
    renderApp("/rooms/r1");

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText(/application\/pdf/)).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });

  it("uploads a file: shows uploading, then the file appears", async () => {
    signedIn();
    roomDetail({ id: "r1", name: "Acme Seed Round" });
    filesList("r1", []);

    let releasePut!: () => void;
    const putGate = new Promise<void>((resolve) => {
      releasePut = resolve;
    });
    server.use(
      http.post("http://localhost:3000/rooms/r1/files/presign", () =>
        HttpResponse.json({
          url: "https://storage.test/put/abc",
          key: "rooms/r1/abc",
        }),
      ),
      http.put("https://storage.test/put/abc", async () => {
        await putGate;
        return new HttpResponse(null, { status: 200 });
      }),
      http.post("http://localhost:3000/rooms/r1/files", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { id: "f1", ...body, createdAt: new Date().toISOString() },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    renderApp("/rooms/r1");
    await screen.findByRole("heading", { name: "Acme Seed Round" });

    const file = new File(["pdf-bytes"], "report.pdf", {
      type: "application/pdf",
    });
    await user.upload(screen.getByLabelText(/upload a file/i), file);

    expect(await screen.findByText(/uploading/i)).toBeInTheDocument();

    releasePut();

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument();
  });

  it("shows a failed state when the upload errors", async () => {
    signedIn();
    roomDetail({ id: "r1", name: "Acme Seed Round" });
    filesList("r1", []);
    server.use(
      http.post("http://localhost:3000/rooms/r1/files/presign", () =>
        HttpResponse.json({
          url: "https://storage.test/put/abc",
          key: "rooms/r1/abc",
        }),
      ),
      // Storage rejects the bytes.
      http.put(
        "https://storage.test/put/abc",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const user = userEvent.setup();
    renderApp("/rooms/r1");
    await screen.findByRole("heading", { name: "Acme Seed Round" });

    const file = new File(["pdf-bytes"], "report.pdf", {
      type: "application/pdf",
    });
    await user.upload(screen.getByLabelText(/upload a file/i), file);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not upload/i);
    expect(alert).toHaveTextContent("report.pdf");
    expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument();
    expect(screen.queryByText("report.pdf")).not.toBeInTheDocument();
  });

  it("rejects a file over 50 MB without contacting the API", async () => {
    signedIn();
    roomDetail({ id: "r1", name: "Acme Seed Round" });
    filesList("r1", []);
    let presignCalled = false;
    server.use(
      http.post("http://localhost:3000/rooms/r1/files/presign", () => {
        presignCalled = true;
        return HttpResponse.json({ url: "x", key: "k" });
      }),
    );

    const user = userEvent.setup();
    renderApp("/rooms/r1");
    await screen.findByRole("heading", { name: "Acme Seed Round" });

    const file = new File(["x"], "huge.zip", { type: "application/zip" });
    Object.defineProperty(file, "size", { value: 50 * 1024 * 1024 + 1 });
    await user.upload(screen.getByLabelText(/upload a file/i), file);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/50 MB limit/i);
    expect(alert).toHaveTextContent("huge.zip");
    expect(presignCalled).toBe(false);
  });

  it("deletes a file and removes it from the list", async () => {
    signedIn();
    roomDetail({ id: "r1", name: "Acme Seed Round" });
    filesList("r1", [
      { id: "f1", name: "report.pdf", contentType: "application/pdf", size: 2048 },
    ]);
    server.use(
      http.delete(
        "http://localhost:3000/rooms/r1/files/f1",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    const user = userEvent.setup();
    renderApp("/rooms/r1");
    expect(await screen.findByText("report.pdf")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /delete report\.pdf/i }),
    );

    await waitFor(() =>
      expect(screen.queryByText("report.pdf")).not.toBeInTheDocument(),
    );
  });
});
