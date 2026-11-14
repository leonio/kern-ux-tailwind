/**
 * Checks the KERN versions after the one the package is tested with, its
 * devDependency: the newest in the peer range, which projects get today, and
 * the newest of all. Installs each in turn, regenerates src/tokens.css and
 * src/remap.css, and runs npm test and npm run site with the peer range
 * widened to let it in. Writes the report to the file it's given and the
 * newest version to $GITHUB_OUTPUT, then puts back everything it changed.
 * .github/workflows/kern.yml runs it every Monday.
 *
 *   npx tsx scripts/check-kern.ts kern.md
 */
import { spawnSync } from "node:child_process";
import {
	appendFileSync,
	existsSync,
	mkdtempSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import semver from "semver";

import {
	type Check,
	compareKern,
	KERN,
	newerReleases,
	renderReport,
	SOURCE_FILES,
	type SourceFiles,
	versionsToCheck,
} from "./kern.ts";
import {
	type GeneratedFiles,
	generateFiles,
	installedSources,
	SRC,
} from "./tokens.ts";

const ROOT = path.join(SRC, "..");
const reportFile = process.argv[2];
if (!reportFile) {
	throw new Error("Usage: npx tsx scripts/check-kern.ts <report.md>");
}

function run(command: string, ...args: string[]) {
	const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8" });
	return {
		ok: result.status === 0,
		stdout: result.stdout,
		output: stripVTControlCharacters(`${result.stdout}\n${result.stderr}`),
	};
}

function npm(...args: string[]): string {
	const result = run("npm", ...args);
	if (!result.ok)
		throw new Error(`npm ${args.join(" ")} failed:\n${result.output}`);
	return result.stdout;
}

const install = (version: string) =>
	npm(
		"install",
		"--no-save",
		"--no-audit",
		"--no-fund",
		"--ignore-scripts",
		`${KERN}@${version}`,
	);

/**
 * The lines of a failed command's output that say what failed: the site
 * build's problems and thrown errors, without Tailwind's warnings.
 */
function errorLines(output: string): string[] {
	const lines = output
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => /^(Broken link in |No CSS for |\w*Error: )/.test(line));
	return lines.length > 0 ? lines : ["failed: the workflow run's log says why"];
}

type VitestReport = {
	testResults: {
		name: string;
		status: string;
		message: string;
		assertionResults: {
			fullName: string;
			status: string;
			failureMessages: string[];
		}[];
	}[];
};

/** The failing tests, from Vitest's JSON report, and what the site build reports. */
function failures(): string[] {
	const found: string[] = [];
	const json = path.join(
		mkdtempSync(path.join(tmpdir(), "kern-")),
		"vitest.json",
	);
	const tests = run(
		"npm",
		"test",
		"--",
		"--reporter=json",
		`--outputFile=${json}`,
	);
	if (!tests.ok) {
		const report: VitestReport = existsSync(json)
			? JSON.parse(readFileSync(json, "utf8"))
			: { testResults: [] };
		const firstLine = (text = "") =>
			stripVTControlCharacters(text).trim().split("\n")[0];
		for (const file of report.testResults) {
			const failed = file.assertionResults.filter(
				(test) => test.status === "failed",
			);
			for (const test of failed) {
				found.push(`${test.fullName}: ${firstLine(test.failureMessages[0])}`);
			}
			if (failed.length === 0 && file.status === "failed") {
				found.push(
					`${path.relative(ROOT, file.name)}: ${firstLine(file.message)}`,
				);
			}
		}
		if (found.length === 0) {
			found.push(
				...errorLines(tests.output).map((line) => `npm test: ${line}`),
			);
		}
	}
	const site = run("npm", "run", "site");
	if (!site.ok) {
		found.push(
			...errorLines(site.output).map((line) => `npm run site: ${line}`),
		);
	}
	return found;
}

const manifestFile = path.join(ROOT, "package.json");
const manifestText = readFileSync(manifestFile, "utf8");
const manifest = JSON.parse(manifestText);
const current = {
	version: manifest.version,
	tested: manifest.devDependencies[KERN],
	range: manifest.peerDependencies[KERN],
};
const testedSources = installedSources();
if (testedSources.kernVersion !== current.tested) {
	throw new Error(
		`KERN ${testedSources.kernVersion} is installed, but the devDependency is ${current.tested}: run npm ci first.`,
	);
}
const src = Object.fromEntries(
	SOURCE_FILES.map((file) => [
		file,
		readFileSync(path.join(SRC, file), "utf8"),
	]),
) as SourceFiles;
const kernDir = path.dirname(
	createRequire(import.meta.url).resolve(`${KERN}/package.json`),
);

// The registry keeps the dates of unpublished versions: only the published count.
const { time, versions } = JSON.parse(
	npm("view", KERN, "time", "versions", "--json"),
);
const newer = newerReleases(
	Object.fromEntries(
		[versions].flat().map((version: string) => [version, time[version]]),
	),
	current.tested,
);
const checks: Check[] = [];
let changelog = "";
let installed = false;
try {
	for (const version of versionsToCheck(newer, current.range)) {
		console.log(`Checking KERN ${version}…`);
		installed = true;
		install(version);
		const sources = installedSources();
		const errors: string[] = [];
		let generated: GeneratedFiles = {
			"tokens.css": src["tokens.css"],
			"remap.css": src["remap.css"],
		};
		try {
			generated = generateFiles(sources);
		} catch (error) {
			errors.push(`npm run tokens: ${(error as Error).message}`);
		}
		for (const [file, content] of Object.entries(generated)) {
			writeFileSync(path.join(SRC, file), content);
		}
		manifest.peerDependencies[KERN] = `${current.range} || ${version}`;
		writeFileSync(manifestFile, `${JSON.stringify(manifest, null, "\t")}\n`);
		checks.push({
			version,
			date: newer.find((release) => release.version === version)?.date ?? "",
			inRange: semver.satisfies(version, current.range),
			comparison: compareKern({
				testedKern: testedSources.kernCss,
				kern: sources.kernCss,
				src,
				generated,
			}),
			failures: [...errors, ...failures()],
		});
		const changelogFile = path.join(kernDir, "CHANGELOG.md");
		changelog = existsSync(changelogFile)
			? readFileSync(changelogFile, "utf8")
			: "";
	}
} finally {
	writeFileSync(manifestFile, manifestText);
	for (const file of SOURCE_FILES)
		writeFileSync(path.join(SRC, file), src[file]);
	if (installed) install(current.tested);
}

const {
	GITHUB_OUTPUT,
	GITHUB_STEP_SUMMARY,
	GITHUB_SERVER_URL,
	GITHUB_REPOSITORY,
	GITHUB_RUN_ID,
} = process.env;
const report = renderReport({
	current,
	newer,
	checks,
	changelog,
	checkedOn: new Date().toISOString().slice(0, 10),
	runUrl: GITHUB_RUN_ID
		? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
		: undefined,
});
writeFileSync(reportFile, `${report}\n`);
if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, `${report}\n`);
if (GITHUB_OUTPUT) {
	appendFileSync(
		GITHUB_OUTPUT,
		`version=${newer.at(-1)?.version ?? ""}\ntested=${current.tested}\n`,
	);
}
console.log(report);
