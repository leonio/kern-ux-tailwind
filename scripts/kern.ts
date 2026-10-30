/**
 * What a newer KERN changes for the package: the versions to check, what each
 * adds, removes and remaps, the release it calls for, and the report that
 * .github/workflows/kern.yml keeps in an issue. scripts/check-kern.ts installs
 * the versions and runs the tests with them; kern.test.ts tests the parts here.
 */
import semver from "semver";

import {
	definedKernTokens,
	type GeneratedFiles,
	undefinedKernTokens,
} from "./tokens.ts";

export const KERN = "@kern-ux/native";

/** The stylesheets in src/: the theme, written by hand, and the generated files. */
export const SOURCE_FILES = ["theme.css", "tokens.css", "remap.css"] as const;
export type SourceFile = (typeof SOURCE_FILES)[number];
export type SourceFiles = Record<SourceFile, string>;

export type Release = { version: string; date: string };

/**
 * The stable releases after `tested`, oldest first, from
 * `npm view @kern-ux/native time --json`.
 */
export function newerReleases(
	time: Record<string, string>,
	tested: string,
): Release[] {
	return Object.entries(time)
		.filter(
			([version]) =>
				semver.valid(version) &&
				!semver.prerelease(version) &&
				semver.gt(version, tested),
		)
		.sort(([a], [b]) => semver.compare(a, b))
		.map(([version, date]) => ({ version, date: date.slice(0, 10) }));
}

/**
 * The versions worth installing: the newest in the peer range, which projects
 * get today, and the newest of all, which an update would move to.
 */
export function versionsToCheck(newer: Release[], range: string): string[] {
	const versions = newer.map((release) => release.version);
	const candidates = [semver.maxSatisfying(versions, range), versions.at(-1)];
	return [
		...new Set(candidates.filter((version) => typeof version === "string")),
	];
}

export type Comparison = {
	/** The custom properties KERN defines that the new version adds and removes. */
	tokens: { added: string[]; removed: string[] };
	/** The KERN tokens each checked-in file in src/ reads that the new version doesn't define. */
	missing: Partial<Record<SourceFile, string[]>>;
	/** The generated files npm run tokens rewrites. */
	regenerated: string[];
	/** The kern- colours npm run tokens adds and removes, each with its utilities. */
	colours: { added: string[]; removed: string[] };
	/** Tailwind colours remap.css points at another KERN colour, as "blue-700: darkblue-700 → darkblue-600". */
	remapped: string[];
	/** Whether src/, regenerated, reads only tokens the tested KERN defines too. */
	worksWithTested: boolean;
};

/** The names in `a` that `b` doesn't have, sorted. */
function without(a: Iterable<string>, b: Iterable<string>): string[] {
	const exclude = new Set(b);
	return [...new Set(a)].filter((name) => !exclude.has(name)).sort();
}

const kernColours = (tokensCss: string) =>
	[...tokensCss.matchAll(/--color-(kern-[a-z0-9-]+):/g)].map((m) => m[1]);

const remapTargets = (remapCss: string) =>
	new Map(
		[
			...remapCss.matchAll(
				/--color-([a-z]+-\d+): var\(--kern-color-([a-z0-9-]+)\)/g,
			),
		].map((m) => [m[1], m[2]]),
	);

export function compareKern({
	testedKern,
	kern,
	src,
	generated,
}: {
	/** kern.min.css of the tested KERN and of the new one. */
	testedKern: string;
	kern: string;
	/** The checked-in stylesheets. */
	src: SourceFiles;
	/** What npm run tokens generates with the new KERN. */
	generated: GeneratedFiles;
}): Comparison {
	const before = definedKernTokens(testedKern);
	const after = definedKernTokens(kern);
	const regenerated: SourceFiles = { ...src, ...generated };
	const oldTargets = remapTargets(src["remap.css"]);
	const missing = SOURCE_FILES.map(
		(file) => [file, undefinedKernTokens(src[file], kern)] as const,
	).filter(([, names]) => names.length > 0);
	return {
		tokens: { added: without(after, before), removed: without(before, after) },
		missing: Object.fromEntries(missing),
		regenerated: (["tokens.css", "remap.css"] as const).filter(
			(file) => generated[file] !== src[file],
		),
		colours: {
			added: without(
				kernColours(generated["tokens.css"]),
				kernColours(src["tokens.css"]),
			),
			removed: without(
				kernColours(src["tokens.css"]),
				kernColours(generated["tokens.css"]),
			),
		},
		remapped: [...remapTargets(generated["remap.css"])]
			.filter(
				([colour, target]) => (oldTargets.get(colour) ?? target) !== target,
			)
			.map(
				([colour, target]) =>
					`${colour}: ${oldTargets.get(colour)} → ${target}`,
			),
		worksWithTested: SOURCE_FILES.every(
			(file) => undefinedKernTokens(regenerated[file], testedKern).length === 0,
		),
	};
}

export type Check = Release & {
	/** Whether the peer range already lets it in. */
	inRange: boolean;
	comparison: Comparison;
	/** What fails in npm test and npm run site with it, the files regenerated and the peer range widened to it. */
	failures: string[];
};

/** Where the package stands: its version, the KERN it's tested with and its peer range on KERN. */
export type Current = { version: string; tested: string; range: string };

export type Advice = {
	/** Whether it works and the release it calls for, in a sentence or two. */
	summary: string;
	/** The peer range it needs, when the current one won't do. */
	range?: string;
	/** The version to release, when it calls for a release. */
	release?: string;
};

/** The peer range and the release a KERN version calls for, by CONTRIBUTING.md (Versioning). */
export function advise(check: Check, current: Current): Advice {
	if (check.failures.length > 0) {
		return {
			summary: `**Needs work.** The tests fail with KERN ${check.version}, even after \`npm run tokens\`.`,
		};
	}
	const { colours, remapped, regenerated, worksWithTested } = check.comparison;
	const next = `${semver.major(check.version)}.${semver.minor(check.version) + 1}.0`;
	const range = !worksWithTested
		? `~${check.version}`
		: check.inRange
			? undefined
			: `>=${semver.minVersion(current.range)} <${next}`;
	// What makes it a breaking release and what a minor one, by the table.
	const breaking = [
		!worksWithTested &&
			`\`src/\` reads tokens ${current.tested} doesn't define, so the peer range leaves ${current.tested} behind`,
		colours.removed.length > 0 && "it removes utilities",
		remapped.length > 0 &&
			"Tailwind colours in `remap.css` point at other KERN colours",
	].filter((reason) => typeof reason === "string");
	const additions = [
		range && "the peer range widens",
		colours.added.length > 0 && "it adds utilities",
	].filter((reason) => typeof reason === "string");
	const works =
		regenerated.length > 0
			? `**Works after \`npm run tokens\`.**`
			: "**Works as it is.**";
	if (breaking.length === 0 && additions.length === 0) {
		return {
			summary: `${works} No release needed: only the devDependency moves.`,
		};
	}
	// Below 1.0.0, a breaking change is a minor release.
	const release = semver.inc(
		current.version,
		breaking.length > 0 && semver.major(current.version) > 0
			? "major"
			: "minor",
	);
	const [kind, reasons] =
		breaking.length > 0 ? ["breaking", breaking] : ["minor", additions];
	return {
		summary: `${works} It calls for a ${kind} release, ${release}: ${reasons.join(", and ")}.`,
		range,
		release: release ?? undefined,
	};
}

/**
 * KERN's CHANGELOG.md for the versions after `tested`, with its headings
 * moved under the report's, newest first up to about `limit` characters: an
 * issue holds 65,536.
 */
export function changelogSince(
	changelog: string,
	tested: string,
	limit = 30_000,
): string {
	const sections = changelog
		.split(/^(?=#{1,2} \[\d+\.\d+\.\d+\])/m)
		.filter((section) => {
			const version = /^#{1,2} \[(\d+\.\d+\.\d+)\]/.exec(section)?.[1];
			return version !== undefined && semver.gt(version, tested);
		})
		.map((section) =>
			section
				.replace(/^### /gm, "#### ")
				.replace(/^#{1,2} \[/, "### [")
				.replace(/\n{3,}/g, "\n\n")
				.trim(),
		);
	const kept: string[] = [];
	let length = 0;
	for (const section of sections) {
		length += section.length;
		if (kept.length > 0 && length > limit) {
			kept.push(`KERN's \`CHANGELOG.md\` goes back further.`);
			break;
		}
		kept.push(section);
	}
	return kept.join("\n\n");
}

/** Names as inline code, the first `limit` of them. */
function names(list: string[], limit = 20): string {
	const shown = list
		.slice(0, limit)
		.map((name) => `\`${name}\``)
		.join(", ");
	return list.length > limit
		? `${shown} and ${list.length - limit} more`
		: shown;
}

const counted = (list: string[], what: string) =>
	`${list.length} ${what}${list.length > 0 ? ` (${names(list, 10)})` : ""}`;

function checkSection(check: Check, current: Current): string {
	const { tokens, missing, regenerated, colours, remapped } = check.comparison;
	const advice = advise(check, current);
	const facts = [
		check.failures.length === 0 &&
			`- **Peer range:** ${advice.range ? `\`${current.range}\` → \`${advice.range}\`` : `stays \`${current.range}\``}`,
		`- **KERN's tokens:** ${counted(tokens.added, "added")}, ${counted(tokens.removed, "removed")}`,
		...Object.entries(missing).map(
			([file, list]) =>
				`- **Tokens \`src/${file}\` reads that ${check.version} doesn't define:** ${names(list ?? [])}`,
		),
	];
	if (regenerated.length > 0) {
		const changes = [
			colours.added.length > 0 &&
				`adds the colours ${names(colours.added, 30)}`,
			colours.removed.length > 0 &&
				`removes the colours ${names(colours.removed, 30)}`,
		].filter(Boolean);
		facts.push(
			`- **\`npm run tokens\`** rewrites ${regenerated.map((file) => `\`src/${file}\``).join(" and ")}${changes.length > 0 ? `: it ${changes.join(", and ")}` : ""}`,
		);
	}
	if (remapped.length > 0) {
		facts.push(`- **Remapped in \`remap.css\`:** ${names(remapped, 30)}`);
	}
	facts.push(
		check.failures.length > 0
			? `- **Tests and site build:** ${check.failures.length} failing\n${check.failures.map((failure) => `  - ${failure}`).join("\n")}`
			: "- **Tests and site build:** pass",
	);
	return [
		`## KERN ${check.version}`,
		`${advice.summary}${check.inRange ? ` Projects that install the package get ${check.version} today: it's in the peer range.` : ""}`,
		facts.filter(Boolean).join("\n"),
	].join("\n\n");
}

function updateSteps(check: Check, current: Current): string {
	const advice = advise(check, current);
	const steps = [
		`\`npm install -D -E ${KERN}@${check.version}\``,
		check.comparison.regenerated.length > 0 && "`npm run tokens`",
		check.failures.length > 0 &&
			"Fix what fails, then work out the peer range and the release by CONTRIBUTING.md (Updating KERN or Tailwind).",
		advice.range &&
			`Set the peer range on \`${KERN}\` in \`package.json\` to \`${advice.range}\`.`,
		`Update the KERN version the docs name: \`README.md\` (Versions), \`docs/getting-started.md\` and, if KERN still does it, the textarea note in \`docs/limits.md\`.`,
		"`npm run site`, look at the demo, and `npm run screenshots` if it changed.",
		advice.release &&
			`Set the version in \`package.json\` to ${advice.release}, and release it once merged (CONTRIBUTING.md, Releasing).`,
	].filter(Boolean);
	return [
		`## To update to ${check.version}`,
		steps.map((step, index) => `${index + 1}. ${step}`).join("\n"),
	].join("\n\n");
}

export function renderReport({
	current,
	newer,
	checks,
	changelog,
	checkedOn,
	runUrl,
}: {
	current: Current;
	newer: Release[];
	checks: Check[];
	/** KERN's CHANGELOG.md from the newest version. */
	changelog: string;
	/** The date of the check, as YYYY-MM-DD. */
	checkedOn: string;
	/** The workflow run, on GitHub. */
	runUrl?: string;
}): string {
	const newest = checks.at(-1);
	if (!newest) {
		return `KERN ${current.tested}, the version the package is tested with, is the newest.`;
	}
	const rows = newer.map(
		(release) =>
			`| ${release.version} | ${release.date} | ${semver.satisfies(release.version, current.range) ? "Yes: projects get it today" : "No"} |`,
	);
	const since = changelogSince(changelog, current.tested);
	const by = runUrl ? `[the KERN workflow](${runUrl})` : "the KERN workflow";
	return [
		`KERN ${newest.version} is out. The package is tested with ${current.tested}, and its peer range on \`${KERN}\` is \`${current.range}\`.`,
		[
			"| Version | Released | In the peer range |",
			"| ------- | -------- | ----------------- |",
			...rows,
		].join("\n"),
		...checks.map((check) => checkSection(check, current)),
		updateSteps(newest, current),
		...(since ? ["## What KERN's changelog says", since] : []),
		"---",
		`Checked on ${checkedOn} by ${by}, with each version installed, \`npm run tokens\`, \`npm test\` and \`npm run site\`. It updates this issue every Monday, and closes it once the package is tested with the newest KERN.`,
	].join("\n\n");
}
