"use client";

import type { Platform } from "@repo/database";
import { ArrowRight, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
    type ComparisonRow,
    exportComparisonPdf,
    getComparisonData,
    getScrapingJobsForReport,
} from "@/modules/analytics/actions/report.actions";
import type { MonthlyReportingAnchor } from "@/modules/analytics/lib/monthly-reporting";
import { getCategories } from "@/modules/categories/actions/category.actions";
import { Button } from "@/shared/components/catalyst/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";

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
    const [jobs, setJobs] = useState<MonthlyReportingAnchor[]>([]);
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

    const formatJobLabel = (job: MonthlyReportingAnchor) => {
        return `${job.label} • ${job.sourceLabel}`;
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
            const month1 = job1Data ? job1Data.label : "Data Lama";
            const month2 = job2Data ? job2Data.label : "Data Baru";

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
            <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Buat PDF laporan</DialogTitle>
                </DialogHeader>

                <div className="flex-1 space-y-5 overflow-y-auto py-4">
                    <ExportSection
                        number={1}
                        title="Periode laporan"
                        description="Pilih data lama dan data baru yang akan dibandingkan."
                    >
                        <div className="grid gap-4">
                            <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
                                <div className="space-y-2">
                                    <Label className="text-base/7 font-medium text-zinc-500 sm:text-sm/6">
                                        Jenis laporan
                                    </Label>
                                    <Select
                                        value={mode}
                                        onValueChange={(v) => setMode(v as "single" | "comparison")}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Pilih mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="comparison">Pertumbuhan</SelectItem>
                                            <SelectItem value="single">Snapshot tunggal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="rounded-2xl bg-blue-50 p-4 text-base/7 text-blue-950 sm:text-sm/6 dark:bg-blue-950/30 dark:text-blue-100">
                                    {mode === "comparison"
                                        ? "Rekomendasi: gunakan mode pertumbuhan untuk PDF laporan bulanan."
                                        : "Snapshot tunggal hanya menampilkan kondisi satu periode tanpa pertumbuhan."}
                                </div>
                            </div>

                            {mode === "comparison" ? (
                                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                                    <SnapshotSelect
                                        label="Data awal"
                                        value={job1}
                                        jobs={jobs}
                                        onChange={setJob1}
                                        formatJobLabel={formatJobLabel}
                                    />
                                    <div className="hidden pb-2 sm:block">
                                        <ArrowRight className="size-5 text-zinc-400" />
                                    </div>
                                    <SnapshotSelect
                                        label="Data akhir"
                                        value={job2}
                                        jobs={jobs}
                                        onChange={setJob2}
                                        formatJobLabel={formatJobLabel}
                                    />
                                </div>
                            ) : (
                                <SnapshotSelect
                                    label="Snapshot laporan"
                                    value={job1}
                                    jobs={jobs}
                                    onChange={setJob1}
                                    formatJobLabel={formatJobLabel}
                                />
                            )}
                        </div>
                    </ExportSection>

                    <ExportSection
                        number={2}
                        title="Cakupan laporan"
                        description="Tentukan grup akun dan platform yang masuk ke PDF."
                    >
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label className="text-base/7 font-medium text-zinc-500 sm:text-sm/6">
                                    Grup laporan
                                </Label>
                                <Select value={categoryId} onValueChange={setCategoryId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Pilih kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua grup</SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <Label className="text-base/7 font-medium text-zinc-500 sm:text-sm/6">
                                        Platform
                                    </Label>
                                    <label
                                        htmlFor="all"
                                        className="flex cursor-pointer items-center gap-2 text-base/7 text-zinc-500 sm:text-sm/6"
                                    >
                                        <Checkbox
                                            id="all"
                                            checked={allSelected}
                                            onCheckedChange={(checked) =>
                                                handleSelectAll(!!checked)
                                            }
                                        />
                                        Pilih semua
                                    </label>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-3">
                                    <PlatformTile
                                        id="instagram"
                                        label="Instagram"
                                        checked={platforms.INSTAGRAM}
                                        onToggle={() => handlePlatformToggle("INSTAGRAM")}
                                    />
                                    <PlatformTile
                                        id="tiktok"
                                        label="TikTok"
                                        checked={platforms.TIKTOK}
                                        onToggle={() => handlePlatformToggle("TIKTOK")}
                                    />
                                    <PlatformTile
                                        id="twitter"
                                        label="Twitter / X"
                                        checked={platforms.TWITTER}
                                        onToggle={() => handlePlatformToggle("TWITTER")}
                                    />
                                </div>
                            </div>
                        </div>
                    </ExportSection>

                    <ExportSection
                        number={3}
                        title="Detail PDF"
                        description="Judul dan halaman pembuka untuk file laporan."
                    >
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label className="text-base/7 font-medium text-zinc-500 sm:text-sm/6">
                                    Judul laporan
                                </Label>
                                <Input
                                    placeholder="Kosongkan untuk memakai judul otomatis"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                />
                            </div>

                            <label
                                htmlFor="cover"
                                className="flex cursor-pointer items-start gap-3 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-950/5 dark:bg-zinc-950 dark:ring-white/10"
                            >
                                <Checkbox
                                    id="cover"
                                    checked={includeCover}
                                    onCheckedChange={(checked) => setIncludeCover(!!checked)}
                                />
                                <span>
                                    <span className="block text-base/7 font-medium text-zinc-950 sm:text-sm/6 dark:text-white">
                                        Sertakan halaman cover
                                    </span>
                                    <span className="block text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                                        Cocok untuk versi PDF yang akan dibagikan.
                                    </span>
                                </span>
                            </label>
                        </div>
                    </ExportSection>
                </div>

                <DialogFooter className="border-t border-zinc-950/10 pt-4 dark:border-white/10">
                    <DialogClose asChild>
                        <Button plain>Batal</Button>
                    </DialogClose>
                    <Button onClick={handleExport} disabled={isExporting || noneSelected}>
                        {isExporting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                                Mengekspor...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" data-slot="icon" />
                                Ekspor PDF
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ExportSection({
    number,
    title,
    description,
    children,
}: {
    number: number;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="grid gap-4 rounded-3xl border border-zinc-950/10 p-4 sm:grid-cols-[180px_minmax(0,1fr)] dark:border-white/10">
            <div className="flex gap-3 sm:block">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white sm:mb-3 dark:bg-white dark:text-zinc-950">
                    {number}
                </div>
                <div>
                    <h3 className="text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white">
                        {title}
                    </h3>
                    <p className="mt-1 text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                        {description}
                    </p>
                </div>
            </div>
            <div>{children}</div>
        </section>
    );
}

function SnapshotSelect({
    label,
    value,
    jobs,
    onChange,
    formatJobLabel,
}: {
    label: string;
    value: string;
    jobs: MonthlyReportingAnchor[];
    onChange: (value: string) => void;
    formatJobLabel: (job: MonthlyReportingAnchor) => string;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-base/7 font-medium text-zinc-500 sm:text-sm/6">{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
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
    );
}

function PlatformTile({
    id,
    label,
    checked,
    onToggle,
}: {
    id: string;
    label: string;
    checked: boolean;
    onToggle: () => void;
}) {
    return (
        <label
            htmlFor={id}
            className={cn(
                "flex cursor-pointer items-center justify-between rounded-2xl border p-3 transition",
                checked
                    ? "border-blue-600 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950/30 dark:text-blue-100"
                    : "border-zinc-950/10 text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-950",
            )}
        >
            <span className="text-base/7 font-medium sm:text-sm/6">{label}</span>
            <Checkbox id={id} checked={checked} onCheckedChange={onToggle} />
        </label>
    );
}
