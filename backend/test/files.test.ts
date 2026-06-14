import request from "supertest";
import { Express } from "express";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { FakeStorageService } from "../src/storage/fake-storage-service";

function buildApp() {
  const storage = new FakeStorageService();
  const app = createApp({ storage });
  return { app, storage };
}

// Registers a fresh owner and returns an agent carrying their session cookie.
async function signedInAgent(app: Express, email: string) {
  const agent = request.agent(app);
  await agent
    .post("/auth/register")
    .send({ email, password: "a good password" })
    .expect(201);
  return agent;
}

async function createRoom(
  agent: ReturnType<typeof request.agent>,
  name: string,
): Promise<string> {
  const res = await agent.post("/rooms").send({ name }).expect(201);
  return res.body.id as string;
}

describe("POST /rooms/:id/files/presign", () => {
  it("returns an upload URL and storage key for an owned room", async () => {
    const { app } = buildApp();
    const ada = await signedInAgent(app, "ada@example.com");
    const roomId = await createRoom(ada, "Acme Seed Round");

    const res = await ada
      .post(`/rooms/${roomId}/files/presign`)
      .send({ name: "report.pdf", contentType: "application/pdf", size: 1024 });

    expect(res.status).toBe(200);
    expect(res.body.url).toBeTruthy();
    expect(res.body.key).toBeTruthy();
  });

  it("rejects a file larger than 50 MB with a clear message", async () => {
    const { app, storage } = buildApp();
    const ada = await signedInAgent(app, "ada@example.com");
    const roomId = await createRoom(ada, "Acme Seed Round");
    const presignUpload = vi.spyOn(storage, "presignUpload");

    const res = await ada.post(`/rooms/${roomId}/files/presign`).send({
      name: "huge.zip",
      contentType: "application/zip",
      size: 50 * 1024 * 1024 + 1,
    });

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/50 MB/i);
    // Nothing is reserved in storage for an over-limit file.
    expect(presignUpload).not.toHaveBeenCalled();
  });
});

describe("upload confirm and list", () => {
  it("lists a confirmed file with its name, type, and size", async () => {
    const { app } = buildApp();
    const ada = await signedInAgent(app, "ada@example.com");
    const roomId = await createRoom(ada, "Acme Seed Round");

    const presign = await ada
      .post(`/rooms/${roomId}/files/presign`)
      .send({ name: "report.pdf", contentType: "application/pdf", size: 2048 })
      .expect(200);

    const confirm = await ada.post(`/rooms/${roomId}/files`).send({
      name: "report.pdf",
      contentType: "application/pdf",
      size: 2048,
      key: presign.body.key,
    });

    expect(confirm.status).toBe(201);
    expect(confirm.body).toMatchObject({
      name: "report.pdf",
      contentType: "application/pdf",
      size: 2048,
    });
    expect(confirm.body.id).toBeTruthy();

    const list = await ada.get(`/rooms/${roomId}/files`).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({
      id: confirm.body.id,
      name: "report.pdf",
      contentType: "application/pdf",
      size: 2048,
    });
  });
});

describe("DELETE /rooms/:id/files/:fileId", () => {
  it("removes the file from the list and deletes its storage object", async () => {
    const { app, storage } = buildApp();
    const ada = await signedInAgent(app, "ada@example.com");
    const roomId = await createRoom(ada, "Acme Seed Round");

    const presign = await ada
      .post(`/rooms/${roomId}/files/presign`)
      .send({ name: "report.pdf", contentType: "application/pdf", size: 2048 })
      .expect(200);
    const key = presign.body.key as string;
    const confirm = await ada
      .post(`/rooms/${roomId}/files`)
      .send({ name: "report.pdf", contentType: "application/pdf", size: 2048, key })
      .expect(201);

    const res = await ada.delete(`/rooms/${roomId}/files/${confirm.body.id}`);

    expect(res.status).toBe(204);

    const list = await ada.get(`/rooms/${roomId}/files`).expect(200);
    expect(list.body).toEqual([]);

    // The storage object is gone: the fake only presigns downloads for live keys.
    await expect(storage.presignDownload(key)).rejects.toThrow();
  });
});

describe("deleting a room removes its files' storage objects", () => {
  it("deletes every storage object belonging to the room", async () => {
    const { app, storage } = buildApp();
    const ada = await signedInAgent(app, "ada@example.com");
    const roomId = await createRoom(ada, "Doomed Room");

    const keys: string[] = [];
    for (const name of ["a.pdf", "b.png"]) {
      const presign = await ada
        .post(`/rooms/${roomId}/files/presign`)
        .send({ name, contentType: "application/octet-stream", size: 10 })
        .expect(200);
      keys.push(presign.body.key);
      await ada
        .post(`/rooms/${roomId}/files`)
        .send({ name, contentType: "application/octet-stream", size: 10, key: presign.body.key })
        .expect(201);
    }

    await ada.delete(`/rooms/${roomId}`).expect(204);

    for (const key of keys) {
      await expect(storage.presignDownload(key)).rejects.toThrow();
    }
  });
});

describe("file routes require authentication", () => {
  it("rejects unauthenticated presign, confirm, list, and delete with 401", async () => {
    const { app } = buildApp();

    const presign = await request(app)
      .post("/rooms/r1/files/presign")
      .send({ name: "x", contentType: "text/plain", size: 1 });
    expect(presign.status).toBe(401);

    const confirm = await request(app)
      .post("/rooms/r1/files")
      .send({ name: "x", contentType: "text/plain", size: 1, key: "k" });
    expect(confirm.status).toBe(401);

    const list = await request(app).get("/rooms/r1/files");
    expect(list.status).toBe(401);

    const remove = await request(app).delete("/rooms/r1/files/f1");
    expect(remove.status).toBe(401);
  });
});

describe("file routes are scoped to the owner", () => {
  it("returns 404 for presign, confirm, list, and delete on another owner's room", async () => {
    const { app } = buildApp();
    const ada = await signedInAgent(app, "ada@example.com");
    const grace = await signedInAgent(app, "grace@example.com");
    const graceRoom = await createRoom(grace, "Grace Room");

    // Grace genuinely has a file so list/delete have something to (not) reach.
    const presigned = await grace
      .post(`/rooms/${graceRoom}/files/presign`)
      .send({ name: "g.pdf", contentType: "application/pdf", size: 5 })
      .expect(200);
    const graceFile = await grace
      .post(`/rooms/${graceRoom}/files`)
      .send({ name: "g.pdf", contentType: "application/pdf", size: 5, key: presigned.body.key })
      .expect(201);

    const presign = await ada
      .post(`/rooms/${graceRoom}/files/presign`)
      .send({ name: "x", contentType: "text/plain", size: 1 });
    expect(presign.status).toBe(404);

    const confirm = await ada
      .post(`/rooms/${graceRoom}/files`)
      .send({ name: "x", contentType: "text/plain", size: 1, key: "k" });
    expect(confirm.status).toBe(404);

    const list = await ada.get(`/rooms/${graceRoom}/files`);
    expect(list.status).toBe(404);

    const remove = await ada.delete(`/rooms/${graceRoom}/files/${graceFile.body.id}`);
    expect(remove.status).toBe(404);

    // Grace's file survived the hijack attempts.
    const stillThere = await grace.get(`/rooms/${graceRoom}/files`).expect(200);
    expect(stillThere.body).toHaveLength(1);
  });
});
