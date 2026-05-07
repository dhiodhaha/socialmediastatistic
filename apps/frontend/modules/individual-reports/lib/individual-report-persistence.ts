import { type Prisma, prisma } from "@repo/database";
import type { PortfolioPlatform as Platform } from "@repo/types";
import type { PlatformResultJson } from "@/modules/individual-reports/lib/individual-report-types";
import {
    type QuarterSelection,
    quarterBounds,
    type SnapshotStatPoint,
} from "@/modules/individual-reports/lib/quarter-stat-comparison";

export async function findQuarterSnapshots(
    accountId: string,
    quarter: QuarterSelection,
    platforms: Platform[],
): Promise<SnapshotStatPoint[]> {
    const bounds = quarterBounds(quarter);
    const rows = await prisma.snapshot.findMany({
        where: {
            accountId,
            platform: { in: platforms },
            scrapedAt: {
                gte: bounds.start,
                lte: bounds.end,
            },
        },
        select: {
            platform: true,
            followers: true,
            posts: true,
            likes: true,
            engagement: true,
            scrapedAt: true,
            source: true,
            sourceNote: true,
        },
        orderBy: { scrapedAt: "desc" },
    });

    return rows.map((snapshot) => ({
        platform: snapshot.platform as Platform,
        followers: snapshot.followers,
        posts: snapshot.posts,
        likes: snapshot.likes,
        engagement: snapshot.engagement,
        scrapedAt: snapshot.scrapedAt,
        source: snapshot.source as "SCRAPED" | "MANUAL",
        sourceNote: snapshot.sourceNote,
    }));
}

export async function createRun(input: {
    accountId: string;
    year: number;
    quarter: number;
    estimatedCredits: number;
}): Promise<{ id: string; createdAt: Date }> {
    const delegate = runDelegate();
    if (delegate) {
        return delegate.create({
            data: {
                accountId: input.accountId,
                year: input.year,
                quarter: input.quarter,
                estimatedCredits: input.estimatedCredits,
                actualCreditsUsed: 0,
                status: "PARTIAL",
            },
            select: { id: true, createdAt: true },
        });
    }

    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; createdAt: Date }>>(
        `INSERT INTO "IndividualReportRun" ("id","accountId","year","quarter","status","estimatedCredits","actualCreditsUsed","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,'PARTIAL'::"IndividualReportStatus",$5,0,NOW(),NOW())
         RETURNING "id","createdAt"`,
        crypto.randomUUID(),
        input.accountId,
        input.year,
        input.quarter,
        input.estimatedCredits,
    );
    if (!rows[0]) throw new Error("Failed to create run.");
    return rows[0];
}

export async function updateRunStatus(
    runId: string,
    status: "COMPLETE" | "PARTIAL" | "FAILED",
    actualCreditsUsed: number,
) {
    const delegate = runDelegate();
    if (delegate) {
        await delegate.update({
            where: { id: runId },
            data: { status, actualCreditsUsed },
        });
        return;
    }

    await prisma.$queryRawUnsafe(
        `UPDATE "IndividualReportRun" SET "status"=$1::"IndividualReportStatus","actualCreditsUsed"=$2,"updatedAt"=NOW() WHERE "id"=$3`,
        status,
        actualCreditsUsed,
        runId,
    );
}

export async function savePlatformResult(input: {
    runId: string;
    platform: Platform;
    handle: string;
    status: "SUCCESS" | "FAILED";
    creditsUsed: number;
    resultJson: PlatformResultJson;
    error?: string;
}) {
    const delegate = platformResultDelegate();
    if (delegate) {
        await delegate.create({
            data: {
                runId: input.runId,
                platform: input.platform,
                handle: input.handle,
                status: input.status,
                creditsUsed: input.creditsUsed,
                resultJson: toPrismaJson(input.resultJson),
                error: input.error ?? null,
                scrapedAt: new Date(),
            },
        });
        return;
    }

    await prisma.$queryRawUnsafe(
        `INSERT INTO "IndividualReportPlatformResult" ("id","runId","platform","handle","status","creditsUsed","resultJson","error","scrapedAt","createdAt","updatedAt")
         VALUES ($1,$2,$3::"Platform",$4,$5::"IndividualReportPlatformStatus",$6,$7::jsonb,$8,NOW(),NOW(),NOW())`,
        crypto.randomUUID(),
        input.runId,
        input.platform,
        input.handle,
        input.status,
        input.creditsUsed,
        JSON.stringify(input.resultJson),
        input.error ?? null,
    );
}

export async function findIndividualReportRuns(accountId?: string) {
    const delegate = runDelegate();
    if (delegate) {
        const runs = await delegate.findMany({
            where: accountId ? { accountId } : undefined,
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                accountId: true,
                year: true,
                quarter: true,
                status: true,
                estimatedCredits: true,
                actualCreditsUsed: true,
                createdAt: true,
                account: { select: { username: true } },
                platformResults: {
                    select: {
                        id: true,
                        platform: true,
                        handle: true,
                        status: true,
                        creditsUsed: true,
                        error: true,
                        scrapedAt: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        return runs.map((run) => ({
            id: run.id,
            accountId: run.accountId,
            accountName: run.account.username,
            year: run.year,
            quarter: run.quarter,
            status: run.status as string,
            estimatedCredits: run.estimatedCredits,
            actualCreditsUsed: run.actualCreditsUsed,
            createdAt: run.createdAt.toISOString(),
            platformResults: run.platformResults.map((result) => ({
                id: result.id,
                platform: result.platform as Platform,
                handle: result.handle,
                status: result.status as string,
                creditsUsed: result.creditsUsed,
                error: result.error,
                scrapedAt: result.scrapedAt?.toISOString() ?? null,
            })),
        }));
    }

    const rows = await prisma.$queryRawUnsafe<
        Array<{
            id: string;
            accountId: string;
            accountName: string;
            year: number;
            quarter: number;
            status: string;
            estimatedCredits: number;
            actualCreditsUsed: number;
            createdAt: Date;
        }>
    >(
        `SELECT r."id",r."accountId",a."username" AS "accountName",r."year",r."quarter",r."status"::text,r."estimatedCredits",r."actualCreditsUsed",r."createdAt"
         FROM "IndividualReportRun" r JOIN "Account" a ON a."id"=r."accountId"
         WHERE ($1::text IS NULL OR r."accountId"=$2)
         ORDER BY r."createdAt" DESC LIMIT 20`,
        accountId ?? null,
        accountId ?? null,
    );

    const runIds = rows.map((row) => row.id);
    const resultRows =
        runIds.length > 0
            ? await prisma.$queryRawUnsafe<
                  Array<{
                      id: string;
                      runId: string;
                      platform: string;
                      handle: string;
                      status: string;
                      creditsUsed: number;
                      error: string | null;
                      scrapedAt: Date | null;
                  }>
              >(
                  `SELECT "id","runId","platform"::text,"handle","status"::text,"creditsUsed","error","scrapedAt"
                   FROM "IndividualReportPlatformResult"
                   WHERE "runId" = ANY($1::text[])
                   ORDER BY "createdAt" ASC`,
                  runIds,
              )
            : [];

    return rows.map((run) => ({
        id: run.id,
        accountId: run.accountId,
        accountName: run.accountName,
        year: Number(run.year),
        quarter: Number(run.quarter),
        status: run.status,
        estimatedCredits: run.estimatedCredits,
        actualCreditsUsed: run.actualCreditsUsed,
        createdAt: run.createdAt.toISOString(),
        platformResults: resultRows
            .filter((result) => result.runId === run.id)
            .map((result) => ({
                id: result.id,
                platform: result.platform as Platform,
                handle: result.handle,
                status: result.status,
                creditsUsed: result.creditsUsed,
                error: result.error,
                scrapedAt: result.scrapedAt?.toISOString() ?? null,
            })),
    }));
}

export async function getFailedPlatformsForPeriod(
    accountId: string,
    year: number,
    quarter: number,
): Promise<Platform[]> {
    const allResults = await findLatestSuccessfulPlatformResults(accountId, year, quarter);
    const successfulPlatforms = new Set(allResults.map((result) => result.platform));

    const delegate = platformResultDelegate();
    if (delegate) {
        const attempted = await delegate.findMany({
            where: {
                run: { accountId, year, quarter },
            },
            select: { platform: true },
            distinct: ["platform"],
        });

        return attempted
            .map((result) => result.platform as Platform)
            .filter((platform) => !successfulPlatforms.has(platform));
    }

    const rows = await prisma.$queryRawUnsafe<Array<{ platform: string }>>(
        `SELECT DISTINCT pr."platform"::text
         FROM "IndividualReportPlatformResult" pr
         JOIN "IndividualReportRun" r ON r."id"=pr."runId"
         WHERE r."accountId"=$1 AND r."year"=$2 AND r."quarter"=$3`,
        accountId,
        year,
        quarter,
    );

    return rows
        .map((row) => row.platform as Platform)
        .filter((platform) => !successfulPlatforms.has(platform));
}

export async function findLatestSuccessfulPlatformResults(
    accountId: string,
    year: number,
    quarter: number,
) {
    const delegate = platformResultDelegate();
    if (delegate) {
        const allSuccessful = await delegate.findMany({
            where: {
                run: { accountId, year, quarter },
                status: "SUCCESS",
            },
            select: {
                id: true,
                platform: true,
                handle: true,
                status: true,
                creditsUsed: true,
                resultJson: true,
                scrapedAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });

        const seen = new Set<string>();
        return allSuccessful
            .filter((result) => {
                if (seen.has(result.platform)) return false;
                seen.add(result.platform);
                return true;
            })
            .map((result) => ({
                id: result.id,
                platform: result.platform as Platform,
                handle: result.handle,
                status: result.status as string,
                creditsUsed: result.creditsUsed,
                resultJson: result.resultJson,
                scrapedAt: result.scrapedAt?.toISOString() ?? null,
            }));
    }

    const rows = await prisma.$queryRawUnsafe<
        Array<{
            id: string;
            platform: string;
            handle: string;
            status: string;
            creditsUsed: number;
            resultJson: Prisma.JsonValue;
            scrapedAt: Date | null;
        }>
    >(
        `SELECT DISTINCT ON (pr."platform") pr."id",pr."platform"::text,pr."handle",pr."status"::text,pr."creditsUsed",pr."resultJson",pr."scrapedAt"
         FROM "IndividualReportPlatformResult" pr
         JOIN "IndividualReportRun" r ON r."id"=pr."runId"
         WHERE r."accountId"=$1 AND r."year"=$2 AND r."quarter"=$3 AND pr."status"='SUCCESS'
         ORDER BY pr."platform", pr."createdAt" DESC`,
        accountId,
        year,
        quarter,
    );

    return rows.map((row) => ({
        id: row.id,
        platform: row.platform as Platform,
        handle: row.handle,
        status: row.status,
        creditsUsed: row.creditsUsed,
        resultJson: row.resultJson,
        scrapedAt: row.scrapedAt?.toISOString() ?? null,
    }));
}

export async function loadPlatformResultsByIds(ids: string[]) {
    const delegate = platformResultDelegate();
    if (delegate) {
        const rows = await delegate.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                platform: true,
                handle: true,
                status: true,
                creditsUsed: true,
                resultJson: true,
            },
        });
        return rows.map((row) => ({
            ...row,
            platform: row.platform as Platform,
            status: row.status as string,
        }));
    }

    const rows = await prisma.$queryRawUnsafe<
        Array<{
            id: string;
            platform: string;
            handle: string;
            status: string;
            creditsUsed: number;
            resultJson: Prisma.JsonValue;
        }>
    >(
        `SELECT "id","platform"::text,"handle","status"::text,"creditsUsed","resultJson"
         FROM "IndividualReportPlatformResult"
         WHERE "id" = ANY($1::text[])`,
        ids,
    );

    return rows.map((row) => ({ ...row, platform: row.platform as Platform }));
}

export async function loadRunWithPlatformResults(runId: string) {
    const delegate = runDelegate();
    if (delegate) {
        const run = await delegate.findUnique({
            where: { id: runId },
            select: {
                accountId: true,
                year: true,
                quarter: true,
                actualCreditsUsed: true,
                platformResults: {
                    select: {
                        platform: true,
                        status: true,
                        creditsUsed: true,
                        resultJson: true,
                    },
                },
            },
        });

        if (!run) {
            return null;
        }

        return {
            accountId: run.accountId,
            year: run.year,
            quarter: run.quarter,
            actualCreditsUsed: run.actualCreditsUsed,
            platformResults: run.platformResults.map((result) => ({
                platform: result.platform as Platform,
                status: result.status as string,
                creditsUsed: result.creditsUsed,
                resultJson: result.resultJson,
            })),
        };
    }

    const rows = await prisma.$queryRawUnsafe<
        Array<{
            accountId: string;
            year: number;
            quarter: number;
            actualCreditsUsed: number;
            prPlatform: string;
            prStatus: string;
            prCreditsUsed: number;
            prResultJson: Prisma.JsonValue;
        }>
    >(
        `SELECT r."accountId",r."year",r."quarter",r."actualCreditsUsed",
                pr."platform"::text AS "prPlatform",pr."status"::text AS "prStatus",pr."creditsUsed" AS "prCreditsUsed",pr."resultJson" AS "prResultJson"
         FROM "IndividualReportRun" r
         LEFT JOIN "IndividualReportPlatformResult" pr ON pr."runId"=r."id"
         WHERE r."id"=$1`,
        runId,
    );

    if (!rows[0]) return null;
    const first = rows[0];
    return {
        accountId: first.accountId,
        year: Number(first.year),
        quarter: Number(first.quarter),
        actualCreditsUsed: first.actualCreditsUsed,
        platformResults: rows
            .filter((row) => row.prPlatform)
            .map((row) => ({
                platform: row.prPlatform as Platform,
                status: row.prStatus,
                creditsUsed: row.prCreditsUsed,
                resultJson: row.prResultJson,
            })),
    };
}

export async function buildSnapshotHistoryForExport(
    accountId: string,
    year: number,
    quarter: number,
    platforms: Platform[],
) {
    const startMonthIdx = (quarter - 1) * 3;
    const startDate = new Date(year, startMonthIdx, 1);
    const endDate = new Date(year, startMonthIdx + 3, 0, 23, 59, 59);

    const snapshots = await prisma.$queryRawUnsafe<
        Array<{
            platform: string;
            followers: number;
            posts: number | null;
            likes: number | null;
            engagement: number | null;
            scrapedAt: Date;
        }>
    >(
        `SELECT s."platform", s."followers", s."posts", s."likes", s."engagement", s."scrapedAt"
         FROM "Snapshot" s
         WHERE s."accountId"=$1 AND s."platform"=ANY($2::"Platform"[])
           AND s."scrapedAt">=$3 AND s."scrapedAt"<=$4
         ORDER BY s."scrapedAt" ASC`,
        accountId,
        platforms,
        startDate,
        endDate,
    );

    const platformMap = new Map<
        string,
        Map<
            string,
            {
                monthKey: string;
                label: string;
                followers: number;
                posts: number | null;
                likes: number | null;
                engagement: number | null;
            }
        >
    >();

    for (const snapshot of snapshots) {
        let monthMap = platformMap.get(snapshot.platform);
        if (!monthMap) {
            monthMap = new Map();
            platformMap.set(snapshot.platform, monthMap);
        }
        const date = new Date(snapshot.scrapedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const label = date.toLocaleString("id-ID", { month: "short", year: "numeric" });
        monthMap.set(monthKey, {
            monthKey,
            label,
            followers: snapshot.followers,
            posts: snapshot.posts,
            likes: snapshot.likes,
            engagement: snapshot.engagement,
        });
    }

    return Array.from(platformMap.entries()).map(([platform, monthMap]) => ({
        platform,
        months: Array.from(monthMap.values()).sort((left, right) =>
            left.monthKey.localeCompare(right.monthKey),
        ),
    }));
}

function runDelegate() {
    return (
        prisma as typeof prisma & {
            individualReportRun?: typeof prisma.individualReportRun;
        }
    ).individualReportRun;
}

function platformResultDelegate() {
    return (
        prisma as typeof prisma & {
            individualReportPlatformResult?: typeof prisma.individualReportPlatformResult;
        }
    ).individualReportPlatformResult;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
