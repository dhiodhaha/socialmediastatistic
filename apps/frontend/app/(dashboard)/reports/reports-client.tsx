"use client";

import type { SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

// --- ACTIONS & TYPES ---
import {
    type ComparisonRow,
    exportComparisonPdf,
    exportLatestPdf,
    getComparisonData,
} from "@/modules/analytics/actions/report.actions";
import type { DisplayRow } from "@/modules/analytics/components/reports/columns";
import type { SelectOption } from "@/modules/analytics/components/reports/filter-listbox";
// --- COMPONENTS ---
import { ReportHeader } from "@/modules/analytics/components/reports/report-header";
import {
    type Platform,
    ReportsControls,
} from "@/modules/analytics/components/reports/reports-controls";
import { ReportsTable } from "@/modules/analytics/components/reports/reports-table";

type ReportsClientProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialJobs: any[];
    initialCategories: { id: string; name: string }[];
};

export function ReportsClient({ initialJobs, initialCategories }: ReportsClientProps) {
    // --- STATE ---
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>("INSTAGRAM");
    const [includeNA, setIncludeNA] = useState(false);
    const [hasViewed, setHasViewed] = useState(false);

    // Data States
    const [jobs, setJobs] = useState<SelectOption[]>([]);
    const [categories, setCategories] = useState<SelectOption[]>([]);

    // Raw Data State
    const [rawData, setRawData] = useState<ComparisonRow[]>([]);
    const [comparisonData, setComparisonData] = useState<DisplayRow[]>([]);

    // Loading States
    const [loadingData, setLoadingData] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportingAll, setExportingAll] = useState(false);
    const [exportingLatest, setExportingLatest] = useState(false);

    // Selected Options
    const [selectedCategory, setSelectedCategory] = useState<SelectOption>({
        id: "all",
        label: "Semua Kategori",
    });
    const [selectedPeriod, setSelectedPeriod] = useState<SelectOption | null>(null);
    const [selectedComparison, setSelectedComparison] = useState<SelectOption | null>(null);

    // Sorting State
    const [sorting, setSorting] = useState<SortingState>([
        { id: "result", desc: true }, // Default sort
    ]);

    // --- EFFECTS ---

    // 1. Load Initial Options
    useEffect(() => {
        // Map Jobs
        const jobOptions: SelectOption[] = initialJobs.map((job, idx) => ({
            id: job.id,
            label: format(new Date(job.createdAt), "MMMM yyyy", { locale: idLocale }),
            sub: idx === 0 ? "Latest Snapshot" : "Archived",
            icon: FileText,
        }));
        setJobs(jobOptions);

        // Map Categories
        let catOptions: SelectOption[] = [{ id: "all", label: "Semua Kategori" }];

        catOptions = [
            ...catOptions,
            ...initialCategories.map((c: { id: string; name: string }) => ({
                id: c.id,
                label: c.name,
            })),
        ];

        setCategories(catOptions);

        // Set defaults
        if (jobOptions.length > 0) {
            setSelectedPeriod(jobOptions[0]); // Select latest
            if (jobOptions.length > 1) {
                // Default comparison is previous month (2nd latest)
                const prev = jobOptions[1];
                setSelectedComparison({ ...prev, desc: `vs ${prev.label}` });
            }
        }
    }, [initialJobs, initialCategories]);

    // 2. Filter Raw Data when Platform or RawData changes
    useEffect(() => {
        if (rawData.length === 0) {
            setComparisonData([]);
            return;
        }

        // 1. Filter by Platform
        const filtered = rawData.filter((row) => row.platform === selectedPlatform);

        // 2. Sort by Followers Descending (to determine RANK correctly)
        // We do this BEFORE mapping to ensure rank 1 is highest followers
        filtered.sort((a, b) => {
            const valA = a.newStats.followers === -1 ? -1 : a.newStats.followers;
            const valB = b.newStats.followers === -1 ? -1 : b.newStats.followers;
            return valB - valA;
        });

        // 3. Map to DisplayRow
        const mappedRows = filtered.map((row, idx) => ({
            id: `${row.handle}-${idx}`,
            rank: idx + 1, // Normalized rank based on current view!!
            name: row.accountName,
            handle: `@${row.handle}`,
            category: row.category,

            // Result
            currentFollowers: row.newStats.followers,
            followersGrowth: `${row.delta.followersPct.toFixed(1)}%`,
            followersGrowthDir: row.delta.followersPct >= 0 ? ("up" as const) : ("down" as const),

            // Engagement (TikTok)
            currentLikes: row.newStats.likes !== -1 ? row.newStats.likes : undefined,
            likesGrowth: `${(row.delta.likesPct ?? 0).toFixed(1)}%`,
            likesGrowthDir: (row.delta.likesPct ?? 0) >= 0 ? ("up" as const) : ("down" as const),

            // Effort
            currentPosts: row.newStats.posts !== -1 ? row.newStats.posts : 0,
            newPosts: row.delta.postsVal,

            isNA: row.oldStats.followers === -1,

            // Helper for verification
            rawOldFollowers: row.oldStats.followers,
            rawOldPosts: row.oldStats.posts,
            rawOldLikes: row.oldStats.likes,
        }));

        setComparisonData(mappedRows);
    }, [rawData, selectedPlatform]);

    // --- ACTIONS ---

    const handleViewReport = async () => {
        if (!selectedPeriod || !selectedComparison) return;

        setLoadingData(true);
        try {
            const data = await getComparisonData(
                selectedComparison.id,
                selectedPeriod.id,
                selectedCategory.id === "all" ? undefined : selectedCategory.id,
                includeNA,
            );
            setRawData(data);
            setHasViewed(true);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleExportPdf = async () => {
        if (!selectedPeriod || !selectedComparison || comparisonData.length === 0) return;
        setExporting(true);
        try {
            const pdfBase64 = await exportComparisonPdf({
                month1: selectedComparison.label,
                month2: selectedPeriod.label,
                customTitle: `${selectedPlatform}<br/>Laporan Pertumbuhan`,
                includeCover: true,
                sections: [
                    {
                        platform: selectedPlatform,
                        data: comparisonData.map((d) => ({
                            accountName: d.name,
                            handle: d.handle,
                            oldFollowers: d.rawOldFollowers,
                            newFollowers: d.currentFollowers,
                            followersPct: parseFloat(d.followersGrowth),
                            oldPosts: d.rawOldPosts,
                            newPosts: d.currentPosts,
                            postsPct: 0,
                            oldLikes: d.rawOldLikes,
                            newLikes: d.currentLikes,
                            likesPct: d.likesGrowth ? parseFloat(d.likesGrowth) : 0,
                        })),
                    },
                ],
            });

            downloadPdf(
                pdfBase64,
                `report-${selectedPlatform.toLowerCase()}-${format(new Date(), "yyyyMMdd")}.pdf`,
            );
        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed. Please check console.");
        } finally {
            setExporting(false);
        }
    };

    const handleExportAllPdf = async () => {
        if (!selectedPeriod || !selectedComparison || rawData.length === 0) return;
        setExportingAll(true);
        try {
            // We need to prepare data for ALL platforms from rawData
            const sections = [];

            for (const platform of ["INSTAGRAM", "TIKTOK", "TWITTER"] as const) {
                // Filter and sort for each platform
                const pRows = rawData.filter((r) => r.platform === platform);
                if (pRows.length === 0) continue;

                pRows.sort((a, b) => {
                    const valA = a.newStats.followers === -1 ? -1 : a.newStats.followers;
                    const valB = b.newStats.followers === -1 ? -1 : b.newStats.followers;
                    return valB - valA;
                });

                sections.push({
                    platform: platform,
                    data: pRows.map((row) => ({
                        accountName: row.accountName,
                        handle: `@${row.handle}`,
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
                });
            }

            const pdfBase64 = await exportComparisonPdf({
                month1: selectedComparison.label,
                month2: selectedPeriod.label,
                customTitle: `Analisis Performa Media Sosial<br/>${selectedCategory.label}`,
                includeCover: true,
                sections: sections,
            });

            downloadPdf(pdfBase64, `report-all-${format(new Date(), "yyyyMMdd")}.pdf`);
        } catch (error) {
            console.error("Export All failed:", error);
            alert("Export All failed. Please check console.");
        } finally {
            setExportingAll(false);
        }
    };

    const handleExportLatestPdf = async () => {
        if (!selectedPeriod || rawData.length === 0) return;
        setExportingLatest(true);
        try {
            const sections = [];

            for (const platform of ["INSTAGRAM", "TIKTOK", "TWITTER"] as const) {
                // Filter and sort for each platform
                const pRows = rawData.filter((r) => r.platform === platform);
                if (pRows.length === 0) continue;

                pRows.sort((a, b) => {
                    const valA = a.newStats.followers === -1 ? -1 : a.newStats.followers;
                    const valB = b.newStats.followers === -1 ? -1 : b.newStats.followers;
                    return valB - valA;
                });

                sections.push({
                    platform: platform,
                    data: pRows.map((row) => ({
                        accountName: row.accountName,
                        handle: `@${row.handle}`,
                        // Only need new stats
                        followers: row.newStats.followers,
                        posts: row.newStats.posts,
                        likes: row.newStats.likes,
                    })),
                });
            }

            const pdfBase64 = await exportLatestPdf({
                month: selectedPeriod.label,
                customTitle: `Laporan Data Terbaru<br/>${selectedCategory.label}`,
                includeCover: true,
                sections: sections,
            });

            downloadPdf(pdfBase64, `report-latest-${format(new Date(), "yyyyMMdd")}.pdf`);
        } catch (error) {
            console.error("Export Latest failed:", error);
            alert("Export Latest failed. Please check console.");
        } finally {
            setExportingLatest(false);
        }
    };

    // Helper for downloading blob
    const downloadPdf = async (base64: string, filename: string) => {
        const blob = await (await fetch(`data:application/pdf;base64,${base64}`)).blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- COMPUTED OPTIONS ---
    const comparisonOptions = jobs
        .filter((j) => j.id !== selectedPeriod?.id)
        .map((j) => ({
            ...j,
            desc: `vs ${j.label}`,
        }));

    return (
        <div className="flex flex-col space-y-8 p-10 max-w-7xl mx-auto">
            <ReportHeader
                exporting={exporting}
                exportingAll={exportingAll}
                exportingLatest={exportingLatest}
                hasViewed={hasViewed}
                onExport={handleExportPdf}
                onExportAll={handleExportAllPdf}
                onExportLatest={handleExportLatestPdf}
            />

            <ReportsControls
                selectedPlatform={selectedPlatform}
                setSelectedPlatform={setSelectedPlatform}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedPeriod={selectedPeriod}
                setSelectedPeriod={setSelectedPeriod}
                selectedComparison={selectedComparison}
                setSelectedComparison={setSelectedComparison}
                includeNA={includeNA}
                setIncludeNA={setIncludeNA}
                categories={categories}
                jobs={jobs}
                comparisonOptions={comparisonOptions}
                loading={false}
                loadingData={loadingData}
                onViewReport={handleViewReport}
            />

            <ReportsTable
                data={comparisonData}
                sorting={sorting}
                setSorting={setSorting}
                selectedPlatform={selectedPlatform}
                loadingData={loadingData}
                hasViewed={hasViewed}
            />
        </div>
    );
}
