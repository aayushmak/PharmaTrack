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

