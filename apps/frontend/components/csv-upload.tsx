"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { bulkCreateAccounts } from "@/app/actions/account";
import { type AccountInput } from "@/lib/schemas";

// Used simple div for alerts instead of components

export function CsvUpload() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string, details?: string[] } | null>(null);

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
                        name?: string; Name?: string;
                        instagram?: string; Instagram?: string;
                        tiktok?: string; TikTok?: string;

                        x?: string; X?: string; twitter?: string; Twitter?: string;
                        category?: string; Category?: string;
                    }
                    for (const row of results.data as CsvRow[]) {
                        if (!row.name && !row.Name) continue; // Name is required

                        const clean = (val?: string) => {
                            if (!val) return null;
                            const lower = val.toLowerCase().trim();
                            if (lower === 'n/a' || lower === 'na' || lower === '-') return null;
                            return val.trim();
                        };

                        accounts.push({
                            username: row.name || row.Name || "",
                            instagram: clean(row.instagram || row.Instagram),
                            tiktok: clean(row.tiktok || row.TikTok),
                            twitter: clean(row.x || row.X || row.twitter || row.Twitter),
                            categoryName: clean(row.category || row.Category) || undefined,
                            isActive: true,
                        });
                    }

                    if (accounts.length === 0) {
                        setStatus({ type: 'error', message: "No valid accounts found. Ensure headers: name, tiktok, instagram, x" });
                        setLoading(false);
                        return;
                    }

                    const result = await bulkCreateAccounts(accounts);

                    if (result.success) {
                        setStatus({
                            type: 'success',
                            message: `Successfully imported ${result.count} accounts.`,
                            details: result.errors
                        });
                        if (fileInputRef.current) fileInputRef.current.value = "";
                    } else {
                        setStatus({ type: 'error', message: result.error || "Upload failed" });
                    }

                } catch (error) {
                    console.error(error);
                    setStatus({ type: 'error', message: "Failed to parse or upload CSV." });
                } finally {
                    setLoading(false);
                }
            },
            error: (error) => {
                setStatus({ type: 'error', message: "CSV Parsing Error: " + error.message });
                setLoading(false);
            }
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
                <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                >
                    <Upload className="mr-2 h-4 w-4" />
                    {loading ? "Uploading..." : "Import CSV"}
                </Button>
                <span className="text-xs text-muted-foreground">
                    Headers: name, tiktok, instagram, x, category
                </span>
            </div>

            {status && (
                <Alert variant={status.type === 'success' ? 'default' : 'destructive'} className={status.type === 'success' ? 'border-green-500/50 text-green-600 dark:text-green-500 [&>svg]:text-green-600' : ''}>
                    {status.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertTitle>{status.type === 'success' ? "Success" : "Error"}</AlertTitle>
                    <AlertDescription>
                        {status.message}
                        {status.details && status.details.length > 0 && (
                            <ul className="mt-2 text-xs list-disc pl-5 opacity-90">
                                {status.details.slice(0, 5).map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                                {status.details.length > 5 && <li>...and {status.details.length - 5} more errors</li>}
                            </ul>
                        )}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
