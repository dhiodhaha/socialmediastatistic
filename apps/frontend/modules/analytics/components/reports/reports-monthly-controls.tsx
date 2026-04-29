import { Calendar, Check, Layers, Loader2, Search } from "lucide-react";
import { Button } from "@/shared/components/catalyst/button";
import { cn } from "@/shared/lib/utils";
import { FilterListbox, type SelectOption } from "./filter-listbox";
import type { Platform } from "./reports-controls";

interface ReportsMonthlyControlsProps {
    selectedCategory: SelectOption;
    setSelectedCategory: (o: SelectOption) => void;
    selectedPeriod: SelectOption | null;
    setSelectedPeriod: (o: SelectOption) => void;
    selectedComparison: SelectOption | null;
    setSelectedComparison: (o: SelectOption) => void;
    includeNA: boolean;
    setIncludeNA: (b: boolean) => void;
    categories: SelectOption[];
    jobs: SelectOption[];
    comparisonOptions: SelectOption[];
    loading: boolean;
    loadingData: boolean;
    onViewReport: () => void;
    selectedPlatform: Platform;
}

export function ReportsMonthlyControls({
    selectedCategory,
    setSelectedCategory,
    selectedPeriod,
    setSelectedPeriod,
    selectedComparison,
    setSelectedComparison,
    includeNA,
    setIncludeNA,
    categories,
    jobs,
    comparisonOptions,
    loading,
    loadingData,
    onViewReport,
    selectedPlatform,
}: ReportsMonthlyControlsProps) {
    return (
        <div className="space-y-4 rounded-[1.25rem] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="relative z-30">
                    <FilterListbox
                        title="Grup laporan"
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        options={categories}
                        icon={Layers}
                    />
                </div>

                <div className="relative z-20">
                    <FilterListbox
                        title="Periode utama"
                        value={selectedPeriod || { id: "", label: "Memuat..." }}
                        onChange={setSelectedPeriod}
                        options={jobs}
                        icon={Calendar}
                    />
                </div>

                <div className="relative z-10">
                    <FilterListbox
                        title="Periode pembanding"
                        value={selectedComparison || { id: "", label: "Pilih..." }}
                        onChange={setSelectedComparison}
                        options={comparisonOptions}
                        prefix="vs"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4 md:flex-row md:items-center md:justify-between dark:border-white/10">
                <label className="flex cursor-pointer select-none items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white">
                    <div
                        className={cn(
                            "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                            includeNA
                                ? "bg-blue-600 border-blue-600"
                                : "border-slate-300 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800",
                        )}
                    >
                        {includeNA && <Check size={10} className="text-white stroke-[3px]" />}
                    </div>
                    <input
                        type="checkbox"
                        checked={includeNA}
                        onChange={(e) => setIncludeNA(e.target.checked)}
                        className="hidden"
                    />
                    <span className="whitespace-nowrap">Sertakan N/A</span>
                </label>

                <div className="flex items-center gap-3">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        {selectedPlatform === "INSTAGRAM"
                            ? "Urutan tabel mengikuti jumlah pengikut terbaru Instagram."
                            : selectedPlatform === "TIKTOK"
                              ? "Urutan tabel mengikuti jumlah pengikut terbaru TikTok."
                              : "Urutan tabel mengikuti jumlah pengikut terbaru Twitter / X."}
                    </div>
                    <Button
                        onClick={onViewReport}
                        disabled={loading || loadingData || !selectedPeriod || !selectedComparison}
                        className="h-11 rounded-full !px-5 !py-2 !text-sm"
                    >
                        {loadingData ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Search className="h-4 w-4" />
                        )}
                        Lihat laporan
                    </Button>
                </div>
            </div>
        </div>
    );
}
