"use client";

import { Download, FileJson, FileText, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { useState } from "react";
import {
    exportHistoryPdf,
    getAllScrapingHistory,
    type HistoryFilters,
} from "@/modules/analytics/actions/history.actions";
import { Button } from "@/shared/components/catalyst/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

export function HistoryExport() {
    const searchParams = useSearchParams();
    const [isExporting, setIsExporting] = useState(false);

    const getFilters = (): HistoryFilters => {
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const status = searchParams.get("status");

        return {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            status: status === "ALL" ? undefined : status,
        };
    };

    const handleExportCsv = async () => {
        try {
            setIsExporting(true);
            const filters = getFilters();
            const result = await getAllScrapingHistory(filters);

            if (!result.success || !result.data) {
                console.error("Gagal mengambil data untuk ekspor CSV");
                return;
            }

            const csvData = result.data.map((job) => ({
                ID: job.id,
                Status: job.status,
                "Total Akun": job.totalAccounts,
                "Jumlah Sukses": job.completedCount,
                "Jumlah Gagal": job.failedCount,
                "Dibuat Pada": new Date(job.createdAt).toLocaleString("id-ID"),
                "Dimulai Pada": job.startedAt
                    ? new Date(job.startedAt).toLocaleString("id-ID")
                    : "-",
                "Selesai Pada": job.completedAt
                    ? new Date(job.completedAt).toLocaleString("id-ID")
                    : "-",
            }));

            const csv = Papa.unparse(csvData);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `scraping_history_${new Date().toISOString()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Galat ekspor CSV:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPdf = async () => {
        try {
            setIsExporting(true);
            const filters = getFilters();
            const result = await exportHistoryPdf(filters);

            if (!result.success || !result.data) {
                console.error("Gagal mengambil data untuk ekspor PDF", result.error);
                return;
            }

            // data is base64 string
            const byteCharacters = atob(result.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/pdf" });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `scraping_history_${new Date().toISOString()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Galat ekspor PDF:", error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button outline disabled={isExporting}>
                    {isExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                    ) : (
                        <Download className="h-4 w-4" data-slot="icon" />
                    )}
                    Ekspor
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCsv}>
                    <FileJson className="mr-2 h-4 w-4" />
                    Ekspor sebagai CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf}>
                    <FileText className="mr-2 h-4 w-4" />
                    Ekspor sebagai PDF
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
