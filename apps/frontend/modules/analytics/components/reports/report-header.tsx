import { Clock, Download, FileText, Layers, Share2 } from "lucide-react";
import { Button } from "@/shared/components/catalyst/button";
import { PageHero } from "@/shared/components/ui/workspace";
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
        <PageHero
            eyebrow={isQuarterly ? "Laporan triwulan" : "Laporan bulanan"}
            title={
                isQuarterly
                    ? "Bandingkan performa kuartal dengan struktur yang lebih mudah dibaca."
                    : "Bangun laporan pertumbuhan tanpa toolbar yang terasa padat."
            }
            description={
                isQuarterly
                    ? "Tinjau performa triwulanan per platform lalu ekspor PDF per platform atau seluruh platform dari satu alur yang konsisten."
                    : "Pantau performa akun lintas platform dan siapkan PDF dari snapshot bulanan yang sudah tersimpan."
            }
            actions={
                <>
                    <Button outline disabled className="rounded-full opacity-50 cursor-not-allowed">
                        <Share2 data-slot="icon" />
                        Bagikan
                    </Button>

                    {demoMode ? (
                        <Button
                            outline
                            disabled
                            className="rounded-full opacity-60 cursor-not-allowed"
                        >
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
                </>
            }
        />
    );
}
