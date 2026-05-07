import type {
    InfluencerPostCategory,
    InfluencerSentiment,
    InfluencerSize,
    Platform,
} from "@repo/database";
import { INFLUENCER_POST_CATEGORIES, INFLUENCER_SENTIMENTS } from "@repo/types";
import { logger } from "../../../shared/lib/logger";

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4.1-mini";
const CONTROLLED_TOPICS = [
    "Anggaran",
    "Pajak",
    "Ekonomi",
    "UMKM",
    "Pendidikan",
    "Kesehatan",
    "Lingkungan",
    "Infrastruktur",
    "Politik",
    "Teknologi",
] as const;

type PostAnalysisResult = {
    category: InfluencerPostCategory;
    sentiment: InfluencerSentiment;
    controlledTopics: string[];
    freeTags: string[];
    captionSummary: string | null;
    postSummary: string | null;
    threadSummary: string | null;
    confidence: number | null;
};

type ProfileAnalysisResult = {
    professionInstitution: string | null;
    profileSentiment: InfluencerSentiment;
    profileTopicSummary: string | null;
    profileSummary: string | null;
    controlledTopics: string[];
};

export async function analyzeInfluencerPostWithOpenAI(input: {
    influencerName: string;
    platform: Platform;
    mediaType: string | null;
    caption: string | null;
    content: string | null;
    transcript: string | null;
    threadText: string | null;
}) {
    if (!process.env.OPENAI_API_KEY) {
        return null;
    }

    const evidence = compactSections([
        section("Nama akun", input.influencerName),
        section("Platform", input.platform),
        section("Tipe media", input.mediaType),
        section("Caption", truncate(input.caption, 5_000)),
        section("Konten teks", truncate(input.content, 5_000)),
        section("Transkrip", truncate(input.transcript, 8_000)),
        section("Konteks thread", truncate(input.threadText, 8_000)),
    ]);

    if (!evidence) {
        return null;
    }

    try {
        const result = await requestStructuredJson<PostAnalysisSchema>({
            model:
                process.env.OPENAI_POST_ANALYSIS_MODEL ||
                process.env.OPENAI_ANALYSIS_MODEL ||
                DEFAULT_MODEL,
            schemaName: "influencer_post_analysis",
            schema: postAnalysisSchema,
            systemPrompt: [
                "Anda menganalisis satu postingan media sosial secara objektif untuk riset komunikasi.",
                "Gunakan HANYA teks caption, konten, transkrip, dan konteks thread yang tersedia sebagai bukti.",
                "Jangan mengarang fakta di luar data yang diberikan.",
                "",
                "SENTIMEN — nilai nada emosional konten postingan itu sendiri, bukan topiknya:",
                "POSITIVE: konten inspiratif, apresiasi, berbagi hal bermanfaat, dukungan, motivasi, edukasi positif.",
                "NEGATIVE: konten kritik keras, keluhan, kemarahan, tuduhan, hoaks, narasi negatif.",
                "NEUTRAL: konten informatif/deskriptif tanpa muatan emosi yang kuat (misalnya laporan fakta, pengumuman).",
                "MIXED: satu postingan yang memuat nada positif sekaligus negatif secara signifikan.",
                "UNKNOWN: teks terlalu pendek atau tidak ada teks sama sekali untuk dinilai.",
                "",
                "TOPIK TERKONTROL — pilih hanya topik yang secara eksplisit dibahas dalam konten post ini:",
                "Pendidikan: belajar, mengajar, sekolah, kampus, guru, murid, literasi, beasiswa, kurikulum.",
                "Teknologi: software, coding, AI/machine learning, gadget, startup, platform digital (bukan sekadar pakai HP/WA).",
                "Kesehatan: medis, dokter, nutrisi, olahraga, rumah sakit, obat, kesehatan mental.",
                "UMKM: wirausaha, produk lokal, jualan online, usaha kecil.",
                "Ekonomi: makroekonomi, investasi, inflasi, keuangan, pasar modal.",
                "Politik: partai, kampanye, pemilu, legislatif, kebijakan politik.",
                "Infrastruktur: jalan, transportasi, konstruksi, bandara, pelabuhan.",
                "Lingkungan: iklim, polusi, energi terbarukan, sampah, hutan.",
                "Anggaran: APBN, belanja negara, subsidi, defisit anggaran.",
                "Pajak: perpajakan, pajak penghasilan, cukai.",
                "",
                "KATEGORI: EDUCATION untuk konten edukasi/belajar-mengajar,",
                "GOVERNANCE untuk tata kelola pemerintahan, POLITICS untuk konten politik,",
                "ECONOMY untuk ekonomi, SOCIAL_ISSUE untuk isu sosial, ENVIRONMENT untuk lingkungan,",
                "ENTERTAINMENT untuk hiburan, PUBLIC_SERVICE untuk layanan publik, OTHER untuk lainnya.",
                "",
                "Jika caption sangat pendek (<10 kata) atau tidak ada teks, set confidence ≤0.35.",
            ].join("\n"),
            userPrompt: evidence,
        });

        return {
            category: normalizePostCategory(result.category),
            sentiment: normalizeSentiment(result.sentiment),
            controlledTopics: normalizeControlledTopics(result.controlledTopics),
            freeTags: normalizeFreeTags(result.freeTags),
            captionSummary: normalizeNullableText(result.captionSummary),
            postSummary: normalizeNullableText(result.postSummary),
            threadSummary: normalizeNullableText(result.threadSummary),
            confidence: normalizeConfidence(result.confidence),
        } satisfies PostAnalysisResult;
    } catch (error) {
        logger.warn({ error }, "OpenAI post analysis failed, falling back to heuristic analysis");
        return null;
    }
}

export async function analyzeInfluencerProfileWithOpenAI(input: {
    influencerName: string;
    displayAlias: string | null;
    note: string | null;
    handles: Partial<Record<Platform, string | null>>;
    recentProfiles: Array<{
        platform: Platform;
        displayName: string | null;
        bio: string | null;
        followers: number | null;
        following: number | null;
        totalPosts: number | null;
        verified: boolean | null;
    }>;
    postEvidence: string[];
}) {
    if (!process.env.OPENAI_API_KEY) {
        return null;
    }

    const recentProfiles = input.recentProfiles
        .map((profile) =>
            [
                `Platform: ${profile.platform}`,
                profile.displayName ? `Nama profil: ${profile.displayName}` : null,
                profile.bio ? `Bio: ${truncate(profile.bio, 1_500)}` : null,
                profile.followers != null ? `Followers: ${profile.followers}` : null,
                profile.following != null ? `Following: ${profile.following}` : null,
                profile.totalPosts != null ? `Total post: ${profile.totalPosts}` : null,
                profile.verified != null ? `Verified: ${profile.verified}` : null,
            ]
                .filter(Boolean)
                .join("\n"),
        )
        .filter(Boolean)
        .join("\n\n");

    const postEvidence = input.postEvidence
        .slice(0, 10)
        .map((item, index) => `${index + 1}. ${truncate(item, 700)}`)
        .join("\n");

    const handles = Object.entries(input.handles)
        .filter(([, handle]) => typeof handle === "string" && handle.trim().length > 0)
        .map(([platform, handle]) => `${platform}: ${handle}`)
        .join(", ");

    const evidence = compactSections([
        section("Nama akun", input.influencerName),
        section("Alias", input.displayAlias),
        section("Handle", handles),
        section("Catatan internal", input.note),
        section("Snapshot profil terbaru", recentProfiles),
        section("Bukti dari 10 post terbaru", postEvidence),
    ]);

    if (!evidence) {
        return null;
    }

    try {
        const result = await requestStructuredJson<ProfileAnalysisSchema>({
            model:
                process.env.OPENAI_PROFILE_ANALYSIS_MODEL ||
                process.env.OPENAI_ANALYSIS_MODEL ||
                DEFAULT_MODEL,
            schemaName: "influencer_profile_analysis",
            schema: profileAnalysisSchema,
            systemPrompt: [
                "Anda adalah analis media sosial yang mengklasifikasikan profil influencer untuk riset komunikasi pemerintah Indonesia.",
                "Gunakan bio, nama tampilan, handle, catatan internal, dan ringkasan konten post sebagai bukti.",
                "Prioritaskan bio dan self-description sebagai sinyal utama untuk menentukan profesi/identitas akun.",
                "PERLAKUKAN 10 post terbaru sebagai satu korpus gabungan untuk memahami pola akun secara keseluruhan, bukan untuk menilai post satu per satu.",
                "",
                "professionInstitution: frasa singkat (2-5 kata) yang menjelaskan SIAPA pemilik akun, bukan apa topik postingannya.",
                "Contoh yang baik: 'Guru SD/SMP', 'Dosen universitas', 'Content creator komedi', 'Pejabat daerah', 'Media berita lokal', 'Influencer UMKM', 'Aktivis lingkungan', 'Atlet profesional'.",
                "Contoh yang salah: 'Pendidikan dan teknologi' (itu topik, bukan profesi).",
                "",
                "TOPIK TERKONTROL — pilih topik yang merupakan TEMA UTAMA atau IDENTITAS akun, bukan topik yang hanya sesekali muncul.",
                "Gunakan definisi berikut untuk memilih dengan tepat:",
                "• Pendidikan: akun guru/dosen/institusi pendidikan, konten belajar-mengajar, literasi, kampus, beasiswa.",
                "  PENTING: jika pemilik akun adalah pendidik yang menggunakan teknologi/media sosial untuk mengajar, topiknya adalah Pendidikan — bukan Teknologi.",
                "• Teknologi: akun developer/startup/tech reviewer yang membahas software, AI, coding, gadget sebagai fokus utama.",
                "• Kesehatan: akun tenaga medis, konten nutrisi/olahraga/kesehatan mental, informasi medis.",
                "• UMKM: akun wirausaha, promosi produk lokal, konten jualan online/bisnis kecil.",
                "• Ekonomi: konten makroekonomi, investasi, keuangan pribadi, inflasi, pasar modal.",
                "• Politik: akun politisi/partai, konten kampanye, pemilu, legislasi.",
                "• Infrastruktur: konten pembangunan jalan/transportasi/konstruksi.",
                "• Lingkungan: konten iklim, polusi, energi terbarukan, konservasi.",
                "• Anggaran: konten APBN, belanja negara, subsidi pemerintah.",
                "• Pajak: konten edukasi/regulasi perpajakan.",
                "",
                "profileSentiment — nada keseluruhan konten akun (bukan topiknya):",
                "• POSITIVE: akun yang secara dominan membagikan konten inspiratif, edukatif, supportif, apresiasi, motivasi, atau berbagi hal bermanfaat.",
                "  Contoh POSITIVE: guru berbagi tips belajar, kreator konten positif, tokoh masyarakat yang mendukung program pembangunan.",
                "• NEGATIVE: akun yang didominasi kritik keras, kontroversi, keluhan, narasi negatif, atau penyebaran isu.",
                "• NEUTRAL: akun informatif/jurnalistik yang melaporkan fakta tanpa muatan emosi dominan.",
                "• MIXED: akun yang secara signifikan mencampurkan konten positif dan negatif.",
                "• UNKNOWN: tidak cukup bukti untuk menentukan sentimen.",
                "",
                "profileTopicSummary: deskripsi singkat (1-2 kalimat) tentang tema konten akun.",
                "profileSummary: ringkasan profil (2-3 kalimat) menjelaskan siapa akun ini, apa yang mereka buat, dan mengapa relevan.",
                "",
                "Jika tidak ada cukup bukti untuk suatu field, kembalikan string kosong atau array kosong. Jangan menebak.",
            ].join("\n"),
            userPrompt: evidence,
        });

        return {
            professionInstitution: normalizeNullableText(result.professionInstitution),
            profileSentiment: normalizeSentiment(result.profileSentiment),
            profileTopicSummary: normalizeNullableText(result.profileTopicSummary),
            profileSummary: normalizeNullableText(result.profileSummary),
            controlledTopics: normalizeControlledTopics(result.controlledTopics),
        } satisfies ProfileAnalysisResult;
    } catch (error) {
        logger.warn(
            { error },
            "OpenAI profile analysis failed, falling back to heuristic profile analysis",
        );
        return null;
    }
}

export function deriveInfluencerSizeFromFollowers(
    followerCount: number | null,
): InfluencerSize | null {
    if (followerCount == null || followerCount < 0) {
        return null;
    }

    if (followerCount >= 1_000_000) {
        return "MEGA";
    }

    if (followerCount >= 100_000) {
        return "MACRO";
    }

    if (followerCount >= 10_000) {
        return "MICRO";
    }

    return "NANO";
}

type StructuredRequest = {
    model: string;
    schemaName: string;
    schema: Record<string, unknown>;
    systemPrompt: string;
    userPrompt: string;
};

async function requestStructuredJson<T>(input: StructuredRequest): Promise<T> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured.");
    }

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: input.model,
            messages: [
                { role: "system", content: input.systemPrompt },
                { role: "user", content: input.userPrompt },
            ],
            temperature: 0.2,
            max_completion_tokens: readMaxOutputTokens(),
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: input.schemaName,
                    strict: true,
                    schema: input.schema,
                },
            },
        }),
    });

    const payload = (await response.json()) as unknown;

    if (!response.ok) {
        throw new Error(`OPENAI_API_ERROR_${response.status}: ${stringifyJson(payload)}`);
    }

    const choice = asArray(asRecord(payload).choices)[0];
    const message = asRecord(asRecord(choice).message);
    const refusal = message.refusal;

    if (typeof refusal === "string" && refusal.trim().length > 0) {
        throw new Error(`OPENAI_REFUSAL: ${refusal}`);
    }

    const content = readMessageContent(message.content);

    if (!content) {
        throw new Error("OpenAI did not return structured content.");
    }

    return JSON.parse(content) as T;
}

function readMaxOutputTokens() {
    const parsed = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS ?? "700");
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 700;
}

function readMessageContent(value: unknown) {
    if (typeof value === "string" && value.trim().length > 0) {
        return value;
    }

    for (const item of asArray(value)) {
        if (typeof item === "string" && item.trim().length > 0) {
            return item;
        }

        const record = asRecord(item);
        if (typeof record.text === "string" && record.text.trim().length > 0) {
            return record.text;
        }

        const nestedText = asRecord(record.text);
        if (typeof nestedText.value === "string" && nestedText.value.trim().length > 0) {
            return nestedText.value;
        }
    }

    return null;
}

function normalizeSentiment(value: string | null | undefined): InfluencerSentiment {
    return INFLUENCER_SENTIMENTS.includes(value as InfluencerSentiment)
        ? (value as InfluencerSentiment)
        : "UNKNOWN";
}

function normalizePostCategory(value: string | null | undefined): InfluencerPostCategory {
    return INFLUENCER_POST_CATEGORIES.includes(value as InfluencerPostCategory)
        ? (value as InfluencerPostCategory)
        : "OTHER";
}

function normalizeControlledTopics(value: unknown) {
    return Array.from(
        new Set(
            asArray(value)
                .filter((item): item is string => typeof item === "string")
                .map((item) => item.trim())
                .filter((item) =>
                    CONTROLLED_TOPICS.includes(item as (typeof CONTROLLED_TOPICS)[number]),
                ),
        ),
    );
}

function normalizeFreeTags(value: unknown) {
    return Array.from(
        new Set(
            asArray(value)
                .filter((item): item is string => typeof item === "string")
                .map((item) => item.trim().toLowerCase().replace(/\s+/g, "-"))
                .filter(Boolean),
        ),
    ).slice(0, 8);
}

function normalizeConfidence(value: unknown) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return null;
    }

    return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function normalizeNullableText(value: string | null | undefined) {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

function section(label: string, value: string | null) {
    return value && value.trim().length > 0 ? `${label}:\n${value.trim()}` : null;
}

function compactSections(sections: Array<string | null>) {
    const normalized = sections.filter(Boolean).join("\n\n");
    return normalized.trim().length > 0 ? normalized : null;
}

function truncate(value: string | null, maxLength: number) {
    if (!value) {
        return null;
    }

    const normalized = value.replace(/\s+/g, " ").trim();

    if (normalized.length <= maxLength) {
        return normalized;
    }

    return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function asRecord(value: unknown) {
    return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : ({} as Record<string, unknown>);
}

function asArray(value: unknown) {
    return Array.isArray(value) ? value : [];
}

function stringifyJson(value: unknown) {
    try {
        return JSON.stringify(value).slice(0, 500);
    } catch {
        return String(value);
    }
}

const postAnalysisSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        category: {
            type: "string",
            enum: [...INFLUENCER_POST_CATEGORIES],
        },
        sentiment: {
            type: "string",
            enum: [...INFLUENCER_SENTIMENTS],
        },
        controlledTopics: {
            type: "array",
            items: {
                type: "string",
                enum: [...CONTROLLED_TOPICS],
            },
        },
        freeTags: {
            type: "array",
            items: {
                type: "string",
            },
        },
        captionSummary: {
            type: "string",
        },
        postSummary: {
            type: "string",
        },
        threadSummary: {
            type: "string",
        },
        confidence: {
            type: "number",
        },
    },
    required: [
        "category",
        "sentiment",
        "controlledTopics",
        "freeTags",
        "captionSummary",
        "postSummary",
        "threadSummary",
        "confidence",
    ],
} as const;

const profileAnalysisSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        professionInstitution: {
            type: "string",
        },
        profileSentiment: {
            type: "string",
            enum: [...INFLUENCER_SENTIMENTS],
        },
        profileTopicSummary: {
            type: "string",
        },
        profileSummary: {
            type: "string",
        },
        controlledTopics: {
            type: "array",
            items: {
                type: "string",
                enum: [...CONTROLLED_TOPICS],
            },
        },
    },
    required: [
        "professionInstitution",
        "profileSentiment",
        "profileTopicSummary",
        "profileSummary",
        "controlledTopics",
    ],
} as const;

type PostAnalysisSchema = {
    category: string;
    sentiment: string;
    controlledTopics: unknown;
    freeTags: unknown;
    captionSummary: string;
    postSummary: string;
    threadSummary: string;
    confidence: number;
};

type ProfileAnalysisSchema = {
    professionInstitution: string;
    profileSentiment: string;
    profileTopicSummary: string;
    profileSummary: string;
    controlledTopics: unknown;
};
