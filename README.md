# Social Media Statistics Dashboard

> [**Main README**](./README.md) | [**Deployment Tutorial**](./TUTORIAL.md) | [**Local Development**](./LOCAL_DEVELOPMENT.md)

A specialized analytics dashboard for tracking and visualizing social media performance across **Instagram**, **TikTok**, and **Twitter (X)**. Built with high-performance modern web technologies including **Next.js 14**, **Prisma**, and **Docker**.

![Dashboard Preview](https://placehold.co/1200x600?text=Dashboard+Preview)

## 🚀 Key Features

-   **Multi-Platform Analytics**: Unified view for followers, posts, and engagement metrics.
-   **Automated Scraping Engine**: Integrated background worker that auto-refreshes data on the last day of every month.
-   **Manual Trigger**: instant scrape triggering via the dashboard for real-time updates.
-   **Historical Data**: comprehensive history log with "Time Travel" growth calculation.
-   **Account Categorization**: Group creators for easier management and targeted reporting.
-   **Report Filtering**: Filter comparison reports by category to focus on specific segments.
-   **Export Capabilities**: One-click export to **CSV** and **PDF** reports (now with category filtering support).
-   **Bulk Management**: Easy mass-import of accounts via CSV upload with optional category assignment.

## 🛠 Tech Stack

-   **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Recharts.
-   **Backend**: Server Actions, Prisma ORM, PostgreSQL.
-   **Worker Service**: Node.js, Puppeteer (for reliable scraping/PDFs), Express.
-   **Infrastructure**: Docker, Docker Compose, GitHub Actions (CI).

## 📖 Documentation

-   **[Deployment Guide (TUTORIAL.md)](./TUTORIAL.md)**: Step-by-step instructions for deploying to Vercel and VPS.
-   **[Database Schema](./packages/database/prisma/schema.prisma)**: Overview of the data model.

## ⚡️ Quick Start (Local Development)

### Prerequisites
-   Node.js 18+ & pnpm
-   PostgreSQL Database
-   Chromium (for local worker testing)

### 1. Clone & Install
```bash
git clone <repository-url>
cd socialmediastatistic
pnpm install
```

### 2. Environment Setup
Copy `.env.example` in both `apps/frontend` and `apps/worker` to `.env` and fill in:
-   `DATABASE_URL`
-   `SCRAPECREATORS_API_KEY` (Get one at [ScrapeCreators](https://scrapecreators.com))
-   `WORKER_SECRET` (Generate a random string)

### 3. Database
```bash
pnpm db:generate
pnpm db:push
```

### 4. Run Locally
```bash
pnpm dev
```
-   **Dashboard**: [http://localhost:3000](http://localhost:3000)
-   **Worker API**: [http://localhost:4000](http://localhost:4000)

## 🧪 Testing

Run the automated test suite to verify frontend logic:
```bash
pnpm test --filter=frontend
```
