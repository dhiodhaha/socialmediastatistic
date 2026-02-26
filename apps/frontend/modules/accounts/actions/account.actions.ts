"use server";

import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { auth } from "@/shared/lib/auth";
import { logger } from "@/shared/lib/logger";
import { type AccountInput, accountSchema } from "@/shared/lib/schemas";

export async function getAccounts(page = 1, limit = 10, search = "", categoryId?: string) {
    try {
        const session = await auth();
        if (!session) {
            return { success: false, error: "Unauthorized" };
        }

        const skip = (page - 1) * limit;

        // Search across username and all handles
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = search
            ? {
                  OR: [
                      { username: { contains: search, mode: "insensitive" as const } },
                      { instagram: { contains: search, mode: "insensitive" as const } },
                      { tiktok: { contains: search, mode: "insensitive" as const } },
                      { twitter: { contains: search, mode: "insensitive" as const } },
                  ],
              }
            : {};

        // Filter by category via many-to-many join table
        if (categoryId && categoryId !== "ALL") {
            where.categories = {
                some: { categoryId: categoryId },
            };
        }

        const [accounts, total] = await Promise.all([
            prisma.account.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    categories: {
                        include: { category: true },
                    },
                    snapshots: {
                        orderBy: { scrapedAt: "desc" },
                        take: 2, // We need latest 2 to calculate growth
                    },
                },
            }),
            prisma.account.count({ where }),
        ]);

        // Calculate growth for each account
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const accountsWithGrowth = accounts.map((acc: any) => {
            let growth: number | null = null;
            if (acc.snapshots && acc.snapshots.length >= 2) {
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
        const err = error as { code?: string; message?: string };
        if (err?.code === "P1001" || err?.message?.includes("Can't reach database")) {
            logger.warn("Database unreachable, returning empty list (Build safe mode)");
            return {
                success: true,
                data: [],
                pagination: {
                    total: 0,
                    page,
                    limit,
                    totalPages: 1,
                },
            };
        }
        return { success: false, error: "Failed to fetch accounts" };
    }
}

export async function createAccount(data: AccountInput) {
    try {
        const session = await auth();
        if (!session) {
            return { success: false, error: "Unauthorized" };
        }

        const validated = accountSchema.parse(data);

        // Check for duplicate username
        const existing = await prisma.account.findUnique({
            where: { username: validated.username },
        });

        if (existing) {
            return { success: false, error: "Account with this name already exists" };
        }

        // Create account with categories via transaction
        const account = await prisma.$transaction(async (tx) => {
            // Create the account first
            const newAccount = await tx.account.create({
                data: {
                    username: validated.username,
                    instagram: validated.instagram || null,
                    tiktok: validated.tiktok || null,
                    twitter: validated.twitter || null,
                    isActive: validated.isActive,
                },
            });

            // Create category associations if any
            if (validated.categoryIds && validated.categoryIds.length > 0) {
                await tx.accountCategory.createMany({
                    data: validated.categoryIds.map((catId) => ({
                        accountId: newAccount.id,
                        categoryId: catId,
                    })),
                });
            }

            return newAccount;
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
        const session = await auth();
        if (!session) {
            return { success: false, error: "Unauthorized" };
        }

        // Update account with categories via transaction
        const account = await prisma.$transaction(async (tx) => {
            // Update the account basic fields
            const { categoryIds, ...accountData } = data;
            const updatedAccount = await tx.account.update({
                where: { id },
                data: accountData,
            });

            // If categoryIds is provided, update category associations
            if (categoryIds !== undefined) {
                // Delete existing associations
                await tx.accountCategory.deleteMany({
                    where: { accountId: id },
                });

                // Create new associations
                if (categoryIds.length > 0) {
                    await tx.accountCategory.createMany({
                        data: categoryIds.map((catId) => ({
                            accountId: id,
                            categoryId: catId,
                        })),
                    });
                }
            }

            return updatedAccount;
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
        const session = await auth();
        if (!session) {
            return { success: false, error: "Unauthorized" };
        }

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
        const session = await auth();
        if (!session) {
            return { success: false, error: "Unauthorized" };
        }

        let successCount = 0;
        const errors: string[] = [];

        for (const acc of accounts) {
            // Handle category auto-creation/lookup if categoryName is provided but categoryIds is empty
            if (acc.categoryName && (!acc.categoryIds || acc.categoryIds.length === 0)) {
                const catName = acc.categoryName.trim();
                if (catName) {
                    let cat = await prisma.category.findUnique({ where: { name: catName } });
                    if (!cat) {
                        cat = await prisma.category.create({ data: { name: catName } });
                    }
                    acc.categoryIds = [cat.id];
                }
            }

            try {
                // Try to create the account directly first
                const result = await createAccount(acc);
                if (result.success) {
                    successCount++;
                    continue;
                }

                // If creation failed specifically because account exists, we try to merge the category
                if (result.error === "Account with this name already exists") {
                    // Find the existing account
                    const existingAccount = await prisma.account.findUnique({
                        where: { username: acc.username },
                    });

                    if (existingAccount && acc.categoryIds && acc.categoryIds.length > 0) {
                        // Check if connection already exists, if not create it
                        for (const catId of acc.categoryIds) {
                            const existingLink = await prisma.accountCategory.findUnique({
                                where: {
                                    accountId_categoryId: {
                                        accountId: existingAccount.id,
                                        categoryId: catId,
                                    },
                                },
                            });

                            if (!existingLink) {
                                await prisma.accountCategory.create({
                                    data: {
                                        accountId: existingAccount.id,
                                        categoryId: catId,
                                    },
                                });
                            }
                        }
                        successCount++; // Count as success since we successfully "imported" (updated) it
                    } else {
                        // If no category to add or account not found (unlikely), treat as original error
                        errors.push(`${acc.username}: ${result.error}`);
                    }
                } else {
                    errors.push(`${acc.username}: ${result.error}`);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                errors.push(`${acc.username}: ${err.message || "Unknown error"}`);
            }
        }

        revalidatePath("/accounts");
        return {
            success: true,
            count: successCount,
            errors: errors.length > 0 ? errors : undefined,
        };
    } catch (error) {
        logger.error({ error }, "Bulk create failed");
        return { success: false, error: "Bulk create failed" };
    }
}

/**
 * Get accounts that had errors in the latest scraping job
 */
export async function getAccountsWithErrors() {
    try {
        const session = await auth();
        if (!session) {
            return { success: false, error: "Unauthorized", data: [] };
        }

        // Get the latest completed job with errors
        const latestJob = await prisma.scrapingJob.findFirst({
            where: {
                status: "COMPLETED",
                failedCount: { gt: 0 },
            },
            orderBy: { completedAt: "desc" },
            select: {
                id: true,
                errors: true,
                completedAt: true,
            },
        });

        if (!latestJob || !latestJob.errors) {
            return { success: true, data: [], jobId: null, jobDate: null };
        }

        const errors = latestJob.errors as Array<{
            accountId: string;
            platform: string;
            handle: string;
            error: string;
            timestamp: string;
        }>;

        // Get unique account IDs from errors
        const accountIds = [
            ...new Set(errors.map((e) => e.accountId).filter((id) => id !== "system")),
        ];

        // Fetch account details
        const accounts = await prisma.account.findMany({
            where: { id: { in: accountIds } },
            include: {
                categories: {
                    include: { category: true },
                },
            },
        });

        // Merge account info with error details
        const accountsWithErrors = accounts.map((acc) => {
            const accErrors = errors.filter((e) => e.accountId === acc.id);
            return {
                ...acc,
                errors: accErrors.map((e) => ({
                    platform: e.platform,
                    handle: e.handle,
                    error: e.error,
                })),
            };
        });

        return {
            success: true,
            data: accountsWithErrors,
            jobId: latestJob.id,
            jobDate: latestJob.completedAt,
        };
    } catch (error) {
        logger.error({ error }, "Failed to get accounts with errors");
        return { success: false, error: "Failed to get accounts with errors", data: [] };
    }
}
