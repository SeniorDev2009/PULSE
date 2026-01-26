import express from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware.js";

export const postRouter = express.Router();

const uploadDir = process.env.UPLOAD_DIR || "uploads";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, "..");
const uploadPath = path.resolve(baseDir, uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.mimetype);
    cb(ok ? null : new Error("INVALID_FILE"), ok);
  }
});

postRouter.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  res.json({ url: `/${uploadDir}/${req.file.filename}` });
});

/**
 * FOLLOWING FEED (hozirgi feed)
 * - faqat o'zingiz + follow qilganlar postlari
 */
postRouter.get("/feed", requireAuth, async (req, res) => {
  const cursor = req.query.cursor?.toString();
  const take = 20;

  const following = await prisma.follow.findMany({
    where: { followerId: req.user.id },
    select: { followingId: true }
  });
  const authorIds = [req.user.id, ...following.map((x) => x.followingId)];

  const now = new Date();

  const posts = await prisma.post.findMany({
    where: {
      authorId: { in: authorIds },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      content: true,
      mediaUrl: true,
      type: true,
      expiresAt: true,
      createdAt: true,
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, replies: true } },
      likes: { where: { userId: req.user.id }, select: { id: true } }
    }
  });

  let nextCursor = null;
  if (posts.length > take) {
    const next = posts.pop();
    nextCursor = next.id;
  }

  res.json({
    items: posts.map((p) => ({ ...p, likedByMe: p.likes.length > 0, likes: undefined })),
    nextCursor
  });
});

/**
 * EXPLORE / GLOBAL FEED
 * - hamma postlar (Pulse expire bo'lmaganlari)
 * - Twitter'dagi "For you / Explore" kabi
 */
postRouter.get("/explore", requireAuth, async (req, res) => {
  const cursor = req.query.cursor?.toString();
  const take = 20;

  const now = new Date();

  const posts = await prisma.post.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      content: true,
      mediaUrl: true,
      type: true,
      expiresAt: true,
      createdAt: true,
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, replies: true } },
      likes: { where: { userId: req.user.id }, select: { id: true } }
    }
  });

  let nextCursor = null;
  if (posts.length > take) {
    const next = posts.pop();
    nextCursor = next.id;
  }

  res.json({
    items: posts.map((p) => ({ ...p, likedByMe: p.likes.length > 0, likes: undefined })),
    nextCursor
  });
});

postRouter.post("/", requireAuth, async (req, res) => {
  const schema = z.object({
    content: z.string().min(1).max(500),
    mediaUrl: z.string().max(500).optional().default(""),
    type: z.enum(["POST", "PULSE"]).default("POST")
  });

  const data = schema.safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const expiresAt =
    data.data.type === "PULSE" ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

  const post = await prisma.post.create({
    data: {
      authorId: req.user.id,
      content: data.data.content,
      mediaUrl: data.data.mediaUrl ?? "",
      type: data.data.type,
      expiresAt
    },
    select: {
      id: true,
      content: true,
      mediaUrl: true,
      type: true,
      expiresAt: true,
      createdAt: true,
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, replies: true } }
    }
  });

  // realtime (hozircha faqat o'z room'iga)
  req.app.get("io")?.to(`user:${req.user.id}`).emit("post:new", post);

  res.json({ post });
});

postRouter.post("/:id/like", requireAuth, async (req, res) => {
  const postId = req.params.id;

  await prisma.like.upsert({
    where: { postId_userId: { postId, userId: req.user.id } },
    update: {},
    create: { postId, userId: req.user.id }
  });

  const count = await prisma.like.count({ where: { postId } });
  res.json({ ok: true, likes: count });
});

postRouter.delete("/:id/like", requireAuth, async (req, res) => {
  const postId = req.params.id;

  await prisma.like.deleteMany({ where: { postId, userId: req.user.id } });
  const count = await prisma.like.count({ where: { postId } });
  res.json({ ok: true, likes: count });
});

postRouter.post("/:id/reply", requireAuth, async (req, res) => {
  const schema = z.object({ content: z.string().min(1).max(300) });
  const data = schema.safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const reply = await prisma.reply.create({
    data: { postId: req.params.id, authorId: req.user.id, content: data.data.content },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
    }
  });

  res.json({ reply });
});

postRouter.get("/:id/replies", requireAuth, async (req, res) => {
  const replies = await prisma.reply.findMany({
    where: { postId: req.params.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
    }
  });

  res.json({ replies });
});
