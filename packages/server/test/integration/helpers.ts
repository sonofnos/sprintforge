import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

export async function startTestDatabase(): Promise<StartedPostgreSqlContainer> {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  process.env.DATABASE_URL = container.getConnectionUri();
  const { runMigrations } = await import("../../src/db/migrate.js");
  await runMigrations();
  return container;
}

export async function registerAndLogin(
  request: import("supertest").Agent,
  overrides: Partial<{ email: string; password: string; name: string }> = {},
): Promise<{ token: string; userId: string; email: string }> {
  const email = overrides.email ?? `user-${Math.random().toString(36).slice(2)}@sprintforge.test`;
  const password = overrides.password ?? "correct-horse-battery-staple";
  const name = overrides.name ?? "Test User";

  const res = await request.post("/api/auth/register").send({ email, password, name });
  return { token: res.body.token as string, userId: res.body.user.id as string, email };
}
