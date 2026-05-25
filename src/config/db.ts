
import pg from "pg";
import { env } from "./env";

const { Pool } = pg;


   export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },

});



export const connectDatabase = async (): Promise<void> => {
  const client = await pool.connect();


   try {
    await client.query("SELECT NOW()");
    console.log("Database connected successfully");
  } finally {
    client.release();
  }


};