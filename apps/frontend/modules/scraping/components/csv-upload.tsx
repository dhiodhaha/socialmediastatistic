"use client";

import { AlertCircle, CheckCircle, Download, Upload } from "lucide-react";
import Papa from "papaparse";
import { useRef, useState } from "react";
import { bulkCreateAccounts } from "@/modules/accounts/actions/account.actions";
import { Button } from "@/shared/components/catalyst/button";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import type { AccountInput } from "@/shared/lib/schemas";

// Template for account import (client-side, no server cost)
const ACCOUNT_TEMPLATE = `name,instagram,tiktok,x,category
Brand Contoh,brandcontoh,brandcontoh_id,brandcontoh,Portofolio Utama
Tim Produk,produkcontoh,,produkcontoh,Divisi Produk
Tokoh Publik,tokohcontoh,tokohcontoh,,Personal Brand`;

export function CsvUpload() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{
        type: "success" | "error";
        message: string;
        details?: string[];
    } | null>(null);

    const handleDownloadTemplate = () => {
        const blob = new Blob([ACCOUNT_TEMPLATE], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "account_import_template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setStatus(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const accounts: AccountInput[] = [];

                    // Map CSV rows to AccountInput
                    // Expected headers: name, tiktok, instagram, x
                    interface CsvRow {
                        name?: string;
                        Name?: string;
                        instagram?: string;
                        Instagram?: string;
                        tiktok?: string;
                        TikTok?: string;

                        x?: string;
                        X?: string;
                        twitter?: string;
                        Twitter?: string;
                        category?: string;
                        Category?: string;
                    }
                    for (const row of results.data as CsvRow[]) {
                        if (!row.name && !row.Name) continue; // Name is required

                        const clean = (val?: string) => {
                            if (!val) return null;
                            const lower = val.toLowerCase().trim();
                            if (lower === "n/a" || lower === "na" || lower === "-") return null;
                            // Remove @ symbol from usernames
                            return val.trim().replace(/^@/, "");
                        };

                        accounts.push({
                            username: row.name || row.Name || "",
                            instagram: clean(row.instagram || row.Instagram),
                            tiktok: clean(row.tiktok || row.TikTok),
                            twitter: clean(row.x || row.X || row.twitter || row.Twitter),
                            categoryName: clean(row.category || row.Category) || undefined,
                            categoryIds: [], // Will be populated from categoryName by bulkCreateAccounts
                            isActive: true,
                        });
                    }

                    if (accounts.length === 0) {
                        setStatus({
                            type: "error",
                            message:
                                "Tidak ada akun valid ditemukan. Pastikan header: name, tiktok, instagram, x",
                        });
                        setLoading(false);
                        return;
                    }

                    const result = await bulkCreateAccounts(accounts);

                    if (result.success) {
                        setStatus({
                            type: "success",
                            message: `Berhasil mengimpor ${result.count} akun.`,
                            details: result.errors,
                        });
                        if (fileInputRef.current) fileInputRef.current.value = "";
                    } else {
                        setStatus({ type: "error", message: result.error || "Unggah gagal" });
                    }
                } catch (error) {
                    console.error(error);
                    setStatus({ type: "error", message: "Gagal memproses atau mengunggah CSV." });
                } finally {
                    setLoading(false);
                }
            },
            error: (error) => {
                setStatus({ type: "error", message: `CSV Parsing Error: ${error.message}` });
                setLoading(false);
            },
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                />
                <Button outline onClick={handleDownloadTemplate}>
                    <Download data-slot="icon" />
                    Template
                </Button>
                <Button outline onClick={() => fileInputRef.current?.click()} disabled={loading}>
                    <Upload data-slot="icon" />
                    {loading ? "Sedang mengimpor..." : "Impor CSV"}
                </Button>
            </div>

            {status && (
                <Alert
                    variant={status.type === "success" ? "default" : "destructive"}
                    className={
                        status.type === "success"
                            ? "border-green-500/50 text-green-600 dark:text-green-500 [&>svg]:text-green-600"
                            : ""
                    }
                >
                    {status.type === "success" ? (
                        <CheckCircle className="h-4 w-4" />
                    ) : (
                        <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>{status.type === "success" ? "Berhasil" : "Galat"}</AlertTitle>
                    <AlertDescription>
                        {status.message}
                        {status.details && status.details.length > 0 && (
                            <ul className="mt-2 text-xs list-disc pl-5 opacity-90">
                                {status.details.slice(0, 5).map((err) => (
                                    <li key={err}>{err}</li>
                                ))}
                                {status.details.length > 5 && (
                                    <li>...and {status.details.length - 5} more errors</li>
                                )}
                            </ul>
                        )}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
