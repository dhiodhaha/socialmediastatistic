"use client";

import { Avatar } from "@/shared/components/catalyst/avatar";
import { Badge } from "@/shared/components/catalyst/badge";
import { Button } from "@/shared/components/catalyst/button";
import { Checkbox, CheckboxField, CheckboxGroup } from "@/shared/components/catalyst/checkbox";
import { Divider } from "@/shared/components/catalyst/divider";
import {
    Description,
    Field,
    FieldGroup,
    Fieldset,
    Label,
    Legend,
} from "@/shared/components/catalyst/fieldset";
import { Heading, Subheading } from "@/shared/components/catalyst/heading";
import { Input } from "@/shared/components/catalyst/input";
import { Radio, RadioField, RadioGroup } from "@/shared/components/catalyst/radio";
import { Select } from "@/shared/components/catalyst/select";
import { Switch, SwitchField } from "@/shared/components/catalyst/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/catalyst/table";
import { Code, Strong, Text } from "@/shared/components/catalyst/text";

export default function DesignSystemPage() {
    return (
        <div className="mx-auto max-w-4xl space-y-16 p-10">
            <div className="space-y-4">
                <Heading>Sistem Desain</Heading>
                <Text>
                    Kumpulan komponen inti dan token yang menjaga estetika &quot;bersih dan
                    terstruktur&quot; (Catalyst UI).
                </Text>
            </div>

            <Divider />

            {/* Typography Section */}
            <section className="space-y-8">
                <Heading level={2}>Tipografi</Heading>
                <div className="space-y-4">
                    <Heading level={1}>Heading 1</Heading>
                    <Heading level={2}>Heading 2</Heading>
                    <Heading level={3}>Heading 3</Heading>
                    <Subheading level={4}>Subjudul (kira-kira H4)</Subheading>
                    <Text>
                        Teks isi (reguler). Kalimat contoh ini dipakai untuk menguji tampilan{" "}
                        <Strong>teks contoh</Strong>. Efisiensi adalah inti sistem desain ini.
                    </Text>
                    <Text>
                        <Code>Kode monospace</Code> untuk detail teknis menggunakan{" "}
                        <Code>Inter</Code> dengan <Code>cv11</Code>.
                    </Text>
                </div>
            </section>

            <Divider />

            {/* Buttons Section */}
            <section className="space-y-8">
                <Heading level={2}>Tombol</Heading>
                <div className="flex flex-wrap gap-4">
                    <Button>Utama (Solid)</Button>
                    <Button color="zinc">Solid Zinc</Button>
                    <Button color="indigo">Solid Indigo</Button>
                    <Button color="cyan">Solid Cyan</Button>
                    <Button color="red">Solid Merah</Button>
                    <Button outline>Outline</Button>
                    <Button plain>Polos</Button>
                </div>
            </section>

            <Divider />

            {/* Badges Section */}
            <section className="space-y-8">
                <Heading level={2}>Label</Heading>
                <div className="flex flex-wrap gap-4">
                    <Badge>Default</Badge>
                    <Badge color="zinc">Zinc</Badge>
                    <Badge color="red">Red</Badge>
                    <Badge color="orange">Orange</Badge>
                    <Badge color="amber">Amber</Badge>
                    <Badge color="yellow">Yellow</Badge>
                    <Badge color="lime">Lime</Badge>
                    <Badge color="green">Green</Badge>
                    <Badge color="emerald">Emerald</Badge>
                    <Badge color="teal">Teal</Badge>
                    <Badge color="cyan">Cyan</Badge>
                    <Badge color="sky">Sky</Badge>
                    <Badge color="blue">Blue</Badge>
                    <Badge color="indigo">Indigo</Badge>
                    <Badge color="violet">Violet</Badge>
                    <Badge color="purple">Purple</Badge>
                    <Badge color="fuchsia">Fuchsia</Badge>
                    <Badge color="pink">Pink</Badge>
                    <Badge color="rose">Rose</Badge>
                </div>
            </section>

            <Divider />

            {/* Avatars Section */}
            <section className="space-y-8">
                <Heading level={2}>Avatar</Heading>
                <div className="flex flex-wrap gap-4">
                    <Avatar src="/placeholder-avatar.jpg" initials="SM" />
                    <Avatar initials="AB" className="bg-purple-500 text-white" />
                    <Avatar initials="CD" className="bg-emerald-500 text-white" />
                    <Avatar initials="EF" className="bg-blue-500 text-white" />
                </div>
            </section>

            <Divider />

            {/* Form Elements Section */}
            <section className="space-y-8">
                <Heading level={2}>Elemen Formulir</Heading>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div className="space-y-6">
                        <Field>
                            <Label>Alamat email</Label>
                            <Input name="email" type="email" placeholder="you@example.com" />
                            <Description>
                                Kami hanya akan memakainya untuk notifikasi penting.
                            </Description>
                        </Field>

                        <Field>
                            <Label>Negara</Label>
                            <Select name="country">
                                <option>Indonesia</option>
                                <option>Singapura</option>
                                <option>Malaysia</option>
                            </Select>
                        </Field>

                        <Fieldset>
                            <Legend>Notifikasi</Legend>
                            <CheckboxGroup>
                                <CheckboxField>
                                    <Checkbox name="email_notifications" defaultChecked />
                                    <Label>Notifikasi email</Label>
                                    <Description>
                                        Dapatkan email tentang aktivitas akun Anda.
                                    </Description>
                                </CheckboxField>
                                <CheckboxField>
                                    <Checkbox name="sms_notifications" />
                                    <Label>Notifikasi SMS</Label>
                                </CheckboxField>
                            </CheckboxGroup>
                        </Fieldset>
                    </div>

                    <div className="space-y-6">
                        <Fieldset>
                            <Legend>Notifikasi push</Legend>
                            <RadioGroup name="push_notifications" defaultValue="everything">
                                <RadioField>
                                    <Radio value="everything" />
                                    <Label>Semua</Label>
                                    <Description>Terima semua notifikasi push.</Description>
                                </RadioField>
                                <RadioField>
                                    <Radio value="same_email" />
                                    <Label>Sama seperti email</Label>
                                </RadioField>
                                <RadioField>
                                    <Radio value="nothing" />
                                    <Label>Tidak ada notifikasi push</Label>
                                </RadioField>
                            </RadioGroup>
                        </Fieldset>

                        <Fieldset>
                            <Legend>Pengaturan</Legend>
                            <FieldGroup>
                                <SwitchField>
                                    <Switch name="airplane_mode" />
                                    <Label>Mode pesawat</Label>
                                    <Description>Matikan semua koneksi jaringan.</Description>
                                </SwitchField>
                            </FieldGroup>
                        </Fieldset>
                    </div>
                </div>
            </section>

            <Divider />

            {/* Table Section */}
            <section className="space-y-8">
                <Heading level={2}>Tampilan Data (Tabel)</Heading>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeader>ID Transaksi</TableHeader>
                            <TableHeader>Status</TableHeader>
                            <TableHeader>Metode</TableHeader>
                            <TableHeader className="text-right">Jumlah</TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">TRX-987123</TableCell>
                            <TableCell>
                                <Badge color="emerald">Berhasil</Badge>
                            </TableCell>
                            <TableCell className="text-zinc-500">Kartu kredit</TableCell>
                            <TableCell className="text-right">$250.00</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">TRX-987124</TableCell>
                            <TableCell>
                                <Badge color="amber">Menunggu</Badge>
                            </TableCell>
                            <TableCell className="text-zinc-500">PayPal</TableCell>
                            <TableCell className="text-right">$39.99</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">TRX-987125</TableCell>
                            <TableCell>
                                <Badge color="emerald">Berhasil</Badge>
                            </TableCell>
                            <TableCell className="text-zinc-500">Transfer bank</TableCell>
                            <TableCell className="text-right">$1,200.00</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </section>
        </div>
    );
}
