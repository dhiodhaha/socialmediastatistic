import "server-only";

import { cache } from "react";
import { auth } from "@/shared/lib/auth";

export const getSession = cache(async () => auth());
