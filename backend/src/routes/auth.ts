import { Router } from "express";
import {
  SID_COOKIE,
  clearSessionCookie,
  setSessionCookie,
} from "../auth/cookie";
import { hashPassword, verifyPassword } from "../auth/passwords";
import { publicOwner } from "../auth/public-owner";
import { createSession, deleteSession } from "../auth/sessions";
import { asyncHandler } from "../middleware/async-handler";
import { requireOwner } from "../middleware/require-owner";
import { prisma } from "../prisma";

export function authRouter(): Router {
  const router = Router();

  router.post(
    "/auth/register",
    asyncHandler(async (req, res) => {
      const { email, password } = req.body ?? {};

      const existing = await prisma.owner.findUnique({ where: { email } });
      if (existing) {
        res
          .status(409)
          .json({ error: "An account with that email already exists." });
        return;
      }

      const passwordHash = await hashPassword(password);
      const owner = await prisma.owner.create({ data: { email, passwordHash } });
      const session = await createSession(owner.id);
      setSessionCookie(res, session.id);

      res.status(201).json(publicOwner(owner));
    }),
  );

  router.post(
    "/auth/login",
    asyncHandler(async (req, res) => {
      const { email, password } = req.body ?? {};

      const owner = await prisma.owner.findUnique({ where: { email } });
      if (!owner || !(await verifyPassword(password, owner.passwordHash))) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      const session = await createSession(owner.id);
      setSessionCookie(res, session.id);
      res.json(publicOwner(owner));
    }),
  );

  router.post(
    "/auth/logout",
    asyncHandler(async (req, res) => {
      const sessionId = req.signedCookies?.[SID_COOKIE] as string | undefined;
      if (sessionId) {
        await deleteSession(sessionId);
      }
      clearSessionCookie(res);
      res.status(204).end();
    }),
  );

  router.get(
    "/auth/me",
    asyncHandler(requireOwner),
    asyncHandler(async (req, res) => {
      const owner = await prisma.owner.findUniqueOrThrow({
        where: { id: req.ownerId },
      });
      res.json(publicOwner(owner));
    }),
  );

  return router;
}
