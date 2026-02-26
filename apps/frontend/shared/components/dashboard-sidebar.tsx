"use client";

import {
    BookOpenIcon,
    ChartBarIcon,
    ClockIcon,
    Cog6ToothIcon,
    FolderIcon,
    HomeIcon,
    SwatchIcon,
    UsersIcon,
} from "@heroicons/react/20/solid";
import { usePathname } from "next/navigation";
import { Avatar } from "@/shared/components/catalyst/avatar";
import {
    Sidebar,
    SidebarBody,
    SidebarDivider,
    SidebarFooter,
    SidebarHeader,
    SidebarItem,
    SidebarLabel,
} from "@/shared/components/catalyst/sidebar";

export function DashboardSidebar() {
    const pathname = usePathname();

    return (
        <Sidebar>
            <SidebarHeader>
                {/* Placeholder for Team Switcher if needed later */}
                <div className="flex items-center gap-3">
                    <Avatar className="size-10 bg-zinc-900 text-white" initials="SM" />
                    <div>
                        <div className="text-sm font-medium text-zinc-950 dark:text-white">
                            Social Stats
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Analytics Dashboard
                        </div>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarBody>
                <SidebarItem href="/dashboard" current={pathname === "/dashboard"}>
                    <HomeIcon />
                    <SidebarLabel>Overview</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/accounts" current={pathname === "/accounts"}>
                    <UsersIcon />
                    <SidebarLabel>Accounts</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/categories" current={pathname === "/categories"}>
                    <FolderIcon />
                    <SidebarLabel>Categories</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/history" current={pathname === "/history"}>
                    <ClockIcon />
                    <SidebarLabel>History</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/reports" current={pathname === "/reports"}>
                    <ChartBarIcon />
                    <SidebarLabel>Reports</SidebarLabel>
                </SidebarItem>
                <SidebarDivider />
                <SidebarItem href="/docs" current={pathname === "/docs"}>
                    <BookOpenIcon />
                    <SidebarLabel>Documentation</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/design" current={pathname === "/design"}>
                    <SwatchIcon />
                    <SidebarLabel>Design System</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/settings" current={pathname === "/settings"}>
                    <Cog6ToothIcon />
                    <SidebarLabel>Settings</SidebarLabel>
                </SidebarItem>
            </SidebarBody>
            <SidebarFooter>{/* Footer content if needed */}</SidebarFooter>
        </Sidebar>
    );
}
