import { SidebarLayout } from "@/components/catalyst/sidebar-layout"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }
    return (
        <SidebarLayout sidebar={<DashboardSidebar />}>
            {children}
        </SidebarLayout>
    )
}
