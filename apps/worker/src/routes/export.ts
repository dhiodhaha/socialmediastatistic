import { Router } from "express";
import puppeteer from "puppeteer";
import { logger } from "../lib/logger";
import { prisma } from "@repo/database";
import { generateReportHtml } from "../services/template";

const router = Router();

/**
 * Generate PDF Export
 * POST /export/pdf
 * Body: { startDate, endDate, status }
 */
router.post("/pdf", async (req, res) => {
    try {
        const { startDate, endDate, status } = req.body;
        logger.info({ filters: req.body }, "PDF export requested");

        // Build prisma query
        const where: any = {};
        if (status && status !== "ALL") where.status = status;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const jobs = await prisma.scrapingJob.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 1000 // Limit to prevent massive exploits
        });

        // Generate HTML
        const html = generateReportHtml({
            filteredJobs: jobs,
            filters: { startDate, endDate, status },
            generatedAt: new Date().toLocaleString(),
        });

        // Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"], // Required for some container envs
        });
        const page = await browser.newPage();

        // Set content and wait for load
        await page.setContent(html, { waitUntil: "networkidle0" });

        // Generate PDF buffer
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
        });

        await browser.close();

        // Send response
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=report-${Date.now()}.pdf`);
        res.send(Buffer.from(pdfBuffer));

    } catch (error) {
        logger.error({ error }, "Failed to generate PDF");
        res.status(500).json({ success: false, error: "Failed to generate PDF report" });
    }
});

export default router;
