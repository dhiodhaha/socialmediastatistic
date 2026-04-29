"use client";

import { Check, Copy, Database, Download, FileSpreadsheet, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/catalyst/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

// Templates
const ACCOUNT_TEMPLATE = `name,instagram,tiktok,x,category
Brand Contoh,brandcontoh,brandcontoh_id,brandcontoh,Portofolio Utama
Tim Produk,produkcontoh,,produkcontoh,Divisi Produk
Tokoh Publik,tokohcontoh,tokohcontoh,,Personal Brand`;

const SNAPSHOT_TEMPLATE = `account_username,platform,scraped_at,followers,following,posts,engagement,likes
kemenkeuri,INSTAGRAM,2024-11-30,500000,100,2500,1.5,
kemenkeuri,TIKTOK,2024-11-30,250000,,1200,,10000000
setkabgoid,INSTAGRAM,2024-11-30,300000,50,1800,2.1,`;

// AI Prompts
const ACCOUNT_AI_PROMPT = `Saya memiliki data akun media sosial yang perlu diubah ke format CSV tertentu.

FORMAT TUJUAN (CSV):
name,instagram,tiktok,x,category

CARA MEMBACA KOLOM:
- name: Nama tampilan akun/organisasi (wajib)
- instagram: Nama pengguna Instagram (tanpa @)
- tiktok: Nama pengguna TikTok (tanpa @)
- x: Nama pengguna X/Twitter (tanpa @)
- category: Nama grup untuk pengelompokan (misalnya, "Portofolio Utama", "Brand", "Regional")

DATA SAYA:
[TEMPELKAN DATA DI SINI]

Tolong ubah data saya agar sesuai dengan format CSV tujuan. Jika ada kolom kosong atau tidak tersedia, biarkan kosong. Hapus simbol @ dari semua nama pengguna.`;

const SNAPSHOT_AI_PROMPT = `Saya memiliki data statistik media sosial terdahulu yang perlu diubah ke format CSV tertentu.

FORMAT TUJUAN (CSV):
account_username,platform,scraped_at,followers,following,posts,engagement,likes

CARA MEMBACA KOLOM:
- account_username: Handle/nama pengguna media sosial untuk platform terkait (contoh: "kemenkeuri" untuk Instagram, tanpa @)
- platform: Harus salah satu dari INSTAGRAM, TIKTOK, atau TWITTER (wajib, huruf besar)
- scraped_at: Tanggal dengan format YYYY-MM-DD, contoh 2024-11-30 (wajib)
- followers: Jumlah pengikut (wajib)
- following: Jumlah akun yang diikuti (opsional)
- posts: Jumlah postingan/video (opsional)
- engagement: Tingkat interaksi dalam bentuk desimal, contoh 1.5 untuk 1.5% (opsional)
- likes: Total suka, terutama untuk TikTok (opsional)

DATA SAYA:
[TEMPELKAN DATA DI SINI]

Tolong ubah data saya agar sesuai dengan format CSV tujuan. Pastikan:
1. Nama platform huruf besar (INSTAGRAM, TIKTOK, TWITTER)
2. account_username adalah handle akun pada platform tersebut, bukan nama tampilannya
3. Hapus simbol @ dari nama pengguna
4. Tanggal memakai format YYYY-MM-DD
5. Angka tidak memakai koma atau format khusus lain
6. Kolom opsional yang kosong dibiarkan kosong (bukan "N/A" atau "-")`;

function CopyButton({ text, label }: { text: string; label: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(`${label} disalin ke papan klip!`);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button outline onClick={handleCopy}>
            {copied ? (
                <Check className="h-4 w-4" data-slot="icon" />
            ) : (
                <Copy className="h-4 w-4" data-slot="icon" />
            )}
            {copied ? "Disalin!" : "Salin"}
        </Button>
    );
}

function DownloadButton({
    content,
    filename,
    label,
}: {
    content: string;
    filename: string;
    label: string;
}) {
    const handleDownload = () => {
        const blob = new Blob([content], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${label} berhasil diunduh!`);
    };

    return (
        <Button onClick={handleDownload}>
            <Download className="h-4 w-4" data-slot="icon" />
            Unduh template
        </Button>
    );
}

export default function DocsPage() {
    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold">Dokumentasi</h1>
                <p className="text-muted-foreground mt-1">
                    Pelajari cara memasukkan data ke dalam sistem
                </p>
            </div>

            <Tabs defaultValue="accounts" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="accounts" className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Impor Akun
                    </TabsTrigger>
                    <TabsTrigger value="snapshots" className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Data Historis
                    </TabsTrigger>
                </TabsList>

                {/* Account Import Tab */}
                <TabsContent value="accounts" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Template Impor Akun</CardTitle>
                            <CardDescription>
                                Gunakan template ini untuk impor akun media sosial dalam jumlah
                                besar
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                                <pre>{ACCOUNT_TEMPLATE}</pre>
                            </div>
                            <div className="flex gap-2">
                                <DownloadButton
                                    content={ACCOUNT_TEMPLATE}
                                    filename="account_import_template.csv"
                                    label="Template akun"
                                />
                                <CopyButton text={ACCOUNT_TEMPLATE} label="Template" />
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <h4 className="font-medium mb-2">Keterangan Kolom:</h4>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>
                                        <strong>name</strong> - Nama tampilan akun (wajib)
                                    </li>
                                    <li>
                                        <strong>instagram</strong> - Nama pengguna Instagram tanpa @
                                    </li>
                                    <li>
                                        <strong>tiktok</strong> - Nama pengguna TikTok tanpa @
                                    </li>
                                    <li>
                                        <strong>x</strong> - Nama pengguna X/Twitter tanpa @
                                    </li>
                                    <li>
                                        <strong>category</strong> - Nama grup untuk mengelompokkan
                                        akun
                                    </li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/30 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Prompt Konversi AI
                            </CardTitle>
                            <CardDescription>
                                Salin prompt ini lalu tempelkan ke ChatGPT/Claude bersama data Anda
                                untuk mengubahnya ke format kami
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-background p-4 rounded-md font-mono text-xs overflow-x-auto border max-h-60 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">{ACCOUNT_AI_PROMPT}</pre>
                            </div>
                            <CopyButton text={ACCOUNT_AI_PROMPT} label="Prompt AI" />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Historical Data Tab */}
                <TabsContent value="snapshots" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Template Impor Data Historis</CardTitle>
                            <CardDescription>
                                Gunakan template ini untuk mengimpor statistik terdahulu (snapshot)
                                untuk akun yang sudah ada
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                                <pre>{SNAPSHOT_TEMPLATE}</pre>
                            </div>
                            <div className="flex gap-2">
                                <DownloadButton
                                    content={SNAPSHOT_TEMPLATE}
                                    filename="snapshot_import_template.csv"
                                    label="Template snapshot"
                                />
                                <CopyButton text={SNAPSHOT_TEMPLATE} label="Template" />
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <h4 className="font-medium mb-2">Keterangan kolom:</h4>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>
                                        <strong>account_username</strong> - Harus sama persis dengan
                                        nama akun yang sudah ada (wajib)
                                    </li>
                                    <li>
                                        <strong>platform</strong> - INSTAGRAM, TIKTOK, atau TWITTER
                                        (wajib)
                                    </li>
                                    <li>
                                        <strong>scraped_at</strong> - Tanggal dengan format
                                        YYYY-MM-DD (wajib)
                                    </li>
                                    <li>
                                        <strong>followers</strong> - Jumlah pengikut (wajib)
                                    </li>
                                    <li>
                                        <strong>following</strong> - Jumlah yang diikuti (opsional)
                                    </li>
                                    <li>
                                        <strong>posts</strong> - Jumlah postingan/video (opsional)
                                    </li>
                                    <li>
                                        <strong>engagement</strong> - Tingkat interaksi dalam bentuk
                                        desimal (opsional)
                                    </li>
                                    <li>
                                        <strong>likes</strong> - Total suka, terutama untuk TikTok
                                        (opsional)
                                    </li>
                                </ul>
                            </div>

                            <div className="border-t pt-4 mt-4 p-3 bg-amber-500/10 rounded-md border-amber-500/30">
                                <p className="text-sm text-amber-700 dark:text-amber-400">
                                    <strong>Penting:</strong> <code>account_username</code> harus
                                    sama persis dengan akun yang sudah ada di sistem. Impor akun
                                    lebih dulu, lalu impor data historis.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/30 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Prompt konversi AI
                            </CardTitle>
                            <CardDescription>
                                Salin prompt ini lalu tempelkan ke ChatGPT/Claude bersama data Anda
                                untuk mengubahnya ke format kami
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-background p-4 rounded-md font-mono text-xs overflow-x-auto border max-h-60 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">{SNAPSHOT_AI_PROMPT}</pre>
                            </div>
                            <CopyButton text={SNAPSHOT_AI_PROMPT} label="Prompt AI" />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* AI Model Recommendations */}
            <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-500" />
                        Rekomendasi model AI
                    </CardTitle>
                    <CardDescription>
                        Model berikut paling cocok untuk mengubah data Anda ke template kami
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 rounded-lg bg-background border">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">🏆</span>
                                <h4 className="font-semibold">Paling direkomendasikan</h4>
                            </div>
                            <ul className="text-sm space-y-2">
                                <li>
                                    <strong>Claude 3.5 Sonnet</strong>
                                    <span className="text-muted-foreground block text-xs">
                                        Sangat baik untuk memahami struktur data dan format
                                    </span>
                                </li>
                                <li>
                                    <strong>GPT-4o</strong>
                                    <span className="text-muted-foreground block text-xs">
                                        Akurat untuk konversi data berbentuk tabel
                                    </span>
                                </li>
                            </ul>
                        </div>
                        <div className="p-4 rounded-lg bg-background border">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">💰</span>
                                <h4 className="font-semibold">Pilihan gratis</h4>
                            </div>
                            <ul className="text-sm space-y-2">
                                <li>
                                    <strong>ChatGPT Free (GPT-4o mini)</strong>
                                    <span className="text-muted-foreground block text-xs">
                                        Cocok untuk dataset kecil (&lt;100 baris)
                                    </span>
                                </li>
                                <li>
                                    <strong>Claude.ai Free</strong>
                                    <span className="text-muted-foreground block text-xs">
                                        Pesan harian terbatas tetapi kualitasnya baik
                                    </span>
                                </li>
                                <li>
                                    <strong>Google Gemini</strong>
                                    <span className="text-muted-foreground block text-xs">
                                        Tersedia paket gratis di gemini.google.com
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">
                            <strong>Tip:</strong> Untuk dataset besar (100+ baris), pecah data
                            menjadi beberapa bagian kecil lalu jalankan prompt beberapa kali.
                            Gabungkan hasilnya ke file CSV yang sama sebelum impor.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Start Guide */}
            <Card>
                <CardHeader>
                    <CardTitle>Panduan cepat</CardTitle>
                </CardHeader>
                <CardContent>
                    <ol className="list-decimal list-inside space-y-3 text-sm">
                        <li>
                            <strong>Buat grup laporan</strong> - Buka <code>/categories</code> lalu
                            buat grup pengelompokan akun
                        </li>
                        <li>
                            <strong>Impor akun</strong> - Unduh template akun, isi dengan data Anda,
                            lalu unggah di <code>/accounts</code>
                        </li>
                        <li>
                            <strong>Impor data historis</strong> (opsional) - Jika Anda punya
                            statistik terdahulu, gunakan template data historis di
                            <code>/history</code>
                        </li>
                        <li>
                            <strong>Mulai scraping</strong> - Buka <code>/history</code> lalu klik
                            tombol untuk mengambil data terbaru
                        </li>
                        <li>
                            <strong>Lihat laporan</strong> - Buka <code>/reports</code> untuk
                            melihat perbandingan dan mengekspor PDF
                        </li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    );
}
