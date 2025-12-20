"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileJson, FileText, Loader2 } from "lucide-react";
import { getAllScrapingHistory, exportHistoryPdf, HistoryFilters } from "@/app/actions";
import Papa from "papaparse";

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
                console.error("Failed to fetch data for CSV export");
                return;
            }

            const csvData = result.data.map((job) => ({
                ID: job.id,
                Status: job.status,
                "Total Accounts": job.totalAccounts,
                "Success Count": job.completedCount,
                "Failed Count": job.failedCount,
                "Created At": new Date(job.createdAt).toLocaleString(),
                "Started At": job.startedAt ? new Date(job.startedAt).toLocaleString() : "-",
                "Completed At": job.completedAt ? new Date(job.completedAt).toLocaleString() : "-",
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
            console.error("CSV Export error:", error);
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
                console.error("Failed to fetch data for PDF export", result.error);
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
            console.error("PDF Export error:", error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCsv}>
                    <FileJson className="mr-2 h-4 w-4" />
                    Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
