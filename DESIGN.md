---
version: alpha
name: Salon Amira
description: Stripe elegance × Rose warmth — beauty salon booking in Alger Centre.
colors:
  primary: "#533afd"
  secondary: "#c44569"
  tertiary: "#15be53"
  neutral: "#f8fafd"
  ink: "#0a1628"
  muted: "#94a3b8"
  border: "#e5edf5"
typography:
  h1:
    fontFamily: Source Sans 3
    fontSize: 2.5rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.04em"
  h2:
    fontFamily: Source Sans 3
    fontSize: 1.75rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body-lg:
    fontFamily: Source Sans 3
    fontSize: 1.125rem
    fontWeight: 300
    lineHeight: 1.6
  body-md:
    fontFamily: Source Sans 3
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Source Sans 3
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  pill: 9999px
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 48px
shadows:
  card: "rgba(23,23,23,0.08) 0px 15px 35px 0px"
  deep: "rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px"
  hover: "rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px, 0 0 0 1px #b9b9f9"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 12px 28px
  button-primary-hover:
    backgroundColor: "#4434d4"
    textColor: "#FFFFFF"
  button-rose:
    backgroundColor: "{colors.secondary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 12px 28px
  card-service:
    backgroundColor: "#FFFFFF"
    rounded: "{rounded.lg}"
    padding: 24px
  nav-glass:
    backgroundColor: "rgba(255,255,255,0.88)"
    rounded: "{rounded.sm}"
---

## Overview

Salon Amira is a beauty salon in Alger Centre offering 7 services (hair, skincare,
makeup, nails, hair removal). The booking system uses a **Stripe-elegance palette**
anchored on deep purple (`#533afd`) as primary accent and dusty rose (`#c44569`)
as warmth. Typography is Source Sans 3 at weight 300 for a light, premium feel.

The design language blends: Stripe's blue-tinted multi-layer shadows, Notion's
warm minimalism, and rose warmth for a feminine-but-professional beauty brand.

## Colors

- **Primary (#533afd):** Rich indigo-purple. The sole driver for high-emphasis
  actions: primary buttons, active tabs, accent rings, logo gradient.
- **Secondary (#c44569):** Dusty rose. Used for warmth accents, rose-tinted
  backgrounds (`--rose-light: #fdf2f5`), and secondary emphasis.
- **Tertiary (#15be53):** Success green for confirmed states, availability indicators.
- **Ink (#0a1628):** Deep navy for primary text — softer than pure black.
- **Neutral (#f8fafd):** Warm off-white for section backgrounds.
- **Muted (#94a3b8):** Secondary text and metadata.
- **Border (#e5edf5):** Whisper borders — barely visible separators.

### Semantic Aliases

| Variable | Maps To | Usage |
|----------|---------|-------|
| `--accent` | `--purple` | Primary interactive elements |
| `--text` | `--navy` | Body and heading text |
| `--text-secondary` | `--slate` | Supporting text |
| `--surface` | `--white` | Card and page backgrounds |
| `--surface-warm` | `#f8fafd` | Section backgrounds |

## Typography

**Source Sans 3** is the primary typeface (loaded from Google Fonts). It carries
Stripe's open, approachable character with excellent Arabic-script compatibility
(French + Algerian audience).

- **Weight 300** for body — the signature Stripe lightness
- **Weight 400** for interactive text and metadata
- **Weight 600** for headings — crisp without being heavy
- **Weight 700** for emphasis within data (prices, status badges)
- Letter-spacing: `-0.04em` on h1 for tight headlines, `-0.02em` on h2

Fallback stack: `'Source Sans 3', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

## Layout & Spacing

- Page max-width: 1100px centered
- Section padding: 48px vertical
- Card gaps: 24px in service grids, 16px in dense dashboards
- Nav: sticky top, glassmorphism (backdrop-blur 16px, bg 88% opacity)

## Elevation & Depth

Three shadow layers borrowed from Stripe's signature style:

1. **card** — ambient soft shadow for cards and modals
2. **deep** — multi-layer blue-tinted shadow for elevated surfaces (dropdowns, tooltips)
3. **hover** — deep shadow + accent ring for interactive card hover states

The blue tint (`rgba(50,50,93,0.25)`) is the Stripe signature — it reads as
premium rather than gray because blue is perceived as cooler/more refined.

## Shapes

- Cards: `border-radius: 12px` (lg)
- Buttons: `border-radius: 8px` (md)
- Tags/pills: `border-radius: 9999px` (pill) for status badges
- Inputs: `border-radius: 4px` (sm)
- Service icons: `border-radius: 50%` circles with gradient backgrounds

## Components

`button-primary` is the only high-emphasis action. Purple background, white text,
8px radius. On hover, shifts to darker purple (`#4434d4`) with accent ring glow.

`card-service` holds service listings in the grid. White surface, 12px radius,
24px padding, with the card shadow. Service icon is a 48px circle with a gradient
background.

`nav-glass` is the top navigation bar: 88% white with backdrop-blur 16px and
saturate 180% for the frosted-glass effect. Bottom border: 1px whisper border.

`topnav-tabs` are pill-style segmented controls inside a warm-surface background.
Active tab gets white background + deep shadow. Inactive: transparent with muted text.

## Do's and Don'ts

- **Do** use purple (`#533afd`) only for primary CTAs — never for decoration
- **Do** use rose (`#c44569`) sparingly for warmth accents and secondary actions
- **Do** use whisper borders (`#e5edf5`) instead of heavy separators
- **Do** apply Stripe-style blue-tinted shadows, not generic gray box-shadows
- **Do** keep body text at weight 300 for the premium Stripe feel
- **Don't** use pure black text — always `#0a1628` (navy)
- **Don't** add borders to cards — shadows handle elevation
- **Don't** mix purple and rose in the same component — they're separate semantic roles
- **Don't** use emoji as primary icons for professional screens (landing page only)
- **Don't** add decorative gradients to non-hero sections
