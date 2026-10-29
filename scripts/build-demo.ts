/**
 * Builds the demo into demo/dist: the page, its stylesheet compiled with the
 * Tailwind CLI, and KERN's Fira Sans. The Pages workflow publishes the folder;
 * locally, open demo/dist/index.html.
 *
 *   npm run demo
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIST = path.join(ROOT, "demo/dist");
const require = createRequire(import.meta.url);
const packageDir = (name: string) =>
	path.dirname(require.resolve(`${name}/package.json`));

rmSync(DIST, { recursive: true, force: true });
mkdirSync(path.join(DIST, "fonts"), { recursive: true });

const cli = packageDir("@tailwindcss/cli");
const { bin } = JSON.parse(
	readFileSync(path.join(cli, "package.json"), "utf8"),
);
execFileSync(
	process.execPath,
	[
		path.join(cli, bin.tailwindcss),
		"--input",
		"demo/app.css",
		"--output",
		"demo/dist/app.css",
		"--minify",
	],
	{ cwd: ROOT, stdio: "inherit" },
);

cpSync(path.join(ROOT, "demo/index.html"), path.join(DIST, "index.html"));
const fonts = path.join(packageDir("@kern-ux/native"), "dist/fonts");
cpSync(
	path.join(fonts, "fira-sans.css"),
	path.join(DIST, "fonts/fira-sans.css"),
);
cpSync(path.join(fonts, "fira-sans"), path.join(DIST, "fonts/fira-sans"), {
	recursive: true,
});
console.log("Built demo/dist; open demo/dist/index.html");
