import { prisma } from "@repo/database";
import { ArrowRight, BarChart3, Database, FileSpreadsheet, Presentation } from "lucide-react";
import Link from "next/link";
import { ScrapeButton } from "@/modules/scraping/components/scrape-button";
import { DemoModeNotice } from "@/shared/components/demo-mode-notice";
import {
    HeroMetric,
    HeroMetricGrid,
    PageHero,
    Surface,
    SurfaceHeader,
    WorkspacePage,
} from "@/shared/components/ui/workspace";
import { isDemoMode } from "@/shared/lib/demo-mode";
import { cn } from "@/shared/lib/utils";

async function getStats() {
    const [
        totalAccounts,
        activeAccounts,
        totalSnapshots,
        lastJob,
        completedJobs,
        savedIndividualRuns,
        instagramCount,
        tiktokCount,
        twitterCount,
    ] = await Promise.all([
        prisma.account.count(),
        prisma.account.count({ where: { isActive: true } }),
        prisma.snapshot.count(),
        prisma.scrapingJob.findFirst({
            where: { status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
        }),
        prisma.scrapingJob.count({ where: { status: "COMPLETED" } }),
        prisma.individualReportRun.count(),
        prisma.account.count({ where: { instagram: { not: null } } }),
        prisma.account.count({ where: { tiktok: { not: null } } }),
        prisma.account.count({ where: { twitter: { not: null } } }),
    ]);

    const platformBreakdown = [
        { platform: "INSTAGRAM", count: instagramCount },
        { platform: "TIKTOK", count: tiktokCount },
        { platform: "TWITTER", count: twitterCount },
    ].filter((p) => p.count > 0);

    return {
        totalAccounts,
        activeAccounts,
        totalSnapshots,
        lastScrapeDate: lastJob?.completedAt || null,
        completedJobs,
        savedIndividualRuns,
        platformBreakdown,
    };
}

async function getRecentSnapshots() {
    return prisma.snapshot.findMany({
        take: 5,
        orderBy: { scrapedAt: "desc" },
        include: {
            account: {
                select: {
                    username: true,
                    instagram: true,
                    tiktok: true,
                    twitter: true,
                },
            },
        },
    });
}

export default async function DashboardPage() {
    const [stats, recentSnapshots] = await Promise.all([getStats(), getRecentSnapshots()]);
    const lastSnapshot = recentSnapshots[0] || null;
    const reportCards = [
        {
            title: "Laporan Bulanan",
            description: "Bandingkan dua snapshot bulanan dan siapkan PDF pertumbuhan.",
            href: "/reports",
            action: "Buka laporan bulanan",
            icon: FileSpreadsheet,
            tone: "blue",
            meta: stats.completedJobs > 0 ? `${stats.completedJobs} job selesai` : "Belum ada job",
        },
        {
            title: "Laporan Triwulan",
            description: "Susun laporan portofolio Jan-Mar, Apr-Jun, Jul-Sep, atau Okt-Des.",
            href: "/reports",
            action: "Buka laporan triwulan",
            icon: Presentation,
            tone: "emerald",
            meta: lastSnapshot
                ? `Data terbaru ${lastSnapshot.scrapedAt.toLocaleDateString("id-ID")}`
                : "Belum ada snapshot",
        },
        {
            title: "Laporan Individu",
            description: "Review satu akun lintas platform dengan data kuartal tersimpan.",
            href: "/individual-reports",
            action: "Buka laporan individu",
            icon: BarChart3,
            tone: "amber",
            meta:
                stats.savedIndividualRuns > 0
                    ? `${stats.savedIndividualRuns} run tersimpan`
                    : "Belum ada run tersimpan",
        },
        {
            title: "Data Scraping",
            description: "Lihat riwayat scrape, snapshot, dan sumber data yang tersedia.",
            href: "/history",
            action: "Buka data scraping",
            icon: Database,
            tone: "zinc",
            meta: `${stats.totalSnapshots} snapshot`,
        },
    ] as const;

    return (
        <WorkspacePage>
            <PageHero
                eyebrow="Workspace"
                title="Siapkan laporan lebih cepat dari satu workspace yang lebih terstruktur."
                description="Pilih alur kerja, cek kesiapan data, lalu lanjutkan ke PDF tanpa harus menebak panel mana yang penting terlebih dulu."
                actions={!isDemoMode ? <ScrapeButton /> : undefined}
            >
                <HeroMetricGrid>
                    <HeroMetric
                        label="Akun aktif"
                        value={stats.activeAccounts}
                        detail={`${stats.totalAccounts} akun terdaftar`}
                    />
                    <HeroMetric
                        label="Snapshot"
                        value={stats.totalSnapshots}
                        detail="Tersimpan di basis data"
                    />
                    <HeroMetric
                        label="Job selesai"
                        value={stats.completedJobs}
                        detail="Riwayat scraping berhasil"
                    />
                    <HeroMetric
                        label="Data terbaru"
                        value={
                            stats.lastScrapeDate
                                ? stats.lastScrapeDate.toLocaleDateString("id-ID", {
                                      day: "numeric",
                                      month: "short",
                                  })
                                : "Belum ada"
                        }
                        detail="Patokan pembaruan terakhir"
                    />
                </HeroMetricGrid>
            </PageHero>

            {isDemoMode && <DemoModeNotice />}

            <section className="@container">
                <div className="grid gap-4 @4xl:grid-cols-2">
                    {reportCards.map((card) => (
                        <ReportActionCard key={card.title} {...card} />
                    ))}
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Surface>
                    <SurfaceHeader
                        eyebrow="Readiness"
                        title="Kesiapan data"
                        description="Lihat cakupan tiap platform sebelum membuka laporan agar keputusan berikutnya lebih jelas."
                    />
                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <PlatformReadiness
                            label="Instagram"
                            count={
                                stats.platformBreakdown.find(
                                    (item) => item.platform === "INSTAGRAM",
                                )?.count ?? 0
                            }
                            total={stats.totalAccounts}
                            tone="pink"
                        />
                        <PlatformReadiness
                            label="TikTok"
                            count={
                                stats.platformBreakdown.find((item) => item.platform === "TIKTOK")
                                    ?.count ?? 0
                            }
                            total={stats.totalAccounts}
                            tone="slate"
                        />
                        <PlatformReadiness
                            label="Twitter / X"
                            count={
                                stats.platformBreakdown.find((item) => item.platform === "TWITTER")
                                    ?.count ?? 0
                            }
                            total={stats.totalAccounts}
                            tone="sky"
                        />
                    </div>
                </Surface>

                <Surface className="bg-slate-50 dark:bg-slate-950">
                    <SurfaceHeader
                        eyebrow="Aktivitas"
                        title="Snapshot terbaru"
                        description="Lima data terakhir yang masuk ke sistem."
                        actions={
                            <Link
                                href="/history"
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
                            >
                                Lihat riwayat
                                <ArrowRight className="size-4" />
                            </Link>
                        }
                    />
                    <div className="mt-5 space-y-3">
                        {recentSnapshots.length > 0 ? (
                            recentSnapshots.map((snapshot) => (
                                <RecentSnapshotRow key={snapshot.id} snapshot={snapshot} />
                            ))
                        ) : (
                            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                                Belum ada snapshot tersimpan.
                            </div>
                        )}
                    </div>
                </Surface>
            </section>
        </WorkspacePage>
    );
}

function ReportActionCard({
    title,
    description,
    href,
    action,
    icon: Icon,
    tone,
    meta,
}: {
    title: string;
    description: string;
    href: string;
    action: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: "blue" | "emerald" | "amber" | "zinc";
    meta: string;
}) {
    return (
        <Link
            href={href}
            className={cn(
                "group relative overflow-hidden rounded-[1.75rem] border p-6 shadow-[0_1px_0_rgba(15,23,42,0.04),0_14px_40px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,23,42,0.12)]",
                {
                    "border-blue-200/80 bg-[linear-gradient(180deg,_rgba(239,246,255,0.96),_rgba(255,255,255,0.98))] hover:border-blue-300 dark:border-blue-400/20 dark:bg-[linear-gradient(180deg,_rgba(8,47,73,0.52),_rgba(15,23,42,0.94))]":
                        tone === "blue",
                    "border-emerald-200/80 bg-[linear-gradient(180deg,_rgba(236,253,245,0.96),_rgba(255,255,255,0.98))] hover:border-emerald-300 dark:border-emerald-400/20 dark:bg-[linear-gradient(180deg,_rgba(6,78,59,0.45),_rgba(15,23,42,0.94))]":
                        tone === "emerald",
                    "border-amber-200/80 bg-[linear-gradient(180deg,_rgba(255,251,235,0.96),_rgba(255,255,255,0.98))] hover:border-amber-300 dark:border-amber-400/20 dark:bg-[linear-gradient(180deg,_rgba(120,53,15,0.35),_rgba(15,23,42,0.94))]":
                        tone === "amber",
                    "border-slate-200/80 bg-[linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(255,255,255,0.98))] hover:border-slate-300 dark:border-white/10 dark:bg-[linear-gradient(180deg,_rgba(30,41,59,0.82),_rgba(15,23,42,0.94))]":
                        tone === "zinc",
                },
            )}
        >
            <div className="absolute inset-x-0 top-0 h-px bg-white/70 dark:bg-white/10" />
            <div className="relative flex items-start justify-between gap-4">
                <div
                    className={cn("rounded-2xl p-3 ring-1", {
                        "bg-blue-600 text-white ring-blue-500/40": tone === "blue",
                        "bg-emerald-600 text-white ring-emerald-500/40": tone === "emerald",
                        "bg-amber-500 text-white ring-amber-400/50": tone === "amber",
                        "bg-slate-950 text-white ring-slate-500/20 dark:bg-white dark:text-slate-950":
                            tone === "zinc",
                    })}
                >
                    <Icon className="size-5" />
                </div>
                <ArrowRight className="size-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-950 dark:group-hover:text-white" />
            </div>
            <div className="relative mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    {meta}
                </p>
                <h2 className="mt-3 max-w-[12ch] text-3xl font-medium tracking-[-0.05em] text-slate-950 dark:text-white">
                    {title}
                </h2>
                <p className="mt-3 max-w-[48ch] text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {description}
                </p>
                <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                    {action}
                    <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </p>
            </div>
        </Link>
    );
}

function PlatformReadiness({
    label,
    count,
    total,
    tone,
}: {
    label: string;
    count: number;
    total: number;
    tone: "pink" | "slate" | "sky";
}) {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

    return (
        <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="relative flex items-center justify-between gap-3">
                <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                    {label}
                </div>
                <div className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
                    {count}/{total}
                </div>
            </div>
            <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div
                    className={cn("h-full rounded-full", {
                        "bg-pink-500": tone === "pink",
                        "bg-slate-900 dark:bg-slate-100": tone === "slate",
                        "bg-sky-500": tone === "sky",
                    })}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function RecentSnapshotRow({
    snapshot,
}: {
    snapshot: {
        id: string;
        followers: number;
        scrapedAt: Date;
        platform: string;
        account: {
            username: string;
            instagram: string | null;
            tiktok: string | null;
            twitter: string | null;
        };
    };
}) {
    const handle =
        snapshot.platform === "INSTAGRAM"
            ? snapshot.account.instagram
            : snapshot.platform === "TIKTOK"
              ? snapshot.account.tiktok
              : snapshot.account.twitter;

    return (
        <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {snapshot.account.username}
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                        {snapshot.platform} • @{handle ?? "N/A"}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums text-slate-950 dark:text-white">
                        {snapshot.followers.toLocaleString("id-ID")}
                    </div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        pengikut
                    </div>
                </div>
            </div>
        </div>
    );
}
