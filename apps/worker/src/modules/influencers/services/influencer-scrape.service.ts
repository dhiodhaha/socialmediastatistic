import type { Influencer as InfluencerModel, Platform } from "@repo/database";
import { Prisma, prisma } from "@repo/database";
import type {
    RetryInfluencerAnalysisInput,
    RetryInfluencerScrapePlatformInput,
    RunInfluencerScrapeInput,
} from "@repo/types";
import { logger } from "../../../shared/lib/logger";
import type { ReconstructedContentItem } from "../../individual-reports/lib/content-reconstruction";
import {
    parseInstagramListing,
    parseInstagramReelsListing,
    parseTikTokListing,
    parseTwitterListing,
} from "../../individual-reports/services/scrapecreators-live";
import {
    analyzeInfluencerPosts,
    buildPostFingerprint,
    refreshInfluencerProfileAnalysis,
} from "./influencer-analysis.service";
import { deriveInfluencerSizeFromFollowers } from "./influencer-openai.service";

type ScrapedProfile = {
    profileUrl: string | null;
    displayName: string | null;
    bio: string | null;
    followers: number | null;
    following: number | null;
    totalPosts: number | null;
    verified: boolean | null;
    rawPayload: unknown;
};

type ScrapedPostInput = {
    platformPostId: string;
    threadId: string | null;
    url: string | null;
    caption: string | null;
    content: string | null;
    mediaType: string | null;
    thumbnailUrl: string | null;
    publishedAt: Date | null;
    rawPayload: unknown;
};

type PlatformScrapeResult = {
    profile: ScrapedProfile;
    posts: ScrapedPostInput[];
    rawPayload: unknown;
    creditsUsed: number;
};

const SCRAPECREATORS_BASE_URL = "https://api.scrapecreators.com";

export async function runInfluencerScrape(input: RunInfluencerScrapeInput) {
    const influencers = await prisma.influencer.findMany({
        where: {
            id: { in: input.influencerIds },
            isActive: true,
        },
        orderBy: { name: "asc" },
    });

    if (influencers.length === 0) {
        throw new Error("No active influencers found for this scrape run.");
    }

    const targets: Array<{
        influencerId: string;
        platform: Platform;
        handle: string;
        status: "PENDING" | "SKIPPED";
        error: string | null;
    }> = influencers.flatMap((influencer) =>
        input.platforms.map((platform) => {
            const handle = getInfluencerHandle(influencer, platform);

            return {
                influencerId: influencer.id,
                platform,
                handle: handle ?? "",
                status: handle ? "PENDING" : "SKIPPED",
                error: handle ? null : `No ${platform} handle configured for this influencer.`,
            };
        }),
    );

    if (targets.every((target) => target.status === "SKIPPED")) {
        throw new Error("Selected influencers do not have handles for the requested platforms.");
    }

    const run = await prisma.influencerScrapeRun.create({
        data: {
            requestedById: input.requestedById ?? null,
            status: "PENDING",
            requestedPlatforms: input.platforms,
            targets: {
                create: targets.map((target) => ({
                    influencer: { connect: { id: target.influencerId } },
                    platform: target.platform,
                    handle: target.handle,
                    status: target.status,
                    error: target.error,
                })),
            },
        },
        select: { id: true },
    });

    processInfluencerScrapeRun(run.id).catch((error) => {
        logger.error({ error, scrapeRunId: run.id }, "Influencer scrape run failed");
    });

    return { scrapeRunId: run.id };
}

export async function retryInfluencerScrapePlatform(input: RetryInfluencerScrapePlatformInput) {
    const target = await prisma.influencerScrapeTarget.findUnique({
        where: { id: input.scrapeTargetId },
        select: {
            influencerId: true,
            platform: true,
        },
    });

    if (!target) {
        throw new Error("Scrape target not found.");
    }

    return runInfluencerScrape({
        influencerIds: [target.influencerId],
        platforms: [target.platform],
        requestedById: input.requestedById,
    });
}

export async function retryInfluencerAnalysis(input: RetryInfluencerAnalysisInput) {
    let postIds = input.postIds ?? [];

    if (input.analysisId) {
        const analysis = await prisma.influencerPostAnalysis.findUnique({
            where: { id: input.analysisId },
            select: { postId: true },
        });

        if (!analysis) {
            throw new Error("Analysis record not found.");
        }

        postIds = [analysis.postId];
    }

    if (postIds.length === 0) {
        return { queued: 0 };
    }

    const queued = await analyzeInfluencerPosts(postIds);
    return { queued };
}

async function processInfluencerScrapeRun(scrapeRunId: string) {
    await prisma.influencerScrapeRun.update({
        where: { id: scrapeRunId },
        data: {
            status: "RUNNING",
            startedAt: new Date(),
            errorSummary: null,
        },
    });

    const targets = await prisma.influencerScrapeTarget.findMany({
        where: { scrapeRunId },
        include: {
            influencer: true,
        },
        orderBy: { createdAt: "asc" },
    });

    let creditsUsed = 0;
    let completedCount = 0;
    let failedCount = 0;
    const errorMessages: string[] = [];

    for (const target of targets) {
        if (target.status === "SKIPPED") {
            failedCount += 1;
            errorMessages.push(
                target.error ?? `Skipped ${target.platform} for ${target.influencer.name}`,
            );
            continue;
        }

        try {
            await prisma.influencerScrapeTarget.update({
                where: { id: target.id },
                data: {
                    status: "RUNNING",
                    error: null,
                },
            });

            const result = await scrapePlatform(target.platform, target.handle);
            creditsUsed += result.creditsUsed;

            if (result.profile.followers == null) {
                logger.warn(
                    {
                        platform: target.platform,
                        handle: target.handle,
                        influencerId: target.influencer.id,
                        rawProfileKeys: Object.keys(
                            (result.profile.rawPayload as Record<string, unknown>) ?? {},
                        ),
                        // Truncated dump so we can see the actual shape next time this fires.
                        rawProfileSample: JSON.stringify(result.profile.rawPayload).slice(0, 1500),
                    },
                    "Followers count missing from ScrapeCreators response — size will not be derived for this platform",
                );
            } else {
                logger.info(
                    {
                        platform: target.platform,
                        handle: target.handle,
                        influencerId: target.influencer.id,
                        followers: result.profile.followers,
                    },
                    "Scraped follower count",
                );
            }

            const changedPostIds = await persistScrapeResult({
                scrapeRunId,
                targetId: target.id,
                influencer: target.influencer,
                platform: target.platform,
                scrape: result,
            });

            await prisma.influencerScrapeTarget.update({
                where: { id: target.id },
                data: {
                    status: "COMPLETED",
                    creditsUsed: result.creditsUsed,
                    profileUrl: result.profile.profileUrl,
                    profileDisplayName: result.profile.displayName,
                    profileBio: result.profile.bio,
                    profileFollowers: result.profile.followers,
                    profileFollowing: result.profile.following,
                    profilePosts: result.profile.totalPosts,
                    profileVerified: result.profile.verified,
                    profilePayload: asJsonInput(result.profile.rawPayload),
                    rawPayload: asJsonInput(result.rawPayload),
                    scrapedAt: new Date(),
                },
            });

            completedCount += 1;

            // Analysis runs after target is COMPLETED. Failures here must not
            // overwrite the COMPLETED status — they are handled independently.
            try {
                await analyzeInfluencerPosts(changedPostIds);
                await refreshInfluencerProfileAnalysis(target.influencer.id);
            } catch (analysisError) {
                logger.warn(
                    { error: analysisError, influencerId: target.influencer.id },
                    "Post/profile analysis failed after successful scrape — scrape status kept as COMPLETED",
                );
            }
        } catch (error) {
            failedCount += 1;
            const message = error instanceof Error ? error.message : "Unknown scrape error";
            errorMessages.push(`${target.influencer.name} ${target.platform}: ${message}`);

            await prisma.influencerScrapeTarget.update({
                where: { id: target.id },
                data: {
                    status: "FAILED",
                    error: message,
                },
            });
        }
    }

    const status =
        completedCount > 0 && failedCount > 0
            ? "PARTIAL"
            : completedCount > 0
              ? "COMPLETED"
              : "FAILED";

    await prisma.influencerScrapeRun.update({
        where: { id: scrapeRunId },
        data: {
            status,
            creditsUsed,
            errorSummary: errorMessages.length > 0 ? errorMessages.join(" | ") : null,
            completedAt: new Date(),
        },
    });
}

async function persistScrapeResult(input: {
    scrapeRunId: string;
    targetId: string;
    influencer: InfluencerModel;
    platform: Platform;
    scrape: PlatformScrapeResult;
}) {
    const changedPostIds: string[] = [];

    for (const post of input.scrape.posts) {
        const contentFingerprint = buildPostFingerprint({
            platform: input.platform,
            platformPostId: post.platformPostId,
            caption: post.caption,
            content: post.content,
            publishedAt: post.publishedAt,
        });

        const existing = await prisma.influencerPost.findUnique({
            where: {
                platform_platformPostId: {
                    platform: input.platform,
                    platformPostId: post.platformPostId,
                },
            },
            select: {
                id: true,
                contentFingerprint: true,
            },
        });

        const persisted = existing
            ? await prisma.influencerPost.update({
                  where: { id: existing.id },
                  data: {
                      influencerId: input.influencer.id,
                      scrapeRunId: input.scrapeRunId,
                      scrapeTargetId: input.targetId,
                      threadId: post.threadId,
                      url: post.url,
                      caption: post.caption,
                      content: post.content,
                      mediaType: post.mediaType,
                      thumbnailUrl: post.thumbnailUrl,
                      publishedAt: post.publishedAt,
                      rawPayload: asJsonInput(post.rawPayload),
                      contentFingerprint,
                  },
              })
            : await prisma.influencerPost.create({
                  data: {
                      influencerId: input.influencer.id,
                      scrapeRunId: input.scrapeRunId,
                      scrapeTargetId: input.targetId,
                      platform: input.platform,
                      platformPostId: post.platformPostId,
                      threadId: post.threadId,
                      url: post.url,
                      caption: post.caption,
                      content: post.content,
                      mediaType: post.mediaType,
                      thumbnailUrl: post.thumbnailUrl,
                      publishedAt: post.publishedAt,
                      rawPayload: asJsonInput(post.rawPayload),
                      contentFingerprint,
                  },
              });

        if (!existing || existing.contentFingerprint !== contentFingerprint) {
            changedPostIds.push(persisted.id);
        }
    }

    const scrapedSize = deriveInfluencerSizeFromFollowers(input.scrape.profile.followers);

    await prisma.influencer.update({
        where: { id: input.influencer.id },
        data: {
            activePlatforms: uniquePlatforms([...input.influencer.activePlatforms, input.platform]),
            lastScrapedAt: new Date(),
            canonicalUrl:
                input.influencer.canonicalUrl ??
                input.scrape.profile.profileUrl ??
                input.influencer.canonicalUrl,
            displayAlias:
                input.influencer.displayAlias ??
                input.scrape.profile.displayName ??
                input.influencer.displayAlias,
            note: input.influencer.note ?? input.scrape.profile.bio ?? input.influencer.note,
            // Set size immediately from live follower count. refreshInfluencerProfileAnalysis
            // will later pick the highest across all platforms — this ensures size is never
            // stuck as null just because profile analysis failed or threw.
            ...(scrapedSize !== null ? { size: scrapedSize } : {}),
        },
    });

    return changedPostIds;
}

async function scrapePlatform(platform: Platform, handle: string): Promise<PlatformScrapeResult> {
    if (platform === "INSTAGRAM") {
        return scrapeInstagram(handle);
    }

    if (platform === "TIKTOK") {
        return scrapeTikTok(handle);
    }

    if (platform === "TWITTER") {
        return scrapeTwitter(handle);
    }

    if (platform === "THREADS") {
        return scrapeThreads(handle);
    }

    return scrapeYouTube(handle);
}

async function scrapeInstagram(handle: string): Promise<PlatformScrapeResult> {
    const cleanHandle = normalizeHandle(handle);
    const profileRaw = await scrapeCreatorsFetch(
        `/v1/instagram/profile?handle=${encodeURIComponent(cleanHandle)}`,
    );
    const profileRecord = asRecord(profileRaw);
    const user = asRecord(asRecord(profileRecord.data).user);

    let postsRaw: unknown;
    let parsedPosts: ReturnType<typeof parseInstagramListing>;

    try {
        postsRaw = await scrapeCreatorsFetch(
            `/v2/instagram/user/posts?handle=${encodeURIComponent(cleanHandle)}&trim=true`,
        );
        parsedPosts = parseInstagramListing(postsRaw);
    } catch {
        postsRaw = await scrapeCreatorsFetch(
            `/v1/instagram/user/reels?handle=${encodeURIComponent(cleanHandle)}&trim=true`,
        );
        parsedPosts = parseInstagramReelsListing(postsRaw);
    }

    return {
        profile: {
            profileUrl: `https://instagram.com/${cleanHandle}`,
            displayName: readString(user, ["full_name"]),
            bio: readString(user, ["biography"]),
            followers:
                readNumber(asRecord(user.edge_followed_by), ["count"]) ??
                readNumber(user, ["follower_count", "followers_count", "followers"]) ??
                findNumberDeep(profileRecord, FOLLOWER_KEYS),
            following:
                readNumber(asRecord(user.edge_follow), ["count"]) ??
                readNumber(user, ["following_count", "friends_count"]) ??
                findNumberDeep(profileRecord, FOLLOWING_KEYS),
            totalPosts:
                readNumber(asRecord(user.edge_owner_to_timeline_media), ["count"]) ??
                readNumber(user, ["media_count", "post_count"]) ??
                findNumberDeep(profileRecord, POST_COUNT_KEYS),
            verified: readBoolean(user, ["is_verified"]),
            rawPayload: profileRecord,
        },
        posts: parsedPosts.items.map((item) =>
            reconstructedItemToPost(item, platformThreadId(item)),
        ),
        rawPayload: { profileRaw, postsRaw },
        creditsUsed: 2,
    };
}

async function scrapeTikTok(handle: string): Promise<PlatformScrapeResult> {
    const cleanHandle = normalizeHandle(handle);
    const profileRaw = await scrapeCreatorsFetch(
        `/v1/tiktok/profile?handle=${encodeURIComponent(cleanHandle)}`,
    );
    const profileRecord = asRecord(profileRaw);
    const user = asRecord(profileRecord.user);
    const stats = asRecord(profileRecord.stats);
    const postsRaw = await scrapeCreatorsFetch(
        `/v3/tiktok/profile/videos?handle=${encodeURIComponent(cleanHandle)}&sort_by=latest&trim=true`,
    );
    const parsedPosts = parseTikTokListing(postsRaw);

    return {
        profile: {
            profileUrl: `https://www.tiktok.com/@${cleanHandle}`,
            displayName: readString(user, ["nickname"]),
            bio: readString(user, ["signature"]),
            followers:
                readNumber(stats, ["followerCount", "follower_count"]) ??
                findNumberDeep(profileRecord, FOLLOWER_KEYS),
            following:
                readNumber(stats, ["followingCount", "following_count"]) ??
                findNumberDeep(profileRecord, FOLLOWING_KEYS),
            totalPosts:
                readNumber(stats, ["videoCount", "video_count"]) ??
                findNumberDeep(profileRecord, POST_COUNT_KEYS),
            verified: readBoolean(user, ["verified"]),
            rawPayload: profileRecord,
        },
        posts: parsedPosts.items.map((item) => reconstructedItemToPost(item, null)),
        rawPayload: { profileRaw, postsRaw },
        creditsUsed: 2,
    };
}

async function scrapeTwitter(handle: string): Promise<PlatformScrapeResult> {
    const cleanHandle = normalizeHandle(handle);
    const profileRaw = await scrapeCreatorsFetch(
        `/v1/twitter/profile?handle=${encodeURIComponent(cleanHandle)}`,
    );
    const profileRecord = asRecord(profileRaw);
    const profile = extractTwitterProfile(profileRecord);
    const postsRaw = await scrapeCreatorsFetch(
        `/v1/twitter/user-tweets?handle=${encodeURIComponent(cleanHandle)}&trim=true`,
    );
    const parsedPosts = parseTwitterListing(postsRaw);

    return {
        profile: {
            profileUrl: `https://x.com/${cleanHandle}`,
            displayName: readString(profile, ["name"]),
            bio: readString(profile, ["description"]),
            followers:
                readNumber(profile, ["followers_count"]) ??
                readNumber(profile, ["normal_followers_count"]) ??
                findNumberDeep(profileRecord, FOLLOWER_KEYS),
            following:
                readNumber(profile, ["friends_count"]) ??
                findNumberDeep(profileRecord, FOLLOWING_KEYS),
            totalPosts:
                readNumber(profile, ["statuses_count"]) ??
                findNumberDeep(profileRecord, POST_COUNT_KEYS),
            verified: readBoolean(profile, ["is_blue_verified"]),
            rawPayload: profileRecord,
        },
        posts: parsedPosts.items.map((item) =>
            reconstructedItemToPost(item, extractThreadId(item.url ?? null)),
        ),
        rawPayload: { profileRaw, postsRaw },
        creditsUsed: 2,
    };
}

async function scrapeThreads(handle: string): Promise<PlatformScrapeResult> {
    const cleanHandle = normalizeHandle(handle);
    const profileRaw = await scrapeCreatorsFetch(
        `/v1/threads/profile?handle=${encodeURIComponent(cleanHandle)}`,
    );
    const profileRecord = asRecord(profileRaw);
    const postsRaw = await scrapeCreatorsFetch(
        `/v1/threads/user/posts?handle=${encodeURIComponent(cleanHandle)}&trim=true`,
    );
    const postsRecord = asRecord(postsRaw);
    const posts = asArray(postsRecord.posts).map((post) => {
        const entry = asRecord(post);
        const threadInfo = asRecord(entry.text_post_app_info);
        const caption =
            readString(threadInfo, ["text"]) ??
            readString(asRecord(entry.caption), ["text"]) ??
            readString(entry, ["caption"]);

        return {
            platformPostId: String(entry.pk ?? entry.id ?? crypto.randomUUID()),
            threadId:
                readString(entry, ["thread_id"]) ??
                readString(threadInfo, ["thread_id"]) ??
                String(entry.pk ?? entry.id ?? crypto.randomUUID()),
            url: readString(entry, ["url"]),
            caption,
            content: caption,
            mediaType: readString(entry, ["media_product_type"]) ?? "thread",
            thumbnailUrl: readString(entry, ["image_versions2"]),
            publishedAt: readDate(entry, ["taken_at"], true),
            rawPayload: entry,
        } satisfies ScrapedPostInput;
    });

    return {
        profile: {
            profileUrl: `https://www.threads.net/@${cleanHandle}`,
            displayName: readString(profileRecord, ["full_name"]),
            bio: readString(profileRecord, ["biography"]),
            followers:
                readNumber(profileRecord, ["follower_count"]) ??
                findNumberDeep(profileRecord, FOLLOWER_KEYS),
            following:
                readNumber(profileRecord, ["following_count"]) ??
                findNumberDeep(profileRecord, FOLLOWING_KEYS),
            totalPosts:
                readNumber(profileRecord, ["media_count"]) ??
                findNumberDeep(profileRecord, POST_COUNT_KEYS),
            verified: readBoolean(profileRecord, ["is_verified"]),
            rawPayload: profileRecord,
        },
        posts,
        rawPayload: { profileRaw, postsRaw },
        creditsUsed: 2,
    };
}

async function scrapeYouTube(handle: string): Promise<PlatformScrapeResult> {
    const cleanHandle = normalizeHandle(handle);
    const profileRaw = await scrapeCreatorsFetch(
        `/v1/youtube/channel?handle=${encodeURIComponent(cleanHandle)}`,
    );
    const profileRecord = asRecord(profileRaw);
    const postsRaw = await scrapeCreatorsFetch(
        `/v1/youtube/channel-videos?handle=${encodeURIComponent(cleanHandle)}&sort=latest&includeExtras=true`,
    );
    const postsRecord = asRecord(postsRaw);
    const posts = asArray(postsRecord.videos).map((video) => {
        const entry = asRecord(video);
        const title = readString(entry, ["title"]);
        const description = readString(entry, ["description"]);

        return {
            platformPostId: String(entry.id ?? crypto.randomUUID()),
            threadId: null,
            url: readString(entry, ["url"]),
            caption: title,
            content: [title, description].filter(Boolean).join("\n\n") || null,
            mediaType: readString(entry, ["type"]) ?? "video",
            thumbnailUrl: readString(asRecord(entry.thumbnail), ["url"]),
            publishedAt: readDate(entry, ["publishedTime"], false),
            rawPayload: entry,
        } satisfies ScrapedPostInput;
    });

    return {
        profile: {
            profileUrl:
                readString(profileRecord, ["channel"]) ??
                readString(profileRecord, ["url"]) ??
                `https://www.youtube.com/@${cleanHandle}`,
            displayName: readString(profileRecord, ["name"]),
            bio: readString(profileRecord, ["description"]),
            followers:
                readNumber(profileRecord, ["subscribers"]) ??
                readNumber(profileRecord, ["subscriberCount"]) ??
                findNumberDeep(profileRecord, FOLLOWER_KEYS),
            following: null,
            totalPosts:
                readNumber(profileRecord, ["videosCount"]) ??
                readNumber(profileRecord, ["videoCount"]) ??
                findNumberDeep(profileRecord, POST_COUNT_KEYS),
            verified: null,
            rawPayload: profileRecord,
        },
        posts,
        rawPayload: { profileRaw, postsRaw },
        creditsUsed: 2,
    };
}

function reconstructedItemToPost(item: ReconstructedContentItem, threadId: string | null) {
    const text = item.textExcerpt ?? null;

    return {
        platformPostId: item.id,
        threadId,
        url: item.url ?? null,
        caption: text,
        content: text,
        mediaType: item.mediaType ?? null,
        thumbnailUrl: item.thumbnailUrl ?? null,
        publishedAt: item.publishedAt,
        rawPayload: item,
    } satisfies ScrapedPostInput;
}

function platformThreadId(item: ReconstructedContentItem) {
    const url = item.url ?? "";

    if (url.includes("/reel/")) {
        return item.id;
    }

    return null;
}

function getInfluencerHandle(influencer: InfluencerModel, platform: Platform) {
    if (platform === "INSTAGRAM") return influencer.instagramHandle;
    if (platform === "TIKTOK") return influencer.tiktokHandle;
    if (platform === "TWITTER") return influencer.twitterHandle;
    if (platform === "THREADS") return influencer.threadsHandle;
    return influencer.youtubeHandle;
}

function normalizeHandle(handle: string) {
    return handle.trim().replace(/^@/, "");
}

function uniquePlatforms(platforms: Platform[]) {
    return Array.from(new Set(platforms));
}

async function scrapeCreatorsFetch(path: string) {
    const apiKey = process.env.SCRAPECREATORS_API_KEY;

    if (!apiKey) {
        throw new Error("SCRAPECREATORS_API_KEY is not configured.");
    }

    const response = await fetch(`${SCRAPECREATORS_BASE_URL}${path}`, {
        headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API_ERROR_${response.status}: ${text.slice(0, 180)}`);
    }

    return (await response.json()) as unknown;
}

function asRecord(value: unknown) {
    return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : ({} as Record<string, unknown>);
}

function asArray(value: unknown) {
    return Array.isArray(value) ? value : [];
}

function asJsonInput(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
    if (value === null || value === undefined) {
        return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
}

function readString(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = record[key];

        if (typeof value === "string" && value.trim().length > 0) {
            return value;
        }
    }

    return null;
}

function readNumber(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = record[key];

        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === "string" && value.trim().length > 0) {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }

    return null;
}

// Deep-walk helpers. ScrapeCreators API shapes drift between platforms and over time
// (Instagram switched between GraphQL `edge_followed_by.count` and flat `follower_count`,
// TikTok between `stats.followerCount` and `userInfo.stats.followerCount`, etc.).
// Rather than hard-coding every known path, we recursively search the response
// for any key that semantically represents follower count.
const FOLLOWER_KEYS = new Set([
    "followercount",
    "follower_count",
    "followerscount",
    "followers_count",
    "followers",
    "subscribercount",
    "subscriber_count",
    "subscribers",
    "fan_count",
    "fans",
]);
const FOLLOWING_KEYS = new Set([
    "followingcount",
    "following_count",
    "following",
    "friends_count",
    "friendscount",
]);
const POST_COUNT_KEYS = new Set([
    "mediacount",
    "media_count",
    "videocount",
    "video_count",
    "post_count",
    "postcount",
    "statuses_count",
    "videoscount",
    "videos_count",
]);

function findNumberDeep(value: unknown, keys: Set<string>, depth = 0): number | null {
    if (depth > 6 || value === null || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;

    // Direct keys (case-insensitive) first
    for (const [k, v] of Object.entries(record)) {
        if (!keys.has(k.toLowerCase())) continue;
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string" && v.trim().length > 0) {
            const n = Number(v);
            if (Number.isFinite(n)) return n;
        }
        // Instagram GraphQL: { edge_followed_by: { count: N } } — the matched
        // key holds an object whose .count is the number.
        if (v && typeof v === "object") {
            const inner = v as Record<string, unknown>;
            const count = inner.count;
            if (typeof count === "number" && Number.isFinite(count)) return count;
            if (typeof count === "string") {
                const n = Number(count);
                if (Number.isFinite(n)) return n;
            }
        }
    }

    // Recurse — but skip arrays of posts/comments (they pollute and slow down the walk).
    for (const v of Object.values(record)) {
        if (v && typeof v === "object" && !Array.isArray(v)) {
            const found = findNumberDeep(v, keys, depth + 1);
            if (found !== null) return found;
        }
    }

    return null;
}

function readBoolean(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = record[key];

        if (typeof value === "boolean") {
            return value;
        }
    }

    return null;
}

function readDate(record: Record<string, unknown>, keys: string[], unixSeconds: boolean) {
    for (const key of keys) {
        const value = record[key];

        if (typeof value === "number" && Number.isFinite(value)) {
            return new Date(unixSeconds ? value * 1000 : value);
        }

        if (typeof value === "string" && value.trim().length > 0) {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed;
            }
        }
    }

    return null;
}

function extractTwitterProfile(record: Record<string, unknown>) {
    // ScrapeCreators /v1/twitter/profile returns { legacy: { followers_count, ... } }
    // at the TOP LEVEL — same shape consumed by apps/worker/src/modules/scraping/services/parsers.ts.
    const directLegacy = asRecord(record.legacy);
    if (Object.keys(directLegacy).length > 0) {
        return directLegacy;
    }

    // Fallback to the older nested GraphQL shape if the API ever returns that variant.
    const user = asRecord(record.user);
    const result = asRecord(user.result);
    const nestedLegacy = asRecord(result.legacy);
    if (Object.keys(nestedLegacy).length > 0) {
        return nestedLegacy;
    }

    return result;
}

function extractThreadId(url: string | null) {
    if (!url) {
        return null;
    }

    const match = url.match(/status\/(\d+)/);
    return match?.[1] ?? null;
}
