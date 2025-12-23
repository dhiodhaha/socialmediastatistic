"use client";

import { useEffect, useState } from "react";
import { getComparisonData, getScrapingJobsForReport, ComparisonRow } from "@/app/actions/report";
import { ComparisonTable } from "@/components/reports/comparison-table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Platform = "INSTAGRAM" | "TIKTOK" | "TWITTER";

interface JobOption {
    id: string;
    createdAt: Date;
    totalAccounts: number;
}

export default function ComparisonPage() {
    const [jobs, setJobs] = useState<JobOption[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(true);

    const [job1Id, setJob1Id] = useState<string>("");
    const [job2Id, setJob2Id] = useState<string>("");

    const [loadingData, setLoadingData] = useState(false);
    const [comparisonData, setComparisonData] = useState<ComparisonRow[] | null>(null);
    const [dates, setDates] = useState<{ d1: Date; d2: Date } | null>(null);
    const [platform, setPlatform] = useState<Platform>("INSTAGRAM");

    useEffect(() => {
        async function fetchJobs() {
            try {
                const data = await getScrapingJobsForReport();
                const mapped = data.map(j => ({
                    ...j,
                    createdAt: new Date(j.createdAt)
                }));
                setJobs(mapped);

                if (mapped.length >= 2) {
                    setJob2Id(mapped[0].id);
                    setJob1Id(mapped[1].id);
                } else if (mapped.length === 1) {
                    setJob2Id(mapped[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch jobs", error);
            } finally {
                setLoadingJobs(false);
            }
        }
        fetchJobs();
    }, []);

    const handleCompare = async () => {
        if (!job1Id || !job2Id) return;
        setLoadingData(true);
        try {
            const data = await getComparisonData(job1Id, job2Id);
            setComparisonData(data);

            const j1 = jobs.find(j => j.id === job1Id);
            const j2 = jobs.find(j => j.id === job2Id);
            if (j1 && j2) {
                setDates({ d1: j1.createdAt, d2: j2.createdAt });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingData(false);
        }
    };

    const filteredData = comparisonData?.filter(row => row.platform === platform) || [];

    const platforms: { value: Platform; label: string }[] = [
        { value: "INSTAGRAM", label: "Instagram" },
        { value: "TIKTOK", label: "TikTok" },
        { value: "TWITTER", label: "Twitter" },
    ];

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Laporan Perbandingan</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pilih Periode</CardTitle>
                    <CardDescription>
                        Bandingkan data statistik antara dua waktu pengambilan data (snapshot).
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="grid gap-2 w-full md:w-[300px]">
                        <label className="text-sm font-medium">Data Awal (Lama)</label>
                        <Select value={job1Id} onValueChange={setJob1Id} disabled={loadingJobs}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Tanggal..." />
                            </SelectTrigger>
                            <SelectContent>
                                {jobs.map(job => (
                                    <SelectItem key={job.id} value={job.id}>
                                        {format(job.createdAt, "dd MMMM yyyy, HH:mm", { locale: id })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2 w-full md:w-[300px]">
                        <label className="text-sm font-medium">Data Akhir (Baru)</label>
                        <Select value={job2Id} onValueChange={setJob2Id} disabled={loadingJobs}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Tanggal..." />
                            </SelectTrigger>
                            <SelectContent>
                                {jobs.map(job => (
                                    <SelectItem key={job.id} value={job.id}>
                                        {format(job.createdAt, "dd MMMM yyyy, HH:mm", { locale: id })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleCompare} disabled={loadingData || !job1Id || !job2Id}>
                        {loadingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Bandingkan Data
                    </Button>
                </CardContent>
            </Card>

            {comparisonData && dates && (
                <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Platform Filter Buttons */}
                    <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                        {platforms.map((p) => (
                            <Button
                                key={p.value}
                                variant={platform === p.value ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setPlatform(p.value)}
                                className={cn(
                                    "rounded-md transition-all",
                                    platform === p.value && "shadow-sm"
                                )}
                            >
                                {p.label}
                            </Button>
                        ))}
                    </div>

                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">
                            Hasil Perbandingan: {format(dates.d1, "dd MMM yyyy", { locale: id })} vs {format(dates.d2, "dd MMM yyyy", { locale: id })}
                        </h3>
                    </div>

                    <ComparisonTable
                        data={filteredData}
                        job1Date={dates.d1}
                        job2Date={dates.d2}
                        platform={platform}
                    />
                </div>
            )}
        </div>
    );
}
