import type {
    InfluencerAnalysisStatus,
    InfluencerPostCategory,
    InfluencerSentiment,
    InfluencerSize,
    Platform,
    UserRole,
} from "@repo/types";

export const PLATFORM_LABELS: Record<Platform, string> = {
    INSTAGRAM: "Instagram",
    TIKTOK: "TikTok",
    TWITTER: "X",
    THREADS: "Threads",
    YOUTUBE: "YouTube",
};

export const SIZE_LABELS: Record<InfluencerSize, string> = {
    NANO: "Nano",
    MICRO: "Micro",
    MACRO: "Macro",
    MEGA: "Mega",
};

export const SENTIMENT_LABELS: Record<InfluencerSentiment, string> = {
    POSITIVE: "Positif",
    NEUTRAL: "Netral",
    NEGATIVE: "Negatif",
    MIXED: "Campuran",
    UNKNOWN: "Belum dinilai",
};

export const CATEGORY_LABELS: Record<InfluencerPostCategory, string> = {
    GOVERNANCE: "Pemerintahan",
    PUBLIC_SERVICE: "Layanan publik",
    POLITICS: "Politik",
    ECONOMY: "Ekonomi",
    SOCIAL_ISSUE: "Isu sosial",
    EDUCATION: "Pendidikan",
    ENVIRONMENT: "Lingkungan",
    ENTERTAINMENT: "Hiburan",
    OTHER: "Lainnya",
};

export const ANALYSIS_STATUS_LABELS: Record<InfluencerAnalysisStatus, string> = {
    PENDING: "Menunggu",
    RUNNING: "Berjalan",
    COMPLETED: "Selesai",
    FAILED: "Gagal",
    UNAVAILABLE: "Tidak tersedia",
};

export const ROLE_LABELS: Record<UserRole, string> = {
    ADMIN: "Admin",
    EDITOR: "Editor",
    VIEWER: "Viewer",
};
