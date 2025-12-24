"use client";

import { useEffect, useState } from "react";
import { getSettings, updateCronSchedule } from "@/app/actions/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2, Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Schedule presets with friendly names
const SCHEDULE_OPTIONS = [
    { id: "daily", label: "Every Day", description: "Runs once every day", cron: "0 {hour} * * *" },
    { id: "weekly", label: "Every Week", description: "Runs once every week on Monday", cron: "0 {hour} * * 1" },
    { id: "monthly", label: "Last Day of Month", description: "Runs on the last day of each month", cron: "0 {hour} L * *" },
    { id: "hourly", label: "Every Hour", description: "Runs every hour (for testing)", cron: "0 * * * *" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
    value: String(i),
    label: i === 0 ? "12:00 AM (Midnight)" : i === 12 ? "12:00 PM (Noon)" : i < 12 ? `${i}:00 AM` : `${i - 12}:00 PM`,
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
    const option = SCHEDULE_OPTIONS.find(o => o.id === scheduleId);
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
            toast.success("Schedule updated successfully!");
        } else {
            toast.error(result.error || "Failed to update");
        }
        setLoading(false);
    };

    const selectedOption = SCHEDULE_OPTIONS.find(o => o.id === scheduleId);
    const previewCron = scheduleToCron(scheduleId, hour);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your application preferences
                </p>
            </div>

            {/* Scraping Schedule */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Auto-Scraping Schedule
                    </CardTitle>
                    <CardDescription>Configure when the worker automatically scrapes all account data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {cronLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                        </div>
                    ) : (
                        <>
                            {/* Frequency Selection - Using styled buttons instead of radio */}
                            <div className="space-y-3">
                                <Label>Frequency</Label>
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
                                                    : "border-border hover:bg-muted/50"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                                                scheduleId === option.id
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : "border-muted-foreground"
                                            )}>
                                                {scheduleId === option.id && <Check className="h-3 w-3" />}
                                            </div>
                                            <div className="flex-1">
                                                <span className="font-medium">{option.label}</span>
                                                <span className="text-muted-foreground text-sm ml-2">— {option.description}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Time Selection (not for hourly) */}
                            {scheduleId !== "hourly" && (
                                <div className="space-y-2">
                                    <Label>Time of Day (UTC)</Label>
                                    <Select value={hour} onValueChange={setHour}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Select time" />
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
                                <span className="font-medium">Current schedule:</span>{" "}
                                <span className="text-muted-foreground">{selectedOption?.label} at {HOUR_OPTIONS.find(h => h.value === hour)?.label || "Midnight"}</span>
                                <br />
                                <span className="font-mono text-xs opacity-60">Cron: {previewCron}</span>
                            </div>

                            <Button onClick={handleSave} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Schedule
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Profile placeholder */}
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Manage your account information</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Profile management coming soon. Currently logged in as admin.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
