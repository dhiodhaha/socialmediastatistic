"use server";

import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

const MAX_RETRIES = 3;

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
    try {
        const res = await fetch(url, options);
        if (!res.ok && res.status >= 500 && retries > 0) {
            throw new Error(`Server error: ${res.status}`);
        }
        return res;
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

export async function triggerScrape() {
    try {
        const workerUrl = process.env.WORKER_URL;
        const workerSecret = process.env.WORKER_SECRET;

        if (!workerUrl || !workerSecret) {
            return { success: false, error: "System configuration error" };
        }

        const res = await fetchWithRetry(`${workerUrl}/scrape`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${workerSecret}`,
            },
        });

        if (!res.ok) {
            const text = await res.text();
            return { success: false, error: `Worker error: ${text}` };
        }

        const data = await res.json();
        const jobId = data.jobId || "unknown";

        revalidatePath("/history");
        return { success: true, jobId };
    } catch (error) {
        logger.error({ error }, "Trigger scrape failed");
        return { success: false, error: "Failed to trigger scrape" };
    }
}
