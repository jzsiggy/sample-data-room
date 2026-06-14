import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express } from "express";
import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { roomsRouter } from "./routes/rooms";
import { StorageService } from "./storage/storage-service";

export interface AppDeps {
  /**
   * Injected so tests can supply the in-memory fake. Wired into the rooms
   * router's file upload/download/delete endpoints.
   */
  storage: StorageService;
}

export function createApp(deps: AppDeps): Express {
  const app = express();

  // Credentialed CORS is the foundation for the httpOnly cookie session
  // (ADR-0001): the cookie only flows cross-origin with credentials enabled
  // and a concrete (non-wildcard) origin.
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? true,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser(process.env.COOKIE_SECRET ?? "dev-secret-change-me"));

  app.use(healthRouter());
  app.use(authRouter());
  app.use(roomsRouter(deps.storage));

  app.use(errorHandler);

  return app;
}
