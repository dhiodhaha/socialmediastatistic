"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { deleteAccount } from "@/modules/accounts/actions/account.actions";
import { AccountDialog } from "@/modules/accounts/components/account-dialog";
import { Button } from "@/shared/components/catalyst/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

// Define the shape of our data (must match Prisma Account model with join table)
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
    categories?: Array<{ category: { id: string; name: string } }>;
};

const HandleLink = ({ handle, urlPrefix }: { handle: string | null; urlPrefix: string }) => {
    if (!handle) return <div className="text-base/7 text-zinc-400 sm:text-sm/6">Not set</div>;
    return (
        <a
            href={`${urlPrefix}${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-base/7 hover:underline sm:text-sm/6"
        >
            {handle}
            <ExternalLink className="ml-1 size-3 opacity-50" />
        </a>
    );
};

export const columns: ColumnDef<Account>[] = [
    {
        accessorKey: "username",
        header: "Name",
        cell: ({ row }) => (
            <span
                className="font-medium max-w-[150px] truncate block"
                title={row.getValue("username")}
            >
                {row.getValue("username")}
            </span>
        ),
    },
    {
        accessorKey: "growth",
        header: "Growth",
        cell: ({ row }) => {
            const growth = row.original.growth;
            if (growth === null || growth === undefined)
                return <div className="text-base/7 text-zinc-400 sm:text-sm/6">Not measured</div>;

            const isPositive = growth > 0;
            const isNegative = growth < 0;

            return (
                <div
                    className={`text-base/7 font-semibold sm:text-sm/6 ${isPositive ? "text-green-600" : isNegative ? "text-red-500" : "text-gray-500"}`}
                >
                    {isPositive ? "+" : ""}
                    {growth.toFixed(1)}%
                </div>
            );
        },
    },
    {
        accessorKey: "instagram",
        header: "Instagram",
        cell: ({ row }) => (
            <HandleLink handle={row.getValue("instagram")} urlPrefix="https://instagram.com/" />
        ),
    },
    {
        accessorKey: "tiktok",
        header: "TikTok",
        cell: ({ row }) => (
            <HandleLink handle={row.getValue("tiktok")} urlPrefix="https://tiktok.com/@" />
        ),
    },
    {
        accessorKey: "twitter",
        header: "X / Twitter",
        cell: ({ row }) => (
            <HandleLink handle={row.getValue("twitter")} urlPrefix="https://x.com/" />
        ),
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
                key={account.id}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                mode="edit"
                defaultValues={{
                    username: account.username,
                    instagram: account.instagram || "",
                    tiktok: account.tiktok || "",
                    twitter: account.twitter || "",
                    isActive: account.isActive,
                    categoryIds: account.categories?.map((c) => c.category.id) || [],
                }}
                accountId={account.id}
            />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button plain className="h-8 w-8 p-0">
                        <span className="sr-only">Buka menu</span>
                        <MoreHorizontal className="h-4 w-4" data-slot="icon" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                        Ubah detail
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-red-600 focus:text-red-600"
                    >
                        Hapus akun
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
