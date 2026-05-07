import { describe, expect, it } from "vitest";
import {
    combineNotes,
    normalizeCanonicalUrl,
    normalizeHandle,
    parseInfluencerSentiment,
    parseInfluencerSize,
    parsePlatformList,
    splitTopicTokens,
} from "./influencer-normalization";
import { influencerSchema } from "./influencer-schemas";

describe("influencer normalization", () => {
    it("normalizes platform handles from links and prefixed values", () => {
        expect(normalizeHandle("https://www.instagram.com/example.creator/")).toBe(
            "example.creator",
        );
        expect(normalizeHandle("https://tiktok.com/@example.creator")).toBe("example.creator");
        expect(normalizeHandle("https://x.com/example_creator")).toBe("example_creator");
        expect(normalizeHandle("https://threads.net/@example.creator")).toBe("example.creator");
        expect(normalizeHandle("https://youtube.com/@examplechannel")).toBe("examplechannel");
    });

    it("parses spreadsheet taxonomy fields deterministically", () => {
        expect(parseInfluencerSize("Micro Influencer")).toBe("MICRO");
        expect(parseInfluencerSentiment("Sentimen Campur")).toBe("MIXED");
        expect(splitTopicTokens("ASN, Edukasi / UMKM\nPolicy")).toEqual([
            "ASN",
            "Edukasi",
            "UMKM",
            "Policy",
        ]);
        expect(parsePlatformList("Instagram; TikTok / X & Threads, YouTube")).toEqual([
            "INSTAGRAM",
            "TIKTOK",
            "TWITTER",
            "THREADS",
            "YOUTUBE",
        ]);
        expect(parsePlatformList("Mixed public profile")).toEqual([]);
    });

    it("normalizes influencer form input into canonical schema output", () => {
        const parsed = influencerSchema.parse({
            name: " Example Creator ",
            canonicalUrl: "example.com/profile",
            instagramHandle: "https://instagram.com/example.creator/",
            tiktokHandle: "@example.creator",
            twitterHandle: "https://x.com/example_creator",
            threadsHandle: "https://threads.net/@example.creator",
            youtubeHandle: "https://youtube.com/@examplechannel",
            topics: ["Policy", "Policy", " Education "],
        });

        expect(parsed.name).toBe("Example Creator");
        expect(parsed.canonicalUrl).toBe("https://example.com/profile");
        expect(parsed.instagramHandle).toBe("example.creator");
        expect(parsed.tiktokHandle).toBe("example.creator");
        expect(parsed.twitterHandle).toBe("example_creator");
        expect(parsed.threadsHandle).toBe("example.creator");
        expect(parsed.youtubeHandle).toBe("examplechannel");
        expect(parsed.topics).toEqual(["Policy", "Education"]);
        expect(parsed.activePlatforms).toEqual([
            "INSTAGRAM",
            "TIKTOK",
            "TWITTER",
            "THREADS",
            "YOUTUBE",
        ]);
    });

    it("preserves only distinct note fragments and canonical urls", () => {
        expect(combineNotes("Existing note", "New note")).toBe("Existing note\n\nNew note");
        expect(combineNotes("Same note", "Same note")).toBe("Same note");
        expect(normalizeCanonicalUrl("example.go.id/profile")).toBe(
            "https://example.go.id/profile",
        );
    });
});
