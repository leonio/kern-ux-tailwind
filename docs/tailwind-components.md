# Tailwind components

Tailwind itself has no components; the component sets built on it name colours in one of two ways, and the theme handles both.

## Semantic names

shadcn/ui, and the many sets built like it, colour components with semantic names: `bg-primary text-primary-foreground`, `text-muted-foreground`, `border-input`, `ring-ring/50`. The theme defines these names on KERN's tokens ([the list](utilities.md#semantic-colours)), so such components render in KERN's colours, in light and dark, without changes.

### shadcn/ui

shadcn/ui's CLI writes its own colour variables into your global stylesheet. Replace them with the theme:

1. Add `@import "@leonio/kern-ux-tailwind";` after `@import "tailwindcss";`.
2. Delete its `:root { … }` and `.dark { … }` blocks, which set `--background`, `--primary` and the rest.
3. Delete its `@theme inline { … }` block, which points Tailwind's colours and radii at those variables.
4. Delete its `@custom-variant dark` line, so `dark:` follows KERN's theme instead of a `.dark` class.
5. Keep the rest, such as the `@layer base` block that sets `border-border` and `bg-background`.

Its chart and sidebar colours (`chart-1` …, `sidebar` …) have no KERN equivalent. If you use those components, keep their lines of the `@theme inline` block and point each straight at a KERN colour, for example `--color-sidebar: var(--kern-color-layout-background-hued);`. Inside `@theme inline`, the colour then resolves where it's used and follows KERN's themes.

Without its `@theme inline` block, `rounded-md` and the other radii are Tailwind's again; add `remap.css` to have them use KERN's radii.

## Palette classes

Tailwind Plus and most copy-paste component sites hard-code Tailwind's palette: `bg-indigo-600`, `text-gray-500`, `ring-gray-300`, with `dark:` pairs such as `dark:bg-gray-900`. With `remap.css`, those classes use KERN's colours:

```css
@import "tailwindcss";
@import "@leonio/kern-ux-tailwind";
@import "@leonio/kern-ux-tailwind/remap.css";
```

### Families

Each Tailwind family takes the KERN palette nearest in hue:

| Tailwind                                              | KERN                  |
| ----------------------------------------------------- | --------------------- |
| `slate`, `gray`, `zinc`                               | `neutral` (blue-grey) |
| `neutral`, `stone`, `mauve`, `olive`, `mist`, `taupe` | `grey`                |
| `red`, `rose`, `pink`                                 | `red`                 |
| `orange`, `amber`                                     | `orange`              |
| `yellow`                                              | `yellow`              |
| `lime`                                                | `limette`             |
| `green`                                               | `green`               |
| `emerald`, `teal`                                     | `turquois`            |
| `cyan`, `sky`                                         | `lightblue`           |
| `blue`, `indigo`                                      | `darkblue`            |
| `violet`, `purple`, `fuchsia`                         | `violet`              |

### Steps

Each Tailwind step takes the step of its KERN palette with the nearest OKLCH lightness, not the step with the same number:

| Tailwind              | 50  | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `gray` → `neutral`    | 025 | 025 | 050 | 150 | 350 | 550 | 650 | 750 | 850 | 950 | 950 |
| `indigo` → `darkblue` | 025 | 050 | 150 | 250 | 400 | 500 | 600 | 650 | 750 | 800 | 900 |

That keeps the contrast the component's author chose. KERN's steps are calibrated by contrast (every `-500` is 4.5:1 on white) and Tailwind's aren't (`gray-500` is 4.8:1, `blue-500` 3.8:1), so the same number can mean a different contrast. Over 30 text and background pairs common in Tailwind components:

- Mapping by number puts 3 below 4.5:1: `text-gray-500` on `bg-gray-50` (3.7:1), `text-gray-500` on `bg-gray-100` (3.5:1) and `text-gray-400` on `bg-gray-800` (4.0:1).
- Mapping by lightness puts 1 below: `text-white` on `bg-green-600`, which is 3.2:1 in Tailwind's own palette and 3.5:1 here.

A few Tailwind steps share a KERN step: `gray-50` and `gray-100` are both `neutral-025`.

### Radii and shadows

| Tailwind                               | KERN                          |
| -------------------------------------- | ----------------------------- |
| `rounded-xs`                           | 2px (`border-radius-small`)   |
| `rounded-sm`, `rounded-md`             | 4px (`border-radius-default`) |
| `rounded-lg` and larger                | 8px (`border-radius-large`)   |
| `shadow-2xs`, `shadow-xs`, `shadow-sm` | `shadow-elevation-low`        |
| `shadow-md`                            | `shadow-elevation-default`    |
| `shadow-lg` and larger                 | `shadow-elevation-high`       |

`rounded-full` and `rounded-none` are unchanged.

## What stays Tailwind's

The theme changes values, not markup. A pasted component keeps its sizes, text sizes and focus styles:

|               | Typical Tailwind component   | KERN                                     |
| ------------- | ---------------------------- | ---------------------------------------- |
| Button height | 36px (`py-2` with `text-sm`) | 48px                                     |
| Text          | 14px (`text-sm`)             | 16px at the smallest, 18px for body text |
| Focus         | 2px outline or a 3px ring    | 4px outline in `action-focus-default`    |

To bring a component closer to KERN, swap those classes: `min-h-12` on buttons, `text-kern-body` or `text-kern-label` for text, `focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ring` for focus. For KERN-conformant UI, use KERN's components, or build on the tokens as the [demo](https://leonio.github.io/kern-ux-tailwind/)'s middle column does.
