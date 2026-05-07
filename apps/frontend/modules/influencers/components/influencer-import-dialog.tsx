"use client";

import type { InfluencerImportRecord } from "@repo/types";
import Papa from "papaparse";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/catalyst/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { importInfluencers } from "../actions/influencer.actions";

const TEMPLATE = `Nama Akun,Kategori Influencer,Institusi/Profesi Topic,Sentimen,Social Media,Keterangan
Contoh Influencer,Micro,Ekonomi; UMKM,Netral,Instagram; TikTok,Catatan atau URL sumber`;

export function InfluencerImportDialog({ trigger }: { trigger: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState(TEMPLATE);
    const [loading, setLoading] = useState(false);

    const handleImport = async () => {
        setLoading(true);

        const parsed = Papa.parse<Record<string, string>>(value, {
            header: true,
            skipEmptyLines: true,
        });

        const rows = parsed.data.reduce<InfluencerImportRecord[]>((accumulator, record) => {
            const row = mapImportRow(record);

            if (row) {
                accumulator.push(row);
            }

            return accumulator;
        }, []);

        const result = await importInfluencers(rows);

        if (result.success) {
            toast.success(
                `Import selesai. ${result.imported} dibuat, ${result.updated} diperbarui, ${result.skipped} dilewati.`,
            );
            setOpen(false);
        } else {
            toast.error(result.error || "Import gagal.");
        }

        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Import influencer</DialogTitle>
                    <DialogDescription>
                        Tempel data CSV dari spreadsheet dengan kolom contoh yang sudah disediakan.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <Textarea
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        rows={14}
                        className="font-mono text-xs"
                    />

                    <div className="flex justify-end">
                        <Button onClick={handleImport} disabled={loading}>
                            {loading ? "Mengimpor..." : "Jalankan impor"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function mapImportRow(record: Record<string, string>): InfluencerImportRecord | null {
    const normalized = Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key.trim().toLowerCase(), value]),
    );

    const name =
        normalized["nama akun"] ?? normalized.name ?? normalized.nama ?? normalized.influencer;

    if (!name?.trim()) {
        return null;
    }

    return {
        name,
        size: normalized["kategori influencer"] ?? normalized.category ?? null,
        professionInstitution:
            normalized["institusi/profesi topic"] ??
            normalized["institusi/profesi"] ??
            normalized.topic ??
            null,
        sentiment: normalized.sentimen ?? normalized.sentiment ?? null,
        socialMedia: normalized["social media"] ?? normalized.platform ?? null,
        note: normalized.keterangan ?? normalized.note ?? null,
    } satisfies InfluencerImportRecord;
}
