import "server-only";

import { prisma } from "@repo/database";
import type {
    ContentAnalysisHistoryItem,
    ContentAnalysisResult,
    ContentPreviewData,
    Platform,
} from "@repo/types";

export interface ContentAnalysisAccountOption {
    id: string;
    username: string;
    handles: Record<Platform, string | null>;
}

export interface ContentAnalysisPageData {
    accounts: ContentAnalysisAccountOption[];
    selectedAccountId: string | null;
    history: ContentAnalysisHistoryItem[];
    metrics: {
        totalRuns: number;
        completedRuns: number;
        accountsCovered: number;
        pendingRuns: number;
    };
}

export async function getContentAnalysisPageDataQuery(
    requestedAccountId?: string,
): Promise<ContentAnalysisPageData> {
    const [accounts, metrics] = await Promise.all([
        prisma.account.findMany({
            where: { isActive: true },
            orderBy: { username: "asc" },
            select: {
                id: true,
                username: true,
                instagram: true,
                tiktok: true,
                twitter: true,
            },
        }),
        prisma.contentAnalysisRun.aggregate({
            _count: { _all: true, accountId: true },
            where: {},
        }),
    ]);

    const accountOptions: ContentAnalysisAccountOption[] = accounts.map((account) => ({
        id: account.id,
        username: account.username,
        handles: {
            INSTAGRAM: account.instagram,
            TIKTOK: account.tiktok,
            TWITTER: account.twitter,
            THREADS: null,
            YOUTUBE: null,
        },
    }));

    const selectedAccountId =
        (requestedAccountId && accountOptions.some((account) => account.id === requestedAccountId)
            ? requestedAccountId
            : accountOptions[0]?.id) ?? null;

    const [history, completedRuns, pendingRuns, distinctAccounts] = await Promise.all([
        selectedAccountId
            ? prisma.contentAnalysisRun.findMany({
                  where: { accountId: selectedAccountId },
                  orderBy: [{ createdAt: "desc" }],
                  take: 24,
                  include: {
                      account: {
                          select: {
                              id: true,
                              username: true,
                          },
                      },
                  },
              })
            : Promise.resolve([]),
        prisma.contentAnalysisRun.count({
            where: { status: "COMPLETED" },
        }),
        prisma.contentAnalysisRun.count({
            where: { status: { in: ["PENDING", "RUNNING"] } },
        }),
        prisma.contentAnalysisRun.findMany({
            distinct: ["accountId"],
            select: { accountId: true },
        }),
    ]);

    return {
        accounts: accountOptions,
        selectedAccountId,
        history: history.map(mapContentAnalysisRun),
        metrics: {
            totalRuns: metrics._count._all,
            completedRuns,
            accountsCovered: distinctAccounts.length,
            pendingRuns,
        },
    };
}

export async function getContentAnalysisRunByIdQuery(id: string) {
    const run = await prisma.contentAnalysisRun.findUnique({
        where: { id },
        include: {
            account: {
                select: {
                    id: true,
                    username: true,
                },
            },
        },
    });

    return run ? mapContentAnalysisRun(run) : null;
}

function mapContentAnalysisRun(run: {
    id: string;
    accountId: string;
    account: { username: string };
    platform: Platform;
    status: ContentAnalysisHistoryItem["status"];
    sourceKind: ContentAnalysisHistoryItem["sourceKind"];
    sourceUrl: string;
    targetLabel: string;
    authorHandle: string | null;
    authorDisplayName: string | null;
    sourceTitle: string | null;
    publishedAt: Date | null;
    isThread: boolean;
    containsVideo: boolean;
    stance: ContentAnalysisHistoryItem["stance"];
    confidence: number | null;
    summary: string | null;
    error: string | null;
    creditsUsed: number;
    scrapedAt: Date | null;
    analyzedAt: Date | null;
    createdAt: Date;
    previewJson: unknown;
    analysisJson: unknown;
}): ContentAnalysisHistoryItem {
    return {
        id: run.id,
        accountId: run.accountId,
        accountName: run.account.username,
        platform: run.platform,
        status: run.status,
        sourceKind: run.sourceKind,
        sourceUrl: run.sourceUrl,
        targetLabel: run.targetLabel,
        authorHandle: run.authorHandle,
        authorDisplayName: run.authorDisplayName,
        sourceTitle: run.sourceTitle,
        publishedAt: run.publishedAt,
        isThread: run.isThread,
        containsVideo: run.containsVideo,
        stance: run.stance,
        confidence: run.confidence,
        summary: run.summary,
        error: run.error,
        creditsUsed: run.creditsUsed,
        scrapedAt: run.scrapedAt,
        analyzedAt: run.analyzedAt,
        createdAt: run.createdAt,
        preview: parsePreviewJson(run.previewJson),
        analysis: parseAnalysisJson(run.analysisJson),
    };
}

function parsePreviewJson(value: unknown): ContentPreviewData | null {
    if (!value || typeof value !== "object") return null;
    return value as ContentPreviewData;
}

function parseAnalysisJson(value: unknown): ContentAnalysisResult | null {
    if (!value || typeof value !== "object") return null;
    return value as ContentAnalysisResult;
}
