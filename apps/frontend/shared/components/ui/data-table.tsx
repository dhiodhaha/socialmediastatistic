"use client";

import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from "@tanstack/react-table";
import * as React from "react";
import { Button } from "@/shared/components/catalyst/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    pageCount?: number;
    pagination?: {
        pageIndex: number;
        pageSize: number;
    };
    onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
    emptyTitle?: string;
    emptyDescription?: string;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    pageCount,
    pagination,
    onPaginationChange,
    emptyTitle = "Belum ada data",
    emptyDescription = "Ubah filter atau tambahkan data sebelum membuat laporan.",
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);

    // Internal pagination state if not controlled
    const [internalPagination, setInternalPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const statePagination = pagination || internalPagination;

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
            pagination: statePagination,
        },
        pageCount: pageCount || -1, // -1 means we don't know the total page count (client-side only behavior if not passed)
        manualPagination: !!pageCount, // Enable manual pagination if pageCount is provided
        onPaginationChange: (updater) => {
            if (onPaginationChange) {
                if (typeof updater === "function") {
                    onPaginationChange(updater(statePagination));
                } else {
                    onPaginationChange(updater);
                }
            } else {
                setInternalPagination(updater);
            }
        },
    });

    return (
        <div className="space-y-4">
            <div className="-mx-4 -my-2 overflow-x-auto whitespace-nowrap sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full px-4 py-2 align-middle sm:px-6 lg:px-8">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id} className="text-zinc-500">
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column.columnDef.header,
                                                          header.getContext(),
                                                      )}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="py-16 text-center"
                                    >
                                        <div className="mx-auto max-w-sm space-y-2">
                                            <div className="text-base/7 font-semibold text-zinc-900 sm:text-sm/6 dark:text-white">
                                                {emptyTitle}
                                            </div>
                                            <div className="text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                                                {emptyDescription}
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-950/10 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                <div className="text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                    Halaman{" "}
                    <span className="font-medium tabular-nums text-zinc-900 dark:text-white">
                        {statePagination.pageIndex + 1}
                    </span>
                    {table.getPageCount() > 0 && (
                        <>
                            {" "}
                            dari{" "}
                            <span className="font-medium tabular-nums text-zinc-900 dark:text-white">
                                {table.getPageCount()}
                            </span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        outline
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Sebelumnya
                    </Button>
                    <Button
                        outline
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Berikutnya
                    </Button>
                </div>
            </div>
        </div>
    );
}
