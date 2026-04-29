"use client";

import * as Headless from "@headlessui/react";
import type React from "react";
import { useState } from "react";

function OpenMenuIcon() {
    return (
        <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true" className="size-5">
            <path d="M2 6.75C2 6.33579 2.33579 6 2.75 6H17.25C17.6642 6 18 6.33579 18 6.75C18 7.16421 17.6642 7.5 17.25 7.5H2.75C2.33579 7.5 2 7.16421 2 6.75ZM2 13.25C2 12.8358 2.33579 12.5 2.75 12.5H17.25C17.6642 12.5 18 12.8358 18 13.25C18 13.6642 17.6642 14 17.25 14H2.75C2.33579 14 2 13.6642 2 13.25Z" />
        </svg>
    );
}

function CloseMenuIcon() {
    return (
        <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true" className="size-5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
    );
}

function MobileSidebar({
    open,
    close,
    children,
}: React.PropsWithChildren<{ open: boolean; close: () => void }>) {
    return (
        <Headless.Dialog open={open} onClose={close} className="lg:hidden">
            <Headless.DialogBackdrop
                transition
                className="fixed inset-0 bg-black/30 transition data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
            />
            <Headless.DialogPanel
                transition
                className="fixed inset-y-0 w-full max-w-80 p-2 transition duration-300 ease-in-out data-closed:-translate-x-full"
            >
                <div className="flex h-full flex-col rounded-lg bg-white shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
                    <div className="-mb-3 px-4 pt-3">
                        <Headless.CloseButton
                            as="button"
                            aria-label="Close navigation"
                            className="p-2"
                        >
                            <CloseMenuIcon />
                        </Headless.CloseButton>
                    </div>
                    {children}
                </div>
            </Headless.DialogPanel>
        </Headless.Dialog>
    );
}

export function SidebarLayout({
    navbar,
    sidebar,
    children,
}: React.PropsWithChildren<{ navbar?: React.ReactNode; sidebar: React.ReactNode }>) {
    const [showSidebar, setShowSidebar] = useState(false);

    return (
        <div className="relative isolate flex min-h-svh w-full max-lg:flex-col">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_42%,#f8fafc_100%)] dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_42%,#020617_100%)]" />
            <div className="relative z-10 flex min-h-svh flex-1 items-center justify-center px-6 py-10 lg:hidden">
                <div className="w-full max-w-md rounded-[2rem] border border-slate-300/80 bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/70 dark:border-white/10 dark:bg-slate-950 dark:ring-white/10">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Desktop lebih ideal
                    </div>
                    <h1 className="mt-4 text-3xl font-medium tracking-[-0.04em] text-slate-950 dark:text-white">
                        Buka aplikasi ini di layar desktop.
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Dashboard, tabel laporan, dan alur ekspor PDF paling baik digunakan di
                        desktop atau laptop.
                    </p>
                    {navbar ? <div className="mt-6">{navbar}</div> : null}
                </div>
            </div>
            {/* Sidebar on desktop */}
            <div className="fixed inset-y-0 left-0 z-30 w-64 max-lg:hidden">{sidebar}</div>

            {/* Sidebar on mobile */}
            <MobileSidebar open={showSidebar} close={() => setShowSidebar(false)}>
                {sidebar}
            </MobileSidebar>

            {/* Navbar on mobile */}
            <header className="hidden border-b border-slate-200/70 bg-white/95 px-4 lg:hidden dark:border-white/10 dark:bg-slate-950/95">
                <div className="py-2.5">
                    <button
                        onClick={() => setShowSidebar(true)}
                        aria-label="Open navigation"
                        className="p-2"
                    >
                        <OpenMenuIcon />
                    </button>
                </div>
                <div className="min-w-0 flex-1">{navbar}</div>
            </header>

            {/* Content Area - The Inset Magic */}
            {/* lg:pt-2 lg:pr-2 lg:pl-64 -> Creates the floating card effect */}
            <main className="relative z-0 hidden flex-1 flex-col px-3 pb-3 lg:flex lg:min-w-0 lg:pl-64 lg:pr-3 lg:pt-3">
                <div className="grow overflow-hidden rounded-[2rem] border border-slate-300/80 bg-white p-5 shadow-sm ring-1 ring-slate-200/70 lg:p-8 dark:border-white/10 dark:bg-slate-950 dark:ring-white/10">
                    <div className="mx-auto max-w-7xl">{children}</div>
                </div>
            </main>
        </div>
    );
}
