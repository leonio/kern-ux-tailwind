import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
	brokenLinks,
	createHighlight,
	cssEscape,
	dedent,
	generatedBlocks,
	missingClasses,
	PAGES,
	publishedPaths,
	ROOT,
	renderFragment,
	renderMarkdown,
	rewriteUrl,
	SITE_URL,
	SYNTAX,
	slugger,
} from "../scripts/site.ts";
import { installedSources, undefinedKernTokens } from "../scripts/tokens.ts";

const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
const page = (source: string) => {
	const found = PAGES.find((candidate) => candidate.source === source);
	if (!found) throw new Error(`No page for ${source}`);
	return found;
};

describe("slugger", () => {
	it("makes GitHub's anchors", () => {
		const slug = slugger();
		expect(slug("The dark: variant")).toBe("the-dark-variant");
		expect(slug("What stays Tailwind's")).toBe("what-stays-tailwinds");
		expect(slug("With remap.css")).toBe("with-remapcss");
		expect(slug("Light, dark and sections")).toBe("light-dark-and-sections");
	});

	it("numbers repeated headings", () => {
		const slug = slugger();
		expect([slug("Steps"), slug("Steps"), slug("Steps")]).toEqual([
			"steps",
			"steps-1",
			"steps-2",
		]);
	});
});

describe("renderMarkdown", () => {
	it("gives headings their anchor and KERN's classes, and takes the title from the h1", () => {
		const { html, title } = renderMarkdown(
			"# Utilities\n\n## The `dark:` variant\n\nText.",
		);
		expect(title).toBe("Utilities");
		expect(html).toContain('<h1 id="utilities" class="kern-heading-x-large">');
		expect(html).toContain('id="the-dark-variant" class="kern-heading-large');
		expect(html).toContain('<p class="kern-body">Text.</p>');
	});

	it("renders tables and links with KERN's classes", () => {
		const { html } = renderMarkdown("| A |\n|---|\n| [b](c.md) |");
		expect(html).toContain('<table class="kern-table kern-table--small">');
		expect(html).toContain('<th scope="col" class="kern-table__header">');
		expect(html).toContain('<td class="kern-table__cell">');
		expect(html).toContain('<a href="c.md" class="kern-link">');
	});

	it("renders an html example live and as code, and collects it", () => {
		const example = '<button class="bg-primary">Go</button>\n';
		const { html, examples } = renderMarkdown(
			`\`\`\`html example\n${example}\`\`\``,
		);
		expect(examples).toEqual([example]);
		expect(html).toContain(`gap-kern-default p-kern-large">${example}</div>`);
		expect(html).toContain("&lt;button class=&quot;bg-primary&quot;&gt;Go");
	});

	it("escapes other code blocks and inline code", () => {
		const { html, examples } = renderMarkdown(
			"```html\n<b>x</b>\n```\n\n`<i>`",
		);
		expect(examples).toEqual([]);
		expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
		expect(html).toContain("&lt;i&gt;</code>");
		expect(html).not.toContain("<b>x</b>");
	});
});

describe("rewriteUrl", () => {
	const published = publishedPaths();
	const docs = page("docs/limits.md");
	const readme = page("README.md");

	it("links a published Markdown file to its page, with the anchor", () => {
		expect(rewriteUrl("theming.md#the-dark-variant", docs, published)).toBe(
			"theming.html#the-dark-variant",
		);
		expect(rewriteUrl("docs/utilities.md", readme, published)).toBe(
			"docs/utilities.html",
		);
		expect(rewriteUrl("../site/pages/demo.html", docs, published)).toBe(
			"../demo/index.html",
		);
	});

	it("links other repo files to GitHub", () => {
		expect(rewriteUrl("CONTRIBUTING.md#versioning", readme, published)).toBe(
			"https://github.com/leonio/kern-ux-tailwind/blob/main/CONTRIBUTING.md#versioning",
		);
	});

	it("makes links to the site and to raw images in the repo local", () => {
		expect(rewriteUrl(`${SITE_URL}demo/`, readme, published)).toBe(
			"demo/index.html",
		);
		expect(rewriteUrl(SITE_URL, docs, published)).toBe("../index.html");
		expect(
			rewriteUrl(
				"https://raw.githubusercontent.com/leonio/kern-ux-tailwind/main/docs/images/comparison-light.png",
				readme,
				published,
			),
		).toBe("docs/images/comparison-light.png");
	});

	it("leaves other URLs and anchors alone", () => {
		expect(rewriteUrl("https://tailwindcss.com/", docs, published)).toBe(
			"https://tailwindcss.com/",
		);
		expect(rewriteUrl("#main", docs, published)).toBe("#main");
	});
});

describe("brokenLinks", () => {
	it("finds links to missing files and to missing headings", () => {
		const dist = mkdtempSync(path.join(tmpdir(), "site-"));
		mkdirSync(path.join(dist, "docs"));
		writeFileSync(
			path.join(dist, "index.html"),
			'<a href="docs/a.html#here">ok</a><a href="docs/a.html#gone">no</a><a href="docs/b.html">no</a><a href="#top">ok</a><a href="https://example.com/x">ok</a><p id="top"></p>',
		);
		writeFileSync(path.join(dist, "docs/a.html"), '<h2 id="here"></h2>');
		expect(brokenLinks(dist)).toEqual([
			"index.html: docs/a.html#gone",
			"index.html: docs/b.html",
		]);
	});
});

describe("missingClasses", () => {
	const css =
		".kern-btn--primary{color:red}.bg-primary{color:red}.lg\\:grid-cols-3{display:grid}.py-1\\.5{padding:0}";

	it("finds the classes no rule selects", () => {
		expect(
			missingClasses(
				[
					'<b class="bg-primary lg:grid-cols-3 py-1.5 kern-btn kern-btn--primary">',
				],
				css,
			),
		).toEqual(["kern-btn"]);
	});

	it("escapes class names as CSS does", () => {
		expect(cssEscape("lg:grid-cols-3")).toBe("lg\\:grid-cols-3");
		expect(cssEscape("bg-primary/50")).toBe("bg-primary\\/50");
		expect(cssEscape("2xl:p-4")).toBe("\\32 xl\\:p-4");
	});
});

describe("generatedBlocks", () => {
	const blocks = generatedBlocks(read("src/theme.css"), read("src/tokens.css"));

	it("has a block for every site comment in the docs", () => {
		const markers = PAGES.flatMap((candidate) => [
			...read(candidate.source).matchAll(/<!-- site:([\w-]+) -->/g),
		]).map((match) => match[1]);
		expect(markers.length).toBeGreaterThan(0);
		for (const marker of markers) expect(Object.keys(blocks)).toContain(marker);
	});

	it("reads the names from the theme", () => {
		expect(blocks["semantic-colours"]).toContain("bg-primary");
		expect(blocks.palette).toContain("bg-kern-darkblue-700");
		expect(blocks["type-roles"]).toContain('class="text-kern-heading-display"');
		expect(blocks.spacing).toContain("w-kern-default");
		expect(blocks["radii-shadows"]).toContain("shadow-kern-high");
	});
});

describe("code blocks", () => {
	it("sit under a bar with their language and a hidden copy button", () => {
		const { html } = renderMarkdown("```css\na { color: red; }\n```");
		expect(html).toContain("data-code>");
		expect(html).toContain('text-muted-foreground">CSS</span>');
		expect(html).toContain("data-copy hidden>");
		expect(html).toContain("Copy the code");
	});
});

describe("dedent", () => {
	it("removes the indentation the lines share and the blank lines around them", () => {
		expect(dedent("\n\t\t<a>\n\t\t\t<b></b>\n\t\t</a>\n\t")).toBe(
			"<a>\n\t<b></b>\n</a>",
		);
	});
});

describe("renderFragment", () => {
	const { html, title } = renderFragment(
		'<h1 class="kern-heading-x-large">Demo</h1>\n<div>\n\t<!-- markup KERN -->\n\t<b class="kern-badge">New</b>\n\t<!-- /markup -->\n</div>\n<div>\n\t<!-- markup Tailwind -->\n\t<b class="rounded-md">New</b>\n\t<!-- /markup -->\n</div>\n<!-- markup-panel -->',
	);

	it("takes the title from the h1", () => {
		expect(title).toBe("Demo");
	});

	it("keeps marked markup and puts the code of each piece in the panel, under its label", () => {
		expect(html).toContain('<b class="kern-badge">New</b>');
		expect(html).toContain('<b class="rounded-md">New</b>');
		expect(
			html.match(/<details class="kern-details" data-markup>/g),
		).toHaveLength(1);
		expect(html).toContain('text-muted-foreground">KERN</span>');
		expect(html).toContain('text-muted-foreground">Tailwind</span>');
		expect(html).toContain(
			"<code>&lt;b class=&quot;kern-badge&quot;&gt;New&lt;/b&gt;</code>",
		);
		expect(html).not.toContain("<!-- markup");
		expect(html.indexOf("<details")).toBeGreaterThan(
			html.indexOf("rounded-md"),
		);
	});

	it("fails on markup no panel follows", () => {
		expect(() =>
			renderFragment("<!-- markup KERN --><b>New</b><!-- /markup -->"),
		).toThrow(/KERN has no <!-- markup-panel -->/);
	});
});

describe("createHighlight", async () => {
	const highlight = await createHighlight();
	const { kernCss } = installedSources();

	it("colours tokens with KERN's colours and never Shiki's variables", () => {
		const html = [
			highlight('<a class="kern-link" href="#">Go</a> <!-- note -->', "html"),
			highlight('@import "x"; a { color: red; } /* note */', "css"),
			highlight('const a = "b"; // note', "js"),
			highlight("npm install x # note", "bash"),
		].join("\n");
		expect(html).not.toContain("--shiki");
		expect(html).toContain("var(--kern-color-");
		expect(undefinedKernTokens(html, kernCss)).toEqual([]);
	});

	it("maps only to colours KERN defines", () => {
		const css = Object.values(SYNTAX)
			.map((name) => `var(--kern-color-${name})`)
			.join(" ");
		expect(undefinedKernTokens(css, kernCss)).toEqual([]);
	});

	it("escapes code in other languages", () => {
		expect(highlight("<b>&</b>", "text")).toBe("&lt;b&gt;&amp;&lt;/b&gt;");
	});
});
