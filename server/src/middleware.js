import { verifyToken } from "./auth.js";
import { prisma } from "./prisma.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : "");
    if (!token) return res.status(401).json({ error: "UNAUTHORIZED" });

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: "UNAUTHORIZED" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
}
