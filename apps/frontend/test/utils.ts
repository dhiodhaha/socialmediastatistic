import { PrismaClient } from '@repo/database';
import { DeepMockProxy } from 'vitest-mock-extended';
import { vi } from 'vitest';
// This import will now resolve to test/mocks/repo-database.ts thanks to alias
import { prisma } from '@repo/database';

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

export const resetMocks = () => {
    vi.clearAllMocks();
};
