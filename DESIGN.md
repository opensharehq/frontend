---
name: OpenShare
description: Open source contribution value network with data, outreach, and rewards.
colors:
  slate-night: "#0F172A"
  slate-panel: "#1E293B"
  slate-panel-strong: "#334155"
  slate-border: "#475569"
  slate-text: "#E2E8F0"
  slate-muted: "#64748B"
  protocol-green: "#22C55E"
  protocol-green-deep: "#16A34A"
  graph-blue: "#3B82F6"
  signal-amber: "#F59E0B"
  risk-red: "#EF4444"
  light-fog: "#F7FAF8"
  light-ink: "#17231B"
  light-panel: "#FFFFFF"
  light-border: "#C9D8CF"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 650
    lineHeight: 1.04
    letterSpacing: "0"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "0"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  section-sm: "56px"
  section-lg: "96px"
components:
  button-primary:
    backgroundColor: "{colors.protocol-green}"
    textColor: "{colors.slate-night}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.slate-panel-strong}"
    textColor: "{colors.slate-text}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  input-default:
    backgroundColor: "{colors.slate-panel}"
    textColor: "{colors.slate-text}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    height: "44px"
  card-default:
    backgroundColor: "{colors.slate-panel}"
    textColor: "{colors.slate-text}"
    rounded: "{rounded.xl}"
    padding: "24px"
  badge-brand:
    backgroundColor: "{colors.protocol-green}"
    textColor: "{colors.protocol-green}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: OpenShare

## 1. Overview

**Creative North Star: "The Contribution Graph"**

OpenShare should feel like a live map of open source value: dark, data-rich, precise, and grounded by a clear green contribution signal. The current system uses a restrained technical base with a brand-led homepage layer, so future work should preserve the product's credibility while giving public surfaces enough visual intent to make contribution value feel tangible.

The visual language is built from slate surfaces, sharp green calls to action, graph-like network fields, compact Radix-style controls, and readable bilingual typography. It must reject the exact anti-references in PRODUCT.md: a traditional recruiting website, a cryptocurrency product, or an overdone cyber aesthetic.

**Key Characteristics:**
- Dark slate is the default atmosphere; light mode is a functional companion, not a separate brand.
- Green is rare and directional: actions, selected states, contribution value, and positive system feedback.
- Blue and amber are data accents, used for ecosystem signals and comparative charts.
- Components are compact, bordered, and state-driven, with 8 to 14px radii and fast transitions.
- Chinese and English copy must be layout-safe and readable before it is decorative.

## 2. Colors

The palette is a restrained dark graph system: slate surfaces carry the product, green marks contribution value, and blue or amber distinguish data signals.

### Primary
- **Protocol Green**: The brand signal for primary actions, selected states, contribution value, success moments, and the OpenShare wordmark accent.
- **Protocol Green Deep**: The light-theme primary and darker green stop for hover, emphasis, or brand gradients already present in the codebase.

### Secondary
- **Graph Blue**: A data and platform accent for Open, integrated platforms, and secondary chart series.

### Tertiary
- **Signal Amber**: A secondary data accent for project activity, warnings that are not destructive, and chart contrast.
- **Risk Red**: Destructive and error state color only.

### Neutral
- **Slate Night**: Default dark body background and primary foreground for green-filled controls.
- **Slate Panel**: Cards, popovers, sidebars, and input backgrounds.
- **Slate Panel Strong**: Hovered surfaces, secondary buttons, selected navigation shells, and raised control backgrounds.
- **Slate Border**: Structural borders, dividers, table rules, and input strokes.
- **Slate Text**: Primary dark-mode text.
- **Slate Muted**: Secondary metadata and low-emphasis labels only. Do not use it for long body copy.
- **Light Fog**: Light-mode page background.
- **Light Ink**: Light-mode primary text.
- **Light Panel**: Light-mode cards and popovers.
- **Light Border**: Light-mode structural borders.

### Named Rules
**The Green Signal Rule.** Protocol Green is for action, selection, contribution, and reward. If everything is green, nothing is a signal.

**The No Coin Glow Rule.** Do not use gold-heavy palettes, token badges, or speculative finance styling. Rewards are contribution incentives, not cryptocurrency.

## 3. Typography

**Display Font:** Inter with system sans fallbacks  
**Body Font:** Inter with system sans fallbacks  
**Label/Mono Font:** JetBrains Mono for compact numbers, ledger-like protocol snippets, and tabular values

**Character:** The type system is plain, technical, and readable. Inter carries almost everything; JetBrains Mono appears only where structured data benefits from a machine-readable cadence.

### Hierarchy
- **Display** (650 to 700, 3rem to 4.5rem, 1.04): Homepage hero and major brand statements. Use balanced wrapping and keep letter spacing at 0.
- **Headline** (600, 1.25rem to 1.5rem, 1.25 to 1.3): Page titles, section titles, and major card groups.
- **Title** (600, 1rem, 1.35): Card titles, list headings, dialog titles, and dense page modules.
- **Body** (400, 1rem, 1.6 to 1.75): Descriptive copy, explanations, empty states, and long bilingual text. Keep prose near 65 to 75ch.
- **Label** (500, 0.875rem, 1.5): Buttons, field labels, tabs, navigation, and compact metadata.
- **Mono** (600, 0.875rem, 1.5): Counts, ledger fragments, IDs, and chart-adjacent metrics.

### Named Rules
**The One Sans Rule.** Do not add a display serif or decorative family. OpenShare's trust comes from clear product-grade typography, not editorial styling.

**The Bilingual Fit Rule.** Any heading or button label must survive Chinese and English without overflow. Reduce scale or rewrite before allowing clipping.

## 4. Elevation

OpenShare is flat by default and uses tonal layering, borders, and subtle inner highlights more than drop shadows. Depth comes from surface color shifts, 1px borders, `shadow-sm`, and inset top strokes on cards. Strong glow is reserved for rare animated emphasis and must respect reduced-motion settings.

### Shadow Vocabulary
- **Inset Surface Highlight** (`inset 0 1px 0 rgba(226,232,240,0.08)`): Default card and strong glass surface highlight.
- **Control Shadow** (`shadow-sm`): Buttons, inputs, cards, and active navigation where a small lift helps separate controls from panels.
- **Dropdown Shadow** (`shadow-md`): Popovers and dropdowns only.
- **Pulse Glow** (`0 0 5px rgba(34,197,94,0.2)` to `0 0 20px rgba(34,197,94,0.4)`): Rare signal animation, never a default card treatment.

### Named Rules
**The Flat Graph Rule.** Surfaces should read as panels in a graph interface, not floating marketing cards. Use border and tone first; use shadow only for state or overlay.

## 5. Components

### Buttons
- **Shape:** Gently curved rectangle (8px radius), full pill only for badges and compact chips.
- **Primary:** Protocol Green fill with Slate Night text, 36px default height, 40px large height, and 8px to 20px horizontal padding depending on size.
- **Hover / Focus:** Hover darkens to `primary/90`; focus uses a 3px green ring; active state scales to 0.98 for immediate feedback.
- **Secondary / Ghost / Destructive:** Secondary uses Slate Panel Strong with borders; ghost is text-first with a tonal hover; destructive uses red-tinted fill and border.

### Chips
- **Style:** Compact rounded pills with 1px borders, low-alpha green or panel backgrounds, 12px or smaller labels.
- **State:** Selected chips use green text or dots. Unselected chips stay neutral and must not compete with primary actions.

### Cards / Containers
- **Corner Style:** 14px for canonical cards, 8px for dense inner rows and controls.
- **Background:** Slate Panel at 95% opacity in dark mode, Light Panel in light mode.
- **Shadow Strategy:** Use inset surface highlights and `shadow-sm`; avoid wide soft drop shadows.
- **Border:** 1px Slate Border or low-alpha foreground border.
- **Internal Padding:** 24px for standard cards, 12px to 16px for dense rows, 20px for brand-section modules.

### Inputs / Fields
- **Style:** 44px height, 8px radius, Slate Panel input background, Slate Border stroke, 14px horizontal padding.
- **Focus:** Border shifts to Protocol Green with a 3px green ring.
- **Error / Disabled:** Error uses Risk Red border and low-alpha red ring; disabled uses 40% opacity and blocks pointer events.

### Navigation
- **Style:** Navigation is compact, icon-led, and panel-based. Active items use a bordered tonal surface with a green icon block; inactive items use muted foreground with borderless hover until interaction.
- **Mobile Treatment:** Mobile navigation opens in a sheet and returns focus to the triggering menu button when closed.

### Open Network Field
The homepage signature field uses radial color pools, a subtle grid, tiny node points, and connecting lines. It should imply a contribution graph, not a decorative starfield. Keep opacity low enough that text remains the highest-contrast layer.

## 6. Do's and Don'ts

### Do:
- **Do** use Protocol Green for primary action, selected state, contribution value, and reward feedback.
- **Do** preserve the slate panel hierarchy: Slate Night body, Slate Panel cards, Slate Panel Strong hover or active surfaces.
- **Do** keep components compact, keyboard-visible, and state-complete.
- **Do** use JetBrains Mono only for numeric or protocol-like data where alignment and structure matter.
- **Do** check bilingual text at narrow widths before treating a screen as done.
- **Do** respect reduced motion for particles, shimmer, pulse glow, and any future animated network effects.

### Don't:
- **Don't** make OpenShare look like a traditional recruiting website.
- **Don't** make OpenShare look like a cryptocurrency product.
- **Don't** make OpenShare look like an overdone cyber aesthetic.
- **Don't** use decorative terminal tropes, heavy neon, token coins, or speculative finance motifs.
- **Don't** use border-left or border-right greater than 1px as a colored accent stripe.
- **Don't** pair a 1px border with a wide soft shadow on cards or buttons.
- **Don't** introduce gradient text. Use solid Protocol Green or weight contrast.
- **Don't** use muted text for long body copy when contrast is close.
