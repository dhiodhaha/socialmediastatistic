"use server";

import { type Platform, prisma } from "@repo/database";
import {
    baselineMonthKey,
    buildIndividualQuarterlySnapshotSummary,
    estimateIndividualReportCredits,
    type IndividualReportRequest,
    monthKey,
    quarterEndMonthKey,
    validateIndividualReportRequest,
} from "@/modules/individual-reports/lib/individual-quarterly-report";
import { auth } from "@/shared/lib/auth";

export async function getIndividualReportAccountOptions() {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const accounts = await prisma.account.findMany({
        where: { isActive: true },
        orderBy: { username: "asc" },
        select: {
            id: true,
            username: true,
            instagram: true,
            tiktok: true,
            twitter: true,
        },
    });

    return accounts.map((account) => ({
        id: account.id,
        username: account.username,
        handles: {
            INSTAGRAM: account.instagram,
            TIKTOK: account.tiktok,
            TWITTER: account.twitter,
        },
    }));
}

export async function prepareIndividualQuarterlyReportDraft(input: IndividualReportRequest) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const validation = validateIndividualReportRequest(input);
    if (!validation.valid) {
        return { success: false as const, error: validation.error };
    }

    const account = await prisma.account.findUnique({
        where: { id: input.accountId },
        select: {
            id: true,
            username: true,
            instagram: true,
            tiktok: true,
            twitter: true,
            snapshots: {
                where: { platform: input.platform },
                orderBy: { scrapedAt: "desc" },
                select: {
                    followers: true,
                    posts: true,
                    likes: true,
                    scrapedAt: true,
                },
            },
        },
    });

    if (!account) {
        return { success: false as const, error: "Account not found." };
    }

    const handle = platformHandle(account, input.platform);
    if (!handle) {
        return { success: false as const, error: "Account does not have this platform handle." };
    }

    const baselineKey = baselineMonthKey(input.year, input.quarter);
    const quarterEndKey = quarterEndMonthKey(input.year, input.quarter);
    const baselineSnapshot =
        account.snapshots.find((snapshot) => monthKey(snapshot.scrapedAt) === baselineKey) || null;
    const quarterEndSnapshot =
        account.snapshots.find((snapshot) => monthKey(snapshot.scrapedAt) === quarterEndKey) ||
        null;

    return {
        success: true as const,
        data: {
            request: input,
            creditEstimate: estimateIndividualReportCredits({
                listingPageLimit: 3,
                detailedContentLimit: 0,
            }),
            report: buildIndividualQuarterlySnapshotSummary({
                accountName: account.username,
                handle,
                platform: input.platform,
                year: input.year,
                quarter: input.quarter,
                baselineSnapshot,
                quarterEndSnapshot,
            }),
            executionModel: {
                mode: "manual-local-first",
                liveScrapingEnabled: false,
                note: "This foundation workflow prepares an objective draft only. Future content reconstruction will require explicit operator confirmation before live ScrapeCreators calls.",
            },
        },
    };
}

function platformHandle(
    account: { instagram: string | null; tiktok: string | null; twitter: string | null },
    platform: Platform,
) {
    if (platform === "INSTAGRAM") return account.instagram;
    if (platform === "TIKTOK") return account.tiktok;
    return account.twitter;
}
