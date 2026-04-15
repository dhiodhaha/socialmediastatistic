"use client";

import type { SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import {
    type ComparisonRow,
    exportComparisonPdfV2,
    exportLatestPdf,
    exportQuarterlyPdf,
    getComparisonData,
    getQuarterlyPreviewData,
} from "@/modules/analytics/actions/report.actions";
import type { DisplayRow } from "@/modules/analytics/components/reports/columns";
import type { SelectOption } from "@/modules/analytics/components/reports/filter-listbox";
import { MonthlySourceSummary } from "@/modules/analytics/components/reports/monthly-source-summary";
import { QuarterlyPlatformSummary } from "@/modules/analytics/components/reports/quarterly-platform-summary";
import { QuarterlyStatusSummary } from "@/modules/analytics/components/reports/quarterly-status-summary";
import { ReportHeader } from "@/modules/analytics/components/reports/report-header";
import type { ReportMode } from "@/modules/analytics/components/reports/report-mode";
import {
    type Platform,
    ReportsControls,
} from "@/modules/analytics/components/reports/reports-controls";
import { ReportsTable } from "@/modules/analytics/components/reports/reports-table";
import { buildQuarterlyExportData } from "@/modules/analytics/lib/quarterly-export";
import type {
    QuarterlyPlatformPreview,
    QuarterlyPreviewRow,
} from "@/modules/analytics/lib/quarterly-platform-preview";
import type { QuarterlyOption, QuarterlyStatus } from "@/modules/analytics/lib/quarterly-reporting";

type ReportsClientProps = {
    initialJobs: Array<{
        id: string;
        label: string;
        sourceLabel: string;
        source: "manual" | "inferred";
        reportingYear: number;
        reportingMonth: number;
        createdAt: string | Date;
        completedAt?: string | Date | null;
        totalAccounts?: number;
    }>;
    initialQuarterlyOptions: QuarterlyOption[];
    initialCategories: { id: string; name: string }[];
};

export function ReportsClient({
    initialJobs,
    initialQuarterlyOptions,
    initialCategories,
}: ReportsClientProps) {
    const [reportMode, setReportMode] = useState<ReportMode>("MONTHLY");
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>("INSTAGRAM");
    const [includeNA, setIncludeNA] = useState(false);
    const [hasViewed, setHasViewed] = useState(false);
    const [jobs, setJobs] = useState<SelectOption[]>([]);
    const [categories, setCategories] = useState<SelectOption[]>([]);
    const [rawData, setRawData] = useState<ComparisonRow[]>([]);
    const [comparisonData, setComparisonData] = useState<DisplayRow[]>([]);
    const [quarterlyPreview, setQuarterlyPreview] = useState<QuarterlyPlatformPreview | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportingAll, setExportingAll] = useState(false);
    const [exportingLatest, setExportingLatest] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<SelectOption>({
        id: "all",
        label: "Semua Kategori",
    });
    const [selectedPeriod, setSelectedPeriod] = useState<SelectOption | null>(null);
    const [selectedComparison, setSelectedComparison] = useState<SelectOption | null>(null);
    const [selectedYear, setSelectedYear] = useState<SelectOption | null>(null);
    const [selectedQuarter, setSelectedQuarter] = useState<SelectOption | null>(null);
    const [quarterlyStatus, setQuarterlyStatus] = useState<QuarterlyStatus | null>(null);
    const [sorting, setSorting] = useState<SortingState>([{ id: "result", desc: true }]);

    useEffect(() => {
        const jobOptions: SelectOption[] = initialJobs.map((job, idx) => ({
            id: job.id,
            label: job.label,
            sub: job.sourceLabel,
            desc: idx === 0 ? "Latest reporting anchor" : "Archived reporting anchor",
            icon: FileText,
        }));
        setJobs(jobOptions);

        setCategories([
            { id: "all", label: "Semua Kategori" },
            ...initialCategories.map((category) => ({
                id: category.id,
                label: category.name,
            })),
        ]);

        if (jobOptions.length === 0) return;

        setSelectedPeriod(jobOptions[0]);
        if (jobOptions.length > 1) {
            const previous = jobOptions[1];
            setSelectedComparison({ ...previous, desc: `vs ${previous.label}` });
        }

        const latestJob = initialJobs[0];
        if (!latestJob) return;

        const latestYear = latestJob.reportingYear;
        const latestQuarterNumber = Math.floor((latestJob.reportingMonth - 1) / 3) + 1;
        setSelectedYear({ id: String(latestYear), label: String(latestYear) });

        const defaultQuarterOption =
            initialQuarterlyOptions.find(
                (option) => option.year === latestYear && option.quarter === latestQuarterNumber,
            ) || null;

        setSelectedQuarter(
            defaultQuarterOption
                ? {
                      id: defaultQuarterOption.id,
                      label: defaultQuarterOption.label,
                      desc: defaultQuarterOption.desc,
                      disabled: defaultQuarterOption.disabled,
                  }
                : null,
        );
    }, [initialJobs, initialCategories, initialQuarterlyOptions]);

    useEffect(() => {
        if (reportMode === "QUARTERLY") {
            setComparisonData(
                mapQuarterlyRowsToDisplayRows(quarterlyPreview?.rows || [], selectedPlatform),
            );
            return;
        }

        setComparisonData(mapMonthlyRowsToDisplayRows(rawData, selectedPlatform));
    }, [rawData, selectedPlatform, reportMode, quarterlyPreview]);

    const handleViewReport = async () => {
        if (reportMode === "QUARTERLY") {
            if (!selectedYear || !selectedQuarter) return;

            const match = selectedQuarter.id.match(/Q(\d)$/);
            const quarterNumber = match
                ? Number(match[1])
                : Number(selectedQuarter.label.replace("Q", ""));
            if (!quarterNumber) return;

            setLoadingData(true);
            try {
                const preview = await getQuarterlyPreviewData(
                    Number(selectedYear.id),
                    quarterNumber,
                    selectedCategory.id === "all" ? undefined : selectedCategory.id,
                );
                setQuarterlyStatus(preview.status);
                setQuarterlyPreview(preview);
                setRawData([]);
                setHasViewed(true);
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingData(false);
            }
            return;
        }

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
            setQuarterlyPreview(null);
            setQuarterlyStatus(null);
            setHasViewed(true);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleReportModeChange = (mode: ReportMode) => {
        setReportMode(mode);
        setHasViewed(false);
        setRawData([]);
        setComparisonData([]);
        setQuarterlyPreview(null);
        setQuarterlyStatus(null);
    };

    const handleExportPdf = async () => {
        if (reportMode === "QUARTERLY") {
            if (!quarterlyPreview) return;
            setExporting(true);
            try {
                const pdfBase64 = await exportQuarterlyPdf(
                    buildQuarterlyExportData({
                        preview: quarterlyPreview,
                        categoryLabel: selectedCategory.label,
                        scope: "PLATFORM",
                        selectedPlatform,
                    }),
                );

                downloadPdf(
                    pdfBase64,
                    `quarterly-${selectedPlatform.toLowerCase()}-${format(new Date(), "yyyyMMdd")}.pdf`,
                );
            } catch (error) {
                console.error("Quarterly export failed:", error);
                alert("Quarterly export failed. Please check console.");
            } finally {
                setExporting(false);
            }
            return;
        }

        if (!selectedPeriod || !selectedComparison || comparisonData.length === 0) return;
        setExporting(true);
        try {
            const pdfBase64 = await exportComparisonPdfV2({
                month1: selectedComparison.label,
                month2: selectedPeriod.label,
                customTitle: `${selectedPlatform}<br/>Laporan Pertumbuhan`,
                includeCover: true,
                sourceMetadata: {
                    month1SourceLabel: selectedComparison.sub,
                    month2SourceLabel: selectedPeriod.sub,
                },
                sections: [
                    {
                        platform: selectedPlatform,
                        data: comparisonData.map((data) => ({
                            accountName: data.name,
                            handle: data.handle,
                            oldFollowers: data.rawOldFollowers,
                            newFollowers: data.currentFollowers,
                            followersPct: parseFloat(data.followersGrowth),
                            oldPosts: data.rawOldPosts,
                            newPosts: data.currentPosts,
                            postsPct: 0,
                            oldLikes: data.rawOldLikes,
                            newLikes: data.currentLikes,
                            likesPct: data.likesGrowth ? parseFloat(data.likesGrowth) : 0,
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
        if (reportMode === "QUARTERLY") {
            if (!quarterlyPreview) return;
            setExportingAll(true);
            try {
                const pdfBase64 = await exportQuarterlyPdf(
                    buildQuarterlyExportData({
                        preview: quarterlyPreview,
                        categoryLabel: selectedCategory.label,
                        scope: "ALL",
                    }),
                );

                downloadPdf(pdfBase64, `quarterly-all-${format(new Date(), "yyyyMMdd")}.pdf`);
            } catch (error) {
                console.error("Quarterly export all failed:", error);
                alert("Quarterly export all failed. Please check console.");
            } finally {
                setExportingAll(false);
            }
            return;
        }

        if (!selectedPeriod || !selectedComparison || rawData.length === 0) return;
        setExportingAll(true);
        try {
            const sections = [];

            for (const platform of ["INSTAGRAM", "TIKTOK", "TWITTER"] as const) {
                const platformRows = rawData.filter((row) => row.platform === platform);
                if (platformRows.length === 0) continue;

                platformRows.sort((a, b) => {
                    const valA = a.newStats.followers === -1 ? -1 : a.newStats.followers;
                    const valB = b.newStats.followers === -1 ? -1 : b.newStats.followers;
                    return valB - valA;
                });

                sections.push({
                    platform,
                    data: platformRows.map((row) => ({
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

            const pdfBase64 = await exportComparisonPdfV2({
                month1: selectedComparison.label,
                month2: selectedPeriod.label,
                customTitle: `Analisis Performa Media Sosial<br/>${selectedCategory.label}`,
                includeCover: true,
                sourceMetadata: {
                    month1SourceLabel: selectedComparison.sub,
                    month2SourceLabel: selectedPeriod.sub,
                },
                sections,
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
                const platformRows = rawData.filter((row) => row.platform === platform);
                if (platformRows.length === 0) continue;

                platformRows.sort((a, b) => {
                    const valA = a.newStats.followers === -1 ? -1 : a.newStats.followers;
                    const valB = b.newStats.followers === -1 ? -1 : b.newStats.followers;
                    return valB - valA;
                });

                sections.push({
                    platform,
                    data: platformRows.map((row) => ({
                        accountName: row.accountName,
                        handle: `@${row.handle}`,
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
                sections,
            });

            downloadPdf(pdfBase64, `report-latest-${format(new Date(), "yyyyMMdd")}.pdf`);
        } catch (error) {
            console.error("Export Latest failed:", error);
            alert("Export Latest failed. Please check console.");
        } finally {
            setExportingLatest(false);
        }
    };

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

    const comparisonOptions = jobs
        .filter((job) => job.id !== selectedPeriod?.id)
        .map((job) => ({
            ...job,
            desc: `vs ${job.label}`,
        }));

    const quarterYears = Array.from(
        new Set(initialQuarterlyOptions.map((option) => String(option.year))),
    )
        .sort((a, b) => Number(b) - Number(a))
        .map((year) => ({ id: year, label: year }));

    const quarterOptions: SelectOption[] = initialQuarterlyOptions
        .filter((option) => !selectedYear || option.year === Number(selectedYear.id))
        .map((option) => ({
            id: option.id,
            label: `Q${option.quarter}`,
            desc: option.desc,
            disabled: option.disabled,
        }));

    const selectedQuarterOption = initialQuarterlyOptions.find(
        (option) => option.id === selectedQuarter?.id,
    );
    const selectedQuarterSummary =
        quarterlyPreview?.summaries.find((summary) => summary.platform === selectedPlatform) ||
        null;

    return (
        <div className="mx-auto flex max-w-7xl flex-col space-y-8 p-10">
            <ReportHeader
                reportMode={reportMode}
                exporting={exporting}
                exportingAll={exportingAll}
                exportingLatest={exportingLatest}
                hasViewed={hasViewed}
                onExport={handleExportPdf}
                onExportAll={handleExportAllPdf}
                onExportLatest={handleExportLatestPdf}
            />

            <ReportsControls
                reportMode={reportMode}
                setReportMode={handleReportModeChange}
                selectedPlatform={selectedPlatform}
                setSelectedPlatform={setSelectedPlatform}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedPeriod={selectedPeriod}
                setSelectedPeriod={setSelectedPeriod}
                selectedComparison={selectedComparison}
                setSelectedComparison={setSelectedComparison}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedQuarter={selectedQuarter}
                setSelectedQuarter={setSelectedQuarter}
                includeNA={includeNA}
                setIncludeNA={setIncludeNA}
                categories={categories}
                jobs={jobs}
                years={quarterYears}
                quarters={quarterOptions}
                quarterUnavailableReason={
                    selectedQuarterOption?.disabled ? selectedQuarterOption.desc : null
                }
                comparisonOptions={comparisonOptions}
                loading={false}
                loadingData={loadingData}
                onViewReport={handleViewReport}
            />

            {reportMode === "QUARTERLY" && quarterlyStatus && (
                <QuarterlyStatusSummary status={quarterlyStatus} />
            )}

            {reportMode === "QUARTERLY" && quarterlyPreview && selectedQuarterSummary && (
                <QuarterlyPlatformSummary
                    platform={selectedPlatform}
                    categoryLabel={selectedCategory.label}
                    methodologyNote={quarterlyPreview.methodologyNote}
                    summary={selectedQuarterSummary}
                />
            )}

            {reportMode === "MONTHLY" && hasViewed && (
                <MonthlySourceSummary
                    currentPeriod={selectedPeriod}
                    comparisonPeriod={selectedComparison}
                />
            )}

            <ReportsTable
                data={comparisonData}
                sorting={sorting}
                setSorting={setSorting}
                selectedPlatform={selectedPlatform}
                loadingData={loadingData}
                hasViewed={hasViewed}
                reportMode={reportMode}
            />
        </div>
    );
}

function mapMonthlyRowsToDisplayRows(
    rows: ComparisonRow[],
    selectedPlatform: Platform,
): DisplayRow[] {
    const filtered = rows.filter((row) => row.platform === selectedPlatform);

    filtered.sort((a, b) => {
        const valA = a.newStats.followers === -1 ? -1 : a.newStats.followers;
        const valB = b.newStats.followers === -1 ? -1 : b.newStats.followers;
        return valB - valA;
    });

    return filtered.map((row, idx) => ({
        id: `${row.handle}-${idx}`,
        rank: idx + 1,
        name: row.accountName,
        handle: `@${row.handle}`,
        category: row.category,
        currentFollowers: row.newStats.followers,
        followersGrowth: `${row.delta.followersPct.toFixed(1)}%`,
        followersGrowthDir: growthDirection(row.delta.followersPct),
        currentLikes: row.newStats.likes !== -1 ? row.newStats.likes : undefined,
        likesGrowth: `${(row.delta.likesPct ?? 0).toFixed(1)}%`,
        likesGrowthDir: growthDirection(row.delta.likesPct ?? 0),
        currentPosts: row.newStats.posts !== -1 ? row.newStats.posts : 0,
        newPosts: row.delta.postsVal,
        isNA: row.oldStats.followers === -1,
        rawOldFollowers: row.oldStats.followers,
        rawOldPosts: row.oldStats.posts,
        rawOldLikes: row.oldStats.likes,
    }));
}

function mapQuarterlyRowsToDisplayRows(
    rows: QuarterlyPreviewRow[],
    selectedPlatform: Platform,
): DisplayRow[] {
    const filtered = rows
        .filter((row) => row.platform === selectedPlatform)
        .toSorted((a, b) => {
            const aEligible = a.rankingEligible ? 1 : 0;
            const bEligible = b.rankingEligible ? 1 : 0;

            if (aEligible !== bEligible) {
                return bEligible - aEligible;
            }

            return (
                (b.delta.followersPct ?? Number.NEGATIVE_INFINITY) -
                (a.delta.followersPct ?? Number.NEGATIVE_INFINITY)
            );
        });

    let rankedIndex = 0;

    return filtered.map((row) => {
        if (row.rankingEligible) {
            rankedIndex += 1;
        }

        return {
            id: `${row.platform}-${row.accountId}`,
            rank: row.rankingEligible ? rankedIndex : 0,
            name: row.accountName,
            handle: `@${row.handle}`,
            category: row.category,
            currentFollowers: row.newStats.followers ?? -1,
            followersGrowth:
                row.delta.followersPct === null ? "N/A" : `${row.delta.followersPct.toFixed(1)}%`,
            followersGrowthDir:
                row.delta.followersPct === null ? "na" : growthDirection(row.delta.followersPct),
            currentLikes: row.newStats.likes ?? undefined,
            likesGrowth:
                row.delta.likesPct === null || row.delta.likesPct === undefined
                    ? "N/A"
                    : `${row.delta.likesPct.toFixed(1)}%`,
            likesGrowthDir:
                row.delta.likesPct === null || row.delta.likesPct === undefined
                    ? "na"
                    : growthDirection(row.delta.likesPct),
            currentPosts: row.newStats.posts ?? -1,
            newPosts: row.delta.postsVal ?? 0,
            isNA: false,
            isRanked: row.rankingEligible,
            badges: [
                ...(row.sharedAccount ? [{ label: "Shared", tone: "blue" as const }] : []),
                ...(row.performanceIssue ? [{ label: "Performance", tone: "rose" as const }] : []),
                ...(row.dataQualityIssue
                    ? [{ label: "Data quality", tone: "amber" as const }]
                    : []),
                ...(!row.rankingEligible ? [{ label: "Unranked", tone: "zinc" as const }] : []),
            ],
            detailNote: row.detailNote,
            rawOldFollowers: row.oldStats.followers ?? 0,
            rawOldPosts: row.oldStats.posts ?? 0,
            rawOldLikes: row.oldStats.likes ?? 0,
        };
    });
}

function growthDirection(value: number): "up" | "down" | "flat" {
    if (value > 0) return "up";
    if (value < 0) return "down";
    return "flat";
}
