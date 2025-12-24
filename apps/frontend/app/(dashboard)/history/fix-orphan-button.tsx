"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wrench, Loader2 } from "lucide-react";
import { fixOrphanSnapshots } from "@/app/actions/history";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function FixOrphanButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleFix = async () => {
        setLoading(true);
        try {
            const result = await fixOrphanSnapshots();
            if (result.success) {
                if (result.fixed === 0) {
                    toast.info("No orphan snapshots found");
                } else {
                    toast.success(result.message);
                    router.refresh();
                }
            } else {
                toast.error(result.error || "Failed to fix orphan snapshots");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button variant="outline" size="sm" onClick={handleFix} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
            Fix Old Imports
        </Button>
    );
}
