import { AlertTriangle, BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { formatNumber } from "./columns";
import type { Platform } from "./reports-controls";

interface QuarterlyMover {
    accountId: string;
    accountName: string;
    handle: string;
    category: string;
    followerGrowthPct: number;
    followerGrowthValue: number;
    detailNote: string | null;
}

interface QuarterlyPlatformSummaryProps {
    platform: Platform;
    categoryLabel: string;
    methodologyNote?: string | null;
    summary: {
        totalAccounts: number;
        rankingEligibleCount: number;
        performanceIssueCount: number;
        dataQualityIssueCount: number;
        netFollowerGrowth: number;
        topGainers: QuarterlyMover[];
        topDecliners: QuarterlyMover[];
    };
}

export function QuarterlyPlatformSummary({
    platform,
    categoryLabel,
    methodologyNote,
    summary,
}: QuarterlyPlatformSummaryProps) {
    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="text-sm font-medium text-zinc-500">
                        Quarterly Platform Summary
                    </div>
                    <h3 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
                        {platformLabel(platform)}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Review eligible rankings, issues, and supporting evidence before export.
                    </p>
                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                        Scope: {categoryLabel}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <SummaryCard
                        icon={BarChart3}
                        label="Eligible Rankings"
                        value={`${summary.rankingEligibleCount}/${summary.totalAccounts}`}
                    />
                    <SummaryCard
                        icon={TrendingUp}
                        label="Net Follower Growth"
                        value={formatGrowth(summary.netFollowerGrowth)}
                    />
                    <SummaryCard
                        icon={TrendingDown}
                        label="Performance Issues"
                        value={String(summary.performanceIssueCount)}
                    />
                    <SummaryCard
                        icon={AlertTriangle}
                        label="Data Quality Issues"
                        value={String(summary.dataQualityIssueCount)}
                    />
                </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <MoverList
                    title="Top Gainers"
                    emptyLabel="No eligible within-quarter rankings for this platform yet."
                    movers={summary.topGainers}
                    tone="emerald"
                />
                <MoverList
                    title="Top Decliners"
                    emptyLabel="No decliners to show for this platform."
                    movers={summary.topDecliners}
                    tone="rose"
                />
            </div>

            {methodologyNote && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide">
                        Category Methodology
                    </div>
                    <p>{methodologyNote}</p>
                </div>
            )}
        </div>
    );
}

function SummaryCard({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof BarChart3;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <Icon className="h-4 w-4" />
                {label}
            </div>
            <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-white">{value}</div>
        </div>
    );
}

function MoverList({
    title,
    movers,
    emptyLabel,
    tone,
}: {
    title: string;
    movers: QuarterlyMover[];
    emptyLabel: string;
    tone: "emerald" | "rose";
}) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {title}
            </div>
            {movers.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{emptyLabel}</p>
            ) : (
                <div className="mt-3 space-y-3">
                    {movers.map((mover) => (
                        <div
                            key={mover.accountId}
                            className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                                        {mover.accountName}
                                    </div>
                                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        @{mover.handle} • {mover.category}
                                    </div>
                                    {mover.detailNote && (
                                        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                            {mover.detailNote}
                                        </div>
                                    )}
                                </div>

                                <div
                                    className={`shrink-0 text-right text-sm font-semibold ${
                                        tone === "emerald" ? "text-emerald-600" : "text-rose-600"
                                    }`}
                                >
                                    <div>{formatGrowth(mover.followerGrowthValue)}</div>
                                    <div className="text-xs">
                                        {mover.followerGrowthPct >= 0 ? "+" : ""}
                                        {mover.followerGrowthPct.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function platformLabel(platform: Platform) {
    if (platform === "INSTAGRAM") return "Instagram";
    if (platform === "TIKTOK") return "TikTok";
    return "Twitter";
}

function formatGrowth(value: number) {
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${formatNumber(value)}`;
}
