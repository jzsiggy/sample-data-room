import request from "supertest";
import { describe, expect, it } from "vitest";
import { verifyPassword } from "../src/auth/passwords";
import { createApp } from "../src/app";
import { prisma } from "../src/prisma";
import { FakeStorageService } from "../src/storage/fake-storage-service";

function buildApp() {
  return createApp({ storage: new FakeStorageService() });
}

describe("POST /auth/register", () => {
  it("creates an owner, returns it, and starts a session", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/auth/register")
      .send({ email: "ada@example.com", password: "correct horse battery" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ email: "ada@example.com" });
    expect(response.body.id).toBeTruthy();
    expect(response.body.passwordHash).toBeUndefined();

    // A session cookie is set so the owner is immediately signed in.
    expect(String(response.headers["set-cookie"])).toContain("sid=");
  });

  it("rejects an email that is already registered", async () => {
    const app = buildApp();
    await request(app)
      .post("/auth/register")
      .send({ email: "dup@example.com", password: "first password" })
      .expect(201);

    const response = await request(app)
      .post("/auth/register")
      .send({ email: "dup@example.com", password: "second password" });

    expect(response.status).toBe(409);
    expect(response.body.error).toBeTruthy();
  });

  // White-box security guard: hashing isn't observable through the API, so this
  // reads the persisted row directly to ensure we never store the plaintext.
  it("stores the password as a verifiable hash, never the plaintext", async () => {
    const app = buildApp();
    const password = "super secret password";
    await request(app)
      .post("/auth/register")
      .send({ email: "hash@example.com", password })
      .expect(201);

    const owner = await prisma.owner.findUniqueOrThrow({
      where: { email: "hash@example.com" },
    });
    expect(owner.passwordHash).not.toBe(password);
    expect(owner.passwordHash).not.toContain(password);
    expect(await verifyPassword(password, owner.passwordHash)).toBe(true);
  });
});

describe("GET /auth/me", () => {
  it("returns the current owner when signed in", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await agent
      .post("/auth/register")
      .send({ email: "me@example.com", password: "a good password" })
      .expect(201);

    const response = await agent.get("/auth/me");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ email: "me@example.com" });
  });

  it("returns 401 when there is no session", async () => {
    const app = buildApp();

    const response = await request(app).get("/auth/me");

    expect(response.status).toBe(401);
  });
});

describe("POST /auth/login", () => {
  it("signs in an existing owner with the correct password", async () => {
    const app = buildApp();
    await request(app)
      .post("/auth/register")
      .send({ email: "log@example.com", password: "the password" })
      .expect(201);

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "log@example.com", password: "the password" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ email: "log@example.com" });
    expect(String(response.headers["set-cookie"])).toContain("sid=");
  });

  it("rejects an existing owner with the wrong password", async () => {
    const app = buildApp();
    await request(app)
      .post("/auth/register")
      .send({ email: "wrong@example.com", password: "right password" })
      .expect(201);

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "wrong@example.com", password: "WRONG password" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBeTruthy();
    expect(response.headers["set-cookie"]).toBeUndefined();
  });
});

describe("POST /auth/logout", () => {
  it("ends the session so the owner is no longer authenticated", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    await agent
      .post("/auth/register")
      .send({ email: "out@example.com", password: "a password" })
      .expect(201);
    await agent.get("/auth/me").expect(200);

    const logout = await agent.post("/auth/logout");
    expect(logout.status).toBe(204);

    const me = await agent.get("/auth/me");
    expect(me.status).toBe(401);
  });
});
