"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { formatDistanceToNow, format } from "date-fns";
import { Trash2, MoreHorizontal, ArrowRight, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";

// Mock Data Interface matching the simplified prototype
export interface HistoryLog {
    id: string;
    status: "SUCCESS" | "FAILED" | "PARTIAL";
    platform: "Instagram" | "LinkedIn" | "Twitter" | "TikTok";
    trigger: "Manual / User" | "Scheduled Job" | "API Trigger";
    triggeredBy: "by Dhafin" | "by System" | "by External App" | "by Admin";
    triggerTime: string; // ISO string
    startedAt: string;
    duration: string;
    total: number;
    success: number;
    failed: number;
}

export const columns: ColumnDef<HistoryLog>[] = [
    {
        accessorKey: "status",
        header: "STATUS",
        cell: ({ row }) => {
            const status = row.original.status;
            const color =
                status === "SUCCESS" ? "green" :
                    status === "FAILED" ? "red" :
                        "amber";

            return (
                <Badge color={color}>
                    {status === "SUCCESS" && <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Success</span>}
                    {status === "FAILED" && <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</span>}
                    {status === "PARTIAL" && <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Partial</span>}
                </Badge>
            );
        },
    },
    {
        accessorKey: "trigger",
        header: "TRIGGER INFO",
        cell: ({ row }) => {
            return (
                <div className="flex flex-col">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                        {row.original.trigger}
                    </span>
                    <span className="text-xs text-zinc-500">
                        {row.original.triggeredBy}
                    </span>
                </div>
            );
        },
    },
    {
        id: "timing",
        header: "TIMING",
        cell: ({ row }) => {
            const startDate = new Date(row.original.startedAt);
            const relative = formatDistanceToNow(startDate, { addSuffix: true });

            return (
                <div className="flex flex-col">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium text-sm">
                        {format(startDate, "dd MMM, HH:mm")}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>{relative}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {row.original.duration}
                        </span>
                    </div>
                </div>
            );
        },
    },
    {
        id: "metrics",
        header: "METRICS",
        cell: ({ row }) => {
            const { total, success, failed, status } = row.original;

            // Calculate percentages for the bar
            const successPct = (success / total) * 100;
            const failedPct = (failed / total) * 100;

            const isSuccess = status === "SUCCESS";
            const isFailed = status === "FAILED";
            // const isPartial = status === "PARTIAL";

            return (
                <div className="w-full max-w-[140px] flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                        <span className="text-xs text-zinc-400">Total</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{total}</span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                        {success > 0 && (
                            <div style={{ width: `${successPct}%` }} className="h-full bg-green-500 shrink-0" />
                        )}
                        {failed > 0 && (
                            <div
                                style={{ width: `${failedPct}%`, backgroundColor: '#dc2626' }}
                                className="h-full shrink-0"
                            />
                        )}
                    </div>

                    <div className="flex justify-between items-center text-xs font-medium">
                        {isSuccess && <span className="text-emerald-600">{success} OK</span>}
                        {isFailed && <span className="text-red-600">{failed} Err</span>}
                        {!isSuccess && !isFailed && (
                            <div className="flex gap-2">
                                <span className="text-emerald-600">{success} OK</span>
                                <span className="text-red-600">{failed} Err</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        },
    },
    {
        id: "actions",
        header: "ACTIONS",
        cell: () => (
            <div className="flex items-center gap-2">
                <Button plain>
                    <MoreHorizontal className="w-4 h-4" data-slot="icon" />
                </Button>
            </div>
        ),
    },
];
