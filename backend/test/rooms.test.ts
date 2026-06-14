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
});
