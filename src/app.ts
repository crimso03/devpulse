import express, { type Application, type Request, type Response } from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import issueRoutes from "./modules/issues/issue.routes";
import { notFoundMiddleware } from "./middleware/notFound.middleware";
import { errorMiddleware } from "./middleware/error.middleware";



const app: Application = express();

app.use(cors());
app.use(express.json());


app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "DevPulse API running",

  });


});

app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;