import { createHash } from "node:crypto";
import { type InfluencerSentiment, type Platform, prisma } from "@repo/database";
import { logger } from "../../../shared/lib/logger";
import {
    analyzeInfluencerProfileWithOpenAI,
    deriveInfluencerSizeFromFollowers,
} from "./influencer-openai.service";

const CONTROLLED_TOPICS = [
    { topic: "Anggaran", keywords: ["budget", "anggaran", "apbn"] },
    { topic: "Pajak", keywords: ["tax", "pajak"] },
    { topic: "Ekonomi", keywords: ["economy", "ekonomi", "growth", "inflasi"] },
    { topic: "UMKM", keywords: ["umkm", "small business", "wirausaha"] },
    { topic: "Pendidikan", keywords: ["education", "pendidikan", "sekolah", "kampus"] },
    { topic: "Kesehatan", keywords: ["health", "kesehatan", "rumah sakit", "obat"] },
    { topic: "Lingkungan", keywords: ["climate", "iklim", "lingkungan", "sampah"] },
    { topic: "Infrastruktur", keywords: ["jalan", "transport", "infrastruktur", "pelabuhan"] },
    { topic: "Politik", keywords: ["politik", "election", "campaign", "parlemen"] },
    { topic: "Teknologi", keywords: ["tech", "teknologi", "digital", "ai", "startup"] },
] as const;

const POSITIVE_KEYWORDS = [
    "baik",
    "bagus",
    "support",
    "dukung",
    "maju",
    "positif",
    "apresiasi",
    "great",
    "improve",
];
const NEGATIVE_KEYWORDS = [
    "buruk",
    "jelek",
    "kritik",
    "gagal",
    "marah",
    "negative",
    "poor",
    "worse",
    "skandal",
];

export function buildPostFingerprint(input: {
    platform: Platform;
    platformPostId: string;
    caption?: string | null;
    content?: string | null;
    publishedAt?: Date | null;
}) {
    return createHash("sha256")
        .update(
            [
                input.platform,
                input.platformPostId,
                input.caption ?? "",
                input.content ?? "",
                input.publishedAt?.toISOString() ?? "",
            ].join("::"),
        )
        .digest("hex");
}

export async function analyzeInfluencerPosts(postIds: string[]) {
    const touchedInfluencers = new Set(
        (
            await prisma.influencerPost.findMany({
                where: {
                    id: { in: postIds },
                },
                select: {
                    influencerId: true,
                },
            })
        ).map((post) => post.influencerId),
    );

    for (const influencerId of touchedInfluencers) {
        await refreshInfluencerProfileAnalysis(influencerId);
    }

    return touchedInfluencers.size;
}

export async function refreshInfluencerProfileAnalysis(influencerId: string) {
    try {
        return await _refreshInfluencerProfileAnalysis(influencerId);
    } catch (error) {
        logger.error({ error, influencerId }, "refreshInfluencerProfileAnalysis failed");
    }
}

async function _refreshInfluencerProfileAnalysis(influencerId: string) {
    const influencer = await prisma.influencer.findUnique({
        where: { id: influencerId },
        include: {
            scrapeTargets: {
                where: { status: "COMPLETED" },
                orderBy: [{ scrapedAt: "desc" }, { updatedAt: "desc" }],
                take: 5,
            },
            posts: {
                orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
                take: 10,
                include: {
                    analyses: {
                        orderBy: { analyzedAt: "desc" },
                        take: 1,
                    },
                },
            },
        },
    });

    if (!influencer) {
        return;
    }

    const topicCounts = new Map<string, number>();
    const sentimentCounts = new Map<InfluencerSentiment, number>();
    const fragments: string[] = [];
    const postEvidence: string[] = [];

    if (influencer.note) {
        fragments.push(influencer.note);
    }

    for (const target of influencer.scrapeTargets) {
        if (target.profileDisplayName) {
            fragments.push(target.profileDisplayName);
        }

        if (target.profileBio) {
            fragments.push(target.profileBio);
        }
    }

    for (const post of influencer.posts) {
        const summary = [post.caption, post.content].filter(Boolean).join("\n\n").trim() || null;

        if (summary) {
            fragments.push(summary);
            postEvidence.push(summary);
        }

        const inferredSentiment = summary ? inferSentiment(summary) : null;
        if (inferredSentiment) {
            sentimentCounts.set(
                inferredSentiment,
                (sentimentCounts.get(inferredSentiment) ?? 0) + 1,
            );
        }

        for (const topic of summary ? inferTopics(summary) : []) {
            topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
        }
    }

    const topTopics = Array.from(topicCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([topic]) => topic);

    const dominantSentiment =
        Array.from(sentimentCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "UNKNOWN";

    const heuristicTopicSummary = topTopics.length > 0 ? topTopics.join(", ") : null;
    const heuristicProfileSummary =
        fragments.length > 0 ? summarizeText(fragments.join(" "), 320) : null;
    const aiProfile = await analyzeInfluencerProfileWithOpenAI({
        influencerName: influencer.name,
        displayAlias: influencer.displayAlias,
        note: influencer.note,
        handles: {
            INSTAGRAM: influencer.instagramHandle,
            TIKTOK: influencer.tiktokHandle,
            TWITTER: influencer.twitterHandle,
            THREADS: influencer.threadsHandle,
            YOUTUBE: influencer.youtubeHandle,
        },
        recentProfiles: influencer.scrapeTargets.map((target) => ({
            platform: target.platform,
            displayName: target.profileDisplayName,
            bio: target.profileBio,
            followers: target.profileFollowers,
            following: target.profileFollowing,
            totalPosts: target.profilePosts,
            verified: target.profileVerified,
        })),
        postEvidence,
    });
    const resolvedTopics = aiProfile?.controlledTopics?.length
        ? aiProfile.controlledTopics
        : topTopics;
    const topicSummary = aiProfile?.profileTopicSummary ?? heuristicTopicSummary;
    const profileSummary = aiProfile?.profileSummary ?? heuristicProfileSummary;
    const profileSentiment =
        aiProfile?.profileSentiment && aiProfile.profileSentiment !== "UNKNOWN"
            ? aiProfile.profileSentiment
            : dominantSentiment;
    const maxFollowers =
        influencer.scrapeTargets.reduce<number | null>((highest, target) => {
            if (target.profileFollowers == null) {
                return highest;
            }

            if (highest == null || target.profileFollowers > highest) {
                return target.profileFollowers;
            }

            return highest;
        }, null) ?? null;
    const inferredSize = deriveInfluencerSizeFromFollowers(maxFollowers);

    await prisma.$transaction(async (tx) => {
        if (resolvedTopics.length > 0) {
            await tx.influencerTopic.createMany({
                data: resolvedTopics.map((name) => ({ name, isControlled: true })),
                skipDuplicates: true,
            });
        }

        const topics = resolvedTopics.length
            ? await tx.influencerTopic.findMany({
                  where: { name: { in: resolvedTopics } },
                  select: { id: true, name: true },
              })
            : [];

        await tx.influencer.update({
            where: { id: influencerId },
            data: {
                profileTopicSummary: topicSummary,
                profileSummary,
                professionInstitution:
                    aiProfile?.professionInstitution ?? influencer.professionInstitution,
                profileSentiment,
                size: inferredSize ?? influencer.size,
                lastAnalyzedAt: new Date(),
                topicAssignments: {
                    deleteMany: {},
                    create: topics.map((topic) => ({
                        topicId: topic.id,
                    })),
                },
            },
        });
    });
}

function inferTopics(text: string) {
    const normalizedText = normalizeText(text);

    return CONTROLLED_TOPICS.filter((entry) =>
        entry.keywords.some((keyword) => normalizedText.includes(keyword)),
    ).map((entry) => entry.topic);
}

function inferSentiment(text: string): InfluencerSentiment {
    const normalizedText = normalizeText(text);

    let positive = 0;
    let negative = 0;

    for (const keyword of POSITIVE_KEYWORDS) {
        if (normalizedText.includes(keyword)) {
            positive += 1;
        }
    }

    for (const keyword of NEGATIVE_KEYWORDS) {
        if (normalizedText.includes(keyword)) {
            negative += 1;
        }
    }

    if (positive > 0 && negative > 0) {
        return "MIXED";
    }

    if (positive > negative) {
        return "POSITIVE";
    }

    if (negative > positive) {
        return "NEGATIVE";
    }

    return "NEUTRAL";
}

function summarizeText(text: string, maxLength: number) {
    const normalized = text.replace(/\s+/g, " ").trim();

    if (normalized.length <= maxLength) {
        return normalized;
    }

    return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeText(value: string) {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}
