import { z } from "zod";

export const accountSchema = z.object({
    username: z.string().min(1, "Name is required"),
    instagram: z.string().optional().nullable(),
    tiktok: z.string().optional().nullable(),
    twitter: z.string().optional().nullable(),
    isActive: z.boolean(),
});

export type AccountInput = z.infer<typeof accountSchema>;
