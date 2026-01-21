import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware.js";

export const userRouter = express.Router();

userRouter.get("/u/:username", async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: {
      id: true, username: true, displayName: true, bio: true, avatarUrl: true, createdAt: true,
      _count: { select: { followers: true, following: true, posts: true } }
    }
  });
  if (!u) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ user: u });
});

userRouter.patch("/me", requireAuth, async (req, res) => {
  const schema = z.object({
    displayName: z.string().min(1).max(40).optional(),
    bio: z.string().max(160).optional(),
    avatarUrl: z.string().max(500).optional()
  });

  const data = schema.safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: data.data,
    select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true, createdAt: true }
  });

  res.json({ user });
});

userRouter.post("/follow/:userId", requireAuth, async (req, res) => {
  const userId = req.params.userId;
  if (userId === req.user.id) return res.status(400).json({ error: "CANNOT_FOLLOW_SELF" });

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: req.user.id, followingId: userId } },
    update: {},
    create: { followerId: req.user.id, followingId: userId }
  });

  res.json({ ok: true });
});

userRouter.get("/follow/:userId", requireAuth, async (req, res) => {
  const userId = req.params.userId;
  if (userId === req.user.id) return res.json({ following: false });

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: req.user.id, followingId: userId } }
  });

  res.json({ following: Boolean(existing) });
});

userRouter.delete("/follow/:userId", requireAuth, async (req, res) => {
  const userId = req.params.userId;

  await prisma.follow.deleteMany({
    where: { followerId: req.user.id, followingId: userId }
  });

  res.json({ ok: true });
});
