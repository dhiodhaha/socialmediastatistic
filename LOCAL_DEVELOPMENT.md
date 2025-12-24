# Local Development Guide

> [**Main README**](./README.md) | [**Deployment Tutorial**](./TUTORIAL.md) | [**Local Development**](./LOCAL_DEVELOPMENT.md)

Complete guide for setting up the Social Media Statistics project for local development.

---

## Prerequisites

| Requirement | Version | Notes |
|:------------|:--------|:------|
| Node.js | v18+ | Required for Turbopack |
| pnpm | Latest | Monorepo package manager |
| PostgreSQL | v14+ | Can use Docker |
| Chromium | Latest | Bundled with Puppeteer |

---

## 1. Clone & Install

```bash
git clone <repository-url>
cd socialmediastatistic
pnpm install
```

---

## 2. Environment Configuration

### Frontend (`apps/frontend/.env`)

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/socialstats_dev

# Auth
AUTH_SECRET=development-secret-key-123
NEXTAUTH_SECRET=development-secret-key-123
NEXTAUTH_URL=http://localhost:3000

# Worker Connection
WORKER_URL=http://localhost:4000
WORKER_SECRET=local-worker-secret
```

### Worker (`apps/worker/.env`)

```bash
cp apps/worker/.env.example apps/worker/.env
```

```env
# Server
PORT=4000

# Security
WORKER_SECRET=local-worker-secret

# Database (same as frontend)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/socialstats_dev

# Scraping API (get from https://scrapecreators.com)
SCRAPECREATORS_API_KEY=your_api_key_here
```

> ⚠️ **Important**: `WORKER_SECRET` must match in both `.env` files!

---

## 3. Database Setup

### Option A: Docker (Recommended)

```bash
docker run --name socialstats-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=socialstats_dev \
  -p 5432:5432 \
  -d postgres:14
```

### Option B: Local PostgreSQL

Install PostgreSQL and create a database:
```sql
CREATE DATABASE socialstats_dev;
```

### Initialize Database

```bash
# Generate Prisma Client (REQUIRED for Prisma 7)
pnpm db:generate

# Push schema to database
pnpm db:push

# Seed with sample data (optional)
pnpm db:seed
```

### Prisma 7 Notes

This project uses **Prisma 7** with adapter-based configuration:
- Configuration is in `packages/database/prisma.config.ts`
- Uses `@prisma/adapter-neon` for database connections
- Always run `pnpm db:generate` after schema changes

---

## 4. Running the Application

```bash
# Run both frontend and worker (Turbo)
pnpm dev
```

This starts:
- **Frontend**: http://localhost:3000
- **Worker API**: http://localhost:4000

### Run Individually

```bash
# Frontend only
pnpm dev --filter=frontend

# Worker only
pnpm dev --filter=worker
```

---

## 5. Development Workflow

### Adding Accounts

1. Open http://localhost:3000/accounts
2. Click "Add Account" or import via CSV
3. Fill in Instagram/TikTok/Twitter handles

### Testing Scraping

1. Go to http://localhost:3000/history
2. Select category or "Scrape All"
3. Click "Scrape Now" button
4. Watch worker logs for progress

### Testing Export

1. Go to http://localhost:3000/reports
2. Select date range and category
3. Click "Export PDF" button
4. Check download for combined PDF

### Database Inspection

```bash
# Open Prisma Studio
pnpm db:studio

# Or with full path
npx prisma studio --schema=packages/database/prisma/schema.prisma
```

---

## 6. Testing

```bash
# Run all tests
pnpm test

# Frontend tests only
pnpm test --filter=frontend

# Watch mode
pnpm test --filter=frontend -- --watch
```

---

## 7. Common Issues

### "Module not found" errors in monorepo

Turborepo requires dependencies in the app that uses them:
```bash
# Install in specific app
cd apps/frontend
pnpm add <package-name>

# Then from root
pnpm install
```

### Puppeteer issues on Mac

Install Chromium manually if needed:
```bash
brew install chromium
```

### Database connection errors

1. Verify PostgreSQL is running
2. Check `DATABASE_URL` format
3. Run `pnpm db:generate` after any schema changes

### Worker not responding

1. Check worker is running on port 4000
2. Verify `WORKER_SECRET` matches in both apps
3. Check worker logs: `pnpm dev --filter=worker`

---

## 8. Project Structure

```
socialmediastatistic/
├── apps/
│   ├── frontend/              # Next.js 16 dashboard
│   │   ├── app/               # App Router pages
│   │   ├── components/        # React components
│   │   └── actions/           # Server actions
│   └── worker/                # Express + Puppeteer worker
│       ├── routes/            # API endpoints
│       └── services/          # Business logic (scraper, export)
├── packages/
│   ├── database/              # Prisma schema & client
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── prisma.config.ts
│   └── types/                 # Shared TypeScript types
├── docker-compose.prod.yml    # Production Docker config
├── turbo.json                 # Turborepo configuration
└── pnpm-workspace.yaml        # Workspace definition
```

---

## 9. Available Scripts

| Script | Description |
|:-------|:------------|
| `pnpm dev` | Run all apps in development mode |
| `pnpm build` | Build all apps |
| `pnpm test` | Run test suite |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed database with sample data |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript checks |
