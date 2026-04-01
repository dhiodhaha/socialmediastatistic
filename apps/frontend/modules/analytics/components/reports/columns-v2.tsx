import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import type { DisplayRow } from "./columns"; // We reuse the type

export function formatNumberDots(num: number): string {
    return num.toLocaleString("id-ID");
}

export function useReportsColumnsV2(selectedPlatform: string) {
    return useMemo<ColumnDef<DisplayRow>[]>(() => {
        const isTikTok = selectedPlatform === "TIKTOK";

        const baseCols: ColumnDef<DisplayRow>[] = [
            {
                id: "rank",
                header: "#",
                accessorFn: (row) => row.rank,
                cell: ({ row }) => {
                    const account = row.original;
                    // Simply return the number, text-zinc-500
                    return (
                        <div className="flex items-center justify-center font-medium text-zinc-500 min-w-[2rem]">
                            {account.isNA ? "-" : account.rank}
                        </div>
                    );
                },
            },
            {
                id: "identity",
                header: () => (
                    <div className="text-left font-bold uppercase tracking-wider">Nama Unit</div>
                ),
                accessorFn: (row) => row.name,
                cell: ({ row }) => {
                    const account = row.original;
                    return (
                        <div className="flex flex-col text-left py-2">
                            <span className="font-bold text-zinc-900 dark:text-white">
                                {account.name}
                            </span>
                            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                                {account.handle}
                            </span>
                        </div>
                    );
                },
            },
            {
                id: "followers",
                header: () => (
                    <div className="flex flex-col items-end uppercase tracking-wider">
                        <span className="font-bold">Pengikut</span>
                        <span className="text-[10px] opacity-80 font-normal normal-case">
                            Total & Pertumbuhan
                        </span>
                    </div>
                ),
                accessorFn: (row) => row.currentFollowers,
                cell: ({ row }) => {
                    const account = row.original;
                    if (account.isNA) {
                        return <div className="text-right text-zinc-400 font-medium">N/A</div>;
                    }

                    const absGrowth = account.currentFollowers - account.rawOldFollowers;
                    const growthPrefix = absGrowth > 0 ? "+" : "";

                    const isUp = account.followersGrowthDir === "up";
                    const isZero = absGrowth === 0;

                    return (
                        <div className="flex flex-col items-end py-2">
                            <span className="text-base font-bold text-zinc-900 dark:text-white">
                                {formatNumberDots(account.currentFollowers)}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-zinc-400">
                                    {growthPrefix}
                                    {formatNumberDots(absGrowth)}
                                </span>
                                {!isZero && (
                                    <span
                                        className={cn(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                            isUp
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
                                        )}
                                    >
                                        {account.followersGrowthDir === "up" ? "+" : ""}
                                        {account.followersGrowth}
                                    </span>
                                )}
                                {isZero && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                                        0.00%
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                },
            },
        ];

        if (isTikTok) {
            baseCols.push({
                id: "likes",
                header: () => (
                    <div className="flex flex-col items-end uppercase tracking-wider">
                        <span className="font-bold">Likes</span>
                        <span className="text-[10px] opacity-80 font-normal normal-case">
                            Total & Pertumbuhan
                        </span>
                    </div>
                ),
                accessorFn: (row) => row.currentLikes ?? 0,
                cell: ({ row }) => {
                    const account = row.original;
                    if (
                        account.isNA ||
                        account.currentLikes === undefined ||
                        account.rawOldLikes === undefined
                    ) {
                        return <div className="text-right text-zinc-400 font-medium">N/A</div>;
                    }

                    const absGrowth = account.currentLikes - account.rawOldLikes;
                    const growthPrefix = absGrowth > 0 ? "+" : "";
                    const isUp = account.likesGrowthDir === "up";
                    const isZero = absGrowth === 0;

                    return (
                        <div className="flex flex-col items-end py-2">
                            <span className="text-base font-bold text-zinc-900 dark:text-white">
                                {formatNumberDots(account.currentLikes)}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-zinc-400">
                                    {growthPrefix}
                                    {formatNumberDots(absGrowth)}
                                </span>
                                {!isZero && (
                                    <span
                                        className={cn(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                            isUp
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
                                        )}
                                    >
                                        {isUp ? "+" : ""}
                                        {account.likesGrowth}
                                    </span>
                                )}
                                {isZero && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                                        0.00%
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                },
            });
        }

        baseCols.push({
            id: "posts",
            header: () => (
                <div className="flex flex-col items-end uppercase tracking-wider">
                    <span className="font-bold">Postingan</span>
                    <span className="text-[10px] opacity-80 font-normal normal-case">
                        Total & Pertumbuhan
                    </span>
                </div>
            ),
            accessorFn: (row) => row.currentPosts,
            cell: ({ row }) => {
                const account = row.original;
                if (account.isNA) {
                    return <div className="text-right text-zinc-400 font-medium">N/A</div>;
                }

                const absGrowth = account.newPosts;
                const growthPrefix = absGrowth > 0 ? "+" : "";

                // compute percentage
                let pct = 0;
                if (account.rawOldPosts > 0) {
                    pct = (absGrowth / account.rawOldPosts) * 100;
                }

                const isUp = absGrowth > 0;
                const isZero = absGrowth === 0;

                return (
                    <div className="flex flex-col items-end py-2">
                        <span className="text-base font-bold text-zinc-900 dark:text-white">
                            {formatNumberDots(account.currentPosts)}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-zinc-400">
                                {growthPrefix}
                                {formatNumberDots(absGrowth)}
                            </span>
                            {!isZero && (
                                <span
                                    className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                        isUp
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
                                    )}
                                >
                                    {isUp ? "+" : ""}
                                    {pct.toFixed(2)}%
                                </span>
                            )}
                            {isZero && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                                    0.00%
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        });

        return baseCols;
    }, [selectedPlatform]);
}
