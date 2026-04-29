"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteCategory } from "@/modules/categories/actions/category.actions";
import { CategoryDialog } from "@/modules/categories/components/category-dialog";
import { Button } from "@/shared/components/catalyst/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

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
        header: "Grup",
    },
    {
        accessorKey: "_count.accounts",
        header: "Akun",
        cell: ({ row }) => {
            return <span>{row.original._count.accounts}</span>;
        },
    },
    {
        accessorKey: "createdAt",
        header: "Dibuat",
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
                const confirmed = confirm(`Yakin ingin menghapus "${category.name}"?`);
                if (!confirmed) return;

                const result = await deleteCategory(category.id);
                if (result.success) {
                    toast.success("Grup berhasil dihapus");
                } else {
                    toast.error(result.error || "Gagal menghapus");
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
                            <Button plain className="h-8 w-8 p-0">
                                <span className="sr-only">Buka menu</span>
                                <MoreHorizontal className="h-4 w-4" data-slot="icon" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setOpenEdit(true)}>
                                <Pencil className="mr-2 h-4 w-4" /> Ubah
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                                <Trash className="mr-2 h-4 w-4" /> Hapus
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            );
        },
    },
];
