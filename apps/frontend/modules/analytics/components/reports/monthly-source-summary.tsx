import { Badge } from "@/shared/components/catalyst/badge";

interface MonthlySourceSummaryProps {
    currentPeriod: {
        label: string;
        sub?: string;
    } | null;
    comparisonPeriod: {
        label: string;
        sub?: string;
    } | null;
}

export function MonthlySourceSummary({
    currentPeriod,
    comparisonPeriod,
}: MonthlySourceSummaryProps) {
    if (!currentPeriod || !comparisonPeriod) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
                Monthly Reporting Sources
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Current period
                    </div>
                    <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
                        {currentPeriod.label}
                    </div>
                    <div className="mt-2">
                        <Badge color="blue">
                            {currentPeriod.sub || "Auto from completion month"}
                        </Badge>
                    </div>
                </div>
                <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Comparison period
                    </div>
                    <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
                        {comparisonPeriod.label}
                    </div>
                    <div className="mt-2">
                        <Badge color="blue">
                            {comparisonPeriod.sub || "Auto from completion month"}
                        </Badge>
                    </div>
                </div>
            </div>
        </div>
    );
}
