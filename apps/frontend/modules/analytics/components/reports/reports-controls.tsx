import { Instagram, Twitter, Video } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { SelectOption } from "./filter-listbox";
import type { ReportMode } from "./report-mode";
import { ReportModeSwitch } from "./report-mode-switch";
import { ReportsMonthlyControls } from "./reports-monthly-controls";
import { ReportsQuarterlyControls } from "./reports-quarterly-controls";

// --- TYPES & CONSTANTS ---
export type Platform = "INSTAGRAM" | "TIKTOK" | "TWITTER";

const TABS = [
    { id: "INSTAGRAM", label: "Instagram", icon: Instagram },
    { id: "TIKTOK", label: "TikTok", icon: Video },
    { id: "TWITTER", label: "Twitter", icon: Twitter },
];

interface ReportsControlsProps {
    reportMode: ReportMode;
    setReportMode: (mode: ReportMode) => void;

    // State
    selectedPlatform: Platform;
    setSelectedPlatform: (p: Platform) => void;

    selectedCategory: SelectOption;
    setSelectedCategory: (o: SelectOption) => void;

    selectedPeriod: SelectOption | null;
    setSelectedPeriod: (o: SelectOption) => void;

    selectedComparison: SelectOption | null;
    setSelectedComparison: (o: SelectOption) => void;

    selectedYear: SelectOption | null;
    setSelectedYear: (o: SelectOption) => void;

    selectedQuarter: SelectOption | null;
    setSelectedQuarter: (o: SelectOption) => void;

    includeNA: boolean;
    setIncludeNA: (b: boolean) => void;

    // Data & Loading
    categories: SelectOption[];
    jobs: SelectOption[];
    years: SelectOption[];
    quarters: SelectOption[];
    quarterUnavailableReason?: string | null;
    comparisonOptions: SelectOption[];
    loading: boolean;
    loadingData: boolean;

    // Actions
    onViewReport: () => void;
}

export function ReportsControls({
    reportMode,
    setReportMode,
    selectedPlatform,
    setSelectedPlatform,
    selectedCategory,
    setSelectedCategory,
    selectedPeriod,
    setSelectedPeriod,
    selectedComparison,
    setSelectedComparison,
    selectedYear,
    setSelectedYear,
    selectedQuarter,
    setSelectedQuarter,
    includeNA,
    setIncludeNA,
    categories,
    jobs,
    years,
    quarters,
    quarterUnavailableReason,
    comparisonOptions,
    loading,
    loadingData,
    onViewReport,
}: ReportsControlsProps) {
    return (
        <div className="space-y-4">
            <ReportModeSwitch value={reportMode} onChange={setReportMode} />

            {/* 1. PLATFORM TABS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {TABS.map((tab) => (
                    <button
                        type="button"
                        key={tab.id}
                        onClick={() => setSelectedPlatform(tab.id as Platform)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm",
                            selectedPlatform === tab.id
                                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md ring-2 ring-zinc-200 dark:ring-zinc-700 ring-offset-2"
                                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300",
                        )}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {reportMode === "MONTHLY" ? (
                <ReportsMonthlyControls
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
                    loading={loading}
                    loadingData={loadingData}
                    onViewReport={onViewReport}
                    selectedPlatform={selectedPlatform}
                />
            ) : (
                <ReportsQuarterlyControls
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear}
                    selectedQuarter={selectedQuarter}
                    setSelectedQuarter={setSelectedQuarter}
                    categories={categories}
                    years={years}
                    quarters={quarters}
                    quarterUnavailableReason={quarterUnavailableReason}
                    loading={loading}
                    loadingData={loadingData}
                    onViewReport={onViewReport}
                />
            )}
        </div>
    );
}
