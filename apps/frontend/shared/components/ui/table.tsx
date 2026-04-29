"use client";

import type * as React from "react";

import { cn } from "@/shared/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
    return (
        <div
            data-slot="table-container"
            className="relative w-full overflow-x-auto rounded-[1.25rem] border border-slate-200/80 bg-white dark:border-white/10 dark:bg-slate-950"
        >
            <table
                data-slot="table"
                className={cn("w-full caption-bottom text-base/7 sm:text-sm/6", className)}
                {...props}
            />
        </div>
    );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
    return (
        <thead
            data-slot="table-header"
            className={cn(
                "bg-slate-50/90 dark:bg-white/5 [&_tr]:border-b [&_tr]:border-slate-200/80 dark:[&_tr]:border-white/10",
                className,
            )}
            {...props}
        />
    );
}

function TableHeadRow({ className, ...props }: React.ComponentProps<"tr">) {
    return (
        <tr
            data-slot="table-head-row"
            className={cn("border-b border-slate-200/80 dark:border-white/10", className)}
            {...props}
        />
    );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
    return (
        <tbody
            data-slot="table-body"
            className={cn("[&_tr:last-child]:border-0", className)}
            {...props}
        />
    );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
    return (
        <tfoot
            data-slot="table-footer"
            className={cn("bg-muted/50 border-t font-medium [&>tr]:last:border-b-0", className)}
            {...props}
        />
    );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
    return (
        <tr
            data-slot="table-row"
            className={cn(
                "border-b border-slate-200/80 transition-colors hover:bg-slate-50/80 data-[state=selected]:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5 dark:data-[state=selected]:bg-white/5",
                className,
            )}
            {...props}
        />
    );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
    return (
        <th
            data-slot="table-head"
            className={cn(
                "h-12 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 whitespace-nowrap [&:has([role=checkbox])]:pr-0 dark:text-slate-400",
                className,
            )}
            {...props}
        />
    );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
    return (
        <td
            data-slot="table-cell"
            className={cn(
                "px-4 py-4 align-middle text-slate-700 [&:has([role=checkbox])]:pr-0 dark:text-slate-300",
                className,
            )}
            {...props}
        />
    );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
    return (
        <caption
            data-slot="table-caption"
            className={cn("text-muted-foreground mt-4 text-xs", className)}
            {...props}
        />
    );
}

export {
    Table,
    TableHeader,
    TableHeadRow,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
};
