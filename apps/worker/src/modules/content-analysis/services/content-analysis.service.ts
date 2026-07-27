import type { ContentAnalysisRun, Prisma } from "@repo/database";
import { prisma } from "@repo/database";
import type {
    ContentAnalysisResult,
    ContentPreviewData,
    RunContentAnalysisInput,
    RunContentAnalysisResponse,
} from "@repo/types";
import { logger } from "../../../shared/lib/logger";
import { analyzeContentWithOpenAI } from "./content-analysis-openai.service";
import { buildContentPreview, detectContentSource } from "./content-analysis-preview.service";

export async function runContentAnalysis(
    input: RunContentAnalysisInput,
): Promise<RunContentAnalysisResponse> {
    const account = await prisma.account.findUnique({
        where: { id: input.accountId },
        select: { id: true },
    });

    if (!account) {
        throw new Error("Akun tidak ditemukan.");
    }

    const detected = detectContentSource(input.sourceUrl);
    const run = await prisma.contentAnalysisRun.create({
        data: {
            accountId: input.accountId,
            requestedById: input.requestedById ?? null,
            platform: detected.platform,
            sourceKind: detected.sourceKind,
            sourceUrl: detected.url,
            targetLabel: input.targetLabel?.trim() || "Kemendikdasmen",
        },
    });

    void processContentAnalysisRun(run.id).catch((error) => {
        logger.error({ error, runId: run.id }, "Unhandled content analysis processing error");
    });

    return {
        analysisRunId: run.id,
    };
}

async function processContentAnalysisRun(runId: string) {
    const run = await prisma.contentAnalysisRun.findUnique({
        where: { id: runId },
    });

    if (!run) {
        throw new Error("Content analysis run not found.");
    }

    await prisma.contentAnalysisRun.update({
        where: { id: runId },
        data: {
            status: "RUNNING",
        },
    });

    try {
        const detected = detectContentSource(run.sourceUrl);
        const previewResolution = await buildContentPreview(detected);
        const analysis = await analyzeContentWithOpenAI({
            platform: previewResolution.platform,
            targetLabel: run.targetLabel,
            preview: previewResolution.preview,
        });

        await prisma.contentAnalysisRun.update({
            where: { id: runId },
            data: buildCompletedRunData(
                run,
                previewResolution.preview,
                analysis,
                previewResolution,
            ),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Content analysis failed.";
        await prisma.contentAnalysisRun.update({
            where: { id: runId },
            data: {
                status: "FAILED",
                error: message,
            },
        });
        throw error;
    }
}

function buildCompletedRunData(
    run: ContentAnalysisRun,
    preview: ContentPreviewData,
    analysis: ContentAnalysisResult,
    resolution: {
        platform: ContentAnalysisRun["platform"];
        sourceKind: ContentAnalysisRun["sourceKind"];
        creditsUsed: number;
        authorHandle: string | null;
        authorDisplayName: string | null;
        sourceTitle: string | null;
        publishedAt: Date | null;
        isThread: boolean;
        containsVideo: boolean;
    },
): Prisma.ContentAnalysisRunUpdateInput {
    return {
        status: "COMPLETED",
        platform: resolution.platform,
        sourceKind: resolution.sourceKind,
        authorHandle: resolution.authorHandle,
        authorDisplayName: resolution.authorDisplayName,
        sourceTitle: resolution.sourceTitle,
        publishedAt: resolution.publishedAt,
        isThread: resolution.isThread,
        containsVideo: resolution.containsVideo,
        stance: analysis.stance,
        confidence: analysis.confidence,
        summary: analysis.summary,
        keyIssues: analysis.keyIssues,
        clarificationPoints: analysis.clarificationPoints,
        supportActions: analysis.supportActions,
        counterActions: analysis.counterActions,
        factCheckNotes: analysis.factCheckNotes,
        creditsUsed: resolution.creditsUsed,
        previewJson: preview as unknown as Prisma.InputJsonValue,
        analysisJson: analysis as unknown as Prisma.InputJsonValue,
        scrapedAt: run.scrapedAt ?? new Date(),
        analyzedAt: new Date(),
        error: null,
    };
}
