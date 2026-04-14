import { AlertTriangle, CalendarClock, DatabaseZap, ShieldCheck } from "lucide-react";
import type { QuarterlyStatus } from "@/modules/analytics/lib/quarterly-reporting";

interface QuarterlyStatusSummaryProps {
    status: QuarterlyStatus;
}

export function QuarterlyStatusSummary({ status }: QuarterlyStatusSummaryProps) {
    const coverageLabel =
        status.coverage.totalAccounts > 0
            ? `${status.coverage.quarterEndCaptured}/${status.coverage.totalAccounts}`
            : "0/0";
    const fullQuarterLabel =
        status.coverage.totalAccounts > 0
            ? `${status.coverage.fullQuarterCaptured}/${status.coverage.totalAccounts}`
            : "0/0";

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        Quarterly Review Status
                    </div>
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                        Q{status.selectedQuarter} {status.selectedYear}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {status.availability.reason}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatusCard
                        icon={DatabaseZap}
                        label="Quarter-End Coverage"
                        value={coverageLabel}
                    />
                    <StatusCard
                        icon={CalendarClock}
                        label="Full-Quarter Coverage"
                        value={fullQuarterLabel}
                    />
                    <StatusCard
                        icon={ShieldCheck}
                        label="Baseline"
                        value={status.baseline.hasAnchor ? status.baseline.label : "Unavailable"}
                    />
                </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Source Months
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {status.sourceMonths.map(
                            (month: QuarterlyStatus["sourceMonths"][number]) => (
                                <div
                                    key={month.key}
                                    className={`rounded-lg border px-3 py-2 text-sm ${
                                        month.hasAnchor
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                                            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
                                    }`}
                                >
                                    <div className="font-medium">{month.label}</div>
                                    <div className="text-xs opacity-80">
                                        {month.hasAnchor ? "Anchor ready" : "Missing anchor"}
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Baseline
                    </div>
                    <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                        {status.baseline.label}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {status.baseline.hasAnchor
                            ? "Baseline anchor available"
                            : "Quarter report can still proceed without QoQ comparison"}
                    </div>
                </div>
            </div>

            {status.warnings.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                    <div className="mb-2 flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4" />
                        Warnings
                    </div>
                    <ul className="space-y-1">
                        {status.warnings.map((warning: string) => (
                            <li key={warning}>{warning}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function StatusCard({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof ShieldCheck;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <Icon className="h-4 w-4" />
                {label}
            </div>
            <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-white">{value}</div>
        </div>
    );
}
