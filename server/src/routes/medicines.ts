import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { Prisma } from '@prisma/client';

export const medicinesRouter = Router();

// All inventory routes require a logged-in staff member.
medicinesRouter.use(requireAuth);

const medicineInput = z.object({
  name: z.string().min(1),
  genericName: z.string().optional(),
  from: z.string().optional(),
  strength: z.string().optional(),
  unit: z.string().optional(),
  manufacturer: z.string().optional(),
  category: z.string().optional(),
  rackLocation: z.string().optional(),
  reorderLevel: z.number().int().optional(),
  requiresPrescription: z.boolean().optional(),
  defaultSellingPrice: z.number().nonnegative().optional(),
})

// Sum a medicine's live stock across all its batches.
function totalStock(batches: { quantityInStock: number}[]): number {
  return batches.reduce((sum, b) => sum + b.quantityInStock, 0);
}

// GET /api/medicines - list with computed stock, search + category filter.
// ?q=para -> matches name or generic name (case-insensitive)
// ?category=Analgesic
medicinesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : ""
    const category = typeof req.query.category === "string" ? req.query.category : undefined

    const where: Prisma.MedicineWhereInput = { isActive: true}
    if (category) where.category = category
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive"}},
        { genericName: { contains: q, mode: "insensitive"}}
      ]
    }

    const medicines = await prisma.medicine.findMany({
      where,
      include: { batches: true},
      orderBy: { name: "asc"}
    })

    // Shape the response: ass totalStock + isLowStock, drop the raw batch array.
    const rows = medicines.map((m) => {
      const stock = totalStock(m.batches)
      return {
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        form: m.form,
        strength: m.strength,
        unit: m.unit,
        manufacturer: m.manufacturer,
        category: m.category,
        rackLocation: m.rackLocation,
        reorderLevel: m.reorderLevel,
        requiresPrescription: m.requiresPrescription,
        defaultSellingPrice: m.defaultSellingPrice,
        totalStock: stock,
        isLowStock: stock <= m.reorderLevel,
      }
    })

    res.json({ medicines: rows})
  })
)

// GET /api/medicine/:id - full detail including batches (soonest expiry first).
medicinesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const medicine = await prisma.medicine.findUnique({
      where: { id: req.params.id},
      include: { batches: { orderBy: { expiryDate: "asc"}}}
    })

    if (!medicine || !medicine.isActive) {
      return res.status(404).json({error: "Medicine not found"})
    }

    res.json({
      medicine: { ...medicine, totalStock: totalStock(medicine.batches)}
    })
  })
)

// POST /api/medicines - create a new catalog entry.
medicinesRouter.post(
  "/",
  asyncHandler(async ( req, res) => {
    const parsed = medicineInput.safeParse(req.body)
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid medicine data", details: parsed.error.flatten()})
    }

    const medicine = await prisma.medicine.create({ data: parsed.data})
    res.status(201).json({ medicine})
  })
)

