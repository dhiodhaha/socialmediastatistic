import { Router } from "express";
import { logger } from "../lib/logger";
import { ExportService } from "../services/export";

const router: Router = Router();

/**
 * Generate PDF Export
 * POST /export/pdf
 * Body: { startDate, endDate, status }
 */
router.post("/pdf", async (req, res) => {
    try {
        const filters = req.body;
        logger.info({ filters }, "PDF export requested");

        const pdfBuffer = await ExportService.generatePdf(filters);

        // Send response
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=report-${Date.now()}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        logger.error({ error }, "Failed to generate PDF");
        res.status(500).json({ success: false, error: "Failed to generate PDF report" });
    }
});

export default router;
