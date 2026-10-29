/**
 * Writes docs/images/comparison-light.png and comparison-dark.png from the
 * demo page of the built site: KERN's components, Tailwind on KERN's tokens and remapped
 * Tailwind markup, row by row. Run it after changing the theme or the demo,
 * and commit the images.
 *
 *   npx playwright-core install chromium   # once
 *   npm run screenshots
 *
 * CHROMIUM_PATH points it at a Chromium of your own instead.
 */
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIST = path.join(ROOT, "site/dist");
const TYPES: Record<string, string> = {
	".html": "text/html",
	".css": "text/css",
	".woff2": "font/woff2",
};

// Chromium doesn't load fonts on a file:// page, so the site is served.
const server = createServer(async (request, response) => {
	const { pathname } = new URL(request.url ?? "/", "http://localhost");
	const file = path.join(
		DIST,
		decodeURIComponent(pathname).replace(/\/$/, "/index.html"),
	);
	if (!file.startsWith(DIST)) {
		response.writeHead(403).end();
		return;
	}
	try {
		const body = await readFile(file);
		response
			.writeHead(200, {
				"content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
			})
			.end(body);
	} catch {
		response.writeHead(404).end();
	}
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address() as AddressInfo;

const browser = await chromium.launch({
	executablePath: process.env.CHROMIUM_PATH,
});
try {
	for (const theme of ["light", "dark"]) {
		const page = await browser.newPage({
			viewport: { width: 1280, height: 900 },
		});
		await page.goto(`http://127.0.0.1:${port}/demo/`);
		await page.evaluate((name) => {
			document.documentElement.dataset.kernTheme = name;
		}, theme);
		await page.evaluate(() => document.fonts.ready);

		const box = async (selector: string) => {
			const found = await page.locator(selector).boundingBox();
			if (!found) throw new Error(`The demo has no ${selector}.`);
			return found;
		};
		// From the button row to the card row, with a margin around them.
		const first = await box("section[aria-labelledby=buttons]");
		const last = await box("section[aria-labelledby=cards]");
		const margin = 24;
		const file = `docs/images/comparison-${theme}.png`;
		await page.screenshot({
			path: path.join(ROOT, file),
			fullPage: true,
			clip: {
				x: first.x - margin,
				y: first.y - margin,
				width: first.width + 2 * margin,
				height: last.y + last.height - first.y + 2 * margin,
			},
		});
		await page.close();
		console.log(`Wrote ${file}`);
	}
} finally {
	await browser.close();
	server.close();
}
