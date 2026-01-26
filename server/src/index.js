import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";

import { prisma } from "./prisma.js";
import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/user.js";
import { postRouter } from "./routes/posts.js";
import { requireAuthSocket } from "./socketAuth.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true
  }
});

app.set("io", io);

const uploadDir = process.env.UPLOAD_DIR || "uploads";
const baseDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const uploadPath = path.resolve(baseDir, uploadDir);
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 180
  })
);

app.use(`/${uploadDir}`, express.static(uploadPath));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/posts", postRouter);

io.use(requireAuthSocket);

io.on("connection", (socket) => {
  // user rooms
  socket.join(`user:${socket.user.id}`);

  socket.on("disconnect", () => {});
});

const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
