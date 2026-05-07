import { prisma, UserRole } from "../src";

function normalizeRole(input: string): UserRole | null {
    const role = input.trim().toUpperCase();

    if (role === UserRole.ADMIN || role === UserRole.EDITOR || role === UserRole.VIEWER) {
        return role as UserRole;
    }

    return null;
}

async function main() {
    const [, , email, roleInput] = process.argv;

    if (!email || !roleInput) {
        throw new Error(
            "Usage: pnpm --filter @repo/database db:set-role <email> <ADMIN|EDITOR|VIEWER>",
        );
    }

    const role = normalizeRole(roleInput);

    if (!role) {
        throw new Error(`Invalid role "${roleInput}". Use ADMIN, EDITOR, or VIEWER.`);
    }

    const user = await prisma.user.update({
        where: { email },
        data: { role },
        select: {
            id: true,
            email: true,
            role: true,
        },
    });

    console.log(`Updated ${user.email} to role ${user.role}.`);
    await prisma.$disconnect();
}

main().catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
});
