import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// This is the edge-compatible auth configuration
// It doesn't include Prisma database calls - those happen in route handlers

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            // Authorization happens via the API route, not here
            // This is because Prisma can't run in Edge runtime
            authorize: async () => {
                // This will be overridden by the API route
                return null;
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
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
            }
            return session;
        },
        authorized: async ({ auth }) => {
            // Logged in users are authenticated
            return !!auth;
        },
    },
});
