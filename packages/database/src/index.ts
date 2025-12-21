import { PrismaClient } from ".prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

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

  // Pass connection string directly to PrismaNeon (not a Pool object)
  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
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
