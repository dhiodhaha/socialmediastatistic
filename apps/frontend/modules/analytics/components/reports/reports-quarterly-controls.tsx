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
    loading,
    loadingData,
    onViewReport,
}: ReportsQuarterlyControlsProps) {
    return (
        <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-wrap gap-2 items-center">
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

            <div className="relative z-20">
                <FilterListbox
                    title="Pilih Tahun Laporan"
                    value={selectedYear || { id: "", label: "Pilih Tahun" }}
                    onChange={setSelectedYear}
                    options={years}
                    icon={CalendarRange}
                />
            </div>

            <div className="relative z-10">
                <FilterListbox
                    title="Pilih Kuartal"
                    value={selectedQuarter || { id: "", label: "Pilih Kuartal" }}
                    onChange={setSelectedQuarter}
                    options={quarters}
                    prefix="Q"
                />
            </div>

            <div className="flex-1" />

            <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-medium text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                Quarterly shell active. Quarter derivation and export land in the next slices.
            </div>

            <Button
                onClick={onViewReport}
                disabled={loading || loadingData || !selectedYear || !selectedQuarter}
                className="ml-2 !py-2 !px-4 !text-xs !h-9"
            >
                {loadingData ? (
                    <Loader2 className="animate-spin w-3 h-3" />
                ) : (
                    <Search className="w-3 h-3" />
                )}
                View Report
            </Button>
        </div>
    );
}
