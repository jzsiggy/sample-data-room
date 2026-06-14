import { CookieOptions, Response } from "express";
import { SESSION_TTL_MS } from "./sessions";

export const SID_COOKIE = "sid";

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

export function setSessionCookie(res: Response, sessionId: string): void {
  res.cookie(SID_COOKIE, sessionId, {
    ...baseOptions(),
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SID_COOKIE, baseOptions());
}
