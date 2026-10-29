/**
 * Builds the documentation site into site/dist: README.md, docs/*.md and the
 * demo in one layout, styled by site/app.css, which uses this package. Fails
 * on a link to a missing page or heading, and on a class in a docs example
 * that no CSS rule selects. The Pages workflow publishes site/dist.
 *
 *   npm run site
 */
import { execFileSync } from "node:child_process";
import {
	cpSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import {
	ASSET_FOLDERS,
	brokenLinks,
	createHighlight,
	DIST,
	generatedBlocks,
	layout,
	missingClasses,
	PAGES,
	publishedPaths,
	ROOT,
	renderFragment,
	renderMarkdown,
	rewriteLinks,
} from "./site.ts";

const require = createRequire(import.meta.url);
const packageDir = (name: string) =>
	path.dirname(require.resolve(`${name}/package.json`));
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

rmSync(DIST, { recursive: true, force: true });
const published = publishedPaths();
const blocks = generatedBlocks(read("src/theme.css"), read("src/tokens.css"));
const examples: string[] = [];
const highlight = await createHighlight();

// The pages first: Tailwind scans them for the classes to generate.
for (const page of PAGES) {
	const source = read(page.source);
	const rendered = page.source.endsWith(".md")
		? renderMarkdown(source, highlight)
		: renderFragment(source, highlight);
	examples.push(...rendered.examples);
	const body = rewriteLinks(rendered.html, page, published).replace(
		/<!-- site:([\w-]+) -->/g,
		(_, name: string) => {
			const block = blocks[name];
			if (!block)
				throw new Error(
					`${page.source} asks for a site:${name} block, which doesn't exist.`,
				);
			return block;
		},
	);
	const file = path.join(DIST, page.output);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, layout(page, rendered.title, body));
}

for (const folder of ASSET_FOLDERS) {
	cpSync(path.join(ROOT, folder), path.join(DIST, folder), { recursive: true });
}
const fonts = path.join(packageDir("@kern-ux/native"), "dist/fonts");
cpSync(
	path.join(fonts, "fira-sans.css"),
	path.join(DIST, "fonts/fira-sans.css"),
);
cpSync(path.join(fonts, "fira-sans"), path.join(DIST, "fonts/fira-sans"), {
	recursive: true,
});

const cli = packageDir("@tailwindcss/cli");
const { bin } = JSON.parse(
	readFileSync(path.join(cli, "package.json"), "utf8"),
);
execFileSync(
	process.execPath,
	[
		path.join(cli, bin.tailwindcss),
		"--input",
		"site/app.css",
		"--output",
		"site/dist/app.css",
		"--minify",
	],
	{ cwd: ROOT, stdio: "inherit" },
);

const problems = [
	...brokenLinks(DIST).map((link) => `Broken link in ${link}`),
	...missingClasses(
		examples,
		readFileSync(path.join(DIST, "app.css"), "utf8"),
	).map((name) => `No CSS for the class "${name}" in a docs example`),
];
if (problems.length > 0) {
	console.error(problems.join("\n"));
	process.exit(1);
}
console.log(
	`Built site/dist: ${PAGES.length} pages, ${examples.length} live examples. Serve it to look, for example with npx serve site/dist.`,
);
