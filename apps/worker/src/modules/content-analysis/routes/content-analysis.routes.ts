import type { RunContentAnalysisInput } from "@repo/types";
import { Router } from "express";
import { logger } from "../../../shared/lib/logger";
import { runContentAnalysis } from "../services/content-analysis.service";

const router: Router = Router();

router.post("/analyze", async (req, res) => {
    try {
        const input = req.body as RunContentAnalysisInput;
        const result = await runContentAnalysis(input);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error({ error }, "Failed to start content analysis");
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to start content analysis",
        });
    }
});

export default router;
