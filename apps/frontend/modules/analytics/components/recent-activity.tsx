import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface RecentActivityProps {
    snapshots: Array<{
        id: string;
        followers: number;
        scrapedAt: Date;
        platform: string; // From Snapshot model
        account: {
            username: string;
            instagram: string | null;
            tiktok: string | null;
            twitter: string | null;
        };
    }>;
}

export function RecentActivity({ snapshots }: RecentActivityProps) {
    const getHandle = (s: RecentActivityProps['snapshots'][0]) => {
        if (s.platform === "INSTAGRAM") return s.account.instagram;
        if (s.platform === "TIKTOK") return s.account.tiktok;
        if (s.platform === "TWITTER") return s.account.twitter;
        return null;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {snapshots.length > 0 ? (
                        snapshots.map((snapshot) => {
                            const handle = getHandle(snapshot) || "N/A";
                            return (
                                <div
                                    key={snapshot.id}
                                    className="flex items-center gap-4 p-3 rounded-md border bg-muted/50"
                                >
                                    <div
                                        className="w-10 h-10 rounded-md bg-background border flex items-center justify-center text-xs font-bold text-muted-foreground"
                                    >
                                        {snapshot.platform.slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            @{handle}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {snapshot.account.username}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">
                                            {snapshot.followers.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-muted-foreground">followers</p>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground mb-1">No recent activity</p>
                            <p className="text-xs text-muted-foreground">
                                Start a scraping job to see results here
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
