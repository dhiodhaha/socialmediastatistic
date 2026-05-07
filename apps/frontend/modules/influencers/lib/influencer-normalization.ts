import type { InfluencerSentiment, InfluencerSize, Platform } from "@repo/types";

export function normalizeHandle(input: string | null | undefined) {
    if (!input) {
        return null;
    }

    const trimmed = input.trim();

    if (!trimmed) {
        return null;
    }

    const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
    const withoutDomain = withoutProtocol
        .replace(/^www\./i, "")
        .replace(/^instagram\.com\//i, "")
        .replace(/^tiktok\.com\/@/i, "")
        .replace(/^x\.com\//i, "")
        .replace(/^twitter\.com\//i, "")
        .replace(/^threads\.net\/@/i, "")
        .replace(/^threads\.com\/@/i, "")
        .replace(/^youtube\.com\/@/i, "")
        .replace(/^youtube\.com\/channel\//i, "")
        .replace(/^youtube\.com\//i, "")
        .replace(/^@/, "");

    return withoutDomain.replace(/\/+$/, "").trim() || null;
}

export function normalizeCanonicalUrl(input: string | null | undefined) {
    if (!input) {
        return null;
    }

    const trimmed = input.trim();

    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
    }

    if (trimmed.includes(".")) {
        return `https://${trimmed}`;
    }

    return trimmed;
}

export function splitTopicTokens(input: string | null | undefined) {
    if (!input) {
        return [];
    }

    return Array.from(
        new Set(
            input
                .split(/[,;/\n]+/)
                .map((value) => value.trim())
                .filter(Boolean),
        ),
    );
}

export function parseInfluencerSize(input: string | null | undefined): InfluencerSize | null {
    const value = input?.trim().toLowerCase();

    if (!value) {
        return null;
    }

    if (value.includes("nano")) return "NANO";
    if (value.includes("micro")) return "MICRO";
    if (value.includes("macro")) return "MACRO";
    if (value.includes("mega")) return "MEGA";

    return null;
}

export function parseInfluencerSentiment(
    input: string | null | undefined,
): InfluencerSentiment | null {
    const value = input?.trim().toLowerCase();

    if (!value) {
        return null;
    }

    if (value.includes("posit")) return "POSITIVE";
    if (value.includes("negat")) return "NEGATIVE";
    if (value.includes("campur") || value.includes("mix")) return "MIXED";
    if (value.includes("netral") || value.includes("neutral")) return "NEUTRAL";
    if (value.includes("unknown") || value.includes("belum")) return "UNKNOWN";

    return null;
}

export function parsePlatformList(input: string | null | undefined): Platform[] {
    if (!input) {
        return [];
    }

    const tokens = input
        .toLowerCase()
        .split(/[,;/|&()\n]+/)
        .flatMap((chunk) => chunk.trim().split(/\s+/))
        .map((value) => value.trim())
        .filter(Boolean);
    const platforms: Platform[] = [];

    if (tokens.includes("instagram")) platforms.push("INSTAGRAM");
    if (tokens.includes("tiktok")) platforms.push("TIKTOK");
    if (tokens.includes("twitter") || tokens.includes("x")) platforms.push("TWITTER");
    if (tokens.includes("threads")) platforms.push("THREADS");
    if (tokens.includes("youtube")) platforms.push("YOUTUBE");

    return Array.from(new Set(platforms));
}

export function deriveActivePlatforms(handles: Partial<Record<Platform, string | null>>) {
    const platforms = (Object.entries(handles) as Array<[Platform, string | null | undefined]>)
        .filter(([, handle]) => Boolean(handle))
        .map(([platform]) => platform);

    return Array.from(new Set(platforms));
}

export function combineNotes(
    existing: string | null | undefined,
    incoming: string | null | undefined,
) {
    const values = [existing?.trim(), incoming?.trim()].filter(Boolean);
    return values.length > 0 ? Array.from(new Set(values)).join("\n\n") : null;
}
