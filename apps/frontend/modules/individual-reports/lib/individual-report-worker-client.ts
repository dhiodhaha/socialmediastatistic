import { DEMO_WORKER_DISABLED_MESSAGE, isDemoMode } from "@/shared/lib/demo-mode";

export async function callWorkerJson<T>(path: string, init: RequestInit): Promise<T> {
    const { workerUrl, workerSecret } = requireWorkerConfig();

    const response = await fetch(`${workerUrl}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${workerSecret}`,
            "Content-Type": "application/json",
            ...init.headers,
        },
    });

    const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        data?: unknown;
        error?: string;
    } | null;

    if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || `Worker request failed: ${response.status}`);
    }

    return payload?.data as T;
}

export async function callWorkerPdfBase64(path: string, body: unknown): Promise<string> {
    const { workerUrl, workerSecret } = requireWorkerConfig();

    const response = await fetch(`${workerUrl}${path}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${workerSecret}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`PDF export failed: ${response.status} - ${text.slice(0, 180)}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
}

function requireWorkerConfig() {
    if (isDemoMode) {
        throw new Error(DEMO_WORKER_DISABLED_MESSAGE);
    }

    const workerUrl = process.env.WORKER_URL;
    const workerSecret = process.env.WORKER_SECRET;
    if (!workerUrl || !workerSecret) {
        throw new Error("Worker is not configured for this deployment.");
    }

    return { workerUrl, workerSecret };
}
