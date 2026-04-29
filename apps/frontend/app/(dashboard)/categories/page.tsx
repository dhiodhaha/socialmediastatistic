import { getCategories } from "@/modules/categories/actions/category.actions";

export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import { CategoryDialog } from "@/modules/categories/components/category-dialog";
import { Button } from "@/shared/components/catalyst/button";
import { DataTable } from "@/shared/components/ui/data-table";
import { type Category, columns } from "./columns";

export default async function CategoriesPage() {
    let data: Category[] = [];

    try {
        const result = await getCategories();
        if (result?.success && result?.data) {
            data = result.data as Category[];
        }
    } catch (e) {
        console.error("Failed to fetch categories:", e);
    }

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-8 p-6 sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="max-w-3xl">
                    <div className="text-base/7 font-medium text-blue-600 sm:text-sm/6">
                        Penataan laporan
                    </div>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Grup laporan
                    </h1>
                    <p className="mt-3 text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                        Kelompokkan akun untuk pelaporan berikutnya. Grup tidak membuat scraping
                        duplikat; grup hanya mengatur bagaimana laporan ekspor difilter dan
                        ditinjau.
                    </p>
                </div>
                <div className="flex items-center lg:justify-end">
                    <CategoryDialog
                        trigger={
                            <Button>
                                <Plus className="size-4" data-slot="icon" /> Tambah grup
                            </Button>
                        }
                    />
                </div>
            </div>

            <DataTable
                data={data}
                columns={columns}
                emptyTitle="Belum ada grup laporan"
                emptyDescription="Buat grup saat akun yang sama perlu muncul di cakupan laporan tertentu."
            />
        </div>
    );
}
