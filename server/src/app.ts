import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { medicinesRouter } from "./routes/medicines";
import { batchesRouter } from "./routes/batches";
import { suppliersRouter } from "./routes/suppliers";

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

  // Inventory (Phase 1). Each router applies requireAuth internally.
  app.use("/api/medicines", medicinesRouter);
  app.use("/api/batches", batchesRouter);
  app.use("/api/suppliers", suppliersRouter);

  // 404 fallback.
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Central error handler — asyncHandler forwards thrown errors here.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  });

  return app;
}