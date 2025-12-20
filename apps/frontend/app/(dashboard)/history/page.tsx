import { getScrapingHistory } from "@/app/actions/history";
import { columns } from "./columns";
import { HistoryToolbar } from "@/components/history-toolbar";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Platform } from "@repo/database";

export default async function HistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; startDate?: string; endDate?: string; status?: string; platform?: string }>;
}) {
    // Await searchParams as required in Next.js 15+ (and likely 16)
    const params = await searchParams;
    const page = Number(params?.page) || 1;

    // Parse filters
    const filters = {
        startDate: params?.startDate ? new Date(params.startDate) : null,
        endDate: params?.endDate ? new Date(params.endDate) : null,
        status: params?.status || null,
        platform: (params?.platform as Platform) || null,
    };

    const { data: jobs, pagination } = await getScrapingHistory(page, 10, filters);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Scraping History</h1>
                <p className="text-muted-foreground mt-1">
                    View logs of past scraping jobs
                </p>
            </div>

            <HistoryToolbar />

            <Card>
                <CardHeader>
                    <CardTitle>Job Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={jobs || []}
                        pageCount={pagination?.totalPages}
                        pagination={{
                            pageIndex: (pagination?.page || 1) - 1,
                            pageSize: pagination?.limit || 10
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
