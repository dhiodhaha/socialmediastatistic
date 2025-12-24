"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccountsWithErrors } from "@/app/actions/account";
import { retryFailedAccounts } from "@/app/actions/scrape";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
    categoryId: string | null;
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
                setJobId(res.jobId);
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
                            variant="outline"
                            size="sm"
                            onClick={handleRetry}
                            disabled={retrying}
                            className="h-6 px-2 bg-white hover:bg-gray-100"
                        >
                            {retrying ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3 w-3 mr-1" />
                            )}
                            {retrying ? "Retrying..." : "Retry Failed"}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded(!expanded)}
                            className="h-6 px-2"
                        >
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            {expanded ? "Sembunyikan" : "Lihat Detail"}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDismiss}
                            className="h-6 px-1"
                            title="Abaikan untuk sementara"
                        >
                            <X className="h-4 w-4" />
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
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingAccount(acc)}
                                    >
                                        <Pencil className="h-3 w-3 mr-1" />
                                        Edit Handle
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <p className="text-sm mt-3 text-muted-foreground">
                            Klik "Edit Handle" untuk memperbarui username yang telah berubah atau akun yang suspended.
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
                        categoryId: editingAccount.categoryId,
                    }}
                />
            )}
        </>
    );
}
