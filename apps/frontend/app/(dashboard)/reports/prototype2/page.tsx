"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from "@headlessui/react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    ColumnDef,
    flexRender,
    SortingState,
    createColumnHelper,
} from "@tanstack/react-table";
import {
    ArrowDownRight,
    Download,
    Calendar,
    Filter,
    MoreHorizontal,
    Search,
    CheckCircle2,
    TrendingUp,
    Share2,
    Heart,
    ChevronDown,
    FileText,
    ArrowRightLeft,
    Check,
    Layers,
    Instagram,
    Twitter,
    Youtube,
    Video,
    Loader2,
    Files
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/catalyst/button";
import { Strong, Text } from "@/components/catalyst/text";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/catalyst/table";
import { getComparisonData, getScrapingJobsForReport, exportComparisonPdf, type ComparisonRow } from "@/app/actions/report";
import { getCategories } from "@/app/actions/category";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// --- TYPES ---
interface SelectOption {
    id: string;
    label: string;
    sub?: string;
    desc?: string;
    icon?: React.ElementType;
}

interface FilterListboxProps {
    value: SelectOption;
    onChange: (option: SelectOption) => void;
    options: SelectOption[];
    title: string;
    icon?: React.ElementType; // Icon for the trigger button
    prefix?: string; // e.g. "vs"
}

interface DisplayRow {
    id: string;
    rank: number;
    name: string;
    handle: string;
    category: string;

    // Result
    currentFollowers: number;
    followersGrowth: string; // "28.6%"
    followersGrowthDir: "up" | "down";

    // Engagement
    currentLikes?: number;
    likesGrowth?: string;
    likesGrowthDir?: "up" | "down";

    // Effort
    currentPosts: number;
    newPosts: number;

    isNA: boolean;

    // Raw stats for sorting if needed
    rawOldFollowers: number;
    rawOldPosts: number;
    rawOldLikes?: number;
}

// --- COMPONENT: FILTER LISTBOX (HEADLESS UI) ---
function FilterListbox({ value, onChange, options, title, icon: TriggerIcon, prefix }: FilterListboxProps) {
    return (
        <div className="relative">
            <Listbox value={value} onChange={onChange}>
                {({ open }) => (
                    <>
                        <ListboxButton
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95",
                                open
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 ring-2 ring-blue-100 dark:ring-blue-900/20"
                                    : "text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700"
                            )}
                        >
                            {TriggerIcon && (
                                <TriggerIcon
                                    size={14}
                                    className={open ? "text-blue-500" : "text-zinc-400"}
                                />
                            )}
                            <span className="truncate max-w-[140px] text-left">
                                {prefix && <span className="text-zinc-400 mr-1">{prefix}</span>}
                                {value.label || "Select"}
                            </span>
                            <ChevronDown
                                size={14}
                                className={cn("text-zinc-400 transition-transform ml-auto", open && "rotate-180")}
                            />
                        </ListboxButton>

                        <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <ListboxOptions className="absolute top-12 left-0 z-50 w-72 overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none">
                                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                                    <Text className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                                        {title}
                                    </Text>
                                </div>
                                <div className="p-1.5 space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                                    {options.map((opt) => (
                                        <ListboxOption
                                            key={opt.id}
                                            value={opt}
                                            className={({ active, selected }) =>
                                                cn(
                                                    "relative cursor-pointer select-none rounded-xl py-3 pl-3 pr-9 transition-colors",
                                                    (active || selected) ? "bg-blue-50 dark:bg-blue-900/20" : "text-zinc-900 dark:text-zinc-100"
                                                )
                                            }
                                        >
                                            {({ selected, active }) => (
                                                <>
                                                    <div className="flex items-start gap-3">
                                                        <div className={cn(
                                                            "flex items-center justify-center p-2 rounded-lg transition-colors flex-shrink-0",
                                                            selected || active
                                                                ? "bg-blue-100/50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                                                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                                        )}>
                                                            {opt.icon ? <opt.icon className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={cn(
                                                                "block truncate font-semibold text-[13px]",
                                                                selected ? "text-blue-700 dark:text-blue-400" : "text-zinc-900 dark:text-white"
                                                            )}>
                                                                {opt.label}
                                                            </span>
                                                            {(opt.sub || opt.desc) && (
                                                                <span className={cn(
                                                                    "block truncate text-[11px] font-medium mt-0.5",
                                                                    selected ? "text-blue-600/70 dark:text-blue-400/70" : "text-zinc-400 dark:text-zinc-500"
                                                                )}>
                                                                    {opt.sub || opt.desc}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {selected && (
                                                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 dark:text-blue-400">
                                                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </ListboxOption>
                                    ))}
                                </div>
                            </ListboxOptions>
                        </Transition>
                    </>
                )}
            </Listbox>
        </div>
    );
}

// --- HELPER: Format Number ---
function formatNumber(num: number): string {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return num.toString();
}

// --- PLATFORM TABS CONFIG ---
type Platform = "INSTAGRAM" | "TIKTOK" | "TWITTER";
const TABS = [
    { id: "INSTAGRAM", label: "Instagram", icon: Instagram, color: "hover:text-pink-600" },
    { id: "TIKTOK", label: "TikTok", icon: Video, color: "hover:text-black dark:hover:text-white" },
    { id: "TWITTER", label: "Twitter", icon: Twitter, color: "hover:text-blue-400" },
    // { id: "YOUTUBE", label: "YouTube", icon: Youtube, color: "hover:text-red-600" },
];

export default function ReportsPrototype2() {
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
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportingAll, setExportingAll] = useState(false);

    // Selected Options
    const [selectedCategory, setSelectedCategory] = useState<SelectOption>({ id: "all", label: "Semua Kategori" });
    const [selectedPeriod, setSelectedPeriod] = useState<SelectOption | null>(null);
    const [selectedComparison, setSelectedComparison] = useState<SelectOption | null>(null);

    // Sorting State
    const [sorting, setSorting] = useState<SortingState>([
        { id: 'result', desc: true } // Default sort
    ]);

    // --- EFFECTS ---

    // 1. Load Initial Options
    useEffect(() => {
        async function loadOptions() {
            try {
                const [jobsData, categoriesResult] = await Promise.all([
                    getScrapingJobsForReport(),
                    getCategories()
                ]);

                // Map Jobs
                const jobOptions: SelectOption[] = jobsData.map((job, idx) => ({
                    id: job.id,
                    label: format(new Date(job.createdAt), "MMMM yyyy", { locale: idLocale }),
                    sub: idx === 0 ? "Latest Snapshot" : "Archived",
                    icon: FileText
                }));
                setJobs(jobOptions);

                // Map Categories
                let catOptions: SelectOption[] = [
                    { id: "all", label: "Semua Kategori" }
                ];

                if (categoriesResult.success && Array.isArray(categoriesResult.data)) {
                    catOptions = [
                        ...catOptions,
                        ...categoriesResult.data.map((c: any) => ({ id: c.id, label: c.name }))
                    ];
                }
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

            } catch (err) {
                console.error("Failed to load options", err);
            } finally {
                setLoading(false);
            }
        }
        loadOptions();
    }, []);

    // 2. Filter Raw Data when Platform or RawData changes
    useEffect(() => {
        if (rawData.length === 0) {
            setComparisonData([]);
            return;
        }

        // 1. Filter by Platform
        let filtered = rawData.filter(row => row.platform === selectedPlatform);

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
            followersGrowth: row.delta.followersPct.toFixed(1) + "%",
            followersGrowthDir: row.delta.followersPct >= 0 ? "up" as const : "down" as const,

            // Engagement (TikTok)
            currentLikes: row.newStats.likes !== -1 ? row.newStats.likes : undefined,
            likesGrowth: (row.delta.likesPct ?? 0).toFixed(1) + "%",
            likesGrowthDir: (row.delta.likesPct ?? 0) >= 0 ? "up" as const : "down" as const,

            // Effort
            currentPosts: row.newStats.posts !== -1 ? row.newStats.posts : 0,
            newPosts: row.delta.postsVal,

            isNA: row.oldStats.followers === -1,

            // Helper for verification
            rawOldFollowers: row.oldStats.followers,
            rawOldPosts: row.oldStats.posts,
            rawOldLikes: row.oldStats.likes
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
                includeNA
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
                customTitle: `Growth Report - ${selectedPlatform}`,
                includeCover: true,
                sections: [{
                    platform: selectedPlatform,
                    data: comparisonData.map(d => ({
                        accountName: d.name,
                        handle: d.handle,
                        oldFollowers: d.rawOldFollowers,
                        newFollowers: d.currentFollowers,
                        followersPct: parseFloat(d.followersGrowth),
                        oldPosts: d.rawOldPosts,
                        newPosts: d.currentPosts,
                        postsPct: 0, // Not explicitly tracked in DisplayRow but okay
                        oldLikes: d.rawOldLikes,
                        newLikes: d.currentLikes,
                        likesPct: d.likesGrowth ? parseFloat(d.likesGrowth) : 0
                    }))
                }]
            });

            // Trigger download
            const blob = await (await fetch(`data:application/pdf;base64,${pdfBase64}`)).blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `report-${selectedPlatform.toLowerCase()}-${format(new Date(), "yyyyMMdd")}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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
                let pRows = rawData.filter(r => r.platform === platform);
                if (pRows.length === 0) continue;

                pRows.sort((a, b) => {
                    const valA = a.newStats.followers === -1 ? -1 : a.newStats.followers;
                    const valB = b.newStats.followers === -1 ? -1 : b.newStats.followers;
                    return valB - valA;
                });

                sections.push({
                    platform: platform,
                    data: pRows.map(row => ({
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
                        likesPct: row.delta.likesPct
                    }))
                });
            }

            const pdfBase64 = await exportComparisonPdf({
                month1: selectedComparison.label,
                month2: selectedPeriod.label,
                customTitle: `Growth Report - All Platforms`,
                includeCover: true,
                sections: sections
            });

            // Trigger download
            const blob = await (await fetch(`data:application/pdf;base64,${pdfBase64}`)).blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `report-all-${format(new Date(), "yyyyMMdd")}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Export All failed:", error);
            alert("Export All failed. Please check console.");
        } finally {
            setExportingAll(false);
        }
    };

    // --- COLUMNS DEFINITION ---
    const columns = useMemo<ColumnDef<DisplayRow>[]>(() => {
        const isTikTok = selectedPlatform === "TIKTOK";

        const baseCols: ColumnDef<DisplayRow>[] = [
            {
                id: 'identity',
                header: () => <div className="!pl-6">Account Identity</div>,
                accessorFn: row => row.name, // Allow sorting by name if needed
                cell: ({ row }) => {
                    const account = row.original;
                    // Use the pre-calculated rank from our sorted data
                    const rank = account.rank;

                    return (
                        <div className="flex items-center gap-4 !pl-6">
                            <div className="flex-shrink-0">
                                <span className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold border transition-colors",
                                    account.isNA
                                        ? "bg-zinc-100 text-zinc-400 border-zinc-200"
                                        : rank === 1
                                            ? "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-800 shadow-sm"
                                            : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                                )}>
                                    {account.isNA ? "-" : `#${rank}`}
                                </span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <Strong className="text-zinc-900 dark:text-white truncate max-w-[200px]">{account.name}</Strong>
                                    {account.rank <= 2 && !account.isNA && <CheckCircle2 size={14} className="text-blue-500 fill-blue-50 flex-shrink-0" />}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                        {account.handle}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                    <span className="text-[10px] uppercase tracking-wide text-zinc-400 font-medium">
                                        {account.category}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                }
            },
            {
                id: 'result',
                header: "Result (Followers)",
                accessorFn: row => row.currentFollowers,
                cell: ({ row }) => {
                    const account = row.original;
                    return (
                        <div>
                            <span className="block text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                                {formatNumber(account.currentFollowers)}
                            </span>
                            <div className={cn(
                                "inline-flex items-center gap-1 mt-0.5 text-xs font-medium",
                                account.followersGrowthDir === "up" ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {account.followersGrowthDir === "up" ? <TrendingUp size={12} /> : <ArrowDownRight size={12} />}
                                {account.followersGrowth}
                            </div>
                        </div>
                    )
                }
            }
        ];

        if (isTikTok) {
            baseCols.push({
                id: 'engagement',
                header: "Engagement (Likes)",
                accessorFn: row => row.currentLikes ?? 0,
                cell: ({ row }) => {
                    const account = row.original;
                    return (
                        <div>
                            <span className="block text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                                {account.currentLikes ? formatNumber(account.currentLikes) : "N/A"}
                            </span>
                            {account.currentLikes && (
                                <div className="inline-flex items-center gap-1 mt-0.5 text-xs font-medium text-pink-600">
                                    <Heart size={10} className="fill-pink-600" />
                                    +{account.likesGrowth}
                                </div>
                            )}
                        </div>
                    );
                }
            });
        }

        baseCols.push({
            id: 'effort',
            header: "Effort (Activity)",
            accessorFn: row => row.newPosts,
            cell: ({ row }) => {
                const account = row.original;
                return (
                    <div>
                        <div className="text-zinc-900 dark:text-white font-semibold text-sm">
                            {account.currentPosts} <span className="text-zinc-400 font-normal">posts</span>
                        </div>
                        <div className={cn(
                            "mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border",
                            account.newPosts >= 0
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800"
                                : "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 border-zinc-100 dark:border-zinc-700"
                        )}>
                            {account.newPosts >= 0 ? "+" : ""}{account.newPosts} New
                        </div>
                    </div>
                );
            }
        });

        baseCols.push({
            id: 'actions',
            header: () => <div className="!pr-6 w-10"><span className="sr-only">Actions</span></div>,
            cell: () => (
                <div className="!pr-6 text-right">
                    <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors inline-flex">
                        <MoreHorizontal size={16} />
                    </button>
                </div>
            )
        });

        return baseCols;
    }, [selectedPlatform]);

    // --- TANSTACK TABLE ---
    const table = useReactTable({
        data: comparisonData,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    // --- COMPUTED OPTIONS ---
    // Comparison options should not include selected period
    const comparisonOptions = jobs
        .filter(j => j.id !== selectedPeriod?.id)
        .map(j => ({
            ...j,
            desc: `vs ${j.label}`
        }));

    return (
        <div className="flex flex-col space-y-8 p-10 max-w-7xl mx-auto">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1 font-medium">
                        <span className="text-blue-600">Analytics</span>
                        <span className="text-zinc-300">/</span>
                        <span>Growth Report</span>
                    </div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Laporan Bulanan</h1>
                    <Text className="mt-2 max-w-2xl">
                        Monitoring performa akun resmi pemerintahan. Data diambil setiap akhir bulan.
                    </Text>
                </div>
                <div className="flex gap-3">
                    <Button outline disabled className="rounded-xl opacity-50 cursor-not-allowed">
                        <Share2 data-slot="icon" />
                        Share
                    </Button>
                    <Button
                        onClick={handleExportPdf}
                        disabled={exporting || exportingAll || !hasViewed}
                        className="rounded-xl bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                        outline
                    >
                        {exporting ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" data-slot="icon" />}
                        Export Current
                    </Button>
                    <Button
                        onClick={handleExportAllPdf}
                        disabled={exporting || exportingAll || !hasViewed}
                        className="rounded-xl bg-zinc-900 border-zinc-900 dark:bg-white dark:text-black"
                    >
                        {exportingAll ? <Loader2 className="animate-spin w-4 h-4" /> : <Files className="w-4 h-4" data-slot="icon" />}
                        Export All
                    </Button>
                </div>
            </div>

            {/* --- CONTROLS SECTION --- */}
            <div className="space-y-4">

                {/* 1. PLATFORM TABS */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setSelectedPlatform(tab.id as Platform);
                                // setHasViewed(false); // REMOVED to keep view active
                            }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm",
                                selectedPlatform === tab.id
                                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md ring-2 ring-zinc-200 dark:ring-zinc-700 ring-offset-2"
                                    : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                            )}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* 2. FILTER BAR */}
                <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-wrap gap-2 items-center">

                    {/* Category Filter */}
                    <div className="relative z-30">
                        <FilterListbox
                            title="Filter Kategori"
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                            options={categories}
                            icon={Layers}
                        />
                    </div>

                    <div className="w-px h-6 bg-zinc-100 dark:bg-zinc-700 mx-1" />

                    {/* Period Selector */}
                    <div className="relative z-20">
                        <FilterListbox
                            title="Pilih Laporan Bulanan"
                            value={selectedPeriod || { id: "", label: "Loading..." }}
                            onChange={setSelectedPeriod}
                            options={jobs}
                            icon={Calendar}
                        />
                    </div>

                    {/* Comparison Selector */}
                    <div className="relative z-10">
                        <FilterListbox
                            title="Bandingkan Dengan"
                            value={selectedComparison || { id: "", label: "Select..." }}
                            onChange={setSelectedComparison}
                            options={comparisonOptions}
                            prefix="vs"
                        />
                    </div>

                    <div className="flex-1" />

                    {/* Include N/A Toggle */}
                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1 hidden md:block" />
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer hover:text-zinc-900 dark:hover:text-white select-none px-2 py-1 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                        <div className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                            includeNA
                                ? "bg-blue-600 border-blue-600"
                                : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 hover:border-zinc-400"
                        )}>
                            {includeNA && <Check size={10} className="text-white stroke-[3px]" />}
                        </div>
                        <input
                            type="checkbox"
                            checked={includeNA}
                            onChange={(e) => setIncludeNA(e.target.checked)}
                            className="hidden"
                        />
                        <span className="whitespace-nowrap">Include N/A</span>
                    </label>

                    {/* View Report Button - Added to match functionality */}
                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1 hidden md:block" />
                    <Button
                        onClick={handleViewReport}
                        disabled={loading || loadingData || !selectedPeriod || !selectedComparison}
                        className="ml-2 !py-2 !px-4 !text-xs !h-9"
                    >
                        {loadingData ? <Loader2 className="animate-spin w-3 h-3" /> : <Search className="w-3 h-3" />}
                        View Report
                    </Button>

                </div>
            </div>

            {/* --- MAIN DATA TABLE --- */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">

                {/* Empty State */}
                {!hasViewed && !loadingData && (
                    <div className="flex flex-col items-center justify-center py-20 text-center ">
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full mb-4">
                            <Search className="h-8 w-8 text-zinc-400" />
                        </div>
                        <Strong className="text-lg text-zinc-900 dark:text-white">Bandingkan Data</Strong>
                        <Text className="text-zinc-500 max-w-sm mt-2">
                            Pilih dua periode (snapshot) di panel atas untuk melihat analisis pertumbuhan akun.
                        </Text>
                    </div>
                )}

                {/* Loading State */}
                {loadingData && (
                    <div className="py-20 flex justify-center items-center">
                        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                    </div>
                )}

                {/* Data Table */}
                {hasViewed && !loadingData && (
                    comparisonData.length > 0 ? (
                        <Table>
                            <TableHead>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <TableHeader key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHeader>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHead>
                            <TableBody>
                                {table.getRowModel().rows.map(row => (
                                    <TableRow key={row.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                                        {row.getVisibleCells().map(cell => (
                                            <TableCell key={cell.id} className="p-0">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        // No Data State
                        <div className="p-12 text-center text-zinc-500 flex flex-col items-center">
                            <Filter size={48} className="text-zinc-200 dark:text-zinc-700 mb-4" />
                            <Strong className="text-lg text-zinc-900 dark:text-white">Tidak ada data ditemukan</Strong>
                            <Text className="mt-1 max-w-sm">
                                Coba ganti filter kategori atau pilih platform lain.
                            </Text>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
