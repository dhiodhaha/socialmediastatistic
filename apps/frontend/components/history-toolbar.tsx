"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import { exportHistoryPdf, exportHistoryCsv } from "@/app/actions/history";
import { Platform } from "@repo/database";

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
    const initialPlatform = searchParams.get("platform") || "ALL";

    const [date, setDate] = useState<DateRange | undefined>({
        from: initialStart,
        to: initialEnd,
    });
    const [status, setStatus] = useState(initialStatus);
    const [platform, setPlatform] = useState(initialPlatform);
    const [isExporting, setIsExporting] = useState(false);

    const updateFilters = (newDate: DateRange | undefined, newStatus: string, newPlatform: string) => {
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

        if (newPlatform && newPlatform !== "ALL") {
            params.set("platform", newPlatform);
        } else {
            params.delete("platform");
        }

        // Reset page when filtering
        params.set("page", "1");

        router.push(`?${params.toString()}`);
    };

    const handleDateChange = (newDate: DateRange | undefined) => {
        setDate(newDate);
        updateFilters(newDate, status, platform);
    };

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        updateFilters(date, newStatus, platform);
    };

    const handlePlatformChange = (newPlatform: string) => {
        setPlatform(newPlatform);
        updateFilters(date, status, newPlatform);
    };

    const handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const filters = {
                startDate: date?.from,
                endDate: date?.to,
                status: status !== "ALL" ? status : undefined,
                platform: platform !== "ALL" ? (platform as Platform) : undefined
            };

            const result = await exportHistoryCsv(filters);

            if (result.success && result.data) {
                const link = document.createElement("a");
                link.href = `data:text/csv;base64,${result.data}`;
                link.download = `history-report-${Date.now()}.csv`;
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

                <Select value={platform} onValueChange={handlePlatformChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Platforms</SelectItem>
                        <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                        <SelectItem value="TIKTOK">TikTok</SelectItem>
                        <SelectItem value="TWITTER">Twitter</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportCsv} disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                    CSV
                </Button>
                <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    PDF
                </Button>
            </div>
        </div>
    );
}
