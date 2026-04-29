"use no memo";

import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    type OnChangeFn,
    type SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { Filter, Loader2, Search } from "lucide-react";
import { Strong, Text } from "@/shared/components/catalyst/text";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableHeadRow,
    TableRow,
} from "@/shared/components/ui/table";
import { type DisplayRow, useReportsColumns } from "./columns";
import type { ReportMode } from "./report-mode";

interface ReportsTableProps {
    data: DisplayRow[];
    sorting: SortingState;
    setSorting: OnChangeFn<SortingState>;
    selectedPlatform: string;
    loadingData: boolean;
    hasViewed: boolean;
    reportMode: ReportMode;
}

export function ReportsTable({
    data,
    sorting,
    setSorting,
    selectedPlatform,
    loadingData,
    hasViewed,
    reportMode,
}: ReportsTableProps) {
    // Use extracted hook for columns
    const columns = useReportsColumns(selectedPlatform);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="min-h-[400px] overflow-hidden rounded-[1.75rem] border border-slate-300/80 bg-white shadow-sm ring-1 ring-slate-200/70 dark:border-white/10 dark:bg-slate-950 dark:ring-white/10">
            {/* Empty State: Not viewed yet */}
            {!hasViewed && !loadingData && (
                <div className="flex flex-col items-center justify-center py-20 text-center ">
                    <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-white/5">
                        <Search className="h-8 w-8 text-slate-400" />
                    </div>
                    <Strong className="text-lg text-slate-900 dark:text-white">
                        {reportMode === "QUARTERLY"
                            ? "Siapkan Laporan Triwulanan"
                            : "Bandingkan Data"}
                    </Strong>
                    <Text className="mt-2 max-w-sm text-slate-500 dark:text-slate-400">
                        {reportMode === "QUARTERLY"
                            ? "Pilih tahun dan kuartal di panel atas untuk meninjau performa platform, ranking, dan bukti akun per kuartal."
                            : "Pilih dua periode (snapshot) di panel atas untuk melihat analisis pertumbuhan akun."}
                    </Text>
                </div>
            )}

            {/* Loading State */}
            {loadingData && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
            )}

            {/* Data Table */}
            {hasViewed &&
                !loadingData &&
                (data.length > 0 ? (
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableHeadRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext(),
                                                  )}
                                        </TableHead>
                                    ))}
                                </TableHeadRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="group">
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="px-0 py-0">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    // No Data Found State
                    <div className="flex flex-col items-center p-12 text-center text-slate-500 dark:text-slate-400">
                        <Filter size={48} className="mb-4 text-slate-200 dark:text-slate-700" />
                        <Strong className="text-lg text-slate-900 dark:text-white">
                            {reportMode === "QUARTERLY"
                                ? "Tidak ada baris platform kuartal yang tersedia"
                                : "Tidak ada data ditemukan"}
                        </Strong>
                        <Text className="mt-1 max-w-sm text-slate-500 dark:text-slate-400">
                            {reportMode === "QUARTERLY"
                                ? "Platform ini tidak memiliki data akun kuartal yang diturunkan untuk kuartal dan filter yang dipilih."
                                : "Coba ganti filter kategori atau pilih platform lain."}
                        </Text>
                    </div>
                ))}
        </div>
    );
}
