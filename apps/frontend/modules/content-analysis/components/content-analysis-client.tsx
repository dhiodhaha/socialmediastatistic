"use client";

import type {
    ContentAnalysisHistoryItem,
    ContentAnalysisStance,
    ContentPreviewTranscriptSegment,
} from "@repo/types";
import { Activity, ExternalLink, Loader2, RefreshCcw, SearchCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { runContentAnalysisAction } from "@/modules/content-analysis/actions/content-analysis.actions";
import type {
    ContentAnalysisAccountOption,
    ContentAnalysisPageData,
} from "@/modules/content-analysis/queries/content-analysis.queries";
import { Button } from "@/shared/components/catalyst/button";
import { Input } from "@/shared/components/catalyst/input";
import { Textarea } from "@/shared/components/catalyst/textarea";
import {
    HeroMetric,
    HeroMetricGrid,
    InfoStrip,
    PageHero,
    Surface,
    SurfaceHeader,
    WorkspacePage,
} from "@/shared/components/ui/workspace";
import { cn } from "@/shared/lib/utils";
import { ContentAnalysisAccountCombobox } from "./content-analysis-account-combobox";

type ContentAnalysisClientProps = ContentAnalysisPageData & {
    canManage: boolean;
};

const DEFAULT_TARGET_LABEL = "Kemendikdasmen";

export function ContentAnalysisClient({
    accounts,
    selectedAccountId,
    history,
    metrics,
    canManage,
}: ContentAnalysisClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [submitting, setSubmitting] = useState(false);
    const [sourceUrl, setSourceUrl] = useState("");
    const [targetLabel, setTargetLabel] = useState(DEFAULT_TARGET_LABEL);
    const [localHistory, setLocalHistory] = useState(history);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(history[0]?.id ?? null);

    useEffect(() => {
        setLocalHistory(history);
        setSelectedRunId((current) =>
            current && history.some((item) => item.id === current)
                ? current
                : (history[0]?.id ?? null),
        );
    }, [history]);

    const selectedAccount = useMemo(
        () => accounts.find((account) => account.id === selectedAccountId) ?? null,
        [accounts, selectedAccountId],
    );
    const selectedRun =
        localHistory.find((item) => item.id === selectedRunId) ?? localHistory[0] ?? null;
    const hasPending = localHistory.some(
        (item) => item.status === "PENDING" || item.status === "RUNNING",
    );

    useEffect(() => {
        if (!hasPending) return;

        const interval = window.setInterval(() => {
            startTransition(() => {
                router.refresh();
            });
        }, 12000);

        return () => window.clearInterval(interval);
    }, [hasPending, router]);

    async function handleSubmit() {
        if (!canManage) return;
        if (!selectedAccount) {
            toast.error("Pilih akun tujuan dulu.");
            return;
        }
        if (!sourceUrl.trim()) {
            toast.error("Masukkan link konten yang ingin dianalisis.");
            return;
        }

        setSubmitting(true);
        const result = await runContentAnalysisAction({
            accountId: selectedAccount.id,
            sourceUrl,
            targetLabel,
        });
        setSubmitting(false);

        if (!result.success) {
            toast.error(result.error || "Gagal menjadwalkan analisis.");
            return;
        }

        const queuedRun = result.data;

        if (queuedRun) {
            setLocalHistory((current) => [
                queuedRun,
                ...current.filter((item) => item.id !== queuedRun.id),
            ]);
            setSelectedRunId(queuedRun.id);
        }

        toast.success("Analisis dijadwalkan. Halaman akan menyegarkan saat hasil masuk.");
        setSourceUrl("");
        startTransition(() => {
            router.refresh();
        });
    }

    function handleAccountChange(account: ContentAnalysisAccountOption | null) {
        const next = new URLSearchParams(searchParams.toString());

        if (account?.id) {
            next.set("accountId", account.id);
        } else {
            next.delete("accountId");
        }

        startTransition(() => {
            router.replace(next.size > 0 ? `${pathname}?${next.toString()}` : pathname);
        });
    }

    return (
        <WorkspacePage>
            <PageHero
                eyebrow="Modul analisis baru"
                title="Analisis konten"
                description="Tempel satu link konten untuk dibaca, diperluas jadi thread atau transkrip bila tersedia, lalu dianalisis secara otomatis. Riwayatnya tetap menempel ke akun internal agar operator bisa menelusuri hasil per akun."
                actions={
                    <Button
                        outline
                        onClick={() =>
                            startTransition(() => {
                                router.refresh();
                            })
                        }
                    >
                        <RefreshCcw data-slot="icon" />
                        Muat ulang
                    </Button>
                }
            >
                <HeroMetricGrid className="xl:grid-cols-4">
                    <HeroMetric
                        label="Total analisis"
                        value={metrics.totalRuns}
                        detail="Semua konten yang pernah masuk ke modul ini"
                    />
                    <HeroMetric
                        label="Selesai"
                        value={metrics.completedRuns}
                        detail="Hasil yang sudah punya ringkasan dan stance"
                    />
                    <HeroMetric
                        label="Akun tercakup"
                        value={metrics.accountsCovered}
                        detail="Akun internal yang sudah memiliki histori"
                    />
                    <HeroMetric
                        label="Antrean aktif"
                        value={metrics.pendingRuns}
                        detail={
                            hasPending
                                ? "Halaman menyegarkan otomatis saat masih ada antrean"
                                : "Tidak ada job aktif saat ini"
                        }
                    />
                </HeroMetricGrid>
            </PageHero>

            <Surface>
                <SurfaceHeader
                    eyebrow="Analisis baru"
                    title="Kirim link konten untuk akun terpilih"
                    description="Pilih dulu akun internal yang akan menyimpan histori analisis. Setelah itu cukup tempel link konten. Resolusi thread, caption, dan transkrip akan diambil otomatis sesuai platform."
                />

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
                    <div className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-4">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Akun histori
                            </div>
                            <div className="mt-2">
                                <ContentAnalysisAccountCombobox
                                    accounts={accounts}
                                    value={selectedAccount}
                                    onChange={handleAccountChange}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Organisasi target
                            </div>
                            <div className="mt-2">
                                <Input
                                    value={targetLabel}
                                    onChange={(event) => setTargetLabel(event.target.value)}
                                    disabled={!canManage}
                                />
                            </div>
                        </div>

                        <InfoStrip
                            className="grid-cols-1 xl:grid-cols-1"
                            items={[
                                {
                                    label: "Akun aktif",
                                    value: selectedAccount?.username ?? "Belum dipilih",
                                },
                                {
                                    label: "Histori akun",
                                    value: `${localHistory.length} item terbaru`,
                                },
                            ]}
                        />
                    </div>

                    <div className="space-y-4 rounded-[1.5rem] border border-slate-200/80 bg-white p-4">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Link konten
                            </div>
                            <div className="mt-2">
                                <Textarea
                                    value={sourceUrl}
                                    onChange={(event) => setSourceUrl(event.target.value)}
                                    rows={4}
                                    disabled={!canManage}
                                    placeholder="Contoh: https://x.com/.../status/... atau https://www.instagram.com/p/..."
                                />
                            </div>
                        </div>

                        <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                            Mendukung saat ini: X, Threads, Instagram post/reel, TikTok video, dan
                            YouTube. X serta Threads akan dicoba diperluas menjadi thread penuh.
                            Video akan mengambil transkrip bila platform menyediakannya.
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handleSubmit}
                                disabled={!canManage || submitting || !selectedAccount}
                            >
                                {submitting ? (
                                    <Loader2 data-slot="icon" className="animate-spin" />
                                ) : (
                                    <SearchCheck data-slot="icon" />
                                )}
                                {submitting ? "Menjadwalkan..." : "Analisis sekarang"}
                            </Button>
                            {!canManage ? (
                                <div className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-500">
                                    Mode baca saja
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </Surface>

            <Surface>
                <SurfaceHeader
                    eyebrow="Riwayat akun"
                    title={
                        selectedAccount
                            ? `Histori analisis ${selectedAccount.username}`
                            : "Belum ada akun aktif"
                    }
                    description="Setiap konten yang dianalisis akan tersimpan ke akun ini. Klik salah satu item untuk membuka preview, transkrip, dan hasil analisis."
                />

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
                    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80">
                        <div className="grid grid-cols-[140px_110px_100px_minmax(0,1fr)] gap-4 border-b border-slate-200/80 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            <div>Tanggal</div>
                            <div>Platform</div>
                            <div>Status</div>
                            <div>Ringkasan</div>
                        </div>
                        <div className="divide-y divide-slate-200/80">
                            {localHistory.length === 0 ? (
                                <div className="px-4 py-14 text-center text-sm text-slate-500">
                                    Belum ada histori analisis untuk akun ini.
                                </div>
                            ) : (
                                localHistory.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setSelectedRunId(item.id)}
                                        className={cn(
                                            "grid w-full grid-cols-[140px_110px_100px_minmax(0,1fr)] gap-4 px-4 py-4 text-left transition hover:bg-slate-50",
                                            selectedRunId === item.id && "bg-slate-50",
                                        )}
                                    >
                                        <div className="text-sm text-slate-600">
                                            {formatDate(item.createdAt)}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-sm font-medium text-slate-900">
                                                {platformLabel(item.platform)}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {item.isThread
                                                    ? "Thread"
                                                    : item.containsVideo
                                                      ? "Video"
                                                      : "Postingan"}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <StatusPill status={item.status} />
                                            {item.stance ? (
                                                <StancePill stance={item.stance} />
                                            ) : null}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium text-slate-900">
                                                {item.sourceTitle ||
                                                    item.authorDisplayName ||
                                                    item.authorHandle ||
                                                    "Konten tanpa judul"}
                                            </div>
                                            <div className="mt-1 line-clamp-2 text-sm text-slate-600">
                                                {item.summary ||
                                                    item.preview?.summaryText ||
                                                    item.preview?.caption ||
                                                    item.sourceUrl}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-4">
                        {selectedRun ? <RunDetailPanel run={selectedRun} /> : <EmptyDetailPanel />}
                    </div>
                </div>
            </Surface>
        </WorkspacePage>
    );
}

function RunDetailPanel({ run }: { run: ContentAnalysisHistoryItem }) {
    const transcriptSegments = run.preview?.transcriptSegments ?? [];
    const evidence = run.analysis?.evidence ?? [];

    return (
        <div className="space-y-5">
            <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Detail analisis
                </div>
                <h3 className="mt-2 text-xl font-medium tracking-[-0.03em] text-slate-950">
                    {run.sourceTitle ||
                        run.authorDisplayName ||
                        run.authorHandle ||
                        "Konten terpilih"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                    {run.analysis?.summary ||
                        run.summary ||
                        "Job masih berjalan atau belum menghasilkan ringkasan."}
                </p>
            </div>

            <InfoStrip
                className="grid-cols-2"
                items={[
                    { label: "Akun histori", value: run.accountName },
                    { label: "Platform", value: platformLabel(run.platform) },
                    { label: "Status", value: statusLabel(run.status) },
                    { label: "Stance", value: run.stance ? stanceLabel(run.stance) : "Belum ada" },
                ]}
            />

            <div className="space-y-3 rounded-[1.25rem] border border-slate-200/80 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-900">Sumber dan preview</div>
                    <Link
                        href={run.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                        Buka sumber
                        <ExternalLink className="size-4" />
                    </Link>
                </div>

                {run.preview?.threadItems.length ? (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Urutan thread
                        </div>
                        <div className="space-y-2">
                            {run.preview.threadItems.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="rounded-xl border border-slate-200/80 px-3 py-3"
                                >
                                    <div className="text-xs text-slate-500">
                                        Bagian {index + 1} •{" "}
                                        {item.publishedAt
                                            ? formatDate(item.publishedAt)
                                            : "Tanggal tidak tersedia"}
                                    </div>
                                    <div className="mt-1 text-sm leading-6 text-slate-700">
                                        {item.text || "Tidak ada teks."}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {run.preview?.caption ? (
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Caption / deskripsi
                        </div>
                        <div className="mt-2 rounded-xl border border-slate-200/80 px-3 py-3 text-sm leading-6 text-slate-700">
                            {run.preview.caption}
                        </div>
                    </div>
                ) : null}

                {transcriptSegments.length > 0 ? (
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Transkrip
                        </div>
                        <div className="mt-2 space-y-2">
                            {transcriptSegments.map((segment, index) => (
                                <TranscriptSegmentCard
                                    key={`${segment.startLabel ?? "segment"}-${index}`}
                                    sourceUrl={run.sourceUrl}
                                    segment={segment}
                                    platform={run.platform}
                                />
                            ))}
                        </div>
                    </div>
                ) : null}

                {run.preview?.platformNotes.length ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-800">
                        {run.preview.platformNotes.join(" ")}
                    </div>
                ) : null}
            </div>

            <div className="space-y-3 rounded-[1.25rem] border border-slate-200/80 bg-white p-4">
                <div className="text-sm font-medium text-slate-900">Arah respons</div>
                <BulletSection
                    title="Isu utama"
                    items={run.analysis?.keyIssues ?? []}
                    emptyText="Belum ada isu utama yang diringkas."
                />
                <BulletSection
                    title="Poin klarifikasi"
                    items={run.analysis?.clarificationPoints ?? []}
                    emptyText="Belum ada poin klarifikasi."
                />
                <BulletSection
                    title="Langkah mendukung"
                    items={run.analysis?.supportActions ?? []}
                    emptyText="Belum ada saran dukungan."
                />
                <BulletSection
                    title="Langkah merespons"
                    items={run.analysis?.counterActions ?? []}
                    emptyText="Belum ada saran respons."
                />
                <BulletSection
                    title="Catatan cek fakta"
                    items={run.analysis?.factCheckNotes ?? []}
                    emptyText="Belum ada catatan cek fakta."
                />
            </div>

            <div className="space-y-3 rounded-[1.25rem] border border-slate-200/80 bg-white p-4">
                <div className="text-sm font-medium text-slate-900">Bukti yang dipakai model</div>
                {evidence.length > 0 ? (
                    <div className="space-y-2">
                        {evidence.map((item, index) => (
                            <div
                                key={`${item.label}-${index}`}
                                className="rounded-xl border border-slate-200/80 px-3 py-3"
                            >
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {item.label}
                                </div>
                                <div className="mt-1 text-sm leading-6 text-slate-700">
                                    {item.quote}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-slate-500">
                        Bukti belum tersedia atau analisis belum selesai.
                    </div>
                )}
            </div>

            {run.error ? (
                <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                    {run.error}
                </div>
            ) : null}
        </div>
    );
}

function EmptyDetailPanel() {
    return (
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center text-slate-500">
            <Activity className="size-8" />
            <div className="text-sm font-medium text-slate-700">Belum ada item dipilih</div>
            <div className="max-w-xs text-sm leading-6">
                Pilih salah satu histori di sebelah kiri untuk melihat preview konten, transkrip,
                dan hasil analisis.
            </div>
        </div>
    );
}

function TranscriptSegmentCard({
    sourceUrl,
    segment,
    platform,
}: {
    sourceUrl: string;
    segment: ContentPreviewTranscriptSegment;
    platform: string;
}) {
    const href = buildTimestampHref(sourceUrl, segment.startMs, platform);

    return (
        <Link
            href={href}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-slate-200/80 px-3 py-3 transition hover:border-slate-300 hover:bg-slate-50"
        >
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {segment.startLabel || "Segmen"}
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-700">{segment.text}</div>
        </Link>
    );
}

function BulletSection({
    title,
    items,
    emptyText,
}: {
    title: string;
    items: string[];
    emptyText: string;
}) {
    return (
        <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {title}
            </div>
            {items.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                    {items.map((item) => (
                        <li key={item} className="rounded-xl border border-slate-200/80 px-3 py-2">
                            {item}
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="mt-2 text-sm text-slate-500">{emptyText}</div>
            )}
        </div>
    );
}

function StatusPill({ status }: { status: ContentAnalysisHistoryItem["status"] }) {
    const label = statusLabel(status);
    return (
        <div
            className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                status === "COMPLETED" && "bg-emerald-100 text-emerald-700",
                status === "FAILED" && "bg-rose-100 text-rose-700",
                (status === "PENDING" || status === "RUNNING") && "bg-amber-100 text-amber-700",
            )}
        >
            {label}
        </div>
    );
}

function StancePill({ stance }: { stance: ContentAnalysisStance }) {
    return (
        <div
            className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                stance === "SUPPORTIVE" && "bg-emerald-100 text-emerald-700",
                stance === "NEUTRAL" && "bg-slate-200 text-slate-700",
                stance === "CRITICAL" && "bg-rose-100 text-rose-700",
                stance === "MISINFORMED" && "bg-amber-100 text-amber-800",
                stance === "MIXED" && "bg-violet-100 text-violet-700",
                stance === "IRRELEVANT" && "bg-slate-100 text-slate-600",
            )}
        >
            {stanceLabel(stance)}
        </div>
    );
}

function platformLabel(platform: string) {
    if (platform === "INSTAGRAM") return "Instagram";
    if (platform === "TIKTOK") return "TikTok";
    if (platform === "TWITTER") return "X";
    if (platform === "THREADS") return "Threads";
    return "YouTube";
}

function statusLabel(status: string) {
    if (status === "PENDING") return "Menunggu";
    if (status === "RUNNING") return "Diproses";
    if (status === "COMPLETED") return "Selesai";
    return "Gagal";
}

function stanceLabel(stance: ContentAnalysisStance) {
    if (stance === "SUPPORTIVE") return "Mendukung";
    if (stance === "NEUTRAL") return "Netral";
    if (stance === "CRITICAL") return "Kritis";
    if (stance === "MISINFORMED") return "Salah tafsir";
    if (stance === "MIXED") return "Campuran";
    return "Tidak relevan";
}

function buildTimestampHref(sourceUrl: string, startMs: number | null, platform: string) {
    if (startMs == null) return sourceUrl;

    const seconds = Math.max(0, Math.floor(startMs / 1000));

    try {
        const url = new URL(sourceUrl);
        if (platform === "YOUTUBE") {
            url.searchParams.set("t", `${seconds}s`);
            return url.toString();
        }

        url.hash = `t=${seconds}s`;
        return url.toString();
    } catch {
        return sourceUrl;
    }
}

function formatDate(value: Date | string) {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}
