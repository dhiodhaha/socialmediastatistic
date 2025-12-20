"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { triggerScrape } from "@/app/actions/scrape";
import { Loader2, Play } from "lucide-react";

export function ScrapeButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    async function handleScrape() {
        setIsLoading(true);
        setStatus("idle");
        try {
            const result = await triggerScrape();
            if (result.success) {
                setStatus("success");
                setTimeout(() => setStatus("idle"), 3000);
            } else {
                setStatus("error");
                console.error(result.error);
                // Fallback alert is fine for now as we don't have a toaster setup
                alert(`Failed to trigger scrape: ${result.error}`);
            }
        } catch (error) {
            setStatus("error");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Button
            onClick={handleScrape}
            disabled={isLoading || status === "success"}
            variant={status === "success" ? "outline" : "default"}
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                </>
            ) : status === "success" ? (
                <>
                    <Play className="mr-2 h-4 w-4 text-green-500" />
                    Started!
                </>
            ) : (
                <>
                    <Play className="mr-2 h-4 w-4" />
                    Trigger Scrape
                </>
            )}
        </Button>
    );
}
