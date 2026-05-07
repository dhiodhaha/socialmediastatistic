"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizationErrorMessage, requireEditorOrAdmin } from "@/shared/lib/authorization";
import { DEMO_WORKER_DISABLED_MESSAGE, isDemoMode } from "@/shared/lib/demo-mode";
import { logger } from "@/shared/lib/logger";

const MAX_RETRIES = 3;

async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = MAX_RETRIES,
): Promise<Response> {
    try {
        const res = await fetch(url, options);
        if (!res.ok && res.status >= 500 && retries > 0) {
            throw new Error(`Server error: ${res.status}`);
        }
        return res;
    } catch (error) {
        if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

export async function triggerScrape(categoryId?: string) {
    try {
        await requireEditorOrAdmin();

        if (isDemoMode) {
            return { success: false, error: DEMO_WORKER_DISABLED_MESSAGE };
        }

        const workerUrl = process.env.WORKER_URL;
        const workerSecret = process.env.WORKER_SECRET;

        if (!workerUrl || !workerSecret) {
            return { success: false, error: "Worker is not configured for this deployment." };
        }

        const res = await fetchWithRetry(`${workerUrl}/scrape`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${workerSecret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ categoryId }),
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
        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to trigger scrape"),
        };
    }
}

export async function stopScrape(jobId: string) {
    try {
        await requireEditorOrAdmin();

        if (isDemoMode) {
            return { success: false, error: DEMO_WORKER_DISABLED_MESSAGE };
        }

        const workerUrl = process.env.WORKER_URL;
        const workerSecret = process.env.WORKER_SECRET;

        if (!workerUrl || !workerSecret) {
            return { success: false, error: "Worker is not configured for this deployment." };
        }

        const res = await fetch(`${workerUrl}/scrape/stop/${jobId}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${workerSecret}`,
            },
        });

        if (!res.ok) {
            const text = await res.text();
            return { success: false, error: `Worker error: ${text}` };
        }

        revalidatePath("/history");
        return { success: true };
    } catch (error) {
        logger.error({ error, jobId }, "Stop scrape failed");
        return {
            success: false,
            error: getAuthorizationErrorMessage(error, "Failed to stop scrape"),
        };
    }
}

export async function retryFailedAccounts() {
    try {
        await requireEditorOrAdmin();

        if (isDemoMode) {
            return { success: false, error: DEMO_WORKER_DISABLED_MESSAGE };
        }

        const workerUrl = process.env.WORKER_URL;
        const workerSecret = process.env.WORKER_SECRET;

        if (!workerUrl || !workerSecret) {
            return { success: false, error: "Worker is not configured for this deployment." };
        }

        const res = await fetch(`${workerUrl}/scrape/retry-failed`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${workerSecret}`,
            },
        });

        if (!res.ok) {
            let errorMsg = `HTTP ${res.status}`;
            try {
                const data = await res.json();
                errorMsg = data.error || errorMsg;
            } catch {
                // JSON parse failed, use status text
                errorMsg = res.statusText || errorMsg;
            }
            logger.error(
                { status: res.status, error: errorMsg },
                "Worker retry-failed endpoint error",
            );
            return { success: false, error: errorMsg };
        }

        const data = await res.json();
        revalidatePath("/history");
        revalidatePath("/accounts");
        return { success: true, jobId: data.jobId, failedCount: data.failedCount };
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error({ error: errMsg }, "Retry failed accounts request failed");
        return {
            success: false,
            error: getAuthorizationErrorMessage(error, `Connection failed: ${errMsg}`),
        };
    }
}
