import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper: a date N months from today (for expiry dates).
function monthsFromNow(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d;
}

async function main() {
  console.log("Seeding PharmaTrack...");

  // --- Staff users -------------------------------------------------------
  const ownerHash = await bcrypt.hash("owner123", 10);
  const pharmaHash = await bcrypt.hash("pharma123", 10);

  await prisma.user.upsert({
    where: { username: "owner" },
    update: {},
    create: {
      name: "Shop Owner",
      username: "owner",
      passwordHash: ownerHash,
      role: Role.OWNER,
    },
  });

  await prisma.user.upsert({
    where: { username: "pharma" },
    update: {},
    create: {
      name: "Counter Pharmacist",
      username: "pharma",
      passwordHash: pharmaHash,
      role: Role.PHARMACIST,
    },
  });

  // --- Suppliers ---------------------------------------------------------
  const supplier = await prisma.supplier.create({
    data: {
      name: "Himalayan Pharma Distributors",
      phone: "+977-61-000000",
      address: "Pokhara, Nepal",
    },
  });

  // --- Medicines + one batch each ---------------------------------------
  const medicines = [
    {
      name: "Paracetamol 500mg",
      genericName: "Paracetamol",
      form: "tablet",
      strength: "500mg",
      unit: "strip",
      manufacturer: "Nepal Pharmaceuticals",
      category: "Analgesic",
      rackLocation: "A1",
      reorderLevel: 20,
      requiresPrescription: false,
      sellingPrice: 25.0,
      purchasePrice: 18.0,
      stock: 120,
      expiryMonths: 18,
    },
    {
      name: "Amoxicillin 250mg",
      genericName: "Amoxicillin",
      form: "capsule",
      strength: "250mg",
      unit: "strip",
      manufacturer: "Deurali-Janta",
      category: "Antibiotic",
      rackLocation: "B2",
      reorderLevel: 15,
      requiresPrescription: true,
      sellingPrice: 60.0,
      purchasePrice: 45.0,
      stock: 40,
      expiryMonths: 12,
    },
    {
      name: "Cetirizine 10mg",
      genericName: "Cetirizine",
      form: "tablet",
      strength: "10mg",
      unit: "strip",
      manufacturer: "Time Pharmaceuticals",
      category: "Antihistamine",
      rackLocation: "A3",
      reorderLevel: 10,
      requiresPrescription: false,
      sellingPrice: 30.0,
      purchasePrice: 20.0,
      stock: 8, // intentionally low → triggers low-stock alert later
      expiryMonths: 24,
    },
    {
      name: "ORS Sachet",
      genericName: "Oral Rehydration Salts",
      form: "sachet",
      strength: "-",
      unit: "piece",
      manufacturer: "CTL Pharma",
      category: "Electrolyte",
      rackLocation: "C1",
      reorderLevel: 30,
      requiresPrescription: false,
      sellingPrice: 15.0,
      purchasePrice: 9.0,
      stock: 50,
      expiryMonths: 2, // near expiry → triggers expiry alert later
    },
  ];

  for (const m of medicines) {
    const medicine = await prisma.medicine.create({
      data: {
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
        defaultSellingPrice: m.sellingPrice,
      },
    });

    const batch = await prisma.medicineBatch.create({
      data: {
        medicineId: medicine.id,
        batchNumber: `B-${medicine.name.slice(0, 3).toUpperCase()}-001`,
        expiryDate: monthsFromNow(m.expiryMonths),
        quantityInStock: m.stock,
        purchasePrice: m.purchasePrice,
        sellingPrice: m.sellingPrice,
        supplierId: supplier.id,
      },
    });

    // Record the opening stock as a PURCHASE movement (audit trail).
    await prisma.stockMovement.create({
      data: {
        medicineId: medicine.id,
        batchId: batch.id,
        type: "PURCHASE",
        quantity: m.stock,
        reason: "Opening stock (seed)",
      },
    });
  }

  // --- A sample customer with a prescription ----------------------------
  const customer = await prisma.customer.create({
    data: {
      name: "Ram Bahadur",
      phone: "+977-9800000000",
      address: "Lakeside, Pokhara",
      notes: "Allergic to penicillin",
    },
  });

  const paracetamol = await prisma.medicine.findFirst({
    where: { genericName: "Paracetamol" },
  });

  if (paracetamol) {
    await prisma.prescription.create({
      data: {
        customerId: customer.id,
        doctorName: "Dr. Sita Sharma",
        clinic: "Pokhara City Clinic",
        notes: "Fever, 3 days",
        items: {
          create: [
            {
              medicineId: paracetamol.id,
              dosage: "1 tab three times daily",
              duration: "3 days",
              quantity: 9,
            },
          ],
        },
      },
    });
  }

  console.log("Seed complete.");
  console.log("Logins:  owner / owner123   |   pharma / pharma123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });