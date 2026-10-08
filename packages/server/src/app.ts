import "express-async-errors";
import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { authRouter } from "./modules/auth/routes.js";
import { projectsRouter } from "./modules/projects/routes.js";
import { sprintsRouter } from "./modules/sprints/routes.js";
import { boardsRouter } from "./modules/boards/routes.js";
import { commentsRouter } from "./modules/comments/routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createSocketServer } from "./ws/index.js";
import { env } from "./env.js";

export function createApp(): express.Express {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(pinoHttp({ redact: ["req.headers.authorization"] }));

  app.set("io", createSocketServer());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/projects/:projectId/sprints", sprintsRouter);
  app.use("/api/projects/:projectId", boardsRouter);
  app.use("/api/projects/:projectId", commentsRouter);

  app.use(errorHandler);

  return app;
}
