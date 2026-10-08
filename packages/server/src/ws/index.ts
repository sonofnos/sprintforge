import { Server, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import type { JwtPayload } from "../middleware/auth.js";
import { db } from "../db/kysely.js";

interface AuthedSocket extends Socket {
  userId?: string;
}

// Built without an http.Server attached so createApp() can always set up an
// `io` instance (needed by every route that emits an event), including in
// tests that exercise the Express app directly via supertest without ever
// starting a real server. index.ts calls `io.attach(httpServer)` once a real
// server exists; emitting to an unattached io is a safe no-op (no sockets to
// reach yet) rather than a crash.
export function createSocketServer(): Server {
  const io = new Server({
    cors: { origin: env.corsOrigin },
  });

  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("missing token"));
    try {
      const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error("invalid token"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    socket.on("project:join", async (projectId: string) => {
      const member = await db
        .selectFrom("project_members")
        .select("user_id")
        .where("project_id", "=", projectId)
        .where("user_id", "=", socket.userId!)
        .executeTakeFirst();
      if (!member) return;
      socket.join(`project:${projectId}`);
    });
    socket.on("project:leave", (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });
  });

  return io;
}
