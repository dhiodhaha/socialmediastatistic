import { prisma } from "@repo/database";
import { StatsCards } from "@/modules/analytics/components/stats-cards";
import { RecentActivity } from "@/modules/analytics/components/recent-activity";
import { ScrapeButton } from "@/modules/scraping/components/scrape-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

async function getStats() {
    const [
        totalAccounts,
        activeAccounts,
        totalSnapshots,
        lastJob,
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
        prisma.account.count({ where: { instagram: { not: null } } }),
        prisma.account.count({ where: { tiktok: { not: null } } }),
        prisma.account.count({ where: { twitter: { not: null } } }),
    ]);

    const platformBreakdown = [
        { platform: "INSTAGRAM", count: instagramCount },
        { platform: "TIKTOK", count: tiktokCount },
        { platform: "TWITTER", count: twitterCount },
    ].filter(p => p.count > 0);

    return {
        totalAccounts,
        activeAccounts,
        totalSnapshots,
        lastScrapeDate: lastJob?.completedAt || null,
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
    const [stats, recentSnapshots] = await Promise.all([
        getStats(),
        getRecentSnapshots(),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard Overview</h1>
                    <p className="text-muted-foreground mt-1">
                        Monitor your social media accounts performance
                    </p>
                </div>
                <ScrapeButton />
            </div>

            <StatsCards stats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentActivity snapshots={recentSnapshots} />

                {/* Platform Distribution */}
                {/* Platform Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Platform Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.platformBreakdown.length > 0 ? (
                                stats.platformBreakdown.map((item) => (
                                    <div key={item.platform} className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-sm font-medium">
                                                    {item.platform}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {item.count} accounts
                                                </span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${{
                                                        INSTAGRAM: "bg-pink-500",
                                                        TIKTOK: "bg-slate-900 dark:bg-slate-50",
                                                        TWITTER: "bg-blue-500"
                                                    }[item.platform] || "bg-primary"
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
                                <p className="text-muted-foreground text-center py-4">
                                    No accounts added yet
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
