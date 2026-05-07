import { type Platform, prisma } from "@repo/database";
import { FailedAccountsAlert } from "@/modules/accounts/components/failed-accounts-alert";
import { getScrapingHistory } from "@/modules/analytics/actions/history.actions";
import { HistoryToolbar } from "@/modules/analytics/components/history-toolbar";
import { DataImportUpload } from "@/modules/scraping/components/data-import-upload";
import { requireEditorOrAdminPage } from "@/shared/lib/authorization";
import { FixOrphanButton } from "./fix-orphan-button";
import { HistoryDataTable } from "./history-data-table";

export default async function HistoryPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; status?: string; platform?: string }>;
}) {
    await requireEditorOrAdminPage();

    // Await searchParams as required in Next.js 15+ (and likely 16)
    const params = await searchParams;
    const page = Number(params?.page) || 1;

    // Parse filters
    const filters = {
        status: params?.status || null,
        platform: (params?.platform as Platform) || null,
    };

    const { data: jobs, pagination } = await getScrapingHistory(page, 10, filters);

    // Cek tugas yang sedang berjalan agar progres langsung terlihat
    let activeJob: { id: string } | null = null;

    if (process.env.DATABASE_URL) {
        try {
            activeJob = await prisma.scrapingJob.findFirst({
                where: { status: { in: ["PENDING", "RUNNING"] } },
                orderBy: { createdAt: "desc" },
                select: { id: true },
            });
        } catch {
            console.warn(
                "Gagal mengambil tugas aktif (mungkin saat build atau DB tidak terjangkau)",
            );
        }
    }

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-8 p-6 sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="max-w-3xl">
                    <div className="text-base/7 font-medium text-blue-600 sm:text-sm/6">
                        Kesiapan data
                    </div>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Data scraping
                    </h1>
                    <p className="mt-3 text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                        Cek proses scraping yang siap dipakai untuk laporan bulanan atau kuartalan.
                        Gunakan halaman ini untuk menetapkan bulan pelaporan, meninjau akun yang
                        gagal, atau mengimpor snapshot terdahulu.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                    <DataImportUpload />
                    <FixOrphanButton />
                </div>
            </div>

            <FailedAccountsAlert />

            <HistoryToolbar activeJobId={activeJob?.id} />

            <section className="space-y-4">
                <div>
                    <h2 className="text-lg/7 font-semibold text-zinc-900 dark:text-white">
                        Snapshot pelaporan
                    </h2>
                    <p className="mt-1 text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                        Tugas yang selesai bisa dipakai sebagai patokan laporan. Tugas yang gagal
                        sebaiknya diperbaiki sebelum dipakai untuk keluaran PDF.
                    </p>
                </div>
                <HistoryDataTable
                    data={jobs || []}
                    pageCount={pagination?.totalPages || 1}
                    currentPage={page}
                />
            </section>
        </div>
    );
}
