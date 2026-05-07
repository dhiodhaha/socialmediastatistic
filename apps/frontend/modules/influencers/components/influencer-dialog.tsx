"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/catalyst/button";
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
import { Textarea } from "@/shared/components/ui/textarea";
import { createInfluencer, updateInfluencer } from "../actions/influencer.actions";
import { influencerSchema } from "../lib/influencer-schemas";
import { SENTIMENT_LABELS, SIZE_LABELS } from "../lib/influencer-taxonomy";

type InfluencerDialogInitialValues = {
    id?: string;
    name?: string | null;
    displayAlias?: string | null;
    note?: string | null;
    size?: string | null;
    professionInstitution?: string | null;
    profileSentiment?: string | null;
    canonicalUrl?: string | null;
    instagramHandle?: string | null;
    tiktokHandle?: string | null;
    twitterHandle?: string | null;
    threadsHandle?: string | null;
    youtubeHandle?: string | null;
    topics?: string[];
    isActive?: boolean;
};

export function InfluencerDialog({
    trigger,
    initialValues,
    open: controlledOpen,
    onOpenChange,
}: {
    trigger?: React.ReactNode;
    initialValues?: InfluencerDialogInitialValues;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const isEdit = Boolean(initialValues?.id);
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = onOpenChange ?? setUncontrolledOpen;

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);

        try {
            const payload = influencerSchema.parse({
                name: String(formData.get("name") || ""),
                displayAlias: String(formData.get("displayAlias") || ""),
                note: String(formData.get("note") || ""),
                size: nullableSelectValue(formData.get("size")),
                professionInstitution: String(formData.get("professionInstitution") || ""),
                profileSentiment: nullableSelectValue(formData.get("profileSentiment")),
                canonicalUrl: String(formData.get("canonicalUrl") || ""),
                instagramHandle: String(formData.get("instagramHandle") || ""),
                tiktokHandle: String(formData.get("tiktokHandle") || ""),
                twitterHandle: String(formData.get("twitterHandle") || ""),
                threadsHandle: String(formData.get("threadsHandle") || ""),
                youtubeHandle: String(formData.get("youtubeHandle") || ""),
                topics: String(formData.get("topics") || "")
                    .split(/[,;/\n]+/)
                    .map((value) => value.trim())
                    .filter(Boolean),
                isActive: formData.get("isActive") === "on",
            });

            const result =
                isEdit && initialValues?.id
                    ? await updateInfluencer(initialValues.id, payload)
                    : await createInfluencer(payload);

            if (result.success) {
                toast.success(isEdit ? "Influencer diperbarui." : "Influencer dibuat.");
                setOpen(false);
            } else {
                toast.error(
                    result.error ||
                        (isEdit ? "Gagal memperbarui influencer." : "Gagal membuat influencer."),
                );
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Payload influencer tidak valid.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit influencer" : "Create influencer"}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? "Perbarui profil untuk riwayat scrape dan analisis profil otomatis."
                            : "Tambahkan profil untuk riwayat scrape dan analisis profil otomatis."}
                    </DialogDescription>
                </DialogHeader>

                <form action={handleSubmit} className="grid gap-5 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Nama">
                            <Input
                                name="name"
                                placeholder="Nama influencer"
                                defaultValue={initialValues?.name ?? ""}
                                required
                            />
                        </Field>
                        <Field label="Alias tampilan">
                            <Input
                                name="displayAlias"
                                placeholder="Alias opsional"
                                defaultValue={initialValues?.displayAlias ?? ""}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Ukuran">
                            <select
                                name="size"
                                defaultValue={initialValues?.size ?? "NONE"}
                                className="h-10 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                            >
                                <option value="NONE">Tidak ditetapkan</option>
                                {Object.entries(SIZE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Sentimen profil">
                            <select
                                name="profileSentiment"
                                defaultValue={initialValues?.profileSentiment ?? "NONE"}
                                className="h-10 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                            >
                                <option value="NONE">Belum ditetapkan</option>
                                {Object.entries(SENTIMENT_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Aktif">
                            <label className="flex h-10 items-center gap-3 rounded-md border px-3 text-sm">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    defaultChecked={initialValues?.isActive ?? true}
                                />
                                <span>Masuk daftar aktif</span>
                            </label>
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Institusi / profesi">
                            <Input
                                name="professionInstitution"
                                placeholder="Peneliti, artis, organisasi..."
                                defaultValue={initialValues?.professionInstitution ?? ""}
                            />
                        </Field>
                        <Field label="URL utama">
                            <Input
                                name="canonicalUrl"
                                placeholder="https://example.com/profile"
                                defaultValue={initialValues?.canonicalUrl ?? ""}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-5">
                        <Field label="Instagram">
                            <Input
                                name="instagramHandle"
                                placeholder="handle"
                                defaultValue={initialValues?.instagramHandle ?? ""}
                            />
                        </Field>
                        <Field label="TikTok">
                            <Input
                                name="tiktokHandle"
                                placeholder="handle"
                                defaultValue={initialValues?.tiktokHandle ?? ""}
                            />
                        </Field>
                        <Field label="X">
                            <Input
                                name="twitterHandle"
                                placeholder="handle"
                                defaultValue={initialValues?.twitterHandle ?? ""}
                            />
                        </Field>
                        <Field label="Threads">
                            <Input
                                name="threadsHandle"
                                placeholder="handle"
                                defaultValue={initialValues?.threadsHandle ?? ""}
                            />
                        </Field>
                        <Field label="YouTube">
                            <Input
                                name="youtubeHandle"
                                placeholder="handle"
                                defaultValue={initialValues?.youtubeHandle ?? ""}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Topik (pisahkan dengan koma)">
                            <Input
                                name="topics"
                                placeholder="Ekonomi, UMKM, pendidikan"
                                defaultValue={(initialValues?.topics ?? []).join(", ")}
                            />
                        </Field>
                        <Field label="Catatan">
                            <Textarea
                                name="note"
                                placeholder="Catatan operasional, sumber, atau konteks..."
                                rows={4}
                                defaultValue={initialValues?.note ?? ""}
                            />
                        </Field>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading
                                ? "Menyimpan..."
                                : isEdit
                                  ? "Simpan perubahan"
                                  : "Simpan influencer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            {children}
        </div>
    );
}

function nullableSelectValue(value: FormDataEntryValue | null) {
    if (!value) {
        return null;
    }

    const stringValue = String(value);
    return stringValue === "NONE" ? null : stringValue;
}
