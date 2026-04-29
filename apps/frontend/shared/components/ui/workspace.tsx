import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export function WorkspacePage({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return <div className={cn("space-y-8 lg:space-y-10", className)}>{children}</div>;
}

export function PageHero({
    eyebrow,
    title,
    description,
    actions,
    children,
    className,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                "relative overflow-hidden rounded-[2rem] border border-slate-300/80 bg-white shadow-sm ring-1 ring-slate-200/70 dark:border-white/10 dark:bg-slate-950 dark:ring-white/10",
                className,
            )}
        >
            <div className="relative grid xl:grid-cols-[minmax(0,1.1fr)_420px]">
                <div className="border-b border-slate-200/80 px-6 py-7 sm:px-8 sm:py-9 xl:border-b-0 xl:border-r dark:border-white/10">
                    {eyebrow ? (
                        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                            {eyebrow}
                        </div>
                    ) : null}
                    <h1 className="mt-4 max-w-[12ch] text-4xl font-medium tracking-[-0.06em] text-slate-950 sm:text-6xl dark:text-white">
                        {title}
                    </h1>
                </div>

                <div className="flex flex-col justify-between">
                    <div className="px-6 py-7 sm:px-8 sm:py-9">
                        {description ? (
                            <p className="max-w-md text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">
                                {description}
                            </p>
                        ) : null}
                    </div>
                    {actions ? (
                        <div className="flex flex-wrap gap-3 border-t border-slate-200/80 px-6 py-5 sm:px-8 dark:border-white/10">
                            {actions}
                        </div>
                    ) : null}
                </div>
            </div>

            {children ? (
                <div className="relative border-t border-slate-200/80 px-6 py-6 sm:px-8 dark:border-white/10">
                    {children}
                </div>
            ) : null}
        </section>
    );
}

export function HeroMetricGrid({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "grid overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-slate-50 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/10 dark:bg-white/5",
                className,
            )}
        >
            {children}
        </div>
    );
}

export function HeroMetric({
    label,
    value,
    detail,
}: {
    label: string;
    value: string | number;
    detail?: string;
}) {
    return (
        <div className="border-b border-slate-200/80 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r xl:last:border-r-0 dark:border-white/10">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {label}
            </div>
            <div className="mt-3 text-3xl font-medium tracking-[-0.04em] text-slate-950 dark:text-white">
                {value}
            </div>
            {detail ? (
                <div className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {detail}
                </div>
            ) : null}
        </div>
    );
}

export function Surface({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <section
            className={cn(
                "relative overflow-hidden rounded-[1.75rem] border border-slate-300/80 bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6 dark:border-white/10 dark:bg-slate-950 dark:ring-white/10",
                className,
            )}
        >
            <div className="relative">{children}</div>
        </section>
    );
}

export function SurfaceHeader({
    eyebrow,
    title,
    description,
    actions,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-white/10">
            <div className="max-w-2xl">
                {eyebrow ? (
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        {eyebrow}
                    </div>
                ) : null}
                <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-slate-950 dark:text-white">
                    {title}
                </h2>
                {description ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {description}
                    </p>
                ) : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
    );
}

export function InfoStrip({
    items,
    className,
}: {
    items: Array<{ label: string; value: string }>;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "grid gap-3 rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/10 dark:bg-white/5",
                className,
            )}
        >
            {items.map((item) => (
                <div key={item.label}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        {item.label}
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                        {item.value}
                    </div>
                </div>
            ))}
        </div>
    );
}
