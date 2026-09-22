# PharmaTrack

A pharmacy medicine record system: inventory & stock, customer prescription history, sales/billing, and reports. Online-only web app (v1).

**Stack:** React + TypeScript + Vite · Node.js + Express + TypeScript · PostgreSQL + Prisma · Docker.

This repo currently contains **Phase 0** — the running skeleton: database schema, seed data, and staff authentication. Feature modules (inventory, billing, prescriptions, reports) are built on top of this in later phases.

## Project layout

```
pharmatrack/
├── docker-compose.yml     # Postgres + API, one command to run
├── server/                # Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma  # full data model
│   │   └── seed.ts        # sample users, suppliers, medicines
│   └── src/
│       ├── index.ts       # server entry
│       ├── app.ts         # Express app + routes
│       ├── lib/prisma.ts  # Prisma client singleton
│       ├── middleware/auth.ts
│       └── routes/auth.ts # login + current user
└── client/                # (added in Phase 1 — React app)
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

## Notes on scope

- **Bills are tax-free** — MRP is treated as tax-inclusive, so no tax/VAT lines. Currency is NPR.
- **No barcode scanning** and **no prescription-image attachments** in v1 — both are planned for v2.
- **Offline support** is a possible v2 addition and would layer on top of this same API and schema.