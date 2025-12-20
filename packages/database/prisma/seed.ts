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
