import app from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./config/db";

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    app.listen(Number(env.port), () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();