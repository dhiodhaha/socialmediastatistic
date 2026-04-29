"use client";

import type { Platform } from "@repo/database";
import { Loader2, Play } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { exportHistoryCsv, exportHistoryPdf } from "@/modules/analytics/actions/history.actions";
import { ExportModal } from "@/modules/analytics/components/export-modal";
import { getCategories } from "@/modules/categories/actions/category.actions";
import { triggerScrape } from "@/modules/scraping/actions/scrape.actions";
import { ScrapeProgress } from "@/modules/scraping/components/scrape-progress";
import { Button } from "@/shared/components/catalyst/button";
import { DemoModeNotice } from "@/shared/components/demo-mode-notice";
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
} from "@/shared/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select";
import { isDemoMode } from "@/shared/lib/demo-mode";

type CategoryOption = { id: string; name: string };

export function HistoryToolbar({ activeJobId }: { activeJobId?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State lokal untuk melacak ID tugas yang sedang berjalan
    // Awalnya diambil dari properti server, lalu diperbarui saat scraping baru dimulai
    const [currentJobId, setCurrentJobId] = useState<string | undefined>(activeJobId);

    // Ambil state awal dari URL
    const initialStatus = searchParams.get("status") || "ALL";
    const initialPlatform = searchParams.get("platform") || "ALL";

    const [status, setStatus] = useState(initialStatus);
    const [platform, setPlatform] = useState(initialPlatform);
    const [_isExporting, setIsExporting] = useState(false);
    const [isScraping, setIsScraping] = useState(false);

    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [scrapeCategoryId, setScrapeCategoryId] = useState<string>("ALL");

    useEffect(() => {
        getCategories().then((res) => {
            if (res.success && res.data) {
                setCategories(res.data as CategoryOption[]);
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

        // Reset halaman saat filter berubah
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
            toast.error("Satu tugas scraping sedang berjalan");
            return;
        }

        setIsScraping(true);
        try {
            const catId = scrapeCategoryId === "ALL" ? undefined : scrapeCategoryId;
            const result = await triggerScrape(catId);
            if (result.success) {
                toast.success(catId ? "Tugas scraping kategori dimulai" : "Tugas scraping dimulai");
                // Simpan ID tugas baru untuk melacak progres
                if (result.jobId && result.jobId !== "unknown") {
                    setCurrentJobId(result.jobId);
                }
                router.refresh();
            } else {
                toast.error(result.error || "Gagal memulai scraping");
            }
        } catch {
            toast.error("Terjadi kesalahan yang tidak terduga");
        } finally {
            setIsScraping(false);
        }
    };

    const handleScrapeComplete = () => {
        // Hapus ID tugas saat scraping selesai
        setCurrentJobId(undefined);
    };

    const _handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const filters = {
                status: status !== "ALL" ? status : undefined,
                platform: platform !== "ALL" ? (platform as Platform) : undefined,
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
                alert(`Gagal mengekspor: ${result.error}`);
            }
        } catch (error) {
            console.error(error);
            alert("Ekspor gagal");
        } finally {
            setIsExporting(false);
        }
    };

    const _handleExport = async () => {
        setIsExporting(true);
        try {
            const filters = {
                status: status !== "ALL" ? status : undefined,
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
                alert(`Gagal mengekspor: ${result.error}`);
            }
        } catch (error) {
            console.error(error);
            alert("Ekspor gagal");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {isDemoMode && <DemoModeNotice compact />}
            {currentJobId && (
                <ScrapeProgress jobId={currentJobId} onComplete={handleScrapeComplete} />
            )}
            <div className="grid gap-5 border-y border-zinc-950/10 py-5 lg:grid-cols-[1fr_auto] lg:items-end dark:border-white/10">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label
                            htmlFor="history-status-filter"
                            className="text-base/7 font-medium text-zinc-900 sm:text-sm/6 dark:text-white"
                        >
                            Status kesiapan
                        </label>
                        <Select value={status} onValueChange={handleStatusChange}>
                            <SelectTrigger id="history-status-filter" className="w-full">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua status</SelectItem>
                                <SelectItem value="COMPLETED">Siap</SelectItem>
                                <SelectItem value="FAILED">Perlu ditinjau</SelectItem>
                                <SelectItem value="RUNNING">Sedang berjalan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor="history-platform-filter"
                            className="text-base/7 font-medium text-zinc-900 sm:text-sm/6 dark:text-white"
                        >
                            Platform
                        </label>
                        <Select value={platform} onValueChange={handlePlatformChange}>
                            <SelectTrigger id="history-platform-filter" className="w-full">
                                <SelectValue placeholder="Platform" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua platform</SelectItem>
                                <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                                <SelectItem value="TIKTOK">TikTok</SelectItem>
                                <SelectItem value="TWITTER">Twitter / X</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {!isDemoMode && (
                    <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                        <ExportModal />

                        <Select value={scrapeCategoryId} onValueChange={setScrapeCategoryId}>
                            <SelectTrigger className="w-full sm:w-[220px]">
                                <SelectValue placeholder="Cakupan scraping" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua akun</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button disabled={isScraping || !!currentJobId}>
                                    {isScraping ? (
                                        <Loader2 className="size-4 animate-spin" data-slot="icon" />
                                    ) : (
                                        <Play className="size-4" data-slot="icon" />
                                    )}
                                    Mulai scraping
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Mulai proses scraping?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {scrapeCategoryId === "ALL"
                                            ? "Ini akan menjalankan scraping untuk SEMUA akun. Proses ini bisa memakan waktu beberapa menit."
                                            : "Ini akan menjalankan scraping untuk kategori yang dipilih. Proses ini bisa memakan waktu beberapa menit."}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleScrape}>
                                        Ya, mulai scraping
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </div>
        </div>
    );
}
