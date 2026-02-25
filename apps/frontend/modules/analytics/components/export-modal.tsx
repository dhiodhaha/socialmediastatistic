"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/catalyst/button";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Download, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getCategories } from "@/modules/categories/actions/category.actions";
import { getScrapingJobsForReport, getComparisonData, exportComparisonPdf, ComparisonRow } from "@/modules/analytics/actions/report.actions";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Platform } from "@repo/database";

interface ExportModalProps {
    trigger?: React.ReactNode;
    defaultCategoryId?: string;
}

export function ExportModal({ trigger, defaultCategoryId }: ExportModalProps) {
    const [open, setOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Export mode
    const [mode, setMode] = useState<"single" | "comparison">("comparison");

    // Platform selection
    const [platforms, setPlatforms] = useState<Record<Platform, boolean>>({
        INSTAGRAM: true,
        TIKTOK: true,
        TWITTER: true,
    });

    // Filters
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [categoryId, setCategoryId] = useState<string>(defaultCategoryId || "ALL");
    const [jobs, setJobs] = useState<{ id: string; createdAt: Date; completedAt: Date | null; totalAccounts: number }[]>([]);
    const [job1, setJob1] = useState<string>("");
    const [job2, setJob2] = useState<string>("");

    // Cover page options
    const [includeCover, setIncludeCover] = useState(true);
    const [customTitle, setCustomTitle] = useState("");

    useEffect(() => {
        if (open) {
            // Fetch categories and jobs when modal opens
            getCategories().then((res) => {
                if (res.success && res.data) {
                    setCategories(res.data);
                }
            });
            getScrapingJobsForReport().then((jobsData) => {
                setJobs(jobsData);
                if (jobsData.length >= 2) {
                    setJob1(jobsData[1].id); // Second newest (old)
                    setJob2(jobsData[0].id); // Newest (new)
                } else if (jobsData.length === 1) {
                    setJob1(jobsData[0].id);
                    setJob2(jobsData[0].id);
                }
            });
        }
    }, [open]);

    const handlePlatformToggle = (platform: Platform) => {
        setPlatforms((prev) => ({
            ...prev,
            [platform]: !prev[platform],
        }));
    };

    const handleSelectAll = (checked: boolean) => {
        setPlatforms({
            INSTAGRAM: checked,
            TIKTOK: checked,
            TWITTER: checked,
        });
    };

    const allSelected = platforms.INSTAGRAM && platforms.TIKTOK && platforms.TWITTER;
    const noneSelected = !platforms.INSTAGRAM && !platforms.TIKTOK && !platforms.TWITTER;

    const formatJobLabel = (job: { createdAt: Date; totalAccounts: number }) => {
        return format(new Date(job.createdAt), "dd MMM yyyy", { locale: id });
    };

    const handleExport = async () => {
        if (noneSelected) {
            toast.error("Pilih minimal satu platform");
            return;
        }

        if (!job1 || !job2) {
            toast.error("Pilih tanggal/job");
            return;
        }

        setIsExporting(true);
        try {
            // Get data for selected category
            const catId = categoryId === "ALL" ? undefined : categoryId;
            const rows = await getComparisonData(job1, job2, catId, true);

            // Filter by selected platforms
            const selectedPlatforms = Object.entries(platforms)
                .filter(([_, selected]) => selected)
                .map(([p]) => p as Platform);

            const filteredRows = rows.filter((row) => selectedPlatforms.includes(row.platform));

            if (filteredRows.length === 0) {
                toast.error("Tidak ada data untuk di-export");
                setIsExporting(false);
                return;
            }

            // Group by platform for export
            const groupedByPlatform: Record<string, ComparisonRow[]> = {};
            for (const row of filteredRows) {
                if (!groupedByPlatform[row.platform]) {
                    groupedByPlatform[row.platform] = [];
                }
                groupedByPlatform[row.platform].push(row);
            }

            // Get job dates for labels
            const job1Data = jobs.find((j) => j.id === job1);
            const job2Data = jobs.find((j) => j.id === job2);
            const month1 = job1Data ? format(new Date(job1Data.createdAt), "MMMM yyyy", { locale: id }) : "Data Lama";
            const month2 = job2Data ? format(new Date(job2Data.createdAt), "MMMM yyyy", { locale: id }) : "Data Baru";

            // Build sections for each platform
            const sections = Object.entries(groupedByPlatform).map(([platform, platformRows]) => ({
                platform,
                data: platformRows.map((row) => ({
                    accountName: row.accountName,
                    handle: row.handle,
                    oldFollowers: row.oldStats.followers,
                    newFollowers: row.newStats.followers,
                    followersPct: row.delta.followersPct,
                    oldPosts: row.oldStats.posts,
                    newPosts: row.newStats.posts,
                    postsPct: row.delta.postsPct,
                    oldLikes: row.oldStats.likes,
                    newLikes: row.newStats.likes,
                    likesPct: row.delta.likesPct,
                })),
            }));

            // Export ALL platforms in ONE PDF
            const exportData = {
                sections,
                month1,
                month2,
                includeCover,
                customTitle: customTitle || undefined,
            };

            const base64 = await exportComparisonPdf(exportData);

            // Download the single combined PDF
            const link = document.createElement("a");
            link.href = `data:application/pdf;base64,${base64}`;
            link.download = `report-social-media-${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Export berhasil!");
            setOpen(false);
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Export gagal");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button outline>
                        <Download className="h-4 w-4" data-slot="icon" />
                        Export PDF
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Export Report</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4 overflow-y-auto flex-1">
                    {/* ===== SECTION 1: KONFIGURASI DATA ===== */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">1</span>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Konfigurasi Data</h3>
                        </div>

                        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                            {/* Mode Export */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Mode Export</Label>
                                <Select value={mode} onValueChange={(v) => setMode(v as "single" | "comparison")}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="comparison">Pertumbuhan (2 tanggal)</SelectItem>
                                        <SelectItem value="single">Snapshot tunggal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Periode Perbandingan with Arrow */}
                            {mode === "comparison" && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Periode Perbandingan</Label>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 space-y-1">
                                            <span className="text-xs text-muted-foreground">Awal (Data Lama)</span>
                                            <Select value={job1} onValueChange={setJob1}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih tanggal" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {jobs.map((job) => (
                                                        <SelectItem key={job.id} value={job.id}>
                                                            {formatJobLabel(job)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-5" />
                                        <div className="flex-1 space-y-1">
                                            <span className="text-xs text-muted-foreground">Akhir (Data Baru)</span>
                                            <Select value={job2} onValueChange={setJob2}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih tanggal" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {jobs.map((job) => (
                                                        <SelectItem key={job.id} value={job.id}>
                                                            {formatJobLabel(job)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Single mode date picker */}
                            {mode === "single" && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Tanggal Snapshot</Label>
                                    <Select value={job1} onValueChange={setJob1}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih tanggal" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {jobs.map((job) => (
                                                <SelectItem key={job.id} value={job.id}>
                                                    {formatJobLabel(job)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ===== SECTION 2: FILTER & CAKUPAN ===== */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">2</span>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Filter & Cakupan</h3>
                        </div>

                        <div className="space-y-4">
                            {/* Category Filter */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Kategori</Label>
                                <Select value={categoryId} onValueChange={setCategoryId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua Kategori</SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Platform as Horizontal Tiles */}
                            <div className="space-y-3">
                                <Label className="text-xs text-muted-foreground">Platform</Label>

                                {/* Select All */}
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="all"
                                        checked={allSelected}
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    />
                                    <Label htmlFor="all" className="text-sm font-normal cursor-pointer">
                                        Pilih Semua
                                    </Label>
                                </div>

                                {/* Horizontal Platform Tiles */}
                                <div className="flex items-center gap-2">
                                    <label
                                        htmlFor="instagram"
                                        className={`flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${platforms.INSTAGRAM
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:bg-muted/50"
                                            }`}
                                    >
                                        <Checkbox
                                            id="instagram"
                                            checked={platforms.INSTAGRAM}
                                            onCheckedChange={() => handlePlatformToggle("INSTAGRAM")}
                                            className="sr-only"
                                        />
                                        <span className={`text-sm font-medium ${platforms.INSTAGRAM ? "text-primary" : ""}`}>
                                            Instagram
                                        </span>
                                    </label>

                                    <label
                                        htmlFor="tiktok"
                                        className={`flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${platforms.TIKTOK
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:bg-muted/50"
                                            }`}
                                    >
                                        <Checkbox
                                            id="tiktok"
                                            checked={platforms.TIKTOK}
                                            onCheckedChange={() => handlePlatformToggle("TIKTOK")}
                                            className="sr-only"
                                        />
                                        <span className={`text-sm font-medium ${platforms.TIKTOK ? "text-primary" : ""}`}>
                                            TikTok
                                        </span>
                                    </label>

                                    <label
                                        htmlFor="twitter"
                                        className={`flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${platforms.TWITTER
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:bg-muted/50"
                                            }`}
                                    >
                                        <Checkbox
                                            id="twitter"
                                            checked={platforms.TWITTER}
                                            onCheckedChange={() => handlePlatformToggle("TWITTER")}
                                            className="sr-only"
                                        />
                                        <span className={`text-sm font-medium ${platforms.TWITTER ? "text-primary" : ""}`}>
                                            Twitter/X
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ===== SECTION 3: PREFERENSI FILE ===== */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">3</span>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preferensi File</h3>
                        </div>

                        <div className="space-y-4">
                            {/* Custom Title */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Judul Laporan (Opsional)</Label>
                                <Input
                                    placeholder="Masukkan judul custom..."
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                />
                            </div>

                            {/* Cover Page Toggle */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="cover"
                                    checked={includeCover}
                                    onCheckedChange={(checked) => setIncludeCover(!!checked)}
                                />
                                <Label htmlFor="cover" className="text-sm font-normal cursor-pointer">
                                    Sertakan Halaman Cover
                                </Label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer with Cancel + Export buttons */}
                <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                        <Button plain>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleExport} disabled={isExporting || noneSelected}>
                        {isExporting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" data-slot="icon" />
                                Export PDF
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
