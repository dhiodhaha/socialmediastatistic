"use client";

import { useEffect, useState } from "react";
import { getComparisonData, getScrapingJobsForReport, ComparisonRow } from "@/app/actions/report";
import { getCategories } from "@/app/actions/category";
import { ComparisonTable } from "@/components/reports/comparison-table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/catalyst/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, Filter, Play } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ExportModal } from "@/components/export-modal";
import { Separator } from "@/components/ui/separator";

type Platform = "INSTAGRAM" | "TIKTOK" | "TWITTER";

interface JobOption {
    id: string;
    createdAt: Date;
    totalAccounts: number;
}

export default function ComparisonPage() {
    const [jobs, setJobs] = useState<JobOption[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);

    const [job1Id, setJob1Id] = useState<string>("");
    const [job2Id, setJob2Id] = useState<string>("");

    const [loadingData, setLoadingData] = useState(false);
    const [comparisonData, setComparisonData] = useState<ComparisonRow[] | null>(null);
    const [dates, setDates] = useState<{ d1: Date; d2: Date } | null>(null);
    const [platform, setPlatform] = useState<Platform>("INSTAGRAM");

    // Category Filter
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [categoryId, setCategoryId] = useState<string>("ALL");

    // Include N/A (accounts without this platform)
    const [includeNA, setIncludeNA] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch jobs
                const data = await getScrapingJobsForReport();
                const mapped = data.map(j => ({
                    ...j,
                    createdAt: new Date(j.createdAt)
                }));
                setJobs(mapped);

                if (mapped.length >= 2) {
                    setJob2Id(mapped[0].id);
                    setJob1Id(mapped[1].id);
                } else if (mapped.length === 1) {
                    setJob2Id(mapped[0].id);
                }

                // Fetch categories
                const catRes = await getCategories();
                if (catRes.success && catRes.data) {
                    setCategories(catRes.data as { id: string; name: string }[]);
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoadingJobs(false);
            }
        }

        fetchData();
    }, []);

    const handleCompare = async () => {
        if (!job1Id || !job2Id) return;
        setLoadingData(true);
        try {
            const data = await getComparisonData(job1Id, job2Id, categoryId === "ALL" ? undefined : categoryId, includeNA);
            setComparisonData(data);

            const j1 = jobs.find(j => j.id === job1Id);
            const j2 = jobs.find(j => j.id === job2Id);
            if (j1 && j2) {
                setDates({ d1: j1.createdAt, d2: j2.createdAt });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingData(false);
        }
    };

    // Sort options
    type SortOption = "followers" | "growth" | "name" | "na-first";
    const [sortBy, setSortBy] = useState<SortOption>("followers");

    const filteredData = comparisonData?.filter(row => row.platform === platform) || [];

    // Apply sorting
    const sortedData = [...filteredData].sort((a, b) => {
        const aIsNA = a.oldStats.followers === -1;
        const bIsNA = b.oldStats.followers === -1;

        if (sortBy === "na-first") {
            if (aIsNA && !bIsNA) return -1;
            if (!aIsNA && bIsNA) return 1;
            return b.newStats.followers - a.newStats.followers;
        }
        if (sortBy === "followers") {
            // N/A goes to bottom
            if (aIsNA) return 1;
            if (bIsNA) return -1;
            return b.newStats.followers - a.newStats.followers;
        }
        if (sortBy === "growth") {
            if (aIsNA) return 1;
            if (bIsNA) return -1;
            return b.delta.followersPct - a.delta.followersPct;
        }
        if (sortBy === "name") {
            return a.accountName.localeCompare(b.accountName);
        }
        return 0;
    });

    const sortOptions: { value: SortOption; label: string }[] = [
        { value: "followers", label: "Pengikut Terbanyak" },
        { value: "growth", label: "Pertumbuhan Tertinggi" },
        { value: "name", label: "Nama A-Z" },
        { value: "na-first", label: "Tanpa Akun (N/A) Dulu" },
    ];

    const platforms: { value: Platform; label: string }[] = [
        { value: "INSTAGRAM", label: "Instagram" },
        { value: "TIKTOK", label: "TikTok" },
        { value: "TWITTER", label: "Twitter" },
    ];

    const getJobOptions = (excludeId?: string, isBefore?: boolean, referenceDate?: Date) => {
        return jobs
            .filter(job => {
                if (excludeId && job.id === excludeId) return false;
                if (referenceDate) {
                    if (isBefore && job.createdAt >= referenceDate) return false;
                    if (!isBefore && job.createdAt <= referenceDate) return false;
                }
                return true;
            })
            .map(job => (
                <SelectItem key={job.id} value={job.id}>
                    {format(job.createdAt, "dd MMM yyyy", { locale: id })}
                </SelectItem>
            ));
    };

    const job1Obj = jobs.find(j => j.id === job1Id);
    const job2Obj = jobs.find(j => j.id === job2Id);

    return (
        <div className="flex flex-col h-full space-y-6 p-8 pt-6">
            {/* Header with Title & Export Action */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Laporan Pertumbuhan</h2>
                    <p className="text-muted-foreground text-sm">
                        Analisis performa akun antar periode
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Unified Export Button */}
                    <ExportModal
                        trigger={
                            <Button outline>
                                Export PDF
                            </Button>
                        }
                        defaultCategoryId={categoryId !== "ALL" ? categoryId : undefined}
                    />
                </div>
            </div>

            {/* Filter Strip - Sticky/Prominent */}
            {/* Filter Strip - Sticky/Prominent */}
            <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow-sm p-4 sticky top-4 z-10 transition-all">
                <div className="flex flex-col xl:flex-row xl:items-end gap-4 justify-between">

                    {/* Left Controls Group */}
                    <div className="flex flex-col sm:flex-row items-end gap-2 w-full xl:w-auto">

                        {/* Data Lama */}
                        <div className="grid gap-1.5 flex-1 sm:w-[160px]">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Data Lama</Label>
                            <Select value={job1Id} onValueChange={setJob1Id} disabled={loadingJobs}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Pilih..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {getJobOptions(job2Id, true, job2Obj?.createdAt)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center justify-center h-9 w-6 pb-0.5 text-muted-foreground">
                            <ArrowRight className="h-4 w-4" />
                        </div>

                        {/* Data Baru */}
                        <div className="grid gap-1.5 flex-1 sm:w-[160px]">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Data Baru</Label>
                            <Select value={job2Id} onValueChange={setJob2Id} disabled={loadingJobs}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Pilih..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {getJobOptions(job1Id, false, job1Obj?.createdAt)}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator orientation="vertical" className="hidden xl:block h-8 mx-2 mb-0.5" />

                        {/* Categories */}
                        <div className="grid gap-1.5 w-full sm:w-[180px]">
                            <Label className="text-xs text-muted-foreground uppercase font-semibold">Kategori</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Semua Kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Kategori</SelectItem>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Right Actions Group */}
                    <div className="flex items-center gap-4 w-full xl:w-auto justify-end">
                        <div className="flex items-center gap-2 h-9">
                            <Checkbox
                                id="includeNA"
                                checked={includeNA}
                                onCheckedChange={(c) => setIncludeNA(!!c)}
                            />
                            <Label htmlFor="includeNA" className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mt-0.5">
                                Include N/A
                            </Label>
                        </div>

                        <Button onClick={handleCompare} disabled={loadingData || !job1Id || !job2Id} className="min-w-[120px] px-6">
                            {loadingData ? <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" /> : <Play className="h-4 w-4 fill-current" data-slot="icon" />}
                            Bandingkan
                        </Button>
                    </div>
                </div>
            </div>

            {/* Results Area */}
            {comparisonData && dates ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">

                    {/* Results Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                        <div className="flex p-1 bg-muted/50 rounded-lg w-fit">
                            {platforms.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setPlatform(p.value)}
                                    className={cn(
                                        "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                        platform === p.value
                                            ? "bg-background shadow-sm text-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Sort:</span>
                            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                                <SelectTrigger className="h-9 w-[180px] text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="min-h-[400px]">
                        <ComparisonTable
                            data={sortedData}
                            job1Date={dates.d1}
                            job2Date={dates.d2}
                            platform={platform}
                        />
                    </div>
                </div>
            ) : (
                // Empty State
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-muted/20 h-[400px]">
                    <div className="bg-muted p-4 rounded-full mb-4">
                        <Filter className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">Bandingkan Data</h3>
                    <p className="text-muted-foreground max-w-sm mt-2">
                        Pilih dua periode (snapshot) di panel atas untuk melihat analisis pertumbuhan akun.
                    </p>
                </div>
            )}
        </div>
    );
}
