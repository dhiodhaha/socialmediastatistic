import { Info } from "lucide-react";
import { DEMO_WORKER_DISABLED_MESSAGE } from "@/shared/lib/demo-mode";

export function DemoModeNotice({ compact = false }: { compact?: boolean }) {
    return (
        <div className="rounded-[1.5rem] border border-amber-200/80 bg-[linear-gradient(135deg,_rgba(254,252,232,0.96),_rgba(255,247,237,0.96))] px-5 py-4 text-amber-950 shadow-sm ring-1 ring-white/60 dark:border-amber-900/60 dark:bg-[linear-gradient(135deg,_rgba(69,26,3,0.42),_rgba(120,53,15,0.22))] dark:text-amber-100 dark:ring-white/10">
            <div className="flex gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                    <div className="text-sm font-semibold">Mode demo</div>
                    {!compact && (
                        <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-200">
                            {DEMO_WORKER_DISABLED_MESSAGE}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
