"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
    user: {
        name?: string | null;
        email?: string | null;
    };
}

export function Header({ user }: HeaderProps) {
    return (
        <header className="h-16 bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-6">
            <div>
                <h2 className="text-lg font-semibold text-white">
                    Welcome back, {user.name || user.email?.split("@")[0] || "User"}
                </h2>
                <p className="text-sm text-slate-500">
                    {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })}
                </p>
            </div>

            <div className="flex items-center gap-4">
                {/* Notifications */}
                <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full" />
                </button>

                {/* User menu */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                        {(user.name || user.email)?.[0]?.toUpperCase() || "U"}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="text-slate-400 hover:text-white"
                    >
                        Sign out
                    </Button>
                </div>
            </div>
        </header>
    );
}
