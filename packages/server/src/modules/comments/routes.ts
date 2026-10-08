import { Router } from "express";
import type { Server } from "socket.io";
import { z } from "zod";
import { db } from "../../db/kysely.js";
import { requireAuth, requireProjectRole, type AuthedRequest } from "../../middleware/auth.js";
import { HttpError } from "../../middleware/errorHandler.js";

export const commentsRouter = Router({ mergeParams: true });
commentsRouter.use(requireAuth);

commentsRouter.get("/tickets/:ticketId/comments", async (req: AuthedRequest, res) => {
  const { projectId, ticketId } = req.params;
  if (!(await requireProjectRole(req, res, projectId, ["admin", "member"]))) return;

  const comments = await db
    .selectFrom("comments")
    .innerJoin("users", "users.id", "comments.author_id")
    .select([
      "comments.id",
      "comments.body",
      "comments.created_at",
      "users.id as authorId",
      "users.name as authorName",
    ])
    .where("comments.ticket_id", "=", ticketId)
    .orderBy("comments.created_at")
    .execute();

  res.json({ comments });
});

const createCommentSchema = z.object({ body: z.string().min(1).max(5000) });

commentsRouter.post("/tickets/:ticketId/comments", async (req: AuthedRequest, res) => {
  const { projectId, ticketId } = req.params;
  if (!(await requireProjectRole(req, res, projectId, ["admin", "member"]))) return;

  const ticket = await db
    .selectFrom("tickets")
    .select("id")
    .where("id", "=", ticketId)
    .where("project_id", "=", projectId)
    .executeTakeFirst();
  if (!ticket) throw new HttpError(404, "ticket not found");

  const body = createCommentSchema.parse(req.body);
  const comment = await db
    .insertInto("comments")
    .values({ ticket_id: ticketId, author_id: req.user!.id, body: body.body })
    .returningAll()
    .executeTakeFirstOrThrow();

  (req.app.get("io") as Server)
    .to(`project:${projectId}`)
    .emit("comment:created", { ticketId, comment });

  res.status(201).json({ comment });
});
