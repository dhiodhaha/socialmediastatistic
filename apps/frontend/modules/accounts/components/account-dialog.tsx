"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useEffect, useState } from "react";
import { type UseFormRegisterReturn, useForm } from "react-hook-form";
import { createAccount, updateAccount } from "@/modules/accounts/actions/account.actions";
import { getCategories } from "@/modules/categories/actions/category.actions";
import { Button } from "@/shared/components/catalyst/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { type AccountFormInput, type AccountInput, accountSchema } from "@/shared/lib/schemas";
import { cn } from "@/shared/lib/utils";

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
    const [categorySearch, setCategorySearch] = useState("");

    useEffect(() => {
        if (isOpen) {
            getCategories().then((res) => {
                if (res.success && res.data) {
                    setCategories(res.data);
                }
            });
        }
    }, [isOpen]);

    // Track selected categories for multi-select
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
        defaultValues?.categoryIds || [],
    );
    const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
    } = useForm<AccountFormInput>({
        resolver: standardSchemaResolver(accountSchema),
        defaultValues: {
            username: defaultValues?.username || "",
            instagram: defaultValues?.instagram || "",
            tiktok: defaultValues?.tiktok || "",
            twitter: defaultValues?.twitter || "",
            categoryIds: defaultValues?.categoryIds || [],
            isActive: defaultValues?.isActive ?? true,
        },
    });

    // Sync selectedCategoryIds with form
    useEffect(() => {
        setValue("categoryIds", selectedCategoryIds);
    }, [selectedCategoryIds, setValue]);

    useEffect(() => {
        setValue("isActive", isActive);
    }, [isActive, setValue]);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedCategoryIds(defaultValues?.categoryIds || []);
        setIsActive(defaultValues?.isActive ?? true);
        setCategorySearch("");
    }, [isOpen, defaultValues?.categoryIds, defaultValues?.isActive]);

    const toggleCategory = (categoryId: string) => {
        setSelectedCategoryIds((prev) =>
            prev.includes(categoryId)
                ? prev.filter((id) => id !== categoryId)
                : [...prev, categoryId],
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
            let result: { success: boolean; data?: unknown; error?: string } | undefined;
            if (mode === "create") {
                result = await createAccount(payload);
            } else if (mode === "edit" && accountId) {
                result = await updateAccount(accountId, payload);
            }

            if (result?.success) {
                setIsOpen?.(false);
                if (mode === "create") {
                    reset();
                    setSelectedCategoryIds([]);
                    setIsActive(true);
                    setCategorySearch("");
                }
            } else {
                setError(result?.error || "Terjadi kendala yang tidak diketahui");
            }
        } catch {
            setError("Terjadi kendala");
        } finally {
            setLoading(false);
        }
    };

    const selectedCategories = categories.filter((category) =>
        selectedCategoryIds.includes(category.id),
    );
    const filteredCategories = categories.filter((category) =>
        category.name.toLowerCase().includes(categorySearch.toLowerCase().trim()),
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "create" ? "Tambah akun laporan" : "Edit akun laporan"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "create"
                            ? "Isi nama akun, handle platform, dan grup pelaporan. Satu akun bisa masuk beberapa grup tanpa scraping berulang."
                            : "Perbarui nama akun, handle platform, dan grup pelaporan."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <section className="space-y-4">
                        <div>
                            <div className="text-base/7 font-medium text-zinc-950 sm:text-sm/6 dark:text-white">
                                Identitas akun
                            </div>
                            <p className="mt-1 text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                                Nama ini yang akan muncul di tabel dan PDF.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">Nama akun</Label>
                            <Input
                                id="username"
                                {...register("username")}
                                placeholder="Contoh: Brand Contoh Indonesia"
                            />
                            {errors.username && (
                                <p className="text-sm text-destructive mt-1">
                                    {errors.username.message}
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="space-y-4 border-t border-zinc-950/10 pt-5 dark:border-white/10">
                        <div>
                            <div className="text-base/7 font-medium text-zinc-950 sm:text-sm/6 dark:text-white">
                                Handle platform
                            </div>
                            <p className="mt-1 text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                                Isi tanpa @. Kosongkan platform yang tidak dipakai.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <PlatformHandleField
                                id="instagram"
                                label="Instagram"
                                placeholder="brandcontoh"
                                register={register("instagram")}
                            />
                            <PlatformHandleField
                                id="tiktok"
                                label="TikTok"
                                placeholder="brandcontoh_id"
                                register={register("tiktok")}
                            />
                            <PlatformHandleField
                                id="twitter"
                                label="Twitter / X"
                                placeholder="brandcontoh"
                                register={register("twitter")}
                            />
                        </div>
                    </section>

                    <section className="space-y-4 border-t border-zinc-950/10 pt-5 dark:border-white/10">
                        <div>
                            <div className="text-base/7 font-medium text-zinc-950 sm:text-sm/6 dark:text-white">
                                Grup laporan
                            </div>
                            <p className="mt-1 text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                                Grup hanya untuk filter laporan. Tidak membuat akun ini diambil
                                berkali-kali.
                            </p>
                        </div>

                        {selectedCategories.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => toggleCategory(category.id)}
                                        className="rounded-full bg-blue-50 px-3 py-1 text-base/7 font-medium text-blue-800 ring-1 ring-blue-600/20 sm:text-sm/6 dark:bg-blue-950/30 dark:text-blue-100"
                                    >
                                        {category.name} ×
                                    </button>
                                ))}
                            </div>
                        )}

                        <Input
                            value={categorySearch}
                            onChange={(event) => setCategorySearch(event.target.value)}
                            placeholder="Cari grup laporan..."
                        />

                        <div className="max-h-52 overflow-y-auto rounded-2xl border border-zinc-950/10 p-2 dark:border-white/10">
                            {filteredCategories.length === 0 ? (
                                <p className="px-3 py-6 text-center text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                                    Tidak ada grup laporan ditemukan.
                                </p>
                            ) : (
                                filteredCategories.map((cat) => {
                                    const selected = selectedCategoryIds.includes(cat.id);
                                    return (
                                        <label
                                            key={cat.id}
                                            htmlFor={`cat-${cat.id}`}
                                            className={cn(
                                                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition",
                                                selected
                                                    ? "bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-100"
                                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-950",
                                            )}
                                        >
                                            <Checkbox
                                                id={`cat-${cat.id}`}
                                                checked={selected}
                                                onCheckedChange={() => toggleCategory(cat.id)}
                                            />
                                            <span className="text-base/7 font-medium sm:text-sm/6">
                                                {cat.name}
                                            </span>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <section className="border-t border-zinc-950/10 pt-5 dark:border-white/10">
                        <label
                            htmlFor="isActive"
                            className="flex cursor-pointer items-start gap-3 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-950/5 dark:bg-zinc-950 dark:ring-white/10"
                        >
                            <Checkbox
                                id="isActive"
                                checked={isActive}
                                onCheckedChange={(checked) => setIsActive(checked === true)}
                            />
                            <span>
                                <span className="block text-base/7 font-medium text-zinc-950 sm:text-sm/6 dark:text-white">
                                    Aktif untuk scraping dan laporan
                                </span>
                                <span className="block text-base/7 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
                                    Nonaktifkan jika akun tidak perlu ikut proses laporan.
                                </span>
                            </span>
                        </label>
                    </section>

                    {error && <p className="text-center text-sm text-destructive">{error}</p>}

                    <DialogFooter className="border-t border-zinc-950/10 pt-5 dark:border-white/10">
                        <Button type="submit" disabled={loading}>
                            {loading ? "Menyimpan..." : "Simpan perubahan"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PlatformHandleField({
    id,
    label,
    placeholder,
    register,
}: {
    id: string;
    label: string;
    placeholder: string;
    register: UseFormRegisterReturn;
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} {...register} placeholder={placeholder} />
        </div>
    );
}
