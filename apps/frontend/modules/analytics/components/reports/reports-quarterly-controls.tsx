import { CalendarRange, Layers, Loader2, Search } from "lucide-react";
import { Button } from "@/shared/components/catalyst/button";
import { FilterListbox, type SelectOption } from "./filter-listbox";

interface ReportsQuarterlyControlsProps {
    selectedCategory: SelectOption;
    setSelectedCategory: (o: SelectOption) => void;
    selectedYear: SelectOption | null;
    setSelectedYear: (o: SelectOption) => void;
    selectedQuarter: SelectOption | null;
    setSelectedQuarter: (o: SelectOption) => void;
    categories: SelectOption[];
    years: SelectOption[];
    quarters: SelectOption[];
    quarterUnavailableReason?: string | null;
    loading: boolean;
    loadingData: boolean;
    onViewReport: () => void;
}

export function ReportsQuarterlyControls({
    selectedCategory,
    setSelectedCategory,
    selectedYear,
    setSelectedYear,
    selectedQuarter,
    setSelectedQuarter,
    categories,
    years,
    quarters,
    quarterUnavailableReason,
    loading,
    loadingData,
    onViewReport,
}: ReportsQuarterlyControlsProps) {
    return (
        <div className="space-y-4 rounded-[1.25rem] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
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
                        title="Tahun laporan"
                        value={selectedYear || { id: "", label: "Pilih tahun" }}
                        onChange={setSelectedYear}
                        options={years}
                        icon={CalendarRange}
                    />
                </div>

                <div className="relative z-10">
                    <FilterListbox
                        title="Kuartal"
                        value={selectedQuarter || { id: "", label: "Pilih kuartal" }}
                        onChange={setSelectedQuarter}
                        options={quarters}
                        prefix="Q"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4 md:flex-row md:items-center md:justify-between dark:border-white/10">
                {quarterUnavailableReason ? (
                    <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                        {quarterUnavailableReason}
                    </div>
                ) : (
                    <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                        Ketersediaan triwulan diturunkan dari snapshot akhir bulan yang tersedia.
                    </div>
                )}

                <Button
                    onClick={onViewReport}
                    disabled={
                        loading ||
                        loadingData ||
                        !selectedYear ||
                        !selectedQuarter ||
                        selectedQuarter.disabled
                    }
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
    );
}
