import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/kysely.js";
import { requireAuth, requireProjectRole, type AuthedRequest } from "../../middleware/auth.js";
import { HttpError } from "../../middleware/errorHandler.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const DEFAULT_COLUMNS = ["Backlog", "In Progress", "Review", "Done"];

const createProjectSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9]+$/, "key must be upper-case letters/digits, e.g. ENG"),
  name: z.string().min(1).max(200),
});

projectsRouter.post("/", async (req: AuthedRequest, res) => {
  const body = createProjectSchema.parse(req.body);
  const userId = req.user!.id;

  const existing = await db
    .selectFrom("projects")
    .select("id")
    .where("key", "=", body.key)
    .executeTakeFirst();
  if (existing) {
    throw new HttpError(409, "a project with this key already exists");
  }

  const project = await db.transaction().execute(async (trx) => {
    const created = await trx
      .insertInto("projects")
      .values({ key: body.key, name: body.name, created_by: userId })
      .returningAll()
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("project_members")
      .values({ project_id: created.id, user_id: userId, role: "admin" })
      .execute();

    await trx
      .insertInto("board_columns")
      .values(
        DEFAULT_COLUMNS.map((name, position) => ({
          project_id: created.id,
          name,
          position,
          is_done_column: name === "Done",
        })),
      )
      .execute();

    return created;
  });

  res.status(201).json({ project });
});

projectsRouter.get("/", async (req: AuthedRequest, res) => {
  const projects = await db
    .selectFrom("projects")
    .innerJoin("project_members", "project_members.project_id", "projects.id")
    .select(["projects.id", "projects.key", "projects.name", "project_members.role"])
    .where("project_members.user_id", "=", req.user!.id)
    .orderBy("projects.created_at", "desc")
    .execute();
  res.json({ projects });
});

projectsRouter.get("/:projectId", async (req: AuthedRequest, res) => {
  const { projectId } = req.params;
  if (!(await requireProjectRole(req, res, projectId, ["admin", "member"]))) return;

  const project = await db
    .selectFrom("projects")
    .selectAll()
    .where("id", "=", projectId)
    .executeTakeFirst();
  if (!project) throw new HttpError(404, "project not found");

  const columns = await db
    .selectFrom("board_columns")
    .selectAll()
    .where("project_id", "=", projectId)
    .orderBy("position")
    .execute();

  const members = await db
    .selectFrom("project_members")
    .innerJoin("users", "users.id", "project_members.user_id")
    .select(["users.id", "users.name", "users.email", "project_members.role"])
    .where("project_members.project_id", "=", projectId)
    .execute();

  res.json({ project, columns, members });
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

projectsRouter.post("/:projectId/members", async (req: AuthedRequest, res) => {
  const { projectId } = req.params;
  if (!(await requireProjectRole(req, res, projectId, ["admin"]))) return;

  const body = inviteSchema.parse(req.body);
  const user = await db
    .selectFrom("users")
    .select("id")
    .where("email", "=", body.email)
    .executeTakeFirst();
  if (!user) throw new HttpError(404, "no user with that email");

  await db
    .insertInto("project_members")
    .values({ project_id: projectId, user_id: user.id, role: body.role })
    .onConflict((oc) => oc.columns(["project_id", "user_id"]).doUpdateSet({ role: body.role }))
    .execute();

  res.status(204).send();
});
