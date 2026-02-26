import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/shared/components/catalyst/select";

export function CategorySelect({
    categories,
    defaultValue = "ALL",
}: {
    categories: { id: string; name: string }[];
    defaultValue?: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleValueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
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
        <div className="w-[180px]">
            <Select value={defaultValue} onChange={handleValueChange}>
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                        {cat.name}
                    </option>
                ))}
            </Select>
        </div>
    );
}
