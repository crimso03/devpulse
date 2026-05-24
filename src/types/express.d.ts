import type { JwtUserPayload } from "../modules/auth/auth.interface";

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export {};