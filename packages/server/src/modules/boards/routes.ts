import { Router } from "express";
import type { Server } from "socket.io";
import { z } from "zod";
import { db } from "../../db/kysely.js";
import { requireAuth, requireProjectRole, type AuthedRequest } from "../../middleware/auth.js";
import { HttpError } from "../../middleware/errorHandler.js";

export const boardsRouter = Router({ mergeParams: true });
boardsRouter.use(requireAuth);

function io(req: AuthedRequest): Server {
  return req.app.get("io") as Server;
}

boardsRouter.get("/tickets", async (req: AuthedRequest, res) => {
  const { projectId } = req.params;
  if (!(await requireProjectRole(req, res, projectId, ["admin", "member"]))) return;

  const sprintId = typeof req.query.sprintId === "string" ? req.query.sprintId : undefined;

  let query = db.selectFrom("tickets").selectAll().where("project_id", "=", projectId);
  query = sprintId ? query.where("sprint_id", "=", sprintId) : query.where("sprint_id", "is", null);

  const tickets = await query.orderBy("column_id").orderBy("position").execute();
  res.json({ tickets });
});

const createTicketSchema = z.object({
  columnId: z.string().uuid(),
  sprintId: z.string().uuid().optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(10_000).optional(),
  points: z.number().int().min(0).max(100).optional(),
});

boardsRouter.post("/tickets", async (req: AuthedRequest, res) => {
  const { projectId } = req.params;
  if (!(await requireProjectRole(req, res, projectId, ["admin", "member"]))) return;

  const body = createTicketSchema.parse(req.body);

  const column = await db
    .selectFrom("board_columns")
    .selectAll()
    .where("id", "=", body.columnId)
    .where("project_id", "=", projectId)
    .executeTakeFirst();
  if (!column) throw new HttpError(400, "column does not belong to this project");

  const last = await db
    .selectFrom("tickets")
    .select("position")
    .where("column_id", "=", body.columnId)
    .orderBy("position", "desc")
    .executeTakeFirst();

  const ticket = await db
    .insertInto("tickets")
    .values({
      project_id: projectId,
      sprint_id: body.sprintId ?? null,
      column_id: body.columnId,
      title: body.title,
      description: body.description ?? "",
      points: body.points ?? null,
      position: (last?.position ?? 0) + 1,
      created_by: req.user!.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  io(req).to(`project:${projectId}`).emit("ticket:created", ticket);
  res.status(201).json({ ticket });
});

const updateTicketSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(10_000).optional(),
  points: z.number().int().min(0).max(100).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  version: z.number().int().min(1),
});

boardsRouter.patch("/tickets/:ticketId", async (req: AuthedRequest, res) => {
  const { projectId, ticketId } = req.params;
  if (!(await requireProjectRole(req, res, projectId, ["admin", "member"]))) return;

  const body = updateTicketSchema.parse(req.body);
  const { version, ...rest } = body;

  const updates: Record<string, unknown> = {};
  if (rest.title !== undefined) updates.title = rest.title;
  if (rest.description !== undefined) updates.description = rest.description;
  if (rest.points !== undefined) updates.points = rest.points;
  if (rest.assigneeId !== undefined) updates.assignee_id = rest.assigneeId;

  const updated = await db
    .updateTable("tickets")
    .set({ ...updates, version: version + 1, updated_at: new Date().toISOString() })
    .where("id", "=", ticketId)
    .where("project_id", "=", projectId)
    .where("version", "=", version)
    .returningAll()
    .executeTakeFirst();

  if (!updated) {
    const current = await db
      .selectFrom("tickets")
      .selectAll()
      .where("id", "=", ticketId)
      .executeTakeFirst();
    if (!current) throw new HttpError(404, "ticket not found");
    throw new HttpError(409, "ticket was modified by someone else, refresh and retry");
  }

  io(req).to(`project:${projectId}`).emit("ticket:updated", updated);
  res.json({ ticket: updated });
});

// Moving a ticket is the one operation most likely to race: two people drag
// the same card at once. Optimistic locking on `version` means the loser of
// the race gets a 409 instead of silently overwriting the winner's move.
// See docs/adr/0002-optimistic-concurrency-for-ticket-moves.md.
const moveTicketSchema = z.object({
  columnId: z.string().uuid(),
  position: z.number(),
  version: z.number().int().min(1),
});

boardsRouter.post("/tickets/:ticketId/move", async (req: AuthedRequest, res) => {
  const { projectId, ticketId } = req.params;
  if (!(await requireProjectRole(req, res, projectId, ["admin", "member"]))) return;

  const body = moveTicketSchema.parse(req.body);

  const column = await db
    .selectFrom("board_columns")
    .selectAll()
    .where("id", "=", body.columnId)
    .where("project_id", "=", projectId)
    .executeTakeFirst();
  if (!column) throw new HttpError(400, "column does not belong to this project");

  const updated = await db
    .updateTable("tickets")
    .set({
      column_id: body.columnId,
      position: body.position,
      version: body.version + 1,
      completed_at: column.is_done_column ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", ticketId)
    .where("project_id", "=", projectId)
    .where("version", "=", body.version)
    .returningAll()
    .executeTakeFirst();

  if (!updated) {
    throw new HttpError(409, "ticket was moved by someone else, refresh and retry");
  }

  io(req).to(`project:${projectId}`).emit("ticket:moved", updated);
  res.json({ ticket: updated });
});

boardsRouter.delete("/tickets/:ticketId", async (req: AuthedRequest, res) => {
  const { projectId, ticketId } = req.params;
  if (!(await requireProjectRole(req, res, projectId, ["admin"]))) return;

  const deleted = await db
    .deleteFrom("tickets")
    .where("id", "=", ticketId)
    .where("project_id", "=", projectId)
    .returning(["id"])
    .executeTakeFirst();
  if (!deleted) throw new HttpError(404, "ticket not found");

  io(req).to(`project:${projectId}`).emit("ticket:deleted", { id: ticketId });
  res.status(204).send();
});
