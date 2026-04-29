"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { format, formatDistance, formatDistanceToNow } from "date-fns";
import {
    CheckCircle,
    Clock,
    MoreHorizontal,
    PencilLine,
    Play,
    Trash2,
    XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteScrapingJob } from "@/modules/analytics/actions/history.actions";
import { ReportingMonthDialog } from "@/modules/analytics/components/reporting-month-dialog";
import { describeReportingAssignment } from "@/modules/analytics/lib/reporting-month-assignment";
import { Badge } from "@/shared/components/catalyst/badge";
import {
    Dropdown,
    DropdownButton,
    DropdownItem,
    DropdownMenu,
} from "@/shared/components/catalyst/dropdown";
import { Strong, Text } from "@/shared/components/catalyst/text";

// Interface matching the real data structure from Prisma
export interface ScrapingJob {
    id: string;
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
    totalAccounts: number;
    completedCount: number;
    failedCount: number;
    startedAt: Date | string | null;
    completedAt: Date | string | null;
    createdAt: Date | string;
    reportingYear?: number | null;
    reportingMonth?: number | null;
    reportingReason?: string | null;
}

function calculateDuration(start: Date | string | null, end: Date | string | null) {
    if (!start) return "--";
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    return formatDistance(endTime, startTime);
}

function ActionMenu({ job }: { job: ScrapingJob }) {
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm("Hapus tugas ini beserta semua data snapshot yang terkait?")) return;

        const result = await deleteScrapingJob(job.id);
        if (result.success) {
            toast.success("Tugas berhasil dihapus");
            router.refresh();
        } else {
            toast.error(result.error || "Gagal menghapus tugas");
        }
    };

    return (
        <Dropdown>
            <DropdownButton plain aria-label="Opsi lainnya">
                <MoreHorizontal className="w-4 h-4" data-slot="icon" />
            </DropdownButton>
            <DropdownMenu>
                {job.status === "COMPLETED" && (
                    <ReportingMonthDialog
                        job={job}
                        trigger={
                            <DropdownItem>
                                <PencilLine className="w-4 h-4 ml-auto" data-slot="icon" />
                                Tetapkan bulan pelaporan
                            </DropdownItem>
                        }
                    />
                )}
                <DropdownItem onClick={handleDelete} className="text-red-600 dark:text-red-500">
                    <Trash2 className="w-4 h-4 ml-auto" data-slot="icon" />
                    Hapus tugas
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );
}

export const columns: ColumnDef<ScrapingJob>[] = [
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.original.status;
            const color = status === "COMPLETED" ? "green" : status === "FAILED" ? "red" : "amber"; // Running/Pending

            // Map status text to be friendlier if needed, or keep generic
            const label =
                status === "COMPLETED"
                    ? "Berhasil"
                    : status === "FAILED"
                      ? "Gagal"
                      : status === "RUNNING"
                        ? "Berjalan"
                        : "Menunggu";

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
        header: "Sumber",
        cell: () => {
            return (
                <div className="flex min-w-[160px] flex-col">
                    <Strong className="text-slate-900 dark:text-white">Snapshot otomatis</Strong>
                    <Text className="text-slate-500 dark:text-slate-400">
                        Dibuat dari proses scraping
                    </Text>
                </div>
            );
        },
    },
    {
        id: "timing",
        header: "Waktu",
        cell: ({ row }) => {
            const startVal = row.original.startedAt || row.original.createdAt;
            const startDate = new Date(startVal);
            const relative = formatDistanceToNow(startDate, { addSuffix: true });
            const duration = calculateDuration(row.original.startedAt, row.original.completedAt);

            return (
                <div className="flex min-w-[190px] flex-col">
                    <Strong className="text-slate-900 dark:text-white">
                        {format(startDate, "dd MMM yyyy, HH:mm")}
                    </Strong>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Text className="text-slate-500 dark:text-slate-400">{relative}</Text>
                        <Text className="text-slate-400 dark:text-slate-500">•</Text>
                        <Text className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
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
        header: "Akun",
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
                <div className="flex w-full min-w-[180px] max-w-[220px] flex-col gap-2">
                    <div className="flex justify-between items-end">
                        <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            Cakupan akun
                        </Text>
                        <Strong className="tabular-nums text-slate-900 dark:text-white">
                            {total}
                        </Strong>
                    </div>

                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
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

                    <div className="flex items-center justify-between text-xs font-medium">
                        {isSuccess && (
                            <span className="tabular-nums text-emerald-600">
                                {success} berhasil
                            </span>
                        )}
                        {isFailed && (
                            <span className="tabular-nums text-red-600">{failed} gagal</span>
                        )}
                        {!isSuccess && !isFailed && (
                            <div className="flex gap-2">
                                <span className="tabular-nums text-emerald-600">
                                    {success} berhasil
                                </span>
                                <span className="tabular-nums text-red-600">{failed} gagal</span>
                            </div>
                        )}
                        <span className="tabular-nums text-slate-500 dark:text-slate-400">
                            {total > 0 ? Math.round((success / total) * 100) : 0}%
                        </span>
                    </div>
                </div>
            );
        },
    },
    {
        id: "reporting",
        header: "Bulan pelaporan",
        cell: ({ row }) => {
            const reporting = describeReportingAssignment({
                status: row.original.status,
                createdAt: new Date(row.original.createdAt),
                completedAt: row.original.completedAt ? new Date(row.original.completedAt) : null,
                reportingYear: row.original.reportingYear,
                reportingMonth: row.original.reportingMonth,
            });

            if (row.original.status !== "COMPLETED") {
                return (
                    <Text className="text-slate-500 dark:text-slate-400">
                        Tersedia setelah tugas selesai
                    </Text>
                );
            }

            return (
                <div className="flex min-w-[180px] flex-col">
                    <Strong className="text-slate-900 dark:text-white">{reporting.label}</Strong>
                    <Text className="text-slate-500 dark:text-slate-400">
                        {reporting.source === "manual"
                            ? "Bulan pelaporan manual"
                            : "Otomatis dari bulan selesai"}
                    </Text>
                </div>
            );
        },
    },
    {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => <ActionMenu job={row.original} />,
    },
];
