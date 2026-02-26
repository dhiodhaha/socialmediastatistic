/**
 * Migration script to copy existing Account.categoryId to AccountCategory join table.
 * Run this script once after schema update.
 *
 * Usage: cd packages/database && npx tsx scripts/migrate-categories.ts
 */

import "dotenv/config";
import { PrismaClient } from ".prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function migrateCategories() {
    console.log("Starting category migration...");

    // Find all accounts with a categoryId
    const accountsWithCategory = await prisma.account.findMany({
        where: {
            categoryId: { not: null },
        },
        select: {
            id: true,
            username: true,
            categoryId: true,
        },
    });

    console.log(`Found ${accountsWithCategory.length} accounts with categories to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const account of accountsWithCategory) {
        if (!account.categoryId) continue;

        try {
            // Check if already exists in join table
            const existing = await prisma.accountCategory.findUnique({
                where: {
                    accountId_categoryId: {
                        accountId: account.id,
                        categoryId: account.categoryId,
                    },
                },
            });

            if (existing) {
                console.log(`  Skipping ${account.username} - already migrated`);
                skipped++;
                continue;
            }

            // Create join table entry
            await prisma.accountCategory.create({
                data: {
                    accountId: account.id,
                    categoryId: account.categoryId,
                },
            });

            console.log(`  Migrated ${account.username} -> category ${account.categoryId}`);
            migrated++;
        } catch (error) {
            console.error(`  Failed to migrate ${account.username}:`, error);
        }
    }

    console.log("\n--- Migration Summary ---");
    console.log(`Total accounts: ${accountsWithCategory.length}`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped: ${skipped}`);
    console.log("\nMigration complete!");
    console.log("NOTE: You can now remove Account.categoryId from schema.prisma if desired.");
}

migrateCategories()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
