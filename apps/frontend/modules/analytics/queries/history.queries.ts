import "server-only";

import { type JobStatus, type Platform, type Prisma, prisma } from "@repo/database";

export interface HistoryQueryFilters {
    startDate?: Date | null;
    endDate?: Date | null;
    status?: string | null;
    platform?: Platform | null;
}

export async function getScrapingHistoryQuery(page = 1, limit = 10, filters?: HistoryQueryFilters) {
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
        data: jobs,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function getActiveScrapingJobQuery() {
    return prisma.scrapingJob.findFirst({
        where: { status: { in: ["PENDING", "RUNNING"] } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
    });
}
