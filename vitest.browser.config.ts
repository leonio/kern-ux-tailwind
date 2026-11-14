import { defineConfig } from "vitest/config";

// The tests in test/browser/ run in Chromium: npm run test:browser. They need
// one installed (npx playwright-core install chromium) or CHROMIUM_PATH.
export default defineConfig({
	test: {
		include: ["test/browser/*.test.ts"],
		testTimeout: 30_000,
	},
});
