export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import { CategoryDialog } from "@/modules/categories/components/category-dialog";
import { getCategoriesQuery } from "@/modules/categories/queries/category.queries";
import { Button } from "@/shared/components/catalyst/button";
import { DataTable } from "@/shared/components/ui/data-table";
import { PageHero, Surface, WorkspacePage } from "@/shared/components/ui/workspace";
import { type Category, columns } from "./columns";

export default async function CategoriesPage() {
    let data: Category[] = [];

    try {
        data = (await getCategoriesQuery()) as Category[];
    } catch (e) {
        console.error("Failed to fetch categories:", e);
    }

    return (
        <WorkspacePage>
            <PageHero
                eyebrow="Struktur laporan"
                title="Atur grup laporan tanpa mengubah proses scraping."
                description="Grup dipakai untuk membentuk cakupan laporan dan filter ekspor, bukan untuk menjalankan scraping berulang."
                actions={
                    <CategoryDialog
                        trigger={
                            <Button>
                                <Plus className="size-4" data-slot="icon" /> Tambah grup
                            </Button>
                        }
                    />
                }
            />

            <Surface>
                <DataTable
                    data={data}
                    columns={columns}
                    emptyTitle="Belum ada grup laporan"
                    emptyDescription="Buat grup saat akun yang sama perlu muncul di cakupan laporan tertentu."
                />
            </Surface>
        </WorkspacePage>
    );
}
