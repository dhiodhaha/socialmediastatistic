"use client";

import { PLATFORMS, type Platform } from "@repo/types";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/catalyst/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
    retryInfluencerAnalysis,
    retryInfluencerScrapePlatform,
    runInfluencerScrape,
} from "../actions/influencer.actions";
import { PLATFORM_LABELS } from "../lib/influencer-taxonomy";

export function InfluencerScrapeDialog({
    trigger,
    influencerOptions,
    initialSelectedIds,
}: {
    trigger: React.ReactNode;
    influencerOptions: Array<{ id: string; name: string }>;
    initialSelectedIds: string[];
}) {
    const [open, setOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
    const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
        "INSTAGRAM",
        "TIKTOK",
        "TWITTER",
    ]);
    const [loading, setLoading] = useState(false);

    const toggleId = (id: string) => {
        setSelectedIds((current) =>
            current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
        );
    };

    const togglePlatform = (platform: Platform) => {
        setSelectedPlatforms((current) =>
            current.includes(platform)
                ? current.filter((value) => value !== platform)
                : [...current, platform],
        );
    };

    const handleRun = async () => {
        if (selectedIds.length === 0) {
            toast.error("Select at least one influencer.");
            return;
        }

        if (selectedPlatforms.length === 0) {
            toast.error("Select at least one platform.");
            return;
        }

        setLoading(true);
        const result = await runInfluencerScrape({
            influencerIds: selectedIds,
            platforms: selectedPlatforms,
        });

        if (result.success) {
            toast.success("Scrape run started.");
            setOpen(false);
        } else {
            toast.error(result.error || "Failed to start scrape run.");
        }

        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Run influencer scrape</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-2 sm:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-3">
                        <div className="text-sm font-medium text-zinc-900 dark:text-white">
                            Influencers
                        </div>
                        <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-3">
                            {influencerOptions.map((option) => (
                                <label key={option.id} className="flex items-center gap-3 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(option.id)}
                                        onChange={() => toggleId(option.id)}
                                    />
                                    <span>{option.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="text-sm font-medium text-zinc-900 dark:text-white">
                            Platforms
                        </div>
                        <div className="space-y-2 rounded-md border p-3">
                            {PLATFORMS.map((platform) => (
                                <label key={platform} className="flex items-center gap-3 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedPlatforms.includes(platform)}
                                        onChange={() => togglePlatform(platform)}
                                    />
                                    <span>{PLATFORM_LABELS[platform]}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleRun} disabled={loading}>
                        {loading ? "Menjalankan..." : "Mulai scrape"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function RetryScrapeTargetButton({ targetId }: { targetId: string }) {
    const [loading, setLoading] = useState(false);

    return (
        <Button
            outline
            onClick={async () => {
                setLoading(true);
                const result = await retryInfluencerScrapePlatform({ scrapeTargetId: targetId });
                if (result.success) {
                    toast.success("Retry scrape started.");
                } else {
                    toast.error(result.error || "Failed to retry scrape.");
                }
                setLoading(false);
            }}
            disabled={loading}
        >
            {loading ? "Retrying..." : "Retry scrape"}
        </Button>
    );
}

export function RetryAnalysisButton({
    analysisId,
    postId,
}: {
    analysisId?: string;
    postId?: string;
}) {
    const [loading, setLoading] = useState(false);

    return (
        <Button
            outline
            onClick={async () => {
                setLoading(true);
                const result = await retryInfluencerAnalysis({
                    analysisId,
                    postIds: postId ? [postId] : undefined,
                });
                if (result.success) {
                    toast.success(`Queued ${result.data?.queued ?? 0} analysis item(s).`);
                } else {
                    toast.error(result.error || "Failed to retry analysis.");
                }
                setLoading(false);
            }}
            disabled={loading}
        >
            {loading ? "Retrying..." : "Retry analysis"}
        </Button>
    );
}
