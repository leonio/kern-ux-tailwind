/**
 * dark-scope.css in Chromium: which elements its dark: matches, page by page,
 * against where KERN is dark. The theme's own dark: gets the light sections
 * on a dark page wrong (docs/limits.md); this one is right at any depth.
 */
import { fileURLToPath } from "node:url";
import { compile } from "@tailwindcss/node";
import { type Browser, chromium } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

// --dark is 1 wherever dark: matches, 0 elsewhere.
const PROBE = "[--dark:0] dark:[--dark:1]";
/** A probed element; `kernClass` adds a class such as kern-dark. */
const el = (id: string, attributes = "", inner = "", kernClass = "") =>
	`<div id="${id}" class="${kernClass} ${PROBE}" ${attributes}>${inner}</div>`;

type Page = {
	scheme: "light" | "dark";
	root?: string;
	body: string;
	/** Each element's id, and whether KERN is dark there. */
	dark: Record<string, boolean>;
};

const PAGES: Record<string, Page> = {
	"system light": { scheme: "light", body: el("a"), dark: { a: false } },
	"system dark": { scheme: "dark", body: el("a"), dark: { a: true } },
	"a light section on a page dark by the system": {
		scheme: "dark",
		body: el(
			"light",
			'data-kern-theme="light"',
			el("inLight") + el("dark", 'data-kern-theme="dark"', el("inDark")),
		),
		dark: { light: false, inLight: false, dark: true, inDark: true },
	},
	"a light root on a dark system": {
		scheme: "dark",
		root: 'data-kern-theme="light"',
		body: el("a") + el("dark", "", el("inDark"), "kern-dark"),
		dark: { a: false, dark: true, inDark: true },
	},
	"a light section on a dark root": {
		scheme: "light",
		root: 'data-kern-theme="dark"',
		body:
			el("a") +
			el(
				"light",
				"",
				el("inLight") + el("dark", 'data-kern-theme="dark"', el("inDark")),
				"kern-light",
			),
		dark: { a: true, light: false, inLight: false, dark: true, inDark: true },
	},
};

let browser: Browser;
let css: string;

beforeAll(async () => {
	browser = await chromium.launch({
		executablePath: process.env.CHROMIUM_PATH || undefined,
	});
	const compiler = await compile(
		'@import "tailwindcss"; @import "@leonio/kern-ux-tailwind"; @import "@leonio/kern-ux-tailwind/dark-scope.css";',
		{ base: ROOT, onDependency: () => {} },
	);
	css = compiler.build(PROBE.split(" "));
});

afterAll(async () => {
	await browser?.close();
});

describe("dark-scope.css", () => {
	it.each(Object.entries(PAGES))(
		"matches dark: where KERN is dark: %s",
		async (_, { scheme, root = "", body, dark }) => {
			const page = await browser.newPage({ colorScheme: scheme });
			try {
				await page.setContent(
					`<!doctype html><html ${root}><head><style>${css}</style></head><body>${body}</body></html>`,
				);
				const matched = await page.evaluate(
					(ids) =>
						Object.fromEntries(
							ids.map((id) => [
								id,
								getComputedStyle(document.getElementById(id) as Element)
									.getPropertyValue("--dark")
									.trim() === "1",
							]),
						),
					Object.keys(dark),
				);
				expect(matched).toEqual(dark);
			} finally {
				await page.close();
			}
		},
	);
});
