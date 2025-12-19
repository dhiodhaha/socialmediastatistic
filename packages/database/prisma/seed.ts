import dotenv from "dotenv";
import { resolve } from "path";

// Load .env BEFORE importing prisma
dotenv.config({ path: resolve(process.cwd(), ".env") });

async function main() {
    // Dynamic import AFTER dotenv is loaded
    const { hash } = await import("bcryptjs");
    const { prisma } = await import("../src/index");

    console.log("🌱 Seeding database...");

    // Create admin user
    const hashedPassword = await hash("admin123", 12);

    const adminUser = await prisma.user.upsert({
        where: { email: "admin@socialmedia.gov" },
        update: {},
        create: {
            email: "admin@socialmedia.gov",
            password: hashedPassword,
            name: "Admin User",
        },
    });

    console.log("✅ Created admin user:", adminUser.email);

    // Create sample accounts
    const sampleAccounts = [
        {
            platform: "INSTAGRAM" as const,
            handle: "kemikidn",
            displayName: "Kementerian Keuangan RI",
        },
        {
            platform: "INSTAGRAM" as const,
            handle: "presidenri",
            displayName: "Presiden RI",
        },
        {
            platform: "INSTAGRAM" as const,
            handle: "kikidn",
            displayName: "Kementerian Keuangan",
        },
        {
            platform: "TIKTOK" as const,
            handle: "kemikidn",
            displayName: "Kementerian Keuangan RI",
        },
        {
            platform: "TWITTER" as const,
            handle: "KemenkeuRI",
            displayName: "Kementerian Keuangan RI",
        },
        {
            platform: "TWITTER" as const,
            handle: "jaborekpns",
            displayName: "BKN Official",
        },
    ];

    for (const account of sampleAccounts) {
        await prisma.account.upsert({
            where: {
                platform_handle: {
                    platform: account.platform,
                    handle: account.handle,
                },
            },
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
