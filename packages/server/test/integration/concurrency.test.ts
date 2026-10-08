import { afterAll, beforeAll, describe, expect, it } from "vitest";
import supertest from "supertest";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { startTestDatabase, registerAndLogin } from "./helpers.js";

// The real-world scenario this guards against: two people drag the same
// sprint card at the same instant. Without optimistic locking, "last write
// wins" silently drops one person's move with no error to either client.
// Here both requests race in parallel against the real database (not
// sequential awaits) and we assert exactly one of them wins.
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

describe("concurrent ticket moves", () => {
  it("lets exactly one of two simultaneous moves win, the other gets 409", async () => {
    const { token } = await registerAndLogin(request);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request
      .post("/api/projects")
      .set(auth)
      .send({ key: "RACE", name: "Race condition project" });
    const projectId = created.body.project.id as string;
    const detail = await request.get(`/api/projects/${projectId}`).set(auth);
    const [backlog, inProgress, review] = detail.body.columns;

    const ticket = await request
      .post(`/api/projects/${projectId}/tickets`)
      .set(auth)
      .send({ columnId: backlog.id, title: "Contested card" });
    const ticketId = ticket.body.ticket.id as string;

    const moveToInProgress = request
      .post(`/api/projects/${projectId}/tickets/${ticketId}/move`)
      .set(auth)
      .send({ columnId: inProgress.id, position: 1, version: 1 });
    const moveToReview = request
      .post(`/api/projects/${projectId}/tickets/${ticketId}/move`)
      .set(auth)
      .send({ columnId: review.id, position: 1, version: 1 });

    const [resA, resB] = await Promise.all([moveToInProgress, moveToReview]);
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const winner = resA.status === 200 ? resA : resB;
    const final = await db
      .selectFrom("tickets")
      .selectAll()
      .where("id", "=", ticketId)
      .executeTakeFirstOrThrow();

    // The DB's final state must match whichever response actually won — not
    // "a" column, not the loser's column, and version incremented exactly
    // once (not twice, which would mean both writes partially applied).
    expect(final.column_id).toBe(winner.body.ticket.column_id);
    expect(final.version).toBe(2);
  });

  it("survives ten concurrent moves on the same ticket with no lost or duplicated version", async () => {
    const { token } = await registerAndLogin(request);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request
      .post("/api/projects")
      .set(auth)
      .send({ key: "RACE10", name: "Ten-way race" });
    const projectId = created.body.project.id as string;
    const detail = await request.get(`/api/projects/${projectId}`).set(auth);
    const columns = detail.body.columns as Array<{ id: string }>;

    const ticket = await request
      .post(`/api/projects/${projectId}/tickets`)
      .set(auth)
      .send({ columnId: columns[0].id, title: "Ten-way contested card" });
    const ticketId = ticket.body.ticket.id as string;

    // Ten genuinely separate requests (not ten references to the same
    // promise) cycling through the four real columns.
    const allAttempts = Array.from({ length: 10 }, (_, i) =>
      request
        .post(`/api/projects/${projectId}/tickets/${ticketId}/move`)
        .set(auth)
        .send({ columnId: columns[i % columns.length].id, position: i, version: 1 }),
    );

    const results = await Promise.all(allAttempts);
    const wins = results.filter((r) => r.status === 200);
    const conflicts = results.filter((r) => r.status === 409);

    expect(wins).toHaveLength(1);
    expect(conflicts).toHaveLength(9);

    const final = await db
      .selectFrom("tickets")
      .selectAll()
      .where("id", "=", ticketId)
      .executeTakeFirstOrThrow();
    expect(final.version).toBe(2);
  });
});
