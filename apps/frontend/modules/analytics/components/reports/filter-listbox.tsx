import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
    Transition,
} from "@headlessui/react";
import { CheckCircle2, ChevronDown, Layers, Loader2 } from "lucide-react";
import { Fragment } from "react";
import { Text } from "@/shared/components/catalyst/text";
import { cn } from "@/shared/lib/utils";

export interface SelectOption {
    id: string;
    label: string;
    sub?: string;
    desc?: string;
    icon?: React.ElementType;
    group?: string;
    disabled?: boolean;
}

interface FilterListboxProps {
    value: SelectOption;
    onChange: (option: SelectOption) => void;
    options: SelectOption[];
    title?: string;
    icon?: React.ElementType; // Icon for the trigger button
    prefix?: string; // e.g. "vs"
    disabled?: boolean;
    loading?: boolean;
}

export function FilterListbox({
    value,
    onChange,
    options,
    title,
    icon: TriggerIcon,
    prefix,
    disabled,
    loading,
}: FilterListboxProps) {
    return (
        <div className="relative">
            <Listbox value={value} onChange={onChange} disabled={disabled || loading}>
                {({ open }) => (
                    <>
                        <ListboxButton
                            className={cn(
                                "flex min-h-11 min-w-[13rem] items-center gap-3 rounded-[1rem] border px-3.5 py-2.5 text-left text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                                open
                                    ? "border-blue-200 bg-blue-50 text-blue-700 ring-2 ring-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-900/20"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                                (disabled || loading) &&
                                    "cursor-not-allowed bg-slate-50 opacity-50 dark:bg-zinc-900",
                            )}
                        >
                            {loading ? (
                                <Loader2 size={16} className="animate-spin text-slate-400" />
                            ) : (
                                TriggerIcon && (
                                    <TriggerIcon
                                        size={16}
                                        className={open ? "text-blue-500" : "text-slate-400"}
                                    />
                                )
                            )}
                            <span className="min-w-0 flex-1">
                                {title ? (
                                    <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                        {title}
                                    </span>
                                ) : null}
                                <span className="block truncate">
                                    {prefix && (
                                        <span className="mr-1 text-slate-400 dark:text-slate-500">
                                            {prefix}
                                        </span>
                                    )}
                                    {value.label || "Pilih"}
                                </span>
                            </span>
                            <ChevronDown
                                size={16}
                                className={cn(
                                    "ml-auto text-slate-400 transition-transform",
                                    open && "rotate-180",
                                )}
                            />
                        </ListboxButton>

                        <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <ListboxOptions className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-80 overflow-hidden rounded-[1.25rem] bg-white shadow-xl ring-1 ring-black/5 focus:outline-none dark:bg-zinc-900 dark:ring-white/10">
                                {title && (
                                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
                                        <Text className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                                            {title}
                                        </Text>
                                    </div>
                                )}
                                <div className="p-1.5 space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                                    {options.map((opt, index) => {
                                        const showHeader =
                                            opt.group &&
                                            (index === 0 || options[index - 1].group !== opt.group);
                                        const showDivider = index > 0 && showHeader;

                                        return (
                                            <Fragment key={opt.id}>
                                                {showDivider && (
                                                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1 mx-2" />
                                                )}
                                                {showHeader && (
                                                    <div className="px-3 py-1.5 mt-1">
                                                        <Text className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                                                            {opt.group}
                                                        </Text>
                                                    </div>
                                                )}
                                                <ListboxOption
                                                    value={opt}
                                                    disabled={opt.disabled}
                                                    className={({ active, selected }) =>
                                                        cn(
                                                            "relative cursor-pointer select-none rounded-xl py-3 pl-3 pr-9 transition-colors",
                                                            opt.disabled &&
                                                                "opacity-50 cursor-not-allowed",
                                                            active || selected
                                                                ? "bg-blue-50 dark:bg-blue-900/20"
                                                                : "text-zinc-900 dark:text-zinc-100",
                                                        )
                                                    }
                                                >
                                                    {({ selected, active }) => (
                                                        <>
                                                            <div className="flex items-start gap-3">
                                                                <div
                                                                    className={cn(
                                                                        "flex items-center justify-center p-2 rounded-lg transition-colors flex-shrink-0",
                                                                        selected || active
                                                                            ? "bg-blue-100/50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                                                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500",
                                                                    )}
                                                                >
                                                                    {opt.icon ? (
                                                                        <opt.icon className="h-5 w-5" />
                                                                    ) : (
                                                                        <Layers className="h-5 w-5" />
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span
                                                                        className={cn(
                                                                            "block truncate font-semibold text-[13px]",
                                                                            selected
                                                                                ? "text-blue-700 dark:text-blue-400"
                                                                                : "text-zinc-900 dark:text-white",
                                                                        )}
                                                                    >
                                                                        {opt.label}
                                                                    </span>
                                                                    {(opt.sub || opt.desc) && (
                                                                        <span
                                                                            className={cn(
                                                                                "block truncate text-[11px] font-medium mt-0.5",
                                                                                selected
                                                                                    ? "text-blue-600/70 dark:text-blue-400/70"
                                                                                    : "text-zinc-400 dark:text-zinc-500",
                                                                            )}
                                                                        >
                                                                            {opt.sub || opt.desc}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {selected && (
                                                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 dark:text-blue-400">
                                                                    <CheckCircle2
                                                                        className="h-4 w-4"
                                                                        aria-hidden="true"
                                                                    />
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </ListboxOption>
                                            </Fragment>
                                        );
                                    })}
                                </div>
                            </ListboxOptions>
                        </Transition>
                    </>
                )}
            </Listbox>
        </div>
    );
}
