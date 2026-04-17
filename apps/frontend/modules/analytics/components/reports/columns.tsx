import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownRight, CheckCircle2, Heart, MoreHorizontal, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Strong } from "@/shared/components/catalyst/text";
import { cn } from "@/shared/lib/utils";

export interface DisplayRow {
    id: string;
    rank: number;
    name: string;
    handle: string;
    category: string;

    // Result
    currentFollowers: number;
    followersGrowth: string; // "28.6%"
    followersGrowthDir: "up" | "down" | "flat" | "na";

    // Engagement
    currentLikes?: number;
    likesGrowth?: string;
    likesGrowthDir?: "up" | "down" | "flat" | "na";

    // Effort
    currentPosts: number;
    newPosts: number;

    isNA: boolean;
    isRanked?: boolean;
    badges?: Array<{ label: string; tone: "rose" | "amber" | "blue" | "zinc" }>;
    detailNote?: string | null;

    // Raw stats for sorting if needed
    rawOldFollowers: number;
    rawOldPosts: number;
    rawOldLikes?: number;
}

// --- HELPER FUNCTIONS ---

export function formatNumber(num: number): string {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return num.toString();
}

/**
 * Determines the styling for the rank badge.
 */
function getRankBadgeStyles(rank: number, isNA: boolean) {
    if (isNA) {
        return "bg-zinc-100 text-zinc-400 border-zinc-200";
    }
    if (rank === 1) {
        return "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-800 shadow-sm";
    }
    return "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700";
}

/**
 * Styles for growth text based on direction.
 */
function _getGrowthTextStyles(direction: "up" | "down" | "flat" | "na") {
    if (direction === "up") return "text-emerald-600";
    if (direction === "down") return "text-rose-600";
    return "text-zinc-500";
}

/**
 * Styles for posts/effort badge.
 */
function getNewPostsBadgeStyles(newPosts: number) {
    if (newPosts >= 0) {
        return "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800";
    }
    return "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 border-zinc-100 dark:border-zinc-700";
}

// --- HOOK ---

export function useReportsColumns(selectedPlatform: string) {
    return useMemo<ColumnDef<DisplayRow>[]>(() => {
        const isTikTok = selectedPlatform === "TIKTOK";

        const baseCols: ColumnDef<DisplayRow>[] = [
            {
                id: "identity",
                header: () => <div className="!pl-6">Identitas Akun</div>,
                accessorFn: (row) => row.name, // Allow sorting by name if needed
                cell: ({ row }) => {
                    const account = row.original;
                    // Rank style logic extracted to helper
                    const badgeClass = getRankBadgeStyles(
                        account.isRanked === false ? 0 : account.rank,
                        account.isNA || account.isRanked === false,
                    );

                    return (
                        <div className="flex items-center gap-4 !pl-6">
                            <div className="flex-shrink-0">
                                <span
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold border transition-colors",
                                        badgeClass,
                                    )}
                                >
                                    {account.isNA || account.isRanked === false
                                        ? "-"
                                        : `#${account.rank}`}
                                </span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <Strong className="text-zinc-900 dark:text-white truncate max-w-[200px]">
                                        {account.name}
                                    </Strong>
                                    {/* Ternary kept for rendering condition, but cleaner */}
                                    {account.rank <= 2 &&
                                        !account.isNA &&
                                        account.isRanked !== false && (
                                            <CheckCircle2
                                                size={14}
                                                className="text-blue-500 fill-blue-50 flex-shrink-0"
                                            />
                                        )}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                        {account.handle}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                    <span className="text-[10px] uppercase tracking-wide text-zinc-400 font-medium">
                                        {account.category}
                                    </span>
                                </div>
                                {(account.badges?.length || account.detailNote) && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {account.badges?.map((badge) => (
                                            <span
                                                key={`${account.handle}-${badge.label}`}
                                                className={cn(
                                                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                                    badge.tone === "rose" &&
                                                        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300",
                                                    badge.tone === "amber" &&
                                                        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
                                                    badge.tone === "blue" &&
                                                        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300",
                                                    badge.tone === "zinc" &&
                                                        "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300",
                                                )}
                                            >
                                                {badge.label}
                                            </span>
                                        ))}
                                        {account.detailNote && (
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {account.detailNote}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                },
            },
            {
                id: "result",
                header: "Pengikut",
                accessorFn: (row) => row.currentFollowers,
                cell: ({ row }) => {
                    const account = row.original;

                    return (
                        <div>
                            <span className="block text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                                {account.currentFollowers >= 0
                                    ? formatNumber(account.currentFollowers)
                                    : "N/A"}
                            </span>
                            <div
                                className={cn(
                                    "inline-flex items-center gap-1 mt-0.5 text-xs font-semibold",
                                    account.followersGrowthDir === "up"
                                        ? "text-emerald-600"
                                        : account.followersGrowthDir === "down"
                                          ? "text-rose-600"
                                          : "text-zinc-500",
                                )}
                            >
                                {account.followersGrowthDir === "up" ? (
                                    <TrendingUp size={12} />
                                ) : account.followersGrowthDir === "down" ? (
                                    <ArrowDownRight size={12} />
                                ) : null}
                                {account.followersGrowth}
                            </div>
                        </div>
                    );
                },
            },
        ];

        if (isTikTok) {
            baseCols.push({
                id: "engagement",
                header: "Suka",
                accessorFn: (row) => row.currentLikes ?? 0,
                cell: ({ row }) => {
                    const account = row.original;
                    return (
                        <div>
                            <span className="block text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                                {account.currentLikes !== undefined && account.currentLikes >= 0
                                    ? formatNumber(account.currentLikes)
                                    : "N/A"}
                            </span>
                            {account.currentLikes !== undefined &&
                                account.currentLikes >= 0 &&
                                account.likesGrowth && (
                                    <div
                                        className={cn(
                                            "inline-flex items-center gap-1 mt-0.5 text-xs font-semibold",
                                            (account.likesGrowthDir || "na") === "up"
                                                ? "text-emerald-600"
                                                : (account.likesGrowthDir || "na") === "down"
                                                  ? "text-rose-600"
                                                  : "text-zinc-500",
                                        )}
                                    >
                                        <Heart size={10} className="fill-current" />
                                        {account.likesGrowth}
                                    </div>
                                )}
                        </div>
                    );
                },
            });
        }

        baseCols.push({
            id: "effort",
            header: "Aktivitas Postingan",
            accessorFn: (row) => row.newPosts,
            cell: ({ row }) => {
                const account = row.original;
                const badgeClass = getNewPostsBadgeStyles(account.newPosts);

                return (
                    <div>
                        {account.currentPosts >= 0 ? (
                            <div className="text-zinc-900 dark:text-white font-semibold text-sm">
                                {account.currentPosts}{" "}
                                <span className="text-zinc-400 font-normal">postingan</span>
                            </div>
                        ) : (
                            <div className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm">
                                N/A
                            </div>
                        )}
                        <div
                            className={cn(
                                "mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border",
                                badgeClass,
                            )}
                        >
                            {account.currentPosts >= 0 ? (
                                <>
                                    {account.newPosts >= 0 ? "+" : ""}
                                    {account.newPosts} Baru
                                </>
                            ) : (
                                "Tidak ada data akhir kuartal"
                            )}
                        </div>
                    </div>
                );
            },
        });

        baseCols.push({
            id: "actions",
            header: () => (
                <div className="!pr-6 w-10">
                    <span className="sr-only">Actions</span>
                </div>
            ),
            cell: () => (
                <div className="!pr-6 text-right">
                    <button
                        type="button"
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors inline-flex"
                    >
                        <MoreHorizontal size={16} />
                    </button>
                </div>
            ),
        });

        return baseCols;
    }, [selectedPlatform]);
}
