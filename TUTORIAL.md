# Deployment Tutorial

This guide covers how to deploy the Social Media Statistics application to production.

## 1. Database Deployment (PostgreSQL)
You need a PostgreSQL database accessible by both the frontend and worker.
-   **Providers**: Neon, Supabase, Railway, AWS RDS.
-   **Action**: Create a database and get the connection string (`DATABASE_URL`).
-   **Migration**: Run migrations from your local machine or CI/CD pipeline:
    ```bash
    pnpm db:push
    ```

## 2. Shared Environment Variables
Ensure these variables are set in both Frontend and Worker environments:
-   `DATABASE_URL`: `postgres://user:pass@host:5432/db`
-   `WORKER_SECRET`: A long random string (e.g., generated with `openssl rand -hex 32`).

## 3. Worker Service Deployment
The worker is an Express.js app that handles scraping tasks. It needs to run continuously or wake up for requests.

-   **Deployment Options**: Render, Railway, DigitalOcean App Platform, raw VPS with pm2.
-   **Build Command**:
    ```bash
    pnpm build --filter=worker
    ```
-   **Start Command**:
    ```bash
    node apps/worker/dist/index.js
    ```
-   **Environment Variables**:
    -   `PORT`: `4000` (or dynamic)
    -   `DATABASE_URL`: (Same as above)
    -   `SCRAPECREATORS_API_KEY`: Your API key.
    -   `WORKER_SECRET`: (Same as above)

## 4. Frontend Deployment (Next.js)
The frontend serves the dashboard and triggers scraping jobs on the worker.

-   **Deployment Options**: Vercel (Recommended), Netlify, Docker.
-   **Vercel Setup**:
    1.  Import project from Git.
    2.  Set Root Directory to `apps/frontend` (if monorepo support isn't auto-detected, otherwise usage of `turbo` handles root). *Actually, for this Turborepo, Vercel basically handles it at root.*
    3.  **Environment Variables**:
        -   `DATABASE_URL`
        -   `NEXTAUTH_SECRET`
        -   `NEXTAUTH_URL`: Your domain (e.g., `https://myapp.com`)
        -   `WORKER_URL`: The URL where your worker is deployed (e.g., `https://worker-xyz.railway.app`)
        -   `WORKER_SECRET`

## 5. Setting Up Scheduled Scraping
The worker has endpoints but needs a trigger.
-   **Job Scheduler**: Use a cron service (like GitHub Actions, Vercel Cron, or a simple external cron) to hit the worker endpoint.
-   **Worker Endpoint**: `POST /scrape`
-   **Headers**: `Authorization: Bearer <WORKER_SECRET>` (Note: The internal communication uses this secret, while the worker uses x-api-key for external calls TO ScrapeCreators).

### Example Vercel Cron (`vercel.json` in `apps/frontend` or root)
```json
{
  "crons": [
    {
      "path": "/api/cron/trigger-scrape",
      "schedule": "0 0 * * *"
    }
  ]
}
```
*Note: You would need to create a Next.js API route that proxies the request to the worker if using Vercel Cron, or just call the worker URL directly from an external scheduler.*

## 6. Docker Deployment (Optional)
If you prefer Docker, you can use the provided `Dockerfile` (if applicable) or build one using standard Node.js multi-stage builds.

**Sample Dockerfile structure:**
```dockerfile
FROM node:18-alpine AS base
# ... install dependencies ...
# ... build apps ...
CMD ["node", "apps/worker/dist/index.js"] # for worker container
```
