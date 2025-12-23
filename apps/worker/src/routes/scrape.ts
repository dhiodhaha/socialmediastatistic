import { Router } from "express";
import { logger } from "../lib/logger";
import { runScrapingJob, cancelJob } from "../services/scraper";

const router: Router = Router();

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
        const { categoryId } = req.body;
        logger.info({ categoryId }, "Scraping job triggered");

        // runScrapingJob now returns jobId immediately, processing happens async
        const jobId = await runScrapingJob(categoryId);

        res.json({
            success: true,
            message: "Scraping job started",
            jobId,
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
 * Stop a running scraping job.
 * POST /scrape/stop/:jobId
 */
router.post("/stop/:jobId", async (req, res) => {
    try {
        const { jobId } = req.params;
        logger.info({ jobId }, "Stop job requested");

        await cancelJob(jobId);

        res.json({
            success: true,
            message: `Job ${jobId} marked for cancellation. It will stop after the current batch completes.`,
        });
    } catch (error) {
        logger.error({ error }, "Failed to stop scraping job");
        res.status(500).json({
            success: false,
            error: "Failed to stop scraping job",
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

