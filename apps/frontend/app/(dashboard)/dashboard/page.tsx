import { prisma } from "@repo/database";
import { StatsCards } from "@/components/stats-cards";
import { RecentActivity } from "@/components/recent-activity";

async function getStats() {
    const [
        totalAccounts,
        activeAccounts,
        totalSnapshots,
        lastJob,
        platformCounts,
    ] = await Promise.all([
        prisma.account.count(),
        prisma.account.count({ where: { isActive: true } }),
        prisma.snapshot.count(),
        prisma.scrapingJob.findFirst({
            where: { status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
        }),
        prisma.account.groupBy({
            by: ["platform"],
            _count: { platform: true },
        }),
    ]);

    return {
        totalAccounts,
        activeAccounts,
        totalSnapshots,
        lastScrapeDate: lastJob?.completedAt || null,
        platformBreakdown: platformCounts.map((p) => ({
            platform: p.platform,
            count: p._count.platform,
        })),
    };
}

async function getRecentSnapshots() {
    return prisma.snapshot.findMany({
        take: 5,
        orderBy: { scrapedAt: "desc" },
        include: {
            account: {
                select: {
                    handle: true,
                    displayName: true,
                    platform: true,
                },
            },
        },
    });
}

export default async function DashboardPage() {
    const [stats, recentSnapshots] = await Promise.all([
        getStats(),
        getRecentSnapshots(),
    ]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
                <p className="text-slate-400 mt-1">
                    Monitor your social media accounts performance
                </p>
            </div>

            <StatsCards stats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentActivity snapshots={recentSnapshots} />

                {/* Platform Distribution */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        Platform Distribution
                    </h3>
                    <div className="space-y-4">
                        {stats.platformBreakdown.length > 0 ? (
                            stats.platformBreakdown.map((item) => (
                                <div key={item.platform} className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-medium text-slate-300">
                                                {item.platform}
                                            </span>
                                            <span className="text-sm text-slate-500">
                                                {item.count} accounts
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${item.platform === "INSTAGRAM"
                                                        ? "bg-gradient-to-r from-purple-500 to-pink-500"
                                                        : item.platform === "TIKTOK"
                                                            ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                                                            : "bg-gradient-to-r from-blue-400 to-blue-600"
                                                    }`}
                                                style={{
                                                    width: `${(item.count / stats.totalAccounts) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-center py-4">
                                No accounts added yet
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
