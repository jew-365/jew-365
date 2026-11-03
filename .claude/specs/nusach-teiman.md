# Spec: nusach Teiman Baladi, source map

The batch "Nusach Teiman, 2026-11-02" in [not-close.md](../../not-close.md). The owner's call of 2026-11-02: Baladi only. This file is the result of its first task, "Pin and map the Baladi source": every siddur text of the app against the Baladi source that could build it, read on 2026-11-02. Nothing is built yet.

## 1. Where a Baladi text exists

- **Sefaria** has no Yemenite siddur and no Yemenite Selichot. Its `/api/index` lists only Siddur Ashkenaz, Sefard, Edot HaMizrach, Chabad and their linear editions, so Sefaria stays the source of the psalms only.
- **Hebrew Wikisource** has two collections and a set of pages that print several nuschaot at once:
  - `סידור/נוסח תימן בלדי/…`: the collection this spec uses. Its index page (revision 3081611) links 22 parts. The weekday prayers, the bedtime Shema, the Ashmurot (Selichot), the Tisha B'Av kinot and the eulogies exist. Every other part is a red link: Shabbat, Rosh Chodesh, Kiddush Levana, Chanukah, Purim, the fasts and Tefillat HaYachid.
  - `תכלאל עץ חיים/…`, the 1894 Tiklal with Maharitz's commentary: only the Rosh Hashana, Tisha B'Av and "סדר הנהגת הבוקר" pages exist, and none of them is a weekday text the app shows.
  - Multi-nusach pages carry a Baladi variant in the template `{{נוסחי תפילה קצרים|נוסח=…|בלדי=…}}` or `{{נוסחי תפילה ארוכים|…}}`: `נשמת`, `סדר ספירת העומר` (the count itself through the template `ספירת העומר/בלדי`), `ברכת בורא נפשות` (a paragraph headed "נוסח הרמב"ם (נוהגים בו יהודי תימן - בלדי)"), `שבע ברכות` (its own note says the Baladi version there is out of date and points to `שבע ברכות (בלדי)`), the Kaddish pages, `עלינו לשבח` and others.
- The text is vocalized everywhere but `סידור/נוסח תימן בלדי/ערבית לחול`, so Maariv comes from `סידור/נוסח תימן בלדי/חול/ערבית`.
- No Baladi page has an English translation, so the Teiman texts are Hebrew only, except where the build's translation memory matches a segment word for word.
- The license is Wikisource's CC BY-SA, as for the Wikisource sources already pinned in [scripts/siddur/manifest.js](../../scripts/siddur/manifest.js); the Tiklal itself is in the public domain.

## 2. Map by text

Revisions as read on 2026-11-02. "Gap" means that neither Wikisource nor Sefaria has a Baladi source for the text.

| Text | Baladi source | Revision | State |
| --- | --- | --- | --- |
| `shacharit` | `סידור/נוסח תימן בלדי/שחרית לחול` | 3101141 | Partial: see section 3 |
| `birchot_hashachar` | the same page, השכמת הבוקר to ברכות התורה; also `ברכות השחר (בלדי)` | 3101141; 2858337 | Ready |
| `asher_yatzar` | the same page, "אשר יצר" | 3101141 | Ready |
| `krias_shma_shacharit` | the same page, "קריאת שמע" | 3101141 | Ready |
| `tefillin` | the same page, "ברכות ציצית ותפילין" (להתעטף בציצית, להניח תפילין, על מצות תפילין), then its Shema | 3101141 | Ready |
| `mincha` | `סידור/נוסח תימן בלדי/מנחה לחול` (opens with the Ketoret, closes with the Kaddish) | 1076941 | Ready |
| `maariv` | `סידור/נוסח תימן בלדי/חול/ערבית` | 2896952 | Ready |
| `kriat_shema_al_hamita` | `סידור/נוסח תימן בלדי/קריאת שמע שעל המיטה` (transcludes `אנא בכח`) | 3081614 | Ready |
| `birkat_hamazon` | `ברכת המזון/בלדי` or `ברכת המזון/בלדי 2` (one to be chosen) | 2929642; 2929770 | Ready |
| `al_hamichya` | `ברכת מעין שלוש - נוסח תימן בלדי` | 2896943 | Ready |
| `borei_nefashot` | `ברכת בורא נפשות`, the Baladi paragraph only | 2896941 | Ready |
| `sheva_berachot` | `שבע ברכות (בלדי)` | 2903948 | Ready |
| `sefirat_haomer` | `סדר ספירת העומר`, Baladi variant, and the template `ספירת העומר/בלדי` | 2929975 | Ready, needs the multi-nusach templates |
| `nishmat` | `נשמת`, Baladi variant | 2972652 | Ready, needs the multi-nusach templates |
| `selichot` | `סידור/נוסח תימן בלדי/אשמורות` (21 transcluded piyut pages, each to be pinned; one from the Edot HaMizrach Selichot) | 3088391 | Ready, built to the downloadable add-on |
| `tikkun_haklali`, `tehillim` | the shared texts | — | Ready |
| `ushpizin` | not offered for Teiman (R14) | — | Not shipped, as for Chabad |
| `candle_lighting` | — | — | Gap |
| `havdalah` | — | — | Gap |
| `kiddush_levana` | — | — | Gap |
| `chanukah_candles` | — | — | Gap |
| `tefilat_haderech` | — | — | Gap |
| `birchot_hanehenin` | — | — | Gap |
| `birchot_hareiya` | — | — | Gap |
| `mezuzah` | — | — | Gap |

## 3. Shacharit

The page was last edited on 2026-11-02 and is being written:

- **Present:** the morning blessings, the Torah blessings with the Tamid, the tzitzit and tefillin blessings, the Zemirot, the Shema and its blessings, the Amidah with its inserts (Yaaleh Veyavo, Al HaNisim, Aneinu, the seasons, the Ten Days), Nefilat Apayim and Avinu Malkeinu, Ashrei and Lamenatzeach.
- **Empty:** headings with no text under them: והוא רחום and ה׳ אלהי ישראל of Monday and Thursday, קריאת התורה ("…"), קדושה דסדרא, שיר של יום, קדיש תתקבל, פטום הקטורת, קדיש דעתיד and עלינו לשבח.
- **Not on the page at all:** Hallel (Rosh Chodesh, Chanukah, Chol HaMoed) and Musaf (Rosh Chodesh, Chol HaMoed), which the app's Shacharit carries on their days for every nusach.
- **Could fill some of the empty headings:** the Kaddish and the Ketoret of the Mincha page, the Aleinu of the Maariv page and the page `קדיש דעתיד (קדיש דרבנן נוסח תימן - בלדי)` (revision 1278881). Each would be checked to be the Shacharit wording before it is used.

## 4. Build work the sources need

Done on 2026-11-02 (`c66bf4a`): the build reads these templates for a source with `params`, and `teiman` is a staged nusach. The list stays as the record of what the pages use.

- [scripts/siddur/build.js](../../scripts/siddur/build.js) knows a dozen Wikisource templates and fails on any other. The Baladi pages use about thirty more:
  - layout and size: `ג`, `גדול`, `גדול-מודגש`, `מודגש`, `ק`, `קטן`, `ר1`, `ש-רווח`, `טורים שווים ממורכז`, `שמאל`, `ססס`, `טקסט מנוקד`;
  - instructions and labels: `גפ`, `סי`, `רן`, `מילת קבע`, `מקורות לסידור`, `יהיו לרצון`;
  - verse references: `ממס1`;
  - psalm transclusions: `צתס`, `פתל`;
  - the Ten Days markers: `בעשרת ימי תשובה`, `בעשרת ימי תשובה סוף`;
  - piyut layout: `מר`, `מרנות`, `רפרן`, `החלף`;
  - the multi-nusach selectors: `נוסחי תפילה קצרים`, `נוסחי תפילה ארוכים`;
  - plus the transclusions of other pages.
- A psalm the pages transclude (`צתס`, `פתל`) comes from the pinned Sefaria Psalms, as `{{צת}}` does today.
- The build also needs a `teiman` entry in every per-nusach table, and the `teiman` specs of every text in [scripts/siddur/manifest.js](../../scripts/siddur/manifest.js).

## 5. The 1894 Tiklal, for the texts Wikisource lacks

Found on 2026-11-03: archive.org item `Tiklal_Eiz_Hayyim_Jerusalem_1894` is the first printed Tiklal Etz Chaim (Jerusalem 1894, two volumes, eds. R. Shalom Yosef Araqi and R. Avraham Al-Naddaf, with Maharitz's commentary), scanned by the National Library of Israel from its copy NNL_ALEPH990011795220205171, "Public Domain, all use permitted". Each leaf is a 1802x2367 JPEG 2000 in the item's `_jp2.zip`. Its archive.org OCR is too poor to use. It prints every text section 2 lists as a gap, and Hallel, Musaf, the end of Shacharit and the Selichot of Elul.

The owner's call of 2026-11-03 (Q16): Claude transcribes the missing texts from this print, "with high scrutiny so as not to err", and the rav reviews the transcription (R15). The Rambam's wording is no longer needed for the short blessings, because the print has the Baladi wording itself.

Transcription contract:

- A transcription is a file under `scripts/siddur/source/tiklal-1894/`, a pinned `local` source of [manifest.js](../../scripts/siddur/manifest.js) read by the same Wikisource parser (`params` Baladi), credited to the print and the scan. It is pinned by the commit that holds it.
- Only the prayer column, never Maharitz's commentary. Letters, nikud, dagesh, the shin and sin dots, meteg, maqaf and the print's own punctuation exactly as printed; the divine name as printed (`baladiName()` shows it as יְיָ, the spelling of the Wikisource pages). Print line breaks are joined; a new printed paragraph or blessing is a new paragraph. A heading or an instruction in small or Rashi type is `{{הור|…}}` in plain letters. A new leaf is marked `<!-- V1 leaf N -->`.
- Every section is typed twice, by two passes that never see each other's work, from the same leaf range and boundary words. The two are compared character by character after NFC normalization; every difference, and every word either pass marked uncertain, is settled by a third look at the scan zoomed in, and the file records the leaves and that it was reconciled. A psalm or other verse is also checked letter by letter against the pinned Sefaria Tanach.
- Nothing is typed from memory. A word the scan does not show clearly is not guessed: the section waits until it is settled.

## 6. Open

The gaps of section 2 and the missing parts of Shacharit in section 3 decide whether the nusach can ship under the standing rule that every text ships for all nuschaot. Q16 in [not-close.md](../../not-close.md) was answered on 2026-11-03: section 5.
