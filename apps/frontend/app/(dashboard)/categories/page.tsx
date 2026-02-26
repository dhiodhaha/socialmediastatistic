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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data = result.data as any[];
        }
    } catch (e) {
        console.error("Failed to fetch categories:", e);
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
                <div className="flex items-center space-x-2">
                    <CategoryDialog
                        trigger={
                            <Button>
                                <Plus className="h-4 w-4" data-slot="icon" /> Add Category
                            </Button>
                        }
                    />
                </div>
            </div>
            <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                <DataTable data={data} columns={columns} />
            </div>
        </div>
    );
}
