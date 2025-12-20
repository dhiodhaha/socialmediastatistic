"use server";

import { prisma, Prisma, JobStatus, Platform } from "@repo/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schema for Account
const accountSchema = z.object({
    username: z.string().min(1, "Name is required"),
    instagram: z.string().optional().nullable(),
    tiktok: z.string().optional().nullable(),
    twitter: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
});

export type AccountInput = z.infer<typeof accountSchema>;

export async function getAccounts(page = 1, limit = 10, search = "") {
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
        const accountsWithGrowth = accounts.map(acc => {
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
        console.error("Failed to fetch accounts:", error);
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

        // Ensure at least one handle is provided? Optional but good practice.
        // For now, allowing name-only as placeholder is fine.

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
        console.error("Failed to create account:", error);
        if (error instanceof z.ZodError) {
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
                // Ensure explicit null if passed as empty string? handled by input
            },
        });

        revalidatePath("/accounts");
        return { success: true, data: account };
    } catch (error) {
        console.error("Failed to update account:", error);
        return { success: false, error: "Failed to update account" };
    }
}

export async function deleteAccount(id: string) {
    try {
        await prisma.account.delete({ where: { id } });
        revalidatePath("/accounts");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete account:", error);
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
        console.error("Bulk create failed:", error);
        return { success: false, error: "Bulk create failed" };
    }
}

export interface HistoryFilters {
    startDate?: Date | null;
    endDate?: Date | null;
    status?: string | null;
    platform?: Platform | null;
}

export async function getScrapingHistory(page = 1, limit = 10, filters?: HistoryFilters) {
    try {
        const skip = (page - 1) * limit;

        const where: Prisma.ScrapingJobWhereInput = {};
        if (filters?.status && filters.status !== "ALL") {
            where.status = filters.status as JobStatus;
        }
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt.gte = filters.startDate;
            if (filters.endDate) where.createdAt.lte = filters.endDate;
        }

        const [jobs, total] = await Promise.all([
            prisma.scrapingJob.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma.scrapingJob.count({ where }),
        ]);

        return {
            success: true,
            data: jobs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error("Failed to fetch scraping history:", error);
        return { success: false, error: "Failed to fetch scraping history" };
    }
}

export async function getAllScrapingHistory(filters?: HistoryFilters) {
    try {
        const where: Prisma.ScrapingJobWhereInput = {};
        if (filters?.status && filters.status !== "ALL") {
            where.status = filters.status as JobStatus;
        }
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt.gte = filters.startDate;
            if (filters.endDate) where.createdAt.lte = filters.endDate;
        }

        const jobs = await prisma.scrapingJob.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        return { success: true, data: jobs };
    } catch (error) {
        console.error("Failed to fetch all scraping history:", error);
        return { success: false, error: "Failed to fetch all scraping history" };
    }
}

export async function exportHistoryPdf(filters: HistoryFilters) {
    try {
        const workerUrl = process.env.WORKER_URL;
        const workerSecret = process.env.WORKER_SECRET;

        if (!workerUrl || !workerSecret) {
            return { success: false, error: "System configuration error" };
        }

        const res = await fetch(`${workerUrl}/export/pdf`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${workerSecret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                startDate: filters.startDate,
                endDate: filters.endDate,
                status: filters.status
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            return { success: false, error: `Worker error: ${text}` };
        }

        // We return the buffer as base64 so client can download it
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        return { success: true, data: base64 };
    } catch (error) {
        console.error("Export PDF failed:", error);
        return { success: false, error: "Failed to export PDF" };
    }
}

export async function exportHistoryCsv(filters: HistoryFilters) {
    try {
        const where: Prisma.ScrapingJobWhereInput = {};
        if (filters?.status && filters.status !== "ALL") {
            where.status = filters.status as JobStatus;
        }
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt.gte = filters.startDate;
            if (filters.endDate) where.createdAt.lte = filters.endDate;
        }
        if (filters?.platform) {
            where.snapshots = { some: { platform: filters.platform } };
        }

        const jobs = await prisma.scrapingJob.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        if (!jobs.length) {
            return { success: false, error: "No data to export" };
        }

        // Generate CSV content
        const headers = ["Job ID", "Date", "Status", "Total Accounts", "Completed", "Failed"];
        const rows = jobs.map(job => [
            job.id,
            job.createdAt.toISOString(),
            job.status,
            job.totalAccounts,
            job.completedCount,
            job.failedCount
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const base64 = Buffer.from(csvContent).toString('base64');
        return { success: true, data: base64 };
    } catch (error) {
        console.error("Export CSV failed:", error);
        return { success: false, error: "Failed to export CSV" };
    }
}

const MAX_RETRIES = 3;

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
    try {
        const res = await fetch(url, options);
        if (!res.ok && res.status >= 500 && retries > 0) {
            throw new Error(`Server error: ${res.status}`);
        }
        return res;
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

export async function triggerScrape() {
    try {
        const workerUrl = process.env.WORKER_URL;
        const workerSecret = process.env.WORKER_SECRET;

        if (!workerUrl || !workerSecret) {
            return { success: false, error: "System configuration error" };
        }

        const res = await fetchWithRetry(`${workerUrl}/scrape`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${workerSecret}`,
            },
        });

        if (!res.ok) {
            const text = await res.text();
            return { success: false, error: `Worker error: ${text}` };
        }

        const data = await res.json();
        const jobId = data.jobId || "unknown";

        revalidatePath("/history");
        return { success: true, jobId };
    } catch (error) {
        console.error("Trigger scrape failed:", error);
        return { success: false, error: "Failed to trigger scrape" };
    }
}
