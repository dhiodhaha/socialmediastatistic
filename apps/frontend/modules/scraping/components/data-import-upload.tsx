"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, Download, AlertCircle, CheckCircle, FileSpreadsheet } from "lucide-react";
import { Button } from "@/shared/components/catalyst/button";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Dialog, DialogDescription, DialogTitle } from "@/shared/components/catalyst/dialog";
import { bulkImportSnapshots, type SnapshotImportInput } from "@/modules/scraping/actions/data-import.actions";

// Template is generated client-side (free - no server call)
const IMPORT_TEMPLATE = `account_username,platform,scraped_at,followers,following,posts,engagement,likes
kemenkeuri,INSTAGRAM,2024-11-30,500000,100,2500,1.5,
kemenkeuri,TIKTOK,2024-11-30,250000,,1200,,10000000`;

export function DataImportUpload() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string, details?: string[] } | null>(null);

    const handleDownloadTemplate = () => {
        // Pure client-side - no server cost
        const blob = new Blob([IMPORT_TEMPLATE], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "import_template.csv";
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
            dynamicTyping: true, // Auto-convert numbers
            complete: async (results) => {
                try {
                    const snapshots: SnapshotImportInput[] = [];

                    interface CsvRow {
                        account_username?: string;
                        platform?: string;
                        scraped_at?: string;
                        followers?: number;
                        following?: number;
                        posts?: number;
                        engagement?: number;
                        likes?: number;
                    }

                    for (const row of results.data as CsvRow[]) {
                        if (!row.account_username || !row.platform || !row.scraped_at || row.followers === undefined) {
                            continue;
                        }

                        snapshots.push({
                            // Remove @ from username if present
                            account_username: String(row.account_username).replace(/^@/, ''),
                            platform: String(row.platform),
                            scraped_at: String(row.scraped_at),
                            followers: Number(row.followers),
                            following: row.following ?? null,
                            posts: row.posts ?? null,
                            engagement: row.engagement ?? null,
                            likes: row.likes ?? null,
                        });
                    }

                    if (snapshots.length === 0) {
                        setStatus({ type: 'error', message: "No valid rows found. Ensure required headers: account_username, platform, scraped_at, followers" });
                        setLoading(false);
                        return;
                    }

                    const result = await bulkImportSnapshots(snapshots);

                    if (result.success) {
                        setStatus({
                            type: result.imported > 0 ? 'success' : 'error',
                            message: `Imported ${result.imported} snapshots. Skipped ${result.skipped}.`,
                            details: result.errors
                        });
                        if (fileInputRef.current) fileInputRef.current.value = "";
                    } else {
                        setStatus({ type: 'error', message: "Import failed" });
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
        <>
            <Button outline onClick={() => setOpen(true)}>
                <Upload className="w-4 h-4" data-slot="icon" />
                Upload
            </Button>

            <Dialog open={open} onClose={setOpen}>
                <DialogTitle>Import Historical Data</DialogTitle>
                <DialogDescription>
                    Upload a CSV file containing snapshot data to import into the system.
                </DialogDescription>

                <div className="mt-4 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Button outline onClick={handleDownloadTemplate}>
                            <Download className="w-4 h-4" data-slot="icon" />
                            Download Template
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Use this template to format your data.
                        </span>
                    </div>

                    <div className="border-t pt-4">
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className="w-full justify-center"
                        >
                            <Upload className="w-4 h-4" data-slot="icon" />
                            {loading ? "Importing..." : "Select CSV File"}
                        </Button>
                    </div>

                    {status && (
                        <Alert variant={status.type === 'success' ? 'default' : 'destructive'} className={status.type === 'success' ? 'border-green-500/50 text-green-600 dark:text-green-500 [&>svg]:text-green-600' : ''}>
                            {status.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            <AlertTitle>{status.type === 'success' ? "Success" : "Error"}</AlertTitle>
                            <AlertDescription>
                                {status.message}
                                {status.details && status.details.length > 0 && (
                                    <ul className="mt-2 text-xs list-disc pl-5 opacity-90 max-h-32 overflow-y-auto">
                                        {status.details.slice(0, 10).map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                        {status.details.length > 10 && <li>...and {status.details.length - 10} more</li>}
                                    </ul>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="text-xs text-muted-foreground border-t pt-4">
                        <p className="font-medium mb-1">Required columns:</p>
                        <code className="bg-muted p-1 rounded">account_username, platform, scraped_at, followers</code>
                        <p className="font-medium mt-2 mb-1">Optional columns:</p>
                        <code className="bg-muted p-1 rounded">following, posts, engagement, likes</code>
                    </div>
                </div>
            </Dialog>
        </>
    );
}
