"use client";

import { ComparisonRow } from "@/app/actions/report";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Platform } from "@repo/database";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface ComparisonTableProps {
    data: ComparisonRow[];
    job1Date: Date; // Old date
    job2Date: Date; // New date
    platform: Platform;
}

export function ComparisonTable({ data, job1Date, job2Date, platform }: ComparisonTableProps) {
    const formatDate = (date: Date) => {
        return date.toLocaleDateString("id-ID", { month: "short", day: "numeric" });
    };

    const month1 = formatDate(job1Date);
    const month2 = formatDate(job2Date);

    // Platform display name
    const platformName = platform === "INSTAGRAM" ? "Instagram" : platform === "TIKTOK" ? "TikTok" : "Twitter";

    return (
        <Card className="w-full border shadow-sm">
            <CardContent className="p-0">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[50px] text-center font-semibold text-xs uppercase tracking-wider">#</TableHead>
                                <TableHead className="w-[300px] font-semibold text-xs uppercase tracking-wider">Akun</TableHead>

                                {/* Metrics Group: Followers */}
                                <TableHead className="text-right font-semibold text-xs uppercase tracking-wider border-l">Followers ({month1})</TableHead>
                                <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Followers ({month2})</TableHead>
                                <TableHead className="text-center font-semibold text-xs uppercase tracking-wider bg-muted/60">Limitasi</TableHead>
                                <TableHead className="text-center font-semibold text-xs uppercase tracking-wider bg-primary/5 text-primary">Pertumbuhan</TableHead>

                                {/* Metrics Group: Posts */}
                                <TableHead className="text-right font-semibold text-xs uppercase tracking-wider border-l">Posts ({month1})</TableHead>
                                <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Posts ({month2})</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row, index) => {
                                const isNA = row.oldStats.followers === -1;

                                return (
                                    <TableRow
                                        key={`${row.accountId}-${row.platform}`}
                                        className={cn(
                                            "group transition-colors",
                                            isNA ? "bg-muted/30" : "hover:bg-muted/20"
                                        )}
                                    >
                                        <TableCell className="text-center text-muted-foreground font-mono text-xs">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                                                    {row.accountName}
                                                </span>
                                                <span className={cn("text-xs font-mono", isNA ? "text-amber-600/70" : "text-muted-foreground")}>
                                                    {isNA ? "N/A" : `@${row.handle}`}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Followers Data */}
                                        <TableCell className="text-right font-mono text-sm border-l tabular-nums text-muted-foreground">
                                            {isNA ? "-" : row.oldStats.followers.toLocaleString("id-ID")}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm tabular-nums font-medium">
                                            {isNA ? "-" : row.newStats.followers.toLocaleString("id-ID")}
                                        </TableCell>

                                        {/* Placeholder column (Limitasi was in header but data unclear? Replaced with empty check or spacer) */}
                                        <TableCell className="text-center bg-muted/30">
                                            {/* Could be used for limit indicators or just spacer, keeping minimal for now */}
                                            <span className="text-xs text-muted-foreground/30">-</span>
                                        </TableCell>

                                        {/* GROWTH Badge */}
                                        <TableCell className="text-center bg-primary/5">
                                            {isNA ? "-" : <DeltaBadge value={row.delta.followersPct} />}
                                        </TableCell>

                                        {/* Posts Data */}
                                        <TableCell className="text-right font-mono text-sm border-l tabular-nums text-muted-foreground">
                                            {isNA ? "-" : row.oldStats.posts.toLocaleString("id-ID")}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm tabular-nums">
                                            {isNA ? "-" : row.newStats.posts.toLocaleString("id-ID")}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        Tidak ada data yang ditemukan.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function DeltaBadge({ value }: { value: number }) {
    if (value === 0) return <span className="text-muted-foreground text-xs"><Minus className="w-3 h-3 inline opacity-50" /> 0%</span>;

    const isPositive = value > 0;
    const isNegative = value < 0;

    return (
        <div className={cn(
            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
            isPositive
                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                : isNegative
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                    : "bg-gray-50 text-gray-600 border-gray-200"
        )}>
            {isPositive && <ArrowUp className="w-3 h-3" />}
            {isNegative && <ArrowDown className="w-3 h-3" />}
            {Math.abs(value).toFixed(2)}%
        </div>
    );
}
