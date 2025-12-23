// Shared type definitions for the social media scraper

// Platform types
export type Platform = "INSTAGRAM" | "TIKTOK" | "TWITTER";

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

// API response types for ScrapeCreatorsAPI
export interface ScrapeResult {
    success: boolean;
    platform: Platform;
    handle: string;
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
    platform: Platform;
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
    platform: Platform;
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
        platform: Platform;
        count: number;
    }[];
}

// Growth calculation types
export interface GrowthData {
    accountId: string;
    handle: string;
    platform: Platform;
    currentFollowers: number;
    previousFollowers: number;
    growthAbsolute: number;
    growthPercentage: number;
}

// Export filters
export interface ExportFilters {
    startDate?: Date;
    endDate?: Date;
    platforms?: Platform[];
    accountIds?: string[];
}
