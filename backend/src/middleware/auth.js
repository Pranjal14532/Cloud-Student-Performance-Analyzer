import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "development-jwt-secret-change-me");
    next();
  } catch {
    res.status(401).json({ message: "Session expired or invalid" });
  }
}

export function admin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Administrator access required" });
  next();
}
