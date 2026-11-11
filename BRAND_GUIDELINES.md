# Afia Food Hub — Brand Guidelines

**Version:** 1.0 (Sprint 0 — direction & requirements established)
**Date:** 2026-11-11
**Status:** Approved direction. Logo, favicon and banner assets are produced in **Sprint 1**.
**Owner:** Afia Food Hub

---

## 1. Brand Foundation

### 1.1 Name and meaning

**AFIA FOOD HUB**

"**Afia**" is an Akan (Ga) name meaning *"born into prosperity"* — it evokes the Akan idea of a
child arriving with blessings. It is a name, not a generic descriptor, and it carries warmth,
family and good fortune. "**Food Hub**" communicates the function plainly: a centre where many
kitchens' dishes meet, and where food is collected and dispatched.

The full name therefore reads as a promise: *a prosperous meeting place for Ghanaian food.*

| Element | Decision |
|---|---|
| **Full name** | Afia Food Hub |
| **Wordmark** | `Afia` + `Food Hub` (two weights, one colour difference) |
| **Short form** | Afia (emblem only) |
| **Legal/footer** | `© {year} Afia Food Hub. All rights reserved. Made in Ghana.` |
| **Never used** | "Afia'sEat", "FoodGH", "Efia's Eat", "EfiaEat", "food-ordering-app" |

### 1.2 Positioning

> **Afia Food Hub is the Accra kitchen door that never closes.**
> Real Ghanaian food, cooked to order and brought to your table while it's still hot.

| Dimension | Positioning |
|---|---|
| **Who** | Accra residents and workers ordering lunch, dinner and weekend food — students, professionals, families. |
| **What** | Authentic Ghanaian dishes — jollof, banku and okra, fufu and light soup, waakye, kenkey — cooked fresh and delivered. |
| **Why us** | Real Ghanaian cooking, made properly, delivered fast and tracked honestly. |
| **How** | A warm, modern, trustworthy ordering experience that treats a bowl of soup as something worth care. |
| **Voice** | Warm, confident, plain-spoken Ghanaian hospitality. Never shouty, never corporate, never cute at the customer's expense. |

### 1.3 Personality

| Trait | How it shows up |
|---|---|
| **Modern & youthful** | Clean layout, generous whitespace, confident typography, mobile-first |
| **Warm & welcoming** | Warm neutral palette, soft radii, human photography, conversational microcopy |
| **Professional** | Consistent tokens, restrained motion, honest information, no invented claims |
| **Vibrant & appetising** | Warm clay red and gold accents, food photography that shows steam and texture |
| **Memorable** | A distinctive emblem used consistently at every size |
| **Customer-focused** | Total and delivery time always visible; no surprise charges |
| **Culturally relevant** | Ghanaian dishes, Ghanaian payment methods, Ghanaian locations — presented with pride, not as a novelty |

### 1.4 What the brand must never do

This is a **commercial Ghanaian food business**, not a template or a school project.

| Prohibited | Reason |
|---|---|
| Invented statistics ("500+ happy customers", "4.8 rating") | The brief forbids invented claims; the current site contains several |
| Invented discounts, prices, awards, delivery windows | Only business-approved facts may be published |
| Fake merchant numbers, bank accounts, phone numbers or addresses | The current checkout shows invented payment details — actively harmful |
| Stock imagery of a different cuisine | The food must be recognisably Ghanaian |
| Emoji as a substitute for real food photography | Placeholder-grade; the current menu uses emoji for every dish |
| Generic food-delivery iconography (a scooter, a cloche, a pizza slice) | Avoids stock-logo aesthetics |
| Aggressive urgency (fake countdowns, "ORDER NOW!!!") | Undermines the trust the brand is built on |

---

## 2. Logo System

### 2.1 The emblem — "The Afia Bowl"

A single, ownable glyph built from three elements that each carry meaning:

```
        ╭───────────╮
        │      ╱╲    │   ← the "A":  a bold, geometric A whose apex is a rising point
        │     ╱  ╲   │      (growth, prosperity, the letter of the name)
        │    ╱____╲  │   ← the crossbar doubles as the rim of a bowl
        │   ╰──────╯ │   ← the bowl: a shallow arc cradling the A (food, hospitality)
        ╰───────────╯
              ⌇          ← the steam: a single curved stroke rising from the apex
```

| Element | Meaning | Construction |
|---|---|---|
| **The A** | The initial of *Afia*; a rising point = growth and prosperity | Bold geometric sans `A`, optically centred, cut at a single angle |
| **The bowl** | Food, hospitality, a shared table | The A's crossbar extends into a shallow upward arc spanning the full width |
| **The steam** | Fresh, hot, just-cooked | One tapered S-curve rising from the apex, the only organic line in the mark |
| **The ring** | The *hub* — the point where many kitchens meet | A circular badge enclosing the A; also the container for the icon-only version |

**Design constraints**

- The emblem must be legible as a **filled silhouette** at 16 px. At that size the steam stroke
  merges into the bowl and the mark reads as an "A in a dish". Never more than three internal
  voids at favicon size.
- The mark must work at 24 px, 32 px, 48 px, 64 px, 180 px (apple touch) and at full footer width.
- Exactly **one** accent colour is used inside the emblem at most (gold on the steam, or gold on
  the bowl rim). Never a gradient inside the glyph.
- The emblem must not be redrawn, rotated, skewed, outlined, or given a drop shadow.

### 2.2 Required logo assets

All are produced in Sprint 1 as SVG (scalable, no raster artefacts), with PNG exports only where
a raster is required (favicon / app icons / social).

| # | Asset | File | Background | Notes |
|---|---|---|---|---|
| 1 | **Primary horizontal** | `brand/logo/afia-logo-horizontal.svg` | Light | Emblem + `Afia Food Hub` wordmark on one line. Default for the navbar and footer. |
| 2 | Primary horizontal — dark | `brand/logo/afia-logo-horizontal-dark.svg` | Dark | Wordmark in white, gold accent retained. For the dark footer. |
| 3 | Primary horizontal — monochrome | `brand/logo/afia-logo-horizontal-mono.svg` | Any | Single colour, currentColor-driven. For embossing, single-colour print, favicons in context. |
| 4 | **Secondary stacked** | `brand/logo/afia-logo-stacked.svg` | Light | Emblem above the wordmark, centred. For square placements, splash screens, receipts. |
| 5 | Secondary stacked — dark | `brand/logo/afia-logo-stacked-dark.svg` | Dark | For dark splash/loading screens. |
| 6 | Secondary stacked — monochrome | `brand/logo/afia-logo-stacked-mono.svg` | Any | Single colour. |
| 7 | **Icon-only** | `brand/logo/afia-icon.svg` | Light | Emblem in a rounded-square tile. App icon, loading screen, avatar fallback. |
| 8 | Icon-only — dark | `brand/logo/afia-icon-dark.svg` | Dark | Dark-surface variant. |
| 9 | Icon-only — monochrome | `brand/logo/afia-icon-mono.svg` | Any | Single colour, transparent background. |
| 10 | Wordmark only | `brand/logo/afia-wordmark.svg` | Light | `Afia Food Hub` with no emblem, for tight horizontal bars. |

### 2.3 Clearspace and minimum size

| Rule | Value |
|---|---|
| **Clearspace** | Minimum = the height of the steam stroke on all four sides |
| **Minimum horizontal width** | 120 px (digital) |
| **Minimum stacked height** | 96 px (digital) |
| **Minimum icon size** | 16 px (favicon) — at this size use the simplified silhouette, never the full-colour detail |
| **Do not** | Stretch, rotate, recolour, add effects, place on a busy photograph without a scrim, or redraw the "A" in a different typeface |

### 2.4 Logo application

| Placement | Variant |
|---|---|
| Navbar (desktop) | Primary horizontal, height 36 px |
| Navbar (mobile) | Icon-only, 32 px |
| Footer | Primary horizontal, dark variant, height 40 px |
| Order confirmation / receipt | Stacked, centred, height 72 px |
| Email header | Horizontal, height 32 px |
| Loading screen | Icon-only with the gold steam pulse |
| Browser tab | Favicon (see §4) |
| Social share preview | `brand/banners/social-cover-*.jpg` |

---

## 3. Colour System

### 3.1 Rationale

The palette is built for **food**, not for decoration:

- **Afia Clay** — a warm terracotta red drawn from Ghanaian clay cookware and shito pepper.
  Red is the fastest appetite cue in food branding and reads as heat and generosity.
- **Garden** — a deep green rooted in Ghana's green and in fresh produce. It carries trust,
  freshness and "real food", and balances the warmth of the primary.
- **Kola Gold** — the golden accent of Ghanaian kola nuts and sahito spice. Used sparingly for
  highlights, badges, prices and the steam in the emblem.
- **Bamboo** — warm-tinted neutrals instead of cold blue-greys. Neutral surfaces feel like
  kitchen paper and linen rather than software chrome, and they let food photography dominate.

> **Note on the legacy palette.** The current primary `#d97706` (amber) fails WCAG AA for white
> text at **3.19:1**. Every combination in the new palette has been validated programmatically;
> see §3.5.

### 3.2 Palette

#### Afia Clay — primary

| Token | Hex | Use |
|---|---|---|
| `clay-50` | `#FEF4F1` | Tinted surfaces, badge backgrounds |
| `clay-100` | `#FCE5DF` | Hover fill on tinted surfaces |
| `clay-200` | `#F8C9BE` | Dividers on tinted surfaces, chart series |
| `clay-300` | `#F2A493` | Decorative fills, disabled icon |
| `clay-400` | `#E37F69` | Decorative fills, large decorative only |
| `clay-500` | `#C4422B` | **Brand primary** — primary buttons, active states, logo emblem |
| `clay-600` | `#A8341F` | Hover on primary-500, links on white |
| `clay-700` | `#8A2B1A` | Text on tinted backgrounds, dark-mode accent |
| `clay-800` | `#702519` | Deep accent |
| `clay-900` | `#5C2117` | Deepest accent |

#### Garden — secondary

| Token | Hex | Use |
|---|---|---|
| `garden-50` | `#F0F7F1` | Success surfaces, "available" badges |
| `garden-100` | `#DDEDDF` | Success hover surfaces |
| `garden-200` | `#BBDCC1` | Chart series, dividers |
| `garden-300` | `#8EC39A` | Decorative fills |
| `garden-400` | `#5BA56E` | Decorative fills |
| `garden-500` | `#2F7A46` | Secondary buttons, available badges |
| `garden-600` | `#256139` | Hover, text on light |
| `garden-700` | `#1E4F30` | Success text on tinted backgrounds |
| `garden-800` | `#193F27` | Deep secondary |
| `garden-900` | `#143320` | Deepest secondary |

#### Kola Gold — accent

| Token | Hex | Use |
|---|---|---|
| `gold-50` | `#FEF9E9` | Warning surfaces, "featured" badges |
| `gold-100` | `#FDF0C6` | Warning hover surfaces |
| `gold-200` | `#FBE18C` | Chart series, decorative |
| `gold-300` | `#F8CE52` | Decorative fills, steam accent at large sizes |
| `gold-400` | `#F0B824` | Decorative fills on dark surfaces |
| `gold-500` | `#DE9710` | **Accent fill** — prices, rating stars, active nav underline |
| `gold-600` | `#B87606` | Accent text at ≥ 18 px bold |
| `gold-700` | `#96600A` | **Accent text** on light backgrounds (5.28:1) |
| `gold-800` | `#7A4D0B` | Deep accent |
| `gold-900` | `#64400D` | Deepest accent |

> ⚠️ **Gold is a fill, never a text colour on a light background.** `gold-500` with white text is
> 2.46:1 and fails AA. Use `gold-700` for accent text, or put dark `bamboo-900` text on a gold
> fill (6.42:1).

#### Bamboo — neutrals

| Token | Hex | Use |
|---|---|---|
| `bamboo-0` | `#FFFFFF` | Cards, surfaces, reverse text |
| `bamboo-50` | `#FAF8F5` | **Page background** |
| `bamboo-100` | `#F4F1EC` | Subtle fills, table headers, input backgrounds |
| `bamboo-200` | `#E8E3DB` | **Borders** |
| `bamboo-300` | `#D5CEC3` | Strong borders, disabled states |
| `bamboo-400` | `#B0A698` | Decorative, placeholder icons |
| `bamboo-500` | `#8A8073` | Decorative only — **not** body text (3.88:1) |
| `bamboo-600` | `#6B6257` | **Secondary text** (5.98:1) |
| `bamboo-700` | `#544D45` | Tertiary headings (8.32:1) |
| `bamboo-800` | `#3A352F` | Dark surfaces, headings on light |
| `bamboo-900` | `#26221E` | **Primary text**, dark footer, dark-mode background |

### 3.3 Semantic colours

| Role | Token | Hex | Surface | Text |
|---|---|---|---|---|
| **Success** | `garden-600` / `garden-700` | `#256139` / `#1E4F30` | `garden-50` `#F0F7F1` | `garden-700` |
| **Warning** | `gold-600` / `gold-700` | `#B87606` / `#96600A` | `gold-50` `#FEF9E9` | `gold-700` |
| **Error** | `clay-600` / `clay-700` | `#A8341F` / `#8A2B1A` | `clay-50` `#FEF4F1` | `clay-700` |
| **Info** | `garden-700` | `#1E4F30` | `garden-50` | `garden-700` |

> The error colour is the same family as the primary. That is intentional — it keeps the palette
> tight and avoids the "default bootstrap red" look. Distinguish them by **surface tint** and
> **iconography**, never by hue alone.

### 3.4 Backgrounds and surfaces

| Role | Token | Hex |
|---|---|---|
| Page background | `bamboo-50` | `#FAF8F5` |
| Card / raised surface | `bamboo-0` | `#FFFFFF` |
| Subtle surface | `bamboo-100` | `#F4F1EC` |
| Dark surface (footer, loading) | `bamboo-900` | `#26221E` |
| Primary text | `bamboo-900` | `#26221E` |
| Secondary text | `bamboo-600` | `#6B6257` |

### 3.5 Accessibility validation (WCAG 2.1 AA)

Every combination below was validated programmatically (relative luminance / contrast ratio).

| Combination | Ratio | Required | Result |
|---|---|---|---|
| White on `clay-500` (primary button) | 5.05 | 4.5 | ✅ AA |
| White on `clay-600` | 6.61 | 4.5 | ✅ AA |
| White on `clay-700` | 8.60 | 4.5 | ✅ AA |
| White on `garden-500` | 5.26 | 4.5 | ✅ AA |
| White on `garden-600` | 7.37 | 4.5 | ✅ AA |
| White on `bamboo-900` | 15.79 | 4.5 | ✅ AAA |
| `bamboo-900` on `gold-500` | 6.42 | 4.5 | ✅ AA |
| `bamboo-900` on white | 15.79 | 4.5 | ✅ AAA |
| `bamboo-600` on white (secondary text) | 5.98 | 4.5 | ✅ AA |
| `bamboo-600` on `bamboo-50` | 5.64 | 4.5 | ✅ AA |
| `clay-600` on white (links) | 6.61 | 4.5 | ✅ AA |
| `clay-700` on `bamboo-50` | 8.12 | 4.5 | ✅ AAA |
| `garden-700` on white | 9.48 | 4.5 | ✅ AAA |
| `gold-700` on white (accent text) | 5.28 | 4.5 | ✅ AA |
| `clay-700` on `clay-50` (error) | 7.96 | 4.5 | ✅ AAA |
| `garden-700` on `garden-50` (success) | 8.70 | 4.5 | ✅ AAA |
| `gold-700` on `gold-50` (warning) | 5.02 | 4.5 | ✅ AA |
| White on `bamboo-900` (footer) | 15.79 | 4.5 | ✅ AAA |
| `bamboo-300` on `bamboo-900` (footer body) | 10.11 | 4.5 | ✅ AAA |
| `gold-400` on `bamboo-900` (footer accent) | 8.71 | 4.5 | ✅ AAA |

**Known non-compliant usages, to be avoided by rule:** `bamboo-500` as body text (3.88:1),
`gold-500` with white text (2.46:1), `gold-600` with white text (3.73:1),
`bamboo-300` as a border on white (1.56:1 — decorative only; use `bamboo-200`).

Focus indicators use a 2 px `clay-500` ring with a 2 px `bamboo-0` offset — 5.05:1 against
white, comfortably above the 3:1 non-text requirement.

### 3.6 Chart colours (admin dashboards)

In order: `clay-500` `#C4422B` · `garden-600` `#256139` · `gold-500` `#DE9710` ·
`garden-400` `#5BA56E` · `clay-300` `#F2A493` · `bamboo-400` `#B0A698`.
Never use the same colour twice in one chart; never rely on colour alone — always pair with a
label or icon.

### 3.7 Implementation

The tokens are consumed as **CSS custom properties** in `frontend/src/index.css` and mirrored
into the Tailwind `theme.extend.colors` map, so both `bg-primary-500` (existing class usage)
and `var(--afia-primary-500)` remain valid during the transition.

```css
:root {
  --afia-clay-50:#FEF4F1;  /* … through --afia-clay-900 */
  --afia-garden-50:#F0F7F1; /* … */
  --afia-gold-50:#FEF9E9;  /* … */
  --afia-bamboo-0:#FFFFFF; /* … */
  --afia-primary:  var(--afia-clay-500);
  --afia-secondary:var(--afia-garden-600);
  --afia-accent:   var(--afia-gold-500);
  --afia-bg:       var(--afia-bamboo-50);
  --afia-surface:  var(--afia-bamboo-0);
  --afia-text:     var(--afia-bamboo-900);
  --afia-text-muted: var(--afia-bamboo-600);
}
```

---

## 4. Typography

### 4.1 Type system

Two families, each with a defined role. Both are served from Google Fonts with full Latin
coverage (including Ghanaian English usage) and are free for commercial use.

| Role | Family | Weights | Usage |
|---|---|---|---|
| **Display / headings** | **Fraunces** | 600, 700, 900 (variable, `SOFT` axis for warmth) | Logo wordmark, hero headline, page titles, section headings, prices in the brand moments |
| **Body / UI** | **Inter** | 400, 500, 600, 700 | Body copy, navigation, buttons, forms, tables, help text |

**Why Fraunces for display.** A warm, characterful serif signals "real food, made by hand"
rather than "software template". It differentiates Afia Food Hub from the ubiquitous
geometric-sans food-delivery look, and its slightly softened terminals echo the steam curve in
the emblem. It is used **only** at display sizes — never below 20 px, never for form input,
never for long paragraphs.

**Why Inter for body.** Excellent legibility at small sizes on low-end Android devices (the
Ghanaian mobile reality), a large weight range, and tabular numerals for prices.

### 4.2 Type scale

| Token | Size / line-height | Weight | Family | Use |
|---|---|---|---|---|
| `display-xl` | 56 / 60 px | 900 | Fraunces | Hero headline (desktop) |
| `display-lg` | 42 / 48 px | 900 | Fraunces | Hero headline (mobile), major section |
| `display-md` | 32 / 40 px | 700 | Fraunces | Page title, admin section |
| `display-sm` | 24 / 32 px | 700 | Fraunces | Card/section heading |
| `title` | 20 / 28 px | 600 | Inter | Sub-section, modal title |
| `body-lg` | 17 / 26 px | 400 | Inter | Lead paragraph, menu description |
| `body` | 15 / 24 px | 400 | Inter | Default body |
| `body-sm` | 13.5 / 20 px | 400 | Inter | Secondary text, helper text |
| `label` | 13 / 18 px | 600 | Inter | Form labels, nav links, button labels |
| `caption` | 12 / 16 px | 500 | Inter | Meta, timestamps, badges |

### 4.3 Rules

- **Prices** use Inter with `font-variant-numeric: tabular-nums` so columns align and totals do
  not jitter. Currency is always rendered `GH₵ 45.00` — the cedi sign `₵` (U+20B5), never "GHS"
  and never "GH¢".
- **Uppercase** is used only for small labels, badges and eyebrow text, with
  `letter-spacing: 0.06em`. Never for headings or buttons.
- **Maximum measure** — 68 characters per line for body copy; 24 characters for hero headlines.
- **No** text below 12 px. **No** thin weights (300/400) on coloured backgrounds.
- All type is fluid via `clamp()` on the two display sizes; the scale below 20 px is fixed.

---

## 5. Icons, Favicon and App Icons

All icon assets derive from the same emblem geometry. The 16 px and 32 px favicons are **not**
scaled-down versions of the full logo — they use the simplified silhouette (solid rounded tile,
single-colour bowl-arc "A", no steam detail) so they stay legible.

| Asset | Size | File | Format | Notes |
|---|---|---|---|---|
| SVG favicon | scalable | `brand/icons/favicon.svg` | SVG | `currentColor`-driven, scales to any size in modern browsers |
| Favicon | 16×16 | `brand/icons/favicon-16x16.png` | PNG | Simplified silhouette, `clay-500` on transparent |
| Favicon | 32×32 | `brand/icons/favicon-32x32.png` | PNG | Simplified silhouette, `clay-500` on transparent |
| Favicon | 180×180 | `brand/icons/apple-touch-icon.png` | PNG | Rounded tile, `clay-500` background, white/gold emblem, **no transparency** (iOS does not support it) |
| App icon | 192×192 | `brand/icons/icon-192.png` | PNG | PWA standard icon |
| App icon | 512×512 | `brand/icons/icon-512.png` | PNG | PWA standard icon |
| Maskable icon | 512×512 | `brand/icons/icon-maskable-512.png` | PNG | Emblem inside the 80 % safe zone, `clay-500` bleed background |
| Favicon (ICO) | 16/32/48 | `brand/icons/favicon.ico` | ICO | Multi-resolution, referenced first in the HTML |

### 5.1 HTML metadata (Sprint 1)

```html
<link rel="icon" type="image/svg+xml" href="/brand/icons/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/brand/icons/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/brand/icons/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/brand/icons/apple-touch-icon.png" />
<link rel="manifest" href="/brand/manifest.webmanifest" />
<meta name="theme-color" content="#C4422B" />
```

`theme-color` moves from the legacy `#d97706` to `clay-500` `#C4422B`.

---

## 6. Photography and Imagery

### 6.1 Principles

1. **Real Ghanaian food, shot properly.** Steam, texture, gloss, char. Overhead or 45°.
2. **Natural light** — window light or a warm practical, never flat on-camera flash.
3. **Warm, appetising colour grade** consistent across the whole library so the menu reads as one
   collection.
4. **Visible portions.** Dishes are photographed in the portion actually served.
5. **No stock images of other cuisines.** No pizza, no sushi, no generic pasta.
6. **No models with implausible food.** Ghanaian customers, Ghanaian settings.
7. **Always licensed.** Use Unsplash/Pexels under their commercial licences, or commissioned
   photography. Record the source and licence for every asset in the manifest (§8).

### 6.2 Required photography set

| Shot | Aspect | Used in |
|---|---|---|
| Hero — a signature Ghanaian dish, steam visible, warm surface | 16:9 / 21:9 | Homepage hero |
| Dish photography — one per menu item | 4:3 | Menu cards, order summary |
| Category photography — one per category | 1:1 | Category tiles, promo banners |
| Preparation — hands cooking, mortar & pestle, pot on fire | 3:2 | About strip, promotional banner |
| Delivery — rider handing over food at a door | 3:2 | Delivery promo, social cover |
| Interior ambience — the kitchen pass / counter | 16:9 | About, footer |
| Founder/chef portrait | 1:1 | About, footer, social |

### 6.3 Image treatment

| Element | Specification |
|---|---|
| Card image ratio | 4:3, `object-fit: cover` |
| Corner radius | 16 px (matches `--radius-card`) |
| Overlay | Bottom-up gradient `rgba(38,34,30,0.72)` → transparent for text on images |
| Hover | Scale to 1.04 over 400 ms, `ease-out` |
| Placeholder | Brand-tinted `clay-50` block with the icon-only emblem at 40 % opacity — **never a grey box, never an emoji** |
| Lazy loading | `loading="lazy"` below the fold; `fetchpriority="high"` on the hero |
| Responsive `srcset` | 400 / 800 / 1200 px widths, WebP with JPEG fallback |
| Alt text | The dish name and its main ingredient — `"Waakye with stew and shito, served with boiled egg"` |

---

## 7. Banner and Promotional Graphics

### 7.1 Homepage hero

- **Purpose:** Communicate the Afia Food Hub identity immediately and drive the customer to the menu.
- **Composition:** Left-aligned text block over a darkened food photograph, or a split layout
  (photo right / content left). The emblem and headline sit over a `clay-900`→transparent scrim
  so white text always meets ≥ 4.5:1.
- **Headline:** a value proposition, never a fabricated claim.
  _"Real Ghanaian food, cooked to order and delivered hot."_ (final copy set in Sprint 1)
- **Sub-headline:** one line, factual.
- **Primary CTA:** "Order Now" → `/menu`. **Secondary CTA:** "See today's menu" → `/menu`.
- **Trust strip:** real, verifiable facts only — payment methods accepted, delivery areas,
  operating hours. **No customer counts, no star ratings, unless a real ratings system is fed
  by real reviews.**
- **Spec:** 1600×900 (desktop), 1200×1200 (tablet), 800×1200 (mobile). Three crops, one source.

### 7.2 Promotional banner

Used between menu sections and above the footer. Composition: photographic background at 35 %
scrim, gold eyebrow label, one clear offer **that exists in the `promos` table**, one CTA.
If there is no active promo, the banner promotes the service instead — never an invented
discount.

### 7.3 Category banner

One per menu category (Banku & Soups, Rice Dishes, Local Favourites, Drinks, Sides & Extras).
Square (1:1) or 3:2, food-specific, labelled with the category name in Fraunces.

### 7.4 Social cover

1200×630 (Open Graph / Twitter). Layout: emblem + `AFIA FOOD HUB` wordmark, a tagline, and a
rich food photograph occupying the right 55 %. Safe area: keep all text within the central
80 % because social platforms crop differently.

### 7.5 Brand graphic set

| Graphic | Size | Purpose |
|---|---|---|
| `hero-home` | 1600×900, 800×1200, 1200×1200 | Homepage hero |
| `promo-delivery` | 1600×600 | Delivery-focused promotional banner |
| `promo-mobile-money` | 1600×600 | Payment-methods banner |
| `category-banku`, `category-rice`, `category-local`, `category-drinks`, `category-sides` | 800×800 | Category tiles |
| `social-cover` | 1200×630 | Open Graph / Twitter / LinkedIn |
| `social-avatar` | 400×400 | Social profile picture (emblem only) |
| `about-kitchen` | 1200×800 | About / story section |
| `empty-state` | 400×400 | Empty cart / no orders illustration |

---

## 8. Brand Asset Manifest

All assets live under `frontend/public/brand/`. SVG is the source of truth; PNG/JPG are derived
exports.

```
frontend/public/brand/
├── README.md                     # this manifest: purpose, licence, source, usage
├── logo/
│   ├── afia-logo-horizontal.svg        # 1  primary, light background
│   ├── afia-logo-horizontal-dark.svg   # 2  primary, dark background
│   ├── afia-logo-horizontal-mono.svg   # 3  primary, monochrome (currentColor)
│   ├── afia-logo-stacked.svg           # 4  secondary, light background
│   ├── afia-logo-stacked-dark.svg      # 5  secondary, dark background
│   ├── afia-logo-stacked-mono.svg      # 6  secondary, monochrome
│   ├── afia-icon.svg                   # 7  icon-only, light background
│   ├── afia-icon-dark.svg              # 8  icon-only, dark background
│   ├── afia-icon-mono.svg              # 9  icon-only, monochrome
│   └── afia-wordmark.svg               # 10 wordmark only
├── icons/
│   ├── favicon.svg                     # scalable SVG favicon
│   ├── favicon.ico                     # 16/32/48 multi-resolution
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png            # 180×180, opaque
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
├── banners/
│   ├── hero-home-1600x900.jpg
│   ├── hero-home-1200x1200.jpg
│   ├── hero-home-800x1200.jpg
│   ├── promo-delivery-1600x600.jpg
│   ├── promo-mobile-money-1600x600.jpg
│   ├── category-banku-800x800.jpg
│   ├── category-rice-800x800.jpg
│   ├── category-local-800x800.jpg
│   ├── category-drinks-800x800.jpg
│   ├── category-sides-800x800.jpg
│   ├── about-kitchen-1200x800.jpg
│   ├── social-cover-1200x630.jpg
│   ├── social-avatar-400x400.jpg
│   └── empty-state-400x400.svg
├── food/                              # per-dish photography, keyed by menu slug
│   └── <slug>.jpg
└── manifest.webmanifest               # PWA manifest (icons, theme colour, name)
```

**Per-asset manifest entry** (recorded in `brand/README.md`):

| Field | Example |
|---|---|
| File | `logo/afia-logo-horizontal.svg` |
| Purpose | Navbar, email header |
| Type | Vector logo |
| Background | Light |
| Colours | `clay-500`, `bamboo-900`, `gold-500` |
| Minimum size | 120 px wide |
| Source | Original — created for Afia Food Hub |
| Licence | © Afia Food Hub |

---

## 9. Brand Application Across the Product

| Surface | Application |
|---|---|
| **Homepage** | New hero with the emblem, real photography, trust strip from real facts |
| **Navbar** | Horizontal logo (icon-only under 640 px), `bamboo-900` wordmark, `clay-500` active state, gold underline on hover |
| **Footer** | Dark `bamboo-900`, dark logo variant, real contact details, `clay-300` links, gold social icons |
| **Customer dashboard** | `bamboo-50` page background, white cards, `clay-500` primary actions |
| **Admin dashboard** | Same tokens, denser layout, `garden-500` for positive deltas, `clay-500` for negative |
| **Login / register** | Branded split layout with a food photograph; the demo-credentials block is **removed** (P0-07) |
| **Checkout** | Clear steps, server-authoritative totals, real payment options only |
| **Order confirmation** | Stacked logo, order reference, delivery estimate, tracking CTA |
| **Receipts** | Stacked logo, line items, server totals, payment status |
| **Emails** | Horizontal logo, clay-600 headings, bamboo-600 body, gold CTA button, clay footer |
| **Notifications** | Same tokens; toasts use `bamboo-0` with `garden-600` / `clay-600` / `gold-700` accents |
| **Loading screens** | Icon-only emblem with a slow gold steam pulse; never a blank white screen |
| **Error pages** | 404 / 500 / offline states with the emblem, a plain-language explanation, a way forward |
| **Browser title** | `Afia Food Hub — Ghanaian Food Delivered Hot` |
| **Meta description** | `Order jollof, banku and okra, fufu and light soup, waakye and more — authentic Ghanaian food cooked to order and delivered across Accra.` |
| **Social metadata** | Open Graph + Twitter cards using `social-cover-1200x630.jpg` |
| **Chatbot** | Branded header, Fraunces heading, Inter body, no invented claims; answers grounded in live menu data |

### 9.1 Reusable brand component system

Sprint 1 introduces a `components/brand/` module so the identity is applied through components,
not copy-pasted:

| Component | Purpose |
|---|---|
| `<BrandLogo variant="horizontal\|stacked\|icon" theme="light\|dark\|mono" />` | One component for all 10 logo assets |
| `<BrandMark size={24\|32\|40\|64} />` | Inline emblem |
| `<BrandButton variant="primary\|secondary\|ghost\|danger" />` | Token-aware buttons |
| `<BrandCard>` | Surface + border + radius + shadow |
| `<BrandBadge tone="success\|warning\|error\|accent" />` | Semantic chips |
| `<BrandPrice amount={45} />` | `GH₵ 45.00` with tabular numerals |
| `<BrandEmptyState />` | Illustrated empty states |
| `<BrandErrorState />` | Error/404/offline |
| `<BrandLoader />` | Emblem + steam pulse loading screen |
| `<PageMeta title description />` | Sets `<title>`, meta description and OG tags per route |

---

## 10. Voice and Microcopy

| Principle | Example |
|---|---|
| **Plain and warm** | "Your order is on its way." not "ORDER DISPATCHED 🚀" |
| **State facts, do not inflate** | "Delivers in 30–45 minutes across Accra" — only if true |
| **Name the dish properly** | "Banku with Okra Soup", "Fufu with Light Soup", "Waakye and Stew" |
| **Prices are explicit** | "GH₵ 45.00" everywhere, including the cart |
| **Explain, don't blame** | "We couldn't apply that code — it may have expired." not "INVALID PROMO" |
| **Never invent** | If a fact is unknown, say "We'll confirm by phone" rather than guessing |
| **Respect the customer** | No exclamation marks in error states; no urgency theatre |

### 10.1 Terminology

| Use | Avoid |
|---|---|
| Mobile Money (MoMo) | "Momo" alone in formal copy |
| AirtelTigo Money | "AirtelTigo" (dropping "Money") |
| Telecel Cash | "Vodafone Cash" — **the operator is now Telecel**; the current site is out of date |
| Cash on Delivery | "COD", "Cash on delivery" lowercase in prose |
| Order number | "Order ID", "Ref" |
| Delivery fee | "Delivery charge", "Shipping" |

> **Operator naming note.** The current site lists *Vodafone Cash*. In Ghana, Vodafone Ghana was
> rebranded **Telecel** in 2023. The payment provider's canonical list is authoritative — the
> menu option should read "Telecel Cash" with the underlying payment channel still being
> Vodafone, and the exact label confirmed against the provider's API during Sprint 5.

---

## 11. Open Items Requiring Owner Input

| # | Item | Blocks | Needed by |
|---|---|---|---|
| 1 | **Confirmed business details** — legal name, physical address, support phone, support email, operating hours, delivery zones and fees | All copy, footer, checkout, chatbot, `schema.org` markup | Sprint 1 |
| 2 | **Licensed photography** — commission, or approve specific Unsplash/Pexels images | Hero, banners, menu cards | Sprint 1 |
| 3 | **Real menu data** — the dish list, descriptions, prices, categories and availability, with images | Menu pages, chatbot answers, seed data | Sprint 1 / 4 |
| 4 | **Promo policy** — whether launch promos exist, and their exact codes and values | Promotional banners, cart messaging | Sprint 1 |
| 5 | **Payment provider account** — Paystack or Hubtel, plus the merchant display name shown in mobile-money prompts | Payment labels, checkout | Sprint 5 |
| 6 | **Social handles** — Instagram, X, TikTok, Facebook URLs | Footer, social banner, schema markup | Sprint 1 |
| 7 | **Domain choice** — `afiafoodhub.com` / `.com.gh`, and the matching Vercel project name | Favicon, OG tags, emails, deployment | Sprint 2 |

---

## 12. Sprint 1 Asset Acceptance Criteria

Sprint 1 is complete when **all** of the following are true and demonstrable:

- [ ] All 10 logo assets exist as SVG and render correctly on light, dark and monochrome
      backgrounds, at minimum size, and in the navbar, footer and email header.
- [ ] The emblem is recognisable at 16 px and at 24 px without loss of meaning.
- [ ] All 8 icon assets exist and are correctly referenced in `frontend/public/index.html`,
      including an SVG favicon and a 180×180 apple-touch icon.
- [ ] `theme-color` is `clay-500`; the PWA manifest lists all icons; the title and meta
      description name Afia Food Hub.
- [ ] The homepage hero renders on mobile, tablet and desktop with legible text over the photo
      and a working primary CTA.
- [ ] At least one promotional banner and the category banners exist and are used.
- [ ] The social cover renders correctly in an Open Graph preview.
- [ ] The colour tokens are applied in the running application and every text/background
      combination meets WCAG 2.1 AA (validated programmatically).
- [ ] Both font families load, with the intended fallback if Google Fonts is unavailable.
- [ ] The entire customer-facing UI contains no occurrence of "FoodGH", "Efia'sEat",
      "Efia's Eat" or "EfiaEat".
- [ ] The emoji placeholders and the fabricated "500+ customers" / "4.8 rating" claims are gone.
