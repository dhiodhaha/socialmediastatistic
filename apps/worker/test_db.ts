import "dotenv/config";

async function test() {
    console.log("ENV check:");
    console.log("  DATABASE_URL set:", !!process.env.DATABASE_URL);
    console.log("  CWD:", process.cwd());

    try {
        console.log("\nImporting @repo/database...");
        const { prisma } = await import("@repo/database");

        console.log("Testing scrapingJob.findFirst...");
        const runningJob = await prisma.scrapingJob.findFirst({
            where: {
                status: "RUNNING",
                categoryId: null,
            },
            orderBy: { createdAt: "desc" },
        });
        console.log("Running job:", runningJob);

        console.log("\nTesting account.findMany...");
        const accounts = await prisma.account.findMany({
            where: { isActive: true },
        });
        console.log("Active accounts:", accounts.length);

        console.log("\nAll DB queries successful!");
    } catch (e: any) {
        console.error("\nERROR TYPE:", e?.constructor?.name);
        console.error("ERROR MESSAGE:", e?.message);
        console.error("ERROR CODE:", e?.code);
        console.error("FULL ERROR:", e);
    }
}

test();
