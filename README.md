# Social Media Statistics Dashboard

A comprehensive dashboard for tracking and analyzing social media performance across Instagram, TikTok, and Twitter (X). Built with **Next.js**, **Prisma**, and **ScrapeCreators API**.

## Features

-   **Multi-Platform Tracking**: Monitor followers, posts, and engagement for Instagram, TikTok, and Twitter Accounts.
-   **Automated Scraping**: Background worker service that periodically fetches fresh data using ScrapeCreators API.
-   **Interactive Dashboard**: Visualize account performance and recent activity.
-   **History & Export**: View detailed scraping history with date filtering and export data to CSV or PDF.
-   **Account Management**: Bulk import accounts via CSV or add them individually.

## Tech Stack

-   **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Shadcn UI.
-   **Backend**: Server Actions, Prisma ORM (PostgreSQL), Express (Worker Service).
-   **Testing**: Vitest, React Testing Library.
-   **External APIs**: ScrapeCreators API.

## Getting Started

### Prerequisites

-   Node.js 18+
-   pnpm (recommended) or npm
-   PostgreSQL database

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd socialmediastatistic
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in `apps/frontend` and `apps/worker` (see `.env.example`).

    **Required Variables:**
    -   `DATABASE_URL`: user configs
    -   `NEXTAUTH_SECRET`: user configs
    -   `SCRAPECREATORS_API_KEY`: API key from [ScrapeCreators](https://scrapecreators.com).
    -   `WORKER_URL`: URL of the worker service (e.g., `http://localhost:4000`).
    -   `WORKER_SECRET`: Shared secret for securing worker endpoints.

4.  **Database Setup:**
    ```bash
    pnpm db:generate
    pnpm db:push
    ```

5.  **Run Development Server:**
    ```bash
    pnpm dev
    ```
    -   Frontend: `http://localhost:3000`
    -   Worker: `http://localhost:4000`

## Testing

Run the automated test suite:
```bash
pnpm test --filter=frontend
```
