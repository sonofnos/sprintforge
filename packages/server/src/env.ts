import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`missing required env var ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required(
    "DATABASE_URL",
    "postgres://sprintforge:sprintforge@localhost:5436/sprintforge",
  ),
  jwtSecret: required("JWT_SECRET", "dev-only-secret-change-me"),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
