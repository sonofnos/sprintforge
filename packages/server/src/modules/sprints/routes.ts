import { Router } from "express";
import { z } from "zod";
import { sql } from "kysely";
import { db } from "../../db/kysely.js";
import { requireAuth, requireProjectRole, type AuthedRequest } from "../../middleware/auth.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { computeBurndownSeries } from "./burndown.js";

export const sprintsRouter = Router({ mergeParams: true });
sprintsRouter.use(requireAuth);

const createSprintSchema = z.object({
  name: z.string().min(1).max(200),
  goal: z.string().max(2000).optional(),
  startsOn: z.string().date(),
  endsOn: z.string().date(),
});

sprintsRouter.post("/", async (req: AuthedRequest, res) => {
  const { projectId } = req.params;
  if (!(await requireProjectRole(req, res, projectId, ["admin", "member"]))) return;

  const body = createSprintSchema.parse(req.body);
  if (body.endsOn < body.startsOn) {
    throw new HttpError(400, "endsOn must not be before startsOn");
  }

  const sprint = await db
    .insertInto("sprints")
    .values({
      project_id: projectId,
      name: body.name,
      goal: body.goal ?? null,
      starts_on: body.startsOn,
      ends_on: body.endsOn,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  res.status(201).json({ sprint });
});

sprintsRouter.get("/", async (req: AuthedRequest, res) => {
  const { projectId } = req.params;
  if (!(await requireProjectRole(req, res, projectId, ["admin", "member"]))) return;

  const sprints = await db
    .selectFrom("sprints")
    .selectAll()
    .where("project_id", "=", projectId)
    .orderBy("starts_on", "desc")
    .execute();

  res.json({ sprints });
});

sprintsRouter.post("/:sprintId/activate", async (req: AuthedRequest, res) => {
  const { projectId, sprintId } = req.params;
  if (!(await requireProjectRole(req, res, projectId, ["admin"]))) return;

  const sprint = await db
    .updateTable("sprints")
    .set({ status: "active" })
    .where("id", "=", sprintId)
    .where("project_id", "=", projectId)
    .returningAll()
    .executeTakeFirst();
  if (!sprint) throw new HttpError(404, "sprint not found");

  res.json({ sprint });
});

// Burndown: ideal linear line vs actual remaining story points, one row per day
// of the sprint. Actual remaining on day D = total points - points completed
// on or before D (completed_at truncated to date).
sprintsRouter.get("/:sprintId/burndown", async (req: AuthedRequest, res) => {
  const { projectId, sprintId } = req.params;
  if (!(await requireProjectRole(req, res, projectId, ["admin", "member"]))) return;

  const sprint = await db
    .selectFrom("sprints")
    .selectAll()
    .where("id", "=", sprintId)
    .where("project_id", "=", projectId)
    .executeTakeFirst();
  if (!sprint) throw new HttpError(404, "sprint not found");

  const totals = await db
    .selectFrom("tickets")
    .select(sql<number>`coalesce(sum(points), 0)`.as("totalPoints"))
    .where("sprint_id", "=", sprintId)
    .executeTakeFirstOrThrow();

  const totalPoints = Number(totals.totalPoints);

  // pg returns `date` columns as JS Date (UTC midnight), not a string, so
  // normalize both ends to yyyy-mm-dd before driving the loop off them.
  const toIsoDate = (value: Date | string): string =>
    value instanceof Date ? value.toISOString().slice(0, 10) : value;
  const startsOn = toIsoDate(sprint.starts_on);
  const endsOn = toIsoDate(sprint.ends_on);

  const days: string[] = [];
  for (let d = new Date(`${startsOn}T00:00:00Z`); ; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
    if (days[days.length - 1] === endsOn) break;
  }

  const completedByDay = await db
    .selectFrom("tickets")
    .select([
      sql<string>`to_char(completed_at, 'YYYY-MM-DD')`.as("day"),
      sql<number>`coalesce(sum(points), 0)`.as("points"),
    ])
    .where("sprint_id", "=", sprintId)
    .where("completed_at", "is not", null)
    .groupBy(sql`to_char(completed_at, 'YYYY-MM-DD')`)
    .execute();

  const completedMap = new Map(completedByDay.map((row) => [row.day, Number(row.points)]));
  const series = computeBurndownSeries(days, totalPoints, completedMap);

  res.json({ sprintId, totalPoints, series });
});
