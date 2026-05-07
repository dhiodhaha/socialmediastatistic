import type {
    Platform,
    ResolvedInfluencerSource,
    ResolveInfluencerSourcesInput,
} from "@repo/types";

const SCRAPECREATORS_BASE_URL = "https://api.scrapecreators.com";

type ParsedSource = {
    input: string;
    platform: Platform | null;
    kind: "PROFILE" | "POST";
    value: string;
    valueType: "HANDLE" | "URL";
    sourceUrl: string | null;
};

export async function resolveInfluencerSources(
    input: ResolveInfluencerSourcesInput,
): Promise<ResolvedInfluencerSource[]> {
    return Promise.all(
        input.sources.map((source) => resolveInfluencerSource(source, input.defaultPlatform)),
    );
}

async function resolveInfluencerSource(
    source: string,
    defaultPlatform?: Platform,
): Promise<ResolvedInfluencerSource> {
    const parsed = parseSourceInput(source);

    const platform = parsed.platform ?? defaultPlatform ?? null;
    if (!platform) {
        return buildErrorResult(
            parsed,
            "Platform could not be detected. Paste a full profile/post URL or choose a default platform for bare handles.",
        );
    }

    if (!parsed.value.trim()) {
        return buildErrorResult(parsed, "Source did not contain a usable handle or URL.");
    }

    if (parsed.valueType === "HANDLE") {
        const handle = normalizeResolvedHandle(parsed.value);

        if (!handle) {
            return buildErrorResult(parsed, "Source did not contain a usable handle.");
        }

        return {
            input: parsed.input,
            platform,
            kind: parsed.kind,
            handle,
            canonicalUrl:
                parsed.kind === "PROFILE" && parsed.sourceUrl
                    ? parsed.sourceUrl
                    : buildProfileUrl(platform, handle),
            sourceUrl: parsed.sourceUrl,
            displayName: null,
            resolvedVia: parsed.platform ? "DIRECT" : "DEFAULT_PLATFORM",
            error: null,
        };
    }

    try {
        const resolved = await resolveOwnerFromPostUrl(platform, parsed.value);

        if (!resolved.handle) {
            return buildErrorResult(
                parsed,
                "The post URL was recognized but the owner handle could not be resolved.",
                platform,
            );
        }

        return {
            input: parsed.input,
            platform,
            kind: parsed.kind,
            handle: resolved.handle,
            canonicalUrl: resolved.canonicalUrl ?? buildProfileUrl(platform, resolved.handle),
            sourceUrl: parsed.sourceUrl,
            displayName: resolved.displayName,
            resolvedVia: "POST_ENDPOINT",
            error: null,
        };
    } catch (error) {
        return buildErrorResult(
            parsed,
            error instanceof Error ? error.message : "Failed to resolve source link.",
            platform,
        );
    }
}

function parseSourceInput(input: string): ParsedSource {
    const trimmed = input.trim();

    if (!trimmed) {
        return {
            input,
            platform: null,
            kind: "PROFILE",
            value: "",
            valueType: "HANDLE",
            sourceUrl: null,
        };
    }

    const url =
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://") ||
        trimmed.startsWith("www.")
            ? tryUrl(trimmed)
            : null;

    if (url) {
        const host = url.hostname
            .replace(/^www\./i, "")
            .replace(/^m\./i, "")
            .toLowerCase();
        const segments = url.pathname.split("/").filter(Boolean);
        const normalizedUrl = url.toString();

        if (host.includes("instagram.com")) {
            const firstSegment = segments[0]?.toLowerCase();
            if (firstSegment && ["p", "reel", "reels", "tv"].includes(firstSegment)) {
                return {
                    input,
                    platform: "INSTAGRAM",
                    kind: "POST",
                    value: normalizedUrl,
                    valueType: "URL",
                    sourceUrl: normalizedUrl,
                };
            }

            return {
                input,
                platform: "INSTAGRAM",
                kind: "PROFILE",
                value: segments[0]?.replace(/^@/, "") ?? "",
                valueType: "HANDLE",
                sourceUrl: normalizedUrl,
            };
        }

        if (host.includes("tiktok.com")) {
            if (host === "vt.tiktok.com" || host === "vm.tiktok.com") {
                return {
                    input,
                    platform: "TIKTOK",
                    kind: "POST",
                    value: normalizedUrl,
                    valueType: "URL",
                    sourceUrl: normalizedUrl,
                };
            }

            if (segments[0]?.toLowerCase() === "t") {
                return {
                    input,
                    platform: "TIKTOK",
                    kind: "POST",
                    value: normalizedUrl,
                    valueType: "URL",
                    sourceUrl: normalizedUrl,
                };
            }

            if (
                segments[0]?.startsWith("@") &&
                ["video", "photo"].includes(segments[1]?.toLowerCase() ?? "")
            ) {
                return {
                    input,
                    platform: "TIKTOK",
                    kind: "POST",
                    value: segments[0].slice(1),
                    valueType: "HANDLE",
                    sourceUrl: normalizedUrl,
                };
            }

            return {
                input,
                platform: "TIKTOK",
                kind: "PROFILE",
                value: segments[0]?.replace(/^@/, "") ?? "",
                valueType: "HANDLE",
                sourceUrl: normalizedUrl,
            };
        }

        if (host === "x.com" || host === "twitter.com" || host.endsWith(".x.com")) {
            return {
                input,
                platform: "TWITTER",
                kind: segments[1]?.toLowerCase() === "status" ? "POST" : "PROFILE",
                value: segments[0]?.replace(/^@/, "") ?? "",
                valueType: "HANDLE",
                sourceUrl: normalizedUrl,
            };
        }

        if (host.includes("threads.net") || host.includes("threads.com")) {
            return {
                input,
                platform: "THREADS",
                kind: segments[1]?.toLowerCase() === "post" ? "POST" : "PROFILE",
                value: segments[0]?.replace(/^@/, "") ?? "",
                valueType: "HANDLE",
                sourceUrl: normalizedUrl,
            };
        }

        if (host === "youtu.be") {
            return {
                input,
                platform: "YOUTUBE",
                kind: "POST",
                value: normalizedUrl,
                valueType: "URL",
                sourceUrl: normalizedUrl,
            };
        }

        if (host.includes("youtube.com")) {
            if (segments[0]?.startsWith("@")) {
                return {
                    input,
                    platform: "YOUTUBE",
                    kind: "PROFILE",
                    value: segments[0].slice(1),
                    valueType: "HANDLE",
                    sourceUrl: normalizedUrl,
                };
            }

            if (segments[0]?.toLowerCase() === "channel" && segments[1]) {
                return {
                    input,
                    platform: "YOUTUBE",
                    kind: "PROFILE",
                    value: segments[1],
                    valueType: "HANDLE",
                    sourceUrl: normalizedUrl,
                };
            }

            if (
                (segments[0]?.toLowerCase() === "c" || segments[0]?.toLowerCase() === "user") &&
                segments[1]
            ) {
                return {
                    input,
                    platform: "YOUTUBE",
                    kind: "PROFILE",
                    value: segments[1],
                    valueType: "HANDLE",
                    sourceUrl: normalizedUrl,
                };
            }

            if (
                segments[0]?.toLowerCase() === "shorts" ||
                segments[0]?.toLowerCase() === "watch" ||
                url.searchParams.has("v")
            ) {
                return {
                    input,
                    platform: "YOUTUBE",
                    kind: "POST",
                    value: normalizedUrl,
                    valueType: "URL",
                    sourceUrl: normalizedUrl,
                };
            }

            return {
                input,
                platform: "YOUTUBE",
                kind: "PROFILE",
                value: segments[0] ?? "",
                valueType: "HANDLE",
                sourceUrl: normalizedUrl,
            };
        }
    }

    return {
        input,
        platform: null,
        kind: "PROFILE",
        value: trimmed.replace(/^@/, ""),
        valueType: "HANDLE",
        sourceUrl: null,
    };
}

async function resolveOwnerFromPostUrl(
    platform: Platform,
    url: string,
): Promise<{
    handle: string | null;
    displayName: string | null;
    canonicalUrl: string | null;
}> {
    if (platform === "INSTAGRAM") {
        const data = await scrapeCreatorsFetch(`/v1/instagram/post?url=${encodeURIComponent(url)}`);
        const dataRecord = asRecord(data);
        const inner = asRecord(dataRecord.data);
        const media = recordWithFallback(inner, ["xdt_shortcode_media", "shortcode_media"], inner);
        const owner = asRecord(media.owner);
        const handle = normalizeResolvedHandle(readString(owner, ["username"]));

        return {
            handle,
            displayName: readString(owner, ["full_name", "name"]),
            canonicalUrl: handle ? buildProfileUrl(platform, handle) : null,
        };
    }

    if (platform === "TIKTOK") {
        const data = await scrapeCreatorsFetch(
            `/v2/tiktok/video?url=${encodeURIComponent(url)}&trim=true`,
        );
        const dataRecord = asRecord(data);
        const detail = recordWithFallback(
            dataRecord,
            ["aweme_detail"],
            asRecord(asRecord(dataRecord.data).aweme_detail),
        );
        const author = asRecord(detail.author);
        const handle = normalizeResolvedHandle(
            readString(detail, ["owner_handle"]) ??
                readString(author, ["unique_id", "uniqueId", "sec_uid"]),
        );

        return {
            handle,
            displayName:
                readString(detail, ["owner_nickname"]) ??
                readString(author, ["nickname", "display_name"]),
            canonicalUrl: handle ? buildProfileUrl(platform, handle) : null,
        };
    }

    if (platform === "TWITTER") {
        const data = await scrapeCreatorsFetch(
            `/v1/twitter/tweet?url=${encodeURIComponent(url)}&trim=true`,
        );
        const userLegacy = asRecord(asRecord(asRecord(asRecord(data).core).user_results).result);
        const legacy = asRecord(userLegacy.legacy);
        const handle = normalizeResolvedHandle(readString(legacy, ["screen_name"]));

        return {
            handle,
            displayName: readString(legacy, ["name"]),
            canonicalUrl: handle ? buildProfileUrl(platform, handle) : null,
        };
    }

    if (platform === "THREADS") {
        const data = await scrapeCreatorsFetch(
            `/v1/threads/post?url=${encodeURIComponent(url)}&trim=true`,
        );
        const post = asRecord(asRecord(data).post);
        const user = asRecord(post.user);
        const handle = normalizeResolvedHandle(readString(user, ["username"]));

        return {
            handle,
            displayName: readString(user, ["full_name", "fullName", "username"]),
            canonicalUrl: handle ? buildProfileUrl(platform, handle) : null,
        };
    }

    if (platform === "YOUTUBE") {
        const data = await scrapeCreatorsFetch(`/v1/youtube/video?url=${encodeURIComponent(url)}`);
        const channel = asRecord(asRecord(data).channel);
        const handle = normalizeResolvedHandle(
            readString(channel, ["handle"]) ?? readString(channel, ["id"]),
        );

        return {
            handle,
            displayName: readString(channel, ["title"]),
            canonicalUrl:
                readString(channel, ["url"]) ?? (handle ? buildProfileUrl(platform, handle) : null),
        };
    }

    throw new Error("This platform does not support post-owner resolution.");
}

async function scrapeCreatorsFetch(path: string) {
    const apiKey = process.env.SCRAPECREATORS_API_KEY;

    if (!apiKey) {
        throw new Error("SCRAPECREATORS_API_KEY is not configured.");
    }

    const response = await fetch(`${SCRAPECREATORS_BASE_URL}${path}`, {
        headers: {
            "x-api-key": apiKey,
        },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(
            `ScrapeCreators request failed (${response.status}): ${body.slice(0, 200)}`,
        );
    }

    return response.json();
}

function buildErrorResult(
    parsed: ParsedSource,
    error: string,
    platform: Platform | null = parsed.platform,
): ResolvedInfluencerSource {
    return {
        input: parsed.input,
        platform,
        kind: parsed.kind,
        handle: null,
        canonicalUrl: null,
        sourceUrl: parsed.sourceUrl,
        displayName: null,
        resolvedVia: parsed.platform ? "DIRECT" : "DEFAULT_PLATFORM",
        error,
    };
}

function buildProfileUrl(platform: Platform, handle: string) {
    if (platform === "INSTAGRAM") return `https://www.instagram.com/${handle}`;
    if (platform === "TIKTOK") return `https://www.tiktok.com/@${handle}`;
    if (platform === "TWITTER") return `https://x.com/${handle}`;
    if (platform === "THREADS") return `https://www.threads.net/@${handle}`;
    if (handle.startsWith("UC")) return `https://www.youtube.com/channel/${handle}`;
    return `https://www.youtube.com/@${handle}`;
}

function normalizeResolvedHandle(value: string | null) {
    const trimmed = value?.trim();

    if (!trimmed) {
        return null;
    }

    return trimmed.replace(/^@/, "").replace(/\/+$/, "") || null;
}

function tryUrl(value: string) {
    try {
        return new URL(
            value.startsWith("http://") || value.startsWith("https://")
                ? value
                : `https://${value}`,
        );
    } catch {
        return null;
    }
}

function asRecord(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = record[key];

        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

function recordWithFallback(
    record: Record<string, unknown>,
    keys: string[],
    fallback: Record<string, unknown>,
) {
    for (const key of keys) {
        const candidate = asRecord(record[key]);

        if (Object.keys(candidate).length > 0) {
            return candidate;
        }
    }

    return fallback;
}
