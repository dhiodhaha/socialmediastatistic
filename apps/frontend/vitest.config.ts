import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        alias: {
            "@": resolve(__dirname, "./"),
            "@repo/database": resolve(__dirname, "./test/mocks/repo-database.ts"),
        },
    },
});
