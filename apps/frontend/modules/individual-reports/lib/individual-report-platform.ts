import type { Platform } from "@repo/database";

export function platformHandle(
    account: { instagram: string | null; tiktok: string | null; twitter: string | null },
    platform: Platform,
) {
    if (platform === "INSTAGRAM") return account.instagram;
    if (platform === "TIKTOK") return account.tiktok;
    return account.twitter;
}

export function platformDisplayName(platform: Platform): string {
    if (platform === "INSTAGRAM") return "Instagram";
    if (platform === "TIKTOK") return "TikTok";
    return "Twitter / X";
}

export function buildCoverageLabel(
    results: Array<{ platform: string | Platform; status?: string; success?: boolean }>,
): string {
    const included = results
        .filter((result) => result.status === "SUCCESS" || result.success === true)
        .map((result) => platformDisplayName(result.platform as Platform));

    const excluded = results
        .filter((result) => result.status === "FAILED" || result.success === false)
        .map((result) => platformDisplayName(result.platform as Platform));

    if (excluded.length === 0) return "";
    if (included.length === 0) return `Semua platform gagal: ${excluded.join(", ")}`;
    return `Termasuk: ${included.join(", ")}; Tidak tersedia: ${excluded.join(", ")}`;
}
