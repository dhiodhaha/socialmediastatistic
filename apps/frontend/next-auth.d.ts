import type { DefaultSession } from "next-auth";
import type { UserRole } from "@repo/types";

declare module "next-auth" {
    interface Session {
        user: DefaultSession["user"] & {
            id: string;
            role: UserRole;
        };
    }

    interface User {
        id: string;
        role: UserRole;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        role?: UserRole;
    }
}
