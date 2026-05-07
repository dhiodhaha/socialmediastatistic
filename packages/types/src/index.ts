// Shared type definitions for the social media statistic workspace.

export const PLATFORMS = ["INSTAGRAM", "TIKTOK", "TWITTER", "THREADS", "YOUTUBE"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PORTFOLIO_PLATFORMS = ["INSTAGRAM", "TIKTOK", "TWITTER"] as const;
export type PortfolioPlatform = (typeof PORTFOLIO_PLATFORMS)[number];

export function isPortfolioPlatform(platform: Platform): platform is PortfolioPlatform {
    return PORTFOLIO_PLATFORMS.includes(platform as PortfolioPlatform);
}

export const USER_ROLES = ["ADMIN", "EDITOR", "VIEWER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const JOB_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const INFLUENCER_SIZES = ["NANO", "MICRO", "MACRO", "MEGA"] as const;
export type InfluencerSize = (typeof INFLUENCER_SIZES)[number];

export const INFLUENCER_SENTIMENTS = [
    "POSITIVE",
    "NEUTRAL",
    "NEGATIVE",
    "MIXED",
    "UNKNOWN",
] as const;
export type InfluencerSentiment = (typeof INFLUENCER_SENTIMENTS)[number];

export const INFLUENCER_POST_CATEGORIES = [
    "GOVERNANCE",
    "PUBLIC_SERVICE",
    "POLITICS",
    "ECONOMY",
    "SOCIAL_ISSUE",
    "EDUCATION",
    "ENVIRONMENT",
    "ENTERTAINMENT",
    "OTHER",
] as const;
export type InfluencerPostCategory = (typeof INFLUENCER_POST_CATEGORIES)[number];

export const INFLUENCER_SCRAPE_RUN_STATUSES = [
    "PENDING",
    "RUNNING",
    "COMPLETED",
    "PARTIAL",
    "FAILED",
] as const;
export type InfluencerScrapeRunStatus = (typeof INFLUENCER_SCRAPE_RUN_STATUSES)[number];

export const INFLUENCER_SCRAPE_TARGET_STATUSES = [
    "PENDING",
    "RUNNING",
    "COMPLETED",
    "FAILED",
    "SKIPPED",
] as const;
export type InfluencerScrapeTargetStatus = (typeof INFLUENCER_SCRAPE_TARGET_STATUSES)[number];

export const INFLUENCER_ANALYSIS_STATUSES = [
    "PENDING",
    "RUNNING",
    "COMPLETED",
    "FAILED",
    "UNAVAILABLE",
] as const;
export type InfluencerAnalysisStatus = (typeof INFLUENCER_ANALYSIS_STATUSES)[number];

// API response types for ScrapeCreators API
export interface ScrapeResult {
    success: boolean;
    platform: PortfolioPlatform;
    handle: string;
    accountId?: string;
    data?: {
        followers: number;
        following?: number;
        posts?: number;
        engagement?: number;
        likes?: number;
    };
    error?: string;
}

// Account input types
export interface CreateAccountInput {
    platform: PortfolioPlatform;
    handle: string;
    displayName: string;
}

export interface UpdateAccountInput {
    handle?: string;
    displayName?: string;
    isActive?: boolean;
}

// CSV import types
export interface CSVAccountRow {
    platform: string;
    handle: string;
    displayName: string;
}

// Scraping job types
export interface ScrapingJobError {
    accountId: string;
    platform: PortfolioPlatform;
    handle: string;
    error: string;
    timestamp: string;
}

// Dashboard stats types
export interface DashboardStats {
    totalAccounts: number;
    activeAccounts: number;
    lastScrapeDate: Date | null;
    totalSnapshots: number;
    platformBreakdown: {
        platform: PortfolioPlatform;
        count: number;
    }[];
}

// Growth calculation types
export interface GrowthData {
    accountId: string;
    handle: string;
    platform: PortfolioPlatform;
    currentFollowers: number;
    previousFollowers: number;
    growthAbsolute: number;
    growthPercentage: number;
}

// Export filters
export interface ExportFilters {
    startDate?: Date;
    endDate?: Date;
    platforms?: PortfolioPlatform[];
    accountIds?: string[];
}

export interface InfluencerImportRecord {
    name: string;
    size?: string | null;
    professionInstitution?: string | null;
    sentiment?: string | null;
    socialMedia?: string | null;
    note?: string | null;
}

export interface ImportInfluencerResultRow {
    rowNumber: number;
    influencerId?: string;
    action: "CREATED" | "UPDATED" | "SKIPPED" | "ERROR";
    message: string;
}

export interface InfluencerDirectoryItem {
    id: string;
    name: string;
    displayAlias: string | null;
    size: InfluencerSize | null;
    professionInstitution: string | null;
    profileSentiment: InfluencerSentiment | null;
    activePlatforms: Platform[];
    isActive: boolean;
    lastScrapedAt: Date | null;
    lastAnalyzedAt: Date | null;
    topics: string[];
    latestRunStatus: InfluencerScrapeRunStatus | null;
}

export interface InfluencerPostAnalysisRecord {
    id: string;
    status: InfluencerAnalysisStatus;
    category: InfluencerPostCategory | null;
    sentiment: InfluencerSentiment | null;
    controlledTopics: string[];
    freeTags: string[];
    transcript: string | null;
    transcriptStatus: InfluencerAnalysisStatus;
    captionSummary: string | null;
    threadSummary: string | null;
    threadSummaryStatus: InfluencerAnalysisStatus;
    postSummary: string | null;
    confidence: number | null;
    error: string | null;
    analyzedAt: Date | null;
}

export interface InfluencerPostRecord {
    id: string;
    platform: Platform;
    platformPostId: string;
    threadId: string | null;
    url: string | null;
    caption: string | null;
    content: string | null;
    mediaType: string | null;
    thumbnailUrl: string | null;
    publishedAt: Date | null;
    analysis: InfluencerPostAnalysisRecord | null;
}

export interface InfluencerScrapeTargetRecord {
    id: string;
    platform: Platform;
    handle: string;
    status: InfluencerScrapeTargetStatus;
    creditsUsed: number;
    profileUrl: string | null;
    profileDisplayName: string | null;
    profileBio: string | null;
    profileFollowers: number | null;
    profileFollowing: number | null;
    profilePosts: number | null;
    profileVerified: boolean | null;
    error: string | null;
    scrapedAt: Date | null;
}

export interface InfluencerScrapeRunRecord {
    id: string;
    status: InfluencerScrapeRunStatus;
    requestedPlatforms: Platform[];
    creditsUsed: number;
    errorSummary: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    targets: InfluencerScrapeTargetRecord[];
}

export interface InfluencerDetailRecord {
    id: string;
    name: string;
    displayAlias: string | null;
    note: string | null;
    size: InfluencerSize | null;
    professionInstitution: string | null;
    profileSentiment: InfluencerSentiment | null;
    profileTopicSummary: string | null;
    profileSummary: string | null;
    canonicalUrl: string | null;
    handles: Partial<Record<Platform, string>>;
    activePlatforms: Platform[];
    isActive: boolean;
    lastScrapedAt: Date | null;
    lastAnalyzedAt: Date | null;
    topics: string[];
    scrapeRuns: InfluencerScrapeRunRecord[];
    posts: InfluencerPostRecord[];
}

export interface ResolveInfluencerSourcesInput {
    sources: string[];
    defaultPlatform?: Platform;
}

export interface ResolvedInfluencerSource {
    input: string;
    platform: Platform | null;
    kind: "PROFILE" | "POST";
    handle: string | null;
    canonicalUrl: string | null;
    sourceUrl: string | null;
    displayName: string | null;
    resolvedVia: "DIRECT" | "DEFAULT_PLATFORM" | "POST_ENDPOINT";
    error: string | null;
}

export interface RunInfluencerScrapeInput {
    influencerIds: string[];
    platforms: Platform[];
    requestedById?: string;
}

export interface RunInfluencerScrapeResponse {
    scrapeRunId: string;
}

export interface RetryInfluencerScrapePlatformInput {
    scrapeTargetId: string;
    requestedById?: string;
}

export interface RetryInfluencerAnalysisInput {
    analysisId?: string;
    postIds?: string[];
}

export interface InfluencerAnalysisRetryResponse {
    queued: number;
}
