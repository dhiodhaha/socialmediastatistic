import "server-only";

import { prisma } from "@repo/database";

export async function getAccountsQuery(page = 1, limit = 10, search = "", categoryId?: string) {
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = search
        ? {
              OR: [
                  { username: { contains: search, mode: "insensitive" as const } },
                  { instagram: { contains: search, mode: "insensitive" as const } },
                  { tiktok: { contains: search, mode: "insensitive" as const } },
                  { twitter: { contains: search, mode: "insensitive" as const } },
              ],
          }
        : {};

    if (categoryId && categoryId !== "ALL") {
        where.categories = {
            some: { categoryId },
        };
    }

    const [accounts, total] = await Promise.all([
        prisma.account.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                categories: {
                    include: { category: true },
                },
                snapshots: {
                    orderBy: { scrapedAt: "desc" },
                    take: 2,
                },
            },
        }),
        prisma.account.count({ where }),
    ]);

    const accountsWithGrowth = accounts.map((account) => {
        let growth: number | null = null;
        if (account.snapshots.length >= 2) {
            const latest = account.snapshots[0].followers;
            const previous = account.snapshots[1].followers;
            if (previous > 0) {
                growth = ((latest - previous) / previous) * 100;
            }
        }

        return { ...account, growth };
    });

    return {
        data: accountsWithGrowth,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}
