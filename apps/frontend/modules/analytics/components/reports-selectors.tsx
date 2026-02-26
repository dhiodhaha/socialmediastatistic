"use client";

import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
    Transition,
} from "@headlessui/react";
import { Check, ChevronDown, FileText } from "lucide-react";
import { Fragment } from "react";
import { Text } from "@/shared/components/catalyst/text";
import { cn } from "@/shared/lib/utils";

export type RichSelectOption = {
    id: string;
    label: string;
    sublabel?: string;
    icon?: React.ElementType;
    badge?: string;
};

interface RichSelectProps {
    value: RichSelectOption;
    onChange: (value: RichSelectOption) => void;
    options: RichSelectOption[];
    label: string;
    placeholder?: string;
    icon?: React.ElementType;
    className?: string;
}

export function RichSelect({
    value,
    onChange,
    options,
    label,
    icon: TriggerIcon,
    className,
}: RichSelectProps) {
    return (
        <div className="relative w-full">
            <Listbox value={value} onChange={onChange}>
                <ListboxButton
                    className={cn(
                        "relative w-full cursor-pointer rounded-xl bg-white dark:bg-zinc-900 py-2.5 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm sm:leading-6",
                        "flex items-center gap-2.5",
                        className,
                    )}
                >
                    {TriggerIcon && <TriggerIcon className="h-4 w-4 text-primary" />}
                    <span className="block truncate font-medium text-zinc-900 dark:text-white">
                        {value.label}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDown className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                    </span>
                </ListboxButton>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <ListboxOptions className="absolute z-10 mt-2 max-h-96 w-72 overflow-auto rounded-2xl bg-white dark:bg-zinc-900 py-2 shadow-xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none sm:text-sm">
                        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                            <Text className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                                {label}
                            </Text>
                        </div>
                        <div className="p-1.5 space-y-1">
                            {options.map((option) => (
                                <ListboxOption
                                    key={option.id}
                                    value={option}
                                    className={({ active, selected }) =>
                                        cn(
                                            "relative cursor-pointer select-none rounded-xl py-3 pl-3 pr-9 transition-colors",
                                            active
                                                ? "bg-blue-50 dark:bg-blue-900/20"
                                                : "text-zinc-900 dark:text-zinc-100",
                                            selected ? "bg-blue-50 dark:bg-blue-900/20" : "",
                                        )
                                    }
                                >
                                    {({ selected, active }) => (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={cn(
                                                        "flex items-center justify-center p-2 rounded-lg transition-colors",
                                                        selected || active
                                                            ? "bg-blue-100/50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500",
                                                    )}
                                                >
                                                    {option.icon ? (
                                                        <option.icon className="h-5 w-5" />
                                                    ) : (
                                                        <FileText className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span
                                                        className={cn(
                                                            "block truncate font-semibold text-[13px]",
                                                            selected
                                                                ? "text-blue-700 dark:text-blue-400"
                                                                : "text-zinc-900 dark:text-white",
                                                        )}
                                                    >
                                                        {option.label}
                                                    </span>
                                                    {option.sublabel && (
                                                        <span
                                                            className={cn(
                                                                "block truncate text-[11px] font-medium mt-0.5",
                                                                selected
                                                                    ? "text-blue-600/70 dark:text-blue-400/70"
                                                                    : "text-zinc-400 dark:text-zinc-500",
                                                            )}
                                                        >
                                                            {option.sublabel}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {selected ? (
                                                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 dark:text-blue-400">
                                                    <Check className="h-4 w-4" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </ListboxOption>
                            ))}
                        </div>
                    </ListboxOptions>
                </Transition>
            </Listbox>
        </div>
    );
}
