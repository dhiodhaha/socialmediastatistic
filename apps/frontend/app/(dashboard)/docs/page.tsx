"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/catalyst/button";
import { toast } from "sonner";
import { Download, Copy, FileSpreadsheet, Database, Sparkles, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

// Templates
const ACCOUNT_TEMPLATE = `name,instagram,tiktok,x,category
Kementerian Keuangan,kemenkeuri,kemenkeuri,KemenkeuRI,Lingkungan Kementerian
Sekretariat Kabinet,setkabgoid,,setkabgoid,Lingkungan Kementerian
Menteri Pendidikan,mendikdasmen,mendikdasmen_ri,,Menteri-Menteri`;

const SNAPSHOT_TEMPLATE = `account_username,platform,scraped_at,followers,following,posts,engagement,likes
kemenkeuri,INSTAGRAM,2024-11-30,500000,100,2500,1.5,
kemenkeuri,TIKTOK,2024-11-30,250000,,1200,,10000000
setkabgoid,INSTAGRAM,2024-11-30,300000,50,1800,2.1,`;

// AI Prompts
const ACCOUNT_AI_PROMPT = `I have data about social media accounts that I need to convert to a specific CSV format.

TARGET FORMAT (CSV):
name,instagram,tiktok,x,category

COLUMN DEFINITIONS:
- name: Display name of the account/organization (required)
- instagram: Instagram username (without @)
- tiktok: TikTok username (without @)  
- x: X/Twitter username (without @)
- category: Category name for grouping (e.g., "Kementerian", "BUMN", "Pemerintah Daerah")

MY DATA:
[PASTE YOUR DATA HERE]

Please convert my data to match the target CSV format. If a field is empty or not available, leave it blank. Remove any @ symbols from usernames.`;

const SNAPSHOT_AI_PROMPT = `I have historical social media statistics that I need to convert to a specific CSV format.

TARGET FORMAT (CSV):
account_username,platform,scraped_at,followers,following,posts,engagement,likes

COLUMN DEFINITIONS:
- account_username: The social media handle/username for the specified platform (e.g., "kemenkeuri" for Instagram, without @)
- platform: Must be one of: INSTAGRAM, TIKTOK, or TWITTER (required, uppercase)
- scraped_at: Date in YYYY-MM-DD format, e.g., 2024-11-30 (required)
- followers: Number of followers (required)
- following: Number of accounts being followed (optional)
- posts: Number of posts/videos (optional)
- engagement: Engagement rate as decimal, e.g., 1.5 for 1.5% (optional)
- likes: Total likes count, mainly for TikTok (optional)

MY DATA:
[PASTE YOUR DATA HERE]

Please convert my data to match the target CSV format. Ensure:
1. Platform names are uppercase (INSTAGRAM, TIKTOK, TWITTER)
2. account_username is the social handle for that platform, not the display name
3. Remove @ from usernames
4. Dates are in YYYY-MM-DD format
5. Numbers don't have commas or special formatting
6. Empty optional fields are left blank (not "N/A" or "-")`;

function CopyButton({ text, label }: { text: string; label: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(`${label} copied to clipboard!`);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button outline onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" data-slot="icon" /> : <Copy className="h-4 w-4" data-slot="icon" />}
            {copied ? "Copied!" : "Copy"}
        </Button>
    );
}

function DownloadButton({ content, filename, label }: { content: string; filename: string; label: string }) {
    const handleDownload = () => {
        const blob = new Blob([content], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${label} downloaded!`);
    };

    return (
        <Button onClick={handleDownload}>
            <Download className="h-4 w-4" data-slot="icon" />
            Download Template
        </Button>
    );
}

export default function DocsPage() {
    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold">Documentation</h1>
                <p className="text-muted-foreground mt-1">
                    Learn how to import your data into the system
                </p>
            </div>

            <Tabs defaultValue="accounts" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="accounts" className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Account Import
                    </TabsTrigger>
                    <TabsTrigger value="snapshots" className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Historical Data
                    </TabsTrigger>
                </TabsList>

                {/* Account Import Tab */}
                <TabsContent value="accounts" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Import Template</CardTitle>
                            <CardDescription>
                                Use this template to bulk import social media accounts
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                                <pre>{ACCOUNT_TEMPLATE}</pre>
                            </div>
                            <div className="flex gap-2">
                                <DownloadButton
                                    content={ACCOUNT_TEMPLATE}
                                    filename="account_import_template.csv"
                                    label="Account template"
                                />
                                <CopyButton text={ACCOUNT_TEMPLATE} label="Template" />
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <h4 className="font-medium mb-2">Column Descriptions:</h4>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li><strong>name</strong> - Display name of the account (required)</li>
                                    <li><strong>instagram</strong> - Instagram username without @</li>
                                    <li><strong>tiktok</strong> - TikTok username without @</li>
                                    <li><strong>x</strong> - X/Twitter username without @</li>
                                    <li><strong>category</strong> - Group name for organizing accounts</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/30 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                AI Conversion Prompt
                            </CardTitle>
                            <CardDescription>
                                Copy this prompt and paste it to ChatGPT/Claude with your data to convert it to our format
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-background p-4 rounded-md font-mono text-xs overflow-x-auto border max-h-60 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">{ACCOUNT_AI_PROMPT}</pre>
                            </div>
                            <CopyButton text={ACCOUNT_AI_PROMPT} label="AI Prompt" />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Historical Data Tab */}
                <TabsContent value="snapshots" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historical Data Import Template</CardTitle>
                            <CardDescription>
                                Use this template to import past statistics (snapshots) for existing accounts
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                                <pre>{SNAPSHOT_TEMPLATE}</pre>
                            </div>
                            <div className="flex gap-2">
                                <DownloadButton
                                    content={SNAPSHOT_TEMPLATE}
                                    filename="snapshot_import_template.csv"
                                    label="Snapshot template"
                                />
                                <CopyButton text={SNAPSHOT_TEMPLATE} label="Template" />
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <h4 className="font-medium mb-2">Column Descriptions:</h4>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li><strong>account_username</strong> - Must match an existing account name exactly (required)</li>
                                    <li><strong>platform</strong> - INSTAGRAM, TIKTOK, or TWITTER (required)</li>
                                    <li><strong>scraped_at</strong> - Date in YYYY-MM-DD format (required)</li>
                                    <li><strong>followers</strong> - Number of followers (required)</li>
                                    <li><strong>following</strong> - Number following (optional)</li>
                                    <li><strong>posts</strong> - Number of posts/videos (optional)</li>
                                    <li><strong>engagement</strong> - Engagement rate as decimal (optional)</li>
                                    <li><strong>likes</strong> - Total likes, mainly for TikTok (optional)</li>
                                </ul>
                            </div>

                            <div className="border-t pt-4 mt-4 p-3 bg-amber-500/10 rounded-md border-amber-500/30">
                                <p className="text-sm text-amber-700 dark:text-amber-400">
                                    <strong>⚠️ Important:</strong> The <code>account_username</code> must exactly match an account that already exists in the system. Import accounts first, then import historical data.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/30 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                AI Conversion Prompt
                            </CardTitle>
                            <CardDescription>
                                Copy this prompt and paste it to ChatGPT/Claude with your data to convert it to our format
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-background p-4 rounded-md font-mono text-xs overflow-x-auto border max-h-60 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">{SNAPSHOT_AI_PROMPT}</pre>
                            </div>
                            <CopyButton text={SNAPSHOT_AI_PROMPT} label="AI Prompt" />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* AI Model Recommendations */}
            <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-500" />
                        Recommended AI Models
                    </CardTitle>
                    <CardDescription>
                        These AI models work best for converting your data to our templates
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 rounded-lg bg-background border">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">🏆</span>
                                <h4 className="font-semibold">Best Overall</h4>
                            </div>
                            <ul className="text-sm space-y-2">
                                <li>
                                    <strong>Claude 3.5 Sonnet</strong>
                                    <span className="text-muted-foreground block text-xs">Excellent at understanding data structures and formatting</span>
                                </li>
                                <li>
                                    <strong>GPT-4o</strong>
                                    <span className="text-muted-foreground block text-xs">Great accuracy with tabular data conversion</span>
                                </li>
                            </ul>
                        </div>
                        <div className="p-4 rounded-lg bg-background border">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">💰</span>
                                <h4 className="font-semibold">Free Options</h4>
                            </div>
                            <ul className="text-sm space-y-2">
                                <li>
                                    <strong>ChatGPT Free (GPT-4o mini)</strong>
                                    <span className="text-muted-foreground block text-xs">Good for small datasets (&lt;100 rows)</span>
                                </li>
                                <li>
                                    <strong>Claude.ai Free</strong>
                                    <span className="text-muted-foreground block text-xs">Limited daily messages but high quality</span>
                                </li>
                                <li>
                                    <strong>Google Gemini</strong>
                                    <span className="text-muted-foreground block text-xs">Free tier available at gemini.google.com</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">
                            <strong>💡 Tip:</strong> For large datasets (100+ rows), consider splitting your data into smaller chunks and running the prompt multiple times. Paste each result into the same CSV file before importing.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Start Guide */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Start Guide</CardTitle>
                </CardHeader>
                <CardContent>
                    <ol className="list-decimal list-inside space-y-3 text-sm">
                        <li>
                            <strong>Create Categories</strong> - Go to <code>/categories</code> and create your category groups
                        </li>
                        <li>
                            <strong>Import Accounts</strong> - Download the account template, fill it with your data, and upload at <code>/accounts</code>
                        </li>
                        <li>
                            <strong>Import Historical Data</strong> (Optional) - If you have past statistics, use the historical data template at <code>/history</code>
                        </li>
                        <li>
                            <strong>Start Scraping</strong> - Go to <code>/history</code> and click "Scrape All Accounts" to fetch current data
                        </li>
                        <li>
                            <strong>View Reports</strong> - Navigate to <code>/reports</code> to see comparisons and export PDFs
                        </li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    );
}
