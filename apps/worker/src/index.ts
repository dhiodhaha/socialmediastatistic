import express from "express";
import cors from "cors";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middleware/auth";
import healthRouter from "./routes/health";
import scrapeRouter from "./routes/scrape";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Public routes
app.use("/health", healthRouter);

// Protected routes (require bearer token)
app.use("/scrape", authMiddleware, scrapeRouter);

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
});

export default app;
