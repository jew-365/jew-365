# Reader texts for the habit mitzvot — source research

Asked by the owner on 2026-11-18: "כל מה שצריך נוסח במצוות החדשות שהוספת תוסיף לו גם נוסח … עכשיו רק תיצור משימות בשביל זה … אני רוצה מחקר מעמיק מאיפה אפשר להביא את התוכן של הנוסח". This file is the research; the tasks are the batch "Reader texts for the habit mitzvot" in [../../not-close.md](../../not-close.md). Nothing here is built.

## 1. How it was read

- Read on 2026-11-18 by three research passes. "Fetched" means the Sefaria API, the Sefaria export bucket, Hebrew Wikisource or the source's own site answered that day; a licence in quotes is the `license` field Sefaria gives for that version, or the site's own words.
- Sefaria's labels are Sefaria's. For Torat Emet they disagree with Torat Emet's own pages, the conflict already open in [../../release/licence-requests.md](../../release/licence-requests.md) (row 3, unanswered).
- "Not verified" marks what came from a search snippet or from memory. It must be read from the source before it is built.

## 2. Which habit gets a text

| Habit | Text | Kind |
|---|---|---|
| `tehillim_chapter` | The bundled Tehillim, opened on a chapter | Existing text, a link |
| `gratitude` | Mizmor LeTodah (Psalm 100); the bundled Nishmat as the long option | Small bundled text |
| `pirkei_avot` | The six chapters, with "כל ישראל" and "רבי חנניא בן עקשיא" | Small bundled text |
| `iggeret_haramban` | The whole letter (525 words) | Small bundled text |
| `visit_sick` | "המקום ירחם עליך", Mi Sheberach for the sick, psalms for the sick | Small bundled text |
| `daily_tzedakah` | The Chida's "לשם יחוד" said before giving | Small bundled text |
| `cheshbon_nefesh` | The forgiveness passage and vidui of the bedtime Shema; Mesillat Yesharim 3 as study | Existing text, a section link; optional study text |
| `hitbodedut` | Likutei Moharan II:25 (409 words) | Small bundled text |
| `kids_learning`, `kids_story` | "תורה צוה", Shema, "המלאך הגואל", the blessing of the children | Small bundled text |
| `call_parents`, `grandparents_call`, `shabbat_guest` | Source passages only: Peah 1:1 "אלו דברים", Exodus 20:12, Genesis 18:1-8 | Optional; no liturgical text exists |
| `mikveh_erev_shabbat` | No recited text was found in an open source | Blocked on the rav and a public-domain print |
| `two_mishnayot`, `mishna_yomit` | The Mishnah with Bartenura | Downloadable add-on |
| `daf_yomi` | The Bavli with Rashi, per tractate | Downloadable add-on |
| `learning_on_the_way`, `torah_class`, `friend_call`, `kind_word`, `child_time`, `shabbat_prep`, `shabbat_shopping` | None | No text |

## 3. Small texts

All fetched unless marked. Vocalized Hebrew is required by the siddur build ([../../scripts/siddur/AGENTS.md](../../scripts/siddur/AGENTS.md)).

| Text | Best source | Nikud | Licence | English |
|---|---|---|---|---|
| Pirkei Avot with its frame | Sefaria `Siddur Edot HaMizrach, Mishna Study for Shabbat, Pirkei Avot`, version " Shaliehsaboo Edition" (leading space; about 4,690 words; cantillation marks on verses to strip) | Yes | "CC0" | "Mishnah Yomit by Dr. Joshua Kulp", "CC-BY" |
| Pirkei Avot, second choice | Sefaria `Siddur Sefard, Shabbat Mincha, Pirkei Avot`, "Torat Emet 357" | Yes | "Public Domain" by Sefaria; Torat Emet conflict | same |
| Iggeret HaRamban | Hebrew Wikisource `אגרת הרמב"ן`, revision 2928830 (Sefaria version "HeWiki") | Yes | CC BY-SA | "Sefaria Community Translation", "CC0" |
| "המקום ירחם עליך" | `Shulchan Arukh, Yoreh De'ah 335:6`, "Torat Emet 357" | Yes | "Public Domain" by Sefaria; Torat Emet conflict | Denburg 1955, "CC-BY" |
| Mi Sheberach for the sick | Hebrew Wikisource `מי שברך לחולה`, revision 3008338; or `Siddur Ashkenaz … For Sickness`, "Daat Siddur Ashkenaz" | Yes | CC BY-SA; "Public Domain" by Sefaria | Community, "CC0" |
| Psalms | The bundled Tehillim (Sefaria `Psalms`) | Yes | already in the app | none in the app (Hebrew only) |
| Tzedakah "לשם יחוד" (Chida, Moreh BeEtzba 1) | Hebrew Wikisource `מורה באצבע`, revision 2956527 (the formula is vocalized); Sefaria's "Livorno, 1842" is unvocalized | Partly | CC BY-SA; "Public Domain" | Community, "CC0", coverage not checked |
| Bedtime forgiveness and vidui | Already in the app's `kriat_shema_al_hamita` | Yes | as built | as built |
| Mesillat Yesharim 3 (895 words) | Sefaria "Sefaria Vocalized Edition" | Yes | "CC0" | Sebag, "CC-BY" |
| Likutei Moharan II:25 | Sefaria "Likutei Moharan Tinyana - rabenubook.com" | Yes | "Public Domain" | BRI is "CC-BY-NC": avoid |
| Hishtapchut HaNefesh, Likutei Tefilot | Hebrew Wikisource (`השתפכות הנפש/<אות>`, `ליקוטי תפילות חלק א תפילה …`) | Yes | CC BY-SA | none open |
| Psalm 100 | The bundled Tehillim | Yes | already in the app | — |
| Children's verses (Deut 33:4, Deut 6:4, Gen 48:16), the blessing of the children | Sefaria `Tanach with Nikkud`; the "Blessing the Children" node of the Sefaria siddurim | Yes | "Public Domain" | JPS 1917, "Public Domain" |
| Peah 1:1, Exodus 20:12, Genesis 18:1-8 | Sefaria Mishnah and Tanakh | Yes | as above | Kulp "CC-BY"; JPS 1917 |

Findings that shape the tasks:

- **Avoid:** Sefer Cheshbon HaNefesh "Warsaw, 1894" and Sefaria's Likutei Tefilot ("unknown" licence), Breslov Research Institute English (NC), and chabad.org's twelve pesukim page ("All rights reserved"; the 1976 selection is Chabad-specific and its protection was not established).
- **No "הריני נותן" text** for tzedakah was found; the Chida's formula is the one open text. Fixed verses were not confirmed.
- **The psalms for the sick:** printed Tehillim list 36 chapters, then the Psalm 119 letters of the patient's name. The list itself is not verified (20, 6, 9, 13, 16, 17, 18, 22, 23, 28, 30, 31, 32, 33, 37, 38, 39, 41, 49, 55, 56, 69, 86, 88, 89, 90, 91, 102, 103, 104, 107, 116, 118, 142, 143, 128 from memory); a short set is 20, 121, 130. Read it from a print before building.
- **The Avot cycle:** a chapter each Shabbat from Pesach to Shavuot; Sefardim stop there; Chabad and some Ashkenazim continue to the Shabbat before Rosh Hashanah. The doubling in the last round, the Israel and abroad shift and the Teiman practice are not verified: a question for the rav. The habit as built is a weekly reminder on Wednesday evening, so the first version can show the chapter the user picks and need no cycle.
- **The Friday mikveh:** only the Chida's order of immersions (Moreh BeEtzba 137, an instruction, unvocalized) was found. A recited text needs the rav's word on what is said and a public-domain print to type from.

## 4. The Mishnah (two mishnayot, Mishna Yomit)

| Source | Nikud | Licence | Note |
|---|---|---|---|
| Sefaria "Torat Emet 357" | Yes | "Public Domain" by Sefaria; Torat Emet's page: "כל הזכויות שמורות (c) ל ר' פנחס ראובן שליט''א" | 63 tractates, 4,187 mishnayot, 3.0 MB; the only complete vocalized printed text |
| Sefaria "Mishnah, ed. Romm, Vilna 1913" | No | "Public Domain" (NLI scan) | 63 tractates, 1.8 MB; the clean fallback |
| Hebrew Wikisource "משנה מנוקדת" | Yes | CC BY-SA 4.0 | Completeness and the source of its nikud not verified; the page read is marked "לא נבדק" |
| Kaufmann manuscript, ed. Be'eri (Sefaria) | Yes | "PD" on 61 files, "unknown" on 3 | Differs from the printed text and numbering |
| Mechon Mamre | No | All rights reserved | Excluded |
| Bartenura, Sefaria "On Your Way" | No | "Public Domain" | 63 tractates, 5.4 MB; the origin (mobile.tora.ws) not checked |
| Bartenura, Sefaria "Torat-Emet" | — | "CC-BY-NC"; Torat Emet: all rights reserved | Avoid |
| Kehati | — | All rights reserved (search only) | Excluded |
| English "Mishnah Yomit by Dr. Joshua Kulp" | — | "CC-BY" | 63 tractates, 4,192 mishnayot, 2.25 MB |

- **Schedule:** `@hebcal/learning` (BSD-2-Clause) defines Mishna Yomit: the cycle began on 20 May 1947 (1 Sivan 5707), 4,192 mishnayot, two a day, 2,096 days, in the order of the Shas. It needs `@hebcal/core` 6 and the app has 5, so the rule is reimplemented: `(abs − start) % 2096` over a chapter-length table copied with its notice.
- **Bikkurim chapter 4:** the schedule and Kulp count its five mishnayot; Torat Emet 357 and Romm seem to lack them (34 against 39). Not confirmed by reading the chapter.
- **Size:** Hebrew and Bartenura are about 8.4 MB raw, so this is a downloadable add-on like Chok LeYisrael, never bundled.
- **Recommendation:** Torat Emet 357 for the Hebrew once its rights are settled (the fallback is Wikisource's vocalized text, or Romm without nikud), Bartenura "On Your Way" folded like Chok LeYisrael's commentary, Kulp for English, the hebcal rule for the schedule.

## 5. Daf Yomi

| Source | Nikud | Licence | Size, raw / gzip |
|---|---|---|---|
| Sefaria "Wikisource Talmud Bavli" (the Vilna text) | No | "CC-BY-SA" | 18.1 MB / about 4.2 MB, 37 tractates |
| Rashi, Sefaria "Vilna Edition" | No | "Public Domain" | 25.1 MB / about 7 MB |
| Tosafot, Sefaria "Vilna Edition" | No | "Public Domain" | 23.8 MB / about 6.5 MB |
| Steinsaltz vocalized text, "William Davidson Edition - Vocalized Aramaic" | Yes | "CC-BY-NC" | 30.8 MB / about 5.6 MB |
| Steinsaltz Hebrew explanation, "William Davidson Edition - Hebrew" | No | "CC-BY-NC" | 55.8 MB / about 12.7 MB |
| English, "William Davidson Edition - English" | — | "CC-BY-NC" | 52.3 MB / about 13.5 MB |
| Mechon Mamre | No | Private study only | Excluded; links allowed |
| Wikisource "ביאור" | No | CC BY-SA 4.0 | Partial: many tractates missing |

- **Largest tractate (Shabbat), measured:** text 241 KB gzip, Rashi 389 KB, Tosafot 354 KB, Steinsaltz Hebrew 757 KB.
- **The Davidson credit Sefaria asks for:** "Text from The William Davidson digital edition of the Koren Noé Talmud, with commentary by Rabbi Adin Even-Israel Steinsaltz. License: CC-BY-NC". Whether a free store app is non-commercial is the doubt already open for Torat Emet; it needs Koren's and Sefaria's written word.
- **Links:** `https://www.sefaria.org/Berakhot.2a?lang=he` opens the Sefaria app when installed (App Links and universal links); there is no `sefaria://` scheme. Hadran: `https://hadran.org.il/daf/berakhot-2/`. Other shiur portals' URL formats and terms are not verified.
- **Runtime fetching from Sefaria's API** is not the main path: no stated quota, 403 on some User-Agents, and the app is offline-first.
- **Alignment risk:** Rashi and Tosafot are keyed by daf and line, the Gemara by Sefaria segment; joining them needs Sefaria's links dataset or matching by the opening words. Tamid has no Rashi; Rashbam on Bava Batra and the Ran on Nedarim are separate texts.
- **Recommendation:** first a link-out on the mitzvah screen (Sefaria and Hadran for the day's daf), which needs no licence; then a per-tractate add-on of the Vilna text with Rashi (about 0.6 MB gzip for the largest tractate, about 11 MB for all), Tosafot as an optional second file, and the Steinsaltz explanation only after written permission.

## 6. Decisions the tasks wait on

- **The owner (Q38 to Q41 in [../../not-close.md](../../not-close.md)):** which habits get a text at all; whether the Mishnah waits for Torat Emet's answer or ships from another source; how far Daf Yomi goes (links, text with Rashi, Steinsaltz); whether the texts are Hebrew only like Tehillim or carry English.
- **The rav (R18 to R20):** the Avot cycle per nusach; the psalms and wording for the sick; what, if anything, is said at the Friday mikveh and before tzedakah.
