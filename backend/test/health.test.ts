import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { FakeStorageService } from "../src/storage/fake-storage-service";

describe("GET /health", () => {
  it("reports the service is alive", async () => {
    const app = createApp({ storage: new FakeStorageService() });

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("GET /health/ready", () => {
  it("reports the database is reachable", async () => {
    const app = createApp({ storage: new FakeStorageService() });

    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ db: "ok" });
  });
});
