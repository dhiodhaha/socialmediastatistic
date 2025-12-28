"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/catalyst/button";
import { Download, Loader2, FileSpreadsheet, Play } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { exportHistoryPdf, exportHistoryCsv } from "@/app/actions/history";
import { getCategories } from "@/app/actions/category";
import { Platform } from "@repo/database";

import { ScrapeProgress } from "@/components/scrape-progress";
import { ExportModal } from "@/components/export-modal";
import { triggerScrape } from "@/app/actions/scrape";
import { toast } from "sonner";
import { useEffect } from "react";

export function HistoryToolbar({ activeJobId }: { activeJobId?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Local state to track the current running job ID
    // Initially set from server prop, but updates when we trigger a new scrape
    const [currentJobId, setCurrentJobId] = useState<string | undefined>(activeJobId);

    // Parse initial state from URL
    const initialStatus = searchParams.get("status") || "ALL";
    const initialPlatform = searchParams.get("platform") || "ALL";

    // Parse initial state from URL
    const [status, setStatus] = useState(initialStatus);
    const [platform, setPlatform] = useState(initialPlatform);
    const [isExporting, setIsExporting] = useState(false);
    const [isScraping, setIsScraping] = useState(false);

    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [scrapeCategoryId, setScrapeCategoryId] = useState<string>("ALL");

    useEffect(() => {
        getCategories().then(res => {
            if (res.success && res.data) {
                setCategories(res.data as any[]);
            }
        });
    }, []);

    const updateFilters = (newStatus: string, newPlatform: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (newStatus && newStatus !== "ALL") {
            params.set("status", newStatus);
        } else {
            params.delete("status");
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


    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        updateFilters(newStatus, platform);
    };

    const handlePlatformChange = (newPlatform: string) => {
        setPlatform(newPlatform);
        updateFilters(status, newPlatform);
    };

    const handleScrape = async () => {
        if (currentJobId) {
            toast.error("A scraping job is already in progress");
            return;
        }

        setIsScraping(true);
        try {
            const catId = scrapeCategoryId === "ALL" ? undefined : scrapeCategoryId;
            const result = await triggerScrape(catId);
            if (result.success) {
                toast.success(catId ? "Category scraping job started" : "Scraping job started");
                // Store the new job ID to track progress
                if (result.jobId && result.jobId !== "unknown") {
                    setCurrentJobId(result.jobId);
                }
                router.refresh();
            } else {
                toast.error(result.error || "Failed to start scraping");
            }
        } catch {
            toast.error("An unexpected error occurred");
        } finally {
            setIsScraping(false);
        }
    };

    const handleScrapeComplete = () => {
        // Clear the current job ID when scrape completes
        setCurrentJobId(undefined);
    };

    const handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const filters = {
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
        <div className="flex flex-col gap-4">
            {currentJobId && <ScrapeProgress jobId={currentJobId} onComplete={handleScrapeComplete} />}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-lg border">
                <div className="flex flex-1 flex-col sm:flex-row gap-4 w-full">

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
                    <ExportModal />

                    <Select value={scrapeCategoryId} onValueChange={setScrapeCategoryId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Urgent Scrape Scope" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Scrape All</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    Scrape {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button disabled={isScraping || !!currentJobId}>
                                {isScraping ? <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" /> : <Play className="h-4 w-4" data-slot="icon" />}
                                Scrape Now
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Mulai Proses Scraping?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {scrapeCategoryId === "ALL"
                                        ? "Ini akan menjalankan scraping untuk SEMUA akun. Proses ini bisa memakan waktu beberapa menit."
                                        : `Ini akan menjalankan scraping untuk kategori yang dipilih. Proses ini bisa memakan waktu beberapa menit.`
                                    }
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleScrape}>Ya, Mulai Scraping</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div >
        </div >
    );
}

