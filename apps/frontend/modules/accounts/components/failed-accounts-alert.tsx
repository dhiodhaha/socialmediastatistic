"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccountsWithErrors } from "@/modules/accounts/actions/account.actions";
import { retryFailedAccounts } from "@/modules/scraping/actions/scrape.actions";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/catalyst/button";
import { AlertTriangle, ChevronDown, ChevronUp, Pencil, RefreshCw, Loader2, X } from "lucide-react";
import { AccountDialog } from "./account-dialog";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

interface AccountError {
    platform: string;
    handle: string;
    error: string;
}

interface AccountWithErrors {
    id: string;
    username: string;
    instagram: string | null;
    tiktok: string | null;
    twitter: string | null;
    isActive: boolean;
    categories?: Array<{ category: { id: string; name: string } }>;
    errors: AccountError[];
}

const DISMISSED_KEY = "dismissed_failed_job_id";

export function FailedAccountsAlert() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<AccountWithErrors[]>([]);
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobDate, setJobDate] = useState<Date | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [editingAccount, setEditingAccount] = useState<AccountWithErrors | null>(null);
    const [retrying, setRetrying] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        async function fetch() {
            const res = await getAccountsWithErrors();
            if (res.success && res.data) {
                // Check if this job was dismissed
                const dismissedId = localStorage.getItem(DISMISSED_KEY);
                if (dismissedId === res.jobId) {
                    setDismissed(true);
                    return;
                }
                setAccounts(res.data as AccountWithErrors[]);
                setJobId(res.jobId ?? null);
                setJobDate(res.jobDate ? new Date(res.jobDate) : null);
            }
        }
        fetch();
    }, []);

    const handleDismiss = () => {
        if (jobId) {
            localStorage.setItem(DISMISSED_KEY, jobId);
        }
        setDismissed(true);
    };

    const handleRetry = async () => {
        setRetrying(true);
        try {
            const result = await retryFailedAccounts();
            if (result.success) {
                toast.success(`Retry job started for ${result.failedCount} failed accounts`);
                router.push("/history");
            } else {
                toast.error(result.error || "Failed to retry");
            }
        } catch {
            toast.error("Failed to retry failed accounts");
        } finally {
            setRetrying(false);
        }
    };

    if (accounts.length === 0 || dismissed) return null;

    return (
        <>
            <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                    <span>
                        {accounts.length} akun gagal di-scrape
                        {jobDate && (
                            <span className="font-normal text-sm ml-2">
                                ({format(jobDate, "dd MMM yyyy, HH:mm", { locale: id })})
                            </span>
                        )}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            outline
                            onClick={handleRetry}
                            disabled={retrying}
                            className="bg-white hover:bg-gray-100"
                        >
                            {retrying ? (
                                <Loader2 className="h-3 w-3 animate-spin" data-slot="icon" />
                            ) : (
                                <RefreshCw className="h-3 w-3" data-slot="icon" />
                            )}
                            {retrying ? "Retrying..." : "Retry Failed"}
                        </Button>
                        <Button
                            plain
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? <ChevronUp className="h-4 w-4" data-slot="icon" /> : <ChevronDown className="h-4 w-4" data-slot="icon" />}
                            {expanded ? "Sembunyikan" : "Lihat Detail"}
                        </Button>
                        <Button
                            plain
                            onClick={handleDismiss}
                            title="Abaikan untuk sementara"
                        >
                            <X className="h-4 w-4" data-slot="icon" />
                        </Button>
                    </div>
                </AlertTitle>
                {expanded && (
                    <AlertDescription className="mt-4">
                        <div className="space-y-2">
                            {accounts.map((acc) => (
                                <div
                                    key={acc.id}
                                    className="flex items-center justify-between bg-destructive/10 p-3 rounded-md"
                                >
                                    <div>
                                        <span className="font-medium">{acc.username}</span>
                                        <div className="text-sm text-muted-foreground">
                                            {acc.errors.map((e, i) => (
                                                <div key={i}>
                                                    <span className="font-mono">@{e.handle}</span> ({e.platform}): {e.error}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <Button
                                        outline
                                        onClick={() => setEditingAccount(acc)}
                                    >
                                        <Pencil className="h-3 w-3" data-slot="icon" />
                                        Edit Handle
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <p className="text-sm mt-3 text-muted-foreground">
                            Klik &quot;Edit Handle&quot; untuk memperbarui username yang telah berubah atau akun yang suspended.
                        </p>
                    </AlertDescription>
                )}
            </Alert>

            {editingAccount && (
                <AccountDialog
                    open={!!editingAccount}
                    onOpenChange={(open) => !open && setEditingAccount(null)}
                    mode="edit"
                    accountId={editingAccount.id}
                    defaultValues={{
                        username: editingAccount.username,
                        instagram: editingAccount.instagram || "",
                        tiktok: editingAccount.tiktok || "",
                        twitter: editingAccount.twitter || "",
                        isActive: editingAccount.isActive,
                        categoryIds: editingAccount.categories?.map(c => c.category.id) || [],
                    }}
                />
            )}
        </>
    );
}
