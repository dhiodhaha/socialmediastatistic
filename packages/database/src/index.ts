import { PrismaClient } from ".prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

export type { JobStatus, Platform } from ".prisma/client";
// Re-export Prisma types for use across the monorepo
export * from ".prisma/client";

// Global Prisma client singleton for development hot-reloading
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is not set");
    }

    try {
        // Prisma v7+: PrismaNeon accepts connectionString directly (no Pool/ws needed)
        const adapter = new PrismaNeon({ connectionString });

        const isProduction = process.env.NODE_ENV === "production";

        return new PrismaClient({
            adapter,
            log: isProduction ? ["error"] : ["query", "error", "warn"],
        });
    } catch (error) {
        console.error("[database] Failed to create Prisma client:", error);
        throw error;
    }
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
        // Allow Symbol.toPrimitive and toJSON to avoid swallowing errors during serialization
        if (prop === Symbol.toPrimitive || prop === "toJSON" || prop === Symbol.toStringTag) {
            return undefined;
        }
        try {
            const client = getPrismaClient();
            const value = (client as unknown as Record<string | symbol, unknown>)[prop];
            if (typeof value === "function") {
                return value.bind(client);
            }
            return value;
        } catch (error) {
            console.error(
                `[database] Prisma client initialization failed on access to "${String(prop)}":`,
                error,
            );
            throw error;
        }
    },
});

export { getPrismaClient as getPrisma };
export default prisma;
