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

/** The --kern-… custom property a declaration reads, from KERN or the theme. */
const reads = (declarations: string, property: string) =>
	[
		...declarations.matchAll(
			new RegExp(`${property}\\s*:\\s*var\\(\\s*(--kern-[a-z0-9-]+)`, "g"),
		),
	].at(-1)?.[1];

/** Every declaration of the rules whose selector list has `selector` alone. */
function kernRule(kernCss: string, selector: string): string {
	return [...kernCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
		.filter(([, selectors]) =>
			selectors.split(",").some((s) => s.trim() === selector),
		)
		.map(([, , declarations]) => declarations)
		.join(";");
}

describe("src/theme.css against KERN's classes", () => {
	const theme = checkedIn("theme.css");
	const ROLES: Record<string, string> = {
		"body-small": ".kern-body--small",
		body: ".kern-body",
		"body-large": ".kern-body--large",
		label: ".kern-label",
		preline: ".kern-preline",
		subline: ".kern-subline",
		"title-small": ".kern-title--small",
		title: ".kern-title",
		"title-large": ".kern-title--large",
		"heading-small": ".kern-heading-small",
		"heading-medium": ".kern-heading-medium",
		"heading-large": ".kern-heading-large",
		"heading-x-large": ".kern-heading-x-large",
		"heading-display": ".kern-heading-display",
	};

	it("defines a role for each KERN type class listed, and no other", () => {
		const roles = [
			...theme.matchAll(/--text-kern-([a-z]+(?:-[a-z]+)*)\s*:/g),
		].map((m) => m[1]);
		expect(roles.sort()).toEqual(Object.keys(ROLES).sort());
	});

	it.each(Object.entries(ROLES))(
		"text-kern-%s reads the tokens %s does",
		(role, selector) => {
			const kern = kernRule(sources.kernCss, selector);
			expect(reads(kern, "font-size")).toMatch(/^--kern-/);
			expect(reads(theme, `--text-kern-${role}`)).toBe(
				reads(kern, "font-size"),
			);
			expect(reads(theme, `--text-kern-${role}--line-height`)).toBe(
				reads(kern, "line-height"),
			);
			expect(reads(theme, `--text-kern-${role}--font-weight`)).toBe(
				reads(kern, "font-weight"),
			);
		},
	);

	it.each([
		["body-strong", ".kern-body--bold"],
		["label-subtle", ".kern-label--subtle"],
	])("font-kern-%s reads the weight %s does", (weight, selector) => {
		expect(reads(theme, `--font-weight-kern-${weight}`)).toBe(
			reads(kernRule(sources.kernCss, selector), "font-weight"),
		);
	});

	it("gives no colour the name of another kern- utility", () => {
		const others = new Set(
			[
				...theme.matchAll(
					/--(?:text|font-weight|spacing|border-width|outline-width|radius|shadow)-(kern-[a-z0-9-]+?)(?:--[a-z-]+)?\s*:/g,
				),
			].map((m) => m[1]),
		);
		const colours = [
			...checkedIn("tokens.css").matchAll(/--color-(kern-[a-z0-9-]+):/g),
		].map((m) => m[1]);
		expect(colours.filter((colour) => others.has(colour))).toEqual([]);
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
