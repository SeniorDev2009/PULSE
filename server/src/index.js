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
app.set("trust proxy", 1); // ✅ Render/Cloudflare ortida ishlashi uchun
const server = http.createServer(app);

// ✅ multiple origins (comma-separated)
const allowedOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // Postman/curl yoki server-to-server so‘rovlar uchun
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const io = new Server(server, { cors: corsOptions });
app.set("io", io);

const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // ✅ preflight
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 180,
  })
);

app.use(`/${uploadDir}`, express.static(path.resolve(uploadDir)));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/posts", postRouter);

io.use(requireAuthSocket);

io.on("connection", (socket) => {
  socket.join(`user:${socket.user.id}`);
  socket.on("disconnect", () => {});
});

const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
