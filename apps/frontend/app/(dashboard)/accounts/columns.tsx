"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { deleteAccount } from "@/app/actions";
import { useState } from "react";
import { AccountDialog } from "@/components/account-dialog";

// Define the shape of our data (must match Prisma Account model)
export type Account = {
    id: string;
    username: string; // Display Name
    instagram: string | null;
    tiktok: string | null;
    twitter: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    growth?: number | null;
};

const HandleLink = ({ handle, urlPrefix }: { handle: string | null, urlPrefix: string }) => {
    if (!handle) return <span className="text-muted-foreground text-xs">N/A</span>;
    return (
        <a href={`${urlPrefix}${handle}`} target="_blank" rel="noopener noreferrer" className="flex items-center hover:underline text-sm">
            {handle}
            <ExternalLink className="ml-1 h-3 w-3 opacity-50" />
        </a>
    );
};

export const columns: ColumnDef<Account>[] = [
    {
        accessorKey: "username",
        header: "Name",
        cell: ({ row }) => <span className="font-medium">{row.getValue("username")}</span>,
    },
    {
        accessorKey: "growth",
        header: "Growth",
        cell: ({ row }) => {
            const growth = row.original.growth;
            if (growth === null || growth === undefined) return <span className="text-muted-foreground text-xs">-</span>;

            const isPositive = growth > 0;
            const isNegative = growth < 0;

            return (
                <span className={`text-xs font-semibold ${isPositive ? "text-green-600" : isNegative ? "text-red-500" : "text-gray-500"}`}>
                    {isPositive ? "+" : ""}{growth.toFixed(1)}%
                </span>
            );
        }
    },
    {
        accessorKey: "instagram",
        header: "Instagram",
        cell: ({ row }) => <HandleLink handle={row.getValue("instagram")} urlPrefix="https://instagram.com/" />,
    },
    {
        accessorKey: "tiktok",
        header: "TikTok",
        cell: ({ row }) => <HandleLink handle={row.getValue("tiktok")} urlPrefix="https://tiktok.com/@" />,
    },
    {
        accessorKey: "twitter",
        header: "X / Twitter",
        cell: ({ row }) => <HandleLink handle={row.getValue("twitter")} urlPrefix="https://x.com/" />,
    },
    {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => {
            const isActive = row.getValue("isActive");
            return (
                <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-500 hover:bg-green-600" : ""}>
                    {isActive ? "Active" : "Inactive"}
                </Badge>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => <AccountActionsCell account={row.original} />,
    },
];

function AccountActionsCell({ account }: { account: Account }) {
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleDelete = async () => {
        if (confirm(`Are you sure you want to delete ${account.username}?`)) {
            await deleteAccount(account.id);
        }
    };

    return (
        <>
            <AccountDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                mode="edit"
                defaultValues={{
                    username: account.username,
                    instagram: account.instagram || "",
                    tiktok: account.tiktok || "",
                    twitter: account.twitter || "",
                    isActive: account.isActive
                }}
                accountId={account.id}
            />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}>Edit Details</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                        Delete Account
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
