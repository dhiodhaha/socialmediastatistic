"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";

interface HistoryDataTableProps {
    data: any[];
    pageCount: number;
    currentPage: number;
}

export function HistoryDataTable({ data, pageCount, currentPage }: HistoryDataTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handlePaginationChange = (pagination: { pageIndex: number; pageSize: number }) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", String(pagination.pageIndex + 1));
        router.push(`/history?${params.toString()}`);
    };

    return (
        <DataTable
            columns={columns}
            data={data}
            pageCount={pageCount}
            pagination={{
                pageIndex: currentPage - 1,
                pageSize: 10,
            }}
            onPaginationChange={handlePaginationChange}
        />
    );
}
