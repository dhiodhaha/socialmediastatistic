"use server";

import { revalidatePath } from "next/cache";
import { callWorkerJson } from "@/modules/individual-reports/lib/individual-report-worker-client";
import { getAuthorizationErrorMessage, requireEditorOrAdmin } from "@/shared/lib/authorization";
import { logger } from "@/shared/lib/logger";
import { getContentAnalysisRunByIdQuery } from "../queries/content-analysis.queries";

export async function runContentAnalysisAction(input: {
    accountId: string;
    sourceUrl: string;
    targetLabel?: string | null;
}) {
    try {
        const session = await requireEditorOrAdmin();

        const result = await callWorkerJson<{ analysisRunId: string }>(
            "/content-analysis/analyze",
            {
                method: "POST",
                body: JSON.stringify({
                    ...input,
                    requestedById: session.user.id,
                }),
            },
        );

        revalidatePath("/content-analysis");
        const queuedRun = await getContentAnalysisRunByIdQuery(result.analysisRunId);

        return {
            success: true,
            data: queuedRun,
        };
    } catch (error) {
        logger.error({ error }, "Failed to queue content analysis");
        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to queue content analysis"),
        };
    }
}
