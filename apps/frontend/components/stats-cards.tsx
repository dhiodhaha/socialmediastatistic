interface StatsCardsProps {
    stats: {
        totalAccounts: number;
        activeAccounts: number;
        totalSnapshots: number;
        lastScrapeDate: Date | null;
        platformBreakdown: { platform: string; count: number }[];
    };
}

export function StatsCards({ stats }: StatsCardsProps) {
    const cards = [
        {
            title: "Total Accounts",
            value: stats.totalAccounts,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            gradient: "from-purple-500 to-purple-600",
            bgGradient: "from-purple-500/20 to-purple-600/10",
        },
        {
            title: "Active Accounts",
            value: stats.activeAccounts,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            gradient: "from-green-500 to-emerald-600",
            bgGradient: "from-green-500/20 to-emerald-600/10",
        },
        {
            title: "Total Snapshots",
            value: stats.totalSnapshots,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            gradient: "from-blue-500 to-cyan-600",
            bgGradient: "from-blue-500/20 to-cyan-600/10",
        },
        {
            title: "Last Scrape",
            value: stats.lastScrapeDate
                ? new Date(stats.lastScrapeDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                })
                : "Never",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            gradient: "from-orange-500 to-red-600",
            bgGradient: "from-orange-500/20 to-red-600/10",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
                <div
                    key={card.title}
                    className={`bg-gradient-to-br ${card.bgGradient} rounded-xl border border-slate-800 p-6 relative overflow-hidden`}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-slate-400">{card.title}</p>
                            <p className="text-3xl font-bold text-white mt-2">{card.value}</p>
                        </div>
                        <div
                            className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} text-white`}
                        >
                            {card.icon}
                        </div>
                    </div>
                    {/* Decorative blob */}
                    <div
                        className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 blur-xl`}
                    />
                </div>
            ))}
        </div>
    );
}
