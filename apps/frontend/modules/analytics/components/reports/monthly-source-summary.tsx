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
        <div className="rounded-[1.75rem] border border-slate-300/80 bg-white p-5 shadow-sm ring-1 ring-slate-200/70 dark:border-white/10 dark:bg-slate-950 dark:ring-white/10">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Sumber Laporan Bulanan
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Periode saat ini
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                        {currentPeriod.label}
                    </div>
                    <div className="mt-2">
                        <Badge color="blue">
                            {currentPeriod.sub || "Otomatis dari bulan selesai"}
                        </Badge>
                    </div>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Periode pembanding
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                        {comparisonPeriod.label}
                    </div>
                    <div className="mt-2">
                        <Badge color="blue">
                            {comparisonPeriod.sub || "Otomatis dari bulan selesai"}
                        </Badge>
                    </div>
                </div>
            </div>
        </div>
    );
}
