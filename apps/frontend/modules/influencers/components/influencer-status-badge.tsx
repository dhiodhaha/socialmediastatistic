"use client";

import type {
    InfluencerAnalysisStatus,
    InfluencerScrapeRunStatus,
    InfluencerScrapeTargetStatus,
    InfluencerSentiment,
    Platform,
} from "@repo/types";
import { Badge } from "@/shared/components/catalyst/badge";
import {
    ANALYSIS_STATUS_LABELS,
    PLATFORM_LABELS,
    SENTIMENT_LABELS,
} from "../lib/influencer-taxonomy";

export function AnalysisStatusBadge({
    status,
}: {
    status: InfluencerAnalysisStatus | null | undefined;
}) {
    if (!status) {
        return <Badge color="zinc">Belum ada</Badge>;
    }

    const color =
        status === "COMPLETED"
            ? "green"
            : status === "FAILED"
              ? "red"
              : status === "UNAVAILABLE"
                ? "zinc"
                : "amber";

    return <Badge color={color}>{ANALYSIS_STATUS_LABELS[status]}</Badge>;
}

export function ScrapeStatusBadge({
    status,
}: {
    status:
        | InfluencerScrapeRunStatus
        | InfluencerScrapeTargetStatus
        | InfluencerAnalysisStatus
        | null
        | undefined;
}) {
    if (!status) {
        return <Badge color="zinc">Belum ada</Badge>;
    }

    const color =
        status === "COMPLETED"
            ? "green"
            : status === "FAILED"
              ? "red"
              : status === "PARTIAL"
                ? "amber"
                : status === "SKIPPED"
                  ? "zinc"
                  : status === "UNAVAILABLE"
                    ? "zinc"
                    : "amber";

    const label =
        status in ANALYSIS_STATUS_LABELS
            ? ANALYSIS_STATUS_LABELS[status as InfluencerAnalysisStatus]
            : status === "PARTIAL"
              ? "Parsial"
              : status === "SKIPPED"
                ? "Dilewati"
                : status === "COMPLETED"
                  ? "Selesai"
                  : status === "FAILED"
                    ? "Gagal"
                    : status === "RUNNING"
                      ? "Berjalan"
                      : "Menunggu";

    return <Badge color={color}>{label}</Badge>;
}

export function SentimentBadge({
    sentiment,
}: {
    sentiment: InfluencerSentiment | null | undefined;
}) {
    if (!sentiment) {
        return <Badge color="zinc">Belum dinilai</Badge>;
    }

    const color =
        sentiment === "POSITIVE"
            ? "green"
            : sentiment === "NEGATIVE"
              ? "red"
              : sentiment === "MIXED"
                ? "amber"
                : "zinc";

    return <Badge color={color}>{SENTIMENT_LABELS[sentiment]}</Badge>;
}

export function PlatformBadge({ platform }: { platform: Platform }) {
    const color =
        platform === "INSTAGRAM"
            ? "pink"
            : platform === "TIKTOK"
              ? "cyan"
              : platform === "TWITTER"
                ? "sky"
                : platform === "THREADS"
                  ? "violet"
                  : "red";

    return <Badge color={color}>{PLATFORM_LABELS[platform]}</Badge>;
}
