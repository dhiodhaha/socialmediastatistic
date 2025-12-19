interface RecentActivityProps {
    snapshots: Array<{
        id: string;
        followers: number;
        scrapedAt: Date;
        account: {
            handle: string;
            displayName: string;
            platform: string;
        };
    }>;
}

export function RecentActivity({ snapshots }: RecentActivityProps) {
    const platformColors = {
        INSTAGRAM: "bg-gradient-to-r from-purple-500 to-pink-500",
        TIKTOK: "bg-gradient-to-r from-cyan-500 to-blue-500",
        TWITTER: "bg-gradient-to-r from-blue-400 to-blue-600",
    } as const;

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-4">
                {snapshots.length > 0 ? (
                    snapshots.map((snapshot) => (
                        <div
                            key={snapshot.id}
                            className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                        >
                            <div
                                className={`w-10 h-10 rounded-lg ${platformColors[snapshot.account.platform as keyof typeof platformColors]
                                    } flex items-center justify-center text-white text-xs font-bold`}
                            >
                                {snapshot.account.platform.slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    @{snapshot.account.handle}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    {snapshot.account.displayName}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold text-white">
                                    {snapshot.followers.toLocaleString()}
                                </p>
                                <p className="text-xs text-slate-500">followers</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8">
                        <svg
                            className="w-12 h-12 text-slate-600 mx-auto mb-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                        </svg>
                        <p className="text-slate-500">No recent activity</p>
                        <p className="text-sm text-slate-600 mt-1">
                            Start a scraping job to see results here
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
