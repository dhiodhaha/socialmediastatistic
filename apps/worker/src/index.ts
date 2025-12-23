import "dotenv/config";
import express from "express";
import cors from "cors";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middleware/auth";
import healthRouter from "./routes/health";
import scrapeRouter from "./routes/scrape";
import exportRouter from "./routes/export";
import { initCronJobs } from "./lib/cron";

const app: express.Application = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Public routes
app.use("/health", healthRouter);

// Protected routes (require bearer token)
app.use("/scrape", authMiddleware, scrapeRouter);
app.use("/export", authMiddleware, exportRouter);

// Error handling middleware
app.use(
    (
        err: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
    ) => {
        logger.error({ err }, "Unhandled error");
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
);

// Start server
app.listen(PORT, () => {
    logger.info(`Worker server running on port ${PORT}`);
    initCronJobs();
});

export default app;
