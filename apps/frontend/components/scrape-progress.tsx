"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getJobStatus } from "@/app/actions/job";
import { toast } from "sonner";
import { JobStatus } from "@repo/database";

interface ScrapeProgressProps {
    jobId: string;
    onComplete?: () => void;
}

export function ScrapeProgress({ jobId, onComplete }: ScrapeProgressProps) {
    const router = useRouter();
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<JobStatus>("PENDING");
    const [stats, setStats] = useState({ completed: 0, total: 0 });
    const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        if (!jobId) return;

        const checkStatus = async () => {
            const result = await getJobStatus(jobId);

            if (!result.success || !result.data) {
                return;
            }

            const job = result.data;
            setStatus(job.status);
            setStats({ completed: job.completedCount, total: job.totalAccounts });

            // Calculate progress percentage
            const percentage = job.totalAccounts > 0
                ? Math.round((job.completedCount / job.totalAccounts) * 100)
                : 0;

            setProgress(percentage);

            if (job.status === "COMPLETED" || job.status === "FAILED") {
                clearInterval(intervalRef.current);

                if (job.status === "COMPLETED") {
                    toast.success("Scraping completed successfully!");
                } else {
                    toast.error("Scraping job failed or finished with errors.");
                }

                router.refresh();
                if (onComplete) onComplete();
            }
        };

        // Check immediately
        checkStatus();

        // Then poll every 3 seconds
        intervalRef.current = setInterval(checkStatus, 3000);

        return () => clearInterval(intervalRef.current);
    }, [jobId, router, onComplete]);

    if (!jobId || status === "COMPLETED" || status === "FAILED") {
        return null;
    }

    return (
        <div className="rounded-lg border bg-card p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="font-medium text-sm">
                        Scraping in progress... ({status})
                    </span>
                </div>
                <span className="text-sm text-muted-foreground">
                    {stats.completed} / {stats.total} accounts
                </span>
            </div>
            <Progress value={progress} className="h-2" />
        </div>
    );
}
