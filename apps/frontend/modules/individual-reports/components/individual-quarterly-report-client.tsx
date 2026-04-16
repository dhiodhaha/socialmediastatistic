"use client";

import type { Platform } from "@repo/database";
import { CheckCircle2, Download, Loader2, RefreshCw, Search, XCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
    exportComposedIndividualPdf,
    exportIndividualQuarterlyReportPdf,
    getIndividualReportCreditBalance,
    getLatestSuccessfulPlatformResults,
    getSavedIndividualReportRuns,
    prepareIndividualQuarterlyReportDraft,
    retryFailedPlatforms,
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
type LatestSuccessfulResult = Awaited<ReturnType<typeof getLatestSuccessfulPlatformResults>>;

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
    const [year, setYear] = useState(String(currentYear));
    const [quarter, setQuarter] = useState("1");
    // Per-platform selection for targeted scrape
    const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(new Set());

    const [draft, setDraft] = useState<DraftResult | null>(null);
    const [liveReview, setLiveReview] = useState<LiveReviewResult | null>(null);
    const [creditBalance, setCreditBalance] = useState<CreditBalanceResult | null>(null);
    const [savedRuns, setSavedRuns] = useState<SavedRunsResult>([]);
    const [latestSuccessful, setLatestSuccessful] = useState<LatestSuccessfulResult>([]);
    const [composerSelection, setComposerSelection] = useState<Set<string>>(new Set());
    const [exportingRunId, setExportingRunId] = useState<string | null>(null);
    const [isComposerExporting, setIsComposerExporting] = useState(false);
    const [isPending, startTransition] = useTransition();

    const selectedAccount = accounts.find((a) => a.id === accountId) || null;
    const availablePlatforms = PLATFORM_OPTIONS.filter(
        (option) => !!selectedAccount?.handles[option.id],
    );

    // Draft uses a single-platform select
    const [draftPlatform, setDraftPlatform] = useState<Platform>("INSTAGRAM");

    const allPlatformsEstimate = estimateIndividualReportCredits({
        includeProfileRequest: false,
        listingPageLimit: DEFAULT_INDIVIDUAL_LIVE_LISTING_PAGE_LIMIT * availablePlatforms.length,
        detailedContentLimit: 0,
    });

    const selectedPlatformsEstimate = estimateIndividualReportCredits({
        includeProfileRequest: false,
        listingPageLimit:
            DEFAULT_INDIVIDUAL_LIVE_LISTING_PAGE_LIMIT * Math.max(1, selectedPlatforms.size),
        detailedContentLimit: 0,
    });

    // Refresh saved runs and latest successful results whenever account/year/quarter changes
    useEffect(() => {
        if (!accountId) {
            setSavedRuns([]);
            setLatestSuccessful([]);
            return;
        }
        let cancelled = false;
        Promise.all([
            getSavedIndividualReportRuns(accountId),
            getLatestSuccessfulPlatformResults(accountId, Number(year), Number(quarter)),
        ]).then(([runs, latest]) => {
            if (cancelled) return;
            setSavedRuns(runs);
            setLatestSuccessful(latest);
            // Default composer: select all latest successful
            setComposerSelection(new Set(latest.map((r) => r.id)));
        });
        return () => {
            cancelled = true;
        };
    }, [accountId, year, quarter]);

    // After a live review completes, also refresh
    const refreshData = async () => {
        const [runs, latest] = await Promise.all([
            getSavedIndividualReportRuns(accountId),
            getLatestSuccessfulPlatformResults(accountId, Number(year), Number(quarter)),
        ]);
        setSavedRuns(runs);
        setLatestSuccessful(latest);
        setComposerSelection(new Set(latest.map((r) => r.id)));
    };

    const handlePrepare = () => {
        const request: IndividualReportRequest = {
            accountId,
            platform: draftPlatform,
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
            if (result.success) toast.success("Credit balance checked");
            else toast.error(result.error);
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
                await refreshData();
                toast.success("Live review completed");
            } else {
                toast.error(result.error);
            }
        });
    };

    const handleRetryFailed = () => {
        if (!selectedAccount) return;
        startTransition(async () => {
            const result = await retryFailedPlatforms({
                accountId,
                year: Number(year),
                quarter: Number(quarter),
                listingPageLimit: DEFAULT_INDIVIDUAL_LIVE_LISTING_PAGE_LIMIT,
                enrichedContentLimit: DEFAULT_INDIVIDUAL_ENRICHED_CONTENT_LIMIT,
            });
            setLiveReview(result);
            if (result.success) {
                await refreshData();
                toast.success("Retry completed");
            } else {
                toast.error(result.error);
            }
        });
    };

    const handleExportRun = async (runId: string) => {
        setExportingRunId(runId);
        try {
            const result = await exportIndividualQuarterlyReportPdf(runId);
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            triggerDownload(result.data);
            toast.success("PDF exported");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Export failed");
        } finally {
            setExportingRunId(null);
        }
    };

    const handleComposerExport = async () => {
        const ids = Array.from(composerSelection);
        if (ids.length === 0) {
            toast.error("Select at least one platform result to export.");
            return;
        }
        setIsComposerExporting(true);
        try {
            const result = await exportComposedIndividualPdf({
                platformResultIds: ids,
                accountId,
                year: Number(year),
                quarter: Number(quarter),
            });
            if (!result.success) {
                toast.error(result.error);
                return;
            }
            triggerDownload(result.data);
            toast.success("PDF exported");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Export failed");
        } finally {
            setIsComposerExporting(false);
        }
    };

    function triggerDownload(base64: string) {
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${base64}`;
        link.download = `individual-quarterly-report-${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Failed platforms (in latest runs, no successful result exists)
    const successfulPlatformSet = new Set(latestSuccessful.map((r) => r.platform));
    const attemptedPlatforms = new Set(
        savedRuns
            .filter((r) => r.year === Number(year) && r.quarter === Number(quarter))
            .flatMap((r) => r.platformResults.map((pr) => pr.platform)),
    );
    const failedPlatforms = Array.from(attemptedPlatforms).filter(
        (p) => !successfulPlatformSet.has(p),
    );

    return (
        <div className="space-y-6">
            {/* ── Controls ── */}
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
                            Year
                        </div>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose year" />
                            </SelectTrigger>
                            <SelectContent>
                                {[currentYear, currentYear - 1, currentYear - 2].map((v) => (
                                    <SelectItem key={v} value={String(v)}>
                                        {v}
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
                                {QUARTER_OPTIONS.map((v) => (
                                    <SelectItem key={v} value={String(v)}>
                                        Q{v}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Draft Platform
                        </div>
                        <Select
                            value={draftPlatform}
                            onValueChange={(v) => setDraftPlatform(v as Platform)}
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
                </div>

                {/* ── Platform selector + scrape actions ── */}
                <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/40">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="text-sm text-blue-900 dark:text-blue-200">
                            <div className="font-semibold">Pilih Platform untuk Scraping</div>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {availablePlatforms.map((opt) => {
                                    const checked = selectedPlatforms.has(opt.id);
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedPlatforms((prev) => {
                                                    const next = new Set(prev);
                                                    if (next.has(opt.id)) next.delete(opt.id);
                                                    else next.add(opt.id);
                                                    return next;
                                                });
                                            }}
                                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                                checked
                                                    ? "border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-400 dark:text-blue-950"
                                                    : "border-blue-300 bg-white text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-2 text-xs opacity-80">
                                Semua platform (listing-only): maks{" "}
                                {allPlatformsEstimate.totalCredits} kredit.
                                {selectedPlatforms.size > 0 && (
                                    <>
                                        {" "}
                                        Pilihan saat ini ({selectedPlatforms.size} platform): maks{" "}
                                        {selectedPlatformsEstimate.totalCredits} kredit.
                                    </>
                                )}
                                {creditBalance?.success && (
                                    <> Saldo: {creditBalance.data.credits ?? "?"} kredit.</>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                outline
                                onClick={handleCheckCredits}
                                disabled={isPending}
                            >
                                Cek Saldo
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
                                onClick={() => handleLiveReview(Array.from(selectedPlatforms))}
                                disabled={
                                    isPending || !selectedAccount || selectedPlatforms.size === 0
                                }
                            >
                                {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                                ) : null}
                                Scrape Pilihan ({selectedPlatforms.size})
                            </Button>
                            <Button
                                type="button"
                                onClick={() =>
                                    handleLiveReview(availablePlatforms.map((o) => o.id))
                                }
                                disabled={
                                    isPending || !selectedAccount || availablePlatforms.length === 0
                                }
                            >
                                Scrape Semua ({availablePlatforms.length})
                            </Button>
                            {failedPlatforms.length > 0 && (
                                <Button
                                    type="button"
                                    color="rose"
                                    onClick={handleRetryFailed}
                                    disabled={isPending || !selectedAccount}
                                >
                                    <RefreshCw className="h-4 w-4" data-slot="icon" />
                                    Retry Gagal ({failedPlatforms.length})
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Draft result ── */}
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
                            {draft.data.contentLevelPlan.enrichment.maxItems} selected posts.
                        </p>
                    </div>
                </section>
            )}

            {/* ── Latest live review result ── */}
            {liveReview?.success && (
                <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Hasil Live Review Terbaru
                            </div>
                            <h2 className="mt-1 text-xl font-semibold text-zinc-950 dark:text-white">
                                {liveReview.data.account.username} Q
                                {liveReview.data.request.quarter} {liveReview.data.request.year}
                            </h2>
                            <p className="mt-0.5 text-sm text-zinc-500">
                                {liveReview.data.actualCreditsUsed} kredit digunakan •{" "}
                                {liveReview.data.run.status} •{" "}
                                {new Date(liveReview.data.run.createdAt).toLocaleString("id-ID")}
                            </p>
                        </div>
                        <Button
                            type="button"
                            outline
                            onClick={() => handleExportRun(liveReview.data.run.id)}
                            disabled={exportingRunId === liveReview.data.run.id}
                        >
                            {exportingRunId === liveReview.data.run.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                            ) : (
                                <Download className="h-4 w-4" data-slot="icon" />
                            )}
                            Export Run Ini
                        </Button>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        {liveReview.data.results.map((result) => (
                            <PlatformResultCard key={result.platform} result={result} />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Export Composer ── */}
            {latestSuccessful.length > 0 && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                                Export Composer
                            </div>
                            <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-200">
                                Pilih hasil platform yang ingin dimasukkan ke PDF. Default: hasil
                                terbaru yang berhasil per platform.
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={handleComposerExport}
                            disabled={isComposerExporting || composerSelection.size === 0}
                        >
                            {isComposerExporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                            ) : (
                                <Download className="h-4 w-4" data-slot="icon" />
                            )}
                            Export PDF ({composerSelection.size} platform)
                        </Button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {latestSuccessful.map((result) => {
                            const selected = composerSelection.has(result.id);
                            return (
                                <button
                                    key={result.id}
                                    type="button"
                                    onClick={() => {
                                        setComposerSelection((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(result.id)) next.delete(result.id);
                                            else next.add(result.id);
                                            return next;
                                        });
                                    }}
                                    className={`rounded-xl border p-4 text-left transition-colors ${
                                        selected
                                            ? "border-emerald-500 bg-white dark:border-emerald-400 dark:bg-emerald-950"
                                            : "border-emerald-200 bg-emerald-50/50 opacity-60 dark:border-emerald-800 dark:bg-transparent"
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {selected ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                            <div className="h-4 w-4 rounded-full border-2 border-emerald-300 dark:border-emerald-700" />
                                        )}
                                        <span className="font-semibold text-zinc-950 dark:text-white">
                                            {platformDisplayName(result.platform)}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-xs text-zinc-500">
                                        @{result.handle}
                                    </div>
                                    {result.scrapedAt && (
                                        <div className="mt-1 text-xs text-zinc-400">
                                            {new Date(result.scrapedAt).toLocaleString("id-ID")}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {failedPlatforms.length > 0 && (
                        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                            Platform tidak tersedia (belum berhasil di-scrape):{" "}
                            {failedPlatforms.map(platformDisplayName).join(", ")}. PDF akan dilabeli
                            sebagai laporan parsial.
                        </div>
                    )}
                </section>
            )}

            {/* ── Saved Runs history ── */}
            {savedRuns.length > 0 && (
                <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Riwayat Scrape Attempt
                    </div>
                    <div className="mt-4 space-y-3">
                        {savedRuns
                            .filter(
                                (run) =>
                                    run.year === Number(year) &&
                                    run.quarter === Number(quarter) &&
                                    run.accountId === accountId,
                            )
                            .map((run) => (
                                <RunHistoryCard
                                    key={run.id}
                                    run={run}
                                    exportingRunId={exportingRunId}
                                    onExport={handleExportRun}
                                />
                            ))}
                        {savedRuns.filter(
                            (run) =>
                                !(
                                    run.year === Number(year) &&
                                    run.quarter === Number(quarter) &&
                                    run.accountId === accountId
                                ),
                        ).length > 0 && (
                            <>
                                <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                    Riwayat Lainnya
                                </div>
                                {savedRuns
                                    .filter(
                                        (run) =>
                                            !(
                                                run.year === Number(year) &&
                                                run.quarter === Number(quarter) &&
                                                run.accountId === accountId
                                            ),
                                    )
                                    .map((run) => (
                                        <RunHistoryCard
                                            key={run.id}
                                            run={run}
                                            exportingRunId={exportingRunId}
                                            onExport={handleExportRun}
                                        />
                                    ))}
                            </>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}

function platformDisplayName(platform: Platform): string {
    if (platform === "INSTAGRAM") return "Instagram";
    if (platform === "TIKTOK") return "TikTok";
    return "Twitter / X";
}

function PlatformResultCard({
    result,
}: {
    result: {
        platform: Platform;
        handle: string;
        success: boolean;
        error?: string;
        creditsUsed: number;
        rawItemsFetched: number;
        diagnostics: string[];
        fetchedDateRange?: { earliest: string | null; latest: string | null };
        coverage: {
            status: string;
            totalContentItems: number;
            listingPagesFetched: number;
            reachedQuarterStart: boolean;
            months: Array<{ key: string; label: string; contentCount: number }>;
            note: string;
        };
        enrichedItems: Array<{
            id: string;
            url?: string | null;
            publishedAt: string | Date;
            textExcerpt?: string | null;
        }>;
    };
}) {
    const fetchedDateRange = result.fetchedDateRange || { earliest: null, latest: null };
    const diagnostics = result.diagnostics || [];

    return (
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="font-semibold">{platformDisplayName(result.platform)}</div>
                    <div className="text-sm text-zinc-500">@{result.handle}</div>
                </div>
                <div
                    className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                        result.success
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                >
                    {result.success ? (
                        <CheckCircle2 className="h-3 w-3" />
                    ) : (
                        <XCircle className="h-3 w-3" />
                    )}
                    {result.success ? result.coverage.status : "gagal"}
                </div>
            </div>

            {result.error ? (
                <p className="mt-3 text-sm text-rose-600">{result.error}</p>
            ) : (
                <>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <Metric label="Item Kuartal" value={result.coverage.totalContentItems} />
                        <Metric label="Diambil" value={result.rawItemsFetched} />
                        <Metric label="Halaman" value={result.coverage.listingPagesFetched} />
                    </div>
                    {fetchedDateRange.earliest && (
                        <p className="mt-3 text-xs text-zinc-500">
                            Range: {fetchedDateRange.earliest.slice(0, 10)} →{" "}
                            {fetchedDateRange.latest?.slice(0, 10)}
                        </p>
                    )}
                    {diagnostics.length > 0 && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                            {diagnostics.join(" ")}
                        </div>
                    )}
                    <div className="mt-4 space-y-1">
                        {result.coverage.months.map((month) => (
                            <div key={month.key} className="flex justify-between text-sm">
                                <span className="text-zinc-500">{month.label}</span>
                                <span>{month.contentCount} item</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function RunHistoryCard({
    run,
    exportingRunId,
    onExport,
}: {
    run: {
        id: string;
        accountName: string;
        year: number;
        quarter: number;
        status: string;
        actualCreditsUsed: number;
        createdAt: string;
        platformResults: Array<{
            id: string;
            platform: Platform;
            handle: string;
            status: string;
            creditsUsed: number;
            error: string | null;
        }>;
    };
    exportingRunId: string | null;
    onExport: (runId: string) => void;
}) {
    const statusColor =
        run.status === "COMPLETE"
            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300"
            : run.status === "PARTIAL"
              ? "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-300"
              : "text-rose-600 bg-rose-50 dark:bg-rose-950 dark:text-rose-300";

    return (
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-950 dark:text-white">
                            {run.accountName} Q{run.quarter} {run.year}
                        </span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}
                        >
                            {run.status}
                        </span>
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                        {run.actualCreditsUsed} kredit •{" "}
                        {new Date(run.createdAt).toLocaleString("id-ID")}
                    </div>

                    {/* Per-platform result pills */}
                    <div className="mt-3 flex flex-wrap gap-2">
                        {run.platformResults.map((pr) => (
                            <div
                                key={pr.id}
                                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                                    pr.status === "SUCCESS"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                }`}
                                title={pr.error ?? undefined}
                            >
                                {pr.status === "SUCCESS" ? (
                                    <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                    <XCircle className="h-3 w-3" />
                                )}
                                {platformDisplayName(pr.platform)} @{pr.handle}
                            </div>
                        ))}
                    </div>
                </div>

                <Button
                    type="button"
                    outline
                    onClick={() => onExport(run.id)}
                    disabled={exportingRunId === run.id}
                >
                    {exportingRunId === run.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                    ) : (
                        <Download className="h-4 w-4" data-slot="icon" />
                    )}
                    Export PDF
                </Button>
            </div>
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
