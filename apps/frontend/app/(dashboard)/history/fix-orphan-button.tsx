"use client";

import { useState } from "react";
import { Button } from "@/shared/components/catalyst/button";
import { Wrench, Loader2 } from "lucide-react";
import { fixOrphanSnapshots } from "@/modules/analytics/actions/history.actions";
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
        <Button outline onClick={handleFix} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" data-slot="icon" /> : <Wrench className="w-4 h-4" data-slot="icon" />}
            Fix Imports
        </Button>
    );
}
