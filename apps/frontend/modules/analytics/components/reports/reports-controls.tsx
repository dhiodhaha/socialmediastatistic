import {
    CalendarDays,
    CheckCircle2,
    FileText,
    Instagram,
    Layers,
    Twitter,
    Video,
} from "lucide-react";
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
    const isMonthly = reportMode === "MONTHLY";
    const canReview = isMonthly
        ? Boolean(selectedPeriod && selectedComparison)
        : Boolean(selectedYear && selectedQuarter && !selectedQuarter.disabled);
    const periodLabel = isMonthly
        ? selectedPeriod && selectedComparison
            ? `${selectedPeriod.label} vs ${selectedComparison.label}`
            : "Pilih dua periode"
        : selectedYear && selectedQuarter
          ? `${selectedQuarter.label} ${selectedYear.label}`
          : "Pilih tahun dan kuartal";

    return (
        <div className="rounded-3xl border border-zinc-950/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="grid gap-6 xl:grid-cols-[5fr_7fr]">
                <div>
                    <p className="text-base/7 font-medium text-zinc-500 sm:text-sm/6">
                        Pembuat laporan
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 text-balance dark:text-white">
                        Ikuti langkah ini untuk menampilkan data laporan.
                    </h2>
                    <div className="mt-5 space-y-3">
                        <BuilderStep
                            number={1}
                            title="Jenis laporan"
                            description={isMonthly ? "Bulanan" : "Triwulanan"}
                            active
                        />
                        <BuilderStep
                            number={2}
                            title="Cakupan dan platform"
                            description={`${selectedCategory.label} • ${platformLabel(selectedPlatform)}`}
                            active
                        />
                        <BuilderStep
                            number={3}
                            title="Periode"
                            description={periodLabel}
                            active={canReview}
                        />
                        <BuilderStep
                            number={4}
                            title="Tinjau"
                            description={canReview ? "Siap ditampilkan" : "Lengkapi pilihan dulu"}
                            active={canReview}
                        />
                    </div>
                </div>

                <div className="space-y-5">
                    <section className="space-y-3">
                        <StepLabel icon={FileText} title="1. Pilih jenis laporan" />
                        <ReportModeSwitch value={reportMode} onChange={setReportMode} />
                    </section>

                    <section className="space-y-3">
                        <StepLabel icon={Layers} title="2. Pilih platform" />
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {TABS.map((tab) => (
                                <button
                                    type="button"
                                    key={tab.id}
                                    onClick={() => setSelectedPlatform(tab.id as Platform)}
                                    className={cn(
                                        "flex items-center gap-2 rounded-full border px-4 py-2.5 text-base/7 font-medium shadow-sm transition sm:text-sm/6",
                                        selectedPlatform === tab.id
                                            ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                                            : "border-zinc-950/10 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
                                    )}
                                >
                                    <tab.icon className="size-5 sm:size-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-3">
                        <StepLabel
                            icon={CalendarDays}
                            title={
                                isMonthly ? "3. Pilih periode bulanan" : "3. Pilih periode triwulan"
                            }
                        />
                        {isMonthly ? (
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
                    </section>
                </div>
            </div>
        </div>
    );
}

function StepLabel({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
    return (
        <div className="flex items-center gap-2 text-base/7 font-medium text-zinc-950 sm:text-sm/6 dark:text-white">
            <Icon className="size-5 text-zinc-400 sm:size-4" />
            {title}
        </div>
    );
}

function BuilderStep({
    number,
    title,
    description,
    active,
}: {
    number: number;
    title: string;
    description: string;
    active: boolean;
}) {
    return (
        <div
            className={cn(
                "flex gap-3 rounded-2xl p-3 ring-1",
                active
                    ? "bg-emerald-50 text-emerald-950 ring-emerald-950/10 dark:bg-emerald-950/20 dark:text-emerald-100 dark:ring-emerald-400/20"
                    : "bg-zinc-50 text-zinc-600 ring-zinc-950/5 dark:bg-zinc-950 dark:text-zinc-400 dark:ring-white/10",
            )}
        >
            <div
                className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                    active
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                )}
            >
                {active && number === 4 ? <CheckCircle2 className="size-4" /> : number}
            </div>
            <div className="min-w-0">
                <div className="truncate text-base/7 font-medium sm:text-sm/6">{title}</div>
                <div className="truncate text-base/7 opacity-75 sm:text-sm/6">{description}</div>
            </div>
        </div>
    );
}

function platformLabel(platform: Platform) {
    if (platform === "INSTAGRAM") return "Instagram";
    if (platform === "TIKTOK") return "TikTok";
    return "Twitter / X";
}
