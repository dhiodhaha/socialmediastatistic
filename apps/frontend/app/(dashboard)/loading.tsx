function LoadingBlock({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse rounded-3xl bg-slate-100 dark:bg-white/5 ${className}`} />
    );
}

export default function DashboardLoading() {
    return (
        <div className="space-y-8 lg:space-y-10">
            <LoadingBlock className="h-64 w-full border border-slate-200/80" />
            <div className="grid gap-4 xl:grid-cols-2">
                <LoadingBlock className="h-40 w-full" />
                <LoadingBlock className="h-40 w-full" />
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <LoadingBlock className="h-72 w-full" />
                <LoadingBlock className="h-72 w-full" />
            </div>
        </div>
    );
}
