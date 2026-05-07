import type { InfluencerSentiment, InfluencerSize, Platform } from "@repo/database";
import { Link2, ListPlus, Plus, ScanSearch, Upload } from "lucide-react";
import Link from "next/link";
import { getInfluencers } from "@/modules/influencers/actions/influencer.actions";
import { InfluencerDialog } from "@/modules/influencers/components/influencer-dialog";
import { InfluencerImportDialog } from "@/modules/influencers/components/influencer-import-dialog";
import { InfluencerRowActions } from "@/modules/influencers/components/influencer-row-actions";
import {
    InfluencerBatchSourceDialog,
    InfluencerSourceDialog,
} from "@/modules/influencers/components/influencer-source-dialogs";
import {
    PlatformBadge,
    ScrapeStatusBadge,
    SentimentBadge,
} from "@/modules/influencers/components/influencer-status-badge";
import { InfluencerScrapeDialog } from "@/modules/influencers/components/influencer-worker-controls";
import { SIZE_LABELS } from "@/modules/influencers/lib/influencer-taxonomy";
import { Button } from "@/shared/components/catalyst/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import { isEditorOrAdmin } from "@/shared/lib/access-control";
import { requireAuthenticatedPage } from "@/shared/lib/authorization";

export const dynamic = "force-dynamic";

export default async function InfluencersPage({
    searchParams,
}: {
    searchParams: Promise<{
        page?: string;
        search?: string;
        platform?: string;
        sentiment?: string;
        size?: string;
    }>;
}) {
    const session = await requireAuthenticatedPage();
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const search = params.search || "";
    const platform = (params.platform as Platform | "ALL" | undefined) ?? "ALL";
    const sentiment = (params.sentiment as InfluencerSentiment | "ALL" | undefined) ?? "ALL";
    const size = (params.size as InfluencerSize | "ALL" | undefined) ?? "ALL";
    const canManage = isEditorOrAdmin(session.user.role);

    const result = await getInfluencers({
        page,
        limit: 12,
        search,
        platform,
        sentiment,
        size,
    });

    const influencers = result.success ? (result.data ?? []) : [];
    const pagination = result.success
        ? (result.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 1 })
        : { page: 1, limit: 12, total: 0, totalPages: 1 };

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-8 p-6 sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="max-w-3xl">
                    <div className="text-base/7 font-medium text-blue-600 sm:text-sm/6">
                        Modul analisis baru
                    </div>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Influencer analysis
                    </h1>
                    <p className="mt-3 text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                        Direktori terpisah untuk influencer, riwayat scrape multi-platform, dan
                        analisis otomatis pasca-scrape. Modul ini tidak mengubah alur laporan PDF
                        bulanan atau kuartalan yang sudah ada.
                    </p>
                </div>

                {canManage ? (
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                        <InfluencerImportDialog
                            trigger={
                                <Button outline>
                                    <Upload data-slot="icon" />
                                    Import daftar
                                </Button>
                            }
                        />
                        <InfluencerSourceDialog
                            trigger={
                                <Button>
                                    <Link2 data-slot="icon" />
                                    Tangkap otomatis dari link
                                </Button>
                            }
                        />
                        <InfluencerBatchSourceDialog
                            trigger={
                                <Button outline>
                                    <ListPlus data-slot="icon" />
                                    Batch add
                                </Button>
                            }
                        />
                        <InfluencerDialog
                            trigger={
                                <Button outline>
                                    <Plus data-slot="icon" />
                                    Tambah manual
                                </Button>
                            }
                        />
                        <InfluencerScrapeDialog
                            influencerOptions={influencers.map((item) => ({
                                id: item.id,
                                name: item.name,
                            }))}
                            initialSelectedIds={influencers.map((item) => item.id)}
                            trigger={
                                <Button outline>
                                    <ScanSearch data-slot="icon" />
                                    Scrape halaman ini
                                </Button>
                            }
                        />
                    </div>
                ) : null}
            </div>

            <form className="grid gap-3 rounded-3xl border border-zinc-950/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950/40 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto]">
                <input
                    type="text"
                    name="search"
                    defaultValue={search}
                    placeholder="Cari nama, alias, atau handle..."
                    className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-zinc-950"
                />
                <select
                    name="platform"
                    defaultValue={platform}
                    className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-zinc-950"
                >
                    <option value="ALL">Semua platform</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="TIKTOK">TikTok</option>
                    <option value="TWITTER">X</option>
                    <option value="THREADS">Threads</option>
                    <option value="YOUTUBE">YouTube</option>
                </select>
                <select
                    name="size"
                    defaultValue={size}
                    className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-zinc-950"
                >
                    <option value="ALL">Semua ukuran</option>
                    {Object.entries(SIZE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <select
                    name="sentiment"
                    defaultValue={sentiment}
                    className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-zinc-950"
                >
                    <option value="ALL">Semua sentimen</option>
                    <option value="POSITIVE">Positif</option>
                    <option value="NEUTRAL">Netral</option>
                    <option value="NEGATIVE">Negatif</option>
                    <option value="MIXED">Campuran</option>
                    <option value="UNKNOWN">Belum dinilai</option>
                </select>
                <Button type="submit">Terapkan filter</Button>
            </form>

            <section className="overflow-hidden rounded-3xl border border-zinc-950/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950/40">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Influencer</TableHead>
                            <TableHead>Ukuran</TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead>Sentimen profil</TableHead>
                            <TableHead>Topik</TableHead>
                            <TableHead>Scrape terakhir</TableHead>
                            <TableHead>Analisis terakhir</TableHead>
                            <TableHead>Status terbaru</TableHead>
                            <TableHead className="w-16 text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {influencers.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={9}
                                    className="py-16 text-center text-sm text-zinc-500"
                                >
                                    Belum ada influencer yang cocok dengan filter ini.
                                </TableCell>
                            </TableRow>
                        ) : (
                            influencers.map((influencer) => (
                                <TableRow key={influencer.id}>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <Link
                                                href={`/influencers/${influencer.id}`}
                                                className="font-medium text-zinc-900 hover:underline dark:text-white"
                                            >
                                                {influencer.name}
                                            </Link>
                                            {influencer.displayAlias ? (
                                                <div className="text-sm text-zinc-500">
                                                    {influencer.displayAlias}
                                                </div>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {influencer.size ? SIZE_LABELS[influencer.size] : "Belum"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {influencer.activePlatforms.map((item) => (
                                                <PlatformBadge key={item} platform={item} />
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <SentimentBadge sentiment={influencer.profileSentiment} />
                                    </TableCell>
                                    <TableCell className="max-w-xs text-sm text-zinc-600 dark:text-zinc-300">
                                        {influencer.topics.length > 0
                                            ? influencer.topics.join(", ")
                                            : "Belum ada"}
                                    </TableCell>
                                    <TableCell>{formatDate(influencer.lastScrapedAt)}</TableCell>
                                    <TableCell>{formatDate(influencer.lastAnalyzedAt)}</TableCell>
                                    <TableCell>
                                        <ScrapeStatusBadge status={influencer.latestRunStatus} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {canManage ? (
                                            <InfluencerRowActions influencer={influencer} />
                                        ) : (
                                            <span className="text-sm text-zinc-400">Read only</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </section>

            <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-500">
                    Halaman {pagination.page} dari {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                    <PaginationLink
                        disabled={pagination.page <= 1}
                        href={buildPageHref({
                            ...params,
                            page: String(pagination.page - 1),
                        })}
                    >
                        Sebelumnya
                    </PaginationLink>
                    <PaginationLink
                        disabled={pagination.page >= pagination.totalPages}
                        href={buildPageHref({
                            ...params,
                            page: String(pagination.page + 1),
                        })}
                    >
                        Berikutnya
                    </PaginationLink>
                </div>
            </div>
        </div>
    );
}

function PaginationLink({
    href,
    disabled,
    children,
}: {
    href: string;
    disabled: boolean;
    children: React.ReactNode;
}) {
    if (disabled) {
        return (
            <span className="rounded-md border px-3 py-2 text-sm text-zinc-400">{children}</span>
        );
    }

    return (
        <Link
            href={href}
            className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
        >
            {children}
        </Link>
    );
}

function buildPageHref(params: Record<string, string | undefined>) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value) {
            searchParams.set(key, value);
        }
    }

    return `/influencers?${searchParams.toString()}`;
}

function formatDate(value: Date | null) {
    return value ? new Date(value).toLocaleDateString("id-ID") : "Belum";
}
