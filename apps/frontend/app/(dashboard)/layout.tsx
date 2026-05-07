import { redirect } from "next/navigation";
import { SidebarLayout } from "@/shared/components/catalyst/sidebar-layout";
import { DashboardSidebar } from "@/shared/components/dashboard-sidebar";
import { requireAuthenticatedPage } from "@/shared/lib/authorization";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await requireAuthenticatedPage();

    if (!session?.user) {
        redirect("/login");
    }

    return (
        <SidebarLayout
            sidebar={
                <DashboardSidebar
                    role={session.user.role}
                    user={{
                        name: session.user.name ?? null,
                        email: session.user.email ?? null,
                    }}
                />
            }
        >
            {children}
        </SidebarLayout>
    );
}
