import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendError } from "../utils/sendResponse";

export const notFoundMiddleware = (req: Request, res: Response) => {
  return sendError(
    res,
    StatusCodes.NOT_FOUND,
    `Route ${req.originalUrl} not found`
  );
};