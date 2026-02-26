import type { Platform } from "@repo/database";
import { logger } from "../../../shared/lib/logger";

export interface ScrapeCreatorsResponse {
    // Instagram
    data?: {
        user?: {
            edge_followed_by?: { count: number };
            edge_owner_to_timeline_media?: { count: number };
            edge_follow?: { count: number };
        };
    };

    // TikTok
    stats?: {
        followerCount?: number;
        followingCount?: number;
        videoCount?: number;
        heart?: number;
        heartCount?: number;
    };

    // Twitter
    legacy?: {
        followers_count?: number;
        friends_count?: number;
        statuses_count?: number;
    };
    id?: string;
}

export interface PlatformStats {
    followers: number;
    following: number;
    posts: number;
    engagement: number;
    likes: number; // Defaults to 0 for non-TikTok
}

export function parsePlatformData(
    platform: Platform,
    handle: string,
    data: ScrapeCreatorsResponse,
): PlatformStats {
    const stats: PlatformStats = {
        followers: 0,
        following: 0,
        posts: 0,
        engagement: 0,
        likes: 0,
    };

    if (platform === "INSTAGRAM") {
        const user = data.data?.user;
        if (!user) {
            logger.error({ platform, handle, data }, "Instagram user structure missing");
            throw new Error("Instagram user data not found");
        }
        stats.followers = user.edge_followed_by?.count || 0;
        stats.following = user.edge_follow?.count || 0;
        stats.posts = user.edge_owner_to_timeline_media?.count || 0;
    } else if (platform === "TIKTOK") {
        const s = data.stats;
        if (!s) {
            logger.error({ platform, handle, data }, "TikTok stats structure missing");
            throw new Error("TikTok stats not found");
        }
        stats.followers = s.followerCount || 0;
        stats.following = s.followingCount || 0;
        stats.posts = s.videoCount || 0;
        stats.likes = s.heart || s.heartCount || 0;
    } else if (platform === "TWITTER") {
        const legacy = data.legacy;
        if (!legacy) {
            logger.error({ platform, handle, data }, "Twitter legacy structure missing");
            throw new Error("Twitter legacy data not found");
        }
        stats.followers = legacy.followers_count || 0;
        stats.following = legacy.friends_count || 0;
        stats.posts = legacy.statuses_count || 0;
    }

    return stats;
}
