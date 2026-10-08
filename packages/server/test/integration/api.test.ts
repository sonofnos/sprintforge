import { afterAll, beforeAll, describe, expect, it } from "vitest";
import supertest from "supertest";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { startTestDatabase, registerAndLogin } from "./helpers.js";

let container: StartedPostgreSqlContainer;
let request: ReturnType<typeof supertest>;
let db: typeof import("../../src/db/kysely.js")["db"];

beforeAll(async () => {
  container = await startTestDatabase();
  const { createApp } = await import("../../src/app.js");
  ({ db } = await import("../../src/db/kysely.js"));
  request = supertest(createApp());
}, 90_000);

afterAll(async () => {
  await db.destroy();
  await container.stop();
});

describe("auth", () => {
  it("rejects a login with the wrong password", async () => {
    const { email } = await registerAndLogin(request, { password: "right-password-123" });
    const res = await request.post("/api/auth/login").send({ email, password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("rejects a duplicate registration", async () => {
    const email = "dup@sprintforge.test";
    await request.post("/api/auth/register").send({ email, password: "password123", name: "A" });
    const res = await request
      .post("/api/auth/register")
      .send({ email, password: "password123", name: "A" });
    expect(res.status).toBe(409);
  });
});

describe("project lifecycle", () => {
  it("creates a project with seeded board columns, a sprint, and a ticket you can move", async () => {
    const { token } = await registerAndLogin(request);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request
      .post("/api/projects")
      .set(auth)
      .send({ key: "ENG", name: "Engineering" });
    expect(created.status).toBe(201);
    const projectId = created.body.project.id as string;

    const detail = await request.get(`/api/projects/${projectId}`).set(auth);
    expect(detail.body.columns).toHaveLength(4);
    const [backlog, , , done] = detail.body.columns;
    expect(backlog.name).toBe("Backlog");
    expect(done.is_done_column).toBe(true);

    const sprint = await request
      .post(`/api/projects/${projectId}/sprints`)
      .set(auth)
      .send({ name: "Sprint 1", startsOn: "2026-01-01", endsOn: "2026-01-14" });
    expect(sprint.status).toBe(201);

    const ticket = await request
      .post(`/api/projects/${projectId}/tickets`)
      .set(auth)
      .send({ columnId: backlog.id, sprintId: sprint.body.sprint.id, title: "Wire up CI", points: 3 });
    expect(ticket.status).toBe(201);
    expect(ticket.body.ticket.version).toBe(1);

    const moved = await request
      .post(`/api/projects/${projectId}/tickets/${ticket.body.ticket.id}/move`)
      .set(auth)
      .send({ columnId: done.id, position: 1, version: 1 });
    expect(moved.status).toBe(200);
    expect(moved.body.ticket.column_id).toBe(done.id);
    expect(moved.body.ticket.completed_at).not.toBeNull();

    const burndown = await request
      .get(`/api/projects/${projectId}/sprints/${sprint.body.sprint.id}/burndown`)
      .set(auth);
    expect(burndown.status).toBe(200);
    expect(burndown.body.totalPoints).toBe(3);
  });

  it("rejects a move with a stale version instead of silently overwriting", async () => {
    const { token } = await registerAndLogin(request);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request
      .post("/api/projects")
      .set(auth)
      .send({ key: "STL", name: "Stale version project" });
    const projectId = created.body.project.id as string;
    const detail = await request.get(`/api/projects/${projectId}`).set(auth);
    const [backlog, inProgress] = detail.body.columns;

    const ticket = await request
      .post(`/api/projects/${projectId}/tickets`)
      .set(auth)
      .send({ columnId: backlog.id, title: "Race me" });

    const firstMove = await request
      .post(`/api/projects/${projectId}/tickets/${ticket.body.ticket.id}/move`)
      .set(auth)
      .send({ columnId: inProgress.id, position: 1, version: 1 });
    expect(firstMove.status).toBe(200);

    const staleMove = await request
      .post(`/api/projects/${projectId}/tickets/${ticket.body.ticket.id}/move`)
      .set(auth)
      .send({ columnId: backlog.id, position: 2, version: 1 });
    expect(staleMove.status).toBe(409);
  });

  it("blocks a non-member from reading a project's board", async () => {
    const owner = await registerAndLogin(request);
    const stranger = await registerAndLogin(request);

    const created = await request
      .post("/api/projects")
      .set({ Authorization: `Bearer ${owner.token}` })
      .send({ key: "PRV", name: "Private" });
    const projectId = created.body.project.id as string;

    const res = await request
      .get(`/api/projects/${projectId}`)
      .set({ Authorization: `Bearer ${stranger.token}` });
    expect(res.status).toBe(403);
  });
});
