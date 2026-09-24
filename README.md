# PharmaTrack

A pharmacy medicine record system: inventory & stock, customer prescription history, sales/billing, and reports. Online-only web app (v1).

**Stack:** React + TypeScript + Vite · Node.js + Express + TypeScript · PostgreSQL + Prisma · Docker.

This repo currently contains **Phase 0** (running skeleton — database schema, seed data, staff authentication) and the **Phase 1 inventory API** (medicines, stock batches, suppliers, stock movements). The Phase 1 React screens and later modules (billing, prescriptions, reports) build on top of this.

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
│           └── suppliers.ts   # list + add suppliers
└── client/                    # (added in Phase 1b — React app)
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

**Design rule:** a medicine's stock is never stored directly — it's summed from its batches on read, and every change (receive, sale, adjustment) writes a `stock_movements` row so counts and history can never disagree.

## Notes on scope

- **Bills are tax-free** — MRP is treated as tax-inclusive, so no tax/VAT lines. Currency is NPR.
- **No barcode scanning** and **no prescription-image attachments** in v1 — both are planned for v2.
- **Offline support** is a possible v2 addition and would layer on top of this same API and schema.