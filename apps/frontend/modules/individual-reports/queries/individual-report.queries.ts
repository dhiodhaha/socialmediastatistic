import "server-only";

import { prisma } from "@repo/database";
import type { PortfolioPlatform } from "@repo/types";

export async function getIndividualReportAccountOptionsQuery() {
    const accounts = await prisma.account.findMany({
        where: { isActive: true },
        orderBy: { username: "asc" },
        select: {
            id: true,
            username: true,
            instagram: true,
            tiktok: true,
            twitter: true,
        },
    });

    return accounts.map((account) => ({
        id: account.id,
        username: account.username,
        handles: {
            INSTAGRAM: account.instagram,
            TIKTOK: account.tiktok,
            TWITTER: account.twitter,
        } satisfies Record<PortfolioPlatform, string | null>,
    }));
}
