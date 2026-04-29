import { getAccountsQuery } from "@/modules/accounts/queries/account.queries";
import { getCategoriesQuery } from "@/modules/categories/queries/category.queries";
import { AccountsClient } from "./accounts-client";
import type { Account } from "./columns";

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

    let data: Account[] = [];
    let totalPages = 1;
    let categories: { id: string; name: string }[] = [];

    try {
        categories = await getCategoriesQuery();
    } catch {
        // ignore
    }

    try {
        const result = await getAccountsQuery(page, 10, search, categoryId);
        data = result.data as Account[];
        totalPages = result.pagination.totalPages || 1;
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
