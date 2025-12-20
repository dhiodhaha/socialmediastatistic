"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createAccount, updateAccount, AccountInput } from "@/app/actions";


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

const formSchema = z.object({
    username: z.string().min(1, "Name is required"),
    instagram: z.string().optional().nullable(),
    tiktok: z.string().optional().nullable(),
    twitter: z.string().optional().nullable(),
    isActive: z.boolean(),
});

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

    const { register, handleSubmit, formState: { errors }, reset } = useForm<AccountInput>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: defaultValues?.username || "",
            instagram: defaultValues?.instagram || "",
            tiktok: defaultValues?.tiktok || "",
            twitter: defaultValues?.twitter || "",
            isActive: defaultValues?.isActive ?? true,
        },
    });

    const onSubmit = async (data: AccountInput) => {
        setLoading(true);
        setError("");

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
        } catch (e) {
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
