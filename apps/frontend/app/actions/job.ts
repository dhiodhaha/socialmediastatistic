"use server";

import { prisma } from "@repo/database";
import { logger } from "@/lib/logger";

export async function getJobStatus(jobId: string) {
    try {
        const job = await prisma.scrapingJob.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                status: true,
                totalAccounts: true,
                completedCount: true,
                failedCount: true,
                startedAt: true,
                completedAt: true,
            },
        });

        if (!job) {
            return { success: false, error: "Job not found" };
        }

        return { success: true, data: job };
    } catch (error) {
        logger.error({ error, jobId }, "Failed to fetch job status");
        return { success: false, error: "Failed to fetch job status" };
    }
}
