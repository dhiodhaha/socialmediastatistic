"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { columns, type Account } from "./columns";
import { AccountDialog } from "@/components/account-dialog";
import { CsvUpload } from "@/components/csv-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { CategorySelect } from "./category-select";

interface AccountsClientProps {
    data: Account[];
    totalPages: number;
    currentPage: number;
    categories: { id: string; name: string }[];
    categoryId: string;
    initialSearch: string;
}

export function AccountsClient({
    data,
    totalPages,
    currentPage,
    categories,
    categoryId,
    initialSearch,
}: AccountsClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchValue, setSearchValue] = useState(initialSearch);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchValue !== initialSearch) {
                const params = new URLSearchParams(searchParams.toString());
                if (searchValue) {
                    params.set("search", searchValue);
                } else {
                    params.delete("search");
                }
                params.set("page", "1"); // Reset to page 1 on search
                router.push(`/accounts?${params.toString()}`);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchValue, initialSearch, searchParams, router]);

    const handlePaginationChange = (pagination: { pageIndex: number; pageSize: number }) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", String(pagination.pageIndex + 1));
        router.push(`/accounts?${params.toString()}`);
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Accounts</h2>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Input
                            placeholder="Search name or @handle..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="pl-9 w-[220px]"
                        />
                    </div>
                    <CategorySelect categories={categories} defaultValue={categoryId} />
                    <CsvUpload />
                    <AccountDialog
                        mode="create"
                        trigger={
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Account
                            </Button>
                        }
                    />
                </div>
            </div>

            <DataTable
                columns={columns}
                data={data}
                pageCount={totalPages}
                pagination={{
                    pageIndex: currentPage - 1,
                    pageSize: 10,
                }}
                onPaginationChange={handlePaginationChange}
            />
        </div>
    );
}
