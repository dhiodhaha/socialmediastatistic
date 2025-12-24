"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAvailableDates, getComparisonDataByDate, ComparisonRow } from "@/app/actions/report";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarDays, Loader2 } from "lucide-react";

interface DateCalendarPickerProps {
    onCompare: (data: ComparisonRow[], date1: string, date2: string) => void;
}

export function DateCalendarPicker({ onCompare }: DateCalendarPickerProps) {
    const [availableDates, setAvailableDates] = useState<Date[]>([]);
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [loading, setLoading] = useState(true);
    const [comparing, setComparing] = useState(false);

    useEffect(() => {
        async function loadDates() {
            try {
                const dates = await getAvailableDates();
                setAvailableDates(dates.map(d => new Date(d)));
            } catch (error) {
                console.error("Failed to load dates", error);
            } finally {
                setLoading(false);
            }
        }
        loadDates();
    }, []);

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) return;

        // Check if date has data
        const hasData = availableDates.some(
            d => d.toDateString() === date.toDateString()
        );
        if (!hasData) return;

        setSelectedDates(prev => {
            const exists = prev.find(d => d.toDateString() === date.toDateString());
            if (exists) {
                return prev.filter(d => d.toDateString() !== date.toDateString());
            }
            if (prev.length >= 2) {
                return [prev[1], date]; // Replace oldest
            }
            return [...prev, date];
        });
    };

    const handleCompare = async () => {
        if (selectedDates.length !== 2) return;

        setComparing(true);
        try {
            const [d1, d2] = selectedDates.sort((a, b) => a.getTime() - b.getTime());
            const date1Str = d1.toISOString().split('T')[0];
            const date2Str = d2.toISOString().split('T')[0];

            const data = await getComparisonDataByDate(date1Str, date2Str);
            onCompare(data, date1Str, date2Str);
        } catch (error) {
            console.error("Comparison failed", error);
        } finally {
            setComparing(false);
        }
    };

    // Custom day render to show blue dots for available dates
    const modifiers = {
        hasData: availableDates,
        selected: selectedDates,
    };

    const modifiersClassNames = {
        hasData: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary",
        selected: "bg-primary text-primary-foreground hover:bg-primary",
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Date Comparison (Experimental)
                </CardTitle>
                <CardDescription>
                    Select 2 dates with data (blue dots) to compare. Includes imported historical data.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Calendar
                    mode="single"
                    selected={undefined}
                    onSelect={handleDateSelect}
                    modifiers={modifiers}
                    modifiersClassNames={modifiersClassNames}
                    className="rounded-md border"
                    disabled={(date) => !availableDates.some(d => d.toDateString() === date.toDateString())}
                />

                {selectedDates.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map((date, i) => (
                            <div
                                key={date.toISOString()}
                                className={cn(
                                    "px-3 py-1 rounded-full text-sm font-medium",
                                    i === 0 ? "bg-muted" : "bg-primary text-primary-foreground"
                                )}
                            >
                                {format(date, "dd MMM yyyy")}
                            </div>
                        ))}
                    </div>
                )}

                <Button
                    onClick={handleCompare}
                    disabled={selectedDates.length !== 2 || comparing}
                    className="w-full"
                >
                    {comparing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Compare Selected Dates
                </Button>

                <p className="text-xs text-muted-foreground">
                    {availableDates.length} dates with data available
                </p>
            </CardContent>
        </Card>
    );
}
