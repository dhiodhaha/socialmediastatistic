"use client"

import { Button } from "@/shared/components/catalyst/button"
import { Badge } from "@/shared/components/catalyst/badge"
import { Avatar } from "@/shared/components/catalyst/avatar"
import { Divider } from "@/shared/components/catalyst/divider"
import { Heading, Subheading } from "@/shared/components/catalyst/heading"
import { Text, Code, Strong } from "@/shared/components/catalyst/text"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/catalyst/table"
import { Input } from "@/shared/components/catalyst/input"
import { Select } from "@/shared/components/catalyst/select"
import { Switch, SwitchField } from "@/shared/components/catalyst/switch"
import { Checkbox, CheckboxField, CheckboxGroup } from "@/shared/components/catalyst/checkbox"
import { Radio, RadioField, RadioGroup } from "@/shared/components/catalyst/radio"
import { Field, FieldGroup, Fieldset, Label, Legend, Description } from "@/shared/components/catalyst/fieldset"

export default function DesignSystemPage() {
    return (
        <div className="mx-auto max-w-4xl space-y-16 p-10">
            <div className="space-y-4">
                <Heading>Design System</Heading>
                <Text>
                    A collection of core components and tokens validating the &quot;Clean &amp; Engineered&quot; aesthetic (Catalyst UI).
                </Text>
            </div>

            <Divider />

            {/* Typography Section */}
            <section className="space-y-8">
                <Heading level={2}>Typography</Heading>
                <div className="space-y-4">
                    <Heading level={1}>Heading 1</Heading>
                    <Heading level={2}>Heading 2</Heading>
                    <Heading level={3}>Heading 3</Heading>
                    <Subheading level={4}>Subheading (H4 approx)</Subheading>
                    <Text>
                        Body Text (Regular). The quick brown fox jumps over the <Strong>lazy dog</Strong>.
                        Efficiency is the soul of this design system.
                    </Text>
                    <Text>
                        <Code>Monospace Code</Code> for technical details using <Code>Inter</Code> with <Code>cv11</Code>.
                    </Text>
                </div>
            </section>

            <Divider />

            {/* Buttons Section */}
            <section className="space-y-8">
                <Heading level={2}>Buttons</Heading>
                <div className="flex flex-wrap gap-4">
                    <Button>Primary (Solid)</Button>
                    <Button color="zinc">Zinc Solid</Button>
                    <Button color="indigo">Indigo Solid</Button>
                    <Button color="cyan">Cyan Solid</Button>
                    <Button color="red">Red Solid</Button>
                    <Button outline>Outline</Button>
                    <Button plain>Plain</Button>
                </div>
            </section>

            <Divider />

            {/* Badges Section */}
            <section className="space-y-8">
                <Heading level={2}>Badges</Heading>
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
                <Heading level={2}>Avatars</Heading>
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
                <Heading level={2}>Form Elements</Heading>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div className="space-y-6">
                        <Field>
                            <Label>Email address</Label>
                            <Input name="email" type="email" placeholder="you@example.com" />
                            <Description>We&apos;ll only use this for spam.</Description>
                        </Field>

                        <Field>
                            <Label>Country</Label>
                            <Select name="country">
                                <option>United States</option>
                                <option>Canada</option>
                                <option>Mexico</option>
                            </Select>
                        </Field>

                        <Fieldset>
                            <Legend>Notifications</Legend>
                            <CheckboxGroup>
                                <CheckboxField>
                                    <Checkbox name="email_notifications" defaultChecked />
                                    <Label>Email notifications</Label>
                                    <Description>Get emails about your account activity.</Description>
                                </CheckboxField>
                                <CheckboxField>
                                    <Checkbox name="sms_notifications" />
                                    <Label>SMS notifications</Label>
                                </CheckboxField>
                            </CheckboxGroup>
                        </Fieldset>
                    </div>

                    <div className="space-y-6">
                        <Fieldset>
                            <Legend>Push Notifications</Legend>
                            <RadioGroup name="push_notifications" defaultValue="everything">
                                <RadioField>
                                    <Radio value="everything" />
                                    <Label>Everything</Label>
                                    <Description>Receive all push notifications.</Description>
                                </RadioField>
                                <RadioField>
                                    <Radio value="same_email" />
                                    <Label>Same as email</Label>
                                </RadioField>
                                <RadioField>
                                    <Radio value="nothing" />
                                    <Label>No push notifications</Label>
                                </RadioField>
                            </RadioGroup>
                        </Fieldset>

                        <Fieldset>
                            <Legend>Settings</Legend>
                            <FieldGroup>
                                <SwitchField>
                                    <Switch name="airplane_mode" />
                                    <Label>Airplane Mode</Label>
                                    <Description>Disable all network connections.</Description>
                                </SwitchField>
                            </FieldGroup>
                        </Fieldset>
                    </div>
                </div>
            </section>

            <Divider />

            {/* Table Section */}
            <section className="space-y-8">
                <Heading level={2}>Data Display (Table)</Heading>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeader>Transaction ID</TableHeader>
                            <TableHeader>Status</TableHeader>
                            <TableHeader>Method</TableHeader>
                            <TableHeader className="text-right">Amount</TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">TRX-987123</TableCell>
                            <TableCell><Badge color="emerald">Success</Badge></TableCell>
                            <TableCell className="text-zinc-500">Credit Card</TableCell>
                            <TableCell className="text-right">$250.00</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">TRX-987124</TableCell>
                            <TableCell><Badge color="amber">Pending</Badge></TableCell>
                            <TableCell className="text-zinc-500">PayPal</TableCell>
                            <TableCell className="text-right">$39.99</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">TRX-987125</TableCell>
                            <TableCell><Badge color="emerald">Success</Badge></TableCell>
                            <TableCell className="text-zinc-500">Bank Transfer</TableCell>
                            <TableCell className="text-right">$1,200.00</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </section>
        </div>
    )
}
