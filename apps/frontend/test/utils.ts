// This import will now resolve to test/mocks/repo-database.ts thanks to alias
import { type PrismaClient, prisma } from "@repo/database";
import { vi } from "vitest";
import type { DeepMockProxy } from "vitest-mock-extended";

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

export const resetMocks = () => {
    vi.clearAllMocks();
};
