import type {
    ContentAnalysisSourceKind,
    ContentPreviewData,
    ContentPreviewThreadItem,
    ContentPreviewTranscriptSegment,
    Platform,
} from "@repo/types";

const SCRAPECREATORS_BASE_URL = "https://api.scrapecreators.com";

export interface ContentPreviewResolution {
    platform: Platform;
    sourceKind: ContentAnalysisSourceKind;
    creditsUsed: number;
    authorHandle: string | null;
    authorDisplayName: string | null;
    sourceTitle: string | null;
    publishedAt: Date | null;
    isThread: boolean;
    containsVideo: boolean;
    preview: ContentPreviewData;
}

export interface DetectedContentSource {
    platform: Platform;
    sourceKind: ContentAnalysisSourceKind;
    url: string;
}

type RichTweet = {
    id: string;
    url: string | null;
    text: string | null;
    publishedAt: Date | null;
    conversationId: string | null;
    authorHandle: string | null;
    authorDisplayName: string | null;
    metrics: ContentPreviewThreadItem["metrics"];
    containsVideo: boolean;
};

export function detectContentSource(input: string): DetectedContentSource {
    const normalized = normalizeSourceUrl(input);
    const url = new URL(normalized);
    const host = url.hostname
        .replace(/^www\./i, "")
        .replace(/^m\./i, "")
        .toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);

    if (host.includes("instagram.com")) {
        const first = segments[0]?.toLowerCase();
        if (first && ["p", "reel", "reels", "tv"].includes(first)) {
            return {
                platform: "INSTAGRAM",
                sourceKind: first === "p" ? "POST" : "VIDEO",
                url: url.toString(),
            };
        }
    }

    if (host.includes("tiktok.com") || host === "vt.tiktok.com" || host === "vm.tiktok.com") {
        return {
            platform: "TIKTOK",
            sourceKind: "VIDEO",
            url: url.toString(),
        };
    }

    if (host === "x.com" || host === "twitter.com" || host.endsWith(".x.com")) {
        if (segments[1]?.toLowerCase() === "status") {
            return {
                platform: "TWITTER",
                sourceKind: "POST",
                url: url.toString(),
            };
        }
    }

    if (host.includes("threads.net") || host.includes("threads.com")) {
        if (segments[1]?.toLowerCase() === "post") {
            return {
                platform: "THREADS",
                sourceKind: "POST",
                url: url.toString(),
            };
        }
    }

    if (host === "youtu.be" || host.includes("youtube.com")) {
        return {
            platform: "YOUTUBE",
            sourceKind: "VIDEO",
            url: url.toString(),
        };
    }

    throw new Error(
        "Link belum dikenali sebagai postingan Instagram, TikTok, X, Threads, atau YouTube.",
    );
}

export async function buildContentPreview(
    source: DetectedContentSource,
): Promise<ContentPreviewResolution> {
    if (source.platform === "INSTAGRAM") return buildInstagramPreview(source.url);
    if (source.platform === "TIKTOK") return buildTikTokPreview(source.url);
    if (source.platform === "TWITTER") return buildTwitterPreview(source.url);
    if (source.platform === "THREADS") return buildThreadsPreview(source.url);
    return buildYouTubePreview(source.url);
}

async function buildInstagramPreview(url: string): Promise<ContentPreviewResolution> {
    const raw = await scrapeCreatorsFetch(`/v1/instagram/post?url=${encodeURIComponent(url)}`);
    const record = asRecord(raw);
    const data = asRecord(record.data);
    const media = recordWithFallback(data, ["xdt_shortcode_media", "shortcode_media"], data);
    const owner = asRecord(media.owner);
    const caption = readString(firstEdgeNode(asRecord(media.edge_media_to_caption)), ["text"]);
    const publishedAt = readDate(media, ["taken_at_timestamp"], true);
    const isVideo =
        readBoolean(media, ["is_video"]) ||
        readNumber(media, ["media_type"]) === 2 ||
        readString(media, ["product_type"]) === "clips";
    const thumbnailUrl =
        normalizeExternalUrl(readString(media, ["display_url"])) ??
        normalizeExternalUrl(readString(media, ["thumbnail_src"]));

    let transcriptSegments: ContentPreviewTranscriptSegment[] = [];
    const platformNotes: string[] = [];
    let creditsUsed = 1;

    if (isVideo) {
        try {
            const transcriptRaw = await scrapeCreatorsFetch(
                `/v2/instagram/media/transcript?url=${encodeURIComponent(url)}`,
            );
            creditsUsed += 1;
            const transcripts = asArray(asRecord(transcriptRaw).transcripts);
            transcriptSegments = [];

            for (const [index, entry] of transcripts.entries()) {
                const item = asRecord(entry);
                const text = readString(item, ["text"]);
                if (!text) continue;

                transcriptSegments.push({
                    startMs: null,
                    endMs: null,
                    startLabel: `Bagian ${index + 1}`,
                    text,
                });
            }

            if (transcriptSegments.length > 0) {
                platformNotes.push(
                    "Transkrip Instagram tersedia, tetapi sumber API tidak memberikan cap waktu per potongan.",
                );
            }
        } catch (error) {
            platformNotes.push(
                error instanceof Error
                    ? `Transkrip Instagram tidak tersedia: ${error.message}`
                    : "Transkrip Instagram tidak tersedia.",
            );
        }
    }

    const preview = buildPreviewData({
        canonicalUrl: url,
        authorHandle: readString(owner, ["username"]),
        authorDisplayName: readString(owner, ["full_name", "name"]),
        title: null,
        caption,
        summaryText: caption,
        publishedAt,
        thumbnailUrl,
        isThread: false,
        containsVideo: isVideo,
        threadItems: [],
        transcriptSegments,
        platformNotes,
    });

    return {
        platform: "INSTAGRAM",
        sourceKind: isVideo ? "VIDEO" : "POST",
        creditsUsed,
        authorHandle: preview.authorHandle,
        authorDisplayName: preview.authorDisplayName,
        sourceTitle: null,
        publishedAt,
        isThread: false,
        containsVideo: isVideo,
        preview,
    };
}

async function buildTikTokPreview(url: string): Promise<ContentPreviewResolution> {
    const raw = await scrapeCreatorsFetch(
        `/v2/tiktok/video?url=${encodeURIComponent(url)}&trim=true`,
    );
    const record = asRecord(raw);
    const detail = recordWithFallback(
        record,
        ["aweme_detail"],
        asRecord(asRecord(record.data).aweme_detail),
    );
    const author = asRecord(detail.author);
    const caption = readString(detail, ["desc"]);
    const publishedAt = readDate(detail, ["create_time"], true);
    const thumbnailUrl = normalizeExternalUrl(extractTikTokThumbnail(detail));

    let transcriptSegments: ContentPreviewTranscriptSegment[] = [];
    const platformNotes: string[] = [];
    let creditsUsed = 1;

    try {
        const transcriptRaw = await scrapeCreatorsFetch(
            `/v1/tiktok/video/transcript?url=${encodeURIComponent(url)}`,
        );
        creditsUsed += 1;
        transcriptSegments = parseVttTranscript(
            readString(asRecord(transcriptRaw), ["transcript"]),
        );
    } catch (error) {
        platformNotes.push(
            error instanceof Error
                ? `Transkrip TikTok tidak tersedia: ${error.message}`
                : "Transkrip TikTok tidak tersedia.",
        );
    }

    const preview = buildPreviewData({
        canonicalUrl: url,
        authorHandle:
            readString(detail, ["owner_handle"]) ??
            readString(author, ["unique_id", "uniqueId", "sec_uid"]),
        authorDisplayName:
            readString(detail, ["owner_nickname"]) ??
            readString(author, ["nickname", "display_name"]),
        title: null,
        caption,
        summaryText: caption,
        publishedAt,
        thumbnailUrl,
        isThread: false,
        containsVideo: true,
        threadItems: [],
        transcriptSegments,
        platformNotes,
    });

    return {
        platform: "TIKTOK",
        sourceKind: "VIDEO",
        creditsUsed,
        authorHandle: preview.authorHandle,
        authorDisplayName: preview.authorDisplayName,
        sourceTitle: null,
        publishedAt,
        isThread: false,
        containsVideo: true,
        preview,
    };
}

async function buildTwitterPreview(url: string): Promise<ContentPreviewResolution> {
    const rootRaw = await scrapeCreatorsFetch(
        `/v1/twitter/tweet?url=${encodeURIComponent(url)}&trim=true`,
    );
    const rootTweet = extractRichTwitterTweets(rootRaw)[0];
    if (!rootTweet) {
        throw new Error("Tweet utama tidak dapat dibaca dari respons API.");
    }

    let creditsUsed = 1;
    const platformNotes: string[] = [];
    let transcriptSegments: ContentPreviewTranscriptSegment[] = [];
    const threadItems: ContentPreviewThreadItem[] = [];

    if (rootTweet.authorHandle && rootTweet.conversationId) {
        try {
            const timelineRaw = await scrapeCreatorsFetch(
                `/v1/twitter/user-tweets?handle=${encodeURIComponent(rootTweet.authorHandle)}&trim=true`,
            );
            creditsUsed += 1;
            const related = extractRichTwitterTweets(timelineRaw)
                .filter(
                    (item) =>
                        item.conversationId === rootTweet.conversationId &&
                        item.authorHandle?.toLowerCase() === rootTweet.authorHandle?.toLowerCase(),
                )
                .sort((left, right) => {
                    const leftTime = left.publishedAt?.getTime() ?? 0;
                    const rightTime = right.publishedAt?.getTime() ?? 0;
                    return leftTime - rightTime;
                });

            const merged = dedupeThreadItems([...related, rootTweet]);

            for (const item of merged) {
                threadItems.push({
                    id: item.id,
                    url: item.url,
                    text: item.text,
                    publishedAt: item.publishedAt?.toISOString() ?? null,
                    metrics: item.metrics,
                });
            }
        } catch (error) {
            platformNotes.push(
                error instanceof Error
                    ? `Thread X tidak bisa diperluas sepenuhnya: ${error.message}`
                    : "Thread X tidak bisa diperluas sepenuhnya.",
            );
        }
    }

    if (rootTweet.containsVideo) {
        try {
            const transcriptRaw = await scrapeCreatorsFetch(
                `/v1/twitter/tweet/transcript?url=${encodeURIComponent(url)}`,
            );
            creditsUsed += 1;
            const transcript = readString(asRecord(transcriptRaw), ["transcript"]);
            if (transcript) {
                transcriptSegments = [
                    {
                        startMs: null,
                        endMs: null,
                        startLabel: "Transkrip",
                        text: transcript,
                    },
                ];
                platformNotes.push(
                    "Transkrip X tersedia, tetapi sumber API tidak memberikan cap waktu per potongan.",
                );
            }
        } catch (error) {
            platformNotes.push(
                error instanceof Error
                    ? `Transkrip X tidak tersedia: ${error.message}`
                    : "Transkrip X tidak tersedia.",
            );
        }
    }

    const isThread = threadItems.length > 1;
    const preview = buildPreviewData({
        canonicalUrl: rootTweet.url ?? url,
        authorHandle: rootTweet.authorHandle,
        authorDisplayName: rootTweet.authorDisplayName,
        title: null,
        caption: rootTweet.text,
        summaryText: rootTweet.text,
        publishedAt: rootTweet.publishedAt,
        thumbnailUrl: null,
        isThread,
        containsVideo: rootTweet.containsVideo,
        threadItems: isThread
            ? threadItems
            : [
                  {
                      id: rootTweet.id,
                      url: rootTweet.url,
                      text: rootTweet.text,
                      publishedAt: rootTweet.publishedAt?.toISOString() ?? null,
                      metrics: rootTweet.metrics,
                  },
              ],
        transcriptSegments,
        platformNotes,
    });

    return {
        platform: "TWITTER",
        sourceKind: isThread ? "THREAD" : "POST",
        creditsUsed,
        authorHandle: preview.authorHandle,
        authorDisplayName: preview.authorDisplayName,
        sourceTitle: null,
        publishedAt: rootTweet.publishedAt,
        isThread,
        containsVideo: rootTweet.containsVideo,
        preview,
    };
}

async function buildThreadsPreview(url: string): Promise<ContentPreviewResolution> {
    const rootRaw = await scrapeCreatorsFetch(
        `/v1/threads/post?url=${encodeURIComponent(url)}&trim=true`,
    );
    const rootPost = asRecord(asRecord(rootRaw).post);
    const user = asRecord(rootPost.user);
    const rootText =
        readString(asRecord(rootPost.text_post_app_info), ["text"]) ??
        readString(asRecord(rootPost.caption), ["text"]) ??
        readString(rootPost, ["caption"]);
    const rootThreadId =
        readString(rootPost, ["thread_id"]) ??
        readString(asRecord(rootPost.text_post_app_info), ["thread_id"]);
    const authorHandle = readString(user, ["username"]);
    const publishedAt = readDate(rootPost, ["taken_at"], true);

    let creditsUsed = 1;
    const platformNotes: string[] = [];
    const threadItems: ContentPreviewThreadItem[] = [];
    const containsVideo = hasThreadsVideo(rootPost);

    if (authorHandle && rootThreadId) {
        try {
            const postsRaw = await scrapeCreatorsFetch(
                `/v1/threads/user/posts?handle=${encodeURIComponent(authorHandle)}&trim=true`,
            );
            creditsUsed += 1;
            const posts = asArray(asRecord(postsRaw).posts)
                .map((item) => asRecord(item))
                .filter((item) => {
                    const itemThreadId =
                        readString(item, ["thread_id"]) ??
                        readString(asRecord(item.text_post_app_info), ["thread_id"]);
                    return itemThreadId === rootThreadId;
                })
                .sort((left, right) => {
                    const leftTime = readDate(left, ["taken_at"], true)?.getTime() ?? 0;
                    const rightTime = readDate(right, ["taken_at"], true)?.getTime() ?? 0;
                    return leftTime - rightTime;
                });

            for (const item of posts) {
                const threadText =
                    readString(asRecord(item.text_post_app_info), ["text"]) ??
                    readString(asRecord(item.caption), ["text"]) ??
                    readString(item, ["caption"]);
                threadItems.push({
                    id: String(item.pk ?? item.id ?? crypto.randomUUID()),
                    url: readString(item, ["url"]),
                    text: threadText,
                    publishedAt: readDate(item, ["taken_at"], true)?.toISOString() ?? null,
                    metrics: {
                        likes: readNumber(item, ["like_count"]),
                        replies: readNumber(item, ["reply_count"]),
                        reposts: readNumber(item, ["repost_count"]),
                        views: readNumber(item, ["view_count"]),
                    },
                });
            }
        } catch (error) {
            platformNotes.push(
                error instanceof Error
                    ? `Thread Threads tidak bisa diperluas sepenuhnya: ${error.message}`
                    : "Thread Threads tidak bisa diperluas sepenuhnya.",
            );
        }
    }

    const isThread = threadItems.length > 1;
    const preview = buildPreviewData({
        canonicalUrl: readString(rootPost, ["url"]) ?? url,
        authorHandle,
        authorDisplayName: readString(user, ["full_name", "fullName", "username"]),
        title: null,
        caption: rootText,
        summaryText: rootText,
        publishedAt,
        thumbnailUrl: normalizeExternalUrl(readString(rootPost, ["thumbnail_url"])),
        isThread,
        containsVideo,
        threadItems: isThread
            ? threadItems
            : [
                  {
                      id: String(rootPost.pk ?? rootPost.id ?? crypto.randomUUID()),
                      url: readString(rootPost, ["url"]) ?? url,
                      text: rootText,
                      publishedAt: publishedAt?.toISOString() ?? null,
                      metrics: {
                          likes: readNumber(rootPost, ["like_count"]),
                          replies: readNumber(rootPost, ["reply_count"]),
                          reposts: readNumber(rootPost, ["repost_count"]),
                          views: readNumber(rootPost, ["view_count"]),
                      },
                  },
              ],
        transcriptSegments: [],
        platformNotes,
    });

    return {
        platform: "THREADS",
        sourceKind: isThread ? "THREAD" : "POST",
        creditsUsed,
        authorHandle,
        authorDisplayName: preview.authorDisplayName,
        sourceTitle: null,
        publishedAt,
        isThread,
        containsVideo,
        preview,
    };
}

async function buildYouTubePreview(url: string): Promise<ContentPreviewResolution> {
    const raw = await scrapeCreatorsFetch(`/v1/youtube/video?url=${encodeURIComponent(url)}`);
    const record = asRecord(raw);
    const channel = asRecord(record.channel);
    const transcriptSegments = asArray(record.transcript)
        .map((segment) => {
            const entry = asRecord(segment);
            const text = readString(entry, ["text"]);
            if (!text) return null;
            return {
                startMs: readNumber(entry, ["startMs"]),
                endMs: readNumber(entry, ["endMs"]),
                startLabel: readString(entry, ["startTimeText"]),
                text,
            } satisfies ContentPreviewTranscriptSegment;
        })
        .filter((segment): segment is ContentPreviewTranscriptSegment => Boolean(segment));

    const title = readString(record, ["title"]);
    const description = readString(record, ["description"]);
    const publishedAt = parseDateString(
        readString(record, ["publishDate"]) ?? readString(record, ["publishedTime"]),
    );

    const preview = buildPreviewData({
        canonicalUrl: readString(record, ["url"]) ?? url,
        authorHandle: readString(channel, ["handle", "id"]),
        authorDisplayName: readString(channel, ["title"]),
        title,
        caption: description,
        summaryText: [title, description].filter(Boolean).join("\n\n") || null,
        publishedAt,
        thumbnailUrl: normalizeExternalUrl(readString(record, ["thumbnail"])),
        isThread: false,
        containsVideo: true,
        threadItems: [],
        transcriptSegments,
        transcriptOnlyText: readString(record, ["transcript_only_text"]),
        platformNotes: [],
    });

    return {
        platform: "YOUTUBE",
        sourceKind: "VIDEO",
        creditsUsed: 1,
        authorHandle: preview.authorHandle,
        authorDisplayName: preview.authorDisplayName,
        sourceTitle: title,
        publishedAt,
        isThread: false,
        containsVideo: true,
        preview,
    };
}

function buildPreviewData(input: {
    canonicalUrl: string;
    authorHandle: string | null;
    authorDisplayName: string | null;
    title: string | null;
    caption: string | null;
    summaryText: string | null;
    publishedAt: Date | null;
    thumbnailUrl: string | null;
    isThread: boolean;
    containsVideo: boolean;
    threadItems: ContentPreviewThreadItem[];
    transcriptSegments: ContentPreviewTranscriptSegment[];
    transcriptOnlyText?: string | null;
    platformNotes: string[];
}): ContentPreviewData {
    const joinedTranscript = input.transcriptSegments
        .map((segment) => segment.text)
        .filter(Boolean)
        .join(" ")
        .trim();
    const transcriptOnlyText = input.transcriptOnlyText ?? (joinedTranscript || null);

    const rawTextForAnalysis = [
        input.title,
        input.caption,
        input.summaryText,
        input.threadItems
            .map((item) => item.text)
            .filter(Boolean)
            .join("\n\n"),
        transcriptOnlyText,
    ]
        .filter(Boolean)
        .join("\n\n")
        .trim();

    return {
        canonicalUrl: input.canonicalUrl,
        authorHandle: input.authorHandle,
        authorDisplayName: input.authorDisplayName,
        title: input.title,
        caption: input.caption,
        summaryText: input.summaryText,
        publishedAt: input.publishedAt?.toISOString() ?? null,
        thumbnailUrl: input.thumbnailUrl,
        isThread: input.isThread,
        containsVideo: input.containsVideo,
        threadItems: input.threadItems,
        transcriptSegments: input.transcriptSegments,
        transcriptOnlyText,
        rawTextForAnalysis,
        platformNotes: input.platformNotes,
    };
}

async function scrapeCreatorsFetch(path: string) {
    const apiKey = process.env.SCRAPECREATORS_API_KEY;

    if (!apiKey) {
        throw new Error("SCRAPECREATORS_API_KEY is not configured.");
    }

    const response = await fetch(`${SCRAPECREATORS_BASE_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
        },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(
            `ScrapeCreators request failed (${response.status}): ${body.slice(0, 200)}`,
        );
    }

    return (await response.json()) as unknown;
}

function normalizeSourceUrl(input: string) {
    const trimmed = input.trim();
    if (!trimmed) throw new Error("Link konten wajib diisi.");
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    if (trimmed.startsWith("www.")) return `https://${trimmed}`;
    throw new Error("Masukkan link postingan lengkap.");
}

function dedupeThreadItems(items: RichTweet[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
}

function extractRichTwitterTweets(data: unknown): RichTweet[] {
    const record = asRecord(data);
    const rawTweets = extractTwitterTweetCandidates(record);

    return rawTweets
        .map((item) => {
            const entry = asRecord(item);
            const legacy = asRecord(entry.legacy);
            const coreUser = asRecord(asRecord(asRecord(entry.core).user_results).result);
            const coreLegacy = asRecord(coreUser.legacy);
            const fallbackUser = asRecord(entry.user);
            const fallbackCore = asRecord(fallbackUser.core);
            const fallbackUserLegacy = asRecord(fallbackUser.legacy);
            const publishedRaw =
                readString(legacy, ["created_at"]) ??
                readString(entry, ["created_at"]) ??
                readString(entry, ["createdAt"]);
            const publishedAt = publishedRaw ? new Date(publishedRaw) : null;

            return {
                id: String(entry.rest_id ?? legacy.id_str ?? entry.id ?? crypto.randomUUID()),
                url:
                    readString(entry, ["url"]) ??
                    buildTwitterStatusUrl(
                        readString(coreLegacy, ["screen_name"]) ??
                            readString(fallbackCore, ["screen_name"]) ??
                            readString(fallbackUserLegacy, ["screen_name"]),
                        String(entry.rest_id ?? legacy.id_str ?? entry.id ?? ""),
                    ),
                text:
                    readString(legacy, ["full_text"]) ??
                    readString(legacy, ["text"]) ??
                    readString(entry, ["full_text"]) ??
                    readString(entry, ["text"]),
                publishedAt:
                    publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
                conversationId:
                    readString(legacy, ["conversation_id_str"]) ??
                    readString(entry, ["conversation_id_str"]) ??
                    readString(entry, ["conversationId"]),
                authorHandle:
                    readString(coreLegacy, ["screen_name"]) ??
                    readString(fallbackCore, ["screen_name"]) ??
                    readString(fallbackUserLegacy, ["screen_name"]),
                authorDisplayName:
                    readString(coreLegacy, ["name"]) ??
                    readString(fallbackCore, ["name"]) ??
                    readString(fallbackUserLegacy, ["name"]),
                metrics: {
                    likes: readNumber(legacy, ["favorite_count"]),
                    replies: readNumber(legacy, ["reply_count"]),
                    reposts: readNumber(legacy, ["retweet_count"]),
                    views: readNumber(asRecord(entry.views), ["count"]),
                },
                containsVideo: hasTwitterVideo(entry),
            } satisfies RichTweet;
        })
        .filter((item) => Boolean(item.id));
}

function extractTwitterTweetCandidates(record: Record<string, unknown>) {
    const directArrays = [
        asArray(record.tweets),
        asArray(record.data),
        asArray(record.items),
        asArray(record.results),
    ].find((items) => items.length > 0);

    if (directArrays) return directArrays;

    const candidates: unknown[] = [];
    collectTwitterCandidates(record, candidates, 0);
    return candidates;
}

function collectTwitterCandidates(value: unknown, candidates: unknown[], depth: number) {
    if (depth > 8 || !value || typeof value !== "object") return;

    if (Array.isArray(value)) {
        for (const item of value) collectTwitterCandidates(item, candidates, depth + 1);
        return;
    }

    const record = value as Record<string, unknown>;
    const legacy = asRecord(record.legacy);
    const looksLikeTweet =
        record.__typename === "Tweet" ||
        Boolean(record.tweet_results) ||
        Boolean(record.rest_id) ||
        Boolean(readString(legacy, ["full_text"])) ||
        Boolean(readString(legacy, ["created_at"]));

    if (looksLikeTweet) {
        const tweetResult = asRecord(record.tweet_results);
        const result = asRecord(tweetResult.result);
        candidates.push(Object.keys(result).length > 0 ? result : record);
    }

    for (const child of Object.values(record)) {
        collectTwitterCandidates(child, candidates, depth + 1);
    }
}

function hasTwitterVideo(entry: Record<string, unknown>) {
    const legacy = asRecord(entry.legacy);
    const media = [
        ...asArray(asRecord(legacy.extended_entities).media),
        ...asArray(asRecord(legacy.entities).media),
    ];

    return media.some((item) => {
        const record = asRecord(item);
        const type = readString(record, ["type"]);
        return type === "video" || type === "animated_gif";
    });
}

function hasThreadsVideo(post: Record<string, unknown>) {
    return (
        readString(post, ["media_product_type"])?.toLowerCase().includes("video") === true ||
        asArray(post.video_versions).length > 0
    );
}

function buildTwitterStatusUrl(handle: string | null, id: string) {
    return handle && id ? `https://x.com/${handle}/status/${id}` : null;
}

function parseVttTranscript(vtt: string | null) {
    if (!vtt) return [];

    const lines = vtt.replace(/\r/g, "").split("\n");
    const segments: ContentPreviewTranscriptSegment[] = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index]?.trim();

        if (!line || line === "WEBVTT") {
            index += 1;
            continue;
        }

        if (line.includes("-->")) {
            const [start, end] = line.split("-->").map((part) => part.trim());
            const textLines: string[] = [];
            index += 1;

            while (index < lines.length && lines[index]?.trim()) {
                if (lines[index]) {
                    textLines.push(lines[index].trim());
                }
                index += 1;
            }

            const text = textLines.join(" ").trim();
            if (text) {
                segments.push({
                    startMs: parseVttTimestamp(start),
                    endMs: parseVttTimestamp(end),
                    startLabel: formatVttTimestamp(start),
                    text,
                });
            }
        }

        index += 1;
    }

    return segments;
}

function parseVttTimestamp(value: string) {
    const match = value.match(/(?:(\d+):)?(\d+):(\d+)\.(\d+)/);
    if (!match) return null;

    const hours = Number(match[1] ?? 0);
    const minutes = Number(match[2] ?? 0);
    const seconds = Number(match[3] ?? 0);
    const milliseconds = Number(match[4] ?? 0);

    return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
}

function formatVttTimestamp(value: string) {
    const match = value.match(/(?:(\d+):)?(\d+):(\d+)\.(\d+)/);
    if (!match) return null;

    const hours = Number(match[1] ?? 0);
    const minutes = Number(match[2] ?? 0);
    const seconds = Number(match[3] ?? 0);

    return hours > 0
        ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function extractTikTokThumbnail(entry: Record<string, unknown>) {
    const video = asRecord(entry.video);
    const candidates: unknown[] = [
        video.cover,
        video.origin_cover,
        video.dynamic_cover,
        video.cover_thumb,
        video.cover_medium,
        video.cover_large,
    ];

    for (const candidate of candidates) {
        const normalized = normalizeTikTokThumbnailCandidate(candidate);
        if (normalized) return normalized;
    }

    return null;
}

function normalizeTikTokThumbnailCandidate(candidate: unknown) {
    if (typeof candidate === "string") return normalizeExternalUrl(candidate);

    const record = asRecord(candidate);
    const urlList = asArray(record.url_list);
    const urlFromList = urlList.find((value): value is string => typeof value === "string");
    if (urlFromList) return normalizeExternalUrl(urlFromList);

    return (
        normalizeExternalUrl(readString(record, ["url"])) ??
        normalizeExternalUrl(readString(record, ["uri"]))
    );
}

function normalizeExternalUrl(url: string | null) {
    if (!url) return null;
    const trimmed = url.trim().replaceAll("&amp;", "&");
    if (!trimmed) return null;
    if (trimmed.startsWith("//")) return `https:${trimmed}`;

    try {
        const parsed = new URL(trimmed);
        if (!["http:", "https:"].includes(parsed.protocol)) return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

function recordWithFallback(
    primary: Record<string, unknown>,
    path: string[],
    fallback: Record<string, unknown>,
) {
    const nested = asRecord(readPath(primary, path));
    return Object.keys(nested).length > 0 ? nested : fallback;
}

function firstEdgeNode(record: Record<string, unknown>) {
    const edges = asArray(record.edges);
    return asRecord(asRecord(edges[0]).node);
}

function readDate(record: Record<string, unknown>, path: string[], unixSeconds: boolean) {
    const value = readPath(record, path);
    if (typeof value === "number" && Number.isFinite(value)) {
        return new Date(unixSeconds ? value * 1000 : value);
    }

    if (typeof value === "string" && value.trim()) {
        if (unixSeconds && Number.isFinite(Number(value))) {
            return new Date(Number(value) * 1000);
        }

        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
}

function parseDateString(value: string | null) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readString(record: Record<string, unknown>, path: string[]) {
    const value = readPath(record, path);
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
    return null;
}

function readNumber(record: Record<string, unknown>, path: string[]) {
    const value = readPath(record, path);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
        return Number(value);
    }
    return null;
}

function readBoolean(record: Record<string, unknown>, path: string[]) {
    const value = readPath(record, path);
    return typeof value === "boolean" ? value : null;
}

function readPath(record: Record<string, unknown>, path: string[]) {
    let current: unknown = record;
    for (const key of path) {
        if (!current || typeof current !== "object") return null;
        current = (current as Record<string, unknown>)[key];
    }
    return current;
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}
