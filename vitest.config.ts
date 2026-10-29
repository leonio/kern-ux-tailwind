import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["test/**/*.test.ts"],
		// Each compile reads KERN's whole stylesheet; a cold run can pass the 5 s default.
		testTimeout: 15_000,
	},
});
