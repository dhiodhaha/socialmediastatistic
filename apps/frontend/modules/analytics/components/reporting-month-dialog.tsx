"use client";

import { Loader2, PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
    type AssignReportingMonthInput,
    assignReportingMonth,
} from "@/modules/analytics/actions/history.actions";
import {
    describeReportingAssignment,
    getAssignableReportingPeriods,
} from "@/modules/analytics/lib/reporting-month-assignment";
import { Button } from "@/shared/components/catalyst/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

interface ReportingMonthDialogProps {
    job: {
        id: string;
        status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
        createdAt: Date | string;
        completedAt: Date | string | null;
        reportingYear?: number | null;
        reportingMonth?: number | null;
        reportingReason?: string | null;
    };
    trigger?: React.ReactNode;
}

export function ReportingMonthDialog({ job, trigger }: ReportingMonthDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState(job.reportingReason || "");
    const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>("");
    const [isPending, startTransition] = useTransition();

    const jobReference = useMemo(
        () => ({
            status: job.status,
            createdAt: new Date(job.createdAt),
            completedAt: job.completedAt ? new Date(job.completedAt) : null,
            reportingYear: job.reportingYear,
            reportingMonth: job.reportingMonth,
        }),
        [job],
    );

    const currentAssignment = useMemo(
        () => describeReportingAssignment(jobReference),
        [jobReference],
    );

    const availablePeriods = useMemo(
        () => getAssignableReportingPeriods(jobReference.completedAt || jobReference.createdAt),
        [jobReference],
    );

    const selectedPeriod =
        availablePeriods.find((period) => period.key === selectedPeriodKey) || availablePeriods[0];

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) {
            const initialPeriod =
                availablePeriods.find(
                    (period) =>
                        period.year === job.reportingYear && period.month === job.reportingMonth,
                ) || availablePeriods[0];

            setSelectedPeriodKey(initialPeriod?.key || "");
            setReason(job.reportingReason || "");
        }
    };

    const handleSubmit = () => {
        if (!selectedPeriod) {
            toast.error("Tidak ada bulan pelaporan yang valid");
            return;
        }

        const payload: AssignReportingMonthInput = {
            jobId: job.id,
            reportingYear: selectedPeriod.year,
            reportingMonth: selectedPeriod.month,
            reason,
        };

        startTransition(async () => {
            const result = await assignReportingMonth(payload);

            if (result.success) {
                toast.success(`Bulan pelaporan disetel ke ${selectedPeriod.label}`);
                setOpen(false);
                router.refresh();
                return;
            }

            toast.error(result.error || "Gagal menetapkan bulan pelaporan");
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button type="button" outline>
                        <PencilLine className="h-4 w-4" data-slot="icon" />
                        Tetapkan Bulan Pelaporan
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tetapkan Bulan Pelaporan</DialogTitle>
                    <DialogDescription>
                        Pertahankan tanggal selesai yang sebenarnya, lalu pilih bulan pelaporan yang
                        diwakili tugas selesai ini untuk laporan bulanan dan triwulan.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="rounded border p-3 text-xs">
                        <div className="font-medium">Dasar pelaporan saat ini</div>
                        <div className="mt-1 text-muted-foreground">
                            {currentAssignment.label} •{" "}
                            {currentAssignment.source === "manual"
                                ? "penetapan manual"
                                : "inferensi otomatis"}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`reporting-period-${job.id}`}>Bulan pelaporan</Label>
                        <Select value={selectedPeriodKey} onValueChange={setSelectedPeriodKey}>
                            <SelectTrigger id={`reporting-period-${job.id}`} className="w-full">
                                <SelectValue placeholder="Pilih bulan pelaporan" />
                            </SelectTrigger>
                            <SelectContent>
                                {availablePeriods.map((period) => (
                                    <SelectItem key={period.key} value={period.key}>
                                        {period.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`reporting-reason-${job.id}`}>Alasan</Label>
                        <Textarea
                            id={`reporting-reason-${job.id}`}
                            placeholder="Jelaskan mengapa tugas selesai ini harus mewakili bulan pelaporan tersebut."
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button outline type="button" onClick={() => setOpen(false)}>
                        Batal
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={isPending}>
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                        ) : null}
                        Simpan Bulan Pelaporan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
