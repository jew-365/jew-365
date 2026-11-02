# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Observant Jews, men and women, and from the 2026 redesign on mainly young adults (18 to 30, the product owner's direction, confirmed 2026-10-18). They open the app several times a day, before Shacharit, at Mincha and at night, to see which halachic window is open now, how long is left, open the text and mark it done. Married users may also track taharat hamishpacha privately. Hebrew first, English second.

## Product Purpose

Daily mitzvot inside their real halachic time windows, computed on the device for the user's location: reminders, a siddur in the user's nusach, history and streaks, and a quiet app on Shabbat and Yom Tov. Success is a user who never misses a window and never has to calculate a zman.

## Positioning

Zmanim, the Hebrew calendar, Shabbat and Yom Tov quiet and the check-in after a holy block are computed locally per location and nusach, and the reminder, the text and the mark are one path: notification, siddur, done.

## Operating Context

- Opened from notifications in short glances, often one-handed (a tefillin bag in the other hand, in shul, at work), in dark early mornings and at night as well as in daylight.
- The app goes fully quiet on Shabbat and Yom Tov: a Shabbat screen covers every route, and the marks for those days are made after the block in a check-in.
- The gender answer picks a default palette, and each palette has a dark counterpart.

## Capabilities and Constraints

- Expo / React Native on Android and iOS (iOS through TestFlight, pending). JavaScript, assets and fonts ship over the air; a native module needs a build.
- Hebrew right-to-left first. Prayer text needs Noto Serif Hebrew, the one bundled face that covers every nikud and cantillation mark.
- Every palette keeps a male, a female and a dark variant, and the gender answer still picks the default (confirmed 2026-10-18).
- WCAG contrast floors are pinned by the theme tests.

## Brand Commitments

- Personality, from the product owner (2026-10-18): young, yet formal and dignified; an advanced lifestyle app.
- The logo is mark `o` of 2026-11-02, the full mark in every size and asset (the owner's rule of 2026-10-22): a blue stopwatch ring open on the right with a button and ticks on its left half, JEW over 365° in heavy dark navy with an orange degree ring, a large orange bell at the upper right and an orange open book at the lower right. Source: [design/references/2026-11-02/logo.jpg](design/references/2026-11-02/logo.jpg), traced into vectors by [design/jew365-concepts/vector/build.mjs](design/jew365-concepts/vector/build.mjs). The launcher icon is the same mark on white, framed as that image frames it.
- The default look (2026-10-21), after [design/references/2026-10-21/ui-mockup.webp](design/references/2026-10-21/ui-mockup.webp): a cream page, warm white cards, peach icon tiles, an orange accent and dark ink text, with light headers on the page itself and a floating tab bar.
- The female palette is the warm rose twin of that look; the dark palette is night navy with the orange accent, and plum stays the female dark.

## Evidence on Hand

Real zmanim, Hebrew dates and liturgy from the app's own engines and the bundled siddur texts in [assets/siddur/](assets/siddur). There are no user counts, ratings or testimonials to cite, and none may be invented.

## Product Principles

1. Time first: what is open now and how long is left outranks everything else on a screen.
2. One glance, one tap: the notification, the text and the mark stay one short path.
3. Respect the day: quiet on Shabbat and Yom Tov, discreet wherever privacy matters.
4. Dignified, not dated: serious content in a young, contemporary presentation.

## Accessibility & Inclusion

WCAG AA contrast (4.5:1 for body text) is enforced by the theme tests, the device's reduce-motion setting is respected, touch targets suit one-handed use, and Hebrew typography carries full nikud.
