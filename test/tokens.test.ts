import { readFileSync } from "node:fs";
import path from "node:path";
import semver from "semver";
import { describe, expect, it } from "vitest";

import {
	generateFiles,
	installedSources,
	SRC,
	undefinedKernTokens,
} from "../scripts/tokens.ts";

const sources = installedSources();
const checkedIn = (file: string) => readFileSync(path.join(SRC, file), "utf8");

describe("the checked-in src/", () => {
	it.each(Object.entries(generateFiles(sources)))(
		"%s is what the installed KERN and Tailwind generate (npm run tokens)",
		(file, content) => {
			expect(checkedIn(file)).toBe(content);
		},
	);

	it.each(["theme.css", "tokens.css", "remap.css"])(
		"%s reads only tokens KERN defines",
		(file) => {
			expect(undefinedKernTokens(checkedIn(file), sources.kernCss)).toEqual([]);
		},
	);

	it("is tested with a KERN version in the package's peer range", () => {
		// The tests vouch for the KERN they run with: the range must include it.
		const range: string = JSON.parse(checkedIn("../package.json"))
			.peerDependencies["@kern-ux/native"];
		expect(semver.satisfies(sources.kernVersion, range)).toBe(true);
	});
});

describe("undefinedKernTokens", () => {
	const kernCss = ":root{--kern-color-a: red;--kern-b: 1px}";

	it("finds var() references KERN doesn't define, wrapped or not", () => {
		const css =
			"a{color:var(--kern-color-a);margin:var(--kern-b);padding:var(\n\t\t--kern-gone\n\t)}";
		expect(undefinedKernTokens(css, kernCss)).toEqual(["--kern-gone"]);
	});

	it("ignores Tailwind's own variables", () => {
		expect(
			undefinedKernTokens("a{color:var(--color-red-500)}", kernCss),
		).toEqual([]);
	});
});

describe("generateFiles", () => {
	const kernCss = `:root{
		--kern-color-darkblue-100: oklch(90% .03 265);
		--kern-color-darkblue-600: oklch(50% .13 265);
		--kern-color-darkblue-700: oklch(42% .16 265);
		--kern-color-action-default: var(--kern-color-darkblue-700);
		--kern-color-action-state-opacity-hover: 92%;
	}`;
	const generate = (tailwindTheme: string) =>
		generateFiles({ kernCss, tailwindTheme });

	it("mirrors each KERN colour token as a kern- colour and skips the numbers", () => {
		const tokens = generate("")["tokens.css"];
		expect(tokens).toContain(
			"--color-kern-action-default: var(--kern-color-action-default);",
		);
		expect(tokens).toContain(
			"--color-kern-darkblue-600: var(--kern-color-darkblue-600);",
		);
		expect(tokens).not.toContain("opacity-hover");
	});

	it("maps a Tailwind step to the KERN step nearest in lightness", () => {
		expect(
			generate("--color-indigo-600: oklch(51.1% 0.262 276.966);")["remap.css"],
		).toContain("--color-indigo-600: var(--kern-color-darkblue-600);");
	});

	it("breaks a tie towards the darker step", () => {
		expect(
			generate("--color-blue-700: oklch(46% 0.2 264);")["remap.css"],
		).toContain("--color-blue-700: var(--kern-color-darkblue-700);");
	});

	it("fails on a Tailwind family it has no KERN family for", () => {
		expect(() =>
			generate("--color-chartreuse-500: oklch(80% 0.2 125);"),
		).toThrow(/chartreuse/);
	});
});
