"use client";

import {
    BookOpenIcon,
    ChartBarIcon,
    ClockIcon,
    Cog6ToothIcon,
    FolderIcon,
    HomeIcon,
    PresentationChartLineIcon,
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
import { isDemoMode } from "@/shared/lib/demo-mode";

export function DashboardSidebar() {
    const pathname = usePathname();
    const showInternalTools = process.env.NODE_ENV !== "production" && !isDemoMode;

    return (
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-3">
                    <Avatar className="size-10 bg-zinc-900 text-white" initials="SM" />
                    <div>
                        <div className="text-sm font-medium text-zinc-950 dark:text-white">
                            Statistik Sosial
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Persiapan laporan
                        </div>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarBody>
                <SidebarItem href="/dashboard" current={pathname === "/dashboard"}>
                    <HomeIcon />
                    <SidebarLabel>Pusat laporan</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/reports" current={pathname === "/reports"}>
                    <ChartBarIcon />
                    <SidebarLabel>Laporan portofolio</SidebarLabel>
                </SidebarItem>
                <SidebarItem
                    href="/individual-reports"
                    current={pathname === "/individual-reports"}
                >
                    <PresentationChartLineIcon />
                    <SidebarLabel>Laporan individu</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/history" current={pathname === "/history"}>
                    <ClockIcon />
                    <SidebarLabel>Data scraping</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/accounts" current={pathname === "/accounts"}>
                    <UsersIcon />
                    <SidebarLabel>Akun</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="/categories" current={pathname === "/categories"}>
                    <FolderIcon />
                    <SidebarLabel>Grup laporan</SidebarLabel>
                </SidebarItem>
                {showInternalTools && (
                    <>
                        <SidebarDivider />
                        <SidebarItem href="/docs" current={pathname === "/docs"}>
                            <BookOpenIcon />
                            <SidebarLabel>Panduan impor</SidebarLabel>
                        </SidebarItem>
                        <SidebarItem href="/design" current={pathname === "/design"}>
                            <SwatchIcon />
                            <SidebarLabel>Sistem desain</SidebarLabel>
                        </SidebarItem>
                    </>
                )}
                <SidebarItem href="/settings" current={pathname === "/settings"}>
                    <Cog6ToothIcon />
                    <SidebarLabel>Pengaturan</SidebarLabel>
                </SidebarItem>
            </SidebarBody>
            <SidebarFooter>{/* Footer content if needed */}</SidebarFooter>
        </Sidebar>
    );
}
