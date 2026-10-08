import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../../db/kysely.js";
import { signToken, requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { HttpError } from "../../middleware/errorHandler.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

authRouter.post("/register", async (req, res) => {
  const body = registerSchema.parse(req.body);

  const existing = await db
    .selectFrom("users")
    .select("id")
    .where("email", "=", body.email)
    .executeTakeFirst();
  if (existing) {
    throw new HttpError(409, "email already registered");
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await db
    .insertInto("users")
    .values({ email: body.email, password_hash: passwordHash, name: body.name })
    .returning(["id", "email", "name"])
    .executeTakeFirstOrThrow();

  const token = signToken({ sub: user.id, email: user.email });
  res.status(201).json({ token, user });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const body = loginSchema.parse(req.body);

  const user = await db
    .selectFrom("users")
    .select(["id", "email", "name", "password_hash"])
    .where("email", "=", body.email)
    .executeTakeFirst();

  if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
    throw new HttpError(401, "invalid email or password");
  }

  const token = signToken({ sub: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await db
    .selectFrom("users")
    .select(["id", "email", "name"])
    .where("id", "=", req.user!.id)
    .executeTakeFirstOrThrow();
  res.json({ user });
});
