import "server-only";

import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { isAdmin, isEditorOrAdmin, normalizeUserRole } from "@/shared/lib/access-control";
import { auth } from "@/shared/lib/auth";

export class AuthorizationError extends Error {
    code: "UNAUTHORIZED" | "FORBIDDEN";

    constructor(code: "UNAUTHORIZED" | "FORBIDDEN", message: string) {
        super(message);
        this.code = code;
        this.name = "AuthorizationError";
    }
}

export type AuthenticatedSession = Session & {
    user: NonNullable<Session["user"]> & {
        id: string;
        role: ReturnType<typeof normalizeUserRole>;
    };
};

export function getAuthorizationErrorMessage(error: unknown, fallbackMessage: string) {
    if (error instanceof AuthorizationError) {
        return error.message;
    }

    return fallbackMessage;
}

export async function requireAuthenticated() {
    const session = await auth();

    if (!session?.user?.id) {
        throw new AuthorizationError("UNAUTHORIZED", "Unauthorized");
    }

    session.user.role = normalizeUserRole(session.user.role);
    return session as AuthenticatedSession;
}

export async function requireEditorOrAdmin() {
    const session = await requireAuthenticated();

    if (!isEditorOrAdmin(session.user.role)) {
        throw new AuthorizationError("FORBIDDEN", "Editor or admin access required");
    }

    return session;
}

export async function requireAdmin() {
    const session = await requireAuthenticated();

    if (!isAdmin(session.user.role)) {
        throw new AuthorizationError("FORBIDDEN", "Admin access required");
    }

    return session;
}

export async function requireAuthenticatedPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    session.user.role = normalizeUserRole(session.user.role);
    return session as AuthenticatedSession;
}

export async function requireEditorOrAdminPage() {
    const session = await requireAuthenticatedPage();

    if (!isEditorOrAdmin(session.user.role)) {
        redirect("/dashboard");
    }

    return session;
}

export async function requireAdminPage() {
    const session = await requireAuthenticatedPage();

    if (!isAdmin(session.user.role)) {
        redirect("/dashboard");
    }

    return session;
}
