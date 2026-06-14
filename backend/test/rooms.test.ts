import request from "supertest";
import { Express } from "express";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { FakeStorageService } from "../src/storage/fake-storage-service";

function buildApp(): Express {
  return createApp({ storage: new FakeStorageService() });
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

describe("POST /rooms", () => {
  it("creates a room owned by the signed-in owner", async () => {
    const app = buildApp();
    const agent = await signedInAgent(app, "owner@example.com");

    const response = await agent.post("/rooms").send({ name: "Acme Seed Round" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: "Acme Seed Round" });
    expect(response.body.id).toBeTruthy();
  });
});

describe("GET /rooms", () => {
  it("returns only the requesting owner's rooms", async () => {
    const app = buildApp();
    const ada = await signedInAgent(app, "ada@example.com");
    const grace = await signedInAgent(app, "grace@example.com");

    await ada.post("/rooms").send({ name: "Ada Room A" }).expect(201);
    await ada.post("/rooms").send({ name: "Ada Room B" }).expect(201);
    await grace.post("/rooms").send({ name: "Grace Room" }).expect(201);

    const response = await ada.get("/rooms");

    expect(response.status).toBe(200);
    const names = response.body.map((room: { name: string }) => room.name);
    expect(names).toHaveLength(2);
    expect(names).toEqual(expect.arrayContaining(["Ada Room A", "Ada Room B"]));
    expect(names).not.toContain("Grace Room");
  });
});

describe("rooms require authentication", () => {
  it("rejects unauthenticated create and list with 401", async () => {
    const app = buildApp();

    const create = await request(app).post("/rooms").send({ name: "Nope" });
    expect(create.status).toBe(401);

    const list = await request(app).get("/rooms");
    expect(list.status).toBe(401);
  });

  it("rejects unauthenticated detail, rename, and delete with 401", async () => {
    const app = buildApp();

    const detail = await request(app).get("/rooms/some-id");
    expect(detail.status).toBe(401);

    const rename = await request(app)
      .patch("/rooms/some-id")
      .send({ name: "Nope" });
    expect(rename.status).toBe(401);

    const remove = await request(app).delete("/rooms/some-id");
    expect(remove.status).toBe(401);
  });
});

describe("GET /rooms/:id", () => {
  it("returns the detail of a room the owner owns", async () => {
    const app = buildApp();
    const ada = await signedInAgent(app, "ada@example.com");
    const created = await ada
      .post("/rooms")
      .send({ name: "Acme Seed Round" })
      .expect(201);

    const response = await ada.get(`/rooms/${created.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: created.body.id,
      name: "Acme Seed Round",
    });
  });

  it("returns 404 for a room owned by someone else", async () => {
    const app = buildApp();
    const ada = await signedInAgent(app, "ada@example.com");
    const grace = await signedInAgent(app, "grace@example.com");
    const graceRoom = await grace
      .post("/rooms")
      .send({ name: "Grace Room" })
      .expect(201);

    const response = await ada.get(`/rooms/${graceRoom.body.id}`);

    expect(response.status).toBe(404);
  });
});

describe("PATCH /rooms/:id", () => {
  it("renames a room, persisting the new name in detail and list", async () => {
    const app = buildApp();
    const ada = await signedInAgent(app, "ada@example.com");
    const created = await ada
      .post("/rooms")
      .send({ name: "Old Name" })
      .expect(201);

    const rename = await ada
      .patch(`/rooms/${created.body.id}`)
      .send({ name: "New Name" });

    expect(rename.status).toBe(200);
    expect(rename.body).toMatchObject({ id: created.body.id, name: "New Name" });

    const detail = await ada.get(`/rooms/${created.body.id}`);
    expect(detail.body.name).toBe("New Name");

    const list = await ada.get("/rooms");
    expect(list.body.map((r: { name: string }) => r.name)).toEqual(["New Name"]);
  });

  it("returns 404 when renaming a room owned by someone else", async () => {
    const app = buildApp();
    const ada = await signedInAgent(app, "ada@example.com");
    const grace = await signedInAgent(app, "grace@example.com");
    const graceRoom = await grace
      .post("/rooms")
      .send({ name: "Grace Room" })
      .expect(201);

    const response = await ada
      .patch(`/rooms/${graceRoom.body.id}`)
      .send({ name: "Hijacked" });

    expect(response.status).toBe(404);

    const stillThere = await grace.get(`/rooms/${graceRoom.body.id}`);
    expect(stillThere.body.name).toBe("Grace Room");
  });
});

describe("DELETE /rooms/:id", () => {
  it("deletes a room so it disappears from the owner's list", async () => {
    const app = buildApp();
    const ada = await signedInAgent(app, "ada@example.com");
    const created = await ada
      .post("/rooms")
      .send({ name: "Doomed Room" })
      .expect(201);

    const response = await ada.delete(`/rooms/${created.body.id}`);

    expect(response.status).toBe(204);

    const list = await ada.get("/rooms");
    expect(list.body).toEqual([]);

    const detail = await ada.get(`/rooms/${created.body.id}`);
    expect(detail.status).toBe(404);
  });

  it("returns 404 when deleting a room owned by someone else", async () => {
    const app = buildApp();
    const ada = await signedInAgent(app, "ada@example.com");
    const grace = await signedInAgent(app, "grace@example.com");
    const graceRoom = await grace
      .post("/rooms")
      .send({ name: "Grace Room" })
      .expect(201);

    const response = await ada.delete(`/rooms/${graceRoom.body.id}`);

    expect(response.status).toBe(404);

    const stillThere = await grace.get(`/rooms/${graceRoom.body.id}`);
    expect(stillThere.status).toBe(200);
  });
});
