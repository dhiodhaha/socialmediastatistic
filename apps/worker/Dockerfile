FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Build stage
FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build worker and its dependencies
RUN pnpm build --filter=worker...

# Isolate the worker for production
# This creates a deployable folder with just the necessary files and production deps
RUN pnpm deploy --filter=worker --prod /prod/worker

# Final stage
FROM base AS worker
# Install necessary system libs for Puppeteer (Chromium)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY --from=build /prod/worker /usr/src/app
WORKDIR /usr/src/app

EXPOSE 4000
CMD [ "node", "dist/index.js" ]
