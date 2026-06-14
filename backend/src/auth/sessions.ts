import { randomBytes } from "node:crypto";
import { Session } from "@prisma/client";
import { prisma } from "../prisma";

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

/** Creates a session with a cryptographically random id (the cookie value). */
export function createSession(ownerId: string): Promise<Session> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  return prisma.session.create({ data: { id, ownerId, expiresAt } });
}

export function deleteSession(id: string): Promise<unknown> {
  return prisma.session.deleteMany({ where: { id } });
}
