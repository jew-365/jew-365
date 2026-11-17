# AGENTS.md

## Purpose

- The study of 2026-11-16 for D2 of the discoverability program ([../../../../.claude/specs/discoverability.md](../../../../.claude/specs/discoverability.md)): "add a mitzvah" opens a short gallery of templates, each created in one tap with sensible hours and one reminder and landing on its mitzvah screen, beside "my own" for today's full form ([../../../../src/app/custom-mitzvah.tsx](../../../../src/app/custom-mitzvah.tsx)).
- The page shows, on live phones in every palette, in Hebrew RTL with an English switch: the two entry points of today (the library's floating add button in [../../../../src/app/mitzvot.tsx](../../../../src/app/mitzvot.tsx), the "personal" goal of [../../../../src/app/capabilities.tsx](../../../../src/app/capabilities.tsx)), which open the direction chosen on the page; direction א, a sheet of template cards with "my own" last (the recommendation); direction ב, a full screen with groups (daily, weekly, family, learning), a search whose empty result offers "my own" with that name, and a preview sheet; what one tap does (the mitzvah screen with its window, its one reminder and the smart nag's sends, an undo bar) and the path to edit (today's form, filled); the eleven proposed templates; and what to decide.

## Ownership

- [gen-data.mjs](gen-data.mjs) is the setup study's data script changed for this study; it writes [data.json](data.json) from the app's own code through [ts-loader/](ts-loader): the six palettes, the strings of both dictionaries, the library of a fresh nusach Ashkenaz install, the capabilities screen's personal goal, the zmanim of Wednesday 2026-11-18 in Jerusalem, the icon drawings, and the proposed templates (`TEMPLATES`, proposed copy) with each one's window on a day it applies and the sends of `customNagZone()` and `smartNagTimes()` at the default level. Run `TZ=Asia/Jerusalem node --import ./ts-loader/register.mjs gen-data.mjs`.
- [site-template.html](site-template.html) holds the phones, the switches (palette, the phones' language, which direction "add" opens, the proposed-copy marks) and every press; its base styles and icon helpers are copied from the setup study's page. The gallery's own words are proposed copy in its `WORDS`, underlined with dots while the marks switch is on.
- [build.mjs](build.mjs) writes the page into the build output (`out/`, never committed) from [site-template.html](site-template.html) and [data.json](data.json).

## Local Contracts

- Published as one private gallery Artifact: https://claude.ai/artifact/7sPdTnjvUbbicqztMYRgm2 (2026-11-16). Republish to the same link after a change.
- The owner's pick, 2026-11-17 ("לך עם ההמלצה שלך"): direction א, and the page's recommendation on each decision: one tap adds at once with an undo on the mitzvah's screen, all eleven templates as proposed, no field for a time by a zman (Tehillim is saved as 09:30 to 16:30), a Sunday to Friday template left as it is on Friday, and a template already added marked and opening the mitzvah it made. Built in the app the same day ([../../../../src/components/TemplateSheet.tsx](../../../../src/components/TemplateSheet.tsx), [../../../../src/data/customTemplates.ts](../../../../src/data/customTemplates.ts)); one difference from the page: the capabilities screen's personal goal opens the library with the sheet, not a sheet over the capabilities screen.
- Every template icon is one of `CUSTOM_ICON_CHOICES` of [../../../../src/data/customIcons.ts](../../../../src/data/customIcons.ts); [gen-data.mjs](gen-data.mjs) throws otherwise.
- No template makes a halachic claim beyond a plain habit name, and every time is modest and editable. A template anchored to a zman (Tehillim, from the latest Shacharit to sunset) needs a field the custom form does not have; the page marks it as a new field.

## Work Guidance

- A next round changes this study in place and republishes to its link. Implementing the pick is a separate task under [../../../../src/AGENTS.md](../../../../src/AGENTS.md): a template list beside [../../../../src/app/custom-mitzvah.tsx](../../../../src/app/custom-mitzvah.tsx), saved through `useCustomMitzvotStore` with `firstReminder(name)` as today, with its search words and guide topic.

## Verification

- `node build.mjs` in this folder, then open the built site page at 1240 and at 430 points: no horizontal scroll, no page error, every press shows its result (the sheet, the gallery, the preview, the new mitzvah's screen with its undo bar, the form, a toast).

## Child DOX Index

No child AGENTS.md files.
