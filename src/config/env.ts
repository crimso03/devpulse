import dotenv from "dotenv";

dotenv.config();


 export const env = {
  port: process.env.PORT || "5000",

  databaseUrl: process.env.DATABASE_URL || "",

  jwtSecret: process.env.JWT_SECRET || "",

  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),

  nodeEnv: process.env.NODE_ENV || "development",


};

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is missing");

  }

if (!env.jwtSecret) {
  throw new Error("JWT_SECRET is missing");

   }

if (env.bcryptSaltRounds < 8 || env.bcryptSaltRounds > 12) {
  throw new Error("BCRYPT_SALT_ROUNDS must be between 8 and 12");


  }