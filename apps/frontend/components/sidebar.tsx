"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    History,
    Settings,
    BarChart2,
    ChevronLeft,
    ChevronRight,
    LineChart
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
    {
        href: "/dashboard",
        label: "Overview",
        icon: LayoutDashboard,
    },
    {
        href: "/accounts",
        label: "Accounts",
        icon: Users,
    },
    {
        href: "/history",
        label: "History",
        icon: History,
    },
    {
        href: "/reports",
        label: "Reports",
        icon: BarChart2,
    },
    {
        href: "/settings",
        label: "Settings",
        icon: Settings,
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                "border-r bg-card flex flex-col transition-all duration-300 ease-in-out",
                isCollapsed ? "w-[70px]" : "w-64"
            )}
        >
            {/* Logo */}
            <div className={cn(
                "border-b transition-all duration-300 flex items-center h-16",
                isCollapsed ? "justify-center px-2" : "px-6 gap-3"
            )}>
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
            <nav className="flex-1 p-3 space-y-1 overflow-x-hidden overflow-y-auto">
                {navItems.map((item) => {
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
                                isCollapsed ? "justify-center px-0" : "px-3 gap-3"
                            )}
                        >
                            <Icon className={cn("shrink-0 transition-all", isCollapsed ? "w-5 h-5" : "w-4 h-4")} />
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
            </nav>

            {/* Footer / Toggle */}
            <div className="p-3 border-t mt-auto">
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full flex items-center h-10 transition-all hover:bg-muted/80",
                        isCollapsed ? "justify-center px-0" : "justify-start px-3 gap-3"
                    )}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    ) : (
                        <>
                            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
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
