# Getting started

## Requirements

- Tailwind CSS 4.1 or later.
- `@kern-ux/native` 2.8. KERN renames tokens between minor versions, so the theme names the KERN versions it was checked with.

## Install

```bash
npm install @leonio/kern-ux-tailwind @kern-ux/native tailwindcss
```

Then add the Tailwind integration for your build, as below.

## Your stylesheet

Whatever the build, the stylesheet is the same:

```css
@import "tailwindcss";
@import "@leonio/kern-ux-tailwind";

/* Optional: KERN colours, radii and shadows for markup that hard-codes Tailwind's. */
@import "@leonio/kern-ux-tailwind/remap.css";
```

Import the theme **after** `tailwindcss`. The theme loads KERN's stylesheet into Tailwind's `base` layer, and it has to come after Tailwind's preflight there. Imported first, preflight would come last and reset KERN's components.

Don't also load `kern.min.css` with a `<link>` or a plain `@import`: outside a layer, KERN's rules would beat every Tailwind utility.

## Vite

```bash
npm install -D @tailwindcss/vite
```

```js
// vite.config.js
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss()],
});
```

Import your stylesheet from your entry module (`import "./style.css"`). Vite resolves the font files' `url()`s, so you can load KERN's font in the same stylesheet:

```css
@import "tailwindcss";
@import "@leonio/kern-ux-tailwind";
@import "@kern-ux/native/dist/fonts/fira-sans.css";
```

## PostCSS

For frameworks that run PostCSS, Next.js among them:

```bash
npm install -D @tailwindcss/postcss postcss
```

```js
// postcss.config.mjs
export default {
	plugins: { "@tailwindcss/postcss": {} },
};
```

## Tailwind CLI

```bash
npm install -D @tailwindcss/cli
npx tailwindcss -i ./src/style.css -o ./dist/style.css
```

## KERN's font

KERN sets Fira Sans; `@kern-ux/native` ships it in `dist/fonts/`.

- With Vite, import `@kern-ux/native/dist/fonts/fira-sans.css` in your stylesheet, as above.
- Otherwise link it from your HTML, or copy `node_modules/@kern-ux/native/dist/fonts/` next to your built CSS. The Tailwind CLI doesn't rewrite the font files' relative `url()`s, so an `@import` of the font CSS breaks once the output is somewhere else.

`@kern-ux/native` has no Fira Mono; without it, `font-mono` falls back to the system's monospace font.

## Check it works

Give `<body>` the classes `bg-background text-foreground`, then add a KERN button and one built with Tailwind:

```html example
<button type="button" class="kern-btn kern-btn--primary"><span class="kern-label">KERN</span></button>
<button type="button" class="min-h-12 rounded-kern-default bg-primary px-kern-large text-kern-label text-primary-foreground">
	Tailwind
</button>
```

Both buttons should have the same blue, and both should turn light blue with `data-kern-theme="dark"` on `<html>`.

## Without preflight

If a page is built from KERN's components and uses Tailwind only for layout, you can leave Tailwind's preflight out. KERN's components then render exactly as with KERN alone:

```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
@import "@leonio/kern-ux-tailwind";
```

With preflight, KERN's components look the same too; what changes is markup without KERN classes. Preflight removes the body margin, unstyles bare headings and lists, and sets `line-height: 1.5` on the root. Tailwind components expect preflight, so keep it if you use them.
