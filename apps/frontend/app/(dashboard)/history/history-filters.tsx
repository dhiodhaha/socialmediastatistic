"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function HistoryFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Local state for immediate UI feedback
    const [status, setStatus] = useState(searchParams.get("status") || "ALL");

    const initialDateRange: DateRange | undefined =
        searchParams.get("startDate")
            ? {
                from: new Date(searchParams.get("startDate")!),
                to: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined
            }
            : undefined;

    const [date, setDate] = useState<DateRange | undefined>(initialDateRange);

    // Create a query string generator
    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("page", "1");

            if (value && value !== "ALL") {
                params.set(name, value);
            } else {
                params.delete(name);
            }

            return params.toString();
        },
        [searchParams]
    );

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

        router.push(pathname + "?" + params.toString());
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
                endDate: newDate.to ? newDate.to.toISOString() : null
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
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFilters}
                    className="mb-0.5"
                    title="Clear filters"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
