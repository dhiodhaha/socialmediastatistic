import {
    getQuarterlyOptionsQuery,
    getScrapingJobsForReportQuery,
} from "@/modules/analytics/queries/report.queries";
import { getCategoriesQuery } from "@/modules/categories/queries/category.queries";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
    const [jobsData, quarterlyOptions, categoriesResult] = await Promise.all([
        getScrapingJobsForReportQuery(),
        getQuarterlyOptionsQuery(),
        getCategoriesQuery(),
    ]);

    return (
        <ReportsClient
            initialJobs={jobsData}
            initialQuarterlyOptions={quarterlyOptions}
            initialCategories={categoriesResult as { id: string; name: string }[]}
        />
    );
}
