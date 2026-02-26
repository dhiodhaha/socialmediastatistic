import { Router } from "express";
import { logger } from "../../../shared/lib/logger";
import { ExportService } from "../services/export.service";

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

/**
 * Generate Comparison PDF Export
 * POST /export/comparison-pdf
 * Body: { platform, month1, month2, data }
 */
router.post("/comparison-pdf", async (req, res) => {
    try {
        const exportData = req.body;
        logger.info(
            { platform: exportData.platform, dataCount: exportData.data?.length },
            "Comparison PDF export requested",
        );

        const pdfBuffer = await ExportService.generateComparisonPdf(exportData);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=comparison-${exportData.platform}-${Date.now()}.pdf`,
        );
        res.send(pdfBuffer);
    } catch (error) {
        logger.error({ error }, "Failed to generate comparison PDF");
        res.status(500).json({ success: false, error: "Failed to generate comparison PDF report" });
    }
});

/**
 * Generate Latest PDF Export
 * POST /export/latest-pdf
 * Body: { platform, month, data }
 */
router.post("/latest-pdf", async (req, res) => {
    try {
        const exportData = req.body;
        logger.info({ dataCount: exportData.sections?.length }, "Latest PDF export requested");

        const pdfBuffer = await ExportService.generateLatestPdf(exportData);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=latest-${Date.now()}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        logger.error({ error }, "Failed to generate latest PDF");
        res.status(500).json({ success: false, error: "Failed to generate latest PDF report" });
    }
});

export default router;
