import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { pool } from "../../config/db.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import type {
  JwtUserPayload,
  LoginBody,
  PublicUser,
  SignupBody,
  User,
  UserRole,
} from "./auth.interface.js";

const allowedRoles: UserRole[] = ["contributor", "maintainer"];

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const toPublicUser = (user: User): PublicUser => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
};

export const signupService = async (
  payload: SignupBody
): Promise<PublicUser> => {
  const { name, email, password, role } = payload;

  if (!name || typeof name !== "string" || !name.trim()) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Name is required");
  }

  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Valid email is required");
  }

  if (!password || typeof password !== "string") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Password is required");
  }

  const selectedRole: UserRole = role || "contributor";

  if (!allowedRoles.includes(selectedRole)) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Role must be contributor or maintainer"
    );
  }

  const existingUser = await pool.query<{ id: number }>(
    "SELECT id FROM users WHERE email = $1",
    [email.toLowerCase()]
  );

  if ((existingUser.rowCount || 0) > 0) {
    throw new AppError(StatusCodes.CONFLICT, "Email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, env.bcryptSaltRounds);

  const result = await pool.query<PublicUser>(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at, updated_at`,
    [name.trim(), email.toLowerCase(), hashedPassword, selectedRole]
  );

  const createdUser = result.rows[0];

  if (!createdUser) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "User registration failed"
    );
  }

  return createdUser;
};

export const loginService = async (
  payload: LoginBody
): Promise<{ token: string; user: PublicUser }> => {
  const { email, password } = payload;

  if (!email || typeof email !== "string") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Email is required");
  }

  if (!password || typeof password !== "string") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Password is required");
  }

  const result = await pool.query<User>("SELECT * FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);

  const user = result.rows[0];

  if (!user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  const tokenPayload: JwtUserPayload = {
    id: user.id,
    name: user.name,
    role: user.role,
  };

  const signOptions = {
  expiresIn: env.jwtExpiresIn,
} as SignOptions;

  const token = jwt.sign(tokenPayload, env.jwtSecret, signOptions);

  return {
    token,
    user: toPublicUser(user),
  };
};