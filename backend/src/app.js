import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { notFound, errorHandler } from "./middleware/error.js";
import apiRoutes from "./routes/api.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost",
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use("/api", apiRoutes);
app.get("/", (_req, res) => {
  res.redirect(process.env.FRONTEND_URL || "http://localhost:5173");
});
app.get("/health", (_req, res) => {
  res.json({ status: "ok", api: "/api" });
});
app.use(notFound);
app.use(errorHandler);
export default app;
