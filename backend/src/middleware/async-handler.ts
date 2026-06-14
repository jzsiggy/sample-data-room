import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async handler/middleware so a rejected promise is forwarded to
 * Express's error handling instead of hanging the request (Express 4 does not
 * catch async rejections itself).
 */
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
