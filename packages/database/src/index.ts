import { PrismaClient } from ".prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Re-export Prisma types for use across the monorepo
export * from ".prisma/client";
export type { Platform, JobStatus } from ".prisma/client";

// Global Prisma client singleton for development hot-reloading
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Set up WebSocket for Node.js environment
  neonConfig.webSocketConstructor = ws;

  // Initialize Pool and pass it to PrismaNeon
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool as any);

  const isProduction = process.env.NODE_ENV === "production";

  return new PrismaClient({
    adapter,
    log: isProduction ? ["error"] : ["query", "error", "warn"],
  });
}

// Getter function that creates client on first access
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Export as a getter property using Proxy
// This delays client creation until first property access
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export { getPrismaClient as getPrisma };
export default prisma;
