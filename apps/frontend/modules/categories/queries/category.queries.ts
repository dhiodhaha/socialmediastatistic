import "server-only";

import { prisma } from "@repo/database";

export async function getCategoriesQuery() {
    return prisma.category.findMany({
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: { accounts: true },
            },
        },
    });
}
