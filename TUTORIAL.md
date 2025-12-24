# Deployment Tutorial

> [**Main README**](./README.md) | [**Deployment Tutorial**](./TUTORIAL.md) | [**Local Development**](./LOCAL_DEVELOPMENT.md)

This guide covers deploying the Social Media Statistics application to production.

## Architecture Overview

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│     Users       │ ◄────────────► │  Vercel Frontend │
└─────────────────┘                └────────┬─────────┘
                                            │
                                            │ WORKER_SECRET
                                            ▼
                               ┌──────────────────────┐
                               │   VPS Worker (Docker)│
                               │   - Scraper Engine   │
                               │   - PDF Generator    │
                               │   - Cron Scheduler   │
                               └──────────┬───────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │   PostgreSQL DB      │
                               │  (Neon/Supabase/etc) │
                               └──────────────────────┘
```

---

## 1. Database Setup (PostgreSQL)

You need a PostgreSQL database accessible by both frontend and worker.

**Recommended Providers:**
- [Neon](https://neon.tech) (serverless, generous free tier)
- [Supabase](https://supabase.com) (includes auth features)
- [Railway](https://railway.app) (simple setup)

**Steps:**
1. Create a PostgreSQL database.
2. Get the connection string (`DATABASE_URL`).
3. Run migrations from your local machine:
   ```bash
   DATABASE_URL="your_connection_string" pnpm db:push
   ```

---

## 2. Environment Variables Reference

| Variable | Where Used | Description |
|:---------|:-----------|:------------|
| `DATABASE_URL` | Frontend + Worker | PostgreSQL connection string |
| `WORKER_SECRET` | Frontend + Worker | Shared auth secret (generate with `openssl rand -hex 32`) |
| `SCRAPECREATORS_API_KEY` | Worker only | API key from [ScrapeCreators](https://scrapecreators.com) |
| `NEXTAUTH_SECRET` | Frontend only | Session encryption (generate with `openssl rand -hex 32`) |
| `NEXTAUTH_URL` | Frontend only | Your Vercel domain (e.g., `https://myapp.vercel.app`) |
| `WORKER_URL` | Frontend only | Worker endpoint (e.g., `http://123.45.67.89:4000`) |

---

## 3. Frontend Deployment (Vercel)

The frontend is a Next.js 16 application that serves the dashboard.

**Steps:**
1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com) → **Add New Project**.
3. Import your repository.
4. Configure:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `apps/frontend`
5. Add **Environment Variables**:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your Vercel URL)
   - `WORKER_URL` (your VPS URL with port)
   - `WORKER_SECRET`
6. Click **Deploy**.

---

## 4. Worker Deployment (VPS with Docker)

The worker handles scraping, PDF generation, and scheduled jobs.

**Prerequisites:**
- VPS (DigitalOcean, Hetzner, AWS EC2, Vultr)
- Docker & Docker Compose installed

### Step-by-Step

**1. Clone the repo on your VPS:**
```bash
git clone https://github.com/your/repo.git social-stats
cd social-stats
```

**2. Create `.env` file in project root:**
```env
DATABASE_URL=postgres://user:pass@host:5432/db
SCRAPECREATORS_API_KEY=your_api_key
WORKER_SECRET=your_shared_secret
```

**3. Deploy with Docker Compose:**
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**4. Verify:**
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Test endpoint
curl http://localhost:4000/health
```

### Updating the Worker
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Firewall Configuration
Allow port 4000 from your Vercel servers:
```bash
# UFW example
sudo ufw allow 4000
```

---

## 5. Alternative: Railway/Render Worker

If you prefer managed hosting:

**Railway:**
1. Connect GitHub repo.
2. Set Root Directory: `apps/worker`
3. Build Command: `pnpm build --filter=worker`
4. Start Command: `node apps/worker/dist/index.js`
5. Environment Variables:
   - `DATABASE_URL`
   - `SCRAPECREATORS_API_KEY`
   - `WORKER_SECRET`
   - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`

> ⚠️ **Note**: Railway/Render may not have Chromium pre-installed. You might need a custom Dockerfile. VPS with Docker is more reliable for Puppeteer workloads.

---

## 6. Post-Deployment Checklist

1. **Create Admin User**: The seed script creates `admin@socialmedia.gov` / `admin123`
2. **Create Categories**: Go to `/categories` and create categories (e.g., "Government", "Regional")
3. **Add Accounts**: Navigate to `/accounts` and add social media accounts
4. **Test Scraping**: Use the "Scrape Now" button on `/history` page
5. **Check Reports**: View growth reports at `/reports`

---

## 7. Monitoring & Logs

**Worker logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f worker
```

**Vercel logs:**
- Go to Vercel Dashboard → Your Project → Logs

**Database queries:**
- Use Prisma Studio locally:
  ```bash
  DATABASE_URL="..." npx prisma studio
  ```
