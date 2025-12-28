"use client";

import { useMemo } from "react";
import { Table } from "@/components/catalyst/table";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/catalyst/table"; // Assuming Catalyst table parts, but we might just reuse the DataTable component or build a custom table layout for the prototype.
// Actually, let's use the project's existing DataTable or generic table structure but styled with Catalyst. 
// Wait, the project uses a custom DataTable component wrapping tanstack/react-table.
// Let's use the generic DataTable but with our new columns.
// Or better, let's build the prototype page to look exactly like the mockup, potentially using a custom table implementation for maximum control if needed, 
// but `DataTable` is standard. Let's try to use a standard Table from Catalyst if available or the one we refactored.

import { columns, HistoryLog } from "./columns";
import { DataTable } from "@/components/ui/data-table"; // We'll use the existing DataTable for now
import { Button } from "@/components/catalyst/button";
import { Input } from "@/components/catalyst/input";
import { Select } from "@/components/catalyst/select";
import { Search, Download, Play, Upload, Wrench, ChevronDown } from "lucide-react";

// Mock Data
const MOCK_DATA: HistoryLog[] = [
    {
        id: "1",
        status: "SUCCESS",
        platform: "Instagram",
        trigger: "Manual / User",
        triggeredBy: "by Dhafin",
        triggerTime: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4h ago
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        duration: "6s",
        total: 3,
        success: 3,
        failed: 0,
    },
    {
        id: "2",
        status: "FAILED",
        platform: "LinkedIn",
        trigger: "Scheduled Job",
        triggeredBy: "by System",
        triggerTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        duration: "--",
        total: 3,
        success: 0,
        failed: 3,
    },
    {
        id: "3",
        status: "SUCCESS",
        platform: "Twitter",
        trigger: "API Trigger",
        triggeredBy: "by External App",
        triggerTime: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // 1 day ago
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
        duration: "1m 5s",
        total: 33,
        success: 33,
        failed: 0,
    },
    {
        id: "4",
        status: "PARTIAL",
        platform: "Instagram",
        trigger: "Manual / User",
        triggeredBy: "by Admin",
        triggerTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), // 4 days ago
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
        duration: "19s",
        total: 2,
        success: 1,
        failed: 1,
    },
    {
        id: "5",
        status: "SUCCESS",
        platform: "LinkedIn",
        trigger: "Scheduled Job",
        triggeredBy: "by System",
        triggerTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        duration: "45s",
        total: 12,
        success: 12,
        failed: 0,
    }
];

export default function HistoryPrototypePage() {
    const data = useMemo(() => MOCK_DATA, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Scraping History</h1>
                    <p className="text-muted-foreground mt-1">
                        View and manage your automated extraction logs.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button outline>
                        <Upload className="w-4 h-4" data-slot="icon" />
                        Upload
                    </Button>
                    <Button outline>
                        <Wrench className="w-4 h-4" data-slot="icon" />
                        Fix Imports
                    </Button>
                </div>
            </div>

            <div className="p-4 border rounded-lg bg-white dark:bg-zinc-900 space-y-4">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">

                    {/* Left Side: Search */}
                    <div className="relative w-full sm:w-80">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-4 w-4 text-zinc-400" />
                        </div>
                        <Input
                            placeholder="Search logs..."
                            className="pl-9"
                        />
                    </div>

                    {/* Right Side: View Toggles & Actions */}
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-end">

                        {/* View Toggle (Visual Only) */}
                        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700">
                            <button className="p-1.5 rounded bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100">
                                <Search className="w-4 h-4 rotate-90" /> {/* Mocking the List View icon with something available */}
                            </button>
                            <button className="p-1.5 rounded text-zinc-400 hover:text-zinc-600">
                                <Search className="w-4 h-4" /> {/* Mocking Grid Icon */}
                            </button>
                        </div>

                        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

                        <Button plain>
                            <Download className="h-4 w-4 text-zinc-500" data-slot="icon" />
                        </Button>

                        <div className="flex items-center rounded-lg shadow-sm">
                            <Button className="rounded-r-none border-r-0 border-blue-600 bg-blue-600 hover:bg-blue-500 text-white">
                                <Play className="h-4 w-4 fill-current" data-slot="icon" />
                                Run Scraper
                            </Button>
                            <Button className="rounded-l-none px-2 bg-blue-600 hover:bg-blue-500 text-white border-l border-blue-700">
                                <ChevronDown className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="rounded-md border">
                    <DataTable
                        columns={columns}
                        data={data}
                        pageCount={1}
                    // We might need to adjust DataTable to support the styling we want if it's too rigid
                    />
                </div>
            </div>
        </div>
    );
}
