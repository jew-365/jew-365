---
name: webapp-designer
description: Master orchestrator for frontend and web UI design or build work. Use when the user wants to design, build, redesign, critique, audit, polish, refine, colorize, typeset, lay out, or animate a web interface, including landing pages, portfolios, marketing sites, product UI, dashboards, app shells, components, forms, onboarding, empty states, motion, and micro-interactions. It classifies the task, then composes the installed specialist skills design-taste-frontend, impeccable, and emil-design-eng. Trigger whenever frontend design quality, visual polish, UI craft, or "make this look good/professional/not AI-generated" is in play. Prefer this over invoking a single design skill directly unless the user explicitly names another skill. Not for backend-only or non-UI work.
---

# webapp-designer

This is an orchestrator, not a fourth design system. Its job is to read the task, choose the right specialist skill or skills, apply them in the right order, and close with a combined quality gate. The design opinions live in the specialists; do not restate them here.

## Specialist Skills

Resolve specialist paths from the active skills directory. In this environment, the intended global skill root is `C:\Users\avrah\.agents\skills`; the three specialists are siblings of this skill:

- `design-taste-frontend`
- `impeccable`
- `emil-design-eng`

If a sibling directory is unavailable, look for the same skill name in the current session's available skills list before using any fallback path. Do not assume `C:\Users\avrah\.claude\skills` is the canonical location.

Apply a specialist by reading its `SKILL.md` and following its instructions. Never paraphrase from memory, because these skills can change.

| Specialist | Best at | Use when |
| --- | --- | --- |
| `design-taste-frontend` | Anti-slop frontend taste for landing pages, portfolios, marketing pages, and redesigns. Includes brief inference, dials, design-system selection, and final pre-flight. | The surface is a landing page, portfolio, marketing site, campaign, editorial page, or redesign of one. It is explicitly not the lead for dashboards, dense product UI, or data tables. |
| `impeccable` | Broad production workflow for both brand and product UI: craft, shape, critique, audit, polish, bolder, quieter, distill, harden, onboard, animate, colorize, typeset, layout, delight, clarify, adapt, optimize, and live iteration. | Product UI, app shells, dashboards, forms, settings, onboarding, empty states, UX review, accessibility, information architecture, and most refine verbs. |
| `emil-design-eng` | Motion and micro-interaction craft: animation decisions, easing, duration, springs, gestures, transform/clip-path, performance, and reduced motion. | Any animation, transition, gesture, interaction feel, or motion-code review. Always apply it to a concrete target. |

## Composition Rule

Use the minimum sufficient composition. Most tasks need one lead specialist and zero or one support specialist. Add a support specialist only when it clearly changes the result, such as motion on a marketing page or product-specific UX structure beneath a brand page. One specialist applied fully is better than three applied shallowly.

## Step 1: Classify

Classify the task on two axes.

Surface:

- Brand: landing page, portfolio, marketing page, campaign, editorial page, or redesign where design is the product.
- Product: app UI, dashboard, admin surface, forms, settings, onboarding, empty states, or data-heavy tools where design serves the product.
- Component/Motion: a single component, animation, transition, gesture, or isolated interaction.

Intent:

- build: greenfield implementation.
- redesign: overhaul or substantially reshape an existing surface.
- review: critique or audit without necessarily changing code.
- refine: polish, bolder, quieter, colorize, typeset, layout, delight, harden, clarify, distill, adapt, or optimize.
- motion: animation is the central task.

Ask one concise question only if the route would materially change and the brief does not provide enough signal. Otherwise infer and proceed.

## Step 2: Route

| Surface | Intent | Lead | Support |
| --- | --- | --- | --- |
| Brand | build or redesign | `design-taste-frontend` | `emil-design-eng` for motion and interactions; `impeccable` for brand register rules or iterative refine verbs. |
| Product | build or redesign | `impeccable` with `craft` or `shape` guidance | `emil-design-eng` for interaction and motion polish; `design-taste-frontend` only for any separate marketing page. |
| Component/Motion | build, animate, or review motion | `emil-design-eng` | `impeccable` `animate` guidance and, for page-level choreography, relevant `design-taste-frontend` motion sections. |
| Any | review, critique, or audit | `impeccable` `critique` and `audit` guidance | `design-taste-frontend` final pre-flight for page-level anti-slop checks; `emil-design-eng` review format and checklist when motion exists. |
| Any | refine | `impeccable` guidance for the matching refine verb | `emil-design-eng` for micro-polish; `design-taste-frontend` final pre-flight for page-level surfaces. |

Read the lead skill first and let it own the flow. Pull only the named sections needed from support skills. Do not run a support skill end-to-end unless the task is genuinely split across domains.

## Step 3: Announce Routing

Before generating or editing, state the route in one line:

`Reading this as a [surface] / [intent] task; leading with [skill], layering [skill] for [reason], closing with combined QA.`

Keep it terse so the user can redirect.

## Step 4: Apply and Validate

After producing or changing UI work, run the relevant union of these quality gates. If a check cannot honestly pass, fix before delivering.

1. `design-taste-frontend`: run its final pre-flight for page-level surfaces, including anti-slop checks, hero fit, CTA contrast/wrap, layout repetition, real imagery, and theme/color/shape discipline.
2. `impeccable`: run its AI-slop test, absolute bans, contrast checks, typography checks, register guidance, and any command-specific reference required by the task.
3. `emil-design-eng`: when motion exists, run its review checklist and table format, including checks for `transition: all`, `scale(0)`, `ease-in` on UI entrances, overly long UI durations, transform origin, performance, and reduced-motion handling.

## Conflict Resolution

When specialists disagree, resolve by domain authority:

- Motion: component and micro-interaction feel belongs to `emil-design-eng`; page-level scroll choreography and design-taste dials belong to `design-taste-frontend`; reduced motion remains mandatory under all routes.
- Stack/framework: existing projects follow the existing stack and conventions; greenfield brand pages can follow `design-taste-frontend` defaults; motion techniques from `emil-design-eng` adapt to whichever stack is already chosen.
- Fonts/color/cards: apply the more specific rule from the lead skill. Avoid mixing broad aesthetic rules without a concrete reason.
- Register: for dashboards and dense product UI, do not lead with `design-taste-frontend`; use it only for QA or separate marketing surfaces.

## Gotchas

- `emil-design-eng` has a minimal initial response when invoked without a specific question. Always apply it against a concrete target such as "review motion in this drawer" or "choose easing for this transition."
- `impeccable` has a setup workflow involving `context.mjs`, `PRODUCT.md`, `DESIGN.md`, and command references. For quick composition, follow its `SKILL.md` and the relevant command/reference guidance; use the full managed workflow when the user asks for it or the task requires it.
- `design-taste-frontend` is for landing pages, portfolios, marketing pages, and redesigns. For dashboards or dense product UI, `impeccable` leads.
- Do not dilute the lead. Pick the lead, commit to it, and layer support surgically.
