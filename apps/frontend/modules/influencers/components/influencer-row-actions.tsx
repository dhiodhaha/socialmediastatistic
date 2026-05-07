"use client";

import type { Platform } from "@repo/database";
import { MoreHorizontal, Pencil, RotateCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/catalyst/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { runInfluencerScrape } from "../actions/influencer.actions";
import { InfluencerDialog } from "./influencer-dialog";

type InfluencerRowActionsProps = {
    influencer: {
        id: string;
        name: string;
        displayAlias: string | null;
        note: string | null;
        size: string | null;
        professionInstitution: string | null;
        profileSentiment: string | null;
        canonicalUrl: string | null;
        instagramHandle: string | null;
        tiktokHandle: string | null;
        twitterHandle: string | null;
        threadsHandle: string | null;
        youtubeHandle: string | null;
        topics: string[];
        isActive: boolean;
        activePlatforms: Platform[];
    };
};

export function InfluencerRowActions({ influencer }: InfluencerRowActionsProps) {
    const [editOpen, setEditOpen] = useState(false);
    const [rescraping, setRescraping] = useState(false);

    const handleRescrape = async () => {
        if (influencer.activePlatforms.length === 0) {
            toast.error("Influencer ini belum punya platform aktif untuk discrape.");
            return;
        }

        setRescraping(true);
        const result = await runInfluencerScrape({
            influencerIds: [influencer.id],
            platforms: influencer.activePlatforms,
        });

        if (result.success) {
            toast.success("Scrape ulang dijalankan.");
        } else {
            toast.error(result.error || "Gagal menjalankan scrape ulang.");
        }

        setRescraping(false);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button plain aria-label={`Aksi untuk ${influencer.name}`}>
                        <MoreHorizontal className="h-4 w-4" data-slot="icon" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleRescrape} disabled={rescraping}>
                        <RotateCw className="h-4 w-4" />
                        {rescraping ? "Menjalankan..." : "Scrape ulang"}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <InfluencerDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                initialValues={influencer}
            />
        </>
    );
}
