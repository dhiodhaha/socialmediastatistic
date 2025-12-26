"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { createAccount, updateAccount } from "@/app/actions/account";
import { getCategories } from "@/app/actions/category";
import { accountSchema, type AccountInput, type AccountFormInput } from "@/lib/schemas";


import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";

interface AccountDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    mode?: "create" | "edit";
    defaultValues?: Partial<AccountInput>;
    accountId?: string;
    trigger?: React.ReactNode;
}

export function AccountDialog({
    open,
    onOpenChange,
    mode = "create",
    defaultValues,
    accountId,
    trigger,
}: AccountDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const setIsOpen = isControlled ? onOpenChange : setInternalOpen;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        if (isOpen) {
            getCategories().then((res) => {
                if (res.success && res.data) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setCategories(res.data as any[]);
                }
            });
        }
    }, [isOpen]);

    // Track selected categories for multi-select
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
        (defaultValues as any)?.categoryIds || []
    );

    const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<AccountFormInput>({
        resolver: standardSchemaResolver(accountSchema),
        defaultValues: {
            username: defaultValues?.username || "",
            instagram: defaultValues?.instagram || "",
            tiktok: defaultValues?.tiktok || "",
            twitter: defaultValues?.twitter || "",
            categoryIds: (defaultValues as any)?.categoryIds || [],
            isActive: defaultValues?.isActive ?? true,
        },
    });

    // Sync selectedCategoryIds with form
    useEffect(() => {
        setValue("categoryIds", selectedCategoryIds);
    }, [selectedCategoryIds, setValue]);

    const toggleCategory = (categoryId: string) => {
        setSelectedCategoryIds(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const onSubmit = async (formData: AccountFormInput) => {
        setLoading(true);
        setError("");

        // Parse with zod to apply defaults and get AccountInput type
        const data: AccountInput = accountSchema.parse(formData);

        // Cleanup empty strings to null/undefined if necessary, or handled by server action validation
        const payload = {
            ...data,
            instagram: data.instagram || null,
            tiktok: data.tiktok || null,
            twitter: data.twitter || null,
        };

        try {
            let result;
            if (mode === "create") {
                result = await createAccount(payload);
            } else if (mode === "edit" && accountId) {
                result = await updateAccount(accountId, payload);
            }

            if (result?.success) {
                setIsOpen?.(false);
                if (mode === "create") reset();
            } else {
                setError(result?.error || "An unknown error occurred");
            }
        } catch {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{mode === "create" ? "Add Account" : "Edit Account"}</DialogTitle>
                    <DialogDescription>
                        {mode === "create"
                            ? "Enter the account name and associated social media handles."
                            : "Update the account details."}
                    </DialogDescription>
                </DialogHeader>

                {/* NOTE: We are manually wiring this for now, but in a real Shadcn Form we would use FormField */}
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="username" className="text-right">
                            Name
                        </Label>
                        <div className="col-span-3">
                            <Input id="username" {...register("username")} placeholder="Kementerian X" />
                            {errors.username && <p className="text-sm text-destructive mt-1">{errors.username.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="instagram" className="text-right">
                            Instagram
                        </Label>
                        <div className="col-span-3">
                            <Input id="instagram" {...register("instagram")} placeholder="handle" />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tiktok" className="text-right">
                            TikTok
                        </Label>
                        <div className="col-span-3">
                            <Input id="tiktok" {...register("tiktok")} placeholder="handle" />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="twitter" className="text-right">
                            X (Twitter)
                        </Label>
                        <div className="col-span-3">
                            <Input id="twitter" {...register("twitter")} placeholder="handle" />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">
                            Categories
                        </Label>
                        <div className="col-span-3 space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                            {categories.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No categories available</p>
                            ) : (
                                categories.map((cat) => (
                                    <div key={cat.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`cat-${cat.id}`}
                                            checked={selectedCategoryIds.includes(cat.id)}
                                            onCheckedChange={() => toggleCategory(cat.id)}
                                        />
                                        <label
                                            htmlFor={`cat-${cat.id}`}
                                            className="text-sm font-medium leading-none cursor-pointer"
                                        >
                                            {cat.name}
                                        </label>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="isActive" className="text-right">
                            Active
                        </Label>
                        <div className="col-span-3 flex items-center space-x-2">
                            <Checkbox
                                id="isActive"
                                defaultChecked={defaultValues?.isActive ?? true}
                                onCheckedChange={(checked) => {
                                    // Manually handle checkbox update since we aren't using full FormField
                                    // but we can register a hidden input or just rely on react-hook-form's setValue if we had it
                                    // A simpler way for this refactor without rewriting the whole form to FormField:
                                    const input = document.getElementById('isActive-hidden') as HTMLInputElement;
                                    if (input) {
                                        input.checked = checked === true;
                                        input.dispatchEvent(new Event('change', { bubbles: true }));
                                    }
                                }}
                            />
                            {/* Hidden input to bind with register since Shadcn Checkbox doesn't forward ref easily without FormField */}
                            <input type="checkbox" id="isActive-hidden" {...register("isActive")} className="hidden" />

                            <label htmlFor="isActive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Enable tracking
                            </label>
                        </div>
                    </div>

                    {error && <p className="text-center text-sm text-destructive">{error}</p>}

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save changes"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
