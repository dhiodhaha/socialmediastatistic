import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

/**
 * Bearer token authentication middleware.
 * Validates requests against the WORKER_SECRET environment variable.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.warn({ path: req.path }, "Missing or invalid authorization header");
        res.status(401).json({
            success: false,
            error: "Missing authorization header",
        });
        return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const expectedToken = process.env.WORKER_SECRET;

    if (!expectedToken) {
        logger.error("WORKER_SECRET environment variable not set");
        res.status(500).json({
            success: false,
            error: "Server configuration error",
        });
        return;
    }

    if (token !== expectedToken) {
        logger.warn({ path: req.path }, "Invalid bearer token");
        res.status(403).json({
            success: false,
            error: "Invalid authorization token",
        });
        return;
    }

    next();
}
