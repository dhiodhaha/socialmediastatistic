"use client"

import { usePathname } from "next/navigation"
import { Sidebar, SidebarBody, SidebarItem, SidebarLabel, SidebarDivider, SidebarHeader, SidebarFooter } from "@/components/catalyst/sidebar"
import {
    HomeIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    UsersIcon,
    FolderIcon,
    ClockIcon,
    BookOpenIcon,
    SwatchIcon
} from "@heroicons/react/20/solid"
import { Avatar } from "@/components/catalyst/avatar"

export function DashboardSidebar() {
    const pathname = usePathname()

    return (
        <Sidebar>
            <SidebarHeader>
                {/* Placeholder for Team Switcher if needed later */}
                <div className="flex items-center gap-3">
                    <Avatar className="size-10 bg-zinc-900 text-white" initials="SM" />
                    <div>
                        <div className="text-sm font-medium text-zinc-950 dark:text-white">Social Stats</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">Analytics Dashboard</div>
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
            <SidebarFooter>
                {/* Footer content if needed */}
            </SidebarFooter>
        </Sidebar>
    )
}
