# Local Development & Testing Guide

This guide will help you set up the **Social Media Statistics** project locally for development and testing.

## 1. Prerequisites

Ensure you have the following installed:
-   **Node.js** (v18 or higher)
-   **pnpm** (preferred package manager)
-   **PostgreSQL** (Database)
-   **Redis** (Optional, if used by the worker for queues, though currently it seems to use internal scheduling)

## 2. Clone and Install Dependencies

```bash
# Install dependencies for all apps (root, frontend, worker)
pnpm install
```

## 3. Environment Configuration

You need to configure environment variables for both the **Frontend** and the **Worker**.

### A. Frontend Setup (`apps/frontend`)

1.  Navigate to `apps/frontend`.
2.  Copy `.env.example` to `.env`.
    ```bash
    cp apps/frontend/.env.example apps/frontend/.env
    ```
3.  Fill in the values in `apps/frontend/.env`:

    | Variable | Description | Example |
    | :--- | :--- | :--- |
    | `DATABASE_URL` | Connection string to your local Postgres database. | `postgresql://postgres:postgres@localhost:5432/socialstats_dev` |
    | `NEXTAUTH_SECRET` | A random string for session security. | `development-secret-key-123` |
    | `NEXTAUTH_URL` | The URL where the frontend runs locally. | `http://localhost:3000` |
    | `AUTH_SECRET` | Secret for Auth.js (same as NEXTAUTH_SECRET). | `development-secret-key-123` |
    | `WORKER_URL` | URL of the running worker service. | `http://localhost:4000` |
    | `WORKER_SECRET` | Shared secret to secure communication with worker. | `local-worker-secret` |

### B. Worker Setup (`apps/worker`)

1.  Navigate to `apps/worker`.
2.  Copy `.env.example` to `.env`.
    ```bash
    cp apps/worker/.env.example apps/worker/.env
    ```
3.  Fill in the values in `apps/worker/.env`:

    | Variable | Description | Example |
    | :--- | :--- | :--- |
    | `PORT` | Port for the worker server. | `4000` |
    | `WORKER_SECRET` | Must match the one in Frontend. | `local-worker-secret` |
    | `DATABASE_URL` | Connection string (same as Frontend). | `postgresql://postgres:postgres@localhost:5432/socialstats_dev` |
    | `SCRAPECREATORS_API_KEY`| API Key for external scraping service. | Get from [ScrapeCreators](https://scrapecreators.com) or use dummy for dev if mocked. |

## 4. Database Setup

You need a running PostgreSQL instance. If you don't have one, you can run one using Docker:

```bash
docker run --name socialstats-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=socialstats_dev -p 5432:5432 -d postgres
```

Once the database is running:

```bash
# Push the schema to the database
pnpm db:push

# (Optional) Seed the database if seeded script exists
# pnpm db:seed 
```

## 5. Running the Application

You can run both the frontend and worker simultaneously from the root directory using Turbo:

```bash
pnpm dev
```

-   **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
-   **Worker API**: [http://localhost:4000](http://localhost:4000)

## 6. Testing the Flow

### Triggering a Manual Scrape
1.  Open the Dashboard at `http://localhost:3000`.
2.  Go to the settings or a specific creator page.
3.  Click the **"Refresh Data"** or **"Scrape"** button.
4.  Check the **Terminal** where `pnpm dev` is running. You should see logs from the `worker` app indicating it received the request and is processing it.

### Verifying Database Data
You can use Prisma Studio to inspect the data in your database:

```bash
npx prisma studio --schema=packages/database/prisma/schema.prisma
```
*(Note: Adjust the schema path if necessary, or check `package.json` for `db:studio` scripts)*

## 7. Running Tests

To run the automated test suite:

```bash
# Run all tests
pnpm test

# Run only frontend tests
pnpm test --filter=frontend
```
