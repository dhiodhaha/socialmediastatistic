"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { deleteScrapingJob } from "@/app/actions/history";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

function DeleteButton({ jobId }: { jobId: string }) {
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm("Delete this job and all associated snapshot data?")) return;

        const result = await deleteScrapingJob(jobId);
        if (result.success) {
            toast.success("Job deleted successfully");
            router.refresh();
        } else {
            toast.error(result.error || "Failed to delete job");
        }
    };

    return (
        <Button variant="ghost" size="icon" onClick={handleDelete} className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
        </Button>
    );
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
    {
        id: "actions",
        header: "",
        cell: ({ row }) => <DeleteButton jobId={row.original.id} />,
    },
];
