import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";

export const salesRouter = Router();

salesRouter.use(requireAuth);

const saleInput = z.object({
  customerId: z.string().uuid().optional(),
  prescriptionId: z.string().uuid().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "WALLET"]).optional(),
  discount: z.number().nonnegative().optional(),
  items: z
    .array(
      z.object({
        medicineId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

// A single allocated slice of a sale: part (or all) of one line, drawn from one batch.
type Slice = {
  medicineId: string;
  batchId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

// POST /api/sales — ring up a sale.
// Stock is drawn FEFO (first-expiry-first-out) across a medicine's non-expired
// batches. Everything (stock decrements, SALE movements, the sale + its items)
// happens in one transaction so a failure can never leave stock half-deducted.
salesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = saleInput.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid sale data", details: parsed.error.flatten() });
    }
    const data = parsed.data;
    const soldById = req.user!.userId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Retry a few times only to dodge a rare invoice-number collision under
    // concurrent sales; any other error aborts immediately.
    const MAX_ATTEMPTS = 5;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const sale = await prisma.$transaction(async (tx) => {
          const slices: Slice[] = [];
          let subtotal = new Prisma.Decimal(0);

          // Allocate each requested line across batches, soonest expiry first.
          for (const line of data.items) {
            const medicine = await tx.medicine.findUnique({
              where: { id: line.medicineId },
            });
            if (!medicine || !medicine.isActive) {
              throw new HttpError(404, `Medicine not found`);
            }

            const batches = await tx.medicineBatch.findMany({
              where: {
                medicineId: line.medicineId,
                quantityInStock: { gt: 0 },
                expiryDate: { gte: today },
              },
              orderBy: { expiryDate: "asc" },
            });

            let remaining = line.quantity;
            for (const batch of batches) {
              if (remaining <= 0) break;
              const take = Math.min(remaining, batch.quantityInStock);
              const unitPrice = batch.sellingPrice;
              const lineTotal = unitPrice.mul(take);

              slices.push({
                medicineId: line.medicineId,
                batchId: batch.id,
                quantity: take,
                unitPrice,
                lineTotal,
              });
              subtotal = subtotal.add(lineTotal);

              await tx.medicineBatch.update({
                where: { id: batch.id },
                data: { quantityInStock: { decrement: take } },
              });

              remaining -= take;
            }

            if (remaining > 0) {
              throw new HttpError(
                400,
                `Not enough stock for ${medicine.name} (short by ${remaining})`
              );
            }
          }

          const discount = new Prisma.Decimal(data.discount ?? 0);
          if (discount.greaterThan(subtotal)) {
            throw new HttpError(400, "Discount cannot exceed the subtotal");
          }
          const total = subtotal.sub(discount);

          // Sequential, human-friendly invoice number: INV-000001, INV-000002…
          const seq = (await tx.sale.count()) + 1;
          const invoiceNumber = `INV-${String(seq).padStart(6, "0")}`;

          const created = await tx.sale.create({
            data: {
              invoiceNumber,
              customerId: data.customerId,
              prescriptionId: data.prescriptionId,
              soldById,
              subtotal,
              discount,
              total,
              paymentMethod: data.paymentMethod ?? "CASH",
              items: {
                create: slices.map((s) => ({
                  medicineId: s.medicineId,
                  batchId: s.batchId,
                  quantity: s.quantity,
                  unitPrice: s.unitPrice,
                  lineTotal: s.lineTotal,
                })),
              },
            },
            include: { items: true },
          });

          // Audit trail: one SALE movement per batch slice (negative = stock out).
          for (const s of slices) {
            await tx.stockMovement.create({
              data: {
                medicineId: s.medicineId,
                batchId: s.batchId,
                type: "SALE",
                quantity: -s.quantity,
                referenceId: created.id,
                reason: `Sale ${invoiceNumber}`,
              },
            });
          }

          return created;
        });

        return res.status(201).json({ sale });
      } catch (err) {
        // Unique collision on invoice_number → try again with a fresh count.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          attempt < MAX_ATTEMPTS
        ) {
          continue;
        }
        if (err instanceof HttpError) {
          return res.status(err.status).json({ error: err.message });
        }
        throw err;
      }
    }

    // Exhausted retries purely on invoice collisions (extremely unlikely).
    return res
      .status(409)
      .json({ error: "Could not generate a unique invoice number, please retry" });
  })
);

// GET /api/sales — recent sales, newest first (for the history screen).
salesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const sales = await prisma.sale.findMany({
      orderBy: { saleDate: "desc" },
      take: 100,
      include: {
        customer: { select: { name: true } },
        soldBy: { select: { name: true } },
        _count: { select: { items: true } },
      },
    });

    const rows = sales.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      saleDate: s.saleDate,
      total: s.total,
      discount: s.discount,
      paymentMethod: s.paymentMethod,
      customerName: s.customer?.name ?? null,
      soldByName: s.soldBy.name,
      itemCount: s._count.items,
    }));

    res.json({ sales: rows });
  })
);

// GET /api/sales/:id — full detail for the receipt view.
salesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        soldBy: { select: { name: true, username: true } },
        items: {
          include: {
            medicine: { select: { name: true, strength: true, unit: true } },
            batch: { select: { batchNumber: true, expiryDate: true } },
          },
        },
      },
    });

    if (!sale) return res.status(404).json({ error: "Sale not found" });
    res.json({ sale });
  })
);

// Small helper so thrown business errors carry an HTTP status out of the txn.
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}