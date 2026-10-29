# Light, dark and sections

## Utilities follow KERN

KERN switches theme by redefining its colour tokens, and the theme's utilities read those tokens where they're used: `bg-primary` compiles to `background-color: var(--kern-color-action-default-contextual)`. So a utility always has the colour KERN's own components have in the same place, with nothing to configure.

KERN's theme comes from, in order of precedence:

1. The nearest ancestor with `data-kern-theme="light"` or `"dark"`, or the class `kern-light` or `kern-dark`.
2. Otherwise, the system preference (`prefers-color-scheme`).

```html
<!-- The whole page follows the system -->
<html lang="de">

<!-- The whole page is dark -->
<html lang="de" data-kern-theme="dark">

<!-- One dark section on any page -->
<section data-kern-theme="dark" class="bg-background p-kern-large text-foreground">
	<button class="bg-primary text-primary-foreground …">In KERN's dark action colour</button>
</section>
```

Set `bg-background text-foreground` on a themed section so it gets the theme's background and text, as `<body>` does.

### A theme switch

```js
for (const input of document.querySelectorAll('input[name="theme"]')) {
	input.addEventListener("change", () => {
		if (input.value === "system") {
			document.documentElement.removeAttribute("data-kern-theme");
		} else {
			document.documentElement.dataset.kernTheme = input.value;
		}
	});
}
```

## Surface levels

KERN's contextual tokens also follow the surface level: on an element with `kern-level-1` or `kern-level-2`, KERN points `layout-background-default-contextual`, `layout-border-contextual`, `decorative-border-contextual` and `layout-layer-surface-contextual` at that level's colours. The semantic names (`bg-background`, `bg-muted`, `border-border` …) and the `kern-…-contextual` utilities read the contextual tokens, so they follow the level too.

The plain tokens, such as `bg-kern-layout-background-default`, follow light and dark but not the level.

## The `dark:` variant

`dark:` matches where KERN is dark:

- inside an element with `data-kern-theme="dark"` or `kern-dark`, or on that element itself;
- or, when the system prefers dark, anywhere that isn't inside a `data-kern-theme="light"` or `kern-light` element.

It's there for markup that pairs colours itself, as most Tailwind components do: `bg-white dark:bg-gray-900`. For your own markup, use the semantic or `kern-` colours instead, which need no `dark:` at all.

One case `dark:` gets wrong: a light section inside a dark page. A CSS selector can't tell which themed ancestor is nearest, so elements in that section still match `dark:`. The colour utilities are right at any depth.

## Themes that redefine KERN's tokens

A theme built the way KERN's is, by redefining `--kern-color-…` tokens on `:root` or on a selector, changes the utilities as well, since they read the same tokens.
