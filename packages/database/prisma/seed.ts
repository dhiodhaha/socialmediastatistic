import { resolve } from "node:path";
import * as dotenv from "dotenv";

// Load .env BEFORE importing prisma
dotenv.config({ path: resolve(process.cwd(), ".env") });

async function main() {
    // Dynamic import AFTER dotenv is loaded
    const { hash } = await import("bcryptjs");
    const { prisma } = await import("../src/index");

    console.log("🌱 Seeding database...");

    const seedAdminEmail = process.env.SEED_ADMIN_EMAIL;
    const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;

    if ((seedAdminEmail && !seedAdminPassword) || (!seedAdminEmail && seedAdminPassword)) {
        throw new Error("Set both SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, or neither.");
    }

    if (seedAdminEmail && seedAdminPassword) {
        const hashedPassword = await hash(seedAdminPassword, 12);

        const adminUser = await prisma.user.upsert({
            where: { email: seedAdminEmail },
            update: {
                password: hashedPassword,
                name: "Admin User",
            },
            create: {
                email: seedAdminEmail,
                password: hashedPassword,
                name: "Admin User",
            },
        });

        console.log("✅ Upserted admin user:", adminUser.email);
    } else {
        console.log(
            "ℹ️ Skipping admin user seed. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.",
        );
    }

    // Create sample accounts
    const sampleAccounts = [
        {
            username: "Dhio Dhafin",
            instagram: "dhiodhaha",
            tiktok: "dhiodhaha",
            twitter: "dhiodhaha",
        },
        {
            username: "Kementerian Keuangan",
            instagram: "kemenkeuri",
            tiktok: "kemenkeuri",
            twitter: "KemenkeuRI",
        },
        {
            username: "Sekretariat Kabinet",
            instagram: "setkabgoid",
            tiktok: null, // Example of missing handle
            twitter: "setkabgoid",
        },
    ];

    for (const account of sampleAccounts) {
        await prisma.account.upsert({
            where: { username: account.username },
            update: {},
            create: account,
        });
    }

    console.log(`✅ Created ${sampleAccounts.length} sample accounts`);

    console.log("🎉 Seeding complete!");

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
});
