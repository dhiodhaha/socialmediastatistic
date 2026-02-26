import { redirect } from "next/navigation";
import { SidebarLayout } from "@/shared/components/catalyst/sidebar-layout";
import { DashboardSidebar } from "@/shared/components/dashboard-sidebar";
import { auth } from "@/shared/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }
    return <SidebarLayout sidebar={<DashboardSidebar />}>{children}</SidebarLayout>;
}
