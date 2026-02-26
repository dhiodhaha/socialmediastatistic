"use client";

import {
    BarChart2,
    BookOpen,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    FolderTree,
    History,
    LayoutDashboard,
    LineChart,
    type LucideIcon,
    Settings,
    Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/catalyst/button";
import { cn } from "@/shared/lib/utils";

interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    {
        label: "Main",
        items: [
            { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
            { href: "/accounts", label: "Accounts", icon: Users },
            { href: "/categories", label: "Categories", icon: FolderTree },
        ],
    },
    {
        label: "Analytics",
        items: [
            { href: "/history", label: "Scraping History", icon: History },
            { href: "/reports", label: "Reports", icon: BarChart2 },
        ],
    },
    {
        label: "System",
        items: [
            { href: "/docs", label: "Documentation", icon: BookOpen },
            { href: "/settings", label: "Settings", icon: Settings },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>(["Main", "Analytics", "System"]);

    const toggleGroup = (groupLabel: string) => {
        setExpandedGroups((prev) =>
            prev.includes(groupLabel)
                ? prev.filter((g) => g !== groupLabel)
                : [...prev, groupLabel],
        );
    };

    return (
        <aside
            className={cn(
                "border-r bg-card flex flex-col transition-all duration-300 ease-in-out",
                isCollapsed ? "w-[70px]" : "w-64",
            )}
        >
            {/* Logo */}
            <div
                className={cn(
                    "border-b transition-all duration-300 flex items-center h-16",
                    isCollapsed ? "justify-center px-2" : "px-6 gap-3",
                )}
            >
                <div className="w-8 h-8 min-w-[2rem] rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <LineChart className="w-5 h-5 text-primary" />
                </div>
                {!isCollapsed && (
                    <div className="overflow-hidden whitespace-nowrap animate-in fade-in duration-300">
                        <h1 className="font-bold text-lg leading-none">Social Stats</h1>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-4 overflow-x-hidden overflow-y-auto">
                {navGroups.map((group) => {
                    const isExpanded = expandedGroups.includes(group.label);
                    return (
                        <div key={group.label}>
                            {/* Group Header */}
                            {!isCollapsed ? (
                                <button
                                    onClick={() => toggleGroup(group.label)}
                                    className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                                >
                                    <span>{group.label}</span>
                                    <ChevronDown
                                        className={cn(
                                            "h-3 w-3 transition-transform",
                                            isExpanded ? "" : "-rotate-90",
                                        )}
                                    />
                                </button>
                            ) : (
                                <div className="h-px bg-border mx-2 my-2" />
                            )}

                            {/* Group Items */}
                            {(isCollapsed || isExpanded) && (
                                <div className="space-y-1 mt-1">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                title={isCollapsed ? item.label : undefined}
                                                className={cn(
                                                    "flex items-center rounded-md transition-all text-sm font-medium whitespace-nowrap group relative h-10",
                                                    isActive
                                                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                                                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                                                    isCollapsed
                                                        ? "justify-center px-0"
                                                        : "px-3 gap-3",
                                                )}
                                            >
                                                <Icon
                                                    className={cn(
                                                        "shrink-0 transition-all",
                                                        isCollapsed ? "w-5 h-5" : "w-4 h-4",
                                                    )}
                                                />
                                                {!isCollapsed && (
                                                    <span className="animate-in fade-in slide-in-from-left-1 duration-200">
                                                        {item.label}
                                                    </span>
                                                )}

                                                {/* Hover Tooltip for Collapsed State */}
                                                {isCollapsed && (
                                                    <div className="absolute left-10 ml-4 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border z-50 pointer-events-none">
                                                        {item.label}
                                                    </div>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Footer / Toggle */}
            <div className="p-3 border-t mt-auto">
                <Button
                    plain
                    className={cn(
                        "w-full flex items-center h-10 transition-all hover:bg-muted/80",
                        isCollapsed ? "justify-center px-0" : "justify-start px-3 gap-3",
                    )}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" data-slot="icon" />
                    ) : (
                        <>
                            <ChevronLeft
                                className="w-4 h-4 text-muted-foreground"
                                data-slot="icon"
                            />
                            <span className="text-sm font-medium text-muted-foreground animate-in fade-in slide-in-from-left-1 duration-200">
                                Collapse menu
                            </span>
                        </>
                    )}
                </Button>
            </div>
        </aside>
    );
}
