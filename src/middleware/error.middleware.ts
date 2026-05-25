import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../utils/AppError";
import { sendError } from "../utils/sendResponse";




interface DatabaseError extends Error {
  code?: string;
  detail?: string;
}

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message);
  }

  const databaseError = err as DatabaseError;

  if (databaseError.code === "23505") {
    return sendError(
      res,
      StatusCodes.CONFLICT,
      "Duplicate resource",
      databaseError.detail
       );

  }

  if (databaseError.code === "23514") {
    return sendError(
      res,
      StatusCodes.BAD_REQUEST,
      "Database validation failed",
      databaseError.detail
     );

  }

  console.error(err);

   return sendError(
    res,
    StatusCodes.INTERNAL_SERVER_ERROR,
    "Internal server error"
    );



};