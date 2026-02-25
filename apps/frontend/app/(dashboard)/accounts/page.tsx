import { getAccounts } from "@/modules/accounts/actions/account.actions";
import { getCategories } from "@/modules/categories/actions/category.actions";
import { AccountsClient } from "./accounts-client";
import { type Account } from "./columns";

export const dynamic = "force-dynamic";

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
            data = result.data as Account[];
            totalPages = result.pagination?.totalPages || 1;
        }
    } catch (e) {
        console.error("Failed to fetch accounts:", e);
    }

    return (
        <AccountsClient
            data={data}
            totalPages={totalPages}
            currentPage={page}
            categories={categories}
            categoryId={categoryId}
            initialSearch={search}
        />
    );
}
