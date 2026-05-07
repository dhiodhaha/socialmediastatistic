import { prisma } from "@repo/database";
import type { UserRole } from "@repo/types";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Full auth configuration with database access
// Used by API routes (runs in Node.js, not Edge)

const handler = NextAuth({
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });

                if (!user || !user.password) {
                    return null;
                }

                const isPasswordValid = await compare(
                    credentials.password as string,
                    user.password,
                );

                if (!isPasswordValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user.role as UserRole | undefined) ?? "VIEWER";
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = (token.role as UserRole | undefined) ?? "VIEWER";
            }
            return session;
        },
    },
});

export const { GET, POST } = handler.handlers;
