import type {
    ResolveInfluencerSourcesInput,
    RetryInfluencerAnalysisInput,
    RetryInfluencerScrapePlatformInput,
    RunInfluencerScrapeInput,
} from "@repo/types";
import { Router } from "express";
import { logger } from "../../../shared/lib/logger";
import {
    retryInfluencerAnalysis,
    retryInfluencerScrapePlatform,
    runInfluencerScrape,
} from "../services/influencer-scrape.service";
import { resolveInfluencerSources } from "../services/influencer-source.service";

const router: Router = Router();

router.post("/resolve-sources", async (req, res) => {
    try {
        const input = req.body as ResolveInfluencerSourcesInput;
        const result = await resolveInfluencerSources(input);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error({ error }, "Failed to resolve influencer sources");
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to resolve influencer sources",
        });
    }
});

router.post("/scrape", async (req, res) => {
    try {
        const input = req.body as RunInfluencerScrapeInput;
        const result = await runInfluencerScrape(input);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error({ error }, "Failed to start influencer scrape");
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to start influencer scrape",
        });
    }
});

router.post("/scrape/retry-platform", async (req, res) => {
    try {
        const input = req.body as RetryInfluencerScrapePlatformInput;
        const result = await retryInfluencerScrapePlatform(input);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error({ error }, "Failed to retry influencer scrape platform");
        res.status(500).json({
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to retry influencer scrape platform",
        });
    }
});

router.post("/analysis/retry", async (req, res) => {
    try {
        const input = req.body as RetryInfluencerAnalysisInput;
        const result = await retryInfluencerAnalysis(input);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error({ error }, "Failed to retry influencer analysis");
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to retry influencer analysis",
        });
    }
});

export default router;
