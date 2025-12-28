import { getScrapingHistory } from "@/app/actions/history";
import { columns } from "./columns";
import { HistoryToolbar } from "@/components/history-toolbar";
import { HistoryDataTable } from "./history-data-table";
import { FailedAccountsAlert } from "@/components/failed-accounts-alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Platform, prisma } from "@repo/database";
import { DataImportUpload } from "@/components/data-import-upload";
import { FixOrphanButton } from "./fix-orphan-button";

export default async function HistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; status?: string; platform?: string }>;
}) {
    // Await searchParams as required in Next.js 15+ (and likely 16)
    const params = await searchParams;
    const page = Number(params?.page) || 1;

    // Parse filters
    const filters = {
        status: params?.status || null,
        platform: (params?.platform as Platform) || null,
    };

    const { data: jobs, pagination } = await getScrapingHistory(page, 10, filters);

    // Check for any currently running job to show progress immediately
    // Check for any currently running job to show progress immediately
    let activeJob: { id: string } | null = null;

    if (process.env.DATABASE_URL) {
        try {
            activeJob = await prisma.scrapingJob.findFirst({
                where: { status: { in: ["PENDING", "RUNNING"] } },
                orderBy: { createdAt: "desc" },
                select: { id: true }
            });
        } catch {
            console.warn("Failed to fetch active job (likely build time or DB unreachable)");
        }
    }


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Scraping History</h1>
                    <p className="text-muted-foreground mt-1">
                        View and manage your automated extraction logs.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <DataImportUpload />
                    <FixOrphanButton />
                </div>
            </div>

            <FailedAccountsAlert />

            <HistoryToolbar activeJobId={activeJob?.id} />

            <Card>
                <CardHeader>
                    <CardTitle>Job Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    <HistoryDataTable
                        data={jobs || []}
                        pageCount={pagination?.totalPages || 1}
                        currentPage={page}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
