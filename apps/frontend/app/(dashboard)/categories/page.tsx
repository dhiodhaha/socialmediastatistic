import { getCategories } from "@/app/actions/category";

export const dynamic = "force-dynamic";
import { DataTable } from "@/components/ui/data-table";
import { columns, type Category } from "./columns";
import { CategoryDialog } from "@/components/category-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
                    <CategoryDialog trigger={
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Category
                        </Button>
                    } />
                </div>
            </div>
            <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                <DataTable data={data} columns={columns} />
            </div>
        </div>
    );
}
