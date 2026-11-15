import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compile } from "@tailwindcss/node";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

/**
 * Compiles CSS as a project would, importing the package by its name, which
 * resolves through its exports. Whitespace is collapsed, and dropped inside
 * parentheses: Tailwind keeps the line breaks a formatter puts in a long
 * var() or :where().
 */
async function build(css: string, candidates: string[]): Promise<string> {
	const compiler = await compile(css, {
		base: ROOT,
		onDependency: () => {},
	});
	return compiler
		.build(candidates)
		.replaceAll(/\s+/g, " ")
		.replaceAll("( ", "(")
		.replaceAll(" )", ")");
}

/** The name of the last `@layer x {` block opened before `index`. */
function layerAt(css: string, index: number): string | undefined {
	const opened = [...css.slice(0, index).matchAll(/@layer ([\w-]+) \{/g)];
	return opened.at(-1)?.[1];
}

const CANDIDATES = [
	"bg-primary",
	"text-kern-body",
	"dark:bg-indigo-400",
	"bg-indigo-600",
	"rounded-md",
	"lg:grid-cols-3",
	"p-kern-default",
];

/** The utilities from KERN's type classes, weights, spacing and border widths. */
const NEW = [
	"text-kern-preline",
	"text-kern-subline",
	"text-kern-title-small",
	"text-kern-title",
	"text-kern-title-large",
	"font-kern-body-strong",
	"font-kern-label-subtle",
	...["6x", "7x", "8x", "9x", "10x", "11x"].map((n) => `p-kern-${n}-large`),
	...["light", "default", "bold", "heavy"].flatMap((w) => [
		`border-kern-${w}`,
		`outline-kern-${w}`,
	]),
];
CANDIDATES.push(...NEW);

describe("@leonio/kern-ux-tailwind", async () => {
	const css = await build(
		'@import "tailwindcss"; @import "@leonio/kern-ux-tailwind";',
		CANDIDATES,
	);

	it("loads KERN into the base layer, after preflight", () => {
		const preflight = css.indexOf("::backdrop, ::file-selector-button {");
		const kern = css.indexOf(".kern-btn ");
		expect(preflight).toBeGreaterThan(-1);
		expect(kern).toBeGreaterThan(preflight);
		expect(layerAt(css, preflight)).toBe("base");
		expect(layerAt(css, kern)).toBe("base");
		expect(css).toContain("@layer theme, base, components, utilities;");
	});

	it("follows KERN with its fixes in the same layer", () => {
		const fix = css.indexOf(":where(body *):not(i) { font-family: inherit; }");
		expect(fix).toBeGreaterThan(css.indexOf(".kern-btn "));
		expect(layerAt(css, fix)).toBe("base");
	});

	it("compiles utilities to KERN's variables, not to variables on :root", () => {
		expect(css).toContain(
			".bg-primary { background-color: var(--kern-color-action-default-contextual); }",
		);
		expect(css).toContain(
			".p-kern-default { padding: var(--kern-metric-space-default); }",
		);
		expect(css).not.toContain("--color-primary:");
	});

	it("gives KERN's type roles their size, line height and weight", () => {
		expect(css).toContain(
			".text-kern-body { font-size: var(--kern-typography-font-size-medium-static); line-height: var(--tw-leading, var(--kern-typography-line-height-medium-static)); font-weight: var(--tw-font-weight, var(--kern-typography-font-weight-body-default));",
		);
	});

	it("gives KERN's title, preline and subline roles and its weight modifiers", () => {
		expect(css).toContain(
			".text-kern-title { font-size: var(--kern-typography-font-size-medium-adaptive); line-height: var(--tw-leading, var(--kern-typography-line-height-medium-adaptive)); font-weight: var(--tw-font-weight, var(--kern-typography-font-weight-title-default));",
		);
		expect(css).toContain(
			".font-kern-body-strong { --tw-font-weight: var(--kern-typography-font-weight-body-strong); font-weight: var(--kern-typography-font-weight-body-strong); }",
		);
	});

	it.each(NEW)("compiles %s to a KERN variable", (utility) => {
		const at = css.indexOf(`.${utility} {`);
		expect(at).toBeGreaterThan(-1);
		expect(css.slice(at, css.indexOf("}", at))).toContain("var(--kern-");
	});

	it("has KERN's larger spacing steps and its border widths", () => {
		expect(css).toContain(
			".p-kern-11x-large { padding: var(--kern-metric-space-11x-large); }",
		);
		expect(css).toContain(
			".border-kern-bold { border-style: var(--tw-border-style); border-width: var(--kern-metric-border-width-bold); }",
		);
		expect(css).toContain(
			".outline-kern-bold { outline-style: var(--tw-outline-style); outline-width: var(--kern-metric-border-width-bold); }",
		);
	});

	it("matches dark: where KERN is dark", () => {
		// Tailwind 4.3 flattens the variant; 4.1 and 4.2 nest it under the class.
		const rule = css.slice(css.indexOf(".dark\\:bg-indigo-400"));
		expect(rule).toContain(
			':where([data-kern-theme="dark"], [data-kern-theme="dark"] *, .kern-dark, .kern-dark *)',
		);
		expect(rule).toContain("@media (prefers-color-scheme: dark)");
		expect(rule).toContain(
			':not(:where([data-kern-theme="light"], [data-kern-theme="light"] *, .kern-light, .kern-light *))',
		);
	});

	it("uses KERN's breakpoints", () => {
		// 4.3 wraps the rule in the media query; 4.1 and 4.2 nest it inside.
		const at = css.indexOf(".lg\\:grid-cols-3");
		expect(css.slice(at - 40, at + 60)).toContain("@media (width >= 62rem)");
	});

	it("leaves Tailwind's palette and radii alone without remap.css", () => {
		expect(css).toContain(
			".bg-indigo-600 { background-color: var(--color-indigo-600); }",
		);
		expect(css).toContain(".rounded-md { border-radius: var(--radius-md); }");
	});
});

describe("@leonio/kern-ux-tailwind/remap.css", async () => {
	const css = await build(
		'@import "tailwindcss"; @import "@leonio/kern-ux-tailwind"; @import "@leonio/kern-ux-tailwind/remap.css";',
		CANDIDATES,
	);

	it("points Tailwind's palette and radii at KERN's", () => {
		expect(css).toContain(
			".bg-indigo-600 { background-color: var(--kern-color-darkblue-600); }",
		);
		expect(css).toContain(
			".rounded-md { border-radius: var(--kern-metric-border-radius-default); }",
		);
	});
});

describe("the npm package", () => {
	const manifest = JSON.parse(
		readFileSync(new URL("../package.json", import.meta.url), "utf8"),
	);
	const [packed] = JSON.parse(
		execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
			cwd: ROOT,
			encoding: "utf8",
			shell: process.platform === "win32",
		}),
	) as [{ files: { path: string }[] }];
	const files = packed.files.map((file) => file.path);

	it("contains every file its exports name", () => {
		const targets = Object.values(manifest.exports).flatMap((target) =>
			typeof target === "string" ? [target] : Object.values(target as object),
		) as string[];
		for (const target of new Set(targets)) {
			expect(files).toContain(target.replace(/^\.\//, ""));
		}
	});

	it("contains its README and no tests", () => {
		expect(files).toContain("README.md");
		expect(files.filter((file) => file.endsWith(".ts"))).toEqual([]);
	});
});
