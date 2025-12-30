import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    SortingState,
    OnChangeFn,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/catalyst/table";
import { Strong, Text } from "@/components/catalyst/text";
import { Loader2, Search, Filter } from "lucide-react";
import { DisplayRow, useReportsColumns } from "./columns";

interface ReportsTableProps {
    data: DisplayRow[];
    sorting: SortingState;
    setSorting: OnChangeFn<SortingState>;
    selectedPlatform: string;
    loadingData: boolean;
    hasViewed: boolean;
}

export function ReportsTable({
    data,
    sorting,
    setSorting,
    selectedPlatform,
    loadingData,
    hasViewed
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
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">

            {/* Empty State: Not viewed yet */}
            {!hasViewed && !loadingData && (
                <div className="flex flex-col items-center justify-center py-20 text-center ">
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full mb-4">
                        <Search className="h-8 w-8 text-zinc-400" />
                    </div>
                    <Strong className="text-lg text-zinc-900 dark:text-white">Bandingkan Data</Strong>
                    <Text className="text-zinc-500 max-w-sm mt-2">
                        Pilih dua periode (snapshot) di panel atas untuk melihat analisis pertumbuhan akun.
                    </Text>
                </div>
            )}

            {/* Loading State */}
            {loadingData && (
                <div className="py-20 flex justify-center items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                </div>
            )}

            {/* Data Table */}
            {hasViewed && !loadingData && (
                data.length > 0 ? (
                    <Table>
                        <TableHead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <TableHeader key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHeader>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHead>
                        <TableBody>
                            {table.getRowModel().rows.map(row => (
                                <TableRow key={row.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id} className="p-0">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    // No Data Found State
                    <div className="p-12 text-center text-zinc-500 flex flex-col items-center">
                        <Filter size={48} className="text-zinc-200 dark:text-zinc-700 mb-4" />
                        <Strong className="text-lg text-zinc-900 dark:text-white">Tidak ada data ditemukan</Strong>
                        <Text className="mt-1 max-w-sm">
                            Coba ganti filter kategori atau pilih platform lain.
                        </Text>
                    </div>
                )
            )}
        </div>
    );
}
