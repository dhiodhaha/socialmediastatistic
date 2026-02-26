import cron from "node-cron";
import { runScrapingJob } from "../../modules/scraping/services/scraper";
import { logger } from "./logger";

export const initCronJobs = () => {
    logger.info("Initializing cron jobs...");

    // Run every day at midnight to check if it's the last day of the month
    // Schedule: 0 0 * * *
    cron.schedule("0 0 * * *", async () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // If tomorrow is the 1st, then today is the last day of the month
        if (tomorrow.getDate() === 1) {
            logger.info("It is the last day of the month. Starting scheduled scrape job...");
            try {
                await runScrapingJob();
                logger.info("Scheduled scrape job initiated.");
            } catch (error) {
                logger.error({ error }, "Scheduled scrape job failed");
            }
        } else {
            logger.info("Not the last day of the month. Skipping scrape job.");
        }
    });

    logger.info("Cron jobs initialized.");
};
