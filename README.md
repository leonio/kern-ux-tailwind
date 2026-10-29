# @leonio/kern-ux-tailwind

[KERN-UX](https://www.kern-ux.de/) as a [Tailwind CSS](https://tailwindcss.com/) v4 theme. Tailwind's utilities, and Tailwind components you paste in, render in KERN's colours, fonts, spacing, radii, breakpoints and light and dark themes, next to KERN's own components.

**[See the demo](https://leonio.github.io/kern-ux-tailwind/)**: KERN's components, Tailwind components on KERN's tokens and remapped Tailwind markup side by side, in light and dark.

```bash
npm install @leonio/kern-ux-tailwind @kern-ux/native tailwindcss
```

```css
@import "tailwindcss";
@import "@leonio/kern-ux-tailwind";
@import "@leonio/kern-ux-tailwind/remap.css"; /* optional, for pasted components */
```

```html
<button class="min-h-12 rounded-kern-default bg-primary px-kern-large text-kern-label text-primary-foreground">
  Submit
</button>
```

This package is a theme: it doesn't contain KERN. `@kern-ux/native` is a peer dependency that your project installs, and the theme imports its stylesheet at build time, into Tailwind's `base` layer after preflight. So KERN's components (`kern-btn`, `kern-alert` …) keep their look, and Tailwind's utilities still override them.

## Documentation

- **[Getting started](docs/getting-started.md)**: install, set up with Vite, PostCSS or the Tailwind CLI, and load KERN's font.
- **[Utilities](docs/utilities.md)**: every colour, type role, spacing step, radius, shadow and breakpoint the theme adds or changes.
- **[Light, dark and sections](docs/theming.md)**: how the utilities follow KERN's themes, and what `dark:` matches.
- **[Tailwind components](docs/tailwind-components.md)**: shadcn/ui and other components with semantic colour names, and `remap.css` for markup that hard-codes Tailwind's palette.
- **[Limits](docs/limits.md)**: what the theme doesn't change, and the known issues with workarounds.

## What you get

| Utilities                                                                                  | From KERN                                                                                            |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `bg-primary`, `text-foreground`, `text-muted-foreground`, `border-input`, `outline-ring` … | Its contextual colour tokens, under the names shadcn/ui and most Tailwind component code use         |
| `bg-kern-<name>`, `text-kern-<name>` …                                                     | Every `--kern-color-<name>`: `bg-kern-feedback-info-background-contextual`, `text-kern-darkblue-700` |
| `text-kern-body`, `text-kern-heading-large` …                                              | Its type roles, each with size, line height and weight                                               |
| `p-kern-default`, `rounded-kern-default`, `shadow-kern-high`                               | Its spacing, radii and elevations                                                                    |
| `sm:` … `2xl:`                                                                             | Its grid breakpoints: 576, 768, 992, 1200 and 1600px                                                 |
| `dark:`                                                                                    | Its theme switch: the system preference, or `data-kern-theme`                                        |
| `font-sans`                                                                                | Fira Sans                                                                                            |

Every utility compiles to KERN's own custom property, for example `bg-primary` to `background-color: var(--kern-color-action-default-contextual)`. It follows KERN's light and dark themes and its surface levels wherever it's used.

## Compared with `@digitalservicebund/kern-ux-tailwind-theme`

DigitalService publishes a KERN theme for Tailwind v4 as well. Both map KERN's tokens with `@theme inline`; they differ in what happens to Tailwind:

- **Tailwind's defaults.** Their theme removes Tailwind's colours, font sizes, radii and shadows and sets the spacing step to 1px, so only KERN's names exist and `p-16` is 16px. This one keeps Tailwind's defaults, whose 4px spacing step is already KERN's grid (`p-4` is 16px), and adds KERN's names alongside.
- **Tailwind components.** Markup written for Tailwind, with `bg-indigo-600`, `rounded-md` or `p-4`, gets no colour, radius or KERN-sized spacing from their theme. Here it keeps working, and `remap.css` points its colours at KERN's.
- **Loading KERN.** You load KERN's stylesheet yourself with theirs; this one loads it for you, in a layer where utilities can override it.

Choose theirs for a KERN-only vocabulary, and this one to use Tailwind components with KERN.

## Versions

Tested with `@kern-ux/native` 2.8.2 and Tailwind CSS 4.1 to 4.3. KERN has renamed tokens between releases, so the peer range on `@kern-ux/native` stays within one minor version until the next is checked.

## License

[EUPL-1.2](LICENSE.md). KERN itself is published by the KERN team as `@kern-ux/native` under its own licence; this package doesn't include it.
