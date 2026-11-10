// What the halacha add-on (scripts/halacha/build.js) reads from Sefaria and how it cuts it: the three tracks, the
// versions each pins, the festival material of each track and the Ben Ish Chai parasha map.
const path = require('path');

const SEFARIA = 'https://www.sefaria.org';
const SITE_DIR = path.join(__dirname, '..', '..', 'docs', 'halacha');
const SCHEDULE_DIR = path.join(__dirname, 'schedules');
const FORMAT = 1;
const TRACKS = ['kitzur', 'ben_ish_chai', 'rambam'];

// The book of each track, as the credit and the portion labels name it.
const BOOK = {
  kitzur: { he: 'קיצור שולחן ערוך', en: 'Kitzur Shulchan Aruch' },
  ben_ish_chai: { he: 'בן איש חי', en: 'Ben Ish Chai' },
  rambam: { he: 'משנה תורה לרמב״ם', en: "Rambam's Mishneh Torah" },
};

// Kitzur Shulchan Aruch: one Hebrew version, a unit per block of simanim.
const KITZUR = {
  index: 'Kitzur Shulchan Arukh',
  he: 'Torat Emet 357',
  simanim: 221,
  seifim: 2765,
  block: 10,
};

// Ben Ish Chai: the halachot of both years, without the drashot. Sefaria's 1898 Jerusalem version holds the node
// shape with empty halachot (read 2026-11-10), so the Wikisource transcription is the source.
const BEN_ISH_CHAI = {
  index: 'Ben Ish Hai',
  he: 'Ben Ish Hai -- Wikisource',
  years: ['Halachot 1st Year', 'Halachot 2nd Year'],
  // The second year's Vayeshev is only the author's note that he teaches the laws of Chanukah in it every year.
  skip: [[2, 'Vayeshev']],
};

// Mishneh Torah: a Hebrew version per book, the first of these the book has (the introduction books have no Torat
// Emet text; the Overview only Wikisource's). Never a version from Mechon Mamre (BANNED_SOURCE).
const RAMBAM_HE = ['Torat Emet 363', 'Mishneh Torah', 'Wikisource Mishneh Torah'];

// Mechon Mamre allows its texts for private study and teaching only, "not for publishing in any form, including any
// Web site" (mechon-mamre.org/copy.htm, read 2026-11-10), and Sefaria serves its text under more than one title, so a
// version is refused by its source.
const BANNED_SOURCE = /mechon-mamre\.org/i;

// Halachot every Hebrew version of Sefaria leaves empty at their address (read 2026-11-10); any other empty halacha
// fails the build.
const RAMBAM_EMPTY = ['Torah Study 7:8'];

// English: a version is used only under one of these licences, in this order of preference (spec 5.3).
const ENGLISH_LICENCES = ['CC0', 'Public Domain', 'CC-BY'];
// A track ships English when this share of its Hebrew segments has a translation.
const ENGLISH_THRESHOLD = 0.9;

// Each festival's material per track: Kitzur by siman range, Rambam by book and chapter range, Ben Ish Chai by year,
// node and an optional halacha range. A festival a track lacks is absent (spec 7.2).
const FESTIVALS = {
  pesach: { days: 30, he: 'פסח', en: 'Pesach' },
  shavuot: { days: 30, he: 'שבועות', en: 'Shavuot' },
  sukkot: { days: 30, he: 'סוכות', en: 'Sukkot' },
  rosh_hashanah: { days: 29, he: 'ראש השנה', en: 'Rosh Hashanah' },
  yom_kippur: { days: 7, he: 'יום הכיפורים', en: 'Yom Kippur' },
  chanukah: { days: 14, he: 'חנוכה', en: 'Chanukah' },
  purim: { days: 14, he: 'פורים', en: 'Purim' },
  tisha_bav: { days: 21, he: 'תשעה באב', en: "Tisha B'Av" },
  tzom_gedaliah: { days: 3, he: 'צום גדליה', en: 'Tzom Gedaliah' },
  asara_betevet: { days: 3, he: 'עשרה בטבת', en: 'Asara BeTevet' },
  taanit_esther: { days: 3, he: 'תענית אסתר', en: "Ta'anit Esther" },
  shiva_asar_betammuz: { days: 3, he: 'שבעה עשר בתמוז', en: 'Shiva Asar BeTammuz' },
};

const MINOR_FASTS = ['tzom_gedaliah', 'asara_betevet', 'taanit_esther', 'shiva_asar_betammuz'];

const fastsOf = (material) => Object.fromEntries(MINOR_FASTS.map((fast) => [fast, material]));

const FESTIVAL_MATERIAL = {
  kitzur: {
    pesach: [[107, 119]],
    shavuot: [[98, 103]],
    sukkot: [[134, 138]],
    rosh_hashanah: [[128, 130]],
    yom_kippur: [[131, 133]],
    chanukah: [[139, 139]],
    purim: [[140, 142]],
    tisha_bav: [[122, 126]],
    ...fastsOf([[121, 121]]),
  },
  rambam: {
    pesach: [['Leavened and Unleavened Bread']],
    shavuot: [['Rest on a Holiday']],
    sukkot: [['Shofar, Sukkah and Lulav', 4, 8]],
    rosh_hashanah: [['Shofar, Sukkah and Lulav', 1, 3], ['Repentance']],
    yom_kippur: [['Rest on the Tenth of Tishrei']],
    chanukah: [['Scroll of Esther and Hanukkah', 3, 4]],
    purim: [['Scroll of Esther and Hanukkah', 1, 2]],
    tisha_bav: [['Fasts', 5, 5]],
    ...fastsOf([['Fasts', 1, 4]]),
  },
  ben_ish_chai: {
    pesach: [[1, 'Tzav']],
    shavuot: [[1, 'Bamidbar']],
    sukkot: [
      [1, "Ha'Azinu"],
      [1, "V'Zot HaBerachah"],
    ],
    rosh_hashanah: [[1, 'Nitzavim']],
    yom_kippur: [[1, 'Vayeilech']],
    chanukah: [[1, 'Chanukah']],
    // Tetzaveh's halachot 1-23 are the Priestly Blessing; 24 opens "הלכות אלו שייכים לפורים".
    purim: [[1, 'Tetzaveh', 24]],
    tisha_bav: [[1, 'Devarim']],
  },
};

// Ben Ish Chai node of each parasha (the 54 of scripts/chok/manifest.js), per year; a combined node serves both of its
// parashiyot, and a parasha the year lacks is absent.
const BIH_NODE = {
  1: {
    Tazria: 'Tazria Metzora',
    Metzora: 'Tazria Metzora',
    'Achrei Mot': 'Achrei Mot Kedoshim',
    Kedoshim: 'Achrei Mot Kedoshim',
    Behar: 'Behar Bechukotai',
    Bechukotai: 'Behar Bechukotai',
    "Ha'azinu": "Ha'Azinu",
    'Vezot Haberakhah': "V'Zot HaBerachah",
  },
  2: {
    Behar: 'Behar Bechukotai',
    Bechukotai: 'Behar Bechukotai',
    // "בפרשה זו לא כתבתי הלכות בשנה שניה יען כי לדרוש בפרשה זו בהלכות חנוכה בכל שנה ושנה": the first year's Chanukah.
    Vayeshev: 'Chanukah',
  },
};

module.exports = {
  SEFARIA,
  SITE_DIR,
  SCHEDULE_DIR,
  FORMAT,
  TRACKS,
  BOOK,
  KITZUR,
  BEN_ISH_CHAI,
  RAMBAM_HE,
  BANNED_SOURCE,
  RAMBAM_EMPTY,
  ENGLISH_LICENCES,
  ENGLISH_THRESHOLD,
  FESTIVALS,
  MINOR_FASTS,
  FESTIVAL_MATERIAL,
  BIH_NODE,
};
