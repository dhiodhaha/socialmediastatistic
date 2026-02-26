import { getScrapingJobsForReport } from "@/modules/analytics/actions/report.actions";
import { getCategories } from "@/modules/categories/actions/category.actions";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
    // Fetch initial options server-side
    const [jobsData, categoriesResult] = await Promise.all([
        getScrapingJobsForReport(),
        getCategories(),
    ]);

    const initialCategories =
        categoriesResult.success && Array.isArray(categoriesResult.data)
            ? categoriesResult.data
            : [];

    return (
        <ReportsClient
            initialJobs={jobsData}
            initialCategories={initialCategories as { id: string; name: string }[]}
        />
    );
}
