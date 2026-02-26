"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/shared/components/catalyst/button";
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
}

export function DatePickerWithRange({ className, date, setDate }: DatePickerWithRangeProps) {
    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        outline
                        className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground",
                        )}
                    >
                        <CalendarIcon className="h-4 w-4" data-slot="icon" />
                        {(() => {
                            if (!date?.from) {
                                return <span>Pick a date range</span>;
                            }
                            if (date.to) {
                                return (
                                    <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                    </>
                                );
                            }
                            return format(date.from, "LLL dd, y");
                        })()}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
