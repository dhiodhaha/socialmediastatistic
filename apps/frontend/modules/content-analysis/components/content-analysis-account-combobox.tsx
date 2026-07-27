"use client";

import type { Platform } from "@repo/types";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/shared/components/ui/combobox";

type AccountOption = {
    id: string;
    username: string;
    handles: Record<Platform, string | null>;
};

type ContentAnalysisAccountComboboxProps = {
    accounts: AccountOption[];
    value: AccountOption | null;
    onChange: (account: AccountOption | null) => void;
};

const PLATFORM_LABELS: Partial<Record<Platform, string>> = {
    INSTAGRAM: "IG",
    TIKTOK: "TT",
    TWITTER: "X",
    THREADS: "Threads",
    YOUTUBE: "YT",
};

export function ContentAnalysisAccountCombobox({
    accounts,
    value,
    onChange,
}: ContentAnalysisAccountComboboxProps) {
    return (
        <Combobox<AccountOption>
            items={accounts}
            value={value}
            onValueChange={onChange}
            itemToStringLabel={(account) => account.username}
            isItemEqualToValue={(item, selected) => item.id === selected.id}
            filter={filterAccount}
            limit={60}
        >
            <ComboboxInput
                className="h-11 w-full rounded-xl bg-white text-base/7 sm:text-sm/6"
                placeholder="Cari akun internal..."
                showClear={false}
            />
            <ComboboxContent className="rounded-xl">
                <ComboboxEmpty>Akun tidak ditemukan.</ComboboxEmpty>
                <ComboboxList>
                    {(account: AccountOption) => (
                        <ComboboxItem key={account.id} value={account} className="py-3">
                            <div className="min-w-0 space-y-1">
                                <div className="truncate text-base/7 font-medium text-zinc-900 sm:text-sm/6">
                                    {account.username}
                                </div>
                                <div className="flex flex-wrap gap-1.5 text-xs/5 text-zinc-500">
                                    {formatHandles(account).map((handle) => (
                                        <div
                                            key={handle}
                                            className="rounded-full bg-zinc-100 px-2 py-0.5"
                                        >
                                            {handle}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}

function filterAccount(account: AccountOption, query: string) {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return true;

    const haystack = normalizeSearch(
        [
            account.username,
            account.handles.INSTAGRAM,
            account.handles.TIKTOK,
            account.handles.TWITTER,
            account.handles.THREADS,
            account.handles.YOUTUBE,
        ]
            .filter(Boolean)
            .join(" "),
    );

    return haystack.includes(normalizedQuery);
}

function formatHandles(account: AccountOption) {
    const handles = (Object.keys(PLATFORM_LABELS) as Platform[])
        .map((platform) => {
            const handle = account.handles[platform];
            return handle ? `${PLATFORM_LABELS[platform]} @${handle}` : null;
        })
        .filter((handle): handle is string => Boolean(handle));

    return handles.length > 0 ? handles : ["Belum ada handle"];
}

function normalizeSearch(value: string) {
    return value.toLowerCase().replaceAll("@", "").trim();
}
