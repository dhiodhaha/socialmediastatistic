"use server";

import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { hash, compare } from "bcryptjs";

// Get app settings (creates default if not exists)
export async function getSettings() {
    try {
        // @ts-ignore - Settings model exists after migration
        let settings = await prisma.settings.findUnique({
            where: { id: "app" }
        });

        if (!settings) {
            // @ts-ignore
            settings = await prisma.settings.create({
                data: { id: "app" }
            });
        }

        return { success: true, data: settings };
    } catch (e) {
        console.error("getSettings error:", e);
        return { success: false, error: "Failed to fetch settings" };
    }
}

// Update cron schedule
export async function updateCronSchedule(cronSchedule: string) {
    try {
        // Basic cron validation (5 parts separated by spaces)
        const parts = cronSchedule.trim().split(/\s+/);
        if (parts.length !== 5) {
            return { success: false, error: "Invalid cron format. Must have 5 parts (minute hour day month weekday)." };
        }

        // @ts-ignore - Settings model exists after migration
        const settings = await prisma.settings.upsert({
            where: { id: "app" },
            update: { cronSchedule },
            create: { id: "app", cronSchedule }
        });

        revalidatePath("/settings");
        return { success: true, data: settings };
    } catch (e) {
        console.error("updateCronSchedule error:", e);
        return { success: false, error: "Failed to update cron schedule" };
    }
}

// Get current user (for profile section)
export async function getCurrentUser(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, createdAt: true }
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        return { success: true, data: user };
    } catch (e) {
        console.error("getCurrentUser error:", e);
        return { success: false, error: "Failed to fetch user" };
    }
}

// Update user profile
export async function updateProfile(userId: string, data: { name?: string }) {
    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { name: data.name }
        });

        revalidatePath("/settings");
        return { success: true, data: { id: user.id, name: user.name, email: user.email } };
    } catch (e) {
        console.error("updateProfile error:", e);
        return { success: false, error: "Failed to update profile" };
    }
}

// Change password
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        const isValid = await compare(currentPassword, user.password);
        if (!isValid) {
            return { success: false, error: "Current password is incorrect" };
        }

        if (newPassword.length < 6) {
            return { success: false, error: "New password must be at least 6 characters" };
        }

        const hashedPassword = await hash(newPassword, 12);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        return { success: true };
    } catch (e) {
        console.error("changePassword error:", e);
        return { success: false, error: "Failed to change password" };
    }
}
