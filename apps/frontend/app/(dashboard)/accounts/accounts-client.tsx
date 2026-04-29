"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import { Plus, Upload } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountDialog } from "@/modules/accounts/components/account-dialog";
import { CsvUpload } from "@/modules/scraping/components/csv-upload";
import { Button } from "@/shared/components/catalyst/button";
import { Input, InputGroup } from "@/shared/components/catalyst/input";
import { DataTable } from "@/shared/components/ui/data-table";
import { PageHero, Surface, WorkspacePage } from "@/shared/components/ui/workspace";
import { CategorySelect } from "./category-select";
import { type Account, columns } from "./columns";

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
        <WorkspacePage>
            <PageHero
                eyebrow="Manajemen data"
                title="Kelola akun tanpa tenggelam di tabel."
                description="Tambahkan akun, cari handle, dan atur grup laporan dari satu ruang kerja yang lebih tenang dibaca."
                actions={
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <CsvUpload />
                        <AccountDialog
                            mode="create"
                            trigger={
                                <Button>
                                    <Plus data-slot="icon" /> Tambah akun
                                </Button>
                            }
                        />
                    </div>
                }
            />

            <Surface>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <InputGroup>
                        <MagnifyingGlassIcon data-slot="icon" />
                        <Input
                            placeholder="Cari nama akun, tim, atau @pengguna..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                    </InputGroup>
                    <CategorySelect categories={categories} defaultValue={categoryId} />
                </div>
            </Surface>

            {data.length === 0 && !searchValue && categoryId === "ALL" ? (
                <Surface className="border-dashed text-center">
                    <Upload className="mx-auto size-8 text-slate-400" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
                        Tambahkan akun pertama
                    </h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Impor CSV untuk banyak akun atau tambahkan satu akun secara manual. Laporan
                        akan lebih berguna setelah akun memiliki handle platform yang lengkap.
                    </p>
                </Surface>
            ) : (
                <Surface>
                    <DataTable
                        columns={columns}
                        data={data}
                        pageCount={totalPages}
                        pagination={{
                            pageIndex: currentPage - 1,
                            pageSize: 10,
                        }}
                        onPaginationChange={handlePaginationChange}
                        emptyTitle="Tidak ada akun yang cocok"
                        emptyDescription="Coba kata kunci lain atau filter grup laporan."
                    />
                </Surface>
            )}
        </WorkspacePage>
    );
}
