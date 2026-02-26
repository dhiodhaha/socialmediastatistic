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
                                "flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95",
                                open
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 ring-2 ring-blue-100 dark:ring-blue-900/20"
                                    : "text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700",
                                (disabled || loading) &&
                                    "opacity-50 cursor-not-allowed active:scale-100 bg-zinc-50 dark:bg-zinc-900",
                            )}
                        >
                            {loading ? (
                                <Loader2 size={14} className="animate-spin text-zinc-400" />
                            ) : (
                                TriggerIcon && (
                                    <TriggerIcon
                                        size={14}
                                        className={open ? "text-blue-500" : "text-zinc-400"}
                                    />
                                )
                            )}
                            <span className="truncate max-w-[140px] text-left">
                                {prefix && <span className="text-zinc-400 mr-1">{prefix}</span>}
                                {value.label || "Select"}
                            </span>
                            <ChevronDown
                                size={14}
                                className={cn(
                                    "text-zinc-400 transition-transform ml-auto",
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
                            <ListboxOptions className="absolute top-12 left-0 z-50 w-72 overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none">
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
                                                    className={({ active, selected }) =>
                                                        cn(
                                                            "relative cursor-pointer select-none rounded-xl py-3 pl-3 pr-9 transition-colors",
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
