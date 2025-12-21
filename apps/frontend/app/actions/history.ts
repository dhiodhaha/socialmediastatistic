"use server";

import { prisma, Prisma, JobStatus, Platform } from "@repo/database";
import { logger } from "@/lib/logger";

// ... console.error("Failed to fetch scraping history:", error); -> logger.error({ error }, "Failed to fetch scraping history");
// ... console.error("Failed to fetch all scraping history:", error); -> logger.error({ error }, "Failed to fetch all scraping history");
// ... console.error("Export PDF failed:", error); -> logger.error({ error }, "Export PDF failed");
// ... console.error("Export CSV failed:", error); -> logger.error({ error }, "Export CSV failed");

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
        logger.error({ error }, "Failed to fetch scraping history");
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
        logger.error({ error }, "Failed to fetch all scraping history");
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
        logger.error({ error }, "Export PDF failed");
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
        logger.error({ error }, "Export CSV failed");
        return { success: false, error: "Failed to export CSV" };
    }
}
