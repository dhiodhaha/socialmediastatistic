"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { exportHistoryPdf } from "@/app/actions";

export function HistoryToolbar() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Parse initial state from URL
    const initialStatus = searchParams.get("status") || "ALL";
    const initialStart = searchParams.get("startDate")
        ? new Date(searchParams.get("startDate")!)
        : undefined;
    const initialEnd = searchParams.get("endDate")
        ? new Date(searchParams.get("endDate")!)
        : undefined;

    const [date, setDate] = useState<DateRange | undefined>({
        from: initialStart,
        to: initialEnd,
    });
    const [status, setStatus] = useState(initialStatus);
    const [isExporting, setIsExporting] = useState(false);

    const updateFilters = (newDate: DateRange | undefined, newStatus: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (newStatus && newStatus !== "ALL") {
            params.set("status", newStatus);
        } else {
            params.delete("status");
        }

        if (newDate?.from) {
            params.set("startDate", newDate.from.toISOString());
        } else {
            params.delete("startDate");
        }

        if (newDate?.to) {
            params.set("endDate", newDate.to.toISOString());
        } else {
            params.delete("endDate");
        }

        // Reset page when filtering
        params.set("page", "1");

        router.push(`?${params.toString()}`);
    };

    const handleDateChange = (newDate: DateRange | undefined) => {
        setDate(newDate);
        updateFilters(newDate, status);
    };

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        updateFilters(date, newStatus);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const filters = {
                startDate: date?.from,
                endDate: date?.to,
                status: status !== "ALL" ? status : undefined
            };

            const result = await exportHistoryPdf(filters);

            if (result.success && result.data) {
                // Decode base64 and click download link
                const link = document.createElement("a");
                link.href = `data:application/pdf;base64,${result.data}`;
                link.download = `history-report-${Date.now()}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert("Failed to export: " + result.error);
            }
        } catch (error) {
            console.error(error);
            alert("Export failed");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-lg border">
            <div className="flex flex-1 flex-col sm:flex-row gap-4 w-full">
                <DatePickerWithRange date={date} setDate={handleDateChange} />

                <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="RUNNING">Running</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export PDF
            </Button>
        </div>
    );
}
