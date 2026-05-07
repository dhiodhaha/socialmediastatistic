"use client";

import type { Platform } from "@repo/database";
import { useMemo, useState } from "react";
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
import {
    batchAddInfluencersFromSources,
    captureInfluencerFromSource,
} from "../actions/influencer.actions";

const DEFAULT_PLATFORM: Platform = "INSTAGRAM";

export function InfluencerSourceDialog({ trigger }: { trigger: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);

        try {
            const result = await captureInfluencerFromSource({
                source: String(formData.get("source") || ""),
                defaultPlatform: String(
                    formData.get("defaultPlatform") || DEFAULT_PLATFORM,
                ) as Platform,
                isActive: formData.get("isActive") === "on",
            });

            if (!result.success || !result.data) {
                toast.error(result.error || "Gagal menangkap profil dari link.");
                return;
            }

            toast.success(
                result.data.action === "UPDATED"
                    ? "Profil cocok ditemukan, data diperbarui, dan scrape otomatis dijalankan."
                    : "Profil berhasil ditambahkan dan scrape otomatis dijalankan.",
            );
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Tangkap otomatis dari link</DialogTitle>
                    <DialogDescription>
                        Tempel link profil, link post, atau handle. Sistem akan mendeteksi platform,
                        menyimpan akun, menjalankan scrape, lalu menyimpulkan identitas dan topik
                        profil secara otomatis dari bio dan 10 post terbaru.
                    </DialogDescription>
                </DialogHeader>

                <form action={handleSubmit} className="grid gap-5 py-4">
                    <Field label="Link / post / handle">
                        <Input
                            name="source"
                            placeholder="https://www.instagram.com/namaakun/ atau https://x.com/user/status/123..."
                            required
                        />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
                        <Field label="Fallback platform">
                            <PlatformSelect
                                name="defaultPlatform"
                                defaultValue={DEFAULT_PLATFORM}
                            />
                        </Field>
                        <Field label="Aktif">
                            <label className="flex h-10 items-center gap-3 rounded-md border px-3 text-sm">
                                <input type="checkbox" name="isActive" defaultChecked />
                                <span>Masuk daftar aktif</span>
                            </label>
                        </Field>
                    </div>

                    <HelperCard>
                        <div className="font-medium text-zinc-900 dark:text-white">
                            Alur otomatis
                        </div>
                        <ol className="mt-2 space-y-1">
                            <li>1. Link dikenali lalu dipetakan ke platform dan handle.</li>
                            <li>2. Profil dibuat atau dicocokkan ke data yang sudah ada.</li>
                            <li>3. Scrape untuk platform terkait dijalankan otomatis.</li>
                            <li>4. Bio dan 10 post terbaru diringkas jadi analisis profil.</li>
                        </ol>
                    </HelperCard>

                    <HelperCard>
                        <div>Contoh link yang didukung:</div>
                        <ul className="mt-2 space-y-1">
                            <li>`https://instagram.com/namaakun`</li>
                            <li>`https://x.com/user/status/123456789`</li>
                            <li>`https://www.threads.net/@user/post/abc123`</li>
                            <li>`https://www.youtube.com/@channelname`</li>
                            <li>`@namaakun` dengan fallback platform</li>
                        </ul>
                    </HelperCard>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Menangkap..." : "Tangkap dan analisis otomatis"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function InfluencerBatchSourceDialog({ trigger }: { trigger: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [value, setValue] = useState("");
    const [lastRows, setLastRows] = useState<
        Array<{
            rowNumber: number;
            influencerId?: string;
            action: "CREATED" | "UPDATED" | "SKIPPED" | "ERROR";
            message: string;
        }>
    >([]);

    const sourceCount = useMemo(() => splitSources(value).length, [value]);

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);

        try {
            const result = await batchAddInfluencersFromSources({
                sources: splitSources(value),
                defaultPlatform: String(
                    formData.get("defaultPlatform") || DEFAULT_PLATFORM,
                ) as Platform,
                isActive: formData.get("isActive") === "on",
            });

            if (!result.success || !("rows" in result) || !("errors" in result)) {
                toast.error(result.error || "Batch add gagal.");
                return;
            }

            setLastRows(result.rows);
            toast.success(
                `${result.imported} dibuat, ${result.updated} diperbarui, ${result.errors.length} error.`,
            );

            if (result.errors.length === 0) {
                setOpen(false);
                setValue("");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Batch tangkap otomatis</DialogTitle>
                    <DialogDescription>
                        Tempel satu link atau handle per baris. Sistem akan mendeteksi platform,
                        mencocokkan duplikat, dan menyiapkan profil secara otomatis tanpa input
                        metadata manual per akun.
                    </DialogDescription>
                </DialogHeader>

                <form action={handleSubmit} className="grid gap-5 py-4">
                    <Field label={`Daftar sumber (${sourceCount} item)`}>
                        <Textarea
                            name="sources"
                            value={value}
                            onChange={(event) => setValue(event.target.value)}
                            rows={12}
                            className="font-mono text-xs"
                            placeholder={`https://www.instagram.com/namaakun/\nhttps://x.com/user/status/123456789\nhttps://www.threads.net/@user/post/abc123\n@fallback-handle`}
                            required
                        />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
                        <Field label="Fallback platform">
                            <PlatformSelect
                                name="defaultPlatform"
                                defaultValue={DEFAULT_PLATFORM}
                            />
                        </Field>
                        <Field label="Aktif">
                            <label className="flex h-10 items-center gap-3 rounded-md border px-3 text-sm">
                                <input type="checkbox" name="isActive" defaultChecked />
                                <span>Masuk daftar aktif</span>
                            </label>
                        </Field>
                    </div>

                    {lastRows.length > 0 ? (
                        <div className="rounded-2xl border border-zinc-950/10 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950/40">
                            <div className="text-sm font-medium text-zinc-900 dark:text-white">
                                Hasil batch terakhir
                            </div>
                            <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                                {lastRows.map((row) => (
                                    <li
                                        key={`${row.rowNumber}-${row.message}`}
                                        className="flex gap-3"
                                    >
                                        <span className="w-14 shrink-0 font-medium text-zinc-500">
                                            Baris {row.rowNumber}
                                        </span>
                                        <span>
                                            <span className="font-medium text-zinc-900 dark:text-white">
                                                {row.action}
                                            </span>{" "}
                                            {row.message}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    <DialogFooter>
                        <Button type="submit" disabled={loading || sourceCount === 0}>
                            {loading ? "Memproses..." : "Simpan batch otomatis"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PlatformSelect({ name, defaultValue }: { name: string; defaultValue: Platform }) {
    return (
        <select
            name={name}
            defaultValue={defaultValue}
            className="h-10 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
        >
            <option value="INSTAGRAM">Instagram</option>
            <option value="TIKTOK">TikTok</option>
            <option value="TWITTER">X</option>
            <option value="THREADS">Threads</option>
            <option value="YOUTUBE">YouTube</option>
        </select>
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

function HelperCard({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-zinc-950/10 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950/40 dark:text-zinc-300">
            {children}
        </div>
    );
}

function splitSources(value: string) {
    return Array.from(
        new Set(
            value
                .split(/\r?\n/)
                .map((item) => item.trim())
                .filter(Boolean),
        ),
    );
}
