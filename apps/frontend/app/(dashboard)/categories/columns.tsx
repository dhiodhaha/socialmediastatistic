"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { deleteCategory } from "@/app/actions/category";
import { CategoryDialog } from "@/components/category-dialog";
import { toast } from "sonner";

export type Category = {
    id: string;
    name: string;
    createdAt: Date;
    _count: {
        accounts: number;
    };
};

export const columns: ColumnDef<Category>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "_count.accounts",
        header: "Accounts",
        cell: ({ row }) => {
            return <span>{row.original._count.accounts}</span>;
        }
    },
    {
        accessorKey: "createdAt",
        header: "Created At",
        cell: ({ row }) => {
            return new Date(row.original.createdAt).toLocaleDateString();
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const category = row.original;
            // eslint-disable-next-line
            const [openEdit, setOpenEdit] = useState(false);

            const handleDelete = async () => {
                const confirmed = confirm(`Are you sure you want to delete "${category.name}"?`);
                if (!confirmed) return;

                const result = await deleteCategory(category.id);
                if (result.success) {
                    toast.success("Category deleted");
                } else {
                    toast.error(result.error || "Failed to delete");
                }
            };

            return (
                <>
                    <CategoryDialog
                        open={openEdit}
                        onOpenChange={setOpenEdit}
                        mode="edit"
                        defaultValues={{ id: category.id, name: category.name }}
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
                            <DropdownMenuItem onClick={() => setOpenEdit(true)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                                <Trash className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            );
        },
    },
];
