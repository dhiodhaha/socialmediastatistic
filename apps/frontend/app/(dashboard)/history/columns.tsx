"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

// We need to define the type based on Prisma model, but for now we can infer or define interface
// Importing from database package might be tricky client side if not careful with types
// So let's define a local interface matching the expected data
interface ScrapingJob {
    id: string;
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
    totalAccounts: number;
    completedCount: number;
    failedCount: number;
    startedAt: Date | string | null;
    completedAt: Date | string | null;
    createdAt: Date | string;
}

export const columns: ColumnDef<ScrapingJob>[] = [
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            return (
                <Badge
                    variant={
                        status === "COMPLETED"
                            ? "default" // default is primary (black/white)
                            : status === "FAILED"
                                ? "destructive"
                                : status === "RUNNING"
                                    ? "secondary" // blueish usually or secondary
                                    : "outline"
                    }
                    className={
                        status === "COMPLETED"
                            ? "bg-green-500 hover:bg-green-600" // Override for green success
                            : ""
                    }
                >
                    {status}
                </Badge>
            );
        },
    },
    {
        accessorKey: "createdAt",
        header: "Triggered",
        cell: ({ row }) => {
            const date = new Date(row.getValue("createdAt"));
            return <span>{formatDistanceToNow(date, { addSuffix: true })}</span>;
        },
    },
    {
        accessorKey: "startedAt",
        header: "Started",
        cell: ({ row }) => {
            const val = row.getValue("startedAt");
            if (!val) return <span className="text-muted-foreground">-</span>;
            return <span suppressHydrationWarning>{new Date(val as string).toLocaleString()}</span>;
        },
    },
    {
        accessorKey: "completedAt",
        header: "Completed",
        cell: ({ row }) => {
            const val = row.getValue("completedAt");
            if (!val) return <span className="text-muted-foreground">-</span>;
            return <span suppressHydrationWarning>{new Date(val as string).toLocaleString()}</span>;
        },
    },
    {
        accessorKey: "totalAccounts",
        header: "Total",
    },
    {
        accessorKey: "completedCount",
        header: "Success",
        cell: ({ row }) => (
            <span className="text-green-600 font-medium">
                {row.getValue("completedCount")}
            </span>
        ),
    },
    {
        accessorKey: "failedCount",
        header: "Failed",
        cell: ({ row }) => {
            const count = row.getValue("failedCount") as number;
            return (
                <span className={count > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                    {count}
                </span>
            );
        },
    },
];
