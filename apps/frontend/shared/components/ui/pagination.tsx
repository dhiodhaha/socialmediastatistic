import {
    ArrowLeft01Icon,
    ArrowRight01Icon,
    MoreHorizontalCircle01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type * as React from "react";
import { Button } from "@/shared/components/catalyst/button";
import { cn } from "@/shared/lib/utils";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
    return (
        <nav
            aria-label="pagination"
            data-slot="pagination"
            className={cn("mx-auto flex w-full justify-center", className)}
            {...props}
        />
    );
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
    return (
        <ul
            data-slot="pagination-content"
            className={cn("gap-0.5 flex items-center", className)}
            {...props}
        />
    );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
    return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
    isActive?: boolean;
    size?: "default" | "icon" | "sm" | "lg";
    href: string;
} & Omit<React.ComponentProps<"a">, "href" | "color">;

function PaginationLink({ className, isActive, size = "icon", ...props }: PaginationLinkProps) {
    return isActive ? (
        <Button
            outline
            className={cn(size === "icon" && "px-2", size === "default" && "px-4 py-2", className)}
            {...props}
        >
            {props.children}
        </Button>
    ) : (
        <Button
            plain
            className={cn(size === "icon" && "px-2", size === "default" && "px-4 py-2", className)}
            {...props}
        >
            {props.children}
        </Button>
    );
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink
            aria-label="Go to previous page"
            size="default"
            className={cn("pl-1.5!", className)}
            {...props}
        >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} data-icon="inline-start" />
            <span className="hidden sm:block">Previous</span>
        </PaginationLink>
    );
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink
            aria-label="Go to next page"
            size="default"
            className={cn("pr-1.5!", className)}
            {...props}
        >
            <span className="hidden sm:block">Next</span>
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} data-icon="inline-end" />
        </PaginationLink>
    );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
    return (
        <span
            aria-hidden
            data-slot="pagination-ellipsis"
            className={cn(
                "size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4 flex items-center justify-center",
                className,
            )}
            {...props}
        >
            <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
            <span className="sr-only">More pages</span>
        </span>
    );
}

export {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
};
