import { logger } from "./logger.js";

interface DiscordEmbed {
    title: string;
    description: string;
    color: number;
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    timestamp?: string;
}

/**
 * Send a notification to Discord via webhook.
 */
export async function sendDiscordNotification(embed: DiscordEmbed): Promise<void> {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        logger.warn("DISCORD_WEBHOOK_URL not configured, skipping notification");
        return;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                embeds: [
                    {
                        ...embed,
                        timestamp: embed.timestamp || new Date().toISOString(),
                    },
                ],
            }),
        });

        if (!response.ok) {
            throw new Error(`Discord webhook error: ${response.status}`);
        }

        logger.info("Discord notification sent successfully");
    } catch (error) {
        logger.error({ error }, "Failed to send Discord notification");
    }
}

/**
 * Send an error alert to Discord.
 */
export async function sendDiscordAlert(title: string, error: string): Promise<void> {
    await sendDiscordNotification({
        title: `⚠️ ${title}`,
        description: error,
        color: 0xff0000, // Red
    });
}
