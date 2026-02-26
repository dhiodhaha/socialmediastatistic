"use client";

import { Loader2, Play } from "lucide-react";
import { useState } from "react";
import { triggerScrape } from "@/modules/scraping/actions/scrape.actions";
import { Button } from "@/shared/components/catalyst/button";

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

    if (status === "success") {
        return (
            <Button onClick={handleScrape} disabled outline>
                <Play className="h-4 w-4" data-slot="icon" />
                Started!
            </Button>
        );
    }

    return (
        <Button onClick={handleScrape} disabled={isLoading}>
            {isLoading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                    Starting...
                </>
            ) : (
                <>
                    <Play className="h-4 w-4" data-slot="icon" />
                    Trigger Scrape
                </>
            )}
        </Button>
    );
}
