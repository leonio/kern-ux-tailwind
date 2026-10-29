/**
 * The documentation site: README.md and docs/*.md rendered with KERN's classes
 * and the theme's utilities, and the demo, in one layout. scripts/build-site.ts
 * writes it to site/dist; test/site.test.ts checks the parts here.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

export const ROOT = fileURLToPath(new URL("../", import.meta.url));
export const DIST = path.join(ROOT, "site/dist");
export const REPOSITORY = "https://github.com/leonio/kern-ux-tailwind";
export const SITE_URL = "https://leonio.github.io/kern-ux-tailwind/";
const RAW_URL =
	"https://raw.githubusercontent.com/leonio/kern-ux-tailwind/main/";
const NPM_URL = "https://www.npmjs.com/package/@leonio/kern-ux-tailwind";
const SITE_NAME = "KERN-UX for Tailwind CSS";

export type Page = {
	/** The source file, from the repo root. */
	source: string;
	/** Where the page lands in site/dist. */
	output: string;
	/** Its name in the navigation. */
	label: string;
	/** Full width, for the demo's three columns. */
	wide?: boolean;
};

/** The pages, in navigation order. */
export const PAGES: Page[] = [
	{ source: "README.md", output: "index.html", label: "Overview" },
	{
		source: "docs/getting-started.md",
		output: "docs/getting-started.html",
		label: "Getting started",
	},
	{
		source: "docs/utilities.md",
		output: "docs/utilities.html",
		label: "Utilities",
	},
	{
		source: "docs/theming.md",
		output: "docs/theming.html",
		label: "Light, dark and sections",
	},
	{
		source: "docs/tailwind-components.md",
		output: "docs/tailwind-components.html",
		label: "Tailwind components",
	},
	{ source: "docs/limits.md", output: "docs/limits.html", label: "Limits" },
	{
		source: "site/pages/demo.html",
		output: "demo/index.html",
		label: "Demo",
		wide: true,
	},
];

/** Folders the site copies as they are, at the same path. */
export const ASSET_FOLDERS = ["docs/images"];

/** Every repo path the site publishes, mapped to its path in site/dist. */
export function publishedPaths(): Map<string, string> {
	const published = new Map(PAGES.map((page) => [page.source, page.output]));
	for (const folder of ASSET_FOLDERS) {
		for (const file of readdirSync(path.join(ROOT, folder))) {
			published.set(`${folder}/${file}`, `${folder}/${file}`);
		}
	}
	return published;
}

/**
 * GitHub's anchors for headings, so a link to a heading works on GitHub and
 * on the site alike. Repeated headings get -1, -2 …
 */
export function slugger(): (text: string) => string {
	const seen = new Map<string, number>();
	return (text) => {
		const base = text
			.toLowerCase()
			.replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
			.replace(/ /g, "-");
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		return count === 0 ? base : `${base}-${count}`;
	};
}

const HEADINGS: Record<string, string> = {
	h1: "kern-heading-x-large",
	h2: "kern-heading-large mt-kern-x-large",
	h3: "kern-heading-medium mt-kern-large",
	h4: "kern-heading-small mt-kern-default",
};
const CODE_BLOCK =
	"overflow-x-auto rounded-kern-default bg-muted p-kern-default font-mono text-kern-body-small";
const INLINE_CODE = "rounded-kern-small bg-muted px-1 font-mono text-[0.9em]";

export type Rendered = {
	html: string;
	/** The text of the first h1. */
	title: string;
	/** The HTML of each `html example` code block. */
	examples: string[];
};

/**
 * Renders Markdown with KERN's classes for text, tables, lists and links.
 * A code block marked `html example` renders twice: as the live HTML and as
 * its code. GitHub shows it as an html code block.
 */
export function renderMarkdown(source: string): Rendered {
	const md = MarkdownIt({ html: true });
	const slug = slugger();
	const examples: string[] = [];
	let title = "";
	const rules = md.renderer.rules;
	const withClass = (rule: string, classes: string) => {
		rules[rule] = (tokens, idx, options, _env, self) => {
			tokens[idx].attrJoin("class", classes);
			return self.renderToken(tokens, idx, options);
		};
	};

	rules.heading_open = (tokens, idx, options, _env, self) => {
		const token = tokens[idx];
		const text = (tokens[idx + 1].children ?? [])
			.filter((child) => child.type === "text" || child.type === "code_inline")
			.map((child) => child.content)
			.join("");
		if (token.tag === "h1" && !title) title = text;
		token.attrSet("id", slug(text));
		token.attrJoin("class", HEADINGS[token.tag] ?? HEADINGS.h4);
		return self.renderToken(tokens, idx, options);
	};
	withClass("paragraph_open", "kern-body");
	withClass(
		"bullet_list_open",
		"flex list-disc flex-col gap-kern-x-small pl-kern-large text-kern-body",
	);
	withClass("ordered_list_open", "kern-list kern-list--number text-kern-body");
	withClass("thead_open", "kern-table__head");
	withClass("tbody_open", "kern-table__body");
	withClass("tr_open", "kern-table__row");
	withClass("td_open", "kern-table__cell");
	withClass("link_open", "kern-link");
	withClass("hr", "kern-divider");
	withClass("blockquote_open", "border-l-4 border-border pl-kern-default");
	rules.th_open = (tokens, idx, options, _env, self) => {
		tokens[idx].attrSet("scope", "col");
		tokens[idx].attrJoin("class", "kern-table__header");
		return self.renderToken(tokens, idx, options);
	};
	rules.table_open = () =>
		'<div class="overflow-x-auto"><table class="kern-table kern-table--small">\n';
	rules.table_close = () => "</table></div>\n";
	rules.code_inline = (tokens, idx) =>
		`<code class="${INLINE_CODE}">${md.utils.escapeHtml(tokens[idx].content)}</code>`;
	rules.fence = (tokens, idx) => {
		const { info, content } = tokens[idx];
		const code = md.utils.escapeHtml(content);
		if (info.trim() !== "html example") {
			return `<pre class="${CODE_BLOCK}"><code>${code}</code></pre>\n`;
		}
		examples.push(content);
		return `<figure class="flex flex-col overflow-hidden rounded-kern-default border border-border">
<div class="flex flex-wrap items-center gap-kern-default p-kern-large">${content}</div>
<pre class="${CODE_BLOCK} rounded-none border-t border-border"><code>${code}</code></pre>
</figure>\n`;
	};
	const image = rules.image;
	rules.image = (tokens, idx, options, env, self) => {
		tokens[idx].attrJoin("class", "rounded-kern-default border border-border");
		tokens[idx].attrSet("loading", "lazy");
		return image
			? image(tokens, idx, options, env, self)
			: self.renderToken(tokens, idx, options);
	};

	return { html: md.render(source), title, examples };
}

/** An HTML page fragment, such as the demo: its h1 is the title. */
export function renderFragment(source: string): Rendered {
	const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(source);
	const title = h1 ? h1[1].replace(/<[^>]+>/g, "").trim() : "";
	return { html: source, title, examples: [] };
}

/** The path from one file in site/dist to another. */
function fromPage(output: string, target: string): string {
	return (
		path.posix.relative(path.posix.dirname(output), target) ||
		path.posix.basename(target)
	);
}

/**
 * A URL in a page's source, rewritten for the site: a file the site publishes
 * becomes a link to its page, any other repo file a link to it on GitHub, and
 * links to the site itself or to raw files in the repo become local.
 */
export function rewriteUrl(
	url: string,
	page: Page,
	published: Map<string, string>,
): string {
	let target: string;
	if (url.startsWith(SITE_URL)) {
		const [file, hash] = splitHash(url.slice(SITE_URL.length));
		const output = !file || file.endsWith("/") ? `${file}index.html` : file;
		return fromPage(page.output, output) + hash;
	}
	if (url.startsWith(RAW_URL)) {
		target = url.slice(RAW_URL.length);
	} else if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url) || url === "") {
		return url;
	} else {
		target = path.posix.join(path.posix.dirname(page.source), url);
	}
	const [file, hash] = splitHash(target);
	const output = published.get(file);
	return output
		? fromPage(page.output, output) + hash
		: `${REPOSITORY}/blob/main/${file}${hash}`;
}

function splitHash(url: string): [string, string] {
	const at = url.indexOf("#");
	return at === -1 ? [url, ""] : [url.slice(0, at), url.slice(at)];
}

/** rewriteUrl for every href, src and srcset in a page's rendered source. */
export function rewriteLinks(
	html: string,
	page: Page,
	published: Map<string, string>,
): string {
	return html.replace(
		/\b(href|src|srcset)="([^"]*)"/g,
		(_, attribute: string, url: string) =>
			`${attribute}="${rewriteUrl(url, page, published)}"`,
	);
}

const escapeHtml = (text: string) =>
	text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

/**
 * The page around a rendered body: the header with the navigation and the
 * theme switch, and the footer. No Kopfzeile or Bildwortmarke: this isn't a
 * government site.
 */
export function layout(page: Page, title: string, body: string): string {
	const root = fromPage(page.output, "index.html").replace(/index\.html$/, "");
	const fullTitle =
		page.output === "index.html" ? SITE_NAME : `${title} · ${SITE_NAME}`;
	const links = PAGES.map((other) => {
		const current = other === page ? ' aria-current="page"' : "";
		return `<li><a class="kern-link aria-[current=page]:font-semibold aria-[current=page]:no-underline" href="${fromPage(page.output, other.output)}"${current}>${escapeHtml(other.label)}</a></li>`;
	}).join("\n\t\t\t\t");
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${escapeHtml(fullTitle)}</title>
		<meta name="description" content="@leonio/kern-ux-tailwind: KERN-UX as a Tailwind CSS v4 theme." />
		<link rel="icon" href="data:," />
		<link rel="stylesheet" href="${root}fonts/fira-sans.css" />
		<link rel="stylesheet" href="${root}app.css" />
		<script>
			try {
				const theme = localStorage.getItem("kern-theme");
				if (theme === "light" || theme === "dark") document.documentElement.dataset.kernTheme = theme;
			} catch {}
		</script>
	</head>
	<body class="bg-background text-foreground">
		<a class="kern-link sr-only focus:not-sr-only focus:absolute focus:top-kern-small focus:left-kern-small focus:bg-background focus:p-kern-small" href="#main">Skip to the content</a>
		<header class="border-b border-border">
			<div class="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-kern-default px-kern-default pt-kern-default">
				<a class="text-kern-heading-small text-foreground no-underline" href="${root}index.html">${SITE_NAME}</a>
				<div class="kern-form-input w-44">
					<label class="kern-label kern-label--small" for="theme">Theme</label>
					<div class="kern-form-input__select-wrapper">
						<select class="kern-form-input__select" id="theme">
							<option value="system">System</option>
							<option value="light">Light</option>
							<option value="dark">Dark</option>
						</select>
					</div>
				</div>
			</div>
			<nav class="mx-auto max-w-7xl px-kern-default py-kern-default" aria-label="Documentation">
				<ul class="flex flex-wrap gap-x-kern-large gap-y-kern-small text-kern-body-small">
				${links}
				<li><a class="kern-link" href="${REPOSITORY}">GitHub</a></li>
				<li><a class="kern-link" href="${NPM_URL}">npm</a></li>
				</ul>
			</nav>
		</header>
		<main id="main" class="mx-auto flex ${page.wide ? "max-w-7xl" : "max-w-3xl"} flex-col gap-kern-default px-kern-default py-kern-x-large">
${body}
		</main>
		<footer class="border-t border-border">
			<p class="mx-auto max-w-7xl px-kern-default py-kern-large text-kern-body-small text-muted-foreground">
				An independent project, not a site of the KERN team or of any government. Built with
				<a class="kern-link" href="${REPOSITORY}">@leonio/kern-ux-tailwind</a> itself. EUPL-1.2.
			</p>
		</footer>
		<script>
			const select = document.getElementById("theme");
			select.value = document.documentElement.dataset.kernTheme ?? "system";
			select.addEventListener("change", () => {
				const theme = select.value;
				if (theme === "system") delete document.documentElement.dataset.kernTheme;
				else document.documentElement.dataset.kernTheme = theme;
				try {
					if (theme === "system") localStorage.removeItem("kern-theme");
					else localStorage.setItem("kern-theme", theme);
				} catch {}
			});
		</script>
	</body>
</html>
`;
}

/**
 * The parts of docs/utilities.md the site shows live, read from the theme
 * so they follow it. Each replaces a `<!-- site:name -->` comment, which
 * GitHub doesn't show.
 */
export function generatedBlocks(
	themeCss: string,
	tokensCss: string,
): Record<string, string> {
	const names = (css: string, pattern: RegExp) => [
		...new Set([...css.matchAll(pattern)].map((match) => match[1])),
	];
	// In a span, so a flex column or grid cell doesn't stretch the code's background.
	const label = (text: string) =>
		`<span><code class="${INLINE_CODE}">${escapeHtml(text)}</code></span>`;

	const semantic = names(themeCss, /--color-([a-z]+(?:-[a-z]+)*):/g);
	const palettes = new Map<string, string[]>();
	for (const [, hue, step] of tokensCss.matchAll(
		/--color-kern-([a-z]+)-(\d{3}):/g,
	)) {
		palettes.set(hue, [...(palettes.get(hue) ?? []), step]);
	}
	const steps = [...palettes.values()][0] ?? [];
	const typeRoles = names(themeCss, /--text-(kern-[a-z]+(?:-[a-z]+)*):/g);
	const spacing = names(
		themeCss,
		/--spacing-(kern-[a-z0-9]+(?:-[a-z0-9]+)*):/g,
	);
	const radii = names(themeCss, /--radius-(kern-[a-z]+):/g);
	const shadows = names(themeCss, /--shadow-(kern-[a-z]+):/g);

	return {
		"semantic-colours": `<div class="grid grid-cols-2 gap-kern-default sm:grid-cols-3">
${semantic.map((name) => `<div class="flex items-center gap-kern-small"><span class="size-10 shrink-0 rounded-kern-default border border-border bg-${name}"></span>${label(name)}</div>`).join("\n")}
</div>`,
		palette: `<div class="flex flex-col gap-kern-small overflow-x-auto">
<div class="grid min-w-2xl grid-cols-[6rem_repeat(${steps.length},1fr)] gap-1 text-kern-body-small text-muted-foreground" aria-hidden="true"><span></span>${steps.map((step) => `<span class="text-center">${step}</span>`).join("")}</div>
${[...palettes]
	.map(
		([hue, hueSteps]) =>
			`<div class="grid min-w-2xl grid-cols-[6rem_repeat(${hueSteps.length},1fr)] items-center gap-1">${label(hue)}${hueSteps.map((step) => `<span class="h-8 rounded-kern-small bg-kern-${hue}-${step}" title="kern-${hue}-${step}"></span>`).join("")}</div>`,
	)
	.join("\n")}
</div>`,
		"type-roles": `<div class="flex flex-col gap-kern-default">
${typeRoles.map((role) => `<div class="flex flex-col gap-kern-x-small">${label(`text-${role}`)}<p class="text-${role}">Apply for a residents' parking permit</p></div>`).join("\n")}
</div>`,
		spacing: `<div class="flex flex-col gap-kern-small">
${spacing.map((step) => `<div class="flex items-center gap-kern-default"><span class="w-44 shrink-0">${label(`p-${step}`)}</span><span class="h-4 rounded-kern-small bg-primary w-${step}"></span></div>`).join("\n")}
</div>`,
		"radii-shadows": `<div class="flex flex-wrap gap-kern-large">
${radii.map((radius) => `<div class="flex flex-col items-center gap-kern-small"><span class="size-20 border-2 border-primary bg-muted rounded-${radius}"></span>${label(`rounded-${radius}`)}</div>`).join("\n")}
${shadows.map((shadow) => `<div class="flex flex-col items-center gap-kern-small"><span class="size-20 rounded-kern-default bg-background shadow-${shadow}"></span>${label(`shadow-${shadow}`)}</div>`).join("\n")}
</div>`,
	};
}

/** Every file below a folder. */
function files(folder: string): string[] {
	return readdirSync(folder).flatMap((name) => {
		const file = path.join(folder, name);
		return statSync(file).isDirectory() ? files(file) : [file];
	});
}

/**
 * The relative links in the built site whose file or anchor doesn't exist,
 * as "page: url".
 */
export function brokenLinks(dist: string): string[] {
	const pages = files(dist).filter((file) => file.endsWith(".html"));
	const ids = new Map(
		pages.map((file) => [
			file,
			new Set(
				[...readFileSync(file, "utf8").matchAll(/\bid="([^"]+)"/g)].map(
					(match) => match[1],
				),
			),
		]),
	);
	const broken: string[] = [];
	for (const file of pages) {
		for (const [, url] of readFileSync(file, "utf8").matchAll(
			/\b(?:href|src|srcset)="([^"]*)"/g,
		)) {
			if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) continue;
			const [target, hash] = splitHash(url);
			let resolved = target
				? path.resolve(path.dirname(file), decodeURIComponent(target))
				: file;
			if (target.endsWith("/")) resolved = path.join(resolved, "index.html");
			const where = `${path.relative(dist, file)}: ${url}`;
			if (!existsSync(resolved)) broken.push(where);
			else if (
				hash.length > 1 &&
				resolved.endsWith(".html") &&
				!ids.get(resolved)?.has(decodeURIComponent(hash.slice(1)))
			) {
				broken.push(where);
			}
		}
	}
	return broken;
}

/** A class name as a CSS selector writes it, after CSS.escape(). */
export function cssEscape(className: string): string {
	return [...className]
		.map((char, index) => {
			if (index === 0 && /\d/.test(char)) return `\\3${char} `;
			return /[\w-]/.test(char) || char > "\u007f" ? char : `\\${char}`;
		})
		.join("");
}

/** The classes in some HTML that no rule in the CSS selects. */
export function missingClasses(html: string[], css: string): string[] {
	const classes = new Set(
		html.flatMap((part) =>
			[...part.matchAll(/\bclass="([^"]*)"/g)].flatMap((match) =>
				match[1].split(/\s+/).filter(Boolean),
			),
		),
	);
	return [...classes].filter((name) => {
		const selector = cssEscape(name).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
		return !new RegExp(`\\.${selector}(?![\\w-])`).test(css);
	});
}
