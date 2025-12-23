import { getAccounts } from "@/app/actions/account";
import { getCategories } from "@/app/actions/category";

export const dynamic = "force-dynamic";
import { DataTable } from "@/components/ui/data-table";
import { columns, type Account } from "./columns";
import { AccountDialog } from "@/components/account-dialog";
import { CsvUpload } from "@/components/csv-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { CategorySelect } from "./category-select";

export default async function AccountsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; search?: string; categoryId?: string }>;
}) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const search = params.search || "";
    const categoryId = params.categoryId || "ALL";

    // Fetch data via server action
    let data: Account[] = [];
    let totalPages = 1;
    let categories: { id: string; name: string }[] = [];

    // Fetch categories regardless (for filter)
    try {
        const catRes = await getCategories();
        if (catRes.success && catRes.data) {
            categories = catRes.data;
        }
    } catch {
        // ignore
    }

    // Fetch accounts
    try {
        const result = await getAccounts(page, 10, search, categoryId);
        if (result?.success && result?.data) {
            data = result.data as any[];
            totalPages = result.pagination?.totalPages || 1;
        }
    } catch (e) {
        console.error("Failed to fetch accounts:", e);
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Accounts</h2>
                <div className="flex items-center space-x-2">
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

            <Card className="hidden h-full flex-1 flex-col md:flex border-none shadow-none">
                <CardContent className="p-0">
                    <DataTable columns={columns} data={data} pageCount={totalPages} />
                </CardContent>
            </Card>
        </div>
    );
}
