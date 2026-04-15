import { Router } from "express";
import { logger } from "../../../shared/lib/logger";
import {
    fetchCreditBalance,
    type LiveReviewPlatformInput,
    runLivePlatformReview,
} from "../services/scrapecreators-live";

const router: Router = Router();

router.get("/credit-balance", async (_req, res) => {
    try {
        const balance = await fetchCreditBalance();
        res.json({ success: true, data: balance });
    } catch (error) {
        logger.error({ error }, "Failed to fetch ScrapeCreators credit balance");
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch credit balance",
        });
    }
});

router.post("/live-review", async (req, res) => {
    try {
        const input = req.body as LiveReviewPlatformInput;
        const result = await runLivePlatformReview(input);

        res.json({ success: true, data: result });
    } catch (error) {
        logger.error({ error }, "Failed to run individual live review");
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to run individual live review",
        });
    }
});

export default router;
