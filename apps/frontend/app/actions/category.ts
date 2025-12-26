"use server";

import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";

export async function getCategories() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: { accounts: true }
                }
            }
        });
        return { success: true, data: categories };
    } catch (e) {
        console.error("getCategories error:", e);
        return { success: false, error: "Failed to fetch categories" };
    }
}

export async function createCategory(name: string) {
    try {
        const existing = await prisma.category.findUnique({
            where: { name }
        });

        if (existing) {
            return { success: false, error: "Category already exists" };
        }

        const category = await prisma.category.create({
            data: { name }
        });

        revalidatePath("/categories");
        return { success: true, data: category };
    } catch (e) {
        console.error("createCategory error:", e);
        return { success: false, error: "Failed to create category" };
    }
}

export async function updateCategory(id: string, name: string) {
    try {
        const category = await prisma.category.update({
            where: { id },
            data: { name }
        });

        revalidatePath("/categories");
        return { success: true, data: category };
    } catch (e) {
        console.error("updateCategory error:", e);
        return { success: false, error: "Failed to update category" };
    }
}

export async function deleteCategory(id: string) {
    try {
        await prisma.category.delete({
            where: { id }
        });

        revalidatePath("/categories");
        return { success: true };
    } catch (e) {
        console.error("deleteCategory error:", e);
        return { success: false, error: "Failed to delete category" };
    }
}

