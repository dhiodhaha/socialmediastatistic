import * as Headless from "@headlessui/react"
import Link, { LinkProps } from "next/link"
import React, { forwardRef } from "react"

export const MyLink = forwardRef(function MyLink(
    props: LinkProps & React.ComponentPropsWithoutRef<"a">,
    ref: React.ForwardedRef<HTMLAnchorElement>
) {
    return (
        <Headless.DataInteractive>
            <Link {...props} ref={ref} />
        </Headless.DataInteractive>
    )
})
