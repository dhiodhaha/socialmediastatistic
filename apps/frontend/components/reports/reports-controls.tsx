import { Button } from "@/components/catalyst/button";
import { Check, Search, Calendar, Layers, Loader2, Video, Instagram, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterListbox, SelectOption } from "./filter-listbox";

// --- TYPES & CONSTANTS ---
export type Platform = "INSTAGRAM" | "TIKTOK" | "TWITTER";

const TABS = [
    { id: "INSTAGRAM", label: "Instagram", icon: Instagram },
    { id: "TIKTOK", label: "TikTok", icon: Video },
    { id: "TWITTER", label: "Twitter", icon: Twitter },
];

interface ReportsControlsProps {
    // State
    selectedPlatform: Platform;
    setSelectedPlatform: (p: Platform) => void;

    selectedCategory: SelectOption;
    setSelectedCategory: (o: SelectOption) => void;

    selectedPeriod: SelectOption | null;
    setSelectedPeriod: (o: SelectOption) => void;

    selectedComparison: SelectOption | null;
    setSelectedComparison: (o: SelectOption) => void;

    includeNA: boolean;
    setIncludeNA: (b: boolean) => void;

    // Data & Loading
    categories: SelectOption[];
    jobs: SelectOption[];
    comparisonOptions: SelectOption[];
    loading: boolean;
    loadingData: boolean;

    // Actions
    onViewReport: () => void;
}

export function ReportsControls({
    selectedPlatform, setSelectedPlatform,
    selectedCategory, setSelectedCategory,
    selectedPeriod, setSelectedPeriod,
    selectedComparison, setSelectedComparison,
    includeNA, setIncludeNA,
    categories, jobs, comparisonOptions,
    loading, loadingData,
    onViewReport
}: ReportsControlsProps) {
    return (
        <div className="space-y-4">

            {/* 1. PLATFORM TABS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setSelectedPlatform(tab.id as Platform)}
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

                {/* View Report Button */}
                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1 hidden md:block" />
                <Button
                    onClick={onViewReport}
                    disabled={loading || loadingData || !selectedPeriod || !selectedComparison}
                    className="ml-2 !py-2 !px-4 !text-xs !h-9"
                >
                    {loadingData ? <Loader2 className="animate-spin w-3 h-3" /> : <Search className="w-3 h-3" />}
                    View Report
                </Button>

            </div>
        </div>
    );
}
