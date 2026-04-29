import { prisma } from "@repo/database";
import { ArrowRight, BarChart3, Database, FileSpreadsheet, Presentation } from "lucide-react";
import Link from "next/link";
import { ScrapeButton } from "@/modules/scraping/components/scrape-button";
import { DemoModeNotice } from "@/shared/components/demo-mode-notice";
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
            description: "Susun laporan portfolio Jan-Mar, Apr-Jun, Jul-Sep, atau Okt-Des.",
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
            title: "Data scraping",
            description: "Lihat riwayat scrape, snapshot, dan sumber data yang tersedia.",
            href: "/history",
            action: "Buka data scraping",
            icon: Database,
            tone: "zinc",
            meta: `${stats.totalSnapshots} snapshot`,
        },
    ] as const;

    return (
        <div className="space-y-10">
            <section className="overflow-hidden rounded-3xl border border-zinc-950/10 bg-linear-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-sm sm:p-8">
                <div className="grid gap-8 lg:grid-cols-[11fr_7fr] lg:items-end">
                    <div>
                        <p className="text-base/7 font-medium text-emerald-200 sm:text-sm/6">
                            Pusat laporan
                        </p>
                        <h1 className="mt-3 max-w-[14ch] text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                            Pilih laporan yang ingin disiapkan.
                        </h1>
                        <p className="mt-5 max-w-[64ch] text-base/7 text-slate-200 sm:text-sm/6">
                            Fokus utama aplikasi ini adalah membantu operator menyiapkan PDF laporan
                            dari data scraping yang sudah tersimpan.
                        </p>
                    </div>
                    <div className="rounded-2xl bg-white/8 p-5 ring-1 ring-white/15 backdrop-blur">
                        <div className="grid grid-cols-2 gap-4">
                            <ReadinessStat label="Akun aktif" value={stats.activeAccounts} />
                            <ReadinessStat label="Snapshot" value={stats.totalSnapshots} />
                            <ReadinessStat label="Job selesai" value={stats.completedJobs} />
                            <ReadinessStat
                                label="Data terbaru"
                                value={
                                    stats.lastScrapeDate
                                        ? stats.lastScrapeDate.toLocaleDateString("id-ID", {
                                              day: "numeric",
                                              month: "short",
                                          })
                                        : "Belum ada"
                                }
                            />
                        </div>
                    </div>
                </div>
            </section>

            {isDemoMode && <DemoModeNotice />}

            <section className="@container">
                <div className="grid gap-4 @3xl:grid-cols-2">
                    {reportCards.map((card) => (
                        <ReportActionCard key={card.title} {...card} />
                    ))}
                </div>
            </section>

            <section className="grid gap-8 lg:grid-cols-[7fr_5fr]">
                <div>
                    <div className="flex items-end justify-between gap-4 border-b border-zinc-950/10 pb-4">
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight text-zinc-950 text-balance dark:text-white">
                                Kesiapan data
                            </h2>
                            <p className="mt-1 text-base/7 text-zinc-600 sm:text-sm/6 dark:text-zinc-400">
                                Ringkasan cepat sebelum operator membuka laporan.
                            </p>
                        </div>
                        {!isDemoMode && <ScrapeButton />}
                    </div>
                    <div className="mt-6 grid gap-5 sm:grid-cols-3">
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
                </div>

                <div className="rounded-2xl bg-zinc-50 p-5 ring-1 ring-zinc-950/5 dark:bg-zinc-950 dark:ring-white/10">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight text-zinc-950 text-balance dark:text-white">
                                Aktivitas terbaru
                            </h2>
                            <p className="mt-1 text-base/7 text-zinc-600 sm:text-sm/6 dark:text-zinc-400">
                                Snapshot terakhir yang masuk ke database.
                            </p>
                        </div>
                        <Link
                            href="/history"
                            className="text-base/7 font-medium text-zinc-950 hover:text-emerald-700 sm:text-sm/6 dark:text-white"
                        >
                            Riwayat
                        </Link>
                    </div>
                    <div className="mt-5 space-y-3">
                        {recentSnapshots.length > 0 ? (
                            recentSnapshots.map((snapshot) => (
                                <RecentSnapshotRow key={snapshot.id} snapshot={snapshot} />
                            ))
                        ) : (
                            <div className="rounded-xl bg-white p-4 text-base/7 text-zinc-600 ring-1 ring-zinc-950/5 sm:text-sm/6 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-white/10">
                                Belum ada snapshot tersimpan.
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

function ReadinessStat({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <div className="truncate text-base/7 text-slate-300 sm:text-sm/6">{label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</div>
        </div>
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
                "group rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-sm",
                {
                    "border-blue-950/10 bg-blue-50/70 hover:bg-blue-50 dark:border-blue-400/20 dark:bg-blue-950/20":
                        tone === "blue",
                    "border-emerald-950/10 bg-emerald-50/70 hover:bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-950/20":
                        tone === "emerald",
                    "border-amber-950/10 bg-amber-50/70 hover:bg-amber-50 dark:border-amber-400/20 dark:bg-amber-950/20":
                        tone === "amber",
                    "border-zinc-950/10 bg-zinc-50 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-950":
                        tone === "zinc",
                },
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div
                    className={cn("rounded-xl p-3 ring-1", {
                        "bg-blue-600 text-white ring-blue-500": tone === "blue",
                        "bg-emerald-600 text-white ring-emerald-500": tone === "emerald",
                        "bg-amber-500 text-white ring-amber-400": tone === "amber",
                        "bg-zinc-900 text-white ring-zinc-700": tone === "zinc",
                    })}
                >
                    <Icon className="size-5" />
                </div>
                <ArrowRight className="size-5 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-950 dark:group-hover:text-white" />
            </div>
            <div className="mt-6">
                <p className="text-base/7 font-medium text-zinc-500 sm:text-sm/6">{meta}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 text-balance dark:text-white">
                    {title}
                </h2>
                <p className="mt-3 max-w-[48ch] text-base/7 text-zinc-600 sm:text-sm/6 dark:text-zinc-400">
                    {description}
                </p>
                <p className="mt-5 text-base/7 font-medium text-zinc-950 sm:text-sm/6 dark:text-white">
                    {action}
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
        <div className="border-t border-zinc-950/10 pt-4 dark:border-white/10">
            <div className="flex items-center justify-between gap-3">
                <div className="truncate text-base/7 font-medium text-zinc-950 sm:text-sm/6 dark:text-white">
                    {label}
                </div>
                <div className="text-base/7 text-zinc-500 tabular-nums sm:text-sm/6">
                    {count}/{total}
                </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-950/5 dark:bg-white/10">
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
        <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="truncate text-base/7 font-medium text-zinc-950 sm:text-sm/6 dark:text-white">
                        {snapshot.account.username}
                    </div>
                    <div className="mt-1 truncate text-base/7 text-zinc-500 sm:text-sm/6">
                        {snapshot.platform} • @{handle ?? "N/A"}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-base/7 font-semibold text-zinc-950 tabular-nums sm:text-sm/6 dark:text-white">
                        {snapshot.followers.toLocaleString("id-ID")}
                    </div>
                    <div className="mt-1 text-base/7 text-zinc-500 sm:text-sm/6">followers</div>
                </div>
            </div>
        </div>
    );
}
