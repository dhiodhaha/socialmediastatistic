import { describe, expect, it } from "vitest";
import {
    parseInstagramListing,
    parseTikTokListing,
    parseTwitterListing,
} from "./scrapecreators-live";

describe("ScrapeCreators live listing parsing", () => {
    it("parses Instagram post listings into reconstructed content items", () => {
        const result = parseInstagramListing({
            more_available: true,
            next_max_id: "next-page",
            items: [
                {
                    id: "ig-1",
                    code: "ABC123",
                    taken_at: 1_704_067_200,
                    caption: { text: "January policy update" },
                    like_count: 10,
                    comment_count: 2,
                    play_count: 100,
                },
            ],
        });

        expect(result).toMatchObject({
            hasMore: true,
            nextCursor: "next-page",
        });
        expect(result.items[0]).toMatchObject({
            id: "ig-1",
            url: "https://www.instagram.com/p/ABC123/",
            textExcerpt: "January policy update",
            metrics: {
                likes: 10,
                comments: 2,
                views: 100,
            },
        });
    });

    it("parses TikTok profile videos into reconstructed content items", () => {
        const result = parseTikTokListing({
            has_more: true,
            max_cursor: "1704067200",
            aweme_list: [
                {
                    aweme_id: "tt-1",
                    create_time: 1_704_067_200,
                    desc: "Quarter opening message",
                    statistics: {
                        digg_count: 30,
                        comment_count: 4,
                        play_count: 300,
                        share_count: 5,
                    },
                },
            ],
        });

        expect(result.nextCursor).toBe("1704067200");
        expect(result.items[0]).toMatchObject({
            id: "tt-1",
            textExcerpt: "Quarter opening message",
            metrics: {
                likes: 30,
                comments: 4,
                views: 300,
                shares: 5,
            },
        });
    });

    it("parses Twitter user tweets into reconstructed content items", () => {
        const result = parseTwitterListing({
            tweets: [
                {
                    rest_id: "tw-1",
                    url: "https://x.com/example/status/1",
                    views: { count: "400" },
                    legacy: {
                        created_at: "Mon Jan 01 10:00:00 +0000 2026",
                        full_text: "Quarter opening tweet",
                        favorite_count: 20,
                        reply_count: 3,
                        retweet_count: 2,
                        quote_count: 1,
                    },
                },
            ],
        });

        expect(result.hasMore).toBe(false);
        expect(result.items[0]).toMatchObject({
            id: "tw-1",
            url: "https://x.com/example/status/1",
            textExcerpt: "Quarter opening tweet",
            metrics: {
                likes: 20,
                comments: 3,
                views: 400,
                shares: 3,
            },
        });
    });
});
