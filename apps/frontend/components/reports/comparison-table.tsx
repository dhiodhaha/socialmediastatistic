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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Platform } from "@repo/database";
import { ArrowDown, ArrowUp } from "lucide-react";

interface ComparisonTableProps {
    data: ComparisonRow[];
    job1Date: Date; // Old date
    job2Date: Date; // New date
    platform: Platform;
}

export function ComparisonTable({ data, job1Date, job2Date, platform }: ComparisonTableProps) {
    const formatDate = (date: Date) => {
        return date.toLocaleDateString("id-ID", { month: "long" }); // e.g. "Mei", "Juli"
    };

    const month1 = formatDate(job1Date);
    const month2 = formatDate(job2Date);

    // Platform display name
    const platformName = platform === "INSTAGRAM" ? "Instagram" : platform === "TIKTOK" ? "TikTok" : "Twitter";

    return (
        <Card className="w-full">
            <CardHeader className="bg-primary/5 pb-2">
                <CardTitle className="text-xl text-primary">Laporan Pertumbuhan - {platformName}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-blue-600 hover:bg-blue-600 text-white border-b-0">
                                <TableHead className="w-[50px] text-white font-bold border-r border-blue-500 text-center align-middle" rowSpan={2}>
                                    #
                                </TableHead>
                                <TableHead className="text-white font-bold border-r border-blue-500 align-middle" rowSpan={2}>
                                    Nama Unit
                                </TableHead>
                                <TableHead className="text-center text-white font-bold bg-blue-600 border-b border-blue-500" colSpan={6}>
                                    {platformName}
                                </TableHead>
                            </TableRow>
                            <TableRow className="bg-blue-600 hover:bg-blue-600 text-white">
                                <TableHead className="text-center text-white text-xs px-2 border-r border-blue-500">
                                    Pengikut<br />{month1}
                                </TableHead>
                                <TableHead className="text-center text-white text-xs px-2 border-r border-blue-500">
                                    Pengikut<br />{month2}
                                </TableHead>
                                <TableHead className="text-center text-white text-xs px-2 border-r border-blue-500">
                                    Peningkatan<br />Pengikut
                                </TableHead>
                                <TableHead className="text-center text-white text-xs px-2 border-r border-blue-500">
                                    Postingan<br />{month1}
                                </TableHead>
                                <TableHead className="text-center text-white text-xs px-2 border-r border-blue-500">
                                    Postingan<br />{month2}
                                </TableHead>
                                <TableHead className="text-center text-white text-xs px-2">
                                    Peningkatan<br />Post
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row, index) => {
                                const isNA = row.oldStats.followers === -1;

                                return (
                                    <TableRow key={`${row.accountId}-${row.platform}`} className={cn("hover:bg-muted/50", isNA && "bg-amber-50")}>
                                        <TableCell className="text-center font-medium border-r p-2">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell className="border-r p-2 max-w-[250px]">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm line-clamp-2">{row.accountName}</span>
                                                <span className={cn("text-xs", isNA ? "text-amber-600 font-medium" : "text-muted-foreground")}>
                                                    {isNA ? "N/A" : `@${row.handle}`}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center border-r p-2 tabular-nums">
                                            {isNA ? <span className="text-amber-600">N/A</span> : row.oldStats.followers.toLocaleString("id-ID")}
                                        </TableCell>
                                        <TableCell className="text-center border-r p-2 tabular-nums font-medium">
                                            {isNA ? <span className="text-amber-600">N/A</span> : row.newStats.followers.toLocaleString("id-ID")}
                                        </TableCell>
                                        <TableCell className="text-center border-r p-2">
                                            {isNA ? <span className="text-amber-600">N/A</span> : <DeltaBadge value={row.delta.followersPct} />}
                                        </TableCell>
                                        <TableCell className="text-center border-r p-2 tabular-nums">
                                            {isNA ? <span className="text-amber-600">N/A</span> : row.oldStats.posts.toLocaleString("id-ID")}
                                        </TableCell>
                                        <TableCell className="text-center border-r p-2 tabular-nums font-medium">
                                            {isNA ? <span className="text-amber-600">N/A</span> : row.newStats.posts.toLocaleString("id-ID")}
                                        </TableCell>
                                        <TableCell className="text-center p-2">
                                            {isNA ? <span className="text-amber-600">N/A</span> : <DeltaBadge value={row.delta.postsPct} />}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        Tidak ada data untuk dibandingkan.
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
    if (value === 0) return <span className="text-muted-foreground text-xs">-</span>;

    const isPositive = value > 0;
    const isNegative = value < 0;

    return (
        <div className={cn(
            "flex items-center justify-center gap-1 text-xs font-bold",
            isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-500"
        )}>
            {isPositive && <ArrowUp className="w-3 h-3" />}
            {isNegative && <ArrowDown className="w-3 h-3" />}
            {Math.abs(value).toFixed(2)}%
        </div>
    );
}
