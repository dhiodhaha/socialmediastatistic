"use client";

import { useState, useEffect } from "react";
import {
    Heading,
    Subheading
} from "@/components/catalyst/heading";
import {
    Text,
    Strong
} from "@/components/catalyst/text";
import {
    Button
} from "@/components/catalyst/button";
import {
    Badge
} from "@/components/catalyst/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/catalyst/table";
import {
    Select
} from "@/components/catalyst/select";
import { Checkbox } from "@/components/catalyst/checkbox";
import {
    Share,
    Download,
    ArrowUpRight,
    ArrowDownRight,
    BadgeCheck,
    Users,
    History,
    Instagram,
    Search,
    Calendar,
    FileText,
    ArrowRightLeft,
    Layers,
    Loader2,
    Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RichSelect, type RichSelectOption } from "@/components/reports-selectors";
import { getComparisonData, getScrapingJobsForReport, type ComparisonRow } from "@/app/actions/report";
import { getCategories } from "@/app/actions/category";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type Platform = "INSTAGRAM" | "TIKTOK" | "TWITTER";

const PLATFORMS = [
    { id: "INSTAGRAM" as Platform, name: "Instagram", hasUpdate: false },
    { id: "TIKTOK" as Platform, name: "TikTok", hasUpdate: true },
    { id: "TWITTER" as Platform, name: "Twitter", hasUpdate: false },
];

// Format numbers for display
function formatNumber(num: number): string {
    if (num === -1) return "N/A";
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return num.toString();
}

interface JobOption {
    id: string;
    createdAt: Date;
    label: string;
}

// Types for display data
interface DisplayRow {
    rank: string;
    name: string;
    handle: string;
    verified: boolean;
    followers: string;
    growth: string;
    growthDir: "up" | "down";
    posts: string | null;
    newPosts: string;
    isNA: boolean;
    // TikTok-specific
    likes: string | null;
    likesGrowth: string;
    likesGrowthDir: "up" | "down";
}

// SRP: Loading state row
function LoadingRow({ colSpan }: { colSpan: number }) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} className="py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-zinc-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <Text>Loading data...</Text>
                </div>
            </TableCell>
        </TableRow>
    );
}

// SRP: Empty state row
function EmptyRow({ colSpan }: { colSpan: number }) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} className="py-12 text-center">
                <Text className="text-zinc-500">No data available for this platform.</Text>
            </TableCell>
        </TableRow>
    );
}

// SRP: Initial state - before user clicks "View Report"
function InitialStateRow({ colSpan }: { colSpan: number }) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} className="py-16 text-center">
                <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <FileText className="w-10 h-10" />
                    <Text className="text-zinc-500 font-medium">Select filters and click "View Report"</Text>
                </div>
            </TableCell>
        </TableRow>
    );
}

// SRP: Individual account row
function AccountRow({ item, showLikes }: { item: DisplayRow; showLikes: boolean }) {
    const rankBadgeStyles = item.isNA
        ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
        : "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30";

    const rankTextStyles = item.isNA
        ? "text-zinc-400"
        : "text-amber-600 dark:text-amber-500";

    const growthStyles = item.growthDir === "up"
        ? "text-emerald-600 dark:text-emerald-500"
        : "text-rose-600 dark:text-rose-500";

    const badgeStyles = item.growthDir === "up"
        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50"
        : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400";

    const GrowthIcon = item.growthDir === "up" ? ArrowUpRight : ArrowDownRight;

    return (
        <TableRow className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
            {/* Account Identity */}
            <TableCell className="py-6 pl-8">
                <div className="flex items-center gap-5">
                    <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg border", rankBadgeStyles)}>
                        <Strong className={cn("text-xs font-bold", rankTextStyles)}>{item.rank}</Strong>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <Strong className="text-zinc-900 dark:text-white truncate max-w-[160px]">{item.name}</Strong>
                            {item.verified && <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-50 flex-shrink-0" />}
                        </div>
                        <Badge color="zinc" className="w-fit mt-1 px-2.5 py-0.5 rounded-lg font-medium text-xs bg-zinc-100 dark:bg-zinc-800 border-none">
                            {item.handle}
                        </Badge>
                    </div>
                </div>
            </TableCell>

            {/* Followers */}
            <TableCell className="py-6 transition-all group-hover:pl-2">
                <div className="flex flex-col">
                    <Strong className="text-xl/8 font-bold text-zinc-900 dark:text-white tracking-tight">
                        {item.followers}
                    </Strong>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={cn("flex items-center gap-1 text-xs font-semibold", growthStyles)}>
                            <GrowthIcon className="w-4 h-4" />
                            {item.growth}
                        </div>
                    </div>
                </div>
            </TableCell>

            {/* Posts */}
            <TableCell className={cn("py-6", !showLikes && "pr-8")}>
                <div className="flex flex-col">
                    <div className="flex items-baseline gap-1.5">
                        <Strong className={cn(
                            "text-lg font-bold",
                            item.posts ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-700"
                        )}>
                            {item.posts ?? "N/A"}
                        </Strong>
                        {item.posts && <Text className="text-sm font-medium text-zinc-500">posts</Text>}
                    </div>
                    <Badge
                        color={item.growthDir === "up" ? "blue" : "zinc"}
                        className={cn("w-fit mt-1.5 px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wide", badgeStyles)}
                    >
                        {item.newPosts}
                    </Badge>
                </div>
            </TableCell>

            {/* Likes - TikTok only */}
            {showLikes && (
                <TableCell className="py-6 pr-8">
                    <div className="flex flex-col">
                        <Strong className="text-xl/8 font-bold text-zinc-900 dark:text-white tracking-tight">
                            {item.likes ?? "N/A"}
                        </Strong>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={cn(
                                "flex items-center gap-1 text-xs font-semibold",
                                item.likesGrowthDir === "up" ? "text-rose-500" : "text-zinc-500"
                            )}>
                                <Heart className="w-3.5 h-3.5 fill-current" />
                                {item.likesGrowth}
                            </div>
                        </div>
                    </div>
                </TableCell>
            )}
        </TableRow>
    );
}

// SRP: Renders appropriate table body content based on state
function TableContent({ loading, hasViewed, data, showLikes }: { loading: boolean; hasViewed: boolean; data: DisplayRow[]; showLikes: boolean }) {
    const colSpan = showLikes ? 4 : 3;
    if (loading) return <LoadingRow colSpan={colSpan} />;
    if (!hasViewed) return <InitialStateRow colSpan={colSpan} />;
    if (data.length === 0) return <EmptyRow colSpan={colSpan} />;
    return <>{data.map((item, idx) => <AccountRow key={idx} item={item} showLikes={showLikes} />)}</>;
}

export default function ReportsPrototype() {
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>("INSTAGRAM");
    const [includeNA, setIncludeNA] = useState(false);

    // Data states
    const [jobs, setJobs] = useState<JobOption[]>([]);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [comparisonData, setComparisonData] = useState<ComparisonRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [hasViewed, setHasViewed] = useState(false);

    // Selected filters
    const [selectedCategory, setSelectedCategory] = useState<RichSelectOption>({ id: "all", label: "Semua Kategori", sublabel: "Organization", icon: Layers });
    const [selectedDate, setSelectedDate] = useState<RichSelectOption | null>(null);
    const [selectedComparison, setSelectedComparison] = useState<RichSelectOption | null>(null);

    // Load jobs and categories on mount
    useEffect(() => {
        async function loadInitialData() {
            try {
                const [jobsData, catsResult] = await Promise.all([
                    getScrapingJobsForReport(),
                    getCategories()
                ]);

                const mappedJobs = jobsData.map(j => ({
                    id: j.id,
                    createdAt: new Date(j.createdAt),
                    label: format(new Date(j.createdAt), "MMMM yyyy", { locale: idLocale })
                }));
                setJobs(mappedJobs);

                if (mappedJobs.length >= 2) {
                    setSelectedDate({ id: mappedJobs[0].id, label: mappedJobs[0].label, sublabel: "Latest Snapshot", icon: FileText });
                    setSelectedComparison({ id: mappedJobs[1].id, label: mappedJobs[1].label, sublabel: `vs ${mappedJobs[1].label}`, icon: History });
                }

                if (catsResult.success && catsResult.data) {
                    setCategories(catsResult.data as { id: string; name: string }[]);
                }
            } catch (error) {
                console.error("Failed to load initial data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadInitialData();
    }, []);

    // Manual load comparison data when user clicks "View Report"
    async function handleViewReport() {
        if (!selectedDate || !selectedComparison) return;

        setLoadingData(true);
        setHasViewed(true);
        try {
            const data = await getComparisonData(
                selectedComparison.id,
                selectedDate.id,
                selectedCategory.id === "all" ? undefined : selectedCategory.id,
                includeNA
            );
            setComparisonData(data);
        } catch (error) {
            console.error("Failed to load comparison data:", error);
        } finally {
            setLoadingData(false);
        }
    }

    // Transform data for display
    const filteredData: DisplayRow[] = comparisonData
        .filter(row => row.platform === selectedPlatform)
        .sort((a, b) => b.newStats.followers - a.newStats.followers)
        .map((row, idx) => ({
            rank: `#${idx + 1}`,
            name: row.accountName,
            handle: `@${row.handle}`,
            verified: false,
            followers: formatNumber(row.newStats.followers),
            growth: row.delta.followersPct.toFixed(1) + "%",
            growthDir: row.delta.followersPct >= 0 ? "up" : "down",
            posts: row.newStats.posts === -1 ? null : row.newStats.posts.toString(),
            newPosts: row.delta.postsVal >= 0 ? `+${row.delta.postsVal} NEW` : `${row.delta.postsVal} NEW`,
            isNA: row.oldStats.followers === -1,
            // TikTok likes
            likes: row.newStats.likes != null && row.newStats.likes !== -1 ? formatNumber(row.newStats.likes) : null,
            likesGrowth: (row.delta.likesPct ?? 0).toFixed(1) + "%",
            likesGrowthDir: (row.delta.likesPct ?? 0) >= 0 ? "up" : "down"
        }));

    // Build options for selectors
    const categoryOptions: RichSelectOption[] = [
        { id: "all", label: "Semua Kategori", sublabel: "Organization", icon: Layers },
        ...categories.map(cat => ({ id: cat.id, label: cat.name, sublabel: "Organization", icon: Layers }))
    ];

    const dateOptions: RichSelectOption[] = jobs.map(job => ({
        id: job.id,
        label: job.label,
        sublabel: job.id === jobs[0]?.id ? "Latest Snapshot" : "Archived",
        icon: FileText
    }));

    const comparisonOptions: RichSelectOption[] = jobs.slice(1).map(job => ({
        id: job.id,
        label: job.label,
        sublabel: `vs ${job.label}`,
        icon: History
    }));

    return (
        <div className="flex flex-col space-y-8 p-10 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <Heading level={1}>Laporan Bulanan</Heading>
                    <Text>
                        Monitoring performa akun resmi pemerintahan. Data diambil setiap akhir bulan.
                    </Text>
                </div>
                <div className="flex items-center gap-3">
                    <Button outline className="rounded-xl">
                        <Share className="w-4 h-4" data-slot="icon" />
                        Share
                    </Button>
                    <Button className="rounded-xl bg-zinc-900 border-zinc-900 dark:bg-white dark:text-black">
                        <Download className="w-4 h-4" data-slot="icon" />
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* Platform Tabs (Separated) */}
            <div className="flex items-center gap-2">
                {PLATFORMS.map((platform) => (
                    <button
                        key={platform.id}
                        onClick={() => setSelectedPlatform(platform.id)}
                        className={cn(
                            "relative px-4 py-2 text-sm font-semibold transition-all rounded-full border",
                            selectedPlatform === platform.id
                                ? "bg-zinc-900 border-zinc-900 text-white shadow-md hover:bg-zinc-800"
                                : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {platform.id === "INSTAGRAM" && <Instagram className="w-4 h-4" />}
                            {platform.id === "TIKTOK" && <Share className="w-4 h-4" />}
                            {platform.id === "TWITTER" && <Search className="w-4 h-4" />}
                            {platform.name}
                        </div>
                        {platform.hasUpdate && (
                            <span className="absolute top-0 right-0 -mt-1 -mr-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-950" />
                        )}
                    </button>
                ))}
            </div>

            {/* Filter Section (Bar) */}
            <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                {/* Category Selector */}
                <div className="w-full sm:w-[240px]">
                    <RichSelect
                        label="FILTER KATEGORI"
                        icon={Layers}
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        options={categoryOptions}
                    />
                </div>

                {/* Date Selector */}
                {selectedDate && (
                    <div className="w-full sm:w-[180px]">
                        <RichSelect
                            label="PILIH LAPORAN BULANAN"
                            icon={Calendar}
                            value={selectedDate}
                            onChange={setSelectedDate}
                            options={dateOptions}
                        />
                    </div>
                )}

                {/* Comparison Selector */}
                {selectedComparison && (
                    <div className="w-full sm:w-[200px] border-l border-zinc-200 dark:border-zinc-800 pl-4 ml-2">
                        <RichSelect
                            label="BANDINGKAN DENGAN"
                            icon={ArrowRightLeft}
                            value={selectedComparison}
                            onChange={setSelectedComparison}
                            options={comparisonOptions}
                        />
                    </div>
                )}

                <div className="flex-1" />

                {/* Include N/A Checkbox */}
                <div className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-800 h-8">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <Checkbox checked={includeNA} onChange={setIncludeNA} />
                        <Text className="font-medium group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">Include N/A</Text>
                    </label>
                </div>

                {/* View Report Button */}
                <Button
                    onClick={handleViewReport}
                    disabled={loading || loadingData || !selectedDate || !selectedComparison}
                    className="ml-4 px-6 rounded-xl"
                >
                    {loadingData ? <Loader2 className="w-4 h-4 animate-spin" data-slot="icon" /> : <Search className="w-4 h-4" data-slot="icon" />}
                    View Report
                </Button>
            </div>

            {/* Table Section */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                <Table dense className="min-w-full bg-white dark:bg-zinc-900">
                    <TableHead className="bg-zinc-50/50 dark:bg-zinc-800/30">
                        <TableRow>
                            <TableHeader className="text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase py-4 pl-8">
                                Account Identity
                            </TableHeader>
                            <TableHeader className="text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase py-4">
                                Result (Followers)
                            </TableHeader>
                            <TableHeader className="text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase py-4">
                                Effort (Activity)
                            </TableHeader>
                            {selectedPlatform === "TIKTOK" && (
                                <TableHeader className="text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase py-4 pr-8">
                                    Engagement (Likes)
                                </TableHeader>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableContent loading={loading || loadingData} hasViewed={hasViewed} data={filteredData} showLikes={selectedPlatform === "TIKTOK"} />
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
