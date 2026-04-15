"use client";

import type { Platform } from "@repo/database";
import { Download, Loader2, Search } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
    exportIndividualQuarterlyReportPdf,
    getIndividualReportCreditBalance,
    getSavedIndividualReportRuns,
    prepareIndividualQuarterlyReportDraft,
    runIndividualQuarterlyLiveReview,
} from "@/modules/individual-reports/actions/individual-report.actions";
import {
    DEFAULT_INDIVIDUAL_ENRICHED_CONTENT_LIMIT,
    DEFAULT_INDIVIDUAL_LISTING_PAGE_LIMIT,
    DEFAULT_INDIVIDUAL_LIVE_LISTING_PAGE_LIMIT,
    estimateIndividualReportCredits,
    type IndividualReportRequest,
} from "@/modules/individual-reports/lib/individual-quarterly-report";
import { Button } from "@/shared/components/catalyst/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select";

interface AccountOption {
    id: string;
    username: string;
    handles: Record<Platform, string | null>;
}

interface IndividualQuarterlyReportClientProps {
    accounts: AccountOption[];
}

type DraftResult = Awaited<ReturnType<typeof prepareIndividualQuarterlyReportDraft>>;
type LiveReviewResult = Awaited<ReturnType<typeof runIndividualQuarterlyLiveReview>>;
type CreditBalanceResult = Awaited<ReturnType<typeof getIndividualReportCreditBalance>>;
type SavedRunsResult = Awaited<ReturnType<typeof getSavedIndividualReportRuns>>;

const PLATFORM_OPTIONS: Array<{ id: Platform; label: string }> = [
    { id: "INSTAGRAM", label: "Instagram" },
    { id: "TIKTOK", label: "TikTok" },
    { id: "TWITTER", label: "Twitter / X" },
];

const QUARTER_OPTIONS = [1, 2, 3, 4];

export function IndividualQuarterlyReportClient({
    accounts,
}: IndividualQuarterlyReportClientProps) {
    const currentYear = new Date().getFullYear();
    const [accountId, setAccountId] = useState(accounts[0]?.id || "");
    const [platform, setPlatform] = useState<Platform>("INSTAGRAM");
    const [year, setYear] = useState(String(currentYear));
    const [quarter, setQuarter] = useState("1");
    const [draft, setDraft] = useState<DraftResult | null>(null);
    const [liveReview, setLiveReview] = useState<LiveReviewResult | null>(null);
    const [creditBalance, setCreditBalance] = useState<CreditBalanceResult | null>(null);
    const [savedRuns, setSavedRuns] = useState<SavedRunsResult>([]);
    const [exportingRunId, setExportingRunId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const selectedAccount = accounts.find((account) => account.id === accountId) || null;
    const availablePlatforms = PLATFORM_OPTIONS.filter(
        (option) => !!selectedAccount?.handles[option.id],
    );
    const estimate = estimateIndividualReportCredits({
        listingPageLimit: DEFAULT_INDIVIDUAL_LISTING_PAGE_LIMIT,
        detailedContentLimit: DEFAULT_INDIVIDUAL_ENRICHED_CONTENT_LIMIT,
    });
    const allPlatformsEstimate = estimateIndividualReportCredits({
        includeProfileRequest: false,
        listingPageLimit: DEFAULT_INDIVIDUAL_LIVE_LISTING_PAGE_LIMIT * availablePlatforms.length,
        detailedContentLimit: 0,
    });

    useEffect(() => {
        if (!accountId) {
            setSavedRuns([]);
            return;
        }

        let cancelled = false;
        getSavedIndividualReportRuns(accountId).then((runs) => {
            if (!cancelled) setSavedRuns(runs);
        });

        return () => {
            cancelled = true;
        };
    }, [accountId]);

    const handlePrepare = () => {
        const request: IndividualReportRequest = {
            accountId,
            platform,
            year: Number(year),
            quarter: Number(quarter),
        };

        startTransition(async () => {
            const result = await prepareIndividualQuarterlyReportDraft(request);
            setDraft(result);
            if (result.success) {
                toast.success("Individual quarterly draft prepared");
                return;
            }
            toast.error(result.error);
        });
    };

    const handleCheckCredits = () => {
        startTransition(async () => {
            const result = await getIndividualReportCreditBalance();
            setCreditBalance(result);
            if (result.success) {
                toast.success("ScrapeCreators balance checked");
                return;
            }
            toast.error(result.error);
        });
    };

    const handleLiveReview = (platforms: Platform[]) => {
        if (!selectedAccount) return;

        startTransition(async () => {
            const result = await runIndividualQuarterlyLiveReview({
                accountId,
                platforms,
                year: Number(year),
                quarter: Number(quarter),
                listingPageLimit: DEFAULT_INDIVIDUAL_LIVE_LISTING_PAGE_LIMIT,
                enrichedContentLimit: DEFAULT_INDIVIDUAL_ENRICHED_CONTENT_LIMIT,
            });
            setLiveReview(result);
            if (result.success) {
                const runs = await getSavedIndividualReportRuns(accountId);
                setSavedRuns(runs);
                toast.success("Live individual review completed");
                return;
            }
            toast.error(result.error);
        });
    };

    const handleExportPdf = async (runId: string) => {
        setExportingRunId(runId);
        try {
            const result = await exportIndividualQuarterlyReportPdf(runId);
            if (!result.success) {
                toast.error(result.error);
                return;
            }

            const link = document.createElement("a");
            link.href = `data:application/pdf;base64,${result.data}`;
            link.download = `individual-quarterly-report-${Date.now()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Individual quarterly PDF exported");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Export failed");
        } finally {
            setExportingRunId(null);
        }
    };

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="grid gap-4 lg:grid-cols-4">
                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Account
                        </div>
                        <Select value={accountId} onValueChange={setAccountId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose account" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.username}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Platform
                        </div>
                        <Select
                            value={platform}
                            onValueChange={(value) => setPlatform(value as Platform)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose platform" />
                            </SelectTrigger>
                            <SelectContent>
                                {PLATFORM_OPTIONS.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Year
                        </div>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose year" />
                            </SelectTrigger>
                            <SelectContent>
                                {[currentYear, currentYear - 1, currentYear - 2].map((value) => (
                                    <SelectItem key={value} value={String(value)}>
                                        {value}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Quarter
                        </div>
                        <Select value={quarter} onValueChange={setQuarter}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose quarter" />
                            </SelectTrigger>
                            <SelectContent>
                                {QUARTER_OPTIONS.map((value) => (
                                    <SelectItem key={value} value={String(value)}>
                                        Q{value}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="font-semibold">Estimated ScrapeCreators usage</div>
                        <div>
                            {estimate.totalCredits} credits before execution: profile{" "}
                            {estimate.breakdown.profileCredits}, listing{" "}
                            {estimate.breakdown.listingCredits}, detail{" "}
                            {estimate.breakdown.detailCredits}.
                        </div>
                        <div className="mt-1 text-xs">
                            All available platforms listing-only estimate:{" "}
                            {allPlatformsEstimate.totalCredits} credits across{" "}
                            {availablePlatforms.length} platform(s), up to{" "}
                            {DEFAULT_INDIVIDUAL_LIVE_LISTING_PAGE_LIMIT} pages each.
                        </div>
                        {creditBalance?.success && (
                            <div className="mt-1 text-xs">
                                Current balance: {creditBalance.data.credits ?? "unknown"} credits.
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            outline
                            onClick={handleCheckCredits}
                            disabled={isPending}
                        >
                            Check Credits
                        </Button>
                        <Button
                            type="button"
                            outline
                            onClick={handlePrepare}
                            disabled={isPending || !selectedAccount}
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                            ) : (
                                <Search className="h-4 w-4" data-slot="icon" />
                            )}
                            Prepare Draft
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleLiveReview([platform])}
                            disabled={isPending || !selectedAccount}
                        >
                            Scrape Selected
                        </Button>
                        <Button
                            type="button"
                            onClick={() =>
                                handleLiveReview(availablePlatforms.map((option) => option.id))
                            }
                            disabled={
                                isPending || !selectedAccount || availablePlatforms.length === 0
                            }
                        >
                            Scrape 3 Platforms
                        </Button>
                    </div>
                </div>
            </section>

            {draft?.success && (
                <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Objective Report Skeleton
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">
                        {draft.data.report.title}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        {draft.data.report.periodLabel} • {draft.data.report.handle}
                    </p>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {draft.data.report.sections.map((section) => (
                            <div
                                key={section.id}
                                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                            >
                                <div className="font-semibold">{section.title}</div>
                                <div className="mt-2 text-xs uppercase tracking-wide text-zinc-500">
                                    {section.status}
                                </div>
                            </div>
                        ))}
                    </div>

                    {draft.data.report.warnings.length > 0 && (
                        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                            {draft.data.report.warnings.join(" ")}
                        </div>
                    )}

                    <div className="mt-5 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Future Content-Level Plan
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {draft.data.contentLevelPlan.outputSections.map((section) => (
                                <div
                                    key={section.id}
                                    className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-950"
                                >
                                    <div className="font-semibold text-zinc-950 dark:text-white">
                                        {section.title}
                                    </div>
                                    <p className="mt-1 text-zinc-500">{section.description}</p>
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 text-sm text-zinc-500">
                            Plan only: fetch up to{" "}
                            {draft.data.contentLevelPlan.reconstruction.listingPageLimit} listing
                            pages, then enrich up to{" "}
                            {draft.data.contentLevelPlan.enrichment.maxItems} selected posts. No
                            live scraping is executed from this draft.
                        </p>
                    </div>
                </section>
            )}

            {liveReview?.success && (
                <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Live Individual In-Depth Review
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">
                        {liveReview.data.account.username} Q{liveReview.data.request.quarter}{" "}
                        {liveReview.data.request.year}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        Used {liveReview.data.actualCreditsUsed} listing credit(s). Estimated max:{" "}
                        {liveReview.data.estimatedCredits.totalCredits}.
                        {"run" in liveReview.data && liveReview.data.run
                            ? ` Saved run ${liveReview.data.run.id}.`
                            : ""}
                    </p>
                    {"run" in liveReview.data && liveReview.data.run && (
                        <div className="mt-4">
                            <Button
                                type="button"
                                outline
                                onClick={() => handleExportPdf(liveReview.data.run.id)}
                                disabled={exportingRunId === liveReview.data.run.id}
                            >
                                {exportingRunId === liveReview.data.run.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                                ) : (
                                    <Download className="h-4 w-4" data-slot="icon" />
                                )}
                                Export Individual PDF
                            </Button>
                        </div>
                    )}

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        {liveReview.data.results.map((result) => {
                            const fetchedDateRange = result.fetchedDateRange || {
                                earliest: null,
                                latest: null,
                            };
                            const diagnostics = result.diagnostics || [];

                            return (
                                <div
                                    key={result.platform}
                                    className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-semibold">{result.platform}</div>
                                            <div className="text-sm text-zinc-500">
                                                @{result.handle}
                                            </div>
                                        </div>
                                        <div className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                            {result.success ? result.coverage.status : "failed"}
                                        </div>
                                    </div>
                                    {result.error ? (
                                        <p className="mt-3 text-sm text-rose-600">{result.error}</p>
                                    ) : (
                                        <>
                                            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                                                <Metric
                                                    label="Quarter Items"
                                                    value={result.coverage.totalContentItems}
                                                />
                                                <Metric
                                                    label="Fetched"
                                                    value={result.rawItemsFetched}
                                                />
                                                <Metric
                                                    label="Pages"
                                                    value={result.coverage.listingPagesFetched}
                                                />
                                            </div>
                                            {fetchedDateRange.earliest && (
                                                <p className="mt-3 text-xs text-zinc-500">
                                                    Fetched range:{" "}
                                                    {fetchedDateRange.earliest.slice(0, 10)} to{" "}
                                                    {fetchedDateRange.latest?.slice(0, 10)}
                                                </p>
                                            )}
                                            {diagnostics.length > 0 && (
                                                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                                                    {diagnostics.join(" ")}
                                                </div>
                                            )}
                                            <div className="mt-4 space-y-2">
                                                {result.coverage.months.map((month) => (
                                                    <div
                                                        key={month.key}
                                                        className="flex justify-between text-sm"
                                                    >
                                                        <span className="text-zinc-500">
                                                            {month.label}
                                                        </span>
                                                        <span>{month.contentCount} items</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                                                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                    Selected Content
                                                </div>
                                                <div className="mt-2 space-y-2">
                                                    {result.enrichedItems
                                                        .slice(0, 3)
                                                        .map((item) => (
                                                            <div key={item.id} className="text-sm">
                                                                <div className="font-medium">
                                                                    {new Date(item.publishedAt)
                                                                        .toISOString()
                                                                        .slice(0, 10)}
                                                                </div>
                                                                <div className="line-clamp-2 text-zinc-500">
                                                                    {item.textExcerpt ||
                                                                        item.url ||
                                                                        item.id}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {savedRuns.length > 0 && (
                <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Saved Individual Review Runs
                    </div>
                    <div className="mt-4 space-y-3">
                        {savedRuns.map((run) => (
                            <div
                                key={run.id}
                                className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 md:flex-row md:items-center md:justify-between"
                            >
                                <div>
                                    <div className="font-semibold text-zinc-950 dark:text-white">
                                        {run.accountName} Q{run.quarter} {run.year}
                                    </div>
                                    <div className="text-sm text-zinc-500">
                                        {run.platforms.join(", ")} • {run.actualCreditsUsed}{" "}
                                        credit(s) used • {new Date(run.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    outline
                                    onClick={() => handleExportPdf(run.id)}
                                    disabled={exportingRunId === run.id}
                                >
                                    {exportingRunId === run.id ? (
                                        <Loader2
                                            className="h-4 w-4 animate-spin"
                                            data-slot="icon"
                                        />
                                    ) : (
                                        <Download className="h-4 w-4" data-slot="icon" />
                                    )}
                                    Export PDF
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-950">
            <div className="text-xs text-zinc-500">{label}</div>
            <div className="font-semibold text-zinc-950 dark:text-white">{value}</div>
        </div>
    );
}
