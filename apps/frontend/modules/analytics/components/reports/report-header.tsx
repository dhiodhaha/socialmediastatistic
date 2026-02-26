import { Clock, Download, FileText, Layers, Share2 } from "lucide-react";
import { Button } from "@/shared/components/catalyst/button";
import { Text } from "@/shared/components/catalyst/text";
import { FilterListbox, type SelectOption } from "./filter-listbox";

interface ReportHeaderProps {
    exporting: boolean;
    exportingAll: boolean;
    exportingLatest: boolean;
    hasViewed: boolean;
    onExport: () => void;
    onExportAll: () => void;
    onExportLatest: () => void;
}

export function ReportHeader({
    exporting,
    exportingAll,
    exportingLatest,
    hasViewed,
    onExport,
    onExportAll,
    onExportLatest,
}: ReportHeaderProps) {
    const isExporting = exporting || exportingAll || exportingLatest;

    const exportOptions: SelectOption[] = [
        {
            id: "current",
            label: "Export this Data",
            desc: "Current view",
            icon: FileText,
            group: "Single Files",
        },
        {
            id: "latest",
            label: "Export Standard Data",
            desc: "Overview Standard Data",
            icon: Clock,
            group: "Single Files",
        },
        {
            id: "full",
            label: "Export Full Data",
            desc: "Full Data with Comparison",
            icon: Layers,
            group: "Comprehensive",
        },
    ];

    const handleExportChange = (option: SelectOption) => {
        if (option.id === "current") onExport();
        if (option.id === "latest") onExportLatest();
        if (option.id === "full") onExportAll();
    };

    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1 font-medium">
                    <span className="text-blue-600">Analytics</span>
                    <span className="text-zinc-300">/</span>
                    <span>Growth Report</span>
                </div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                    Laporan Bulanan
                </h1>
                <Text className="mt-2 max-w-2xl">
                    Monitoring performa akun resmi pemerintahan. Data diambil setiap akhir bulan.
                </Text>
            </div>
            <div className="flex gap-3">
                <Button outline disabled className="rounded-xl opacity-50 cursor-not-allowed">
                    <Share2 data-slot="icon" />
                    Share
                </Button>

                <FilterListbox
                    icon={Download}
                    value={{ id: "trigger", label: "Export Options" }}
                    onChange={handleExportChange}
                    options={exportOptions}
                    disabled={!hasViewed}
                    loading={isExporting}
                />
            </div>
        </div>
    );
}
