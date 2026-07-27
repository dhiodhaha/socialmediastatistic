"use client";

import {
    ArrowLeftStartOnRectangleIcon,
    BookOpenIcon,
    ChartBarIcon,
    ClockIcon,
    Cog6ToothIcon,
    DocumentMagnifyingGlassIcon,
    FolderIcon,
    HomeIcon,
    PresentationChartLineIcon,
    SwatchIcon,
    UsersIcon,
} from "@heroicons/react/20/solid";
import type { UserRole } from "@repo/types";
import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
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
import { isAdmin, isEditorOrAdmin } from "@/shared/lib/access-control";
import { isDemoMode } from "@/shared/lib/demo-mode";

export function DashboardSidebar({
    role,
    user,
}: {
    role: UserRole;
    user: {
        name?: string | null;
        email?: string | null;
    };
}) {
    const pathname = usePathname();
    const [loggingOut, setLoggingOut] = useState(false);
    const showInternalTools = process.env.NODE_ENV !== "production" && !isDemoMode;
    const canManageData = isEditorOrAdmin(role);
    const canAccessSettings = isAdmin(role);
    const userLabel = user.name || user.email?.split("@")[0] || "Pengguna";

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
                <SidebarItem href="/influencers" current={pathname.startsWith("/influencers")}>
                    <Sparkles />
                    <SidebarLabel>Analisis influencer</SidebarLabel>
                </SidebarItem>
                <SidebarItem
                    href="/content-analysis"
                    current={pathname.startsWith("/content-analysis")}
                >
                    <DocumentMagnifyingGlassIcon />
                    <SidebarLabel>Analisis konten</SidebarLabel>
                </SidebarItem>
                {canManageData && (
                    <>
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
                    </>
                )}
                {canAccessSettings && (
                    <SidebarItem href="/settings" current={pathname === "/settings"}>
                        <Cog6ToothIcon />
                        <SidebarLabel>Pengaturan</SidebarLabel>
                    </SidebarItem>
                )}
            </SidebarBody>
            <SidebarFooter>
                <div className="mb-3 rounded-2xl border border-zinc-950/5 bg-zinc-50 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                    <div className="text-sm font-medium text-zinc-950 dark:text-white">
                        {userLabel}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {user.email || "Sesi aktif"}
                    </div>
                </div>
                <SidebarItem
                    onClick={async () => {
                        setLoggingOut(true);
                        await signOut({ callbackUrl: "/login" });
                    }}
                >
                    <ArrowLeftStartOnRectangleIcon />
                    <SidebarLabel>{loggingOut ? "Keluar..." : "Keluar"}</SidebarLabel>
                </SidebarItem>
            </SidebarFooter>
        </Sidebar>
    );
}
