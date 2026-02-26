"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/shared/components/catalyst/button";
import { DatePickerWithRange } from "@/shared/components/ui/date-range-picker";
import { Label } from "@/shared/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/ui/select";

export function HistoryFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Local state for immediate UI feedback
    const [status, setStatus] = useState(searchParams.get("status") || "ALL");

    const initialDateRange: DateRange | undefined = searchParams.get("startDate")
        ? {
              from: new Date(searchParams.get("startDate")!),
              to: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
          }
        : undefined;

    const [date, setDate] = useState<DateRange | undefined>(initialDateRange);

    const updateFilterParams = (newParams: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", "1");

        Object.entries(newParams).forEach(([key, value]) => {
            if (value && value !== "ALL") {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        });

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleStatusChange = (val: string) => {
        setStatus(val);
        updateFilterParams({ status: val });
    };

    const handleDateChange = (newDate: DateRange | undefined) => {
        setDate(newDate);
        if (newDate?.from) {
            updateFilterParams({
                startDate: newDate.from.toISOString(),
                endDate: newDate.to ? newDate.to.toISOString() : null,
            });
        } else {
            updateFilterParams({ startDate: null, endDate: null });
        }
    };

    const clearFilters = () => {
        setDate(undefined);
        setStatus("ALL");
        router.push(pathname);
    };

    const hasFilters = date?.from || (status && status !== "ALL");

    return (
        <div className="flex flex-wrap items-end gap-4 p-4 mb-4 border rounded-lg bg-card">
            <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[180px]" id="status">
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="RUNNING">Running</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label>Date Range</Label>
                <DatePickerWithRange date={date} setDate={handleDateChange} />
            </div>

            {hasFilters && (
                <Button plain onClick={clearFilters} className="mb-0.5" title="Clear filters">
                    <X className="h-4 w-4" data-slot="icon" />
                </Button>
            )}
        </div>
    );
}
