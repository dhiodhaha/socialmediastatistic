"use client";

import { format } from "date-fns";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { ComparisonRow } from "@/modules/analytics/actions/report.actions";
import { Badge } from "@/shared/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/utils";

interface ComparisonTableProps {
    data: ComparisonRow[];
    job1Date: Date;
    job2Date: Date;
    platform: string;
}

export function ComparisonTable({ data, job1Date, job2Date, platform }: ComparisonTableProps) {
    const renderDelta = (val: number, pct: number) => {
        if (val === 0) {
            return (
                <div className="flex items-center text-muted-foreground">
                    <Minus className="h-3 w-3 mr-1" />
                    <span>0%</span>
                </div>
            );
        }

        const isPositive = val > 0;
        return (
            <div
                className={cn(
                    "flex items-center font-medium",
                    isPositive ? "text-green-600" : "text-red-600",
                )}
            >
                {isPositive ? (
                    <ArrowUp className="h-3 w-3 mr-1" />
                ) : (
                    <ArrowDown className="h-3 w-3 mr-1" />
                )}
                <span>
                    {isPositive ? "+" : ""}
                    {val.toLocaleString()} ({pct.toFixed(1)}%)
                </span>
            </div>
        );
    };

    const isNA = (val: number) => val === -1;

    return (
        <Card className="overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[200px]">Akun</TableHead>
                        <TableHead>Handle</TableHead>
                        <TableHead className="text-right">
                            <div className="flex flex-col">
                                <span>Followers</span>
                                <span className="text-[10px] font-normal text-muted-foreground">
                                    {format(job1Date, "dd MMM")} → {format(job2Date, "dd MMM")}
                                </span>
                            </div>
                        </TableHead>
                        <TableHead className="text-right">Pertumbuhan</TableHead>
                        <TableHead className="text-right">Posts</TableHead>
                        {(platform === "INSTAGRAM" || platform === "TIKTOK") && (
                            <TableHead className="text-right">Likes</TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={6}
                                className="h-24 text-center text-muted-foreground"
                            >
                                Tidak ada data untuk platform ini.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((row) => (
                            <TableRow key={row.accountId}>
                                <TableCell className="font-medium">{row.accountName}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-mono text-[10px]">
                                        {row.handle}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {isNA(row.oldStats.followers) ? (
                                        "N/A"
                                    ) : (
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground text-[10px]">
                                                {row.oldStats.followers.toLocaleString()}
                                            </span>
                                            <span className="font-semibold">
                                                {row.newStats.followers.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {isNA(row.oldStats.followers)
                                        ? "-"
                                        : renderDelta(
                                              row.delta.followersVal,
                                              row.delta.followersPct,
                                          )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {isNA(row.oldStats.posts) ? (
                                        "N/A"
                                    ) : (
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground text-[10px]">
                                                {row.oldStats.posts.toLocaleString()}
                                            </span>
                                            <span className="font-semibold">
                                                {row.newStats.posts.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </TableCell>
                                {(platform === "INSTAGRAM" || platform === "TIKTOK") && (
                                    <TableCell className="text-right">
                                        {isNA(row.oldStats.likes || 0) ? (
                                            "N/A"
                                        ) : (
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground text-[10px]">
                                                    {(row.oldStats.likes || 0).toLocaleString()}
                                                </span>
                                                <span className="font-semibold">
                                                    {(row.newStats.likes || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>
    );
}

import { Card } from "@/shared/components/ui/card";
