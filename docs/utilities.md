# Utilities

Everything the theme adds to Tailwind, or changes in it. Every value is a KERN custom property, so each utility follows KERN's themes; see [Light, dark and sections](theming.md).

## Semantic colours

The names shadcn/ui and most Tailwind component code use, on KERN's contextual tokens. Use them with any colour utility: `bg-`, `text-`, `border-`, `outline-`, `ring-` and so on, with opacity modifiers such as `bg-primary/50`.

| Name                                                                                               | KERN token (`--kern-color-…`)          |
| -------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `background`, `card`, `popover`                                                                    | `layout-background-default-contextual` |
| `foreground`, `card-foreground`, `popover-foreground`, `secondary-foreground`, `accent-foreground` | `layout-text-default-contextual`       |
| `primary`                                                                                          | `action-default-contextual`            |
| `primary-foreground`                                                                               | `action-on-default-contextual`         |
| `secondary`, `muted`, `accent`                                                                     | `layout-layer-surface-contextual`      |
| `muted-foreground`                                                                                 | `layout-text-muted-contextual`         |
| `destructive`                                                                                      | `feedback-danger-contextual`           |
| `border`                                                                                           | `decorative-border-contextual`         |
| `input`                                                                                            | `form-input-border-contextual`         |
| `ring`                                                                                             | `action-focus-default-contextual`      |

## Every KERN colour

Each KERN colour token `--kern-color-<name>` is the Tailwind colour `kern-<name>`:

| KERN token                                         | Utility                                       |
| -------------------------------------------------- | --------------------------------------------- |
| `--kern-color-feedback-info-background-contextual` | `bg-kern-feedback-info-background-contextual` |
| `--kern-color-feedback-success-contextual`         | `border-kern-feedback-success-contextual`     |
| `--kern-color-action-visited`                      | `text-kern-action-visited`                    |
| `--kern-color-darkblue-700`                        | `text-kern-darkblue-700`                      |
| `--kern-color-brand-colorpalette-1-500`            | `bg-kern-brand-colorpalette-1-500`            |

That's 330 colours: KERN's semantic tokens, their `-contextual` variants, its eleven palettes of 20 steps (`darkblue`, `lightblue`, `turquois`, `green`, `limette`, `yellow`, `orange`, `red`, `violet`, `grey`, `neutral`), `white`, `black` and its two brand palettes. KERN spells its turquoise palette `turquois`, and so do the utilities.

Prefer the `-contextual` tokens and the semantic names above for anything that sits on a surface: they adapt to the surface level as well as to light and dark. KERN's own components use them.

KERN's palette steps are calibrated by contrast on white: every `-400` is 3:1, every `-500` 4.5:1, every `-600` 6:1 and every `-700` 8.5:1, whatever the hue.

## Type roles

Each sets font size, line height and weight together, as KERN's type classes do. Override one with Tailwind's own utilities, for example `text-kern-body font-semibold`.

| Utility                     | Size / line height | Weight | From 768px |
| --------------------------- | ------------------ | ------ | ---------- |
| `text-kern-body-small`      | 16 / 24px          | 400    |            |
| `text-kern-body`            | 18 / 24px          | 400    |            |
| `text-kern-body-large`      | 21 / 32px          | 400    |            |
| `text-kern-label`           | 18 / 24px          | 600    |            |
| `text-kern-heading-small`   | 18 / 24px          | 600    |            |
| `text-kern-heading-medium`  | 21 / 24px          | 600    | 24 / 32px  |
| `text-kern-heading-large`   | 26 / 32px          | 600    | 32 / 40px  |
| `text-kern-heading-x-large` | 32 / 40px          | 500    | 48 / 56px  |
| `text-kern-heading-display` | 48 / 56px          | 500    | 72 / 80px  |

Tailwind's own sizes (`text-sm`, `text-base` …) stay as they are. KERN's smallest body text is 16px, so `text-sm` and `text-xs` are smaller than anything KERN uses.

## Fonts

| Utility                   | Font                                                         |
| ------------------------- | ------------------------------------------------------------ |
| `font-sans` (the default) | Fira Sans, KERN's font                                       |
| `font-mono`               | Fira Mono, if you load it; `@kern-ux/native` doesn't ship it |

## Spacing

Tailwind's spacing step is 4px, which is KERN's grid, so its numeric scale already matches KERN: `p-4` is KERN's `space-default`. The named steps read KERN's tokens and work with every spacing utility (`p-`, `m-`, `gap-`, `space-x-` …):

| Utility           | KERN token                     | Value | Tailwind's equivalent |
| ----------------- | ------------------------------ | ----- | --------------------- |
| `p-kern-2x-small` | `--kern-metric-space-2x-small` | 2px   | `p-0.5`               |
| `p-kern-x-small`  | `--kern-metric-space-x-small`  | 4px   | `p-1`                 |
| `p-kern-small`    | `--kern-metric-space-small`    | 8px   | `p-2`                 |
| `p-kern-default`  | `--kern-metric-space-default`  | 16px  | `p-4`                 |
| `p-kern-large`    | `--kern-metric-space-large`    | 24px  | `p-6`                 |
| `p-kern-x-large`  | `--kern-metric-space-x-large`  | 32px  | `p-8`                 |
| `p-kern-2x-large` | `--kern-metric-space-2x-large` | 40px  | `p-10`                |
| `p-kern-3x-large` | `--kern-metric-space-3x-large` | 48px  | `p-12`                |
| `p-kern-4x-large` | `--kern-metric-space-4x-large` | 56px  | `p-14`                |
| `p-kern-5x-large` | `--kern-metric-space-5x-large` | 64px  | `p-16`                |

## Radii and shadows

| Utility                | KERN token                            | Value |
| ---------------------- | ------------------------------------- | ----- |
| `rounded-kern-small`   | `--kern-metric-border-radius-small`   | 2px   |
| `rounded-kern-default` | `--kern-metric-border-radius-default` | 4px   |
| `rounded-kern-large`   | `--kern-metric-border-radius-large`   | 8px   |
| `shadow-kern-low`      | `--kern-shadow-elevation-low`         |       |
| `shadow-kern-default`  | `--kern-shadow-elevation-default`     |       |
| `shadow-kern-high`     | `--kern-shadow-elevation-high`        |       |

KERN's shadows set their own colour, so Tailwind's shadow colour utilities (`shadow-red-500`) don't apply to them.

## Breakpoints

The theme replaces Tailwind's breakpoints with the ones KERN's grid uses, so `md:` switches where `kern-col-md-*` does:

| Variant | KERN   | Tailwind's default |
| ------- | ------ | ------------------ |
| `sm:`   | 576px  | 640px              |
| `md:`   | 768px  | 768px              |
| `lg:`   | 992px  | 1024px             |
| `xl:`   | 1200px | 1280px             |
| `2xl:`  | 1600px | 1536px             |

## `dark:`

`dark:` matches where KERN's dark theme applies. See [Light, dark and sections](theming.md#the-dark-variant).

## With `remap.css`

`remap.css` also changes Tailwind's default palette, radii and shadows; see [Tailwind components](tailwind-components.md#palette-classes).
