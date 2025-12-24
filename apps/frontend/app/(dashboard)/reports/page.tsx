"use client";

import { useEffect, useState } from "react";
import { getComparisonData, getScrapingJobsForReport, exportComparisonPdf, ComparisonRow } from "@/app/actions/report";
import { getCategories } from "@/app/actions/category";
import { ComparisonTable } from "@/components/reports/comparison-table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
    const [exporting, setExporting] = useState(false);

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

    const handleExportPdf = async () => {
        if (!dates || !sortedData.length) return;
        setExporting(true);

        try {
            const month1 = format(dates.d1, "MMMM yyyy", { locale: id });
            const month2 = format(dates.d2, "MMMM yyyy", { locale: id });

            const exportData = {
                platform,
                month1,
                month2,
                data: sortedData.map(row => {
                    const isNA = row.oldStats.followers === -1;
                    return {
                        accountName: row.accountName,
                        handle: isNA ? "N/A" : row.handle,
                        oldFollowers: isNA ? -1 : row.oldStats.followers,
                        newFollowers: isNA ? -1 : row.newStats.followers,
                        followersPct: isNA ? 0 : row.delta.followersPct,
                        oldPosts: isNA ? -1 : row.oldStats.posts,
                        newPosts: isNA ? -1 : row.newStats.posts,
                        postsPct: isNA ? 0 : row.delta.postsPct,
                        oldLikes: isNA ? -1 : row.oldStats.likes,
                        newLikes: isNA ? -1 : row.newStats.likes,
                        likesPct: isNA ? 0 : row.delta.likesPct,
                    };
                }),
            };

            // Call server action which has access to WORKER_SECRET
            const base64Pdf = await exportComparisonPdf(exportData);

            // Convert base64 to blob and download
            const binaryString = atob(base64Pdf);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: "application/pdf" });

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `comparison-${platform}-${Date.now()}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export error:", error);
        } finally {
            setExporting(false);
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

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Laporan Perbandingan</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pilih Periode</CardTitle>
                    <CardDescription>
                        Bandingkan data statistik antara dua waktu pengambilan data (snapshot).
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="grid gap-2 w-full md:w-[300px]">
                        <label className="text-sm font-medium">Data Awal (Lama)</label>
                        <Select value={job1Id} onValueChange={setJob1Id} disabled={loadingJobs}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Tanggal..." />
                            </SelectTrigger>
                            <SelectContent>
                                {jobs
                                    .filter(job => {
                                        if (job.id === job2Id) return false;
                                        const job2 = jobs.find(j => j.id === job2Id);
                                        if (job2 && job.createdAt >= job2.createdAt) return false;
                                        return true;
                                    })
                                    .map(job => (
                                        <SelectItem key={job.id} value={job.id}>
                                            {format(job.createdAt, "dd MMMM yyyy, HH:mm", { locale: id })}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2 w-full md:w-[300px]">
                        <label className="text-sm font-medium">Data Akhir (Baru)</label>
                        <Select value={job2Id} onValueChange={setJob2Id} disabled={loadingJobs}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Tanggal..." />
                            </SelectTrigger>
                            <SelectContent>
                                {jobs
                                    .filter(job => {
                                        if (job.id === job1Id) return false;
                                        const job1 = jobs.find(j => j.id === job1Id);
                                        if (job1 && job.createdAt <= job1.createdAt) return false;
                                        return true;
                                    })
                                    .map(job => (
                                        <SelectItem key={job.id} value={job.id}>
                                            {format(job.createdAt, "dd MMMM yyyy, HH:mm", { locale: id })}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2 w-full md:w-[300px]">
                        <label className="text-sm font-medium">Filter Kategori</label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger>
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

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="includeNA"
                            checked={includeNA}
                            onCheckedChange={(checked) => setIncludeNA(checked === true)}
                        />
                        <Label htmlFor="includeNA" className="text-sm cursor-pointer">
                            Tampilkan akun tanpa sosmed (N/A)
                        </Label>
                    </div>

                    <Button onClick={handleCompare} disabled={loadingData || !job1Id || !job2Id}>
                        {loadingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Bandingkan Data
                    </Button>
                </CardContent>
            </Card>

            {comparisonData && dates && (
                <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Platform Filter & Export */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                            {platforms.map((p) => (
                                <Button
                                    key={p.value}
                                    variant={platform === p.value ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => setPlatform(p.value)}
                                    className={cn(
                                        "rounded-md transition-all",
                                        platform === p.value && "shadow-sm"
                                    )}
                                >
                                    {p.label}
                                </Button>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleExportPdf}
                            disabled={exporting || !filteredData.length}
                        >
                            {exporting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-4 w-4" />
                            )}
                            Export PDF
                        </Button>
                    </div>

                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <h3 className="text-lg font-semibold">
                            Hasil Perbandingan: {format(dates.d1, "dd MMM yyyy", { locale: id })} vs {format(dates.d2, "dd MMM yyyy", { locale: id })}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Urutkan:</span>
                            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                                <SelectTrigger className="w-[200px]">
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

                    <ComparisonTable
                        data={sortedData}
                        job1Date={dates.d1}
                        job2Date={dates.d2}
                        platform={platform}
                    />
                </div>
            )}
        </div>
    );
}
