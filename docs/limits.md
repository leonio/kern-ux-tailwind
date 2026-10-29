# Limits

## The theme changes values, not markup

Tailwind components keep their sizes, text sizes and focus styles; only colours, fonts, spacing tokens, radii, shadows and breakpoints come from KERN. See [What stays Tailwind's](tailwind-components.md#what-stays-tailwinds).

## `dark:` inside a light section on a dark page

`dark:` can't tell which themed ancestor is nearest, so a `data-kern-theme="light"` section inside a dark page still matches `dark:`. The colour utilities are right at any depth; use them there. See [The `dark:` variant](theming.md#the-dark-variant).

## KERN pads every `<textarea>`

`@kern-ux/native` 2.8.2 sets `textarea { padding: 8px 16px !important; }`, for every textarea, not only KERN's. In CSS cascade layers, an `!important` declaration in an earlier layer beats one in a later layer, so no Tailwind utility can override it, `!p-2` included.

Where a Tailwind textarea needs other padding, override it in the same layer as KERN, with a class:

```css
@layer base {
	.notes {
		padding: 6px 12px !important;
	}
}
```

## Preflight and markup without KERN classes

KERN's components render the same with and without Tailwind's preflight. The theme restores two things preflight would change:

- **Fonts inherit again below `body`.** KERN sets the font on every element, which would stop `font-mono` on a `<pre>` from reaching the `<code>` inside.
- **KERN's dialog stays centred.** KERN centres it with the browser's `margin: auto`, which preflight resets.

Preflight still changes markup that has no KERN classes. It removes the body margin, unstyles bare headings and lists, and sets `line-height: 1.5` on the root. To keep the browser's defaults there, [leave preflight out](getting-started.md#without-preflight).

## A build warning about `@charset`

Builds that minify the CSS, such as `vite build` or the Tailwind CLI with `--minify`, warn `Unknown at rule: @charset`. KERN's stylesheet starts with `@charset "UTF-8"`, which is only allowed at the very start of a file, and the theme imports that stylesheet into Tailwind's `base` layer. The warning is harmless: browsers ignore the rule there, and KERN's CSS works the same.

## Fira Mono

`@kern-ux/native` doesn't ship Fira Mono, so `font-mono` falls back to the system's monospace font unless you load it.

## KERN versions

KERN has renamed tokens between releases, for example `--kern-typography-font-size-static-small` to `--kern-typography-font-size-small-static`. A renamed token would make the utilities that read it resolve to nothing, so the peer range on `@kern-ux/native` only includes KERN versions the package was checked with, and npm reports a peer dependency conflict for any other. A newer KERN gets into the range with a release, once it's checked.
