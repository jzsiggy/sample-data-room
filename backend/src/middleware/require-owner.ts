import { NextFunction, Request, Response } from "express";
import { SID_COOKIE } from "../auth/cookie";
import { prisma } from "../prisma";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ownerId?: string;
    }
  }
}

/**
 * Gate for owner-only routes. Reads the signed `sid` cookie, resolves it to a
 * live (unexpired) session, and attaches the owner id to the request. Responds
 * 401 when there is no valid session.
 */
export async function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const sessionId = req.signedCookies?.[SID_COOKIE] as string | undefined;
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.expiresAt.getTime() < Date.now()) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  req.ownerId = session.ownerId;
  next();
}
