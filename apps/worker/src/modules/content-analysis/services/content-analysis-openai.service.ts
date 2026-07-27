import type { ContentAnalysisResult, ContentPreviewData, Platform } from "@repo/types";
import { getAIKey, getAnalysisModel, getMaxOutputTokens } from "../../../shared/lib/ai-config";

const OPENAI_BASE_URL = "https://api.openai.com/v1";

export async function analyzeContentWithOpenAI(input: {
    platform: Platform;
    targetLabel: string;
    preview: ContentPreviewData;
}): Promise<ContentAnalysisResult> {
    const apiKey = getAIKey();
    if (!apiKey) {
        throw new Error("AI_API_KEY is not configured.");
    }

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: getAnalysisModel(),
            messages: [
                {
                    role: "system",
                    content: [
                        "Anda adalah analis konten publik untuk kebutuhan pemantauan komunikasi.",
                        "Tugas Anda bersifat objektif dan faktual.",
                        "Nilai sikap konten terhadap target organisasi yang diberikan.",
                        "Jika konten mengandung salah tafsir, jelaskan titik klarifikasinya.",
                        "Support actions dan counter actions harus berupa langkah klarifikasi, monitoring, atau respons faktual yang aman.",
                        "Jangan menyarankan pelecehan, intimidasi, manipulasi, atau serangan terkoordinasi.",
                    ].join(" "),
                },
                {
                    role: "user",
                    content: buildAnalysisPrompt(input),
                },
            ],
            temperature: 0.2,
            max_completion_tokens: getMaxOutputTokens(),
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "content_analysis_result",
                    strict: true,
                    schema: {
                        type: "object",
                        additionalProperties: false,
                        required: [
                            "stance",
                            "confidence",
                            "summary",
                            "keyIssues",
                            "clarificationPoints",
                            "supportActions",
                            "counterActions",
                            "factCheckNotes",
                            "evidence",
                        ],
                        properties: {
                            stance: {
                                type: "string",
                                enum: [
                                    "SUPPORTIVE",
                                    "NEUTRAL",
                                    "CRITICAL",
                                    "MISINFORMED",
                                    "MIXED",
                                    "IRRELEVANT",
                                ],
                            },
                            confidence: { type: "number" },
                            summary: { type: "string" },
                            keyIssues: { type: "array", items: { type: "string" } },
                            clarificationPoints: { type: "array", items: { type: "string" } },
                            supportActions: { type: "array", items: { type: "string" } },
                            counterActions: { type: "array", items: { type: "string" } },
                            factCheckNotes: { type: "array", items: { type: "string" } },
                            evidence: {
                                type: "array",
                                items: {
                                    type: "object",
                                    additionalProperties: false,
                                    required: ["label", "quote", "source"],
                                    properties: {
                                        label: { type: "string" },
                                        quote: { type: "string" },
                                        source: {
                                            type: "string",
                                            enum: ["caption", "thread", "transcript", "metadata"],
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }),
    });

    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
        throw new Error(`OPENAI_API_ERROR_${response.status}: ${stringifyJson(payload)}`);
    }

    const choice = asRecord(asArray(payload.choices)[0]);
    const message = asRecord(choice.message);
    const refusal = typeof message.refusal === "string" ? message.refusal : null;
    if (refusal) {
        throw new Error(`OPENAI_REFUSAL: ${refusal}`);
    }

    const content =
        typeof message.content === "string" ? message.content : extractTextPart(message.content);
    if (!content) {
        throw new Error("OpenAI response did not include analysis content.");
    }

    const parsed = JSON.parse(stripMarkdownFence(content)) as Partial<ContentAnalysisResult>;

    return {
        stance: normalizeStance(parsed.stance),
        confidence: clampConfidence(parsed.confidence),
        summary: normalizeSummary(parsed.summary),
        keyIssues: normalizeStringArray(parsed.keyIssues),
        clarificationPoints: normalizeStringArray(parsed.clarificationPoints),
        supportActions: normalizeStringArray(parsed.supportActions),
        counterActions: normalizeStringArray(parsed.counterActions),
        factCheckNotes: normalizeStringArray(parsed.factCheckNotes),
        evidence: normalizeEvidence(parsed.evidence),
    };
}

function buildAnalysisPrompt(input: {
    platform: Platform;
    targetLabel: string;
    preview: ContentPreviewData;
}) {
    const textPayload = {
        targetOrganization: input.targetLabel,
        platform: input.platform,
        authorHandle: input.preview.authorHandle,
        authorDisplayName: input.preview.authorDisplayName,
        title: input.preview.title,
        caption: trimForModel(input.preview.caption, 6000),
        summaryText: trimForModel(input.preview.summaryText, 6000),
        threadItems: input.preview.threadItems.map((item) => ({
            publishedAt: item.publishedAt,
            text: trimForModel(item.text, 3000),
            metrics: item.metrics,
        })),
        transcriptSegments: input.preview.transcriptSegments.slice(0, 40).map((segment) => ({
            startLabel: segment.startLabel,
            text: trimForModel(segment.text, 500),
        })),
        transcriptOnlyText: trimForModel(input.preview.transcriptOnlyText, 8000),
        notes: input.preview.platformNotes,
    };

    return [
        `Analisis konten ini terhadap ${input.targetLabel}.`,
        "Tentukan apakah konten mendukung, netral, kritis, salah tafsir, campuran, atau tidak relevan terhadap target.",
        "Kalau tidak cukup bukti, jangan mengarang. Pilih stance yang paling aman dan jelaskan keterbatasannya di factCheckNotes.",
        "Counter actions artinya langkah klarifikasi atau respons faktual, bukan serangan balik.",
        "Berikan evidence hanya dari teks yang memang ada di payload.",
        "",
        JSON.stringify(textPayload, null, 2),
    ].join("\n");
}

function normalizeStance(value: unknown): ContentAnalysisResult["stance"] {
    if (
        value === "SUPPORTIVE" ||
        value === "NEUTRAL" ||
        value === "CRITICAL" ||
        value === "MISINFORMED" ||
        value === "MIXED" ||
        value === "IRRELEVANT"
    ) {
        return value;
    }
    return "NEUTRAL";
}

function clampConfidence(value: unknown) {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return 0.5;
    return Math.max(0, Math.min(1, numeric));
}

function normalizeSummary(value: unknown) {
    if (typeof value === "string" && value.trim()) return value.trim();
    return "Model tidak mengembalikan ringkasan yang dapat dipakai.";
}

function normalizeStringArray(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, 6);
}

function normalizeEvidence(value: unknown): ContentAnalysisResult["evidence"] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            const record = asRecord(item);
            const label = typeof record.label === "string" ? record.label.trim() : "";
            const quote = typeof record.quote === "string" ? record.quote.trim() : "";
            const source =
                record.source === "caption" ||
                record.source === "thread" ||
                record.source === "transcript" ||
                record.source === "metadata"
                    ? record.source
                    : "metadata";
            if (!label || !quote) return null;
            return { label, quote, source };
        })
        .filter((item): item is ContentAnalysisResult["evidence"][number] => Boolean(item))
        .slice(0, 8);
}

function extractTextPart(value: unknown) {
    if (!Array.isArray(value)) return null;
    for (const item of value) {
        const record = asRecord(item);
        if (typeof record.text === "string" && record.text.trim()) {
            return record.text;
        }
    }
    return null;
}

function stripMarkdownFence(value: string) {
    return value
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
}

function trimForModel(value: string | null | undefined, limit: number) {
    if (!value) return null;
    return value.length <= limit ? value : `${value.slice(0, limit)}…`;
}

function stringifyJson(value: unknown) {
    try {
        return JSON.stringify(value).slice(0, 500);
    } catch {
        return String(value);
    }
}

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
