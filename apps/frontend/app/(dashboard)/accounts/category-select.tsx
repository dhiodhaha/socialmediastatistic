"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";

export function CategorySelect({
    categories,
    defaultValue = "ALL"
}: {
    categories: { id: string; name: string }[],
    defaultValue?: string
}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleValueChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "ALL") {
            params.set("categoryId", value);
        } else {
            params.delete("categoryId");
        }
        params.delete("page"); // Reset pagination
        router.push(`?${params.toString()}`);
    };

    return (
        <Select value={defaultValue} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
