import { verifyToken } from "./auth.js";
import { prisma } from "./prisma.js";

export async function requireAuthSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("UNAUTHORIZED"));

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return next(new Error("UNAUTHORIZED"));

    socket.user = { id: user.id, username: user.username };
    next();
  } catch {
    next(new Error("UNAUTHORIZED"));
  }
}
