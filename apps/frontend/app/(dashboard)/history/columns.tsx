"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { format, formatDistance, formatDistanceToNow } from "date-fns";
import { CheckCircle, Clock, MoreHorizontal, Play, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteScrapingJob } from "@/modules/analytics/actions/history.actions";
import { Badge } from "@/shared/components/catalyst/badge";
import {
    Dropdown,
    DropdownButton,
    DropdownItem,
    DropdownMenu,
} from "@/shared/components/catalyst/dropdown";
import { Strong, Text } from "@/shared/components/catalyst/text";

// Interface matching the real data structure from Prisma
interface ScrapingJob {
    id: string;
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
    totalAccounts: number;
    completedCount: number;
    failedCount: number;
    startedAt: Date | string | null;
    completedAt: Date | string | null;
    createdAt: Date | string;
}

function calculateDuration(start: Date | string | null, end: Date | string | null) {
    if (!start) return "--";
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    return formatDistance(endTime, startTime);
}

function ActionMenu({ jobId }: { jobId: string }) {
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm("Delete this job and all associated snapshot data?")) return;

        const result = await deleteScrapingJob(jobId);
        if (result.success) {
            toast.success("Job deleted successfully");
            router.refresh();
        } else {
            toast.error(result.error || "Failed to delete job");
        }
    };

    return (
        <Dropdown>
            <DropdownButton plain aria-label="More options">
                <MoreHorizontal className="w-4 h-4" data-slot="icon" />
            </DropdownButton>
            <DropdownMenu>
                <DropdownItem onClick={handleDelete} className="text-red-600 dark:text-red-500">
                    <Trash2 className="w-4 h-4 ml-auto" data-slot="icon" />
                    Delete Job
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );
}

export const columns: ColumnDef<ScrapingJob>[] = [
    {
        accessorKey: "status",
        header: "STATUS",
        cell: ({ row }) => {
            const status = row.original.status;
            const color = status === "COMPLETED" ? "green" : status === "FAILED" ? "red" : "amber"; // Running/Pending

            // Map status text to be friendlier if needed, or keep generic
            const label =
                status === "COMPLETED"
                    ? "Success"
                    : status === "FAILED"
                      ? "Failed"
                      : status === "RUNNING"
                        ? "Running"
                        : "Pending";

            return (
                <Badge color={color}>
                    {status === "COMPLETED" && (
                        <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {label}
                        </span>
                    )}
                    {status === "FAILED" && (
                        <span className="flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> {label}
                        </span>
                    )}
                    {(status === "RUNNING" || status === "PENDING") && (
                        <span className="flex items-center gap-1">
                            <Play className="w-3 h-3" /> {label}
                        </span>
                    )}
                </Badge>
            );
        },
    },
    {
        id: "trigger",
        header: "TRIGGER INFO",
        cell: () => {
            // Placeholder as real data for trigger source isn't in ScrapingJob yet
            return (
                <div className="flex flex-col">
                    <Strong>Scheduled Job</Strong>
                    <Text>by System</Text>
                </div>
            );
        },
    },
    {
        id: "timing",
        header: "TIMING",
        cell: ({ row }) => {
            const startVal = row.original.startedAt || row.original.createdAt;
            const startDate = new Date(startVal);
            const relative = formatDistanceToNow(startDate, { addSuffix: true });
            const duration = calculateDuration(row.original.startedAt, row.original.completedAt);

            return (
                <div className="flex flex-col">
                    <Strong>{format(startDate, "dd MMM, HH:mm")}</Strong>
                    <div className="flex items-center gap-2">
                        <Text>{relative}</Text>
                        <Text>•</Text>
                        <Text className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {duration}
                        </Text>
                    </div>
                </div>
            );
        },
    },
    {
        id: "metrics",
        header: "METRICS",
        cell: ({ row }) => {
            const {
                totalAccounts: total,
                completedCount: success,
                failedCount: failed,
                status,
            } = row.original;

            // Avoid division by zero
            const safeTotal = total || 1;
            const successPct = (success / safeTotal) * 100;
            const failedPct = (failed / safeTotal) * 100;

            const isSuccess = status === "COMPLETED" && failed === 0;
            const isFailed = status === "FAILED";

            return (
                <div className="w-full max-w-[140px] flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                        <Text className="text-xs">Total</Text>
                        <Strong>{total}</Strong>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                        {success > 0 && (
                            <div
                                style={{ width: `${successPct}%` }}
                                className="h-full bg-green-500 shrink-0"
                            />
                        )}
                        {failed > 0 && (
                            <div
                                style={{ width: `${failedPct}%`, backgroundColor: "#dc2626" }}
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
        cell: ({ row }) => <ActionMenu jobId={row.original.id} />,
    },
];
