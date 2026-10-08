import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { db } from "../db/kysely.js";

export interface AuthedRequest extends Request {
  user?: { id: string; email: string };
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }
  try {
    const payload = jwt.verify(header.slice("Bearer ".length), env.jwtSecret) as JwtPayload;
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: "invalid or expired token" });
  }
}

export async function requireProjectRole(
  req: AuthedRequest,
  res: Response,
  projectId: string,
  roles: Array<"admin" | "member">,
): Promise<boolean> {
  const member = await db
    .selectFrom("project_members")
    .select("role")
    .where("project_id", "=", projectId)
    .where("user_id", "=", req.user!.id)
    .executeTakeFirst();

  if (!member || !roles.includes(member.role)) {
    res.status(403).json({ error: "not a member of this project with sufficient role" });
    return false;
  }
  return true;
}
