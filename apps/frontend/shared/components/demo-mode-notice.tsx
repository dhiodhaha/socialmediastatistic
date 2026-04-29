import { Info } from "lucide-react";
import { DEMO_WORKER_DISABLED_MESSAGE } from "@/shared/lib/demo-mode";

export function DemoModeNotice({ compact = false }: { compact?: boolean }) {
    return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <div className="flex gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                    <div className="text-sm font-semibold">Demo mode</div>
                    {!compact && (
                        <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                            {DEMO_WORKER_DISABLED_MESSAGE}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
