import { INFLUENCER_SENTIMENTS, INFLUENCER_SIZES, type Platform } from "@repo/types";
import { z } from "zod";
import {
    deriveActivePlatforms,
    normalizeCanonicalUrl,
    normalizeHandle,
} from "./influencer-normalization";

const optionalText = z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" ? value.trim() : null))
    .transform((value) => (value && value.length > 0 ? value : null));

export const influencerSchema = z
    .object({
        name: z.string().trim().min(1, "Nama influencer wajib diisi"),
        displayAlias: optionalText,
        note: optionalText,
        size: z.enum(INFLUENCER_SIZES).nullable().optional().default(null),
        professionInstitution: optionalText,
        profileSentiment: z.enum(INFLUENCER_SENTIMENTS).nullable().optional().default(null),
        canonicalUrl: optionalText,
        instagramHandle: optionalText,
        tiktokHandle: optionalText,
        twitterHandle: optionalText,
        threadsHandle: optionalText,
        youtubeHandle: optionalText,
        topics: z.array(z.string().trim().min(1)).default([]),
        isActive: z.boolean().default(true),
    })
    .transform((input) => {
        const handles: Partial<Record<Platform, string | null>> = {
            INSTAGRAM: normalizeHandle(input.instagramHandle),
            TIKTOK: normalizeHandle(input.tiktokHandle),
            TWITTER: normalizeHandle(input.twitterHandle),
            THREADS: normalizeHandle(input.threadsHandle),
            YOUTUBE: normalizeHandle(input.youtubeHandle),
        };

        return {
            ...input,
            canonicalUrl: normalizeCanonicalUrl(input.canonicalUrl),
            instagramHandle: handles.INSTAGRAM,
            tiktokHandle: handles.TIKTOK,
            twitterHandle: handles.TWITTER,
            threadsHandle: handles.THREADS,
            youtubeHandle: handles.YOUTUBE,
            topics: Array.from(new Set(input.topics.map((topic) => topic.trim()).filter(Boolean))),
            activePlatforms: deriveActivePlatforms(handles),
        };
    });

export type InfluencerInput = z.output<typeof influencerSchema>;
export type InfluencerFormInput = z.input<typeof influencerSchema>;
