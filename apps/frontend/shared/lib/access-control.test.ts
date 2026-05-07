import { describe, expect, it } from "vitest";
import {
    canAccessDashboardRoute,
    isAdmin,
    isEditorOrAdmin,
    normalizeUserRole,
} from "./access-control";

describe("access control helpers", () => {
    it("normalizes unexpected roles to viewer", () => {
        expect(normalizeUserRole("ADMIN")).toBe("ADMIN");
        expect(normalizeUserRole("EDITOR")).toBe("EDITOR");
        expect(normalizeUserRole("VIEWER")).toBe("VIEWER");
        expect(normalizeUserRole("SUPERADMIN")).toBe("VIEWER");
        expect(normalizeUserRole(null)).toBe("VIEWER");
    });

    it("derives admin and editor capabilities from the normalized role", () => {
        expect(isAdmin("ADMIN")).toBe(true);
        expect(isAdmin("EDITOR")).toBe(false);
        expect(isEditorOrAdmin("ADMIN")).toBe(true);
        expect(isEditorOrAdmin("EDITOR")).toBe(true);
        expect(isEditorOrAdmin("VIEWER")).toBe(false);
    });

    it("keeps viewer routes readable while protecting editor and admin routes", () => {
        expect(canAccessDashboardRoute("/dashboard", "VIEWER")).toBe(true);
        expect(canAccessDashboardRoute("/reports", "VIEWER")).toBe(true);
        expect(canAccessDashboardRoute("/influencers", "VIEWER")).toBe(true);
        expect(canAccessDashboardRoute("/accounts", "VIEWER")).toBe(false);
        expect(canAccessDashboardRoute("/categories", "VIEWER")).toBe(false);
        expect(canAccessDashboardRoute("/history", "VIEWER")).toBe(false);
        expect(canAccessDashboardRoute("/settings", "VIEWER")).toBe(false);
        expect(canAccessDashboardRoute("/accounts", "EDITOR")).toBe(true);
        expect(canAccessDashboardRoute("/settings", "EDITOR")).toBe(false);
        expect(canAccessDashboardRoute("/settings", "ADMIN")).toBe(true);
    });
});
