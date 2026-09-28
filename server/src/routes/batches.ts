import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { error } from "console";

export const batchesRouter = Router()

batchesRouter.use(requireAuth)

const receiveInput = z.object({
  medicineId: z.string().uuid(),
  batchNumber: z.string().optional(),
  // Accept an ISO date string like "2027-05-01".
  expiryDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "expiryDate must be a valid date"
  }),
  quantity: z.number().int().positive(),
  purchasePrice: z.number().nonnegative().optional(),
  sellingPrice: z.number().nonnegative(),
  supplierId: z.string().uuid().optional()
})

// POST /api/batches - receive new stock into a batch.
// Creates the batch AND records a PURCHASE stock movement, atomically.
batchesRouter.post(
  "/",
  asyncHandler( async (req, res) => {
    const parsed = receiveInput.safeParse(req.body)
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid batch data", details: parsed.error.flatten()})
    }
    const data = parsed.data

    const medicine = await prisma.medicine.findUnique({
      where: { id: data.medicineId},
    })
    if (!medicine || !medicine.isActive) {
      return res.status(404).json({ error: "Medicine not found"})
    }

    const batch = await prisma.$transaction( async (tx) => {
      const created = await tx.medicineBatch.create({
        data: {
          medicineId: data.medicineId,
          batchNumber: data.batchNumber,
          expiryDate: new Date(data.expiryDate),
          quantityInStock: data.quantity,
          purchasePrice: data.purchasePrice,
          sellingPrice: data.sellingPrice,
        }
      })

      await tx.stockMovement.create({
        data: {
          medicineId: data.medicineId,
          batchId: created.id,
          type: "PURCHASE",
          quantity: data.quantity, // positive = stock in
          referenceId: created.id,
          reason: "Stock received",
        }
      })

      return created
    })

    res.status(201).json({ batch})
  })
)

const adjustInput = z.object({
  // Signed: negative reduces stock (breakage, correction), positive adds.
  quantity: z.number().int().refine((n) => n !== 0, {
    message: "quantity cannot be zero",
  }),
  reason: z.string().min(1),
})

// POST /api/batches/:id/adjust - manual stock correction with a reason.
batchesRouter.post(
  "/:id/adjust",
  asyncHandler(async (req, res) => {
    const parsed = adjustInput.safeParse(req.body)
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid adjustment", details: parsed.error.flatten()})
    }
    const { quantity, reason} = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.medicineBatch.findUnique({
        where: { id: req.params.id},
      })
      if (!batch) return { error: "Batch not found" as const}

      const newQty = batch.quantityInStock + quantity
      if (newQty < 0) {
        return { error: "Adjustment would make stock negative " as const}
      }

      const updated = await tx.medicineBatch.update({
        where: { id: batch.id},
        data: { quantityInStock: newQty},
      })

      await tx.stockMovement.create({
        data: {
          medicineId: batch.medicineId,
          batchId: batch.id,
          type: "ADJUSTMENT",
          quantity,
          reason,
        }
      })

      return { batch: updated}
    })

    if ("error" in result) {
      const code = result.error === "Batch not found" ? 404 :400
      return res.status(code).json({ error: result.error})
    }

    res.json({ batch: result.batch})
  })
)