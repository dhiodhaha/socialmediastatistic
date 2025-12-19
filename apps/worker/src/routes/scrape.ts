import { Router } from "express";
import { logger } from "../lib/logger";
import { runScrapingJob } from "../services/scraper";

const router = Router();

/**
 * Trigger a scraping job.
 * POST /scrape
 *
 * This endpoint is called by:
 * - Vercel Cron (scheduled monthly scrape)
 * - Frontend (manual trigger from dashboard)
 */
router.post("/", async (req, res) => {
    try {
        logger.info("Scraping job triggered");

        // Start the scraping job in the background
        // We don't await here to return immediately
        runScrapingJob().catch((error) => {
            logger.error({ error }, "Scraping job failed");
        });

        res.json({
            success: true,
            message: "Scraping job started",
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logger.error({ error }, "Failed to start scraping job");
        res.status(500).json({
            success: false,
            error: "Failed to start scraping job",
        });
    }
});

/**
 * Get the status of the current or last scraping job.
 * GET /scrape/status
 */
router.get("/status", async (_req, res) => {
    try {
        // TODO: Implement job status retrieval from database
        res.json({
            success: true,
            message: "Status endpoint - to be implemented",
        });
    } catch (error) {
        logger.error({ error }, "Failed to get scraping status");
        res.status(500).json({
            success: false,
            error: "Failed to get scraping status",
        });
    }
});

export default router;
