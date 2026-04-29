import { Clock, Download, FileText, Layers, Share2 } from "lucide-react";
import { Button } from "@/shared/components/catalyst/button";
import { Text } from "@/shared/components/catalyst/text";
import { FilterListbox, type SelectOption } from "./filter-listbox";
import type { ReportMode } from "./report-mode";

interface ReportHeaderProps {
    reportMode: ReportMode;
    demoMode?: boolean;
    exporting: boolean;
    exportingAll: boolean;
    exportingLatest: boolean;
    hasViewed: boolean;
    onExport: () => void;
    onExportAll: () => void;
    onExportLatest: () => void;
}

export function ReportHeader({
    reportMode,
    demoMode = false,
    exporting,
    exportingAll,
    exportingLatest,
    hasViewed,
    onExport,
    onExportAll,
    onExportLatest,
}: ReportHeaderProps) {
    const isExporting = exporting || exportingAll || exportingLatest;
    const isQuarterly = reportMode === "QUARTERLY";

    const exportOptions: SelectOption[] = [
        {
            id: "current",
            label: isQuarterly ? "Ekspor PDF Platform" : "Ekspor data ini",
            desc: isQuarterly ? "Laporan eksekutif platform terpilih" : "Tampilan saat ini",
            icon: FileText,
            group: "Berkas Tunggal",
        },
        {
            id: "latest",
            label: isQuarterly ? "Disiapkan" : "Ekspor data standar",
            desc: isQuarterly
                ? "Ekspor triwulan memakai varian per platform dan semua platform"
                : "Ikhtisar data standar",
            icon: Clock,
            group: "Berkas Tunggal",
            disabled: isQuarterly,
        },
        {
            id: "full",
            label: isQuarterly ? "Ekspor PDF semua platform" : "Ekspor data lengkap",
            desc: isQuarterly ? "Paket triwulan gabungan" : "Data lengkap dengan perbandingan",
            icon: Layers,
            group: "Lengkap",
        },
    ];

    const handleExportChange = (option: SelectOption) => {
        if (demoMode) return;
        if (option.id === "current") onExport();
        if (option.id === "latest") onExportLatest();
        if (option.id === "full") onExportAll();
    };

    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1 font-medium">
                    <span className="text-blue-600">Analitik</span>
                    <span className="text-zinc-300">/</span>
                    <span>{isQuarterly ? "Laporan Triwulan" : "Laporan Pertumbuhan"}</span>
                </div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                    {isQuarterly ? "Laporan Triwulanan" : "Laporan Bulanan"}
                </h1>
                <Text className="mt-2 max-w-2xl">
                    {isQuarterly
                        ? "Tinjau performa triwulanan per platform lalu ekspor PDF eksekutif per platform atau seluruh platform."
                        : "Pantau performa akun lintas platform. Data diambil setiap akhir bulan."}
                </Text>
            </div>
            <div className="flex gap-3">
                <Button outline disabled className="rounded-xl opacity-50 cursor-not-allowed">
                    <Share2 data-slot="icon" />
                    Bagikan
                </Button>

                {demoMode ? (
                    <Button outline disabled className="rounded-xl opacity-60 cursor-not-allowed">
                        <Download data-slot="icon" />
                        Ekspor dinonaktifkan
                    </Button>
                ) : (
                    <FilterListbox
                        icon={Download}
                        value={{ id: "trigger", label: "Opsi ekspor" }}
                        onChange={handleExportChange}
                        options={exportOptions}
                        disabled={!hasViewed}
                        loading={isExporting}
                    />
                )}
            </div>
        </div>
    );
}
