# Social Media Statistics Dashboard

> [**Main README**](./README.md) | [**Deployment Tutorial**](./TUTORIAL.md) | [**Local Development**](./LOCAL_DEVELOPMENT.md)

A specialized analytics dashboard for tracking and visualizing social media performance across **Instagram**, **TikTok**, and **Twitter (X)**. Built with modern web technologies including **Next.js 16**, **Prisma 7**, and **Docker**.

![Dashboard Preview](https://placehold.co/1200x600?text=Dashboard+Preview)

## 🚀 Key Features

### Analytics & Tracking
- **Multi-Platform Analytics**: Unified view for followers, posts, and engagement metrics across Instagram, TikTok, and Twitter.
- **Growth Reports (Laporan Pertumbuhan)**: Compare data between two dates to track audience growth with percentage calculations.
- **Historical Data**: Comprehensive history log with "Blended Columns" design (Status, Timing, Metrics) and visual progress bars.

### Automation & Scraping
- **Automated Scraping Engine**: Background worker with configurable cron schedule (default: midnight on last day of month).
- **Manual Trigger**: Instant scrape triggering via dashboard with confirmation modal.
- **Retry Failed Accounts**: One-click retry for accounts that failed during scraping.
- **Category-based Scraping**: Scrape all accounts or filter by specific category.

### Export & Reporting
- **Export Modal**: Configurable export with platform selection, category filter, and date range.
- **Combined PDF Export**: All platforms in a single PDF with main cover page + individual platform sections.
- **CSV Export**: Quick data export for spreadsheet analysis.
- **Custom Cover Page**: Optional cover page with custom title for branded reports.

### Account Management
- **Bulk Import**: CSV upload for mass-importing accounts.
- **Category Management**: Organize accounts into categories for targeted reporting.
- **Account Status**: Active/inactive toggle for each account.

## 🛠 Tech Stack

- **Frontend**: Next.js 16 (Turbopack), TypeScript, Tailwind CSS, Catalyst UI Kit.
- **Backend**: Server Actions, Prisma 7 ORM, PostgreSQL.
- **Worker Service**: Node.js, Express, Puppeteer (scraping & PDF generation).
- **Infrastructure**: Docker, Docker Compose, Turborepo (monorepo).

## 📖 Documentation

- **[Deployment Guide (TUTORIAL.md)](./TUTORIAL.md)**: Deploy to Vercel (frontend) + VPS (worker).
- **[Local Development (LOCAL_DEVELOPMENT.md)](./LOCAL_DEVELOPMENT.md)**: Setup for local development.
- **[Database Schema](./packages/database/prisma/schema.prisma)**: Prisma schema overview.

## ⚡️ Quick Start

### Prerequisites
- Node.js 18+ & pnpm
- PostgreSQL Database
- Chromium (for worker PDF/scraping)

### 1. Clone & Install
```bash
git clone <repository-url>
cd socialmediastatistic
pnpm install
```

### 2. Environment Setup
Copy `.env.example` in both `apps/frontend` and `apps/worker` to `.env`:
```bash
cp apps/frontend/.env.example apps/frontend/.env
cp apps/worker/.env.example apps/worker/.env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SCRAPECREATORS_API_KEY` - Get from [ScrapeCreators](https://scrapecreators.com)
- `WORKER_SECRET` - Shared secret between frontend and worker

### 3. Database
```bash
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
pnpm db:seed      # (Optional) Seed with sample data
```

### 4. Run
```bash
pnpm dev
```
- **Dashboard**: http://localhost:3000
- **Worker API**: http://localhost:4000

## 🧪 Testing

```bash
pnpm test                    # Run all tests
pnpm test --filter=frontend  # Frontend tests only
```

## 📁 Project Structure

```
socialmediastatistic/
├── apps/
│   ├── frontend/     # Next.js dashboard
│   └── worker/       # Express API + scraper
├── packages/
│   ├── database/     # Prisma schema & client
│   └── types/        # Shared TypeScript types
└── docker-compose.prod.yml
```
