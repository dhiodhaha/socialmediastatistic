"use client";

import { Check, Clock, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getSettings, updateCronSchedule } from "@/modules/settings/actions/settings.actions";
import { Button } from "@/shared/components/catalyst/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";

// Schedule presets with friendly names
const SCHEDULE_OPTIONS = [
    {
        id: "daily",
        label: "Setiap hari",
        description: "Jalan sekali setiap hari",
        cron: "0 {hour} * * *",
    },
    {
        id: "weekly",
        label: "Setiap minggu",
        description: "Jalan sekali setiap minggu pada Senin",
        cron: "0 {hour} * * 1",
    },
    {
        id: "monthly",
        label: "Hari terakhir bulan",
        description: "Jalan pada hari terakhir tiap bulan",
        cron: "0 {hour} L * *",
    },
    {
        id: "hourly",
        label: "Setiap jam",
        description: "Jalan tiap jam (untuk pengujian)",
        cron: "0 * * * *",
    },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
    value: String(i),
    label:
        i === 0
            ? "00:00 (Tengah malam)"
            : i === 12
              ? "12:00 (Siang)"
              : i < 12
                ? `${i}:00`
                : `${i - 12}:00`,
}));

function cronToSchedule(cron: string): { scheduleId: string; hour: string } {
    const parts = cron.split(" ");
    if (parts.length !== 5) return { scheduleId: "daily", hour: "0" };

    const [, hour, day, , weekday] = parts;

    if (hour === "*") return { scheduleId: "hourly", hour: "0" };
    if (day === "L") return { scheduleId: "monthly", hour: hour || "0" };
    if (weekday === "1") return { scheduleId: "weekly", hour: hour || "0" };
    return { scheduleId: "daily", hour: hour || "0" };
}

function scheduleToCron(scheduleId: string, hour: string): string {
    const option = SCHEDULE_OPTIONS.find((o) => o.id === scheduleId);
    if (!option) return "0 0 * * *";
    return option.cron.replace("{hour}", hour);
}

export default function SettingsPage() {
    const [scheduleId, setScheduleId] = useState("daily");
    const [hour, setHour] = useState("0");
    const [loading, setLoading] = useState(false);
    const [cronLoading, setCronLoading] = useState(true);

    useEffect(() => {
        async function fetchSettings() {
            const result = await getSettings();
            if (result.success && result.data) {
                const parsed = cronToSchedule(result.data.cronSchedule);
                setScheduleId(parsed.scheduleId);
                setHour(parsed.hour);
            }
            setCronLoading(false);
        }
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        const newCron = scheduleToCron(scheduleId, hour);
        const result = await updateCronSchedule(newCron);
        if (result.success) {
            toast.success("Jadwal berhasil diperbarui!");
        } else {
            toast.error(result.error || "Gagal memperbarui");
        }
        setLoading(false);
    };

    const selectedOption = SCHEDULE_OPTIONS.find((o) => o.id === scheduleId);
    const previewCron = scheduleToCron(scheduleId, hour);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Pengaturan</h1>
                <p className="text-muted-foreground mt-1">Kelola preferensi aplikasi</p>
            </div>

            {/* Scraping Schedule */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Jadwal scraping otomatis
                    </CardTitle>
                    <CardDescription>
                        Atur kapan worker otomatis mengambil semua data akun
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {cronLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memuat...
                        </div>
                    ) : (
                        <>
                            {/* Frequency Selection - Using styled buttons instead of radio */}
                            <div className="space-y-3">
                                <Label>Frekuensi</Label>
                                <div className="grid gap-2">
                                    {SCHEDULE_OPTIONS.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => setScheduleId(option.id)}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-md border text-left transition-all",
                                                scheduleId === option.id
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                    : "border-border hover:bg-muted/50",
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                                                    scheduleId === option.id
                                                        ? "border-primary bg-primary text-primary-foreground"
                                                        : "border-muted-foreground",
                                                )}
                                            >
                                                {scheduleId === option.id && (
                                                    <Check className="h-3 w-3" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <span className="font-medium">{option.label}</span>
                                                <span className="text-muted-foreground text-sm ml-2">
                                                    — {option.description}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Pilihan waktu (bukan untuk mode per jam) */}
                            {scheduleId !== "hourly" && (
                                <div className="space-y-2">
                                    <Label>Waktu hari (UTC)</Label>
                                    <Select value={hour} onValueChange={setHour}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Pilih waktu" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {HOUR_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Preview */}
                            <div className="p-3 bg-muted rounded-md text-sm">
                                <span className="font-medium">Jadwal saat ini:</span>{" "}
                                <span className="text-muted-foreground">
                                    {selectedOption?.label} pukul{" "}
                                    {HOUR_OPTIONS.find((h) => h.value === hour)?.label ||
                                        "Tengah malam"}
                                </span>
                                <br />
                                <span className="font-mono text-xs opacity-60">
                                    Cron: {previewCron}
                                </span>
                            </div>

                            <Button onClick={handleSave} disabled={loading}>
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" data-slot="icon" />
                                ) : (
                                    <Save className="h-4 w-4" data-slot="icon" />
                                )}
                                Simpan jadwal
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Profile placeholder */}
            <Card>
                <CardHeader>
                    <CardTitle>Profil</CardTitle>
                    <CardDescription>Kelola informasi akun Anda</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Pengelolaan profil segera hadir. Saat ini masuk sebagai admin.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
