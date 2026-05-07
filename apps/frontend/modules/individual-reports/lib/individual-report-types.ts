import type { PortfolioPlatform as Platform } from "@repo/types";
import type {
    calculateReconstructionCoverage,
    selectContentForEnrichment,
} from "@/modules/individual-reports/lib/content-reconstruction";
import type { estimateIndividualReportCredits } from "@/modules/individual-reports/lib/individual-quarterly-report";
import type { InteractionGrowthResult } from "@/modules/individual-reports/lib/public-interaction-growth";

export interface IndividualLiveReviewRequest {
    accountId: string;
    platforms: Platform[];
    year: number;
    quarter: number;
    listingPageLimit?: number;
    enrichedContentLimit?: number;
}

export interface IndividualQuarterComparisonRequest {
    accountId: string;
    current: {
        year: number;
        quarter: number;
    };
    comparison: {
        year: number;
        quarter: number;
    };
    platforms: Platform[];
}

export interface ManualQuarterSnapshotRequest {
    accountId: string;
    platform: Platform;
    year: number;
    quarter: number;
    scrapedAt: string;
    followers: number;
    posts?: number | null;
    likes?: number | null;
    engagement?: number | null;
    sourceNote?: string | null;
}

export interface WorkerCreditBalance {
    credits: number | null;
    raw: unknown;
}

export interface WorkerPlatformProfileStats {
    followers: number | null;
    following: number | null;
    totalPosts: number | null;
    isVerified: boolean | null;
    displayName: string | null;
}

export interface WorkerQuarterSummaryStats {
    quarterItemCount: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
    totalShares: number;
    totalSaves: number;
    totalReposts: number;
    totalQuotes: number;
    totalBookmarks: number;
    avgLikes: number | null;
    avgComments: number | null;
    avgViews: number | null;
    avgEngagementRate: number | null;
    topPost: {
        url: string | null;
        likes: number | null;
        publishedAt: string;
    } | null;
    contentTypeBreakdown: Record<string, number>;
    monthlyInteractionTotals: Array<{
        key: string;
        label: string;
        contentCount: number;
        totalLikes: number;
        totalComments: number;
        totalViews: number;
        totalShares: number;
        totalSaves: number;
        totalReposts: number;
        totalQuotes: number;
        totalBookmarks: number;
        publicInteractions: number;
        publicReachInteractions: number | null;
    }>;
    isPopularMode: boolean;
}

export interface WorkerLiveReviewResult {
    platform: Platform;
    handle: string;
    success: boolean;
    error?: string;
    creditsUsed: number;
    rawItemsFetched: number;
    fetchedDateRange: {
        earliest: string | null;
        latest: string | null;
    };
    diagnostics: string[];
    coverage: ReturnType<typeof calculateReconstructionCoverage>;
    enrichedItems: ReturnType<typeof selectContentForEnrichment>;
    profileStats?: WorkerPlatformProfileStats | null;
    quarterSummary?: WorkerQuarterSummaryStats | null;
}

export interface PlatformResultJson extends WorkerLiveReviewResult {
    methodologyNotes: string[];
}

export interface IndividualReportRunData {
    account: {
        id: string;
        username: string;
    };
    request: {
        accountId: string;
        platforms: Platform[];
        year: number;
        quarter: number;
        listingPageLimit: number;
        enrichedContentLimit: number;
    };
    estimatedCredits: ReturnType<typeof estimateIndividualReportCredits>;
    actualCreditsUsed: number;
    results: WorkerLiveReviewResult[];
    methodologyNotes: string[];
    interactionGrowth?: InteractionGrowthResult[];
}

export const INDIVIDUAL_REPORT_METHODOLOGY_NOTES = [
    "Rekonstruksi konten menggunakan endpoint daftar dari setiap platform yang dipilih.",
    "Data yang dikembalikan difilter ke kuartal yang dipilih sebelum analisis cakupan dan pemilihan konten.",
    "Konten terpilih diurutkan secara objektif berdasarkan metrik keterlibatan dari data daftar.",
    "Data Twitter menampilkan tweet terpopuler karena keterbatasan platform, bukan urutan kronologis kuartal.",
] as const;

export const PUBLIC_INTERACTION_GROWTH_NOTE =
    "Public Interaction Growth dihitung dari metrik publik yang tersedia melalui API pihak ketiga dan disimpan oleh aplikasi ini. Angka ini dapat berbeda dari analitik platform internal karena platform dapat menyertakan metrik privat, penyaringan spam, penanganan konten terhapus, pemisahan bayar/organik, dan sinyal interaksi non-publik.";
