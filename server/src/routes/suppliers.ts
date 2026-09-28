import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { parseEnv } from "util";

export const suppliersRouter = Router()

suppliersRouter.use(requireAuth)

const supplierInput = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
})

// GET /api/suppliers - list all suppliers.
suppliersRouter.get(
  "/",
  asyncHandler( async (req, res) => {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc"},
    })
    res.json({ suppliers})
  })
)

// POST /api/suppliers - add a supplier.
suppliersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = supplierInput.safeParse(req.body)
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid supplier data", details: parsed.error.flatten()})
    }

    const supplier = await prisma.supplier.create({ data: parsed.data})
    res.status(201).json({ supplier})
  })
)