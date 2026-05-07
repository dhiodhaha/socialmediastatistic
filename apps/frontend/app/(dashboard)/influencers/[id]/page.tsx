import type { Platform } from "@repo/database";
import { ArrowLeft, ScanSearch } from "lucide-react";
import Link from "next/link";
import { getInfluencerDetail } from "@/modules/influencers/actions/influencer.actions";
import {
    PlatformBadge,
    ScrapeStatusBadge,
    SentimentBadge,
} from "@/modules/influencers/components/influencer-status-badge";
import {
    InfluencerScrapeDialog,
    RetryScrapeTargetButton,
} from "@/modules/influencers/components/influencer-worker-controls";
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

export default async function InfluencerDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{
        page?: string;
        platform?: string;
    }>;
}) {
    const session = await requireAuthenticatedPage();
    const { id } = await params;
    const filters = await searchParams;
    const canManage = isEditorOrAdmin(session.user.role);

    const result = await getInfluencerDetail(id, {
        page: Number(filters.page) || 1,
        limit: 15,
        platform: (filters.platform as Platform | "ALL" | undefined) ?? "ALL",
    });

    if (!result.success || !result.data) {
        return (
            <div className="mx-auto max-w-4xl p-10">
                <Link href="/influencers" className="text-sm text-blue-600 hover:underline">
                    Kembali ke direktori
                </Link>
                <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-white">
                    {result.error || "Influencer not found"}
                </h1>
            </div>
        );
    }

    const detail = result.data;
    const postsPagination = result.postsPagination ?? { page: 1, totalPages: 1 };

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-8 p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                    <Link
                        href="/influencers"
                        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke direktori influencer
                    </Link>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        {detail.name}
                    </h1>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {detail.size ? (
                            <span className="rounded-full border px-3 py-1 text-sm">
                                {SIZE_LABELS[detail.size]}
                            </span>
                        ) : null}
                        <SentimentBadge sentiment={detail.profileSentiment} />
                        {detail.activePlatforms.map((platform) => (
                            <PlatformBadge key={platform} platform={platform} />
                        ))}
                    </div>
                    <p className="mt-4 text-base/7 text-zinc-600 sm:text-sm/6 dark:text-zinc-300">
                        {detail.profileSummary || detail.note || "Belum ada ringkasan profil."}
                    </p>
                </div>

                {canManage ? (
                    <InfluencerScrapeDialog
                        influencerOptions={[{ id: detail.id, name: detail.name }]}
                        initialSelectedIds={[detail.id]}
                        trigger={
                            <Button>
                                <ScanSearch data-slot="icon" />
                                Scrape ulang profil ini
                            </Button>
                        }
                    />
                ) : null}
            </div>

            <section className="grid gap-4 lg:grid-cols-4">
                <StatCard
                    label="Profesi / institusi"
                    value={detail.professionInstitution || "Belum ada"}
                />
                <StatCard label="Topik profil" value={detail.profileTopicSummary || "Belum ada"} />
                <StatCard label="Scrape terakhir" value={formatDateOnly(detail.lastScrapedAt)} />
                <StatCard label="Analisis terakhir" value={formatDateOnly(detail.lastAnalyzedAt)} />
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <article className="rounded-3xl border border-zinc-950/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950/40">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        Metadata profil
                    </h2>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                        <MetaItem label="Alias" value={detail.displayAlias || "-"} />
                        <MetaItem label="URL utama" value={detail.canonicalUrl || "-"} />
                        <MetaItem label="Instagram" value={detail.handles.INSTAGRAM || "-"} />
                        <MetaItem label="TikTok" value={detail.handles.TIKTOK || "-"} />
                        <MetaItem label="X" value={detail.handles.TWITTER || "-"} />
                        <MetaItem label="Threads" value={detail.handles.THREADS || "-"} />
                        <MetaItem label="YouTube" value={detail.handles.YOUTUBE || "-"} />
                        <MetaItem label="Status" value={detail.isActive ? "Aktif" : "Nonaktif"} />
                    </dl>
                    <div className="mt-5">
                        <div className="text-sm font-medium text-zinc-900 dark:text-white">
                            Topik terkontrol
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {detail.topics.length > 0 ? (
                                detail.topics.map((topic) => (
                                    <span
                                        key={topic}
                                        className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700 dark:bg-blue-950/40 dark:text-blue-100"
                                    >
                                        {topic}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm text-zinc-500">Belum ada topik.</span>
                            )}
                        </div>
                    </div>
                </article>

                <article className="rounded-3xl border border-zinc-950/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950/40">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        Riwayat scrape terbaru
                    </h2>
                    <div className="mt-4 space-y-4">
                        {detail.scrapeRuns.length === 0 ? (
                            <div className="text-sm text-zinc-500">
                                Belum ada scrape untuk influencer ini.
                            </div>
                        ) : (
                            detail.scrapeRuns.slice(0, 3).map((run) => (
                                <div
                                    key={run.id}
                                    className="rounded-2xl border border-zinc-950/10 p-4 dark:border-white/10"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-medium text-zinc-900 dark:text-white">
                                                Run {run.id.slice(0, 8)}
                                            </div>
                                            <div className="text-xs text-zinc-500">
                                                {formatDate(run.createdAt)} · kredit{" "}
                                                {run.creditsUsed}
                                            </div>
                                        </div>
                                        <ScrapeStatusBadge status={run.status} />
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {run.targets.map((target) => (
                                            <div
                                                key={target.id}
                                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 p-3 text-sm dark:bg-zinc-900/60"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <PlatformBadge platform={target.platform} />
                                                        <span className="font-medium">
                                                            {target.handle}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-zinc-500">
                                                        {target.profileFollowers != null
                                                            ? `${target.profileFollowers.toLocaleString("id-ID")} followers`
                                                            : "Follower belum tersedia"}
                                                    </div>
                                                    {target.error ? (
                                                        <div className="text-xs text-red-600">
                                                            {target.error}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <ScrapeStatusBadge status={target.status} />
                                                    {canManage &&
                                                    (target.status === "FAILED" ||
                                                        target.status === "SKIPPED") ? (
                                                        <RetryScrapeTargetButton
                                                            targetId={target.id}
                                                        />
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </article>
            </section>

            <section className="rounded-3xl border border-zinc-950/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950/40">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                            10 unggahan terbaru untuk pembacaan profil
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500">
                            Unggahan di bawah ini hanya menjadi bahan baca AI untuk menyimpulkan
                            topik utama akun, profesi atau identitas akun, dan sentimen umum profil.
                        </p>
                    </div>

                    <form className="grid gap-2 sm:grid-cols-[220px_auto]">
                        <select
                            name="platform"
                            defaultValue={filters.platform ?? "ALL"}
                            className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-zinc-950"
                        >
                            <option value="ALL">Semua platform</option>
                            <option value="INSTAGRAM">Instagram</option>
                            <option value="TIKTOK">TikTok</option>
                            <option value="TWITTER">X</option>
                            <option value="THREADS">Threads</option>
                            <option value="YOUTUBE">YouTube</option>
                        </select>
                        <Button type="submit">Filter</Button>
                    </form>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-950/10 dark:border-white/10">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Post</TableHead>
                                <TableHead>Catatan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {detail.posts.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={2}
                                        className="py-14 text-center text-sm text-zinc-500"
                                    >
                                        Belum ada unggahan yang cocok dengan filter ini.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                detail.posts.map((post) => (
                                    <TableRow key={post.id}>
                                        <TableCell className="max-w-sm">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <PlatformBadge platform={post.platform} />
                                                    <span className="text-xs text-zinc-500">
                                                        {formatDate(post.publishedAt)}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-zinc-900 dark:text-white">
                                                    {post.caption ||
                                                        post.content ||
                                                        "Tidak ada teks"}
                                                </div>
                                                {post.url ? (
                                                    <Link
                                                        href={post.url}
                                                        target="_blank"
                                                        className="text-xs text-blue-600 hover:underline"
                                                    >
                                                        Buka sumber
                                                    </Link>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-sm text-sm text-zinc-600 dark:text-zinc-300">
                                            {post.mediaType ? (
                                                <div>Format: {post.mediaType}</div>
                                            ) : null}
                                            {post.analysis?.transcript ? (
                                                <div className="mt-2 text-xs text-zinc-500">
                                                    Transkrip tersedia untuk pembacaan profil.
                                                </div>
                                            ) : null}
                                            {!post.mediaType && !post.analysis?.transcript ? (
                                                <span className="text-zinc-400">
                                                    Tanpa catatan tambahan
                                                </span>
                                            ) : null}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
                    <div>
                        Halaman {postsPagination.page} dari {postsPagination.totalPages}
                    </div>
                    <div className="flex gap-2">
                        <DetailPageLink
                            disabled={postsPagination.page <= 1}
                            href={buildDetailHref(id, {
                                ...filters,
                                page: String(postsPagination.page - 1),
                            })}
                        >
                            Sebelumnya
                        </DetailPageLink>
                        <DetailPageLink
                            disabled={postsPagination.page >= postsPagination.totalPages}
                            href={buildDetailHref(id, {
                                ...filters,
                                page: String(postsPagination.page + 1),
                            })}
                        >
                            Berikutnya
                        </DetailPageLink>
                    </div>
                </div>
            </section>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-zinc-950/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950/40">
            <div className="text-sm text-zinc-500">{label}</div>
            <div className="mt-2 text-base font-semibold text-zinc-900 dark:text-white">
                {value}
            </div>
        </div>
    );
}

function MetaItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
            <dd className="mt-2 text-sm text-zinc-900 dark:text-white">{value}</dd>
        </div>
    );
}

function DetailPageLink({
    href,
    disabled,
    children,
}: {
    href: string;
    disabled: boolean;
    children: React.ReactNode;
}) {
    if (disabled) {
        return <span className="rounded-md border px-3 py-2 text-zinc-400">{children}</span>;
    }

    return (
        <Link
            href={href}
            className="rounded-md border px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
        >
            {children}
        </Link>
    );
}

function buildDetailHref(id: string, params: Record<string, string | undefined>) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value) {
            searchParams.set(key, value);
        }
    }

    return `/influencers/${id}?${searchParams.toString()}`;
}

function formatDate(value: Date | null) {
    return value ? new Date(value).toLocaleString("id-ID") : "Belum ada";
}

function formatDateOnly(value: Date | null) {
    return value ? new Date(value).toLocaleDateString("id-ID") : "Belum";
}
