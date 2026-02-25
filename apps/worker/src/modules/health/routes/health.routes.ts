import { Router } from "express";

const router: Router = Router();

/**
 * Health check endpoint.
 * Used by monitoring services (UptimeRobot, etc.) to verify worker is running.
 */
router.get("/", (_req, res) => {
    res.json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

export default router;
