import "server-only";

import { prisma } from "@repo/database";
import { resolveMonthlyReportingAnchors } from "@/modules/analytics/lib/monthly-reporting";
import {
    deriveQuarterlyOptions,
    type QuarterlyOption,
} from "@/modules/analytics/lib/quarterly-reporting";

export async function getScrapingJobsForReportQuery() {
    const jobs = await prisma.scrapingJob.findMany({
        where: {
            status: "COMPLETED",
        },
        orderBy: {
            createdAt: "desc",
        },
        select: {
            id: true,
            createdAt: true,
            completedAt: true,
            totalAccounts: true,
            reportingYear: true,
            reportingMonth: true,
        },
    });

    return resolveMonthlyReportingAnchors(jobs);
}

export async function getQuarterlyOptionsQuery(): Promise<QuarterlyOption[]> {
    const jobs = await prisma.scrapingJob.findMany({
        where: {
            status: "COMPLETED",
            completedAt: { not: null },
        },
        orderBy: { completedAt: "desc" },
        select: {
            id: true,
            createdAt: true,
            completedAt: true,
            reportingYear: true,
            reportingMonth: true,
        },
    });

    return deriveQuarterlyOptions(jobs);
}
