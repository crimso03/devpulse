import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/sendResponse";
import { loginService, signupService } from "./auth.service";
import type { LoginBody, SignupBody } from "./auth.interface";

export const signup = catchAsync(async (req: Request, res: Response) => {
  const user = await signupService(req.body as SignupBody);

  return sendSuccess(
    res,
    StatusCodes.CREATED,
    "User registered successfully",
    user
  );
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const loginData = await loginService(req.body as LoginBody);

  return sendSuccess(res, StatusCodes.OK, "Login successful", loginData);
});