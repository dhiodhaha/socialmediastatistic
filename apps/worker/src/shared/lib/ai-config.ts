const DEFAULT_ANALYSIS_MODEL = "gpt-4.1-mini";

export function getAIProvider() {
    return (process.env.AI_PROVIDER || "openai").trim().toLowerCase();
}

export function getAIKey() {
    return process.env.AI_API_KEY || process.env.OPENAI_API_KEY || null;
}

export function hasAIKey() {
    return Boolean(getAIKey());
}

export function getAnalysisModel() {
    return (
        process.env.AI_ANALYSIS_MODEL ||
        process.env.OPENAI_ANALYSIS_MODEL ||
        process.env.GEMINI_ANALYSIS_MODEL ||
        DEFAULT_ANALYSIS_MODEL
    );
}

export function getProfileAnalysisModel() {
    return (
        process.env.AI_PROFILE_ANALYSIS_MODEL ||
        process.env.OPENAI_PROFILE_ANALYSIS_MODEL ||
        getAnalysisModel()
    );
}

export function getPostAnalysisModel() {
    return (
        process.env.AI_POST_ANALYSIS_MODEL ||
        process.env.OPENAI_POST_ANALYSIS_MODEL ||
        getAnalysisModel()
    );
}

export function getMaxOutputTokens() {
    const raw = process.env.AI_MAX_OUTPUT_TOKENS || process.env.OPENAI_MAX_OUTPUT_TOKENS || "700";
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 700;
}
