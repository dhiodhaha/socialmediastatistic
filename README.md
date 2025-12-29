# Social Media Statistics Dashboard

> [**Main README**](./README.md) | [**Deployment Tutorial**](./TUTORIAL.md) | [**Local Development**](./LOCAL_DEVELOPMENT.md)

A specialized analytics dashboard for tracking and visualizing social media performance across **Instagram**, **TikTok**, and **Twitter (X)**. Built with modern web technologies including **Next.js 16**, **Prisma 7**, and **Docker**.

![Dashboard Preview](https://placehold.co/1200x600?text=Dashboard+Preview)

## 🚀 Key Features

### Analytics & Tracking
- **Multi-Platform Analytics**: Unified view for followers, posts, and engagement metrics across Instagram, TikTok, and Twitter.
- **Growth Reports (Laporan Pertumbuhan)**: Advanced comparison between any two dates to track audience growth. Includes automated percentage delta calculations for all key metrics.
- **Historical Data**: Redesigned history log featuring a "Blended Columns" layout:
    - **Status**: Visual indicators for Success, Failed, and Running jobs using Catalyst badges.
    - **Timing**: Consolidates start time, relative time (age), and total execution duration in a single view.
    - **Metrics**: Visual progress bars showing Success/Failure ratios with real-time counts.

### Automation & Scraping
- **Smart Scraping Engine**: Distributed worker service with intelligent deduplication:
    - **Daily Job Merging**: Automatically merges multiple triggers within the same day into a single report.
    - **Global Deduplication**: Prevents redundant scraping of the same handle within a 24-hour window.
- **Manual & Scheduled Control**: Instant manual triggers with real-time progress tracking, plus configurable crontab schedules (default: monthly).
- **Robust Error Handling**: Precise tracking of failed accounts with "One-Click Retry" to complete partial jobs without rescraping successful handles.

### Export & Reporting
- **Combined PDF Engine**: Generates professional multi-platform reports in a single document, featuring a dedicated cover page and platform-specific sections using Puppeteer.
- **Customizable Exports**: Filter by platform, category, and date range. Custom cover page titles supported for branded reports.
- **Data Portability**: Quick CSV exports for raw data analysis in Excel or Google Sheets.

### Account Management & UI
- **Bulk Operations**: Mass-import social media handles via CSV upload with client-side validation.
- **Organized Categorization**: Group accounts into custom categories for granular reporting and targeted scraping.
- **Premium User Experience**: Built with **Catalyst UI Kit** and **Geist Font**, featuring a high-fidelity sidebar, responsive layouts, and smooth animations.

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
