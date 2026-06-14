import { NextFunction, Request, Response } from "express";

/**
 * Terminal error handler. Express recognises it by its four-argument signature
 * and routes forwarded errors here, so unexpected failures return a 500 instead
 * of leaving the request hanging.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // eslint-disable-next-line no-console
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error." });
}
