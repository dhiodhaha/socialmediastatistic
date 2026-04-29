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
        <div className="mx-auto flex max-w-7xl flex-col gap-8 p-6 sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="max-w-3xl">
                    <div className="text-base/7 font-medium text-blue-600 sm:text-sm/6">
                        Penataan data
                    </div>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Akun
                    </h1>
                    <p className="mt-3 text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                        Kelola akun media sosial yang menjadi sumber laporan bulanan dan kuartalan.
                        Satu akun bisa masuk ke beberapa grup laporan, tetapi scraping tetap
                        berjalan satu kali per platform.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
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
            </div>

            <section className="space-y-5">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
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

                {data.length === 0 && !searchValue && categoryId === "ALL" ? (
                    <div className="rounded-3xl border border-dashed border-zinc-950/15 p-8 text-center dark:border-white/15">
                        <Upload className="mx-auto size-8 text-zinc-400" />
                        <h2 className="mt-4 text-lg/7 font-semibold text-zinc-900 dark:text-white">
                            Tambahkan akun laporan pertama
                        </h2>
                        <p className="mx-auto mt-2 max-w-xl text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                            Impor CSV untuk banyak akun atau tambahkan satu akun secara manual.
                            Laporan baru berguna setelah akun memiliki handle platform.
                        </p>
                    </div>
                ) : (
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
                )}
            </section>
        </div>
    );
}
