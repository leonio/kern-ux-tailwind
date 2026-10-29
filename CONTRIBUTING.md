# Contributing

The package is plain CSS with no build step. `src/theme.css` is written by hand; `src/tokens.css` and `src/remap.css` are generated from the installed `@kern-ux/native` and `tailwindcss`.

```bash
npm ci
npm test            # generated files, token names and the compiled theme
npm run lint        # Biome
npm run typecheck   # the scripts and tests
npm run site        # builds the docs site and the demo into site/dist
npm run screenshots # rebuilds the site and writes docs/images/comparison-*.png
npm run tokens      # regenerates src/tokens.css and src/remap.css
```

## The tests

- `test/tokens.test.ts` fails when the generated files aren't what `npm run tokens` would write, or when a stylesheet in `src/` reads a `--kern-…` property that `@kern-ux/native` doesn't define.
- `test/theme.test.ts` compiles the package with Tailwind, importing it by name as a project would, and checks the result: KERN in the base layer after preflight, the utilities, `dark:`, the breakpoints and `remap.css`. It also checks that `npm pack` includes every file the exports name.

CI runs both, and runs `theme.test.ts` again with Tailwind 4.1.0 and 4.2.0, the oldest versions the peer range allows.

## Updating KERN or Tailwind

After an update of `@kern-ux/native` or `tailwindcss`:

1. Run `npm run tokens` and look at the diff of `src/tokens.css` and `src/remap.css`.
2. Run `npm test`. A token that `src/theme.css` reads and KERN no longer defines fails the token test.
3. For a new KERN minor version, check the demo, then update the peer range on `@kern-ux/native`; the token test requires the installed KERN to be in it.
   - If no token the theme already reads was renamed or removed, widen the range, for example from `~2.8.2` to `>=2.8.2 <2.10.0`. That's a minor release.
   - If the theme had to change for the new KERN, it no longer works with the old one: move the range to the new minor alone, for example `~2.9.0`. That's a major release.
4. For a new Tailwind palette family, the generator fails until you add it to `FAMILIES` in `scripts/tokens.ts`.

## Versioning

The package follows [semantic versioning](https://semver.org/). Its API is its class names and what each resolves to:

| Release | When                                                                                                                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Major   | A utility is renamed or removed, such as `text-kern-body`; a utility resolves to something else, such as `bg-primary` to another KERN token; a breakpoint changes; a KERN or Tailwind version leaves the peer range |
| Minor   | New utilities or files; the peer range widens to a new KERN or Tailwind version, with every existing utility unchanged                                                                                              |
| Patch   | A utility made to resolve as documented; documentation                                                                                                                                                              |

Below 1.0.0, a breaking change goes out as a minor release instead, as semantic versioning allows for 0.x versions. 1.0.0 follows once a project depends on the package in production.

## Releasing

Releases publish the version in `package.json`, so a release starts with a pull request that bumps it.

1. Run **Actions → Release → Run workflow**, as a dry run first if you like. It runs the checks and packs the tarball.
2. Approve the `release` environment to start the publish job.
3. The job stages the version on npm with provenance (`npm stage publish`). Approve it on npmjs.com with 2FA: **Staged Packages → Approve**. The job waits up to 60 minutes.
4. Once the version is live, the job tags it and creates the GitHub release with the tarball.

A pre-release version such as `0.2.0-beta.1` goes out under the `beta` dist-tag; others under `latest`.

### Before the first release

npm can only set up trusted publishing for a package that exists, so the first version is published by hand:

1. Run the Release workflow as a dry run and download its `release-assets` artifact.
2. Logged in to npm with 2FA: `npm publish ./leonio-kern-ux-tailwind-<version>.tgz --access public --provenance=false` (provenance needs CI).
3. On npmjs.com, under the package's settings, add a trusted publisher: GitHub Actions, user `leonio`, repository `kern-ux-tailwind`, workflow `release.yml`, environment `release`. Require 2FA and disallow tokens.
4. Create the `release` environment in the repository's settings, with yourself as a required reviewer.
5. Run the Release workflow for that version: it finds the version live on npm, skips staging and creates the tag and the GitHub release.

## The site and the screenshots

The site at https://leonio.github.io/kern-ux-tailwind/ is built with this package. `npm run site` renders `README.md` and `docs/*.md` with KERN's classes, adds the demo from `site/pages/demo.html`, and compiles `site/app.css` into `site/dist`; serve that folder to look at it. The code lives in `scripts/site.ts` and `scripts/build-site.ts`.

- The Markdown stays the source: GitHub and npm show the same files. Links between them become links between the site's pages, and links to other files in the repo go to GitHub.
- A code block marked `html example` renders live above its code on the site; GitHub shows it as an `html` block. The build fails if a class in an example has no CSS.
- A `<!-- site:name -->` comment in `docs/utilities.md` is replaced by a live block on the site: swatches, the type roles, spacing, radii and shadows, read from the theme. GitHub doesn't show the comments.
- The build fails on a link to a page, file or heading that doesn't exist.

`.github/workflows/pages.yml` publishes `site/dist` to GitHub Pages on every push to `main`. It needs Pages set to deploy from GitHub Actions once: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The screenshots in the README and `docs/` come from the demo. After a change that shows in it, rerun `npm run screenshots` and commit the images. It needs a Chromium once: `npx playwright-core install chromium`, or set `CHROMIUM_PATH` to one you have.
