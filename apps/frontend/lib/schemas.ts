import * as z from "zod";

export const accountSchema = z.object({
    username: z.string().min(1, "Name is required"),
    instagram: z.string().optional().nullable(),
    tiktok: z.string().optional().nullable(),
    twitter: z.string().optional().nullable(),
    isActive: z.boolean(),
    // Changed from single categoryId to categoryIds array for many-to-many
    categoryIds: z.array(z.string()).default([]),
    categoryName: z.string().optional(), // For CSV import convenience (legacy)
});

// Output type (after parsing with defaults applied)
export type AccountInput = z.infer<typeof accountSchema>;

// Input type (before parsing, categoryIds is optional)
export type AccountFormInput = z.input<typeof accountSchema>;
