import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import type { JwtUserPayload, UserRole } from "../modules/auth/auth.interface";

  const allowedRoles: UserRole[] = ["contributor", "maintainer"];



export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {

  try {
    const authorization = req.headers.authorization;


    if (!authorization) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Authorization token missing");
          }


    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : authorization;

    if (!token) {

      throw new AppError(StatusCodes.UNAUTHORIZED, "Authorization token missing");
               }

    const decoded = jwt.verify(token, env.jwtSecret);

    if (typeof decoded !== "object" || decoded === null) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid token");
    }

      const user = decoded as JwtUserPayload;

    if (!user.id || !user.name || !allowedRoles.includes(user.role)) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid token payload");
    }

    req.user = {

      id: user.id,
      name: user.name,
      role: user.role,

    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      
      next(error);
      return;

     }

    next(new AppError(StatusCodes.UNAUTHORIZED, "Invalid or expired token"));
  }

};