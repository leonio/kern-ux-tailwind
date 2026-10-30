import { describe, expect, it } from "vitest";

import {
	advise,
	type Check,
	type Comparison,
	changelogSince,
	compareKern,
	newerReleases,
	renderReport,
	versionsToCheck,
} from "../scripts/kern.ts";
import { generateFiles } from "../scripts/tokens.ts";

const current = { version: "0.1.1", tested: "2.8.2", range: "~2.8.2" };

const works: Comparison = {
	tokens: { added: [], removed: [] },
	missing: {},
	regenerated: [],
	colours: { added: [], removed: [] },
	remapped: [],
	worksWithTested: true,
};
const check = (
	version: string,
	comparison: Partial<Comparison> = {},
	failures: string[] = [],
): Check => ({
	version,
	date: "2026-11-02",
	inRange: version.startsWith("2.8."),
	comparison: { ...works, ...comparison },
	failures,
});

describe("newerReleases", () => {
	it("lists the stable releases after the tested one, oldest first, with their dates", () => {
		expect(
			newerReleases(
				{
					created: "2024-01-01T00:00:00.000Z",
					modified: "2026-11-02T00:00:00.000Z",
					"2.9.0": "2026-11-02T09:00:00.000Z",
					"2.8.2": "2026-09-23T08:27:05.971Z",
					"2.10.0-beta.1": "2026-11-01T09:00:00.000Z",
					"2.8.3": "2026-10-01T09:00:00.000Z",
					"2.7.2": "2026-07-30T09:57:55.266Z",
				},
				"2.8.2",
			),
		).toEqual([
			{ version: "2.8.3", date: "2026-10-01" },
			{ version: "2.9.0", date: "2026-11-02" },
		]);
	});
});

describe("versionsToCheck", () => {
	const releases = (...versions: string[]) =>
		versions.map((version) => ({ version, date: "" }));

	it("checks the newest in the peer range and the newest of all", () => {
		expect(
			versionsToCheck(releases("2.8.3", "2.8.4", "2.9.0"), "~2.8.2"),
		).toEqual(["2.8.4", "2.9.0"]);
	});

	it("checks a version once when it's both", () => {
		expect(versionsToCheck(releases("2.8.3"), "~2.8.2")).toEqual(["2.8.3"]);
		expect(versionsToCheck(releases("2.9.0"), "~2.8.2")).toEqual(["2.9.0"]);
		expect(versionsToCheck([], "~2.8.2")).toEqual([]);
	});
});

describe("compareKern", () => {
	// remap.css reads KERN's radii and shadows too.
	const metrics = ["small", "default", "large"]
		.map((size) => `--kern-metric-border-radius-${size}: 4px;`)
		.concat(
			["low", "default", "high"].map(
				(level) => `--kern-shadow-elevation-${level}: none;`,
			),
		)
		.join("");
	const kern = (colours: Record<string, number>, extra = "") =>
		`:root{${Object.entries(colours)
			.map(([name, l]) => `--kern-color-${name}: oklch(${l}% .1 265);`)
			.join("")}${metrics}${extra}}`;
	// blue-700 moves to the lighter step; blue-100 stays on it.
	const tailwindTheme =
		"--color-blue-100: oklch(90% 0.03 264); --color-blue-700: oklch(46% 0.2 264);";
	const testedKern = kern(
		{ "darkblue-600": 50, "darkblue-700": 42, "action-old": 40 },
		"--kern-space: 1px;",
	);
	const src = {
		"theme.css":
			"a{color:var(--kern-color-action-old);margin:var(--kern-space)}",
		...generateFiles({ kernCss: testedKern, tailwindTheme }),
	};
	const newKern = kern(
		{ "darkblue-600": 47, "darkblue-700": 38, "action-new": 40 },
		"--kern-space: 1px;",
	);
	const comparison = compareKern({
		testedKern,
		kern: newKern,
		src,
		generated: generateFiles({ kernCss: newKern, tailwindTheme }),
	});

	it("lists the tokens KERN adds and removes", () => {
		expect(comparison.tokens).toEqual({
			added: ["--kern-color-action-new"],
			removed: ["--kern-color-action-old"],
		});
	});

	it("finds the tokens the checked-in files read that the new KERN lacks", () => {
		expect(comparison.missing).toEqual({
			"theme.css": ["--kern-color-action-old"],
			"tokens.css": ["--kern-color-action-old"],
		});
	});

	it("lists the colours npm run tokens adds and removes, and the remapped Tailwind colours", () => {
		expect(comparison.regenerated).toEqual(["tokens.css", "remap.css"]);
		expect(comparison.colours).toEqual({
			added: ["kern-action-new"],
			removed: ["kern-action-old"],
		});
		expect(comparison.remapped).toEqual([
			"blue-700: darkblue-700 → darkblue-600",
		]);
	});

	it("tells whether the regenerated files still work with the tested KERN", () => {
		expect(comparison.worksWithTested).toBe(false);
		expect(
			compareKern({
				testedKern,
				kern: testedKern,
				src,
				generated: generateFiles({ kernCss: testedKern, tailwindTheme }),
			}),
		).toMatchObject({ regenerated: [], worksWithTested: true });
	});
});

describe("advise", () => {
	it("sends a failing version back to CONTRIBUTING.md, with no range or release", () => {
		const advice = advise(check("2.9.0", {}, ["a test"]), current);
		expect(advice.summary).toContain("Needs work");
		expect(advice).not.toHaveProperty("range");
		expect(advice).not.toHaveProperty("release");
	});

	it("needs no release for a version in the range that changes nothing", () => {
		expect(advise(check("2.8.3"), current)).toEqual({
			summary:
				"**Works as it is.** No release needed: only the devDependency moves.",
		});
	});

	it("widens the range to the new minor version: a minor release", () => {
		expect(advise(check("2.9.0"), current)).toMatchObject({
			range: ">=2.8.2 <2.10.0",
			release: "0.2.0",
		});
		expect(
			advise(check("2.10.1"), { ...current, range: ">=2.8.2 <2.10.0" }),
		).toMatchObject({ range: ">=2.8.2 <2.11.0" });
	});

	it("counts new colours as a minor release, even in the range", () => {
		const advice = advise(
			check("2.8.3", {
				regenerated: ["tokens.css"],
				colours: { added: ["kern-new"], removed: [] },
			}),
			current,
		);
		expect(advice).toMatchObject({ release: "0.2.0" });
		expect(advice.summary).toContain("after `npm run tokens`");
		expect(advice.summary).toContain("minor release");
	});

	it("moves the range when the tested KERN would lack tokens: a breaking release", () => {
		const advice = advise(check("2.9.0", { worksWithTested: false }), current);
		expect(advice).toMatchObject({ range: "~2.9.0", release: "0.2.0" });
		expect(advice.summary).toContain("breaking release");
		expect(
			advise(check("2.9.0", { worksWithTested: false }), {
				...current,
				version: "1.2.3",
			}).release,
		).toBe("2.0.0");
	});

	it("counts removed and remapped colours as breaking", () => {
		for (const comparison of [
			{ colours: { added: [], removed: ["kern-gone"] } },
			{ remapped: ["blue-700: darkblue-700 → darkblue-600"] },
		]) {
			expect(
				advise(check("2.8.3", comparison), { ...current, version: "1.0.0" })
					.release,
			).toBe("2.0.0");
		}
	});
});

describe("changelogSince", () => {
	const changelog = [
		"## [2.9.0](https://example.com/compare/v2.8.2...v2.9.0) (2026-11-02)",
		"",
		"",
		"### Features",
		"",
		"* **Button:** a new variant",
		"",
		"## [2.8.2](https://example.com/compare/v2.8.1...v2.8.2) (2026-09-23)",
		"",
		"### Bug Fixes",
		"",
		"* an older fix",
	].join("\n");

	it("keeps the sections after the tested version, a heading level down", () => {
		expect(changelogSince(changelog, "2.8.2")).toBe(
			[
				"### [2.9.0](https://example.com/compare/v2.8.2...v2.9.0) (2026-11-02)",
				"",
				"#### Features",
				"",
				"* **Button:** a new variant",
			].join("\n"),
		);
		expect(changelogSince(changelog, "2.9.0")).toBe("");
	});

	it("keeps the newest sections up to about the limit", () => {
		const capped = changelogSince(changelog, "2.8.1", 50);
		expect(capped).toContain("### [2.9.0]");
		expect(capped).not.toContain("an older fix");
		expect(capped).toMatch(/goes back further\.$/);
		expect(changelogSince(changelog, "2.8.1")).toContain("an older fix");
	});
});

describe("renderReport", () => {
	const newer = [
		{ version: "2.8.3", date: "2026-10-01" },
		{ version: "2.9.0", date: "2026-11-02" },
	];
	const report = renderReport({
		current,
		newer,
		checks: [check("2.8.3"), check("2.9.0", {}, ["a failing test"])],
		changelog: "## [2.9.0](https://example.com) (2026-11-02)\n\n* a change",
		checkedOn: "2026-11-02",
		runUrl: "https://github.com/o/r/actions/runs/1",
	});

	it("lists the new versions and whether projects already get them", () => {
		expect(report).toContain("KERN 2.9.0 is out.");
		expect(report).toContain(
			"| 2.8.3 | 2026-10-01 | Yes: projects get it today |",
		);
		expect(report).toContain("| 2.9.0 | 2026-11-02 | No |");
	});

	it("has a section for each check, with its failures", () => {
		expect(report).toContain("## KERN 2.8.3");
		expect(report).toContain("- **Peer range:** stays `~2.8.2`");
		expect(report).toContain("## KERN 2.9.0\n\n**Needs work.**");
		expect(report).toContain("  - a failing test");
	});

	it("says how to update to the newest, with KERN's changelog and the run", () => {
		expect(report).toContain("## To update to 2.9.0");
		expect(report).toContain("1. `npm install -D -E @kern-ux/native@2.9.0`");
		expect(report).toContain("### [2.9.0](https://example.com) (2026-11-02)");
		expect(report).toContain(
			"[the KERN workflow](https://github.com/o/r/actions/runs/1)",
		);
	});

	it("says so when the tested version is the newest", () => {
		expect(
			renderReport({
				current,
				newer: [],
				checks: [],
				changelog: "",
				checkedOn: "",
			}),
		).toBe(
			"KERN 2.8.2, the version the package is tested with, is the newest.",
		);
	});
});
