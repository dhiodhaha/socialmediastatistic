# Deployment Tutorial

> [**Main README**](./README.md) | [**Deployment Tutorial**](./TUTORIAL.md) | [**Local Development**](./LOCAL_DEVELOPMENT.md)

This guide covers how to deploy the Social Media Statistics application to production.

## 1. Database Deployment (PostgreSQL)
You need a PostgreSQL database accessible by both the frontend and worker.
-   **Providers**: Neon, Supabase, Railway, AWS RDS.
-   **Action**: Create a database and get the connection string (`DATABASE_URL`).
-   **Migration**: Run migrations from your local machine:
    ```bash
    pnpm db:push
    ```

## 2. Shared Environment Variables
Ensure these variables are set in both Frontend and Worker environments:
-   `DATABASE_URL`: `postgres://user:pass@host:5432/db`
-   `WORKER_SECRET`: A long random string (e.g., generated with `openssl rand -hex 32`).

---

## 3. Frontend Deployment (Vercel)
The frontend serves the dashboard and triggers scraping jobs on the worker.

**Steps:**
1.  Push your code to GitHub.
2.  Go to [Vercel](https://vercel.com) -> **Add New Project**.
3.  Import your repository.
4.  **Framework Preset**: Select `Next.js`.
5.  **Root Directory**: `apps/frontend`.
6.  **Environment Variables**:
    -   `DATABASE_URL`
    -   `NEXTAUTH_SECRET` (Generate generic secret)
    -   `NEXTAUTH_URL`: Your Vercel domain (e.g., `https://myapp.vercel.app`)
    -   `WORKER_URL`: Your VPS IP/Domain (e.g., `http://123.45.67.89:4000` or `https://api.mydomain.com`)
    -   `WORKER_SECRET`: (Same as above)
7.  Click **Deploy**.

---

## 4. Backend Worker Deployment (VPS - Recommended)
The worker handles scraping and PDF exports. We use **Docker** to make this easy. The worker includes an **internal scheduler** so it runs scrapes automatically every midnight.

**Prerequisites:**
-   A VPS (DigitalOcean, Hetzner, AWS EC2) with Docker installed.
-   [Install Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

**Steps:**

1.  **Copy Files** to your VPS:
    You need to copy the entire project (or clone it) to your VPS.
    ```bash
    git clone https://github.com/your/repo.git social-stats
    cd social-stats
    ```

2.  **Create `.env` file**:
    Create a `.env` file in the root directory (or pass vars directly to docker-compose).
    ```bash
    nano .env
    ```
    Content:
    ```env
    DATABASE_URL=postgres://...
    SCRAPECREATORS_API_KEY=your_api_key
    WORKER_SECRET=your_secret_key
    ```
    *(Note: The `docker-compose.prod.yml` expects these to be available in the shell or an env_file)*

3.  **Deploy with Docker Compose**:
    Run this command in the project root:
    ```bash
    # Pointing to the production compose file
    docker compose -f docker-compose.prod.yml up -d --build
    ```

**That's it!**
-   Worker is running on port `4000`.
-   Scrapes run automatically every night at 00:00 UTC.
-   You can manually scrape from the Frontend dashboard.

**Updating the Worker:**
When you push code changes:
1.  `git pull`
2.  `docker compose -f docker-compose.prod.yml up -d --build`

---

## 5. (Alternative) Worker Deployment (Railway/Render)
If you don't want a VPS, you can use Railway or Render.

**Railway:**
1.  Connect GitHub repo.
2.  Set Root Directory to `apps/worker`.
3.  Set Build Command: `pnpm build --filter=worker`
4.  Set Start Command: `node apps/worker/dist/index.js`
5.  Add Variables (`DATABASE_URL`, `SCRAPECREATORS_API_KEY`, `WORKER_SECRET`, `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`).
6.  **Important**: You might need a custom Dockerfile for Puppeteer support on these platforms because they don't always have Chrome installed by default. Using the VPS method above is safer for Puppeteer.

---

## 6. Post-Deployment: Category Management
Once deployed, you should:
1.  **Login**: Use your admin credentials (`admin@socialmedia.gov`).
2.  **Create Categories**: Navigate to `/categories` and create at least one category (e.g., "Main Government", "Regional Offices").
3.  **Assign Accounts**: Go to `/accounts` and edit your existing accounts or add new ones, assigning them to the relevant categories.
4.  **Targeted Reporting**: Use the Comparison Report at `/reports` to filter results by category for specialized analysis.
