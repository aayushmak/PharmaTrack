import { Request, RequestHandler, Response, NextFunction } from "express";

//Wrap asn async route handler so any thrown error (or rejected promise) is forwarded to Express's error middleware instead of crashing the process.
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}