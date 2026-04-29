"use client";

import { Loader2, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { fixOrphanSnapshots } from "@/modules/analytics/actions/history.actions";
import { Button } from "@/shared/components/catalyst/button";

export function FixOrphanButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleFix = async () => {
        setLoading(true);
        try {
            const result = await fixOrphanSnapshots();
            if (result.success) {
                if (result.fixed === 0) {
                    toast.info("Tidak ada snapshot yatim");
                } else {
                    toast.success(result.message);
                    router.refresh();
                }
            } else {
                toast.error(result.error || "Gagal memperbaiki snapshot yatim");
            }
        } catch {
            toast.error("Terjadi kendala");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button outline onClick={handleFix} disabled={loading}>
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" data-slot="icon" />
            ) : (
                <Wrench className="w-4 h-4" data-slot="icon" />
            )}
            Perbaiki impor
        </Button>
    );
}
