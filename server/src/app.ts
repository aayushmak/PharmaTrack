import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { requireAuth } from "./middleware/auth";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check — no auth.
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "pharmatrack-api" });
  });

  // Auth routes.
  app.use("/api/auth", authRouter);

  // Example of a protected placeholder. Feature routers (inventory, sales,
  // prescriptions, reports) get mounted here in later phases, behind requireAuth.
  app.get("/api/protected/ping", requireAuth, (req, res) => {
    res.json({ message: `Hello ${req.user!.username}`, role: req.user!.role });
  });

  // 404 fallback.
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}