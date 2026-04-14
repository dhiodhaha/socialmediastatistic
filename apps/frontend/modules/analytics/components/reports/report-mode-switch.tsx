import { BarChart3, CalendarRange } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { ReportMode } from "./report-mode";

const MODES: Array<{
    id: ReportMode;
    label: string;
    description: string;
    icon: typeof BarChart3;
}> = [
    {
        id: "MONTHLY",
        label: "Monthly",
        description: "Compare month-end snapshots",
        icon: BarChart3,
    },
    {
        id: "QUARTERLY",
        label: "Quarterly",
        description: "Prepare quarter-based reports",
        icon: CalendarRange,
    },
];

interface ReportModeSwitchProps {
    value: ReportMode;
    onChange: (mode: ReportMode) => void;
}

export function ReportModeSwitch({ value, onChange }: ReportModeSwitchProps) {
    return (
        <div className="inline-flex items-center rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {MODES.map((mode) => {
                const Icon = mode.icon;

                return (
                    <button
                        key={mode.id}
                        type="button"
                        onClick={() => onChange(mode.id)}
                        className={cn(
                            "flex min-w-[180px] items-center gap-3 rounded-xl px-4 py-3 text-left transition-all",
                            value === mode.id
                                ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900"
                                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800",
                        )}
                    >
                        <span
                            className={cn(
                                "rounded-lg p-2",
                                value === mode.id
                                    ? "bg-white/15 dark:bg-zinc-900/10"
                                    : "bg-zinc-100 dark:bg-zinc-800",
                            )}
                        >
                            <Icon size={16} />
                        </span>
                        <span className="flex flex-col">
                            <span className="text-sm font-semibold">{mode.label}</span>
                            <span
                                className={cn(
                                    "text-xs",
                                    value === mode.id
                                        ? "text-white/75 dark:text-zinc-600"
                                        : "text-zinc-400 dark:text-zinc-500",
                                )}
                            >
                                {mode.description}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
