"use server";

import { prisma } from "@repo/database";
import { getAuthorizationErrorMessage, requireEditorOrAdmin } from "@/shared/lib/authorization";
import { logger } from "@/shared/lib/logger";

export async function getJobStatus(jobId: string) {
    try {
        await requireEditorOrAdmin();

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
        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to fetch job status"),
        };
    }
}
