"use server";

import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { accountSchema, type AccountInput } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export { accountSchema };
export type { AccountInput };

export async function getAccounts(page = 1, limit = 10, search = "") {
    // Build time safety check
    if (!process.env.DATABASE_URL) {
        console.warn("DATABASE_URL not found, returning empty accounts (Build mode)");
        return {
            success: true,
            data: [],
            pagination: { total: 0, page, limit, totalPages: 1 }
        };
    }

    try {
        const skip = (page - 1) * limit;

        // Search across username and all handles
        const where = search
            ? {
                OR: [
                    { username: { contains: search, mode: "insensitive" as const } },
                    { instagram: { contains: search, mode: "insensitive" as const } },
                    { tiktok: { contains: search, mode: "insensitive" as const } },
                    { twitter: { contains: search, mode: "insensitive" as const } },
                ],
            }
            : {};

        const [accounts, total] = await Promise.all([
            prisma.account.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    snapshots: {
                        orderBy: { scrapedAt: "desc" },
                        take: 2 // We need latest 2 to calculate growth
                    }
                }
            }),
            prisma.account.count({ where }),
        ]);

        // Calculate growth for each account
        const accountsWithGrowth = accounts.map((acc: typeof accounts[number]) => {
            let growth: number | null = null;
            if (acc.snapshots.length >= 2) {
                const latest = acc.snapshots[0].followers;
                const prev = acc.snapshots[1].followers;
                if (prev > 0) {
                    growth = ((latest - prev) / prev) * 100;
                }
            }
            return { ...acc, growth };
        });

        return {
            success: true,
            data: accountsWithGrowth,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error({ error }, "Failed to fetch accounts");
        // If it's a connection error (common during build), return empty compatible response
        const err = error as { code?: string, message?: string };
        if (err?.code === 'P1001' || err?.message?.includes('Can\'t reach database')) {
            logger.warn("Database unreachable, returning empty list (Build safe mode)");
            return {
                success: true,
                data: [],
                pagination: {
                    total: 0,
                    page,
                    limit,
                    totalPages: 1
                }
            };
        }
        return { success: false, error: "Failed to fetch accounts" };
    }
}

export async function createAccount(data: AccountInput) {
    try {
        const validated = accountSchema.parse(data);

        // Check for duplicate username
        const existing = await prisma.account.findUnique({
            where: { username: validated.username },
        });

        if (existing) {
            return { success: false, error: "Account with this name already exists" };
        }

        const account = await prisma.account.create({
            data: {
                username: validated.username,
                instagram: validated.instagram || null,
                tiktok: validated.tiktok || null,
                twitter: validated.twitter || null,
                isActive: validated.isActive,
            },
        });

        revalidatePath("/accounts");
        return { success: true, data: account };
    } catch (error) {
        logger.error({ error }, "Failed to create account");
        if (error instanceof ZodError) {
            return { success: false, error: error.issues[0].message };
        }
        return { success: false, error: "Failed to create account" };
    }
}

export async function updateAccount(id: string, data: Partial<AccountInput>) {
    try {
        const account = await prisma.account.update({
            where: { id },
            data: {
                ...data,
            },
        });

        revalidatePath("/accounts");
        return { success: true, data: account };
    } catch (error) {
        logger.error({ error, id }, "Failed to update account");
        return { success: false, error: "Failed to update account" };
    }
}

export async function deleteAccount(id: string) {
    try {
        await prisma.account.delete({ where: { id } });
        revalidatePath("/accounts");
        return { success: true };
    } catch (error) {
        logger.error({ error, id }, "Failed to delete account");
        return { success: false, error: "Failed to delete account" };
    }
}

export async function bulkCreateAccounts(accounts: AccountInput[]) {
    try {
        let successCount = 0;
        const errors: string[] = [];

        for (const acc of accounts) {
            const result = await createAccount(acc);
            if (result.success) {
                successCount++;
            } else {
                errors.push(`${acc.username}: ${result.error}`);
            }
        }

        revalidatePath("/accounts");
        return {
            success: true,
            count: successCount,
            errors: errors.length > 0 ? errors : undefined
        };
    } catch (error) {
        logger.error({ error }, "Bulk create failed");
        return { success: false, error: "Bulk create failed" };
    }
}
