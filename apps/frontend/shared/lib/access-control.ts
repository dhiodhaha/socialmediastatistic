import type { UserRole } from "@repo/types";

const EDITOR_ROUTE_PREFIXES = ["/accounts", "/categories", "/history", "/docs", "/design"];
const ADMIN_ROUTE_PREFIXES = ["/settings"];

function matchesRoutePrefix(pathname: string, prefix: string) {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function normalizeUserRole(role: UserRole | string | null | undefined): UserRole {
    if (role === "ADMIN" || role === "EDITOR" || role === "VIEWER") {
        return role;
    }

    return "VIEWER";
}

export function isAdmin(role: UserRole | string | null | undefined) {
    return normalizeUserRole(role) === "ADMIN";
}

export function isEditorOrAdmin(role: UserRole | string | null | undefined) {
    const normalizedRole = normalizeUserRole(role);
    return normalizedRole === "ADMIN" || normalizedRole === "EDITOR";
}

export function canAccessDashboardRoute(
    pathname: string,
    role: UserRole | string | null | undefined,
) {
    if (ADMIN_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix))) {
        return isAdmin(role);
    }

    if (EDITOR_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix))) {
        return isEditorOrAdmin(role);
    }

    return true;
}
