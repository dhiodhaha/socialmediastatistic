"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getCategories } from "@/app/actions/category";
import { getScrapingJobsForReport, getComparisonData, exportComparisonPdf, ComparisonRow } from "@/app/actions/report";
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
        return `${format(new Date(job.createdAt), "dd MMM yyyy", { locale: id })} (${job.totalAccounts} akun)`;
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
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Export Report</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Mode Selection */}
                    <div className="space-y-2">
                        <Label>Mode Export</Label>
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

                    {/* Platform Selection */}
                    <div className="space-y-2">
                        <Label>Platform</Label>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="all"
                                    checked={allSelected}
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                />
                                <Label htmlFor="all" className="font-normal cursor-pointer">
                                    Semua Platform
                                </Label>
                            </div>
                            <div className="ml-6 flex flex-col gap-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="instagram"
                                        checked={platforms.INSTAGRAM}
                                        onCheckedChange={() => handlePlatformToggle("INSTAGRAM")}
                                    />
                                    <Label htmlFor="instagram" className="font-normal cursor-pointer">
                                        Instagram
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="tiktok"
                                        checked={platforms.TIKTOK}
                                        onCheckedChange={() => handlePlatformToggle("TIKTOK")}
                                    />
                                    <Label htmlFor="tiktok" className="font-normal cursor-pointer">
                                        TikTok
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="twitter"
                                        checked={platforms.TWITTER}
                                        onCheckedChange={() => handlePlatformToggle("TWITTER")}
                                    />
                                    <Label htmlFor="twitter" className="font-normal cursor-pointer">
                                        Twitter / X
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="space-y-2">
                        <Label>Kategori</Label>
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

                    {/* Job Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Data Lama</Label>
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
                        {mode === "comparison" && (
                            <div className="space-y-2">
                                <Label>Data Baru</Label>
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
                        )}
                    </div>

                    {/* Cover Page Options */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="cover"
                                checked={includeCover}
                                onCheckedChange={(checked) => setIncludeCover(!!checked)}
                            />
                            <Label htmlFor="cover" className="cursor-pointer">Include Cover Page</Label>
                        </div>
                        {includeCover && (
                            <div className="space-y-2">
                                <Label>Custom Title (opsional)</Label>
                                <Input
                                    placeholder="Judul laporan..."
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Export Button */}
                    <Button onClick={handleExport} disabled={isExporting || noneSelected} className="w-full">
                        {isExporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Export PDF
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
