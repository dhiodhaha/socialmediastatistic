import { mockDeep } from 'vitest-mock-extended';
// We can try importing PrismaClient from @prisma/client directly.
// If that fails, we can mock the type too (less type safety but works).
import { PrismaClient } from '@repo/database';

export const prisma = mockDeep<PrismaClient>();
export type { PrismaClient };
// Add other exports if needed (Account, etc.)
// For types used in values (like 'Account'), usually they are just interfaces in TS, 
// so at runtime we don't need to export them unless they are classes or enums used as values.
