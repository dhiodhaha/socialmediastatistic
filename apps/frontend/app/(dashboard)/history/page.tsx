import { type Platform, prisma } from "@repo/database";
import { FailedAccountsAlert } from "@/modules/accounts/components/failed-accounts-alert";
import { getScrapingHistory } from "@/modules/analytics/actions/history.actions";
import { HistoryToolbar } from "@/modules/analytics/components/history-toolbar";
import { DataImportUpload } from "@/modules/scraping/components/data-import-upload";
import { PageHero, Surface, SurfaceHeader, WorkspacePage } from "@/shared/components/ui/workspace";
import { FixOrphanButton } from "./fix-orphan-button";
import { HistoryDataTable } from "./history-data-table";

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
        <WorkspacePage>
            <PageHero
                eyebrow="Operasional data"
                title="Pantau scraping, snapshot, dan kesiapan pelaporan."
                description="Gunakan halaman ini untuk melihat data yang siap dipakai, memperbaiki akun gagal, dan mengelola snapshot terdahulu dari satu tempat."
                actions={
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <DataImportUpload />
                        <FixOrphanButton />
                    </div>
                }
            />

            <FailedAccountsAlert />

            <HistoryToolbar activeJobId={activeJob?.id} />

            <Surface>
                <SurfaceHeader
                    eyebrow="Riwayat"
                    title="Snapshot pelaporan"
                    description="Tugas yang selesai bisa dipakai sebagai patokan laporan. Tugas yang gagal sebaiknya diperbaiki sebelum dipakai untuk keluaran PDF."
                />
                <HistoryDataTable
                    data={jobs || []}
                    pageCount={pagination?.totalPages || 1}
                    currentPage={page}
                />
            </Surface>
        </WorkspacePage>
    );
}
