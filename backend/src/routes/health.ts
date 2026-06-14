import { Router } from "express";
import { prisma } from "../prisma";

export function healthRouter(): Router {
  const router = Router();

  // Liveness: the process is up and serving. No external dependencies, so the
  // frontend can call it cheaply.
  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Readiness: the database is reachable. Runs a trivial query so a green
  // result genuinely proves connectivity.
  router.get("/health/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ db: "ok" });
    } catch {
      res.status(503).json({ db: "down" });
    }
  });

  return router;
}
