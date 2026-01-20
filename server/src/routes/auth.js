import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { signToken, setAuthCookie } from "../auth.js";
import { requireAuth } from "../middleware.js";

export const authRouter = express.Router();

authRouter.post("/register", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
    displayName: z.string().min(1).max(40),
    password: z.string().min(8).max(72)
  });

  const data = schema.safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "INVALID_INPUT", details: data.error.flatten() });

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email: data.data.email }, { username: data.data.username }] }
  });
  if (exists) return res.status(409).json({ error: "USER_EXISTS" });

  const passwordHash = await bcrypt.hash(data.data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.data.email,
      username: data.data.username,
      displayName: data.data.displayName,
      passwordHash
    },
    select: { id: true, username: true, displayName: true, email: true, bio: true, avatarUrl: true, createdAt: true }
  });

  const token = signToken({ id: user.id });
  setAuthCookie(res, token);

  res.json({ user, token });
});

authRouter.post("/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1).max(72)
  });

  const data = schema.safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const user = await prisma.user.findUnique({ where: { email: data.data.email } });
  if (!user) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

  const ok = await bcrypt.compare(data.data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

  const token = signToken({ id: user.id });
  setAuthCookie(res, token);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt
    },
    token
  });
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      displayName: req.user.displayName,
      email: req.user.email,
      bio: req.user.bio,
      avatarUrl: req.user.avatarUrl,
      createdAt: req.user.createdAt
    }
  });
});
