"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import * as z from "zod";
import { createCategory, updateCategory } from "@/modules/categories/actions/category.actions";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/catalyst/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { toast } from "sonner";

const categorySchema = z.object({
    name: z.string().min(1, "Name is required"),
});

type CategoryInput = z.infer<typeof categorySchema>;

interface CategoryDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    mode?: "create" | "edit";
    defaultValues?: { id?: string; name: string };
    trigger?: React.ReactNode;
}

export function CategoryDialog({
    open,
    onOpenChange,
    mode = "create",
    defaultValues,
    trigger,
}: CategoryDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const setIsOpen = isControlled ? onOpenChange : setInternalOpen;
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<CategoryInput>({
        resolver: standardSchemaResolver(categorySchema),
        defaultValues: {
            name: defaultValues?.name || "",
        },
    });

    useEffect(() => {
        if (isOpen && defaultValues) {
            setValue("name", defaultValues.name);
        } else if (isOpen && mode === "create") {
            reset();
        }
    }, [isOpen, defaultValues, mode, setValue, reset]);

    const onSubmit = async (data: CategoryInput) => {
        setLoading(true);

        try {
            let result;
            if (mode === "create") {
                result = await createCategory(data.name);
            } else if (mode === "edit" && defaultValues?.id) {
                result = await updateCategory(defaultValues.id, data.name);
            }

            if (result?.success) {
                setIsOpen?.(false);
                if (mode === "create") reset();
                toast.success(mode === "create" ? "Category created" : "Category updated");
            } else {
                toast.error(result?.error || "An unknown error occurred");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{mode === "create" ? "Add Category" : "Edit Category"}</DialogTitle>
                    <DialogDescription>
                        {mode === "create"
                            ? "Create a new category for grouping accounts."
                            : "Update the category name."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <div className="col-span-3">
                            <Input id="name" {...register("name")} placeholder="Gov Accounts" />
                            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save changes"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
