# PharmaTrack

A pharmacy medicine record system: inventory & stock, customer prescription history, sales/billing, and reports. Online-only web app (v1).

**Stack:** React + TypeScript + Vite · Node.js + Express + TypeScript · PostgreSQL + Prisma · Docker.

This repo currently contains **Phase 0** (running skeleton — database schema, seed data, staff authentication), the **Phase 1 inventory API** (medicines, stock batches, suppliers, stock movements), the **Phase 1b React frontend** (login + inventory screens), and **Phase 2 billing** (point-of-sale checkout, sales history, printable receipts). Later modules (prescriptions, reports) build on top of this.

## Project layout

```
pharmatrack/
├── docker-compose.yml         # Postgres + API, one command to run
├── server/                    # Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma      # full data model
│   │   └── seed.ts            # sample users, suppliers, medicines
│   └── src/
│       ├── index.ts           # server entry
│       ├── app.ts             # Express app + route mounting + error handler
│       ├── lib/
│       │   ├── prisma.ts      # Prisma client singleton
│       │   └── asyncHandler.ts# wraps async routes for clean error handling
│       ├── middleware/auth.ts # JWT verify + role guard
│       └── routes/
│           ├── auth.ts        # login + current user
│           ├── medicines.ts   # medicines CRUD, stock list, movements
│           ├── batches.ts     # receive stock, adjust stock
│           ├── sales.ts       # billing — ring up a sale (FEFO), history, receipt
│           └── suppliers.ts   # list + add suppliers
└── client/                    # React app (Phase 1b + Phase 2)
    ├── Dockerfile
    ├── index.html
    ├── vite.config.ts
    └── src/
        ├── main.tsx           # entry — mounts Router + AuthProvider
        ├── App.tsx            # routes
        ├── api/client.ts      # fetch wrapper (attaches JWT, unwraps errors)
        ├── auth/AuthContext.tsx  # login/logout + current-user state
        ├── components/        # Layout, ProtectedRoute
        └── pages/             # Login, inventory (list/detail/form), POS (sell/sales/receipt)
```

## Running it

You need Docker installed. From the `pharmatrack/` folder:

```bash
cp server/.env.example server/.env      # then edit JWT_SECRET
docker compose up --build
```

This starts:
- **Postgres** on `localhost:5432`
- **API** on `localhost:4000`
- **Web app** on `localhost:5173` (open this in your browser)

On first boot, run the migration and seed (in a second terminal):

```bash
docker compose exec api npx prisma migrate dev --name init
docker compose exec api npx prisma db seed
```

### Seeded logins

| Role | Username | Password |
|---|---|---|
| Owner | `owner` | `owner123` |
| Pharmacist | `pharma` | `pharma123` |

> Change these before deploying anywhere real.

## Quick API check

```bash
# log in
curl -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"owner","password":"owner123"}'

# use the returned token
curl localhost:4000/api/auth/me -H 'Authorization: Bearer <token>'
```

## API reference

All routes except `/api/health` and `/api/auth/login` require an `Authorization: Bearer <token>` header.

### Auth
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Exchange username/password for a JWT |
| GET | `/api/auth/me` | Current authenticated user |

### Medicines & stock (Phase 1)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/medicines` | List medicines with computed `totalStock` + `isLowStock`. Supports `?q=` (name/generic search) and `?category=` |
| GET | `/api/medicines/:id` | Medicine detail with its batches (soonest expiry first) |
| POST | `/api/medicines` | Add a medicine to the catalog |
| PUT | `/api/medicines/:id` | Update a medicine (partial allowed) |
| DELETE | `/api/medicines/:id` | Soft-delete (sets `isActive=false`, keeps history) |
| GET | `/api/medicines/:id/movements` | Stock movement audit trail |
| POST | `/api/batches` | Receive stock — creates a batch + `PURCHASE` movement (atomic) |
| POST | `/api/batches/:id/adjust` | Manual stock correction — signed `quantity` + `reason` (atomic; rejects negative stock) |

### Suppliers
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/suppliers` | List suppliers |
| POST | `/api/suppliers` | Add a supplier |

### Billing / sales (Phase 2)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/sales` | Ring up a sale. Body: `{ items: [{ medicineId, quantity }], discount?, paymentMethod?, customerId?, prescriptionId? }`. Draws stock FEFO across non-expired batches, writes `SALE` movements, and creates the sale + line items — all in one transaction. Returns the created sale |
| GET | `/api/sales` | Recent sales (newest first, latest 100) for the history screen |
| GET | `/api/sales/:id` | Full sale detail (customer, cashier, line items with medicine + batch) for the receipt |

**Billing rules:** prices are the **batch** `sellingPrice` at the moment of sale (the POS shows the medicine's indicative `defaultSellingPrice`, but the **server computes the authoritative total** from the batches it actually draws). Invoice numbers are sequential — `INV-000001`, `INV-000002`, … A sale fails atomically if any line is short on non-expired stock, so stock is never left half-deducted.

**Design rule:** a medicine's stock is never stored directly — it's summed from its batches on read, and every change (receive, sale, adjustment) writes a `stock_movements` row so counts and history can never disagree.

## Web app (Phase 1b)

The React frontend lives in `client/` and runs on `localhost:5173`. Sign in with a seeded login above. It currently covers the inventory module:

- **Inventory list** — searchable table of medicines with computed stock; low-stock rows are flagged in red.
- **Add / edit medicine** — full catalog form (generic name, form, strength, category, rack, reorder level, Rx flag, price).
- **Medicine detail** — stock summary, batch list (with expiry highlighting), a **Receive stock** form (creates a batch), and inline **Adjust** for manual corrections.

It talks to the API via a small `fetch` wrapper (`src/api/client.ts`) that attaches the JWT (kept in `localStorage`) and surfaces API error messages. State is plain React hooks for now; TanStack Query can be layered in later without changing the API.

## Billing (Phase 2)

Phase 2 adds the point-of-sale flow — three screens, no new dependencies and **no database migration** (the `sales` and `sale_items` tables were already created by the Phase 0 `init` migration).

- **New sale** (`/sell`) — search the catalog, add medicines to a cart, set quantity (capped at available stock), apply an optional discount, pick a payment method, and complete the sale. If the cart includes a prescription-only (Rx) medicine, it warns but still lets you continue (full prescription linking comes in Phase 3).
- **Sales** (`/sales`) — history of recent sales with invoice number, date, item count, payment method, cashier, and total; each row links to its receipt.
- **Receipt** (`/sales/:id`) — a clean, printable receipt (shop header, invoice number, line items, subtotal/discount/total, payment method). The **Print receipt** button calls the browser's print dialog; a `@media print` rule hides the app chrome so only the receipt prints. (Server-generated PDF receipts are deferred to Phase 4.)

The cart shows indicative prices from each medicine's `defaultSellingPrice`, but the **final total is computed by the server** from the actual batch prices it draws (FEFO), so the receipt is always authoritative.

## Notes on scope

- **Bills are tax-free** — MRP is treated as tax-inclusive, so no tax/VAT lines. Currency is NPR.
- **No barcode scanning** and **no prescription-image attachments** in v1 — both are planned for v2.
- **Offline support** is a possible v2 addition and would layer on top of this same API and schema.