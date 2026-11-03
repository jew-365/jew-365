const { gematriya } = require('@hebcal/core');

const SEFARIA = 'https://www.sefaria.org';

const METSUDAH_ASHKENAZ = {
  title: 'Siddur Ashkenaz — The Metsudah Siddur, Avrohom Davis (1981)',
  license: 'CC-BY',
  url: `${SEFARIA}/Siddur_Ashkenaz`,
};
const METSUDAH_SEFARD = {
  title: 'Siddur Sefard — The Metsudah Siddur, Avrohom Davis (1981)',
  license: 'CC-BY',
  url: `${SEFARIA}/Siddur_Sefard`,
};
const METSUDAH_SHABBAT = {
  title: 'Shabbat Siddur Sefard Linear — The Metsudah Siddur (1981)',
  license: 'CC-BY',
  url: `${SEFARIA}/Shabbat_Siddur_Sefard_Linear`,
};
const METSUDAH_YOM_KIPPUR = {
  title: 'Machzor Yom Kippur Ashkenaz Linear — The Metsudah Machzor',
  license: 'CC-BY',
  url: `${SEFARIA}/Machzor_Yom_Kippur_Ashkenaz_Linear`,
};

// Hebrew Wikisource pages read as nusach Teiman Baladi: a page that prints several nuschaot at once
// gives its Baladi wording through `params` (`{{{נוסח}}}` is בלדי).
function baladiSources(pages) {
  return Object.fromEntries(
    Object.entries(pages).map(([key, [page, revision, title, prepare]]) => [
      key,
      {
        wikisource: page,
        revision,
        lang: 'he',
        params: { נוסח: 'בלדי' },
        ...(prepare && { prepare }),
        credit: {
          title: `${title} — Hebrew Wikisource`,
          license: 'CC-BY-SA',
          url: `https://he.wikisource.org/w/index.php?oldid=${revision}`,
        },
      },
    ]),
  );
}

// The 1894 Tiklal Etz Chaim transcribed under source/tiklal-1894/ (spec nusach-teiman.md, section 5): wikitext
// read as a Baladi page, pinned by the commit that holds it.
function tiklalSources(units) {
  return Object.fromEntries(
    Object.entries(units).map(([key, [unit, title]]) => [
      key,
      {
        local: `tiklal-1894/${unit}.wiki`,
        lang: 'he',
        params: { נוסח: 'בלדי' },
        credit: {
          title: `${title} — Tiklal Etz Chaim, Jerusalem 1894 (transcription)`,
          license: 'Public Domain',
          url: 'https://archive.org/details/Tiklal_Eiz_Hayyim_Jerusalem_1894',
        },
      },
    ]),
  );
}

// A source's `prepare` rewrites its wikitext before it is read, each replacement matching exactly once,
// for markup the build does not read: a call on today's date in a branch the Baladi reading drops.
function rewrite(...replacements) {
  return (wikitext, key) =>
    replacements.reduce((text, [from, to]) => {
      const count = text.split(from).length - 1;
      if (count !== 1) throw new Error(`${key}: prepare "${from.slice(0, 60)}" matched ${count}x, expected 1`);
      return text.replace(from, () => to);
    }, wikitext);
}

// A {{#בחר}} on today's date becomes every one of its cases, each a paragraph that opens with its label.
function allCases(count) {
  return (wikitext, key) => {
    const cases = [...wikitext.matchAll(/^\|([^=\n]+)=(.+)$/gm)];
    if (cases.length !== count) throw new Error(`${key}: expected ${count} cases, found ${cases.length}`);
    return cases
      .map(([, label, text]) => `<small>${label.trim()}</small> ${text.replace(/\}\}$/, '').trim()}`)
      .join('\n\n');
  };
}

const SOURCES = {
  metsudahAshkenazHe: {
    title: 'Siddur Ashkenaz',
    lang: 'he',
    version: 'The Metsudah siddur, 1981',
    credit: METSUDAH_ASHKENAZ,
    translationMemory: 'metsudahAshkenazEn',
  },
  metsudahAshkenazEn: {
    title: 'Siddur Ashkenaz',
    lang: 'en',
    version: 'Translation based on the Metsudah linear siddur, by Avrohom Davis, 1981',
    patches: [
      {
        from: 'Rabbi Eliezer said on behalf of Rabbi Chanina',
        to: 'Rabbi Elazar said on behalf of Rabbi Chanina',
        count: 2,
      },
      {
        from: '<i>Fundamentals of </i>Kuzari,<i> (Metsudah Publications, 1979) pages 269, 271, 273.<br>',
        to: '<i>',
        count: 3,
      },
      { from: ' (page 133)', to: '', count: 3 },
      { from: ' (page 140)', to: '', count: 3 },
    ],
    credit: METSUDAH_ASHKENAZ,
  },
  metsudahSefardHe: {
    title: 'Siddur Sefard',
    lang: 'he',
    version: 'The Metsudah siddur, 1981',
    credit: METSUDAH_SEFARD,
    translationMemory: 'metsudahSefardEn',
  },
  metsudahSefardEn: {
    title: 'Siddur Sefard',
    lang: 'en',
    version: 'Translation based on the Metsudah linear siddur, by Avrohom Davis, 1981',
    patches: [
      { from: 'hasten the coming if His Messiah', to: 'hasten the coming of His Messiah', count: 11 },
      { from: 'pay need to their prayer', to: 'pay heed to their prayer', count: 2 },
      { from: 'humble and any modest', to: 'humble and modest', count: 6 },
      {
        from: 'Rabbi Eliezer said on behalf of Rabbi Chanina',
        to: 'Rabbi Elazar said on behalf of Rabbi Chanina',
        count: 2,
      },
      {
        from: 'Fundamentals of <i>Kuzari,</i> (Metsudah Publications, 1979) pages 269, 271, 273.<br>',
        to: '',
        count: 1,
      },
      { from: ' (page 133)', to: '', count: 1 },
      { from: ' (page 140)', to: '', count: 1 },
    ],
    credit: METSUDAH_SEFARD,
  },
  metsudahShabbatHe: {
    title: 'Shabbat Siddur Sefard Linear',
    lang: 'he',
    version: 'The Metsudah Siddur, Metsudah Publications, 1981 - HE',
    credit: METSUDAH_SHABBAT,
  },
  metsudahShabbatEn: {
    title: 'Shabbat Siddur Sefard Linear',
    lang: 'en',
    version: 'The Metsudah Siddur, Metsudah Publications, 1981 - EN',
    credit: METSUDAH_SHABBAT,
  },
  metsudahYomKippurHe: {
    title: 'Machzor Yom Kippur Ashkenaz Linear',
    lang: 'he',
    version: 'The Metsudah Machzor. Metsudah Publications, New York',
    credit: METSUDAH_YOM_KIPPUR,
  },
  metsudahYomKippurEn: {
    title: 'Machzor Yom Kippur Ashkenaz Linear',
    lang: 'en',
    version: 'The Metsudah Machzor. Metsudah Publications, New York',
    credit: METSUDAH_YOM_KIPPUR,
  },
  daatAshkenazHe: {
    title: 'Siddur Ashkenaz',
    lang: 'he',
    version: 'Daat Siddur Ashkenaz',
    credit: {
      title: 'Siddur Ashkenaz — Daat Siddur Ashkenaz',
      license: 'Public Domain',
      url: `${SEFARIA}/Siddur_Ashkenaz`,
    },
  },
  communityAshkenazEn: {
    title: 'Siddur Ashkenaz',
    lang: 'en',
    version: 'Sefaria Community Translation',
    credit: {
      title: 'Siddur Ashkenaz — Sefaria Community Translation',
      license: 'CC0',
      url: `${SEFARIA}/Siddur_Ashkenaz`,
    },
  },
  toratEmetSefardHe: {
    title: 'Siddur Sefard',
    lang: 'he',
    version: 'Torat Emet 357',
    credit: { title: 'Siddur Sefard — Torat Emet 357', license: 'Public Domain', url: `${SEFARIA}/Siddur_Sefard` },
  },
  wikiAshkenazAmidah: {
    wikisource: 'סידור/נוסח אשכנז/עמידה',
    revision: 3086024,
    lang: 'he',
    credit: {
      title: 'Siddur Nusach Ashkenaz — Hebrew Wikisource',
      license: 'CC-BY-SA',
      url: 'https://he.wikisource.org/w/index.php?oldid=3086024',
    },
  },
  edotHe: {
    title: 'Siddur Edot HaMizrach',
    lang: 'he',
    version: ' Shaliehsaboo Edition',
    credit: {
      title: 'Siddur Edot HaMizrach — Shaliehsaboo Edition',
      license: 'CC0',
      url: `${SEFARIA}/Siddur_Edot_HaMizrach`,
    },
  },
  edotEn: {
    title: 'Siddur Edot HaMizrach',
    lang: 'en',
    version: 'Sefaria Community Translation',
    patches: [
      { from: 'yolk of Your Kingship', to: 'yoke of Your Kingship', count: 3 },
      { from: 'bless you and guard them', to: 'bless you and guard you', count: 1 },
    ],
    credit: {
      title: 'Siddur Edot HaMizrach — Sefaria Community Translation',
      license: 'CC0',
      url: `${SEFARIA}/Siddur_Edot_HaMizrach`,
    },
  },
  chabadHe: {
    title: 'Weekday Siddur Chabad',
    lang: 'he',
    version: 'Wikisource',
    credit: {
      title: 'Weekday Siddur Chabad — Wikisource',
      license: 'CC-BY-SA',
      url: `${SEFARIA}/Weekday_Siddur_Chabad`,
    },
  },
  chabadEn: {
    title: 'Weekday Siddur Chabad',
    lang: 'en',
    version: 'Sefaria Community Translation',
    patches: [
      { from: 'beofre', to: 'before', count: 1 },
      { from: 'Withouth', to: 'Without', count: 1 },
      { from: 'beggining', to: 'beginning', count: 1 },
      { from: 'without an enf,', to: 'without an end,', count: 1 },
      { from: 'a potion of my cup', to: 'a portion of my cup', count: 1 },
    ],
    credit: {
      title: 'Weekday Siddur Chabad — Sefaria Community Translation',
      license: 'CC0',
      url: `${SEFARIA}/Weekday_Siddur_Chabad`,
    },
  },
  tanachNikkudHe: {
    title: 'Psalms',
    lang: 'he',
    version: 'Tanach with Nikkud',
    credit: { title: 'Psalms — Tanach with Nikkud', license: 'Public Domain', url: `${SEFARIA}/Psalms` },
  },
  wikiTikkunHaklali: {
    wikisource: 'תיקון הכללי',
    revision: 1390004,
    lang: 'he',
    credit: {
      title: 'Tikkun HaKlali — Hebrew Wikisource',
      license: 'CC-BY-SA',
      url: 'https://he.wikisource.org/w/index.php?oldid=1390004',
    },
  },
  ...baladiSources({
    wikiBaladiShacharit: [
      'סידור/נוסח תימן בלדי/שחרית לחול',
      3101143,
      'Siddur Nusach Teiman Baladi, Weekday Shacharit',
      rewrite(
        [
          '<div class="NavFrame" style="width:{{{רוחב|100%}}};">\n<div class="NavHead" style="text-align:center; float:{{{יישור|auto}}}">לעשרת ימי תשובה</div>\n<div class="NavContent" style="display:block; text-align:right">\n',
          '',
        ],
        ['{{מגירה|לשני וחמישי|\n', ''],
        ['סְלַח לָנוּ.}}\n}}\n', 'סְלַח לָנוּ.}}\n'],
      ),
    ],
    wikiBaladiMincha: ['סידור/נוסח תימן בלדי/מנחה לחול', 1076941, 'Siddur Nusach Teiman Baladi, Weekday Mincha'],
    wikiBaladiMaariv: ['סידור/נוסח תימן בלדי/חול/ערבית', 2896952, 'Siddur Nusach Teiman Baladi, Weekday Maariv'],
    wikiBaladiBedtimeShema: [
      'סידור/נוסח תימן בלדי/קריאת שמע שעל המיטה',
      3081614,
      'Siddur Nusach Teiman Baladi, Bedtime Shema',
    ],
    wikiBaladiBirkatHamazon: ['ברכת המזון/בלדי 2', 2929770, 'Birkat HaMazon, Nusach Teiman Baladi'],
    wikiBaladiZimun: ['ברכת המזון/בלדי', 2929642, 'Birkat HaMazon with the Zimun, Nusach Teiman Baladi'],
    wikiBaladiAlHamichya: ['ברכת מעין שלוש - נוסח תימן בלדי', 2896943, "Me'ein Shalosh, Nusach Teiman Baladi"],
    wikiBaladiShevaBerachot: ['שבע ברכות (בלדי)', 2903948, 'Sheva Berachot, Nusach Teiman Baladi'],
    wikiBoreiNefashot: ['ברכת בורא נפשות', 2896941, 'Borei Nefashot'],
    wikiOmer: [
      'סדר ספירת העומר',
      2929975,
      'The Order of Counting the Omer',
      rewrite(
        [
          "'''{{נוסחי תפילה קצרים|נוסח={{{נוסח|}}}|בלדי={{ספירת העומר/בלדי|יום={{תאריך עברי נוכחי|יח}}}}|כל השאר={{ספירת העומר|יום={{תאריך עברי נוכחי|יח}}|נוסח={{{נוסח|}}}}}}}'''",
          '{{ספירת העומר/בלדי}}',
        ],
        [' {{רגיל|({{ספירת העומר|ספירה={{תאריך עברי נוכחי|יח}}}})}}', ''],
      ),
    ],
    wikiBaladiOmerCount: [
      'תבנית:ספירת העומר/בלדי',
      400058,
      'The Omer Count, Nusach Teiman Baladi (template)',
      allCases(49),
    ],
    wikiAdonHaolamim: ['אדון העולמים', 3081615, 'Adon HaOlamim'],
    wikiHamehulal: ['המהולל', 3081625, 'HaMehulal'],
    wikiLefanechaAniKoreia: ['לפניך אני כורע', 3095956, "Lefanecha Ani Kore'a"],
    wikiAnaBechoach: ['אנא בכח', 3085666, 'Ana BeKoach'],
    wikiYihyuLeratzonTemplate: ['תבנית:יהיו לרצון', 3003259, 'Yihyu LeRatzon (template)'],
    wikiRepeatTemplate: ['תבנית:גפ', 3017024, 'Repeated verse (template)'],
    wikiBaladiSelichot: ['סידור/נוסח תימן בלדי/אשמורות', 3088391, 'Siddur Nusach Teiman Baladi, Ashmurot (Selichot)'],
    wikiYashenAlTeradam: ['ישן אל תרדם', 3086114, 'Yashen Al Teradam'],
    wikiYeiruniRayonai: ['יעירוני רעיוני', 3086118, 'Ye’iruni Ra’ayonai'],
    wikiBenAdamNirdam: ['בן אדם מה לך נרדם', 3086121, 'Ben Adam Mah Lecha Nirdam'],
    wikiKamtiVatidad: ['קמתי ותדד שנתי', 3086125, 'Kamti Vatidad Shenati'],
    wikiElokeiHatzevaot: ["ה' אלהי הצבאות יושב הכרובים", 3086128, 'Hashem Elokei HaTzeva’ot Yoshev HaKeruvim'],
    wikiEdotLechaHashem: [
      "סידור/נוסח עדות המזרח/סליחות לימי התשובה/לך ה' הצדקה",
      3089026,
      'Siddur Nusach Edot HaMizrach, Selichot for the Days of Repentance: Lecha Hashem HaTzedakah',
    ],
    wikiEleichaEkra: ["אליך ה' אקרא משגב לעתות בצרה", 3086142, 'Elecha Hashem Ekra Misgav LeItot BaTzarah'],
    wikiShevetYehuda: ['שבט יהודה בדוחק ובצער', 3083194, 'Shevet Yehudah BeDochak UveTza’ar'],
    wikiElMelechYoshev: ['אל מלך יושב על כיסא רחמים', 3037672, 'El Melech Yoshev Al Kisei Rachamim'],
    wikiBeetRatzon: ['בעת רצון תחנתי', 3086144, 'Be’et Ratzon Techinati'],
    wikiRachamanaIdkar: ['רחמנא אידכר לן', 3088017, 'Rachamana Idkar Lan'],
    wikiAnaKaav: ['אנא כעב זדוני תמחהו', 3086152, 'Ana Ka’av Zedoni Timcheihu'],
    wikiTamahnu: ['תמהנו מרעות', 3086155, 'Tamahnu MeRa’ot'],
    wikiAlTaasImanu: ['אל תעש עמנו כלה', 3086163, 'Al Ta’as Imanu Chalah'],
    wikiElokeinuShebashamayim: ['אלהינו שבשמים', 3088000, 'Elokeinu SheBashamayim'],
    wikiElokimAtaYadata: ['אלהים אתה ידעת', 3086171, 'Elokim Atah Yadata'],
    wikiAdonHaselichot: ['אדון הסליחות', 3087997, 'Adon HaSelichot'],
    wikiShomerYisrael: ['שומר ישראל', 3076936, 'Shomer Yisrael'],
    wikiMacheiUmasei: ['מחי ומסי', 3024318, 'Machei UMasei'],
    wikiErelei: ['אראלי מרומים', 3076717, 'Er’elei Meromim'],
    wikiMibeitMeloni: ['מבית מלוני קמתי בצוקי', 2999945, 'MiBeit Meloni Kamti BeTzuki'],
    wikiImTeehav: ['אם תאהב דרך', 2993381, 'Im Te’ehav Derech'],
    wikiMaranotTemplate: ['תבנית:מרנות', 3080265, 'Maranot (template)'],
  }),
  ...tiklalSources({
    tiklalTefilatHaderech: ['tefilat_haderech', "The Traveler's Prayer"],
    tiklalBirchotHanehenin: ['birchot_hanehenin', 'Blessings over Food and Fragrance'],
    tiklalBirchotHareiya: ['birchot_hareiya', 'Blessings of Sight and Praise'],
    tiklalCandleLighting: ['candle_lighting', 'Shabbat Candle Lighting'],
    tiklalMezuzah: ['mezuzah', 'Affixing a Mezuzah'],
    tiklalChanukahCandles: ['chanukah_candles', 'Lighting the Chanukah Candles'],
    tiklalKiddushLevana: ['kiddush_levana', 'Blessing of the Moon'],
    tiklalHavdalah: ['havdalah', 'Havdalah'],
    tiklalShacharitTorah: ['shacharit_torah', 'Weekday Shacharit: the Torah Reading and Uva LeTzion'],
    tiklalShacharitClose: ['shacharit_close', 'Weekday Shacharit: the Song of the Day to Aleinu'],
    tiklalMincha: ['mincha', 'Weekday Mincha'],
    tiklalHallel: ['hallel', 'Weekday Hallel'],
    tiklalMusaf: ['musaf', 'Musaf of Rosh Chodesh and the Festivals'],
    tiklalNishmat: ['nishmat', 'Nishmat Kol Chai'],
    tiklalVihiNoam: ['vihi_noam', "Maariv after Shabbat: Vihi No'am and V'Atah Kadosh"],
    tiklalTishaBavMaariv: ['tisha_bav_maariv', "Maariv of Tisha B'Av"],
    tiklalLulav: ['lulav', 'Taking the Lulav'],
  }),
  wikiBeforePsalms: {
    wikisource: 'תפילה לפני אמירת תהלים',
    revision: 1386519,
    lang: 'he',
    credit: {
      title: 'Prayer Before Saying Psalms — Hebrew Wikisource',
      license: 'CC-BY-SA',
      url: 'https://he.wikisource.org/w/index.php?oldid=1386519',
    },
  },
  selichotEdotHe: {
    title: 'Selichot Edot HaMizrach',
    lang: 'he',
    version: 'Selichot Edot HaMizrach - Torat Emet',
    credit: {
      title: 'Selichot Edot HaMizrach — Torat Emet',
      license: 'Public Domain',
      url: `${SEFARIA}/Selichot_Edot_HaMizrach`,
    },
  },
  selichotEdotEn: {
    title: 'Selichot Edot HaMizrach',
    lang: 'en',
    version: 'Sefaria Edition 2020, Translated by Rabbi Francis Nataf',
    credit: {
      title: 'Selichot Edot HaMizrach — Sefaria Edition 2020, translated by Rabbi Francis Nataf',
      license: 'CC0',
      url: `${SEFARIA}/Selichot_Edot_HaMizrach`,
    },
  },
  selichotLitaHe: {
    title: 'Selichot Nusach Ashkenaz Lita',
    lang: 'he',
    version: 'Selichot Nusach Lita -- Wikisource',
    credit: {
      title: 'Selichot Nusach Ashkenaz Lita — Wikisource',
      license: 'CC-BY-SA',
      url: `${SEFARIA}/Selichot_Nusach_Ashkenaz_Lita`,
    },
  },
  selichotLitaEn: {
    title: 'Selichot Nusach Ashkenaz Lita',
    lang: 'en',
    version: 'The Metsudah Selichos: translated and annotated by Rabbi Avrohom Davis, Metsudah Publications, 1986',
    patches: [{ from: 'ingore', to: 'ignore', count: 1 }],
    credit: {
      title: 'Selichot — The Metsudah Selichos, Avrohom Davis (1986)',
      license: 'CC-BY',
      url: `${SEFARIA}/Selichot_Nusach_Ashkenaz_Lita`,
    },
  },
  selichotChabadHe: {
    title: 'Selichot Nusach Ashkenaz Lita',
    lang: 'he',
    version: 'Nusach Chabad -- Based on text from Wikisource',
    credit: {
      title: 'Selichot Nusach Chabad — based on Wikisource',
      license: 'CC-BY-SA',
      url: `${SEFARIA}/Selichot_Nusach_Ashkenaz_Lita`,
    },
  },
  selichotPolinHe: {
    title: 'Selichot Nusach Polin',
    lang: 'he',
    version: 'Selichot Nusach Polin -- Wikisource',
    credit: {
      title: 'Selichot Nusach Polin — Wikisource',
      license: 'CC-BY-SA',
      url: `${SEFARIA}/Selichot_Nusach_Polin`,
    },
  },
  wikiAfterPsalms: {
    wikisource: 'תהלים מנוקד ומפוסק/תפילה לאחר אמירת תהלים',
    revision: 2917763,
    lang: 'he',
    credit: {
      title: 'Prayer After Saying Psalms — Hebrew Wikisource',
      license: 'CC-BY-SA',
      url: 'https://he.wikisource.org/w/index.php?oldid=2917763',
    },
  },
};

const CONDITIONAL_INSTRUCTION = [
  /בקיץ/,
  /בחורף/,
  /עשי ת|עשרת ימי/,
  /ראש חו?דש|בר ח /,
  /חנוכה/,
  /פורים/,
  /תענית/,
  /תשעה באב|ט אב/,
  /יום הכ[י]?פורים|יוה כ/,
  /יום טוב|יו ט/,
  /אם חל/,
  /שבת/,
  /מוצאי|מוצ ש/,
  /חול המועד|חוה מ/,
  /ניסן|אייר|סיון/,
  /מעוברת|עיבור/,
];

const ALWAYS_SAID = [
  /^ברוך שם כבוד מלכותו לעולם ועד$/,
  /^אמן$/,
  /^יתגדל ויתקדש שמה רבא/,
  /^(תתקבל|יהא שלמא|עושה שלום|על ישראל ועל רבנן) /,
];

const T = {
  tefillin: { he: 'הנחת תפילין', en: 'Putting on Tefillin' },
  rabbenuTam: { he: 'תפילין דרבנו תם', en: 'Rabbeinu Tam Tefillin' },
  tallitAndTefillin: { he: 'עטיפת טלית והנחת תפילין', en: 'Tallit and Tefillin' },
  modehAni: { he: 'מודה אני', en: 'Modeh Ani' },
  netilatYadayim: { he: 'נטילת ידיים', en: 'Washing the Hands' },
  asherYatzar: { he: 'אשר יצר', en: 'Asher Yatzar' },
  elokaiNeshama: { he: 'אלוקי נשמה', en: 'Elokai Neshama' },
  upon: { he: 'נטילת ידיים, אשר יצר ואלוקי נשמה', en: 'Washing, Asher Yatzar and Elokai Neshama' },
  torahBlessings: { he: 'ברכות התורה', en: 'Blessings of the Torah' },
  morningBlessings: { he: 'ברכות השחר', en: 'Morning Blessings' },
  shema: { he: 'קריאת שמע', en: 'The Shema' },
  omer: { he: 'ספירת העומר', en: 'Counting of the Omer' },
  candlesShabbat: { he: 'הדלקת נרות שבת', en: 'Shabbat Candle Lighting' },
  candlesYomTov: { he: 'הדלקת נרות יום טוב', en: 'Yom Tov Candle Lighting' },
  candlesShabbatYomTov: { he: 'הדלקת נרות שבת ויום טוב', en: 'Shabbat and Yom Tov Candle Lighting' },
  candlesYomKippur: { he: 'הדלקת נרות יום הכיפורים', en: 'Yom Kippur Candle Lighting' },
  candlesShabbatYomKippur: { he: 'הדלקת נרות שבת ויום הכיפורים', en: 'Shabbat and Yom Kippur Candle Lighting' },
  havdalahVerses: { he: 'פסוקי ההבדלה', en: 'Opening Verses' },
  havdalahWine: { he: 'על היין', en: 'Over the Wine' },
  havdalahSpices: { he: 'על הבשמים', en: 'Over the Spices' },
  havdalahFire: { he: 'על הנר', en: 'Over the Flame' },
  havdalahBlessing: { he: 'ברכת המבדיל', en: 'The Havdalah Blessing' },
  havdalah: { he: 'סדר הבדלה', en: 'Havdalah' },
  hachelAleinu: { he: 'החל עלינו', en: 'Hachel Aleinu' },
  korbanot: { he: 'קרבנות', en: 'Offerings' },
  ashrei: { he: 'אשרי', en: 'Ashrei' },
  amidah: { he: 'תפילת העמידה', en: 'The Amidah' },
  avinuMalkeinu: { he: 'אבינו מלכנו', en: 'Avinu Malkeinu' },
  tachanun: { he: 'תחנון', en: 'Tachanun' },
  kaddish: { he: 'קדיש', en: 'Kaddish' },
  kaddishAfterAdditions: { he: 'קדיש שלם', en: 'Full Kaddish' },
  aleinu: { he: 'עלינו לשבח', en: 'Aleinu' },
  mournersKaddish: { he: 'קדיש יתום', en: "Mourner's Kaddish" },
  vehuRachum: { he: 'והוא רחום', en: 'Vehu Rachum' },
  barchu: { he: 'ברכו', en: 'Barchu' },
  shemaBlessings: { he: 'קריאת שמע וברכותיה', en: 'The Shema and its Blessings' },
  motzaeiShabbat: { he: 'ויהי נועם ואתה קדוש', en: "Vihi No'am and V'Atah Kadosh" },
  alNaharotBavel: { he: 'על נהרות בבל', en: 'Al Naharot Bavel' },
  ledavid: { he: 'לדוד ה׳ אורי', en: 'LeDavid' },
  mournersHouse: { he: 'בבית האבל', en: 'In a House of Mourning' },
  shirLamaalot: { he: 'שיר למעלות', en: 'Song of Ascents' },
  closingBarchu: { he: 'ברכו לסיום', en: 'Closing Barchu' },
  yehiShem: { he: 'יהי שם', en: 'Yehi Shem' },
  psalm: { he: 'מזמור', en: 'Psalm' },
  afterMaarivPsalms: { he: 'מזמורים לאחר התפילה', en: 'Psalms After the Prayer' },
  rabbiChananya: { he: 'רבי חנניא בן עקשיא', en: 'Rabbi Chananya ben Akashya' },
  barchiNafshi: { he: 'ברכי נפשי', en: 'Barchi Nafshi' },
  shirHamaalot: { he: 'שיר המעלות', en: 'A Song of Ascents' },
  alTira: { he: 'אל תירא', en: 'Al Tira' },
  maTovu: { he: 'מה טובו', en: 'Mah Tovu' },
  adonOlam: { he: 'אדון עולם', en: 'Adon Olam' },
  yigdal: { he: 'יגדל', en: 'Yigdal' },
  akedah: { he: 'פרשת העקדה', en: 'The Binding of Isaac' },
  sovereignty: { he: 'לעולם יהא אדם', en: 'Accepting the Kingship of Heaven' },
  hodu: { he: 'הודו', en: 'Hodu' },
  pesukeiDezimra: { he: 'פסוקי דזמרה', en: 'Pesukei Dezimra' },
  vidui: { he: 'וידוי וי"ג מידות', en: 'Confession and the Thirteen Attributes' },
  halfKaddish: { he: 'חצי קדיש', en: 'Half Kaddish' },
  lulav: { he: 'נטילת לולב', en: 'Taking the Lulav' },
  hallel: { he: 'הלל', en: 'Hallel' },
  torahReading: { he: 'קריאת התורה', en: 'The Torah Reading' },
  uvaLetzion: { he: 'אשרי ובא לציון', en: 'Ashrei and Uva Letzion' },
  musaf: { he: 'מוסף', en: 'Musaf' },
  songOfDay: { he: 'שיר של יום', en: 'Song of the Day' },
  einKelokeinu: { he: 'אין כאלהינו', en: 'Ein Keloheinu' },
  ketoret: { he: 'פטום הקטורת', en: 'Pitum HaKetoret' },
  tachanunConclusion: { he: 'סיום התחנון', en: 'Conclusion of Tachanun' },
  returningTorah: { he: 'הכנסת ספר התורה', en: 'Returning the Torah' },
  beitYaakov: { he: 'בית יעקב', en: 'Beit Yaakov' },
  kaveh: { he: 'קוה אל ה׳', en: 'Kaveh El Hashem' },
  petichatEliyahu: { he: 'פתח אליהו', en: 'Patach Eliyahu' },
  hannah: { he: 'תפילת חנה', en: "Hannah's Prayer" },
  selichot: { he: 'סליחות', en: 'Selichot' },
  kamtiBeashmoret: { he: 'קמתי באשמורת', en: 'Kamti Beashmoret' },
  benAdam: { he: 'בן אדם', en: 'Ben Adam' },
  lechaHashemTzedaka: { he: 'לך ה׳ הצדקה', en: 'Lecha Hashem HaTzedakah' },
  selichotVidui: { he: 'וידוי', en: 'Confession' },
  hashemHuHaelokim: { he: 'ה׳ הוא האלהים', en: 'Hashem Hu HaElokim' },
  elokeinuShebashamayim: { he: 'אלהינו שבשמים', en: 'Our God in Heaven' },
  aneinu: { he: 'עננו', en: 'Aneinu' },
  ledavidElecha: { he: 'לדוד אליך', en: 'LeDavid Elecha' },
  nishmat: { he: 'נשמת כל חי', en: 'Nishmat Kol Chai' },
  alTizkor: { he: 'אל תזכר לנו', en: 'Al Tizkor Lanu' },
  shemaKoleinu: { he: 'שמע קולנו', en: 'Shema Koleinu' },
  elRachumShimcha: { he: 'אל רחום שמך', en: 'El Rachum Shimcha' },
  macheiUmasei: { he: 'מחי ומסי', en: 'Machei UMasei' },
  shemaYisrael: { he: 'שמע ישראל', en: 'Shema Yisrael' },
  anaHashemHaelHagadol: { he: 'אנא ה׳ האל הגדול', en: 'Ana Hashem HaEl HaGadol' },
  meshiachTzidkecha: { he: 'משיח צדקך', en: 'Meshiach Tzidkecha' },
  machniseiRachamim: { he: 'מכניסי רחמים', en: 'Machnisei Rachamim' },
  elMelechYoshev: { he: 'אל מלך יושב', en: 'El Melech Yoshev' },
  vaanachnuLoNeda: { he: 'ואנחנו לא נדע', en: "Va'anachnu Lo Neda" },
  alTavoBemishpat: { he: 'אל תבא במשפט', en: 'Al Tavo BeMishpat' },
  megillah: { he: 'קריאת המגילה', en: 'Reading of the Megillah' },
  festivalPsalm: { he: 'מזמור לחג', en: 'Psalm of the Festival' },
  sixRemembrances: { he: 'שש זכירות', en: 'Six Remembrances' },
  beforeBirkat: { he: 'לפני ברכת המזון', en: 'Before Grace' },
  zimun: { he: 'זימון', en: 'Zimun' },
  zimunShevaBerachot: { he: 'זימון בסעודת שבע ברכות', en: 'Zimun at a Sheva Berachot Meal' },
  zimunBritMilah: { he: 'זימון בסעודת ברית מילה', en: 'Zimun at a Brit Milah Meal' },
  shevaBerachot: { he: 'שבע ברכות', en: 'Sheva Berachot' },
  birkatHamazon: { he: 'ברכת המזון', en: 'Grace After Meals' },
  harachaman: { he: 'הרחמן', en: 'Harachaman' },
  harachamanMilah: { he: 'הרחמן לברית מילה', en: 'Harachaman for a Brit Milah' },
  forgotYaalehVeyavo: { he: 'אם שכח יעלה ויבוא', en: 'If Yaaleh Veyavo Was Forgotten' },
  alHamichya: { he: 'ברכה מעין שלוש', en: "Me'ein Shalosh" },
  alHamichyaIsrael: { he: 'לפירות ארץ ישראל', en: 'For Produce of the Land of Israel' },
  boreiNefashot: { he: 'בורא נפשות', en: 'Borei Nefashot' },
  tefilatHaderech: { he: 'תפילת הדרך', en: "The Traveler's Prayer" },
  derechVerses: { he: 'פסוקים לשמירה בדרך', en: 'Verses for Protection on the Way' },
  enteringCity: { he: 'בכניסה לעיר וביציאה ממנה', en: 'Entering and Leaving a City' },
  seaPrayer: { he: 'תפילה לעוברי ימים ונהרות', en: 'Prayer for Travel by Sea or River' },
  airPrayer: { he: 'תפילת הדרך לטסים', en: 'Prayer for Air Travel' },
  mezuzah: { he: 'קביעת מזוזה', en: 'Affixing a Mezuzah' },
  handWashing: { he: 'נטילת ידיים לסעודה', en: 'Washing Hands Before Bread' },
  hamotzi: { he: 'המוציא', en: 'Over Bread' },
  mezonot: { he: 'בורא מיני מזונות', en: 'Over Grain Foods' },
  hagafen: { he: 'בורא פרי הגפן', en: 'Over Wine' },
  haetz: { he: 'בורא פרי העץ', en: 'Over Tree Fruit' },
  haadama: { he: 'בורא פרי האדמה', en: 'Over Produce of the Ground' },
  shehakol: { he: 'שהכל נהיה בדברו', en: 'Over Other Foods and Drinks' },
  fragrance: { he: 'ברכות הריח', en: 'Over Fragrances' },
  shehecheyanu: { he: 'שהחיינו', en: 'Shehecheyanu' },
  leshemYichud: { he: 'לשם יחוד', en: 'Leshem Yichud' },
  ribbonoShelOlam: { he: 'רבונו של עולם', en: 'Ribbono Shel Olam' },
  hamapil: { he: 'ברכת המפיל', en: 'Hamapil' },
  hashkivenu: { he: 'השכיבנו', en: 'Hashkivenu' },
  bedtimePsalms: { he: 'ויהי נועם ומזמורים', en: "Vihi No'am and Psalms" },
  baruchHashemBayom: { he: 'ברוך ה׳ ביום ויראו עינינו', en: 'Baruch Hashem by Day and Yiru Eineinu' },
  protectionVerses: { he: 'פסוקי שמירה', en: 'Verses of Protection' },
  shirHamaalotRigzu: { he: 'שיר למעלות ורגזו', en: 'Song of Ascents and Rigzu' },
  bedtimeVidui: { he: 'וידוי', en: 'Confession' },
  fourDeaths: { he: 'קבלת ארבע מיתות בית דין', en: 'Accepting the Four Court Penalties' },
  anaBekoach: { he: 'אנא בכח', en: 'Ana BeKoach' },
  psalm51: { he: 'מזמור נא', en: 'Psalm 51' },
  versesBeforeSleep: { he: 'פסוקים לפני השינה', en: 'Verses Before Sleep' },
  ribonHaolamim: { he: 'רבון העולמים', en: 'Ribon Haolamim' },
  beforeRelations: { he: 'לפני תשמיש המטה', en: 'Before Marital Relations' },
  atahTakum: { he: 'אתה תקום ובידך אפקיד', en: 'Atah Takum and Beyadcha Afkid' },
  lightningThunder: { he: 'ברק ורעם', en: 'Lightning and Thunder' },
  rainbow: { he: 'הקשת', en: 'A Rainbow' },
  sea: { he: 'הים הגדול', en: 'The Great Sea' },
  trees: { he: 'ברכת האילנות', en: 'Trees in Blossom' },
  praise: { he: 'ברכות שבח והודאה', en: 'Further Blessings of Praise' },
  mountainsAndSeas: { he: 'הרים, ימים ונהרות', en: 'Mountains, Seas and Rivers' },
  sun: { he: 'ברכת החמה', en: 'Blessing of the Sun' },
  levanaOpening: { he: 'פתיחה', en: 'Opening' },
  levanaBlessing: { he: 'ברכת הלבנה', en: 'Blessing of the Moon' },
  levanaPsalms: { he: 'פסוקים ומזמורים', en: 'Verses and Psalms' },
  kaddishDerabbanan: { he: 'קדיש דרבנן', en: 'Kaddish DeRabbanan' },
  levanaEnding: { he: 'סיום', en: 'Conclusion' },
  chanukahPlacement: { he: 'הנחת הנרות', en: 'Placing the Candles' },
  chanukahBlessings: { he: 'ברכות הדלקת נרות חנוכה', en: 'Blessings for Lighting the Chanukah Candles' },
  hanerotHallalu: { he: 'הנרות הללו', en: 'Hanerot Hallalu' },
  maozTzur: { he: 'מעוז צור', en: 'Maoz Tzur' },
  psalm30: { he: 'מזמור שיר חנוכת הבית', en: 'Psalm 30: Dedication of the House' },
  psalm33: { he: 'מזמור לג', en: 'Psalm 33' },
  psalm67: { he: 'מזמור סז', en: 'Psalm 67' },
  psalm111: { he: 'מזמור קיא', en: 'Psalm 111' },
  psalm112: { he: 'מזמור קיב', en: 'Psalm 112' },
  psalm133: { he: 'מזמור קלג', en: 'Psalm 133' },
  vihiNoamYoshev: { he: 'ויהי נועם ויושב בסתר', en: "Vihi No'am and Yoshev BeSeter" },
  tikkunBefore: { he: 'תפילה לפני התיקון', en: 'Prayer Before the Tikkun' },
  tikkunAfter: { he: 'תפילה אחרי התיקון', en: 'Prayer After the Tikkun' },
  tehillimBefore: { he: 'תפילה לפני אמירת תהלים', en: 'Prayer Before Tehillim' },
  tehillimAfter: { he: 'תפילה לאחר אמירת תהלים', en: 'Prayer After Tehillim' },
  enteringSukkah: { he: 'הכניסה לסוכה', en: 'Entering the Sukkah' },
  ushpizin: { he: 'אושפיזין', en: 'Ushpizin' },
  sittingInSukkah: { he: 'בישיבה בסוכה', en: 'Sitting in the Sukkah' },
  sukkahDayVerses: { he: 'פסוקי היום בסוכה', en: "The Day's Verses in the Sukkah" },
  ushpizinChair: { he: 'כסא האושפיזין', en: "The Ushpizin's Chair" },
  selichotPsalms: { he: 'מזמורי תהלים', en: 'Psalms' },
  yashenAlTeradam: { he: 'ישן אל תרדם', en: 'Yashen Al Teradam' },
  yeiruniRayonai: { he: 'יעירוני רעיוני', en: "Ye'iruni Ra'ayonai" },
  reshut: { he: 'רשות לשליח הציבור', en: "The Chazzan's Reshut" },
  psalm17: { he: 'תהלים יז', en: 'Psalm 17' },
  elokeiHatzevaot: { he: 'ה׳ אלהי הצבאות', en: "Hashem Elokei HaTzeva'ot" },
  elechaEkra: { he: 'אליך ה׳ אקרא', en: 'Elecha Hashem Ekra' },
  shevetYehuda: { he: 'שבט יהודה', en: 'Shevet Yehudah' },
  beetRatzon: { he: 'בעת רצון תחנתי', en: "Be'et Ratzon Techinati" },
  rachamanaIdkar: { he: 'רחמנא אידכר לן', en: 'Rachamana Idkar Lan' },
  anaKaav: { he: 'אנא כעב', en: "Ana Ka'av" },
  ansheiEmuna: { he: 'אנשי אמונה', en: 'Anshei Emunah' },
  tamahnu: { he: 'תמהנו מרעות', en: "Tamahnu MeRa'ot" },
  alTaasImanu: { he: 'אל תעש עמנו כלה', en: "Al Ta'as Imanu Chalah" },
  chatanuTzurenu: { he: 'חטאנו צורנו', en: 'Chatanu Tzurenu' },
  elokimAtaYadata: { he: 'אלהים אתה ידעת', en: 'Elokim Atah Yadata' },
  adonHaselichot: { he: 'אדון הסליחות', en: 'Adon HaSelichot' },
  asehLemaan: { he: 'עשה למען שמך', en: "Aseh Lema'an Shemach" },
  deaneiLaaniyei: { he: 'דעני לעניי', en: "De'anei La'aniyei" },
  imAfes: { he: 'אם אפס', en: 'Im Afes' },
  lemitvadeh: { he: 'למתודה חטאתיו', en: "LeMitvadeh Chata'av" },
  elokeiYisrael: { he: 'ה׳ אלהי ישראל', en: 'Hashem Elokei Yisrael' },
  imAshamenu: { he: 'אם אשמנו', en: 'Im Ashamenu' },
  atanu: { he: 'אתאנו לחלות פניך', en: 'Atanu Lechalot Panecha' },
  maranot: { he: 'מרנות', en: 'Maranot' },
  erelei: { he: 'אראלי מרומים', en: "Er'elei Meromim" },
  avinuAvHarachaman: { he: 'אבינו אב הרחמן', en: 'Avinu Av HaRachaman' },
  elErechApayim: { he: 'אל ארך אפים', en: 'El Erech Apayim' },
  mibeitMeloni: { he: 'מבית מלוני', en: 'MiBeit Meloni' },
  imTeehav: { he: 'אם תאהב', en: "Im Te'ehav" },
};

const NOT_TISHA_BAV = { none: ['tishaBav'] };
const NOT_SHABBAT_YOM_TOV = { none: ['shabbat', 'yomTov'] };
// Spices only on motzaei Shabbat; the flame on motzaei Shabbat and on motzaei Yom Kippur (from a
// flame that burned through the fast). Positive conditions, so motzaei Yom Tov and the Sunday night
// after a deferred Tisha B'Av, which carry no flag of their own, come out as wine and Hamavdil only.
const HAVDALAH_SPICES = { any: ['motzaeiShabbat'], none: ['tishaBav'] };
const HAVDALAH_FLAME = { any: ['motzaeiShabbat', 'dayAfterYomKippur'] };
const HAVDALAH_FLAME_NOTES = [
  {
    he: '<small>במוצאי יום הכיפורים מברכים על נר ששבת, שדלק מערב יום הכיפורים</small>',
    en: 'At the conclusion of Yom Kippur, the blessing is said over a flame that has burned since before Yom Kippur.',
    when: { all: ['dayAfterYomKippur'] },
  },
  {
    he: '<small>במוצאי שבת שחל בו תשעה באב מברכים הלילה רק על הנר, ואת ההבדלה על הכוס אומרים בצאת הצום בלי בשמים ובלי נר</small>',
    en: 'When Tisha B’Av begins at the end of Shabbat, only the blessing over the flame is said tonight. Havdalah over the cup is said when the fast ends, without spices or flame.',
    when: { all: ['tishaBav'] },
  },
];
// The Metsudah Yom Kippur machzor marks the verses "במוצאי שבת מתחילין כאן" and the wine "בחול
// מתחילין כאן", which is certain for Ashkenaz only.
const HAVDALAH_WEEKDAY_YOM_KIPPUR_NOTE = {
  he: '<small>במוצאי יום הכיפורים שחל בחול אין אומרים את הפסוקים, ומתחילים מהברכה על היין</small>',
  en: 'When Yom Kippur ends on a weekday, the verses are omitted and Havdalah begins with the blessing over the wine.',
  when: { all: ['dayAfterYomKippur'], none: ['motzaeiShabbat'] },
};
const NOT_FASTING_BAREFOOT = { none: ['tishaBav', 'yomKippur'] };
const SHEHECHEYANU = { all: ['shehecheyanu'] };
const CHANUKAH_FIRST_NIGHT = { all: ['chanukahFirstNight'] };
const onChanukahFirstNight = (note) => `<if all="chanukahFirstNight">${note}</if>`;
const afterChanukahFirstNight = (note) => `<if none="chanukahFirstNight">${note}</if>`;

function each(from, to, condition) {
  const map = {};
  for (let i = from; i <= to; i++) map[i] = condition;
  return map;
}

const AYT = 'aseretYemeiTeshuva';
const IN_AYT = { all: [AYT] };
const NOT_AYT = { none: [AYT] };
const WINTER = { all: ['winter'] };
const SUMMER = { none: ['winter'] };
const RAIN = { all: ['talUmatar'] };
const NO_RAIN = { none: ['talUmatar'] };
const FAST = { all: ['publicFast'] };
const FAST_NOT_AYT = { all: ['publicFast'], none: [AYT] };
const NOT_FAST = { none: ['publicFast'] };
const YAALEH_VEYAVO = { any: ['roshChodesh', 'cholHamoedPesach', 'cholHamoedSukkot'] };
const AL_HANISSIM = { any: ['chanukah', 'purim'] };
// A meal begun before sunset keeps yesterday's insert: the day after carries it folded, under a label
// naming the circumstance, and the day itself shows it open.
const YAALEH_VEYAVO_YESTERDAY = {
  any: ['roshChodeshYesterday', 'cholHamoedPesachYesterday', 'cholHamoedSukkotYesterday'],
};
const YAALEH_VEYAVO_OR_YESTERDAY = { any: [...YAALEH_VEYAVO.any, ...YAALEH_VEYAVO_YESTERDAY.any] };
const ROSH_CHODESH_OR_YESTERDAY = { any: ['roshChodesh', 'roshChodeshYesterday'] };
const CHOL_HAMOED_PESACH_OR_YESTERDAY = { any: ['cholHamoedPesach', 'cholHamoedPesachYesterday'] };
const CHOL_HAMOED_SUKKOT_OR_YESTERDAY = { any: ['cholHamoedSukkot', 'cholHamoedSukkotYesterday'] };
const CHOL_HAMOED_OR_YESTERDAY = {
  any: [...CHOL_HAMOED_PESACH_OR_YESTERDAY.any, ...CHOL_HAMOED_SUKKOT_OR_YESTERDAY.any],
};
const AL_HANISSIM_YESTERDAY = { any: ['chanukahYesterday', 'purimYesterday'] };
const AL_HANISSIM_OR_YESTERDAY = { any: [...AL_HANISSIM.any, ...AL_HANISSIM_YESTERDAY.any] };
const CHANUKAH_OR_YESTERDAY = { any: ['chanukah', 'chanukahYesterday'] };
const PURIM_OR_YESTERDAY = { any: ['purim', 'purimYesterday'] };
const anyOf = (condition) => condition.any.join(',');
const CHANUKAH = { all: ['chanukah'] };
const PURIM = { all: ['purim'] };
const TISHA_BAV = { all: ['tishaBav'] };
const MOTZAEI = { all: ['motzaei'] };
const VI_HI_NOAM = { all: ['viHiNoam'] };
const VEATA_KADOSH = { any: ['viHiNoam', 'tishaBav', 'purim'] };
const MINCHA_TACHANUN = { all: ['tachanunMincha'] };
const MINCHA_AVINU_MALKEINU = { any: [AYT, 'publicFast'], all: ['tachanunMincha'] };
const OMER = { all: ['omer'] };
const LEDAVID = { all: ['ledavidSeason'] };
const NOT_IN_ISRAEL = { none: ['inIsrael'] };
const IN_ISRAEL = { all: ['inIsrael'] };
const ROSH_CHODESH = { all: ['roshChodesh'] };
const CHOL_HAMOED = { any: ['cholHamoedPesach', 'cholHamoedSukkot'] };
const CHOL_HAMOED_PESACH = { all: ['cholHamoedPesach'] };
const CHOL_HAMOED_SUKKOT = { all: ['cholHamoedSukkot'] };
const TACHANUN_SHACHARIT = { all: ['tachanunShacharit'] };
const NO_TACHANUN_SHACHARIT = { none: ['tachanunShacharit'] };
const BEDTIME_NOT_HOLY_NIGHT = { none: ['shabbat', 'yomTov', 'yomKippur'] };
const LONG_TACHANUN = { all: ['tachanunShacharit'], any: ['monday', 'thursday'] };
const SHACHARIT_AVINU_MALKEINU = { any: [AYT, 'publicFast'], all: ['tachanunShacharit'] };
const TORAH_READING = { all: ['torahReading'] };
const MUSAF = { all: ['musaf'] };
const NOT_MUSAF = { none: ['musaf'] };
const HALLEL = { any: ['hallelWhole', 'hallelHalf', 'hallelDisputed'] };
const WHOLE_HALLEL_ONLY = { none: ['hallelHalf'] };
const UNDISPUTED_HALLEL = { any: ['hallelWhole', 'hallelHalf'] };
const NO_UNDISPUTED_HALLEL = { none: ['hallelWhole', 'hallelHalf'] };
const NO_LAMNATZEACH_DAYS = [
  'roshChodesh',
  'chanukah',
  'purimOrShushan',
  'purimKatan',
  'erevPesach',
  'erevYomKippur',
  'tishaBav',
];
const LAMNATZEACH = { none: NO_LAMNATZEACH_DAYS };
const KEL_ERECH_APAYIM = {
  any: ['monday', 'thursday'],
  none: [...NO_LAMNATZEACH_DAYS, 'cholHamoedPesach', 'cholHamoedSukkot'],
};
const MIZMOR_LETODA = { none: ['erevPesach', 'cholHamoedPesach', 'erevYomKippur'] };
const TITKABEL_AFTER_UVA_LETZION = { none: ['musaf', 'tishaBav'] };
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const AYT_TACHANUN_SHACHARIT = { all: [AYT, 'tachanunShacharit'] };
const AYT_TACHANUN_MINCHA = { all: [AYT, 'tachanunMincha'] };
const NO_TACHANUN_NOR_HALLEL = { none: ['tachanunShacharit', 'hallelWhole', 'hallelHalf'] };
const WHOLE_HALLEL = { all: ['hallelWhole'] };
const CHABAD_KEL_ERECH_APAYIM = {
  any: ['monday', 'thursday'],
  none: [
    'roshChodesh',
    'chanukah',
    'purimOrShushan',
    'purimKatan',
    'erevPesach',
    'tishaBav',
    'cholHamoedPesach',
    'cholHamoedSukkot',
  ],
};

function both(first, second) {
  if (first.any || second.any) throw new Error('both() combines "all" and "none" conditions only');
  const all = [...(first.all ?? []), ...(second.all ?? [])];
  const none = [...(first.none ?? []), ...(second.none ?? [])];
  return { ...(all.length ? { all } : {}), ...(none.length ? { none } : {}) };
}

function weekdaySongs(rangesFromSunday) {
  return Object.assign({}, ...rangesFromSunday.map(([from, to], day) => each(from, to, { all: [WEEKDAYS[day]] })));
}

const NOTES = {
  fastTorahReading: {
    he: '<small>בתענית ציבור, כשיש מניין, קוראים כאן בתורה בפרשת "ויחל" ומפטירים לפי מנהג הקהילה, ואחר כך אומר שליח הציבור חצי קדיש.</small>',
    en: 'On a public fast, when there is a minyan, the Torah portion "Vayechal" is read here, with a haftarah according to the custom of the community, followed by Half Kaddish.',
    when: FAST,
  },
  erevYomKippurVidui: {
    he: '<small>בערב יום הכיפורים מוסיפים כאן וידוי ("אשמנו" ו"על חטא") כנוסח המחזור.</small>',
    en: 'On the eve of Yom Kippur, the confession (Ashamnu and Al Chet) is added here, as printed in the machzor.',
    when: { all: ['erevYomKippur'] },
  },
  tachanunDisputed: {
    he: '<small>יש קהילות שאינן אומרות תחנון היום.</small>',
    en: 'Some communities do not say Tachanun today.',
    when: { all: ['tachanunMincha', 'tachanunDisputed'] },
  },
  fastSelichot: {
    he: '<small>בתענית ציבור אומרים כאן סליחות כמנהג הקהילה.</small>',
    en: 'On a public fast, Selichot are said here according to the custom of the community.',
    when: { all: ['publicFast'], none: ['tishaBav'] },
  },
  chanukahPsalm: {
    he: '<small>בחנוכה נוהגים לומר אחר שיר של יום מזמור שיר חנוכת הבית.</small>',
    en: 'On Chanukah, many say the Psalm for the Dedication of the Temple after the Song of the Day.',
  },
  ayTPeaceChatimah: {
    he: '<small>בעשרת ימי תשובה יש נוהגים לחתום "עושה השלום" במקום "המברך את עמו ישראל בשלום".</small>',
    en: 'During the Ten Days of Repentance, some conclude "Oseh HaShalom" instead of "HaMevarech et amo Yisrael bashalom".',
    when: IN_AYT,
  },
  tefillinCholHamoed: {
    he: '<small>בחול המועד המניחים תפילין מברכים בלחש.</small>',
    en: 'On Chol HaMoed, those who put on tefillin say the blessings quietly.',
    when: CHOL_HAMOED,
  },
  tallitKatan: {
    he: '<small>הלובש טלית קטן בלי טלית גדול מברך:</small>',
    en: 'One who wears a tallit katan without a tallit gadol says:',
  },
  megillahNight: {
    he: '<small>בליל פורים קוראים כאן את המגילה בברכותיה, ואחר כך אומרים "ואתה קדוש".</small>',
    en: 'On Purim night, the Megillah is read here with its blessings, followed by VeAtah Kadosh.',
    when: PURIM,
  },
  tishaBavEichah: {
    he: '<small>בליל תשעה באב קוראים כאן מגילת איכה ואומרים קינות, ואחר כך "ואתה קדוש".</small>',
    en: "On the night of Tisha B'Av, Eichah and kinot are read here, followed by V'Atah Kadosh.",
    when: TISHA_BAV,
  },
  tishaBavEichahKinot: {
    he: '<small>בליל תשעה באב קוראים כאן מגילת איכה ואומרים קינות.</small>',
    en: "On the night of Tisha B'Av, Eichah and kinot are read here.",
    when: TISHA_BAV,
  },
  tachanunDisputedShacharit: {
    he: '<small>יש קהילות שאינן אומרות תחנון היום.</small>',
    en: 'Some communities do not say Tachanun today.',
    when: { all: ['tachanunShacharit', 'tachanunDisputed'] },
  },
  tachanunDisputedBedtime: {
    he: '<small>יש קהילות שאינן אומרות תחנון בבוקר.</small>',
    en: 'Some communities do not say Tachanun in the morning.',
    when: { all: ['tachanunShacharit', 'tachanunDisputed'] },
  },
  viduiMotzaeiShabbat: {
    he: '<small>במוצאי שבת נוהגים שלא לומר וידוי עד חצות הלילה.</small>',
    en: 'On the night after Shabbat, the confession is customarily not said until midnight.',
    when: { all: ['motzaeiShabbat'] },
  },
  halfKaddishAfterReading: {
    he: '<small>אחר קריאת התורה אומר הש"ץ חצי קדיש.</small>',
    en: 'After the Torah reading, the chazzan says Half Kaddish.',
  },
  hallelDisputed: {
    he: '<small>יש אומרים אותו בברכה ויש בלא ברכה.</small>',
    en: 'Some say it with its blessings and some without.',
    when: { all: ['hallelDisputed'] },
  },
  kinot: {
    he: '<small>בתשעה באב, אחר קריאת התורה, אומרים קינות.</small>',
    en: "On Tisha B'Av, kinot are recited after the Torah reading.",
    when: TISHA_BAV,
  },
  megillah: {
    he: '<small>בפורים קוראים את המגילה אחר קריאת התורה.</small>',
    en: 'On Purim, the Megillah is read after the Torah reading.',
    when: PURIM,
  },
  hoshanot: {
    he: '<small>בחול המועד סוכות אומרים הושענות; יש נוהגים לאומרן אחר ההלל, ויש אחר מוסף.</small>',
    en: 'On Chol HaMoed Sukkot, Hoshanot are recited; some say them after Hallel and some after Musaf.',
    when: CHOL_HAMOED_SUKKOT,
  },
  lamnatzeachCholHamoed: {
    he: '<small>יש נוהגים שלא לומר "למנצח" בחול המועד.</small>',
    en: 'Some do not say Lamnatzeach on Chol HaMoed.',
    when: CHOL_HAMOED,
  },
  kinotEdot: {
    he: '<small>בתשעה באב אומרים קינות כמנהג הקהילה.</small>',
    en: "On Tisha B'Av, kinot are recited according to the custom of the community.",
    when: TISHA_BAV,
  },
  levanaTiming: {
    he: '<small>יש מקדשים את הלבנה מליל ג׳ למולד ויש הממתינים עד שיעברו שבעה ימים, ואין מקדשים אחר חצי החודש.</small>',
    en: 'Some say Kiddush Levana from the third night after the molad and some wait seven days; it is not said after the middle of the month.',
  },
  levanaTishrei: {
    he: '<small>בחודש תשרי נוהגים לקדש את הלבנה במוצאי יום הכיפורים.</small>',
    en: 'In Tishrei the custom is to say it after Yom Kippur.',
    when: { all: ['aseretYemeiTeshuva'] },
  },
  levanaAv: {
    he: '<small>בחודש אב נוהגים לקדש את הלבנה אחר תשעה באב.</small>',
    en: "In Av the custom is to say it after Tisha B'Av.",
    when: { all: ['avBeforeTishaBav'] },
  },
};

const SAID_BY = {
  chazzan: { he: 'רק שליח הציבור אומר', en: 'Said by the chazzan only' },
  chazzanAndCongregation: { he: 'שליח הציבור אומר והקהל עונה', en: 'The chazzan says, and the congregation responds' },
  mourners: { he: 'אבלים אומרים', en: 'Said by mourners' },
  oleh: { he: 'העולה לתורה אומר', en: 'Said by the person called to the Torah' },
  lastOleh: { he: 'העולה האחרון לתורה אומר', en: 'Said by the last person called to the Torah' },
  kedusha: { he: 'קדושה — נאמרת רק בחזרת הש״ץ', en: "Kedushah — said only in the chazzan's repetition" },
  modimDeRabbanan: {
    he: 'מודים דרבנן — הקהל אומר בחזרת הש״ץ',
    en: "Modim DeRabbanan — said by the congregation in the chazzan's repetition",
  },
  birkatKohanim: { he: 'ברכת כהנים — רק בחזרת הש״ץ', en: "The Priestly Blessing — only in the chazzan's repetition" },
  aneinu: { he: 'עננו — שליח הציבור אומר בחזרת הש״ץ', en: 'Aneinu — said by the chazzan in the repetition' },
  withMinyan: { he: 'נאמר רק במניין', en: 'Said only with a minyan' },
  mezamen: { he: 'המזמן אומר', en: 'The leader says' },
  diners: { he: 'המסובים עונים', en: 'The others respond' },
  didNotEat: { he: 'מי שלא אכל עונה', en: 'One who did not eat responds' },
};

const WHEN_SAID = {
  mournersHouse: { he: 'בבית האבל אומרים', en: 'Said in a house of mourning' },
  mealBeganYaalehVeyavo: {
    he: 'אם התחילו לאכול לפני השקיעה בראש חודש או בחול המועד',
    en: 'If the meal began before sunset on Rosh Chodesh or Chol Hamoed',
    when: YAALEH_VEYAVO_YESTERDAY,
  },
  mealBeganAlHanissim: {
    he: 'אם התחילו לאכול לפני השקיעה בחנוכה או בפורים',
    en: 'If the meal began before sunset on Chanukah or Purim',
    when: AL_HANISSIM_YESTERDAY,
  },
  forgotYaalehVeyavo: {
    he: 'אם שכח יעלה ויבוא ונזכר לפני ברכת "הטוב והמטיב"',
    en: 'If one forgot Yaaleh Veyavo and remembered before the fourth blessing',
  },
  shevaBerachotMeal: { he: 'בסעודת שבע ברכות', en: 'At a sheva berachot meal' },
  britMilahMeal: { he: 'בסעודת ברית מילה', en: 'At a brit milah meal' },
  guest: { he: 'אורח אומר', en: 'A guest says' },
  israelProduce: { he: 'לפירות ארץ ישראל', en: 'For produce of the Land of Israel' },
  enteringCity: { he: 'בכניסה לעיר וביציאה ממנה', en: 'When entering and leaving a city' },
  seaTravel: { he: 'לעוברי ימים ונהרות', en: 'For travel by sea or river' },
  airTravel: { he: 'לטסים במטוס', en: 'For air travel' },
  tefillinInterruption: {
    he: 'אם הפסיק בין תפילין של יד לתפילין של ראש',
    en: 'Only if one interrupted between the hand and head tefillin',
  },
  fastDay: { he: 'ביום תענית אומרים', en: 'Said on a fast day', when: { none: ['publicFast'] } },
  gomel: { he: 'מי שחייב להודות מברך הגומל', en: 'Said by one who must give thanks (HaGomel)' },
  barMitzvahFather: {
    he: 'אבי בר המצווה אומר בעליית בנו הראשונה',
    en: "Said by a bar mitzvah boy's father at his son's first aliyah",
  },
  alone: { he: 'המתפלל ביחיד אומר', en: 'Said when praying without a minyan', alone: true },
  women: { he: 'נשים אומרות', en: 'Said by women', voice: 'female' },
  womenCountOmer: { he: 'נשים סופרות בלי ברכה', en: 'Women count without a blessing', foldsFor: 'female' },
  womenHallel: { he: 'נשים אומרות בלי ברכה', en: 'Women say Hallel without a blessing', foldsFor: 'female' },
  noKohanim: {
    he: 'כשאין כהנים נושאים כפיים, שליח הציבור אומר',
    en: 'When no kohanim bless the congregation, the chazzan says',
  },
  kohanimBless: { he: 'כשהכהנים נושאים כפיים, הקהל אומר', en: 'Said by the congregation when the kohanim bless it' },
  bedtimeVehaya: {
    he: 'מי שלא קרא קריאת שמע בזמנה, ויש נוהגים בכל לילה: גם פרשת "והיה אם שמוע"',
    en: 'For one who did not recite the Shema on time, and by some custom every night: also the paragraph "Vehaya Im Shamoa"',
  },
  maritalRelations: { he: 'בלילה שיש בו תשמיש המטה', en: 'On a night of marital relations', marriedOnly: true },
  timePermits: { he: 'אם יש פנאי אומרים', en: 'Said when there is time' },
  plague: { he: 'כשיש, חס ושלום, מגפה בעיר אומרים', en: 'Said when, God forbid, there is a plague in the town' },
};

// Women's liturgy (R8, R9): every patch is listed in AGENTS.md.
const NOT_FOR_WOMEN = ['male', 'unset'];
const NOT_FOR_MEN = ['female', 'unset'];
function womenSay(seg, printed, feminine, count) {
  return {
    seg,
    from: printed,
    to: `<if voice="male,unset">${printed}</if><if voice="female">${feminine}</if>`,
    ...(count ? { count } : {}),
  };
}
function menSay(seg, printed, masculine, count) {
  return {
    seg,
    from: printed,
    to: `<if voice="female,unset">${printed}</if><if voice="male">${masculine}</if>`,
    ...(count ? { count } : {}),
  };
}
function notForWomen(byNusach) {
  return Object.fromEntries(
    Object.entries(byNusach).map(([nusach, spec]) => [nusach, { ...spec, voice: NOT_FOR_WOMEN }]),
  );
}
const modeh = (seg) => womenSay(seg, 'מוֹדֶה', 'מוֹדָה');
const omerReady = (seg) => womenSay(seg, 'מוּכָן וּמְזֻמָּן', 'מוּכָנָה וּמְזֻמֶּנֶת');
const comeToFulfil = (seg) => womenSay(seg, 'בָּא לְקַיֵּם', 'בָּאָה לְקַיֵּם');
const forgives = (seg) => womenSay(seg, 'מוֹחֵל', 'מוֹחֶלֶת');
const SPOUSE_AND_CHILDREN = '(וְאֶת־אִשְׁתִּי/בַּעֲלִי וְאֶת־זַרְעִי) ';
function spouseBlessing(seg) {
  return {
    seg,
    from: SPOUSE_AND_CHILDREN,
    to: `<if voice="unset">${SPOUSE_AND_CHILDREN}</if><if voice="male" marriedOnly="true">וְאֶת־אִשְׁתִּי </if><if voice="female" marriedOnly="true">וְאֶת־בַּעֲלִי </if><if voice="male,female">וְאֶת־זַרְעִי </if>`,
  };
}
// Chabad women's text (R8): no pinned Chabad source prints it.
const CHABAD_WOMEN_KIRTZONO = {
  at: 21,
  he: '<if voice="female"><b>בָּרוּךְ</b> אַתָּה יְיָ אֱלֹהֵֽינוּ מֶלֶךְ הָעוֹלָם, שֶׁעָשַׂנִי כִּרְצוֹנוֹ:</if>',
};
const NO_KOHANIM_IN_ISRAEL = { ...WHEN_SAID.noKohanim, when: IN_ISRAEL };
const SEFARD_SHOMEA_TEFILLAH_CLOSING =
  'כִּי אַתָּה שׁוֹמֵֽעַ תְּפִלַּת כָּל פֶּה עַמְּ֒ךָ יִשְׂרָאֵל בְּרַחֲמִים: בָּרוּךְ אַתָּה יְהֹוָה שׁוֹמֵֽעַ תְּפִלָּה:';
const MIGDOL_NOTE_EN =
  '(<i>On Shabbos and Yom Tov say:</i> He who is a tower of deliverance to His king,<sup class="footnote-marker">22</sup><i class="footnote">During weekdays when we feel the darkness of exile we say: “God gives deliverance to His king,” thus acknowledging His preparation for the time of redemption. On Shabbos and Yom Tov which are reminiscent of the time of the Messiah, when God will be a tower of deliverance, we state it as a fact.</i>) ';
const SEFARD_MAARIV_KADDISH_NOTE_CUT_EN =
  ' If a Festival occurs on a weekday of the new week, the Chazzan instead says Whole-Kaddish and וִיהִי נֹֽעַם/וְאַתָּה קָדוֹשׁ are omitted. On <small><b>PURIM</b></small>, the Megillah is read here, followed by (וִיהִי נֹֽעַם and) וְאַתָּה קָדוֹשׁ below. On <small><b>TISHA B’AV</b></small>, Eichah and Kinos are said, followed by וְאַתָּה קָדוֹשׁ.';
const SEFARD_HAGBAHA_HALF_KADDISH_EN =
  'When the reading of the Torah is concluded, the Half Kaddish is recited by the Reader. ';
const SEFARD_SHOMEA_TEFILLAH_CLOSING_EN =
  'for You hear the prayers of every mouth of Your people, Israel, with compassion. Blessed are You, Adonoy, Who hears prayers.';
const SEFARD_SHOMEA_TEFILLAH_STAR_EN = { from: 'our prayer*', to: 'our prayer' };
const SEFARD_PARNASSA_BEFORE_SHOMEA_TEFILLAH = [
  { seg: 78, from: `* ${SEFARD_SHOMEA_TEFILLAH_CLOSING}`, to: '' },
  { seg: 80, from: 'יְכַלכְּךָ:</small>', to: `יְכַלכְּךָ:</small><br>${SEFARD_SHOMEA_TEFILLAH_CLOSING}` },
];

const RAVS_PRAYER_NOTE = 'יש אומרים תפילת רב מגמרה ברכות ט"ז ע"ב שכתב החיד"א ז"ל בסידורו';

const SOME_SAY = {
  some: { he: 'יש אומרים', en: 'Some say' },
  someAdd: { he: 'יש מוסיפים', en: 'Some add' },
  someAddInAyt: { he: 'בעשרת ימי תשובה יש מוסיפים', en: 'During the Ten Days of Repentance, some add' },
  hallel: { he: 'יש נוהגים לומר הלל היום', en: 'Some say Hallel today', when: { all: ['hallelDisputed'] } },
  baruchHu: { he: 'ויש המוסיפים', en: 'Some add' },
  derechVerses: { he: 'ויש מוסיפים פסוקים אלה לשמירה', en: 'Some add these verses for protection' },
  einKelokeinu: { he: 'יש נוהגים בארץ ישראל לומר אין כאלהינו', en: 'In the Land of Israel, some say Ein Keloheinu' },
  shirLamaalot: { he: 'יש נוהגים בארץ ישראל לומר שיר למעלות', en: 'In the Land of Israel, some say Shir LaMaalot' },
  forTheSick: { he: 'מי שרוצה מתפלל כאן על חולה', en: 'A prayer for the sick, for whoever wishes' },
  sustenance: { he: 'יש מוסיפים תפילה על הפרנסה', en: 'Some add a prayer for sustenance' },
  ravsPrayer: { he: 'יש אומרים תפילת רב', en: "Some say Rav's prayer" },
  barchiNafshi: {
    he: 'בליל ראש חודש יש נוהגים לומר ברכי נפשי',
    en: 'On the night of Rosh Chodesh, some say Barchi Nafshi',
  },
  aneinu: { he: 'בתשעה באב יש אומרים עננו', en: "On Tisha B'Av, some say Aneinu" },
  beforeShuvah: { he: 'יש נוהגים לומר בקשה לפני "שובה"', en: 'Some say a request before Shuvah' },
  shortLeshemYichud: { he: 'יש אומרים לשם יחוד בנוסח קצר', en: 'Some say a shorter Leshem Yichud' },
  akedahVerse: { he: 'יש נוהגים לומר את הפסוק "ושחט אותו"', en: 'Some add the verse "Veshachat oto"' },
  afterHallel: { he: 'יש אומרים אחר ההלל "ואברהם זקן"', en: 'Some say "Ve-Avraham zaken" after Hallel' },
  mournersVerse: { he: 'יש שמוסיפים "ותשועת צדיקים"', en: 'Some add "Uteshuat tzadikim"' },
  personalFast: { he: 'מי שרוצה מקבל כאן תענית יחיד למחר', en: 'To take on a personal fast for tomorrow' },
  kadeshVehaya: { he: 'יש נוהגים לומר גם קדש והיה כי יביאך', en: 'Some also say Kadesh and Vehaya Ki Yeviacha' },
  threeFastsAneinu: {
    he: 'יש אומרים בג׳ צומות נוסח עננו זה במקום הנוסח הקודם',
    en: 'On the three fasts, some say this Aneinu instead of the one above',
  },
  vidui: { he: 'יש נוהגים לומר וידוי וי״ג מידות', en: 'Some say the Confession and the Thirteen Attributes' },
  ledavid: { he: 'יש נוהגים לומר "לדוד ה׳ אורי"', en: 'Some say LeDavid Hashem Ori' },
  handWashingIntention: {
    he: 'יש אומרים לשם יחוד ותפילה לפני נטילת ידיים',
    en: 'Some say a Leshem Yichud and a prayer before washing hands',
  },
  hamotziVerses: {
    he: 'יש נוהגים לומר "עיני כל" לפני ברכת המוציא',
    en: 'Some say "Einei Kol" before the blessing over bread',
  },
  bedtimeVayomer: {
    he: 'יש נוהגים בכל לילה לומר גם פרשת "ויאמר"',
    en: 'By some custom, the paragraph "Vayomer" is also said every night',
  },
  afterKaddishLevana: {
    he: 'יש אומרים אחר הקדיש "והיה אור הלבנה"',
    en: 'After the Kaddish, some say "Vehaya Or HaLevana"',
  },
  beforeHavdalah: { he: 'במקצת מקומות אומרים לפני ההבדלה', en: 'In some places this is said before Havdalah' },
  sukkahDayVerses: { he: 'יש נוהגים לומר פסוקים אלה בסוכה', en: 'Some say these verses in the sukkah' },
};

const SEFARD_OMER_NIGHT_NOTE = { seg: 64, from: '(השייכת לאותו הלילה)', to: '(<small>השייכת לאותו הלילה</small>)' };
const OMER_HINENI_BLESSING_EN = {
  seg: 2,
  from: ' Blessed are You, Adonoy, our God, King of the universe, Who sanctified us with His commandments and commanded us to count the Omer.',
  to: '',
};
const EDOT_THREE_FASTS_ANEINU = { any: ['tzomGedaliah', 'asaraBTevet', 'tzomTammuz'] };
const EDOT_SANSAN_LEYAIR = { from: 'סנסן ליעיר', to: 'סנסן ליאיר' };
const METSUDAH_BETZELEM_DAGESH = {
  from: '\u05D1\u05B0\u05BC\u05E6\u05B6\u05BC\u05BD\u05DC\u05B6\u05DD',
  to: '\u05D1\u05B0\u05BC\u05E6\u05B6\u05BD\u05DC\u05B6\u05DD',
};
const EDOT_MODIM_DERABBANAN_HEADING = {
  from: 'מודים דרבנן <br><small>בחזרת הש"ץ כשהחזן אומר מודים, הקהל אומרים:</small><br>',
  to: '',
};
const EDOT_MUSAF_MODIM_DERABBANAN_HEADING = {
  from: '<small><b>מודים דרבנן</b></small><br><small>בחזרת הש"ץ כשהחזן אומר מודים, הקהל אומרים:</small><br>',
  to: '',
};

const MARKS = '[\\u0591-\\u05C7]*';
const RULES = [];

function loose(text) {
  return [...text]
    .map((c) => (c === ' ' ? '[\\s\\u05BE]*' : `${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${MARKS}`))
    .join('');
}

function rule(name, pattern, replace) {
  const entry = { name, hits: 0, applied: false };
  RULES.push(entry);
  return (html) => {
    entry.applied = true;
    return html.replace(pattern, (...match) => {
      entry.hits++;
      return replace(...match);
    });
  };
}

const PAREN_NOTE = '\\(\\s*<small>[^<]*</small>\\s*';

function variant(defaultText, altText, flag) {
  return rule(
    `${defaultText} (${altText})`,
    new RegExp(`(${loose(defaultText)})\\s*${PAREN_NOTE}(${loose(altText)})\\s*\\)`, 'g'),
    (_, plainText, alt) => `<if none="${flag}">${plainText}</if><if all="${flag}">${alt}</if>`,
  );
}

function variantBefore(altText, defaultText, flag) {
  return rule(
    `(${altText}) ${defaultText}`,
    new RegExp(`${PAREN_NOTE}(${loose(altText)})\\s*\\)\\s*(${loose(defaultText)})`, 'g'),
    (_, alt, plainText) => `<if all="${flag}">${alt}</if><if none="${flag}">${plainText}</if>`,
  );
}

function compose(...transforms) {
  return (html, index) => transforms.reduce((out, transform) => transform(out, index), html);
}

const metsudahYaalehVeyavo = rule(
  'Metsudah Yaaleh Veyavo days',
  /<small>לר"ח:<\/small>\s*([^<]*?:)\s*<small>לפסח:<\/small>\s*([^<]*?:)\s*<small>לסכות:<\/small>\s*([^<]*?:)/g,
  (_, roshChodesh, pesach, sukkot) =>
    `<if all="roshChodesh">${roshChodesh}</if><if all="cholHamoedPesach">${pesach}</if><if all="cholHamoedSukkot">${sukkot}</if>`,
);

const metsudahKedushaEnding = rule(
  'Metsudah Kedusha ending',
  new RegExp(`(${loose('ברוך אתה יהוה האל הקדוש:')})\\s*<small>בעשי"ת מסיים:\\s*([^<]*)</small>`, 'g'),
  (_, plainText, ending) => `<if none="${AYT}">${plainText}</if><if all="${AYT}">${ending}</if>`,
);

function headingAsNote(html) {
  const text = html.replace(/<[^>]+>/g, '').trim();
  return text && text.length <= 24 && /[א-ת]/.test(text) && !/[ְ-ׇ]/.test(text) ? `<small>${text}</small>` : html;
}

const SEFARD_VARIANTS = compose(
  headingAsNote,
  variantBefore('ולעלא מכל', 'מן כל', AYT),
  variant('שלום', 'השלום', AYT),
  variantBefore('השלום', 'שלום', AYT),
);

const EDOT_AYT_NOTE = '<small><small>בעשרת ימי תשובה אומרים:</small>';

function edotAytEnding(plainEnding) {
  return rule(
    `Edot AYT ending ${plainEnding}`,
    new RegExp(`(${loose(plainEnding)})\\s*${EDOT_AYT_NOTE}\\s*([\\s\\S]*?)</small>`, 'g'),
    (_, plainText, ayt) => `<if none="${AYT}">${plainText}</if><if all="${AYT}">${ayt}</if>`,
  );
}

const EDOT_VARIANTS = compose(
  headingAsNote,
  rule('Edot psalm references', /\((?:תהלים|תהילים) [^)<]*\)/g, (reference) => `<small>${reference}</small>`),
  edotAytEnding('האל הקדוש:'),
  edotAytEnding('מלך אוהב צדקה ומשפט:'),
  rule(
    'Edot AYT insert',
    new RegExp(`${EDOT_AYT_NOTE}([\\s\\S]*?)</small>`, 'g'),
    (_, insert) => `<if all="${AYT}"><small>בעשרת ימי תשובה אומרים:</small>${insert}</if>`,
  ),
  rule(
    'Edot summer and winter',
    /<small>בקיץ:<\/small>\s*([^<]*?)\s*<small>בחורף:<\/small>\s*([^<]*)/g,
    (_, summer, winter) =>
      `<if none="winter"><small>בקיץ:</small> ${summer}</if> <if all="winter"><small>בחורף:</small> ${winter}</if>`,
  ),
  rule(
    'Edot AYT oseh hashalom',
    new RegExp(`(${loose('שלום')})\\s*<small>(?:<small>)?בעשרת ימי תשובה אומר:(?:</small>)?\\s*([^<]*)</small>`, 'g'),
    (_, plainText, ayt) => `<if none="${AYT}">${plainText}</if><if all="${AYT}">${ayt}</if>`,
  ),
);

const ASHKENAZ_VARIANTS = compose(
  variant('לעלא מן כל', 'לעלא לעלא מכל', AYT),
  variant('שלום', 'השלום', AYT),
  variantBefore('השלום', 'שלום', AYT),
  metsudahYaalehVeyavo,
  metsudahKedushaEnding,
);

const FAST_ONLY = `all="publicFast" none="${AYT}"`;

const CHABAD_VARIANTS = compose(
  variant('האל', 'המלך', AYT),
  variant('מלך אוהב צדקה ומשפט:', 'המלך המשפט:', AYT),
  variant('שלום', 'השלום', AYT),
  rule(
    'Chabad rain request',
    /<small>בקיץ<\/small>\s*([^<(]*?)\s*\(\s*<small>בחורף<\/small>\s*([^<)]*?)\s*\)/g,
    (_, summer, winter) => `<if none="talUmatar">${summer}</if><if all="talUmatar">${winter}</if>`,
  ),
  rule(
    'Chabad summer and winter',
    /<small>בקיץ<\/small>\s*([^<]*?:)\s*<small>בחורף<\/small>\s*([^<]*:)/g,
    (_, summer, winter) =>
      `<if none="winter"><small>בקיץ</small> ${summer}</if> <if all="winter"><small>בחורף</small> ${winter}</if>`,
  ),
  rule(
    'Chabad Yaaleh Veyavo days',
    /<small>בראש חדש:<\/small>\s*([^<]*?)\s*<small>בחוה״מ פסח:<\/small>\s*([^<]*?)\s*<small>בחוה״מ סוכות:<\/small>\s*([^<]*?\.)/g,
    (_, roshChodesh, pesach, sukkot) =>
      `<if all="roshChodesh">${roshChodesh}</if><if all="cholHamoedPesach">${pesach}</if><if all="cholHamoedSukkot">${sukkot}</if>`,
  ),
  rule(
    'Chabad Tisha BAv ending of Boneh Yerushalayim',
    new RegExp(`<small>\\(בתשעה באב אומרים כאן נחם\\)</small>\\s*(${loose('ברוך אתה יי, בונה')}[^:]*:)`, 'g'),
    (_, ending) => `<if none="tishaBav">${ending}</if>`,
  ),
  rule(
    'Chabad Avinu Malkeinu renew or bless',
    new RegExp(`(${loose('חדש')})\\s*\\(\\s*<small>בתענית ציבור:</small>\\s*(${loose('ברך')})\\s*\\)`, 'g'),
    (_, renew, bless) => `<if all="${AYT}">${renew}</if><if ${FAST_ONLY}>${bless}</if>`,
  ),
  rule(
    'Chabad Avinu Malkeinu Ten Days lines',
    /(<small>בעשרת ימי תשובה:<\/small>(?:<br>[^<]*){5})/g,
    (_, lines) => `<if all="${AYT}">${lines}</if>`,
  ),
  rule(
    'Chabad Avinu Malkeinu fast lines',
    /\[<small>בתענית ציבור<\/small>((?:<br><b>[^<]*<\/b>){5})\]/g,
    (_, lines) => `<if ${FAST_ONLY}><small>בתענית ציבור:</small>${lines.replace(/<\/?b>/g, '')}</if>`,
  ),
);

const UVA_LETZION_COVENANT = rule(
  "Uva Letzion covenant verse, omitted on Tisha B'Av",
  new RegExp(`${loose('ואני זאת בריתי')}[^:\\u05C3]*[:\\u05C3]`, 'g'),
  (verse) => `<if none="tishaBav">${verse}</if>`,
);

const EDOT_MEGILLAH = rule(
  'Edot Megillah after the covenant verse',
  new RegExp(`${loose('מעתה ועד עולם')}[:\\u05C3]`),
  (verse) => `${verse} <if all="purim"><small>בפורים קוראים כאן את המגילה, בברכותיה לפניה ולאחריה.</small></if>`,
);

const EDOT_LEVITES_LINE = rule(
  "Edot Levites' line of the Song of the Day, omitted on Chanukah",
  new RegExp(`,\\s*(${loose('השיר שהיו הלוים אומרים על הדוכן')})`, 'g'),
  (_, line) => `<if none="chanukah">, ${line}</if>`,
);

const EDOT_FESTIVAL_INSERTS = compose(
  rule(
    'Edot Shabbat inserts',
    /<small>\s*<small>בשבת<\/small>\s*\(?([^<)]*)\)?\s*<\/small>/g,
    (_, insert) => `<if all="shabbat">${insert}</if>`,
  ),
  rule(
    'Edot Yom Tov addition',
    /<small>\s*<small>ביו"ט מוסיף<\/small>\s*([^<]*)<\/small>/g,
    (_, insert) => `<if all="yomTov">${insert}</if>`,
  ),
);

const TORAT_EMET_LEAP_YEAR = rule(
  'Torat Emet leap-year atonement',
  /<small>בשנת העיבור עד חדש ניסן:<\/small>\s*<b>([^<]*)<\/b>\)/g,
  (_, insert) => `<if all="ulechaparatPesha">${insert}</if>`,
);

const SUKKOT_OFFERING_LABELS = {
  'בט"ז בתשרי (בא"י)': 2,
  'בי"ז בתשרי': 3,
  'בי"ח בתשרי': 4,
  'בי"ט בתשרי': 5,
  "בכ' בתשרי": 6,
  'בהושענא רבה': 7,
};

function ashkenazName(html) {
  return html.replace(/לַייָ/g, 'לַיהֹוָה').replace(/וַייָ/g, 'וַיהֹוָה').replace(/יְיָ/g, 'יְהֹוָה');
}

const WIKI_ASHKENAZ_MUSAF = compose(
  ashkenazName,
  rule(
    'Wikisource Shabbat inserts',
    /<small>בשבת<\/small><opt>([^<]*)<\/opt>/g,
    (_, insert) => `<if all="shabbat">${insert}</if>`,
  ),
  rule(
    'Wikisource leap-year atonement',
    /<small>בשנה מעוברת עד ר"ח אדר ב'<\/small><opt>([^<]*)<\/opt>/g,
    (_, insert) => `<if all="ulechaparatPesha">${insert}</if>`,
  ),
  rule('Wikisource weekday marker', /<small>כשחל בחול:<\/small>\s*/g, () => ''),
  rule(
    'Wikisource festival names',
    /<br>\s*<small>בפסח:<\/small>\s*([^<]*?)\s*<br>\s*<small>בשבועות:<\/small>[^<]*<br>\s*<small>בסוכות:<\/small>\s*([^<]*?)\s*<br>\s*<small>בשמיני עצרת[^<]*<\/small>[^<]*<br>\s*/g,
    (_, pesach, sukkot) => ` <if all="cholHamoedPesach">${pesach}</if><if all="cholHamoedSukkot">${sukkot}</if> `,
  ),
  rule(
    'Wikisource Shabbat and Pesach headings after the offerings',
    /<small>בשבת:<\/small>\s*<small>ביו"ט ראשון \(ושני\) של פסח:<\/small>\s*$/g,
    () => '',
  ),
  rule(
    'Wikisource Sukkot offerings of the day',
    new RegExp(
      `<small>(${Object.keys(SUKKOT_OFFERING_LABELS).map(escapeForRegExp).join('|')}):</small>\\s*([^<]*)`,
      'g',
    ),
    (_, label, verse) => `<if all="sukkotOffering${SUKKOT_OFFERING_LABELS[label]}">${verse}</if>`,
  ),
);

function escapeForRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function metsudahHallel() {
  return {
    he: 'metsudahShabbatHe',
    en: 'metsudahShabbatEn',
    linear: true,
    title: T.hallel,
    path: 'Hallel',
    from: 4,
    to: 262,
    drop: [8, 29, 49, 94, 141, 148],
    groups: [
      [4, 7],
      [9, 28],
      [30, 48],
      [51, 76],
      [77, 93],
      [96, 120],
      [121, 140],
      [142, 146],
      [149, 162],
      [163, 201],
      [202, 217],
      [219, 222],
      [223, 246],
      [247, 262],
    ],
    when: HALLEL,
    optional: SOME_SAY.hallel,
    at: { ...each(51, 76, WHOLE_HALLEL_ONLY), ...each(96, 120, WHOLE_HALLEL_ONLY) },
    transform: (html) => html.replace(/❖/g, ''),
    insert: [{ at: 4, ...NOTES.hallelDisputed }],
  };
}

function lulavBlessing({ from = 1 } = {}) {
  return {
    he: 'metsudahShabbatHe',
    en: 'metsudahShabbatEn',
    linear: true,
    title: T.lulav,
    path: 'Prayers for Yom Tov > Blessings on the Lulav',
    from,
    to: 11,
    groups: [
      [2, 6],
      [8, 11],
    ],
    when: CHOL_HAMOED_SUKKOT,
    at: each(8, 11, { all: ['lulavShehecheyanu'] }),
  };
}

function withoutOmerNumber(html) {
  return html.replace(/(<br>)\s*\d+\.\s*/, '$1');
}

function chabadName(html) {
  return html.replace(/לַיהֹוָה/g, 'לַייָ').replace(/יְהֹוָה/g, 'יְיָ');
}

function candles({ transform, shabbatEdits, shabbatEnEdits } = {}) {
  const shabbat = { he: 'metsudahShabbatHe', en: 'metsudahShabbatEn', linear: true, transform };
  const yomKippur = { he: 'metsudahYomKippurHe', en: 'metsudahYomKippurEn', linear: true, transform };
  return [
    {
      ...shabbat,
      title: T.candlesShabbat,
      path: 'Candle Lighting > Candle Lighting for Shabbos',
      groups: [[2, 6]],
      when: { all: ['shabbat'], none: ['yomTov', 'yomKippur'] },
      edits: shabbatEdits,
      enEdits: shabbatEnEdits,
    },
    {
      ...shabbat,
      title: T.candlesYomTov,
      path: 'Candle Lighting > Candle Lighting for Yom Tov',
      groups: [
        [0, 4],
        [5, 8],
      ],
      when: { all: ['yomTov'], none: ['shabbat'] },
      at: each(5, 8, SHEHECHEYANU),
    },
    {
      ...shabbat,
      title: T.candlesShabbatYomTov,
      path: 'Candle Lighting > Candle Lighting when Shabbos occurs on Yom Tov',
      groups: [
        [0, 5],
        [6, 9],
      ],
      when: { all: ['shabbat', 'yomTov'] },
      at: each(6, 9, SHEHECHEYANU),
    },
    {
      ...yomKippur,
      title: T.candlesYomKippur,
      path: 'Candle Lighting',
      from: 0,
      to: 8,
      groups: [
        [0, 4],
        [5, 8],
      ],
      when: { all: ['yomKippur'], none: ['shabbat'] },
    },
    {
      ...yomKippur,
      title: T.candlesShabbatYomKippur,
      path: 'Candle Lighting',
      from: 10,
      to: 19,
      groups: [
        [10, 15],
        [16, 19],
      ],
      when: { all: ['yomKippur', 'shabbat'] },
    },
  ];
}

function linearHavdalah({ transform, versesNote } = {}) {
  const base = { he: 'metsudahShabbatHe', en: 'metsudahShabbatEn', linear: true, transform, path: 'Havdalah' };
  return [
    {
      ...base,
      title: T.havdalahVerses,
      from: 2,
      to: 21,
      groups: [
        [2, 7],
        [8, 9],
        [10, 12],
        [13, 14],
        [15, 16],
        [17, 18],
        [19, 19],
        [20, 21],
      ],
      when: NOT_TISHA_BAV,
      ...(versesNote ? { insert: [{ ...versesNote, at: 2 }] } : {}),
    },
    { ...base, title: T.havdalahWine, from: 22, to: 25, groups: [[23, 25]], when: NOT_TISHA_BAV },
    { ...base, title: T.havdalahSpices, from: 26, to: 29, groups: [[27, 29]], when: HAVDALAH_SPICES },
    {
      ...base,
      title: T.havdalahFire,
      from: 30,
      to: 33,
      groups: [[31, 33]],
      when: HAVDALAH_FLAME,
      insert: HAVDALAH_FLAME_NOTES.map((note) => ({ ...note, at: 31 })),
    },
    {
      ...base,
      title: T.havdalahBlessing,
      from: 34,
      to: 44,
      groups: [[34, 44]],
      when: NOT_TISHA_BAV,
      edits: [{ seg: 42, from: 'בָּרוּר', to: 'בָּרוּךְ' }],
    },
  ];
}

// Daat prints the divine name as a bare "יי" or as "יְ‑יָ" with a non-breaking hyphen, and Elokim
// with the same hyphen.
function daatName(html) {
  return ashkenazName(
    html
      .replace(/יְ‑יָ/g, 'יְיָ')
      .replace(/אֱ‑לֹהֵינוּ/g, 'אֱלֹהֵינוּ')
      .replace(/(^|[\s(])יי(?=[\s:,.)])/g, '$1יְהֹוָה'),
  );
}

const DAAT = { he: 'daatAshkenazHe', en: 'communityAshkenazEn', transform: daatName };
const TORAT_EMET = { he: 'toratEmetSefardHe' };

// Me'ein Shalosh ends with the wording for food that did not grow in the Land of Israel, wherever the
// reader is (the user's decision of 2026-10-18); each source prints the Israel wording beside it, which
// the closed fold for produce of the Land of Israel takes instead.
function israelEnding(name, pattern, wording) {
  return {
    abroad: rule(name, pattern, (...match) => wording(...match).abroad),
    israel: rule(`${name} (Land of Israel)`, pattern, (...match) => wording(...match).israel),
  };
}
const daatIsraelEnding = israelEnding(
  'Daat Israel ending',
  /(וְעַל [^()<]+?) \(<small>בחו"ל<\/small>—([^)]+)\)/g,
  (_, israel, abroad) => ({ abroad, israel }),
);
const toratEmetIsraelEnding = israelEnding(
  'Torat Emet Israel ending',
  /(וְעַל (?:פְּרִי הַגָּפֶן|הַפֵּרוֹת)): <small>\( <small>בא"י<\/small> ([^)]+)\)<\/small>:/g,
  (_, abroad, israel) => ({ abroad: `${abroad}:`, israel: `${israel}:` }),
);
const edotIsraelEnding = israelEnding(
  'Edot Israel ending',
  /([^<>]+?)\s*<small><small>של ארץ ישראל\s*<\/small>\s*([^<]+?)<\/small>/g,
  (_, abroad, israel) => ({ abroad, israel: `${abroad.match(/^\s*/)[0]}${israel}` }),
);
const ISRAEL_PRODUCE_NOTE = {
  he: '<small>על פירות ארץ ישראל מסיימים:</small>',
  en: 'For produce of the Land of Israel, the blessing ends:',
};

const MIGDOL_NOTE = '(<small>בשבת וביו"ט אומר:</small> מִגְדּוֹל יְשׁוּעוֹת מַלְכּוֹ)';
const noteBefore = (note, lead) => ({ from: lead, to: `<small>${note}</small> ${lead}` });

function yaalehVeyavoDay(roshChodesh, pesach, sukkot) {
  return (
    `<if any="${anyOf(ROSH_CHODESH_OR_YESTERDAY)}">${roshChodesh}</if>` +
    `<if any="${anyOf(CHOL_HAMOED_PESACH_OR_YESTERDAY)}">${pesach}</if>` +
    `<if any="${anyOf(CHOL_HAMOED_SUKKOT_OR_YESTERDAY)}">${sukkot}</if>`
  );
}

const ASHKENAZ = { he: 'metsudahAshkenazHe', en: 'metsudahAshkenazEn' };
const ashkenazPrep = (node) => `Weekday > Shacharit > Preparatory Prayers > ${node}`;
const ASHKENAZ_SHOMEA_TEFILLAH_CLOSING_EN = [
  {
    seg: 0,
    from: ' for You hear the prayers of Your people, Israel, with compassion. Blessed are You, Adonoy, Who hears prayers.',
    to: '',
  },
  {
    seg: 0,
    from: 'our King,<sup class="footnote-marker">43</sup>',
    to: 'our King.<sup class="footnote-marker">43</sup>',
  },
];
const SEFARD = { he: 'metsudahSefardHe', en: 'metsudahSefardEn' };
const EDOT = { he: 'edotHe', en: 'edotEn' };
// The community English of Edot's Asher Yatzar timing note translates a different instruction (wash
// after every visit) than the Hebrew (bless within half an hour), so the note ships Hebrew-only.
const EDOT_ASHER_YATZAR_NOTE_EN = {
  seg: 3,
  from: 'Every time a person goes to the bathroom, they should afterwards [wash hands] and say the Asher Yatzar blessing:',
  to: '',
};
const EDOT_ALEINU_TORAH_MOVE = {
  seg: 2,
  text: 'And in Your Torah, L·rd, Our G·d, it is written saying “Hear Oh Israel, the L·rd is our G·d the L·rd is One.”',
  to: 3,
};
const EDOT_SHEMA_CONGREGATION_EN = { seg: 15, from: '[And the Congregation Answers:] [This is] Truth: ', to: '' };
const edotNetzorMove = (seg) => ({
  seg,
  text: 'For the sake of refraining Your beloved (Israel, from sufferance), Your right (mercy) Deliver [us], &amp; answer us.',
  to: seg + 1,
});
const CHABAD = { he: 'chabadHe', en: 'chabadEn' };

const TALLIT_GADOL = notForWomen({
  ashkenaz: { ...ASHKENAZ, path: ashkenazPrep('Tallit') },
  sefard: { ...SEFARD, path: 'Upon Arising > Tallit' },
  edot_hamizrach: { ...EDOT, path: 'Weekday Shacharit > Order of Talit', from: 1 },
  chabad: { ...CHABAD, path: 'Shacharit > Tzitzit and Tallit', from: 3, to: 9 },
});
// The tefillin leaves of each nusach, shared by the standalone text and by the section Shacharit
// prints them in, so the two never drift apart.
const TEFILLIN = notForWomen({
  ashkenaz: { ...ASHKENAZ, path: ashkenazPrep('Tefillin') },
  sefard: { ...SEFARD, path: 'Upon Arising > Tefilin' },
  edot_hamizrach: {
    ...EDOT,
    path: 'Weekday Shacharit > Order of Tefillin',
    from: 1,
    reviewed: [2],
    optionalParts: [{ from: 2, paragraph: 1, label: WHEN_SAID.tefillinInterruption }],
  },
  chabad: {
    ...CHABAD,
    path: 'Shacharit > Tefillin',
    from: 4,
    optionalParts: [{ from: 7, label: WHEN_SAID.tefillinInterruption }],
  },
});
const ASHKENAZ_TEFILLIN_CHOL_HAMOED = { at: 0, ...NOTES.tefillinCholHamoed };

// The tallit katan blessing, ahead of the tefillin in the standalone text and ahead of the tallit gadol
// in Shacharit, under an authored line that names who says it. Edot HaMizrach prints none. Sefard
// starts after its own "before putting on the tallit katan" instruction, which the line replaces.
const TALLIT_KATAN = notForWomen({
  ashkenaz: { ...ASHKENAZ, path: ashkenazPrep('Tzitzit'), insert: [{ at: 0, ...NOTES.tallitKatan }] },
  sefard: {
    ...SEFARD,
    path: 'Upon Arising > Modeh Ani',
    from: 5,
    to: 6,
    insert: [{ at: 5, ...NOTES.tallitKatan }],
  },
  chabad: {
    ...CHABAD,
    path: 'Shacharit > Tzitzit and Tallit',
    from: 1,
    to: 1,
    insert: [{ at: 1, ...NOTES.tallitKatan }],
  },
});

const SHEMA = {
  ashkenaz: { ...ASHKENAZ, path: 'Weekday > Shacharit > Blessings of the Shema > Shema' },
  sefard: { ...SEFARD, path: 'Weekday Shacharit > The Shema' },
  edot_hamizrach: { ...EDOT, path: 'Weekday Shacharit > The Shema' },
  chabad: { ...CHABAD, path: 'Shacharit > Blessings of the Shema' },
};
const TEFILLIN_SHEMA = {
  ashkenaz: { ...SHEMA.ashkenaz, from: 1, to: 7, optionalParts: [{ from: 1, label: WHEN_SAID.alone }] },
  sefard: { ...SHEMA.sefard, from: 18, to: 24, optionalParts: [{ from: 18, label: WHEN_SAID.alone }] },
  edot_hamizrach: { ...SHEMA.edot_hamizrach, from: 10, to: 14 },
  chabad: { ...SHEMA.chabad, from: 9, to: 13 },
};

// Neither tallit nor tefillin at Shacharit on Tisha B'Av. Tefillin on Chol HaMoed follows
// keepsCholHamoed() in src/utils/skipRules.ts: Ashkenaz abroad keeps it, every other case skips it.
// A condition cannot say "not (Chol HaMoed and Israel)", so Ashkenaz carries its tefillin twice,
// once for ordinary days and once, with the Chol HaMoed note, for Chol HaMoed abroad.
// The chapters of a long text are what its section picker lists (the user's division of Shacharit,
// 2026-10-10). A chapter opens on the first spec of a section; the sections up to the next chapter
// belong to it. `specs` is one spec or a list whose first spec opens the chapter.
function chapter(label, specs) {
  if (Array.isArray(specs)) return [{ ...specs[0], chapter: label }, ...specs.slice(1)];
  return { ...specs, chapter: label };
}

function tallitAndTefillin(nusach, { tallitGadol = TALLIT_GADOL[nusach], tefillin = TEFILLIN[nusach] } = {}) {
  const title = T.tallitAndTefillin;
  const ordinaryDay = { none: ['tishaBav', ...CHOL_HAMOED.any] };
  const tallitKatan = TALLIT_KATAN[nusach];
  const specs = [
    ...(tallitKatan ? [{ ...tallitKatan, title, when: NOT_TISHA_BAV }] : []),
    { ...tallitGadol, title, when: NOT_TISHA_BAV },
    { ...tefillin, title, when: ordinaryDay },
  ];
  if (nusach === 'ashkenaz') {
    specs.push({
      ...TEFILLIN.ashkenaz,
      title,
      when: { any: CHOL_HAMOED.any, none: ['tishaBav', 'inIsrael'] },
      insert: [ASHKENAZ_TEFILLIN_CHOL_HAMOED],
    });
  }
  return specs;
}

const TIKKUN_PSALMS = [
  [16, 'טז'],
  [32, 'לב'],
  [41, 'מא'],
  [42, 'מב'],
  [59, 'נט'],
  [77, 'עז'],
  [90, 'צ'],
  [105, 'קה'],
  [137, 'קלז'],
  [150, 'קנ'],
];

// The weekly division: the first psalm of each day, which opens that day's picker entry.
const TEHILLIM_WEEK = [
  [1, { he: 'ליום ראשון', en: 'Sunday' }],
  [30, { he: 'ליום שני', en: 'Monday' }],
  [51, { he: 'ליום שלישי', en: 'Tuesday' }],
  [73, { he: 'ליום רביעי', en: 'Wednesday' }],
  [90, { he: 'ליום חמישי', en: 'Thursday' }],
  [107, { he: 'ליום שישי', en: 'Friday' }],
  [120, { he: 'ליום שבת', en: 'Shabbat' }],
];

// The five books by their first and last psalm: a book's heading opens its first psalm, and its Yehi
// Ratzon follows its last.
const TEHILLIM_BOOKS = [
  [1, 41, { he: 'ספר ראשון', en: 'First Book' }],
  [42, 72, { he: 'ספר שני', en: 'Second Book' }],
  [73, 89, { he: 'ספר שלישי', en: 'Third Book' }],
  [90, 106, { he: 'ספר רביעי', en: 'Fourth Book' }],
  [107, 150, { he: 'ספר חמישי', en: 'Fifth Book' }],
];

// The alternatives the prayer after a whole book prints, in book order: which book of Tehillim, and
// the book of the Torah it stands for.
const BOOK_ORDINALS = ['רִאשׁוֹן', 'שֵׁנִי', 'שְׁלִישִׁי', 'רְבִיעִי', 'חֲמִישִׁי'];
const BOOK_CHUMASHIM = ['בְּרֵאשִׁית', 'שְׁמוֹת', 'וַיִּקְרָא', 'בַּמִּדְבָּר', 'דְּבָרִים'];

// Psalm 119's 22 stanzas of eight verses, each opening with its letter.
const PSALM_119_STANZAS = [
  ['א', 'Aleph'],
  ['ב', 'Bet'],
  ['ג', 'Gimel'],
  ['ד', 'Dalet'],
  ['ה', 'He'],
  ['ו', 'Vav'],
  ['ז', 'Zayin'],
  ['ח', 'Chet'],
  ['ט', 'Tet'],
  ['י', 'Yod'],
  ['כ', 'Kaf'],
  ['ל', 'Lamed'],
  ['מ', 'Mem'],
  ['נ', 'Nun'],
  ['ס', 'Samech'],
  ['ע', 'Ayin'],
  ['פ', 'Pe'],
  ['צ', 'Tsadi'],
  ['ק', 'Kof'],
  ['ר', 'Resh'],
  ['ש', 'Shin'],
  ['ת', 'Tav'],
];

const MINYAN_ONLY_TITLES = [
  T.halfKaddish,
  T.kaddish,
  T.kaddishAfterAdditions,
  T.mournersKaddish,
  T.kaddishDerabbanan,
  T.barchu,
  T.closingBarchu,
  T.torahReading,
  T.returningTorah,
].map((title) => title.he);

// Nishmat as a text of its own (the user's decision of 2026-10-18): from "נשמת כל חי" through the end
// of "ובמקהלות", without Yishtabach, whose closing blessing belongs to the morning service. Each
// nusach takes it from its Shabbat morning service, without the Shabbat and Yom Tov notes; Chabad
// takes the Metsudah Sefard text, which is not verified identical to the Chabad wording.
function ashkenazNishmat() {
  const pesukei = 'Shabbat > Shacharit > Pesukei Dezimra';
  return [
    { ...DAAT, en: undefined, title: T.nishmat, path: `${pesukei} > Nishmat Kol Chai` },
    {
      ...DAAT,
      en: undefined,
      title: T.nishmat,
      path: `${pesukei} > Shochen Ad`,
      edits: [
        { seg: 0, from: '<em><small>ביום טוב ינגן החזן "האל בתעצומות”:</small></em> <br>', to: '' },
        { seg: 1, from: '<em><small>בשבת מתחיל החזן "שוכן עד”:</small></em> <br>', to: '' },
      ],
    },
  ];
}

function sefardNishmat() {
  return [
    {
      he: 'metsudahShabbatHe',
      en: 'metsudahShabbatEn',
      title: T.nishmat,
      path: 'The Morning Prayers > Nishmas',
      transform: (html) => html.replace(/❖/g, ''),
      from: 1,
      to: 151,
      groups: [
        [1, 32],
        [33, 67],
        [68, 98],
        [99, 113],
        [115, 121],
        [123, 127],
        [128, 135],
        [136, 151],
      ],
    },
  ];
}

function edotNishmat() {
  return [
    {
      ...EDOT,
      title: T.nishmat,
      path: "Shabbat Shacharit > Pesukei D'Zimra",
      from: 19,
      to: 27,
      edits: [{ seg: 27, from: 'מְשִׁיחֶֽךָ. וּבְכֵן', to: 'מְשִׁיחֶֽךָ.' }],
    },
  ];
}

// The Ashkenazi selichot books print a selichot of its own for each day, by the source's day nodes:
// the Nth weekday from Leil Selichot, Erev Rosh Hashana, Tzom Gedaliah, the Nth weekday of the Ten
// Days and Erev Yom Kippur (Wikisource "סדר הסליחות/טבלת סליחות אשכנז").
const SELICHOT_DAY_FLAGS = {
  'First Day': 'selichotDay1',
  'Second Day': 'selichotDay2',
  'Third Day': 'selichotDay3',
  'Fourth Day': 'selichotDay4',
  'Fifth Day': 'selichotDay5',
  'Sixth Day': 'selichotDay6',
  'Seventh Day': 'selichotDay7',
  'Erev Rosh Hashana': 'erevRoshHashana',
  'Fast of Gedaliah': 'tzomGedaliah',
  'Second Day of the Ten Days of Penitence': 'selichotTeshuva2',
  'Third Day of the Ten Days of Penitence': 'selichotTeshuva3',
  'Fourth Day of the Ten Days of Penitence': 'selichotTeshuva4',
  'Fifth Day of the Ten Days of Penitence': 'selichotTeshuva5',
  'Yom Kippur Eve': 'erevYomKippur',
};

// One entry per chapter of a day node, in source order: its title (a `T` key, or the selichah's
// number and opening words), the source notes a label replaces (`drop`), the chazzan's Kaddish
// (`chazzan`) and what only a minyan says (`withMinyan`: the 13 Middot with the "קהל וחזן" note
// above them, and the Aramaic passages the source says only a minyan says), by index in the chapter;
// `reviewed` lists a selichah name the source prints in small print, read as a heading.
// A chapter the source leaves empty is null.
const SELICHOT_LITA = {
  'First Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['א. איך נפתח פה', 'Selichah 1'], { withMinyan: [[11, 13]] }],
    [['ב. אין מי יקרא בצדק', 'Selichah 2'], { withMinyan: [[15, 17]] }],
    [['ג. תבא לפניך שועת חנון', 'Selichah 3'], { withMinyan: [[16, 18]] }],
    [['ד. במוצאי מנוחה קדמנוך', 'Selichah 4'], { reviewed: [0], withMinyan: [[10, 12]] }],
    ['alTizkor'],
    ['shemaKoleinu'],
    ['elRachumShimcha'],
    ['macheiUmasei', { drop: [0, 11], chazzan: [[12, 16]], withMinyan: [[1, 4]] }],
  ],
  'Second Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[4, 6]] }],
    [['ה. אם עונינו רבו להגדיל', 'Selichah 5'], { withMinyan: [[10, 12]] }],
    [['ו. אויתיך קויתיך מארץ מרחקים', 'Selichah 6'], { withMinyan: [[11, 13]] }],
    [['ז. ישראל נושע בה׳', 'Selichah 7'], { withMinyan: [[8, 10]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [22, 33], chazzan: [[34, 38]], withMinyan: [[23, 26]] }],
  ],
  'Third Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[4, 6]] }],
    [['ח. אין כמדת בשר מדתך', 'Selichah 8'], { withMinyan: [[14, 16]] }],
    [['ט. אני יום אירא', 'Selichah 9'], { withMinyan: [[11, 13]] }],
    [['י. מלאכי רחמים משרתי', 'Selichah 10'], { withMinyan: [[10, 12]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [22, 33], chazzan: [[34, 38]], withMinyan: [[23, 26]] }],
  ],
  'Fourth Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[4, 6]] }],
    [['יא. אני קראתיך כי תענני', 'Selichah 11'], { withMinyan: [[10, 12]] }],
    [['יב. איה כל נפלאותיך', 'Selichah 12'], { withMinyan: [[16, 18]] }],
    [['יג. חוקר הכל וסוקר', 'Selichah 13'], { withMinyan: [[6, 8]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [22, 33], chazzan: [[34, 38]], withMinyan: [[23, 26]] }],
  ],
  'Fifth Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[4, 6]] }],
    [['יד. ישראל עמך תחנה עורכים', 'Selichah 14'], { withMinyan: [[11, 13]] }],
    [['טו. אלהים בישראל גדול', 'Selichah 15'], { withMinyan: [[14, 16]] }],
    [['טז. ישמיענו סלחתי ישב', 'Selichah 16'], { withMinyan: [[9, 11]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [22, 33], chazzan: [[34, 38]], withMinyan: [[23, 26]] }],
  ],
  'Sixth Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[4, 6]] }],
    [['יז. אקרא בשמך', 'Selichah 17'], { withMinyan: [[11, 13]] }],
    [['יח. איה קנאתך', 'Selichah 18'], { withMinyan: [[11, 13]] }],
    [['יט. ישב בסתר עליון', 'Selichah 19'], { withMinyan: [[10, 12]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [22, 33], chazzan: [[34, 38]], withMinyan: [[23, 26]] }],
  ],
  'Seventh Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[4, 6]] }],
    [['כ. בתולת בת יהודה', 'Selichah 20'], { withMinyan: [[10, 12]] }],
    [['כא. אפס הוד כבודה', 'Selichah 21'], { withMinyan: [[11, 13]] }],
    [['כב. אם עונינו ענו', 'Selichah 22'], { withMinyan: [[15, 17]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [22, 33], chazzan: [[34, 38]], withMinyan: [[23, 26]] }],
  ],
  'Erev Rosh Hashana': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['כג. ה׳ אלהי הצבאות', 'Selichah 23'], { withMinyan: [[15, 17]] }],
    [['כד. איככה אפצה פה', 'Selichah 24'], { withMinyan: [[12, 14]] }],
    [['כה. אדון מועד כתקח', 'Selichah 25'], { withMinyan: [[9, 11]] }],
    [['כו. מרבים צרכי עמך', 'Selichah 26'], { withMinyan: [[10, 12]] }],
    [['כז. אנא עוררה', 'Selichah 27'], { withMinyan: [[16, 18]] }],
    [['כח. אל אלוה', 'Selichah 28'], { withMinyan: [[26, 28]] }],
    [['כט. אל אמונה עזרה הבה', 'Selichah 29'], { withMinyan: [[15, 17]] }],
    [['ל. אלהים יראה לו', 'Selichah 30'], { withMinyan: [[18, 20]] }],
    [['לא. אמת אתה הוא', 'Selichah 31'], { withMinyan: [[25, 27]] }],
    [['לב. חיים ארוכים', 'Selichah 32'], { withMinyan: [[27, 29]] }],
    [['לג. מלך אחד יהיה', 'Selichah 33'], { withMinyan: [[25, 27]] }],
    [['לד. אדון בפקדך אנוש', 'Selichah 34'], { withMinyan: [[10, 11]] }],
    [['לה. אדון בשפטך אנוש', 'Selichah 35'], { withMinyan: [[9, 11]] }],
    [['לו. אזעק אל אלהים', 'Selichah 36'], { withMinyan: [[10, 12]] }],
    [['לז. אב לרחם ורב', 'Selichah 37'], { withMinyan: [[12, 14]] }],
    [['לח. שלש עשרה מדות האמורות', 'Selichah 38'], { withMinyan: [[15, 17]] }],
    [['לט. מפלטי אלי צורי', 'Selichah 39'], { withMinyan: [[14, 16]] }],
    [['מ. שופט כל הארץ', 'Selichah 40'], { withMinyan: [[7, 9]] }],
    [['מא. אליך צורי כפי', 'Selichah 41']],
    [['מב. זכר ברית אברהם', 'Selichah 42']],
    ['shemaYisrael'],
    ['shemaKoleinu'],
    [['ובכן יהי רצון', "Rav Saadia Gaon's Supplication 1"]],
    [['שכחנו את טובותיך', "Rav Saadia Gaon's Supplication 2"]],
    [['ועתה ה׳ אלהינו', "Rav Saadia Gaon's Supplication 3"]],
    [['אנא הבט בצדקת', "Rav Saadia Gaon's Supplication 4"]],
    [['מג. אנקת מסלדיך תעל', 'Selichah 43'], { drop: [8], withMinyan: [[9, 9]] }],
    [['מד. תפלה תקח תחנה', 'Selichah 44']],
    [['מה. אדוני האדונים השקיפה', 'Selichah 45'], { drop: [12], chazzan: [[13, 17]] }],
  ],
  'Fast of Gedaliah': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['מו. אז טרם נמתחו', 'Selichah 46'], { withMinyan: [[11, 13]] }],
    [['מז. את ה׳ בהמצאו', 'Selichah 47'], { withMinyan: [[11, 13]] }],
    [['מח. אבלה נפשי', 'Selichah 48'], { withMinyan: [[9, 11]] }],
    [['מט. אמנת מאז', 'Selichah 49'], { withMinyan: [[9, 11]] }],
    [['נ. אורך ואמתך שלח', 'Selichah 50'], { withMinyan: [[14, 16]] }],
    [['נא. תשוב תרחמנו', 'Selichah 51'], { withMinyan: [[11, 13]] }],
    [['נב. אם אפס רבע הקן', 'Selichah 52'], { withMinyan: [[19, 21]] }],
    [['נג. הורית דרך תשובה', 'Selichah 53'], { withMinyan: [[10, 12]] }],
    [['נד. יקרו רעיך רב', 'Selichah 54']],
    [['נה. זכר ברית אברהם', 'Selichah 55']],
    [['נו. שמע ישראל ה׳', 'Selichah 56']],
    ['shemaKoleinu'],
    [['נז. יעזב רשע נתיבו', 'Selichah 57'], { drop: [17], withMinyan: [[18, 18]] }],
    [['נח. תורה הקדושה התחנני', 'Selichah 58']],
    [['נט. גרוני נחר זועק', 'Selichah 59'], { drop: [12], chazzan: [[13, 17]] }],
  ],
  'Second Day of the Ten Days of Penitence': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['ס. אליך לב ונפש', 'Selichah 60'], { withMinyan: [[8, 10]] }],
    [['סא. אך בך מקוה ישראל', 'Selichah 61'], { withMinyan: [[17, 19]] }],
    [['סב. אריה ביער דמיתי', 'Selichah 62'], { withMinyan: [[12, 14]] }],
    [['סג. אלהים אין בלתך', 'Selichah 63'], { withMinyan: [[14, 16]] }],
    [['סד. איך אוכל לבא עדיך', 'Selichah 64'], { withMinyan: [[20, 22]] }],
    [['סה. אזרחי מעבר הנהר', 'Selichah 65'], { withMinyan: [[14, 16]] }],
    [['סו. באשמרת הבקר קראתיך', 'Selichah 66'], { withMinyan: [[7, 9]] }],
    [['סז. אדון בינה הגיגנו', 'Selichah 67']],
    ['shemaKoleinu', { drop: [22], withMinyan: [[23, 23]] }],
    [['סח. שבת הכסא', 'Selichah 68'], { drop: [17], chazzan: [[18, 22]] }],
  ],
  'Third Day of the Ten Days of Penitence': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['סט. שחרנוך בקשנוך', 'Selichah 69'], { withMinyan: [[8, 10]] }],
    [['ע. אליך האל', 'Selichah 70'], { withMinyan: [[9, 11]] }],
    [['עא. תערג אליך', 'Selichah 71'], { withMinyan: [[11, 13]] }],
    [['עב. שוממתי ברב יגוני', 'Selichah 72'], { withMinyan: [[14, 16]] }],
    [['עג. ירושלים את ה׳', 'Selichah 73'], { withMinyan: [[26, 28]] }],
    [['עד. אזרחי העיר ממזרח', 'Selichah 74'], { withMinyan: [[10, 12]] }],
    [['עה. שחר קמתי להודות', 'Selichah 75'], { withMinyan: [[8, 10]] }],
    [['עו. יושב בגבהי מרומים', 'Selichah 76']],
    ['shemaKoleinu', { drop: [22], withMinyan: [[23, 23]] }],
    [['עז. שערי שמים בלולי', 'Selichah 77'], { drop: [18], chazzan: [[19, 23]] }],
  ],
  'Fourth Day of the Ten Days of Penitence': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['עח. אשת נעורים האהובה', 'Selichah 78'], { withMinyan: [[8, 10]] }],
    [['עט. אמנם אנחנו חטאנו', 'Selichah 79'], { withMinyan: [[12, 14]] }],
    [['פ. ארבעה אבות', 'Selichah 80'], { withMinyan: [[21, 23]] }],
    [['פא. אתה חלקי', 'Selichah 81'], { withMinyan: [[27, 29]] }],
    [['פב. שלום תשפת לנו', 'Selichah 82'], { withMinyan: [[25, 27]] }],
    [['פג. איתן למד דעת', 'Selichah 83'], { withMinyan: [[14, 16]] }],
    [['פד. בין כסה לעשור', 'Selichah 84'], { withMinyan: [[10, 12]] }],
    [['פה. אריד בשיחי בשיחי', 'Selichah 85']],
    ['shemaKoleinu', { drop: [22], withMinyan: [[23, 23]] }],
    [['פו. מלך מלכים רם', 'Selichah 86'], { drop: [16], chazzan: [[17, 21]] }],
  ],
  'Fifth Day of the Ten Days of Penitence': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['פז. עם ה׳ חזקו', 'Selichah 87'], { withMinyan: [[10, 12]] }],
    [['פח. ה׳ אלהי ישראל', 'Selichah 88'], { withMinyan: [[11, 13]] }],
    [['פט. אזן תחן', 'Selichah 89'], { withMinyan: [[14, 16]] }],
    [['צ. אלהים ה׳ חילי', 'Selichah 90'], { withMinyan: [[18, 20]] }],
    [['צא. אמץ יוסיף', 'Selichah 91'], { withMinyan: [[10, 12]] }],
    [['צב. אז בהר מר', 'Selichah 92'], { withMinyan: [[16, 18]] }],
    [['צג. ה׳ ה׳ אל', 'Selichah 93'], { withMinyan: [[7, 9]] }],
    [['צד. איך נאנחה במשבר', 'Selichah 94']],
    [['צה. זכר ברית אברהם', 'Selichah 95']],
    [['צו. שמע ישראל ה׳', 'Selichah 96']],
    ['shemaKoleinu', { drop: [22], withMinyan: [[23, 23]] }],
    [['צז. מקוה ישראל מושיעו', 'Selichah 97'], { drop: [16], chazzan: [[17, 21]] }],
  ],
  'Yom Kippur Eve': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[2, 4]] }],
    [['צח. אדון בפקדך אנוש', 'Selichah 98'], { withMinyan: [[11, 13]] }],
    [['צט. אדון דין אם', 'Selichah 99'], { withMinyan: [[8, 10]] }],
    [['ק. ירצה צום עמך', 'Selichah 100'], { withMinyan: [[9, 11]] }],
    ['shemaKoleinu', { drop: [9], chazzan: [[10, 14]] }],
  ],
};

const SELICHOT_POLIN = {
  'First Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['א. איך נפתח פה', 'Selichah 1'], { withMinyan: [[11, 13]] }],
    [['ב. אין מי יקרא בצדק', 'Selichah 2'], { withMinyan: [[15, 17]] }],
    [['ג. תבא לפניך שועת חנון', 'Selichah 3'], { withMinyan: [[16, 18]] }],
    [['ד. במוצאי מנוחה קדמנוך', 'Selichah 4'], { reviewed: [0], withMinyan: [[10, 12]] }],
    ['alTizkor'],
    ['shemaKoleinu'],
    ['elRachumShimcha'],
    ['macheiUmasei', { drop: [0, 11], chazzan: [[12, 16]], withMinyan: [[1, 4]] }],
  ],
  'Second Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[4, 6]] }],
    [['ה. אם עונינו רבו להגדיל', 'Selichah 5'], { withMinyan: [[10, 12]] }],
    [['ו. אין כמדת בשר מדתך', 'Selichah 6'], { withMinyan: [[15, 17]] }],
    [['ז. מלאכי רחמים משרתי', 'Selichah 7'], { withMinyan: [[10, 12]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [20, 31], chazzan: [[32, 36]], withMinyan: [[21, 24]] }],
  ],
  'Third Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[4, 6]] }],
    [['ח. ישראל עמך תחנה עורכים', 'Selichah 8'], { withMinyan: [[11, 13]] }],
    [['ט. אליך נשואות עינינו', 'Selichah 9'], { withMinyan: [[9, 11]] }],
    [['י. ישראל נושע בה׳', 'Selichah 10'], { withMinyan: [[8, 10]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [20, 31], chazzan: [[32, 36]], withMinyan: [[21, 24]] }],
  ],
  'Fourth Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[4, 6]] }],
    [['יא. אני יום אירא', 'Selichah 11'], { withMinyan: [[11, 13]] }],
    [['יב. איה כל נפלאותיך', 'Selichah 12'], { withMinyan: [[16, 18]] }],
    [['יג. באשמרת הבקר קראתיך', 'Selichah 13'], { withMinyan: [[7, 9]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [20, 31], chazzan: [[32, 36]], withMinyan: [[21, 24]] }],
  ],
  'Fifth Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[4, 6]] }],
    [['יד. אויתיך קויתיך מארץ מרחקים', 'Selichah 14'], { withMinyan: [[10, 12]] }],
    [['טו. איה קנאתך', 'Selichah 15'], { withMinyan: [[11, 13]] }],
    [['טז. שחר קמתי להודות', 'Selichah 16'], { withMinyan: [[8, 10]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [20, 31], chazzan: [[32, 36]], withMinyan: [[21, 24]] }],
  ],
  'Sixth Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[4, 6]] }],
    [['יז. תערג אליך', 'Selichah 17'], { withMinyan: [[11, 13]] }],
    [['יח. ארכו הימים ודבר', 'Selichah 18'], { withMinyan: [[21, 23]] }],
    [['יט. חננו ה׳ חננו', 'Selichah 19'], { withMinyan: [[11, 13]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [20, 31], chazzan: [[32, 36]], withMinyan: [[21, 24]] }],
  ],
  'Seventh Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[4, 6]] }],
    [['כ. אנחנו החמר ואתה', 'Selichah 20'], { withMinyan: [[14, 16]] }],
    [['כא. אריה ביער דמיתי', 'Selichah 21'], { withMinyan: [[12, 14]] }],
    [['כב. ישב בסתר עליון', 'Selichah 22'], { withMinyan: [[10, 12]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [20, 31], chazzan: [[32, 36]], withMinyan: [[21, 24]] }],
  ],
  'Erev Rosh Hashana': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['כג. ה׳ אלהי הצבאות', 'Selichah 23'], { withMinyan: [[15, 17]] }],
    [['כד. איככה אפצה פה', 'Selichah 24'], { withMinyan: [[12, 14]] }],
    [['כה. אנא עוררה', 'Selichah 25'], { withMinyan: [[16, 18]] }],
    [['כו. אל אלוה', 'Selichah 26'], { withMinyan: [[26, 28]] }],
    [['כז. אדון מועד כתקח', 'Selichah 27'], { withMinyan: [[9, 11]] }],
    [['כח. אדון דין אם', 'Selichah 28'], { withMinyan: [[8, 10]] }],
    [['כט. אדון בפקדך אנוש', 'Selichah 29'], { withMinyan: [[10, 12]] }],
    [['ל. אדון בשפטך אנוש', 'Selichah 30'], { withMinyan: [[9, 11]] }],
    [['לא. אך בך לדל', 'Selichah 31'], { withMinyan: [[8, 10]] }],
    [['לב. אדם איך יזכה', 'Selichah 32'], { withMinyan: [[14, 16]] }],
    [['לג. אך במתח דין', 'Selichah 33'], { withMinyan: [[8, 10]] }],
    [['לד. אל אמונה עזרה הבה', 'Selichah 34'], { withMinyan: [[15, 16]] }],
    [['לה. חיים ארוכים', 'Selichah 35'], { withMinyan: [[27, 29]] }],
    [['לו. שלש עשרה מדות האמורות', 'Selichah 36'], { withMinyan: [[15, 17]] }],
    [['לז. אל תבא במשפט', 'Selichah 37']],
    [['לח. שופט כל הארץ', 'Selichah 38'], { withMinyan: [[7, 9]] }],
    [['לט. מפלטי אלי צורי', 'Selichah 39'], { withMinyan: [[14, 16]] }],
    [['מ. זכר ברית אברהם', 'Selichah 40']],
    [['יהי רצון מלפניך', "Rav Saadia Gaon's Supplication 1"]],
    [['שכחנו את טובותיך', "Rav Saadia Gaon's Supplication 2"]],
    ['anaHashemHaelHagadol'],
    ['meshiachTzidkecha', { drop: [11], withMinyan: [[12, 12]] }],
    [['מא. תפלה תקח תחנה', 'Selichah 41']],
    ['machniseiRachamim', { drop: [9], chazzan: [[10, 14]] }],
  ],
  'Fast of Gedaliah': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['מב. אז טרם נמתחו', 'Selichah 42'], { withMinyan: [[11, 13]] }],
    [['מג. את ה׳ בהמצאו', 'Selichah 43'], { withMinyan: [[11, 13]] }],
    [['מד. אבלה נפשי', 'Selichah 44'], { withMinyan: [[9, 11]] }],
    [['מה. אמנת מאז', 'Selichah 45'], { withMinyan: [[9, 11]] }],
    [['מו. אורך ואמתך שלח', 'Selichah 46'], { withMinyan: [[14, 16]] }],
    [['מז. תשוב תרחמנו', 'Selichah 47'], { withMinyan: [[11, 13]] }],
    [['מח. הורית דרך תשובה', 'Selichah 48'], { withMinyan: [[10, 12]] }],
    [['מט. אז בהר מר', 'Selichah 49'], { withMinyan: [[16, 18]] }],
    [['נ. זכר ברית אברהם', 'Selichah 50']],
    ['shemaKoleinu', { drop: [20], withMinyan: [[21, 21]] }],
    [['נא. תורה הקדושה התחנני', 'Selichah 51']],
    ['machniseiRachamim', { drop: [9], chazzan: [[10, 14]] }],
  ],
  'Second Day of the Ten Days of Penitence': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['נב. אליך לב ונפש', 'Selichah 52'], { withMinyan: [[8, 10]] }],
    [['נג. אני קראתיך כי תענני', 'Selichah 53'], { withMinyan: [[10, 12]] }],
    [['נד. אלכה ואשובה אל', 'Selichah 54'], { withMinyan: [[15, 17]] }],
    [['נה. אזעק אל אלהים', 'Selichah 55'], { withMinyan: [[10, 12]] }],
    [['נו. אמרנו נגזרנו לנו', 'Selichah 56'], { withMinyan: [[16, 18]] }],
    [['נז. בין כסה לעשור', 'Selichah 57'], { withMinyan: [[10, 12]] }],
    [['נח. איתן למד דעת', 'Selichah 58'], { withMinyan: [[14, 16]] }],
    ['shemaKoleinu', { drop: [20], withMinyan: [[21, 21]] }],
    [['נט. שערי שמים בלולי', 'Selichah 59'], { drop: [18], chazzan: [[19, 23]] }],
  ],
  'Third Day of the Ten Days of Penitence': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['ס. שחרנוך בקשנוך', 'Selichah 60'], { withMinyan: [[8, 10]] }],
    [['סא. אך בך מקוה ישראל', 'Selichah 61'], { withMinyan: [[17, 19]] }],
    [['סב. אליך ה׳ שועתי', 'Selichah 62'], { withMinyan: [[12, 14]] }],
    [['סג. אלהים אין בלתך', 'Selichah 63'], { withMinyan: [[14, 16]] }],
    [['סד. איך אוכל לבא עדיך', 'Selichah 64'], { withMinyan: [[20, 22]] }],
    [['סה. יחביאנו צל ידו', 'Selichah 65'], { withMinyan: [[10, 12]] }],
    [['סו. אזרחי מעבר הנהר', 'Selichah 66'], { withMinyan: [[14, 16]] }],
    ['shemaKoleinu', { drop: [20], withMinyan: [[21, 21]] }],
    [['סז. שבת הכסא', 'Selichah 67'], { drop: [17], chazzan: [[18, 22]] }],
  ],
  'Fourth Day of the Ten Days of Penitence': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['סח. שושנת ורד בין', 'Selichah 68'], { withMinyan: [[9, 11]] }],
    [['סט. אליך ה׳ אקרא', 'Selichah 69'], { withMinyan: [[12, 14]] }],
    [['ע. אתה מקדם אלהינו', 'Selichah 70'], { withMinyan: [[19, 21]] }],
    [['עא. שוממתי ברב יגוני', 'Selichah 71'], { withMinyan: [[14, 16]] }],
    [['עב. תחרות רגז הניח', 'Selichah 72'], { withMinyan: [[15, 17]] }],
    [['עג. ישמיענו סלחתי ישב', 'Selichah 73'], { withMinyan: [[9, 11]] }],
    [['עד. אם אפס רבע הקן', 'Selichah 74'], { withMinyan: [[19, 21]] }],
    ['shemaKoleinu', { drop: [20], withMinyan: [[21, 21]] }],
    [['עה. מלך מלכים רם', 'Selichah 75'], { drop: [16], chazzan: [[17, 21]] }],
  ],
  'Fifth Day of the Ten Days of Penitence': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['עו. עם ה׳ חזקו', 'Selichah 76'], { withMinyan: [[10, 12]] }],
    [['עז. אני ברב חסדך', 'Selichah 77'], { withMinyan: [[13, 15]] }],
    [['עח. אלהים בישראל גדול', 'Selichah 78'], { withMinyan: [[14, 16]] }],
    [['עט. אתה חלקי', 'Selichah 79'], { withMinyan: [[27, 29]] }],
    [['פ. תוחלת ישראל חסד', 'Selichah 80'], { withMinyan: [[16, 18]] }],
    [['פא. אזן תחן', 'Selichah 81'], { withMinyan: [[14, 16]] }],
    [['פב. ה׳ ה׳ אל', 'Selichah 82'], { withMinyan: [[7, 9]] }],
    [['פג. אל הר המור', 'Selichah 83'], { withMinyan: [[14, 16]] }],
    ['shemaKoleinu', { drop: [20], withMinyan: [[21, 21]] }],
    [['פד. מקוה ישראל מושיעו', 'Selichah 84'], { drop: [16], chazzan: [[17, 21]] }],
  ],
  'Yom Kippur Eve': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[2, 4]] }],
    [['פה. אדון דין אם', 'Selichah 85'], { withMinyan: [[8, 10]] }],
    [['פו. אדון בפקדך אנוש', 'Selichah 86'], { withMinyan: [[11, 13]] }],
    [['פז. ירצה צום עמך', 'Selichah 87'], { withMinyan: [[9, 11]] }],
    ['shemaKoleinu', { drop: [8], chazzan: [[9, 13]] }],
  ],
};

// The Chabad version leaves blank every segment Chabad does not say, and has no Ten Days or Erev
// Yom Kippur nodes: those days take the Lita text (the user's decision of 2026-10-18), which is not
// verified identical to the Chabad selichot.
const SELICHOT_CHABAD = {
  'First Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['א. איך נפתח פה', 'Selichah 1'], { withMinyan: [[12, 13]] }],
    [['ב. אין מי יקרא בצדק', 'Selichah 2'], { withMinyan: [[16, 17]] }],
    [['ג. תבא לפניך שועת חנון', 'Selichah 3'], { withMinyan: [[17, 18]] }],
    [['ד. במוצאי מנוחה קדמנוך', 'Selichah 4'], { reviewed: [0], withMinyan: [[11, 12]] }],
    ['alTizkor'],
    ['shemaKoleinu'],
    ['elRachumShimcha'],
    ['macheiUmasei', { drop: [11], chazzan: [[12, 16]] }],
  ],
  'Second Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[5, 6]] }],
    [['ה. אם עונינו רבו להגדיל', 'Selichah 5'], { withMinyan: [[11, 12]] }],
    [['ו. אויתיך קויתיך מארץ מרחקים', 'Selichah 6']],
    [['ז. ישראל נושע בה׳', 'Selichah 7'], { withMinyan: [[9, 10]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [33], chazzan: [[34, 38]] }],
  ],
  'Third Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[5, 6]] }],
    [['ח. אין כמדת בשר מדתך', 'Selichah 8'], { withMinyan: [[15, 16]] }],
    [['ט. אני יום אירא', 'Selichah 9']],
    [['י. מלאכי רחמים משרתי', 'Selichah 10'], { withMinyan: [[11, 12]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [33], chazzan: [[34, 38]] }],
  ],
  'Fourth Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[5, 6]] }],
    [['יא. אני קראתיך כי תענני', 'Selichah 11'], { withMinyan: [[11, 12]] }],
    [['יב. איה כל נפלאותיך', 'Selichah 12']],
    [['יג. חוקר הכל', 'Selichah 13'], { withMinyan: [[7, 8]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [33], chazzan: [[34, 38]] }],
  ],
  'Fifth Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[5, 6]] }],
    [['יד. ישראל עמך תחנה עורכים', 'Selichah 14'], { withMinyan: [[12, 13]] }],
    [['טו. אלהים בישראל גדול נודעת', 'Selichah 15']],
    [['טז. ישמיענו סלחתי', 'Selichah 16'], { withMinyan: [[10, 11]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [33], chazzan: [[34, 38]] }],
  ],
  'Sixth Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[5, 6]] }],
    [['יז. אקרא בשמך', 'Selichah 17'], { withMinyan: [[12, 13]] }],
    [['יח. איה קנאתך', 'Selichah 18']],
    [['יט. ישב בסתר עליון', 'Selichah 19'], { withMinyan: [[11, 12]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [33], chazzan: [[34, 38]] }],
  ],
  'Seventh Day': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka', { withMinyan: [[5, 6]] }],
    [['כ. בתולת בת יהודה', 'Selichah 20'], { withMinyan: [[11, 12]] }],
    [['כא. אפס הוד כבודה', 'Selichah 21']],
    [['כב. אם עונינו', 'Selichah 22'], { withMinyan: [[16, 17]] }],
    ['alTizkor'],
    ['shemaKoleinu', { drop: [33], chazzan: [[34, 38]] }],
  ],
  'Erev Rosh Hashana': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['כג. ה׳ אלהי הצבאות', 'Selichah 23'], { withMinyan: [[16, 17]] }],
    [['כד. איככה אפצה פה', 'Selichah 24']],
    [['כה. אדון מועד כתקח', 'Selichah 25'], { withMinyan: [[10, 11]] }],
    [['כו. מרבים צרכי עמך', 'Selichah 26'], { withMinyan: [[11, 12]] }],
    [['כז. אנא עוררה', 'Selichah 27']],
    null,
    [['כט. אל אמונה עזרה הבה', 'Selichah 29']],
    null,
    null,
    [['לב. חיים ארוכים', 'Selichah 32'], { withMinyan: [[28, 29]] }],
    [['לג. מלך אחד יהיה', 'Selichah 33']],
    [['לד. אדון בפקדך אנוש', 'Selichah 34']],
    [['לה. אדון בשפטך אנוש', 'Selichah 35'], { withMinyan: [[10, 11]] }],
    null,
    null,
    [['לח. שלש עשרה מדות האמורות', 'Selichah 38'], { withMinyan: [[16, 17]] }],
    ['alTavoBemishpat'],
    ['elMelechYoshev', { withMinyan: [[8, 9]] }],
    null,
    ['alTizkor'],
    null,
    ['shemaKoleinu'],
    [['ובכן יהי רצון', "Rav Saadia Gaon's Supplication 1"]],
    null,
    ['selichotVidui'],
    ['meshiachTzidkecha'],
    ['macheiUmasei'],
    ['machniseiRachamim'],
    ['avinuMalkeinu', { drop: [12], chazzan: [[13, 17]] }],
  ],
  'Fast of Gedaliah': [
    ['ashrei', { drop: [1], chazzan: [[2, 2]] }],
    ['lechaHashemTzedaka'],
    [['מו. אז טרם נמתחו', 'Selichah 46'], { withMinyan: [[12, 13]] }],
    [['מז. את ה׳ בהמצאו', 'Selichah 47'], { withMinyan: [[12, 13]] }],
    [['מח. אבלה נפשי', 'Selichah 48'], { withMinyan: [[10, 11]] }],
    [['מט. אמנת מאז', 'Selichah 49']],
    [['נ. אורך ואמתך שלח', 'Selichah 50']],
    [['נא. תשוב תרחמנו', 'Selichah 51']],
    [['נב. אם אפס רבע הקן', 'Selichah 52']],
    [['נג. הורית דרך תשובה', 'Selichah 53'], { withMinyan: [[11, 12]] }],
    null,
    null,
    null,
    ['shemaKoleinu'],
    ['meshiachTzidkecha'],
    ['machniseiRachamim'],
    ['vaanachnuLoNeda', { drop: [12], chazzan: [[13, 17]] }],
  ],
};

const CHABAD_SELICHOT_FROM_LITA = [
  'Second Day of the Ten Days of Penitence',
  'Third Day of the Ten Days of Penitence',
  'Fourth Day of the Ten Days of Penitence',
  'Fifth Day of the Ten Days of Penitence',
  'Yom Kippur Eve',
];

function ashkenaziSelichot(sources, days) {
  return Object.entries(days).flatMap(([day, chapters]) =>
    chapters.flatMap((chapter, index) => {
      if (!chapter) return [];
      const [title, { drop, reviewed, chazzan = [], withMinyan = [] } = {}] = chapter;
      const parts = [
        ...chazzan.map(([from, to]) => ({ from, to, label: SAID_BY.chazzan })),
        ...withMinyan.map(([from, to]) => ({ from, to, label: SAID_BY.withMinyan })),
      ];
      return [
        {
          ...sources,
          path: `${day} > ${index}`,
          title: typeof title === 'string' ? T[title] : { he: title[0], en: title[1] },
          when: { all: [SELICHOT_DAY_FLAGS[day]] },
          ...(drop ? { drop } : {}),
          ...(reviewed ? { reviewed } : {}),
          ...(parts.length ? { minyanParts: parts } : {}),
        },
      ];
    }),
  );
}

// Nusach Teiman Baladi (the batch of 2026-11-02): Hebrew Wikisource, Hebrew only. The pages print the
// divine name as יְיָ, and a few lines as an unpointed יי, which reads as the pointed form.
function baladiName(html) {
  return html
    .replace(/י"י/g, 'יְיָ')
    .replace(/(^|[\s>])יי(?=[\s,.:;<]|$)/g, '$1יְיָ')
    .replace(/יְהֹוָה/g, 'יְיָ')
    .replace(/יהֹוָה/g, 'ייָ');
}
const BALADI_SHACHARIT = { he: 'wikiBaladiShacharit', transform: baladiName };
const BALADI_MODEH = {
  from: 'מוֹדֶה <small>[/מוֹדָה]</small>',
  to: '<if voice="male,unset">מוֹדֶה</if><if voice="female">מוֹדָה</if><if voice="unset"> <small>[/מוֹדָה]</small></if>',
};
const baladiVoiceNote = (seg, printed, feminine) => ({
  seg,
  from: `${printed} <small>[/${feminine}]</small>`,
  to: `<if voice="male,unset">${printed}</if><if voice="female">${feminine}</if><if voice="unset"> <small>[/${feminine}]</small></if>`,
});

function teimanBirchot() {
  return [
    { ...BALADI_SHACHARIT, title: T.modehAni, path: '# מודה אני', edits: [{ seg: 0, ...BALADI_MODEH }], reviewed: [0] },
    { ...BALADI_SHACHARIT, title: T.morningBlessings, path: '# על נטילת ידים' },
    { ...BALADI_SHACHARIT, title: T.morningBlessings, path: '# אשר יצר' },
    { ...BALADI_SHACHARIT, title: T.morningBlessings, path: '# אלהי הנשמה', edits: [modeh(0)] },
    {
      ...BALADI_SHACHARIT,
      title: T.morningBlessings,
      path: '# ברכות השחר',
      at: { 1: NOT_FASTING_BAREFOOT },
      reviewed: [0],
      edits: [
        {
          seg: 0,
          from: '<small>ביום הכפורים ובתשעה באב מדלגים על הברכה הבאה.</small> <br> בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁעָשָׂה לִי כָּל צְרָכָי.',
          to: '<if none="tishaBav,yomKippur">בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁעָשָׂה לִי כָּל צְרָכָי.</if>',
        },
        baladiVoiceNote(0, 'גּוֹי', 'גּוֹיָה'),
        baladiVoiceNote(0, 'עָבֶד', 'שִׁפְחָה'),
        {
          seg: 0,
          from: '<small>אנשים מברכים:</small> בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁלֹּא עָשַׂנִי אִשָּׁה.',
          to: '<if voice="male,unset"><small>אנשים מברכים:</small> בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁלֹּא עָשַׂנִי אִשָּׁה.</if>',
        },
        {
          seg: 0,
          from: '<small>נשים אומרות:</small> בָּרוּךְ שֶׁעָשַׂנִי כִּרְצוֹנוֹ.',
          to: '<if voice="female,unset"><small>נשים אומרות:</small> בָּרוּךְ שֶׁעָשַׂנִי כִּרְצוֹנוֹ.</if>',
        },
        { seg: 1, from: '<small>ביום הכפורים ובתשעה באב מדלגים על הברכה הבאה.</small> <br> ', to: '' },
      ],
    },
    { ...BALADI_SHACHARIT, title: T.torahBlessings, path: '# ברכות התורה' },
  ];
}

function teimanBedtimeShema() {
  const page = { he: 'wikiBaladiBedtimeShema', transform: baladiName };
  return [
    { ...page, title: T.hamapil, path: '# המפיל' },
    {
      ...page,
      title: T.shema,
      path: '# קריאת שמע',
      drop: [1],
      reviewed: [0],
      optionalParts: [{ from: 2, to: 3, label: SOME_SAY.some }],
    },
    { ...page, title: T.bedtimePsalms, path: '# יושב בסתר', reviewed: [0] },
    { ...page, title: T.bedtimePsalms, path: '# אתה סתר לי', reviewed: [0] },
    { ...page, title: T.anaBekoach, path: '# אנא בכח' },
    { ...page, title: T.protectionVerses, path: '# למנצח בנגינות .. # בשלום יחדיו' },
    { ...page, title: T.protectionVerses, path: '# בשלום יחדיו' },
  ];
}

const TEIMAN_TEFILLIN = { ...BALADI_SHACHARIT, path: '# ברכות ציצית ותפילין', voice: NOT_FOR_WOMEN };
const TEIMAN_SHEMA = { ...BALADI_SHACHARIT, path: '# קריאת שמע' };
const TEIMAN_MORNING_SHEMA = { ...TEIMAN_SHEMA, minyanParts: [{ from: 5, label: SAID_BY.chazzan }] };

// A page that prints its instructions as plain text: every run of unvocalized words outside small print
// becomes an instruction. Run it after `baladiName()`, which vocalizes the divine name.
const UNVOCALIZED_WORD =
  '[^\\s\\u05B0-\\u05BC\\u05C1\\u05C2\\u05C7]*[\\u05D0-\\u05EA][^\\s\\u05B0-\\u05BC\\u05C1\\u05C2\\u05C7]*';
const UNVOCALIZED_RUN = new RegExp(`(?<=^|\\s)${UNVOCALIZED_WORD}(?:\\s+${UNVOCALIZED_WORD})*(?=\\s|$)`, 'g');
function plainNotes(html) {
  let depth = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((token) => {
      if (/^<small\b/i.test(token)) depth++;
      else if (/^<\/small/i.test(token)) depth = Math.max(0, depth - 1);
      return depth || token.startsWith('<')
        ? token
        : token
            .replace(UNVOCALIZED_RUN, (run) => `<small>${run}</small>`)
            .replace(/<\/small>(\s*[–\-:,.]\s*)<small>/g, '$1');
    })
    .join('');
}

const TEN_DAYS = { all: [AYT] };
const inTenDays = (seg, from, to) => ({ seg, from, to: `<if all="${AYT}">${to}</if>` });

// The Baladi weekday Maariv with the Tiklal's two nights of its own. Motzaei Shabbat (V1 315-319): after the Amidah a
// half Kaddish, Vihi Noam with Psalm 91, Ve'ata Kadosh from the Tiklal's Uva LeTzion, then Kaddish Titkabel and the
// weekday close. Tisha B'Av night (V2 204-205): the chazzan's kinah stanza and Psalm 137 before Maariv, Rachem for
// Tishkon and the individual's Aneinu (the Shacharit page's, as in Mincha) in Shema Koleinu, then only Kaddish
// Titkabel and Aleinu, and the kinot; on motzaei Shabbat the additions come first (V2 221).
const TEIMAN_MOTZAEI_ADDITIONS = { all: ['motzaeiShabbat'], any: ['viHiNoam', 'tishaBav'] };
const TISHA_BAV_AFTER_SHABBAT = { all: ['tishaBav', 'motzaeiShabbat'] };
function teimanMaariv() {
  const transform = compose(baladiName, plainNotes);
  const page = { he: 'wikiBaladiMaariv', path: '*', transform };
  const tishaBav = { ...TIKLAL, he: 'tiklalTishaBavMaariv', when: TISHA_BAV };
  const vihiNoam = { ...TIKLAL, he: 'tiklalVihiNoam', title: T.motzaeiShabbat, when: TEIMAN_MOTZAEI_ADDITIONS };
  const beforeMaariv = { ...tishaBav, title: T.alNaharotBavel };
  // V2 204's instruction is cut at Psalm 137, which it names, so the psalm stands where it is said.
  const toPsalm137 = 'ואם ירצה להשלים הקינה הלא היא כתובה לקמן בקינות דשחרית: ואומרים על נהרות בבל עד סופו.';
  const afterPsalm137 = `ועומד ש"ץ ומתפלל ערבית כבחול ובהכנעה וקול נמוך כאבל ואומר והוא רחום וכו'. ועומדים ומתפללים י"ח.`;
  const insteadOfTishkon = `וענד מא יצאל אלי' משען ומבטח לצדיקים יקול עוץ' תשכון רחם ה' אלהינו והד'י נוסחו וחית' יצאל אלי' שמע קולנו יקול עננו:`;
  const kaddish = { ...page, title: T.kaddish, minyan: SAID_BY.chazzan };
  const afterAmidah = (from, to, title) => ({ ...page, title, from, to, when: NOT_TISHA_BAV });
  return [
    {
      ...beforeMaariv,
      to: 3,
      edits: [{ seg: 3, from: ` ${afterPsalm137} ${insteadOfTishkon}</small>`, to: '</small>' }],
      minyanParts: [{ from: 2, to: 2, label: SAID_BY.chazzan }],
    },
    { ...teimanPsalm(T.alNaharotBavel, 137), when: TISHA_BAV },
    {
      ...beforeMaariv,
      from: 3,
      to: 3,
      edits: [
        { seg: 3, from: `${toPsalm137} `, to: '' },
        tiklalNote(
          3,
          `${afterPsalm137} ${insteadOfTishkon}`,
          `${afterPsalm137} וכשמגיע למשען ומבטח לצדיקים אומר במקום תשכון רחם ה' אלהינו, וכשמגיע לשמע קולנו אומר עננו:`,
        ),
      ],
    },
    { ...page, title: T.vehuRachum, from: 1, to: 1 },
    { ...page, title: T.barchu, from: 2, to: 3, minyan: SAID_BY.chazzanAndCongregation },
    {
      ...page,
      title: T.shemaBlessings,
      from: 4,
      to: 14,
      edits: [
        { seg: 14, from: 'יש מוסיפים: ', to: '' },
        { seg: 14, from: 'לַ י"י', to: 'לַי"י' },
        { seg: 14, from: 'בַּ י"י', to: 'בַּי"י' },
      ],
      optionalParts: [{ from: 14, label: SOME_SAY.someAdd }],
    },
    { ...page, title: T.halfKaddish, from: 15, to: 15, minyan: SAID_BY.chazzan },
    {
      ...page,
      title: T.amidah,
      from: 16,
      to: 36,
      at: { 18: TEN_DAYS, 23: TEN_DAYS, 25: MOTZAEI, 30: NO_RAIN, 31: RAIN, 36: NOT_TISHA_BAV },
      edits: [
        { seg: 20, from: '<small>בקיץ אומר</small>', to: '<if none="winter"><small>בקיץ אומר</small>' },
        { seg: 20, from: ' <small>בחורף אומר</small>', to: '</if> <if all="winter"><small>בחורף אומר</small>' },
        { seg: 20, from: 'הַגֶּשֶׁם', to: 'הַגֶּשֶׁם</if>' },
        { seg: 18, from: '(<small>בעשי"ת אומר</small> ', to: '<small>בעשי"ת אומר</small> ' },
        { seg: 18, from: 'חָי.)', to: 'חָי.' },
        { seg: 21, from: '(בעשי"ת אומר ', to: `<if all="${AYT}"><small>בעשי"ת אומר</small> ` },
        { seg: 21, from: 'לְחַיִּים.)', to: 'לְחַיִּים.</if>' },
        { seg: 25, from: '(למוצאי שבת ויו"ט- ', to: '<small>למוצאי שבת ויו"ט:</small> ' },
        { seg: 25, from: 'הַכֹּל)', to: 'הַכֹּל' },
        { seg: 22, from: '(בעשי"ת אומר וּבכֵן *) ', to: `<if none="${AYT}">` },
        { seg: 22, from: 'הַקָּדוֹשׁ:', to: 'הַקָּדוֹשׁ:</if>' },
        { seg: 23, from: '*) ', to: '<small>בעשי"ת אומר:</small> ' },
        { seg: 33, from: 'מֶלֶךְ אוֹהֵב', to: `<if none="${AYT}">מֶלֶךְ אוֹהֵב` },
        { seg: 33, from: '. (בעשי"ת אומרים ', to: `</if><if all="${AYT}">` },
        { seg: 33, from: 'הַמִּשׁפָּט):', to: 'הַמִּשׁפָּט</if>:' },
      ],
    },
    {
      ...tishaBav,
      title: T.amidah,
      from: 4,
      to: 5,
      groups: [[4, 5]],
      edits: [{ seg: 5, from: ' <small>ומשלים תפלתו ואומר קדיש תתקבל ועלינו לשבח.</small>', to: '' }],
    },
    {
      ...page,
      title: T.amidah,
      from: 37,
      to: 38,
      transform: compose(excerpt(38, 'שְׁמַע קוֹלֵנוּ', 'אַל תְּשִׁיבֵנוּ.'), transform),
    },
    { ...TEIMAN_AMIDAH, from: 38, to: 38, when: TISHA_BAV },
    {
      ...page,
      title: T.amidah,
      from: 38,
      to: 55,
      transform: compose(excerpt(38, 'כִּי אַתָּה שׁוֹמֵעַ', 'שׁוֹמֵעַ הַתְּפִלָּה:'), transform),
      at: {
        40: YAALEH_VEYAVO,
        41: YAALEH_VEYAVO,
        44: AL_HANISSIM,
        45: CHANUKAH,
        46: PURIM,
        48: TEN_DAYS,
        51: TEN_DAYS,
      },
      edits: [
        { seg: 48, from: '(בעשי"ת אומר ', to: '<small>בעשי"ת אומר</small> ' },
        { seg: 48, from: 'בְרִיתָךְ.)', to: 'בְרִיתָךְ.' },
        { seg: 40, from: 'בראש חדש ', to: '<if all="roshChodesh"><small>בראש חדש</small> ' },
        {
          seg: 40,
          from: ' בחוה"מ של פסח ',
          to: '</if><if all="cholHamoedPesach"> <small>בחוה"מ של פסח</small> ',
        },
        {
          seg: 40,
          from: ' בחוה"מ של סכות ',
          to: '</if><if all="cholHamoedSukkot"> <small>בחוה"מ של סכות</small> ',
        },
        { seg: 40, from: 'הַסֻּכּוֹת הַזֶּה.', to: 'הַסֻּכּוֹת הַזֶּה.</if>' },
      ],
    },
    { ...kaddish, from: 57, to: 57 },
    { ...kaddish, from: 58, to: 58, when: { none: ['viHiNoam', 'tishaBav'] } },
    { ...kaddish, from: 58, to: 58, when: { all: ['tishaBav'], none: ['motzaeiShabbat'] } },
    {
      ...vihiNoam,
      to: 17,
      groups: [[1, 2]],
      edits: [
        tiklalNote(
          0,
          `ויתם עלי' אלנצ'אם אלי' אכ'ר שים שלום ויקול ש"צ קדיש ויקרו בעד'ה הד'א אלמזמור.`,
          'ומשלים התפלה על סדרה עד אחר שים שלום, ואומר ש"צ קדיש, ואחריו קוראים מזמור זה:',
        ),
      ],
    },
    { ...teimanPsalm(T.motzaeiShabbat, 91), from: 15, to: 15, when: TEIMAN_MOTZAEI_ADDITIONS },
    // On Tisha B'Av the cup waits for the end of the fast (V2 221), so V1 319's havdalah clause is left out then.
    {
      ...vihiNoam,
      from: 18,
      to: 19,
      groups: [[18, 19]],
      edits: [
        tiklalNote(18, `אורך וכו' ויקול ש"צ`, 'ואומר ש"צ:'),
        tiklalNote(
          19,
          `ואתה קדוש יושב וכו' ואומרים סדר הקדושה ומשלימין כמו בחול ומבדיל על הכוס ויצ'י שמעה או סראג ויבהדי אד'א כאן כוס יין יברך.`,
          `ואתה קדוש יושב וכו' ואומרים סדר הקדושה ומשלימין כמו בחול<if none="tishaBav">, ומבדיל על הכוס, ומדליק נר של שעווה או של שמן, ומתחיל. אם הוא כוס של יין, מברך</if>.`,
        ),
      ],
    },
    {
      ...TIKLAL,
      he: 'tiklalShacharitTorah',
      title: T.motzaeiShabbat,
      when: TEIMAN_MOTZAEI_ADDITIONS,
      from: 42,
      to: 47,
      groups: [
        [42, 45],
        [46, 47],
      ],
      transform: compose(excerpt(42, 'וְאַתָּה קָדוֹשׁ', 'עַל אַרְעָא עוֹבָד'), tiklalName),
    },
    { ...kaddish, title: T.kaddishAfterAdditions, from: 57, to: 58, when: TEIMAN_MOTZAEI_ADDITIONS },
    teimanOmer({ when: OMER }),
    afterAmidah(60, 61, T.afterMaarivPsalms),
    afterAmidah(62, 62, T.rabbiChananya),
    { ...afterAmidah(64, 65, T.kaddishDerabbanan), minyan: SAID_BY.chazzan },
    { ...afterAmidah(66, 67, T.closingBarchu), minyan: SAID_BY.chazzanAndCongregation },
    {
      ...page,
      title: T.aleinu,
      from: 68,
      to: 69,
      edits: [
        inTenDays(68, '(בעשי"ת אומר כָּהֵם ולא וכו\')', '(בעשי"ת אומר כָּהֵם ולא וכו\')'),
        inTenDays(68, '(בעשי"ת אומר לְלֹא יוֹעִיל ואנחנו וכו\')', '(בעשי"ת אומר לְלֹא יוֹעִיל ואנחנו וכו\')'),
      ],
    },
    { ...tishaBav, title: T.aleinu, from: 7, to: 7, when: TISHA_BAV_AFTER_SHABBAT },
    { ...tishaBav, title: T.aleinu, from: 6, to: 6, insert: [{ at: 7, ...NOTES.tishaBavEichahKinot }] },
  ];
}

// The count is the Aramaic one of the Baladi template, every day of it through `allCases()`; the page's
// note that Baladi say no Leshem Yichud is cut to what it tells the reader.
function teimanOmer(extra = {}) {
  return {
    he: 'wikiOmer',
    title: T.omer,
    path: '*',
    from: 1,
    omer: { first: 3, stride: 1 },
    transform: baladiName,
    edits: [{ seg: 1, from: 'לא אומרים "לְשֵׁם יִחוּד קוּדְשָׁא בְרִיךְ הוּא וּשְׁכִינְתֵּיהּ", לפני', to: 'לפני' }],
    ...extra,
  };
}

// The body is "בלדי 2", whose Yaaleh Veyavo names only Rosh Chodesh and Chol HaMoed and which prints Al
// HaNissim for Purim too; "בלדי" adds what it lacks: the psalms named before the meal's grace and the zimun.
function teimanBirkatHamazon() {
  const opening = {
    he: 'wikiBaladiZimun',
    transform: compose(baladiName, plainNotes),
    path: '# ברכת המזון בלדי .. # ברכת הזן',
  };
  const body = { he: 'wikiBaladiBirkatHamazon', transform: baladiName, path: '*' };
  const psalm = (number) => teimanPsalm(T.beforeBirkat, number);
  const zimunEdits = (prefixes, first) =>
    Object.entries(prefixes).flatMap(([seg, prefix]) => [
      { seg: Number(seg), from: prefix, to: '' },
      ...(Number(seg) === first + 1 ? [] : [{ seg: Number(seg), from: '(בעשרה: ', to: '(<small>בעשרה:</small> ' }]),
    ]);
  const responses = (first) => [
    { from: first, label: SAID_BY.mezamen },
    { from: first + 1, label: SAID_BY.diners },
    { from: first + 2, label: SAID_BY.mezamen },
    { from: first + 3, label: SAID_BY.diners },
    { from: first + 4, label: SAID_BY.mezamen },
  ];
  const prefixes = (first) => ({
    [first]: 'אם מברכין בזימון אומר המברך: ',
    [first + 1]: 'המסובים עונים: ',
    [first + 2]: 'המזמן אומר: ',
    [first + 3]: 'המסובים עונים: ',
    [first + 4]: 'המזמן חוזר ואומר: ',
  });
  const yaalehVeyavoNote = '<br> <small>בראש חדש, יום טוב, חול המועד, מוסיף</small>';
  return [
    { ...opening, title: T.beforeBirkat, from: 1, to: 1 },
    psalm(23),
    { ...opening, title: T.beforeBirkat, from: 2, to: 2, edits: [{ seg: 2, from: '* ', to: '' }] },
    psalm(67),
    { ...opening, title: T.beforeBirkat, from: 3, to: 3 },
    {
      ...opening,
      title: T.zimun,
      from: 4,
      to: 10,
      edits: [
        { seg: 4, from: '<small>זימון</small> ', to: '' },
        { seg: 5, from: 'ויש נוהגים להוסיף: ', to: '' },
        ...zimunEdits(prefixes(6), 6),
      ],
      optionalParts: [{ from: 5, label: SOME_SAY.someAdd }],
      minyanParts: responses(6),
    },
    {
      ...opening,
      title: T.zimunShevaBerachot,
      optional: WHEN_SAID.shevaBerachotMeal,
      from: 12,
      to: 17,
      edits: zimunEdits(prefixes(12), 12),
      minyanParts: responses(12),
    },
    {
      ...body,
      title: T.birkatHamazon,
      from: 1,
      edits: [
        {
          seg: 2,
          from: '<br> <small> <small>בחנוכה אומר</small>',
          to: `<br><if any="${anyOf(CHANUKAH_OR_YESTERDAY)}"> <small> <small>בחנוכה אומר</small>`,
        },
        { seg: 2, from: 'בָּעֵת וּבָעוֹנָה הַזֹּאת: </small><br>', to: 'בָּעֵת וּבָעוֹנָה הַזֹּאת: </small></if><br>' },
        {
          seg: 5,
          from: yaalehVeyavoNote,
          to: `<br><if any="${anyOf(YAALEH_VEYAVO_OR_YESTERDAY)}"> <small>בראש חדש וחול המועד מוסיף</small>`,
        },
        { seg: 5, from: 'לְחֶֽסֶד וּלְרַחֲמִים.', to: 'לְחֶֽסֶד וּלְרַחֲמִים.</if>' },
        {
          seg: 6,
          from: '<small>בראש חדש:</small>',
          to: `<if any="${anyOf(ROSH_CHODESH_OR_YESTERDAY)}"><small>בראש חדש:</small>`,
        },
        {
          seg: 6,
          from: ' <small>בחוהמ״ע פסח:</small>',
          to: `</if> <if any="${anyOf(CHOL_HAMOED_PESACH_OR_YESTERDAY)}"><small>בחוהמ״ע פסח:</small>`,
        },
        {
          seg: 6,
          from: ' <small>בחוהמ״ע סוכות:</small>',
          to: `</if> <if any="${anyOf(CHOL_HAMOED_SUKKOT_OR_YESTERDAY)}"><small>בחוהמ״ע סוכות:</small>`,
        },
        { seg: 6, from: 'הַסֻּכּוֹת הַזֶּה, לְרַחֵם', to: 'הַסֻּכּוֹת הַזֶּה,</if> לְרַחֵם' },
        { seg: 8, from: ' (<small>ברכת האורח הקצרה</small> ', to: '<br>' },
        { seg: 8, from: 'יַצִּילֵֽהוּ:)<br>', to: 'יַצִּילֵֽהוּ:<br>' },
      ],
      at: { 3: PURIM_OR_YESTERDAY, 6: YAALEH_VEYAVO_OR_YESTERDAY },
      reviewed: [2],
      optionalParts: [
        { from: 2, paragraph: 1, to: 3, label: WHEN_SAID.mealBeganAlHanissim },
        { from: 5, paragraph: 1, to: 6, label: WHEN_SAID.mealBeganYaalehVeyavo },
        { from: 8, paragraph: 1, until: 2, label: WHEN_SAID.guest },
      ],
    },
  ];
}

// The page prints the Rambam's wording: a Shabbat line, which the app never shows, and no Rosh Chodesh
// or festival insert. Its one Land of Israel wording is the fruit's, kept in the closed fold. The seal prints
// the grain's ending and then the fruit's on a line of its own, which wine ends with too (the page's opening
// note), so a short note names what each ends.
function teimanAlHamichya() {
  const page = { he: 'wikiBaladiAlHamichya', transform: baladiName, path: '*' };
  const shabbat =
    '<br> <small><b>בשבת</b>:</small> וְהָנַח לָנוּ אָבִינוּ וְאַל תְּהִי צָרָה וְיָגוֹן בְּיוֹם מְנוּחָתֵנוּ.';
  const israelFruit = '<br><small>(על פירות הארץ: <b>פֵּרוֹתֶיהָ</b>)</small>';
  return [
    {
      ...page,
      title: T.alHamichya,
      edits: [
        { seg: 5, from: shabbat, to: '' },
        { seg: 6, from: israelFruit, to: '' },
        { seg: 6, from: '<b>הַפֵּירוֹת</b>', to: '<small>על היין ועל הפירות:</small> <b>הַפֵּירוֹת</b>' },
      ],
    },
    {
      ...page,
      title: T.alHamichyaIsrael,
      optional: WHEN_SAID.israelProduce,
      from: 5,
      edits: [
        { seg: 5, from: shabbat, to: '' },
        { seg: 6, from: `<b>הַפֵּירוֹת</b>${israelFruit}`, to: '<small>על הפירות:</small> <b>פֵּרוֹתֶיהָ</b>' },
      ],
      insert: [{ at: 5, ...ISRAEL_PRODUCE_NOTE }],
    },
  ];
}

function teimanShevaBerachot() {
  const blessings = [
    'בּוֹרֵא פְּרִי הַגָּפֶן :',
    'שֶׁהַכֹּל בָּרָא לִכְבוֹדוֹ:',
    'מְשַֹמֵּחַ צִיּוֹן בְּבָנֶיהָ:',
    'מְשַֹמֵּחַ חָתָן וְכַלָּה:',
  ];
  return [
    {
      he: 'wikiBaladiShevaBerachot',
      title: T.shevaBerachot,
      path: '*',
      edits: [
        { seg: 0, from: 'המברך אומר:', to: '<small>המברך אומר:</small>' },
        { seg: 0, from: ' ועונים: לְחַיֵי', to: '<br><small>ועונים:</small> לְחַיֵי<br>' },
        ...blessings.map((ending) => ({ seg: 0, from: `${ending} `, to: `${ending}<br>` })),
        { seg: 0, from: 'יוֹצֵר הָאָדָם: ', to: 'יוֹצֵר הָאָדָם:<br>', count: 2 },
      ],
      minyanParts: [{ from: 0, paragraph: 3, label: SAID_BY.withMinyan }],
    },
  ];
}

// The Tiklal follows the divine name with a geresh or gershayim (יְיָ', יְיָ", an unpointed יי') and prints
// יְהֹוָה too, once without its holam (יְהוָה, in a verse of the havdalah supplication); every form reads יְיָ.
const tiklalName = compose(
  (html) => html.replace(/(יְיָ|(?<![א-ת])יי)['"]/g, '$1').replace(/יְהוָה/g, 'יְיָ'),
  baladiName,
);
const TIKLAL = { path: '*', transform: tiklalName };
// A psalm a Baladi page or the Tiklal names by its opening words, read from the pinned Sefaria Psalms.
const teimanPsalm = (title, number) => ({
  ...psalmVerses(title, number),
  transform: compose(tanachReading, baladiName),
});
// The print's rule for Shehecheyanu (V1 366-367), which its blessings of sight open with.
const TIKLAL_NEW_THINGS = 'הבונה בית חדש או הקונה כלים חדשים, והרואה את חברו אחר שלשים יום, והלובש בגד חדש,';
// The Tiklal's instructions are Judeo-Arabic: each becomes a Hebrew one that says what it says.
const tiklalNote = (seg, printed, hebrew, count) => ({
  seg,
  from: `<small>${printed}</small>`,
  to: `<small>${hebrew}</small>`,
  ...(count ? { count } : {}),
});

// The print calls the thanks on leaving a city the traveler's prayer, with a label after it that the section
// title replaces; the prayers on entering a city and before leaving it fold as Sefard's do.
function teimanTefilatHaderech() {
  const page = { ...TIKLAL, he: 'tiklalTefilatHaderech' };
  return [
    {
      ...page,
      title: T.enteringCity,
      optional: WHEN_SAID.enteringCity,
      to: 2,
      edits: [
        tiklalNote(0, "אלד'י ידכ'ל מדינה יקול", 'הנכנס לעיר אומר:'),
        tiklalNote(1, "פאד'א דכ'ל בסלאם יקול", 'וכשנכנס בשלום אומר:'),
        tiklalNote(2, "וענד אן יטלב אלכ'רוג יקול", 'וכשבא לצאת אומר:'),
      ],
    },
    {
      ...page,
      title: T.tefilatHaderech,
      from: 3,
      to: 3,
      edits: [tiklalNote(3, "פאד'א כ'רג בסלאם יקול", 'וכשיצא בשלום אומר:')],
    },
  ];
}

// The print lists the blessings by food; each rule goes under the section of its first blessing, in the order the
// other nuschaot print them. The full after-blessings (#7 Me'ein Shalosh, #9 Borei Nefashot) are their own texts.
// Shehecheyanu, which the print only names, is read from its Chanukah lighting, under the print's own rule.
function teimanBirchotHanehenin() {
  const page = { ...TIKLAL, he: 'tiklalBirchotHanehenin' };
  const afterwards = (seg, printed = 'ובעדה', count) => tiklalNote(seg, printed, 'ואחר כך', count);
  return [
    {
      ...page,
      title: T.handWashing,
      from: 0,
      to: 1,
      edits: [
        tiklalNote(
          0,
          "כ'ל מן אכל כ'בז בר או שעיר פיחתאג נטילת ידים קבל ולו אכל כ'בז יאבס ויברך",
          'כל האוכל פת חטים או שעורים צריך נטילת ידיים לפני כן, ואפילו אוכל פת יבשה, ומברך:',
        ),
      ],
    },
    {
      ...page,
      title: T.hamotzi,
      from: 2,
      to: 5,
      reviewed: [4],
      edits: [
        tiklalNote(2, "ובעד יברך עלי' אלכ'בז מן קבל", 'ואחר כך מברך על הפת לפני האכילה:'),
        tiklalNote(
          4,
          "ואלאצלח אן יברך עלי' קרץ צחיח ופי אלסבות ואלאעיאד יברך עלי' קרצין צחאח. פאד'א פרג' מן אלמאכל יגסל ידה מן אגל אלמלח ויברך ברכת המזון והי ד' ברכות והאולי הם:",
          'ומן המובחר לברך על ככר שלם, ובשבתות ובימים טובים מברך על שני ככרות שלמים. וכשגומר לאכול רוחץ ידיו מפני המלח ומברך ברכת המזון, והיא ארבע ברכות.',
        ),
        tiklalNote(
          5,
          "אלברכה אלד'י תגב עלי' חמשת מיני דגן והו אלבר ואלשעיר ואלסאפה ואלעלס וסנבלה' אלתעלב מא צנע מנהם כ'בזא מכ'בוזא פאליבארך קבלה",
          'על חמשת מיני דגן, כל מה שעשו מהם פת אפויה, מברך לפניו:',
        ),
        tiklalNote(5, 'ובעדה ברכת המזון:', 'ואחר כך ברכת המזון.'),
      ],
    },
    {
      ...page,
      title: T.mezonot,
      from: 6,
      to: 6,
      edits: [
        tiklalNote(
          6,
          "ואן צנע מנהם עציד או הריס או סויק ואכ'יץ' במא או כ'בז ממלול ובקט ומכעך אלקצד מא כאנת צורתה משונה מצורת הפת ולם יקבע סעודתו עליו יבארך קבל ד'אלך",
          'ואם עשה מחמשת מיני הדגן דייסה וכיוצא בה, או כעכים וכיוצא בהם, הכלל: כל שצורתו משונה מצורת הפת ולא קבע סעודתו עליו, מברך לפניו:',
        ),
        tiklalNote(6, 'ובעדה', 'ואחר כך ברכה מעין שלוש.'),
      ],
    },
    {
      ...page,
      title: T.mezonot,
      from: 11,
      to: 11,
      edits: [
        tiklalNote(
          11,
          "אלברכה אלד'י עלי' אללסיס ואלקלי אן כאן בר או שעיר יבארך קבלה",
          'על הלסיס ועל הקלי, אם הם מחטים או משעורים, מברך לפניהם:',
        ),
        afterwards(11, 'ובעדה', 2),
        tiklalNote(
          11,
          "אלרז מא עמל מנה כ'בז או גירה יבארך קבלה",
          'על האורז, כל מה שעשו ממנו, פת או זולתה, מברך לפניו:',
        ),
      ],
    },
    {
      ...page,
      title: T.hagafen,
      from: 16,
      to: 16,
      edits: [
        tiklalNote(
          16,
          "אלברכה אלד'י עלי' כ'מר אלענב ומא עמל מן אלזביב אלד'י עאד פיה אלרטובה אלענבייה",
          'על יין ענבים, ועל מה שנעשה מצימוקים שעדיין יש בהם לחלוחית הענבים, מברך לפניו:',
        ),
        afterwards(16),
      ],
    },
    {
      ...page,
      title: T.haetz,
      from: 12,
      to: 14,
      groups: [[13, 14]],
      edits: [
        tiklalNote(
          12,
          "אלברכה אלד'י עלי' ת'מר אלשגר עלי' ה' מנהא והי אלענב ואלתין ואלרמאן ואלזיתון ואלתמר קבלהא",
          'על פירות האילן, על חמשה מהם, והם ענבים ותאנים ורמונים וזיתים ותמרים, מברך לפניהם:',
        ),
        afterwards(12),
        tiklalNote(13, "ועלי' באקי ת'מאר אלאשגאר מת'ל אלכ'וך ואלספרגל", 'ועל שאר פירות האילן, כגון חבושים'),
        tiklalNote(
          14,
          'ואלתפאח ואלענברוד ואלאנגאץ ואלנבק ואלאתרנג ומא ישבההם קבלהא',
          'ותפוחים ואתרוגים וכיוצא בהם, מברך לפניהם:',
        ),
        afterwards(14, 'ובעדהא'),
      ],
    },
    {
      ...page,
      title: T.haadama,
      from: 15,
      to: 15,
      edits: [
        tiklalNote(
          15,
          "ועלי' אלקת'א ואלבטיך' ואלבקול ואלגזר וסאיר ת'מאר אלארץ' קבלהא",
          'ועל קישואים ואבטיחים וירקות וגזר ושאר פירות האדמה, מברך לפניהם:',
        ),
        afterwards(15, 'ובעדהא'),
      ],
    },
    {
      ...page,
      title: T.haadama,
      from: 17,
      to: 17,
      edits: [
        tiklalNote(17, 'ואלפלפל ואלזנגביל אן כאן רטבא יבארך עליה', 'ועל פלפל וזנגביל, אם הם לחים, מברך:'),
        afterwards(17),
        tiklalNote(
          17,
          "ואן כאן יאבס פלא יחתאג ברכה: ומן שרב מן ג'יר עטש פלא יבארך עליה:",
          'ואם הם יבשים, אינם צריכים ברכה. והשותה שלא לצמאו אינו מברך.',
        ),
      ],
    },
    {
      ...page,
      title: T.shehakol,
      from: 8,
      to: 8,
      edits: [
        tiklalNote(
          8,
          "אלברכה אלד'י עלי' אנואע אלקטאני מת'ל אלד'רה ואלד'כ'ן ואלעדס כיף מא עמלת יבארך מן קבל",
          'על מיני הקטניות, כגון דורה ודוחן ועדשים, בכל אופן שנעשו, מברך לפניהם:',
        ),
        tiklalNote(8, 'מן בעד', 'ואחר כך בורא נפשות.'),
      ],
    },
    {
      ...page,
      title: T.shehakol,
      from: 10,
      to: 10,
      edits: [
        tiklalNote(
          10,
          "וכד'אלך אללבן ואלעסל ואללחם ואלביץ' ואלגבן ואלסמך ואלמא אלד'י ישרב וקת אלעטש קבלהא",
          'וכן חלב ודבש ובשר וביצים וגבינה ודגים, ומים ששותה בשעת צמא, לפניהם:',
        ),
        tiklalNote(10, "ובעדהא בורא נפשות רבות וכל מא אשבה ד'אלך.", 'ואחר כך בורא נפשות רבות. וכן כל הדומה להם.'),
      ],
    },
    {
      ...page,
      title: T.fragrance,
      from: 18,
      to: 26,
      edits: [
        tiklalNote(
          18,
          "ברכות הבשמים כמא אן חראם אן ידוק שיי אלא אן יבארך. כד'אלך חראם אן ישתם במשמום אלא אן יבארך קבלה: פאן כאן אלמשמום מן אלאשגאר כמת'ל אלעוד אלטייב ואלצנדל ואלקצט ואלמצתכא ואלורד ומא אלורד ואלבלסאן ושבהה פאלברכה עליה",
          'ברכות הבשמים. כשם שאסור לטעום כלום אלא אם כן בירך, כך אסור להריח ריח טוב אלא אם כן בירך לפניו. אם הריח מן העצים, כגון עצי אהלים וסנדל וקושט ומסטיכי וורד ומי ורדים ואפרסמון וכיוצא בהם, ברכתו:',
        ),
        tiklalNote(
          20,
          'ומא כאן מן אלאעשאב כאלרנגס ומא ישבהה פאלברכה',
          'ומה שהוא מן העשבים, כגון נרקיס וכיוצא בו, ברכתו:',
        ),
        tiklalNote(
          22,
          'ואן כאן מן אלחיואנאת כאלמסך ואלזבאד ונחוה פאלברכה',
          'ואם הוא מבעלי חיים, כגון מושק וכיוצא בו, ברכתו:',
        ),
        tiklalNote(23, 'ודהן אלבלסאן יבארך', 'ועל שמן אפרסמון מברך:'),
        tiklalNote(25, "וכל טיב מכ'לוט מן אנואע כת'ירה פאלברכה עליה", 'וכל בושם מעורב ממינים הרבה, ברכתו:'),
        tiklalNote(
          25,
          "וכד'אלך עלי' מא אשתך עליה ולם ידרי פאלברכה עליה",
          'וכן על מה שנסתפק בו ואינו יודע מה הוא, ברכתו:',
        ),
        tiklalNote(
          25,
          "ואלאת'מאר אלטייבה כאלתפאח ואלאתרנג ושבההם פאלברכה עליהם",
          'ופירות שריחם טוב, כגון תפוח ואתרוג וכיוצא בהם, ברכתם:',
        ),
        tiklalNote(
          26,
          "ואלמשמום אלחראם לא יברך עליה מת'ל אלמאכול אלחראם כמת'ל רואיח בית ע\"ז או אלטיב אלד'י עלי' ערוה מן העריות וכד'אלך אלמשמום אלד'י עמל לאזאלה' אלריאחה אלרדייה פלא יברך עליה מת'ל אלריאחה אלד'י בבית הכסא ואלד'י תעמל לאלאמואת. וכל טיב יעמל לאזאלה' אלרואיח אלרדייה מן אלגסם פלא יברך עליה: וכד'אלך כל ראיחה לם תעמל לישתם בהא אלא לתבכ'יר אלת'יאב ואלאואני פלא יברך עליהא לכון לם תעמל לאלשם:",
          'ריח של איסור אין מברכים עליו, כמו על מאכל אסור, כגון ריח בית עבודה זרה, או בושם שעל ערוה מן העריות. וכן ריח שנעשה להעביר ריח רע אין מברכים עליו, כגון הריח שבבית הכסא ושנעשה למתים. וכל בושם שנעשה להעביר ריח רע מן הגוף אין מברכים עליו. וכן כל ריח שלא נעשה להריח בו אלא לגמר בו בגדים וכלים אין מברכים עליו, לפי שלא נעשה להריח.',
        ),
      ],
    },
    {
      ...TIKLAL,
      he: 'tiklalChanukahCandles',
      title: T.shehecheyanu,
      from: 5,
      to: 5,
      insert: [{ at: 5, he: `<small>${TIKLAL_NEW_THINGS} והרואה פרי ופרח חדשים, מברך:</small>` }],
    },
  ];
}

// The print's order: the blessings of praise and thanks, then the sights. Its pointer to Kiddush Levana for the new
// moon ("כבר נכתב לעיל", #55) is left out.
function teimanBirchotHareiya() {
  const page = { ...TIKLAL, he: 'tiklalBirchotHareiya' };
  return [
    {
      ...page,
      title: T.praise,
      from: 0,
      to: 42,
      groups: [
        [0, 1],
        [5, 6],
        [11, 12],
        [26, 27],
      ],
      edits: [
        tiklalNote(
          0,
          "מן בנא בית גדיד או מלך אנייה גדידה ואלד'י ינצ'ר צאחבה בעד ל' יום ואלד'י ילבס מלבוס גדיד",
          TIKLAL_NEW_THINGS,
        ),
        tiklalNote(
          1,
          "ואלד'י ינצ'ר תמר וזהר גדיד יברך שהחיינו ואן ראי' צאחבה בעד סנה יברך",
          'והרואה פרי ופרח חדשים, מברך שהחיינו. ואם ראה את חברו אחר שנה, מברך:',
        ),
        tiklalNote(2, "אלד'י יסמע שמועה טובה יברך", 'השומע שמועה טובה מברך:'),
        tiklalNote(3, 'ואן סמע שמועה רעה יברך', 'ואם שמע שמועה רעה מברך:'),
        tiklalNote(4, "סמע במות אביה אן כ'לף לה מאל יבארך באלאבתדא", 'שמע שמת אביו, אם הניח לו ממון, מברך תחילה:'),
        tiklalNote(4, 'ובעד', 'ואחר כך'),
        tiklalNote(
          4,
          "הד'א אן מעה אכ'וה אמא אן כאן אלוארת' וחדה מברך שהחיינו:",
          'זה כשיש עמו אחים, אבל אם הוא היורש לבדו, מברך שהחיינו.',
        ),
        tiklalNote(
          5,
          "אד'א נזלת אלאמטאר וכת'ר אלמא עלי' אלארץ' אד'א נזלת אלנקטה אנעמלת",
          'כשיורדים גשמים ורבו המים על הארץ, שכשיורדת טיפה נעשית',
        ),
        tiklalNote(
          6,
          "אלנפאכ'ה וצאר אלנפאכ'את עלי' וגה אלמא ימשו תלקא בעצ'הם בעץ' אן בלגת לחד מא הנא אן כאן לה צ'יעה מלכה יברך שהחיינו ואן כאנת שרכה לה ולגירה יברך הטוב והמטיב ואן לם יכון לה צ'יעה יברך הכד'א",
          'בועה, והבועות שעל פני המים הולכות זו לקראת זו, אם הגיעו לשיעור הזה: אם יש לו שדה משלו מברך שהחיינו, ואם היא בשותפות לו ולאחר מברך הטוב והמטיב, ואם אין לו שדה מברך כך:',
        ),
        tiklalNote(7, "וכו' אלי'", "וכו' עד"),
        tiklalNote(
          8,
          "ארבעה צריכים להודות והם מריץ' אד'א תעאפא; ומחבוס אד'א כ'רג מן אלחבס. ומסאפר אלבחר אד'א וצל באלסלאם: וצפה' ד'אלך אן יקף קדאם י' מישראל לא אקל מן ד'אלך ואת'נין מנהם חכמים לא בד מנהם. ת'ם יקול",
          'ארבעה צריכים להודות, והם: חולה כשנתרפא, וחבוש כשיצא מבית האסורים, ויורד הים כשהגיע בשלום. וסדר הדבר: עומד לפני עשרה מישראל, לא פחות מזה, ושנים מהם חכמים בהכרח, ואחר כך אומר:',
        ),
        tiklalNote(10, 'וגמיע אלסאמעין יקולון לה', 'וכל השומעים אומרים לו:'),
        tiklalNote(
          11,
          "אלד'י ינצ'ר אלמואצ'ע אלד'י אנעמל פיהא נס לישראל כמתל ים סוף ואלירדן וסור יריחו ומא ישבההם",
          'הרואה מקומות שנעשה בהם נס לישראל, כגון ים סוף והירדן וחומת יריחו וכיוצא בהם,',
        ),
        tiklalNote(
          13,
          "אמא אלמואצ'ע אלד'י עמל פיה נס ליחיד פלא יברך אלא ד'אך אליחיד ואבנה ואבן אבנה מתא מא וצ'ל אליה יקול בעל הנס עצמו",
          'אבל מקום שנעשה בו נס ליחיד, אין מברך אלא אותו היחיד ובנו ובן בנו, כשמגיע אליו. בעל הנס עצמו אומר:',
        ),
        tiklalNote(15, "ואן כאן אבנה וכו' יקול", "ואם הוא בנו וכו' אומר:"),
        tiklalNote(
          16,
          "אלד'י ינצ'ר גוב אריות אלד'י רמי פיה דניאל. וכבשן האש אלד'י רמי פיה חנניה מישאל ועזריה יבארך",
          'הרואה את גוב האריות שהושלך בו דניאל, ואת כבשן האש שהושלכו בו חנניה מישאל ועזריה, מברך:',
        ),
        tiklalNote(18, "אלד'י ינצ'ר מוצ'ע יעבד פיה ע\"ז יבארך", 'הרואה מקום שעובדים בו עבודה זרה מברך:'),
        tiklalNote(
          20,
          "אלד'י ינצ'ר מוצ'ע קלעת מנה ע\"ז אן כאן בארץ ישראל יבארך",
          'הרואה מקום שנעקרה ממנו עבודה זרה, אם הוא בארץ ישראל, מברך:',
        ),
        tiklalNote(21, 'ואן כאן בחוצה לארץ יבארך', 'ואם הוא בחוצה לארץ מברך:'),
        tiklalNote(22, "ויכ'תם בכלאהמא", 'ובשתיהן מסיים:'),
        tiklalNote(23, "אלד'י ינצ'ר ביות ישראל בעמארהם יבארך", 'הרואה בתי ישראל בישובם מברך:'),
        tiklalNote(
          25,
          "ובכ'ראבהם יברך דיין האמת: אלד'י ינצ'ר ביות אלגוים באעמארהם יקול",
          'ובחורבנם מברך דיין האמת. הרואה בתי הגויים בישובם אומר:',
        ),
        tiklalNote(25, "ובכ'ראבהם", 'ובחורבנם:'),
        tiklalNote(25, "אלד'י ינצ'ר קברי ישראל יברך", 'הרואה קברי ישראל מברך:'),
        tiklalNote(28, "אלד'י ינצ'ר קבור אלגוים יקול", 'הרואה קברי הגויים אומר:'),
        tiklalNote(
          30,
          "אלד'י ינצ'ר סת מאיה' אלף שכ'ץ מן אלנאס מעא. אן כאנו גוים יקול בושה אמכם מאד. ואן כאנו ישראל והם פי ארץ ישראל כ'צוץ יבארך",
          'הרואה שש מאות אלף איש יחד: אם הם גויים אומר "בושה אמכם מאד", ואם הם ישראל, והם בארץ ישראל דווקא, מברך:',
        ),
        tiklalNote(32, "אלד'י ינצ'ר עלמא אומות העולם יברך", 'הרואה חכמי אומות העולם מברך:'),
        tiklalNote(34, "ואלד'י ינצ'ר עלמא ישראל יברך", 'והרואה חכמי ישראל מברך:'),
        tiklalNote(36, "אלד'י ינצ'ר סלאטין ישראל יברך", 'הרואה מלכי ישראל מברך:'),
        tiklalNote(38, 'ואן כאנו סלאטין אלגוים יברך', 'ואם הם מלכי הגויים מברך:'),
        tiklalNote(
          39,
          "אלד'י ינצ'ר אלסודאן ואלמג'יירין בצוור וגוההם ואעצ'אהם יברך",
          'הרואה את הכושים ואת המשונים בצורת פניהם ואבריהם מברך:',
        ),
        tiklalNote(
          40,
          "אלד'י ינצ'ר אלאעמא ואלאקטע ואלאגדם ואלאבחק ושבההם אן כאן חדת' פיהם ד'אלך מן בטן אמהם פיבארך",
          'הרואה את הסומא ואת הקיטע ואת המצורע ואת הבוהקן וכיוצא בהם, אם היה בהם הדבר מבטן אמם, מברך:',
        ),
        tiklalNote(
          41,
          "ואן חדת' פיהם ד'אלך בעד פיבארך דיין האמת: אלד'י ינצ'ר אלפיל ואלקנפוד' ואלרבאח יברך",
          'ואם נעשה בהם אחר כך, מברך דיין האמת. הרואה את הפיל ואת הקיפוד ואת הקוף מברך:',
        ),
        tiklalNote(
          42,
          "אלד'י ינצ'ר אלצוור אלחסנה באלג'איה ואלאשגאר גמילה' אלמנצ'ר יברך",
          'הרואה בריות נאות ביותר ואילנות נאים למראה מברך:',
        ),
      ],
    },
    {
      ...page,
      title: T.trees,
      from: 43,
      to: 44,
      reviewed: [43],
      edits: [
        tiklalNote(
          43,
          "אלד'י ינצ'ר תנוור אלגנאן ואלבאסתין באיאם ניסן יבארך",
          'הרואה את הגנות והפרדסים בפריחתם בימי ניסן מברך:',
        ),
      ],
    },
    {
      ...page,
      title: T.lightningThunder,
      from: 45,
      to: 46,
      edits: [
        tiklalNote(
          45,
          "עלי' אלריאח אלקוייה ועלי' אלברק ואלרעד ואלזלאזל ואלשהב וד'ואת אלאד'נאב אלד'י תתשכל באלג'ו יבארך",
          'על הרוחות החזקות, ועל הברקים והרעמים והזוועות והזיקים, והכוכבים בעלי הזנב הנראים באויר, מברך:',
        ),
      ],
    },
    {
      ...page,
      title: T.mountainsAndSeas,
      from: 47,
      to: 48,
      edits: [
        tiklalNote(
          47,
          "עלי' אלגבאל ואליפאע ואלבראר' ואלבחאר ואלאנהאר אן נצ'ר ואחד מנהם בעד ל' יום יבארך",
          'על ההרים והגבעות והמדבריות והימים והנהרות, אם ראה אחד מהם אחר שלשים יום, מברך:',
        ),
      ],
    },
    {
      ...page,
      title: T.sea,
      from: 49,
      to: 50,
      edits: [
        tiklalNote(
          49,
          "ואלד'י ינצ'ר אלבחר אלכביר מן ל' יום או אזיד יבארך",
          'והרואה את הים הגדול אחר שלשים יום או יותר מברך:',
        ),
      ],
    },
    {
      ...page,
      title: T.sun,
      from: 51,
      to: 52,
      reviewed: [51],
      edits: [
        tiklalNote(
          51,
          "אלד'י ינצ'ר אלשמס יום תקופת ניסן פי סנה' אוול מחזור התקופה אלד'י אלתקופה פיה פי לילה' אלרבוע לעולם ענד מא ינצ'ר אלשמס צבאחיה' ד'אלך אלנהאר יברך",
          'הרואה את החמה ביום תקופת ניסן, בשנה הראשונה של מחזור התקופה, שהתקופה בה לעולם בליל רביעי, כשרואה את החמה בבוקר אותו היום, מברך:',
        ),
        tiklalNote(
          51,
          "וכד'א באקי אלסבעה אלכואכב אלסיארה מתא מא וצלת לברג' אלחמל ווקפת בנקטה' אלאעתדאל ולא תמיל לא אלי' אלשמאל ולא אלי' אלגנוב פיברך ענד נצ'רהם:",
          'וכן שאר שבעת כוכבי הלכת, כשמגיעים למזל טלה ועומדים בנקודת השוויון ואינם נוטים לא לצפון ולא לדרום, מברך כשרואה אותם:',
        ),
      ],
    },
    {
      ...page,
      title: T.rainbow,
      from: 53,
      to: 54,
      edits: [tiklalNote(53, "אלד'י ינצ'ר אלקשת בענן יברך", 'הרואה את הקשת בענן מברך:')],
    },
  ];
}

// The print has the Shabbat blessing only (R14.7): on an erev Yom Tov or Yom Kippur the text says so and
// nothing else, under the titles and conditions of the other nuschaot's lighting.
function teimanCandleLighting() {
  const page = { ...TIKLAL, he: 'tiklalCandleLighting' };
  const shabbatOnly = (title, when) => ({
    ...page,
    title,
    when,
    to: 0,
    drop: [0],
    insert: [{ at: 1, he: '<small>בתכלאל נדפסה ברכת הדלקת הנר לשבת בלבד.</small>' }],
  });
  return [
    {
      ...page,
      title: T.candlesShabbat,
      when: { all: ['shabbat'], none: ['yomTov', 'yomKippur'] },
      edits: [
        tiklalNote(
          0,
          "נר שבת מצוה מד\"ס אן תשעל אלסרג לילה' אלסבת פי כל בית ולא יסרג באלאדהאן אלכדרה אלג'ליצ'ה מת'ל אלשמע ושחם אלבטן ומא אשבההא ללא יתלכ'ד ויאול אן ימ'ד אלפתילה לילה' אלסבת פלא ישעל אלא באלאדהאן אלצאפייה אלרקיקה' אלקואם כאלזית ואלסירג ודהן אלפגל ואלבקולאת ומא ישבההם וכד'אלך אלפתילה לא תכון מן אלאשגאר או מן צופה' אלבחר אלד'י יתשייט באלנאר ולא יקד באעתדאל בל מן אלעטב (אלקטן) ואלכתאן ומא שאבהה. ויברך קבל אן ישעל",
          'נר שבת מצוה מדברי סופרים, להדליק נר בליל שבת בכל בית. ואין מדליקים בשמנים עכורים ועבים, כגון שעווה וחלב, שמא יבוא למשוך את הפתילה בליל שבת, אלא בשמנים צלולים ודקים, כגון שמן זית ושמן שומשום ושמן צנון וכיוצא בהם. וכן הפתילה לא תהיה מן העצים או מצמר הים, שמתחרך באש ואינו דולק כראוי, אלא מצמר גפן ומפשתן וכיוצא בהם. ומברך קודם שידליק:',
        ),
      ],
    },
    shabbatOnly(T.candlesYomTov, { all: ['yomTov'], none: ['shabbat'] }),
    shabbatOnly(T.candlesShabbatYomTov, { all: ['shabbat', 'yomTov'] }),
    shabbatOnly(T.candlesYomKippur, { all: ['yomKippur'], none: ['shabbat'] }),
    shabbatOnly(T.candlesShabbatYomKippur, { all: ['yomKippur', 'shabbat'] }),
  ];
}

// The print's havdalah is motzaei Shabbat's: wine, spices, flame and Hamavdil, then a supplication it says
// some places say before the havdalah, folded there. Its rules for the other nights are notes under their
// nights. After Yom Kippur it says no spices "even when it fell on Shabbat", so its spices are one night
// narrower than the shared rule; a clause of an instruction that names the spices or the flame keeps the
// nights of their blessing.
function teimanHavdalah() {
  const page = { ...TIKLAL, he: 'tiklalHavdalah' };
  const spices = { any: ['motzaeiShabbat'], none: ['tishaBav', 'dayAfterYomKippur'] };
  const inline = (condition) => (text) =>
    `<if ${Object.entries(condition)
      .map(([key, flags]) => `${key}="${flags.join(',')}"`)
      .join(' ')}>${text}</if>`;
  const onSpiceNights = inline(spices);
  const onFlameNights = inline(HAVDALAH_FLAME);
  // The night that ends Rosh Hashana: the only night after a holy day in the Ten Days that is neither
  // Yom Tov nor after Shabbat (Rosh Hashana never ends on Friday).
  const motzaeiRoshHashana = { all: [AYT, 'motzaei'], none: ['yomTov', 'motzaeiShabbat'] };
  const intoCholHamoedPesach = { all: ['cholHamoedPesach', 'motzaei'], none: ['motzaeiShabbat'] };
  return [
    {
      ...page,
      title: T.hachelAleinu,
      optional: SOME_SAY.beforeHavdalah,
      from: 9,
      to: 10,
      groups: [[9, 10]],
      when: NOT_TISHA_BAV,
    },
    {
      ...page,
      title: T.havdalah,
      from: 11,
      to: 14,
      at: {
        11: { all: ['dayAfterYomKippur'] },
        12: motzaeiRoshHashana,
        13: intoCholHamoedPesach,
        14: { all: ['tishaBav', 'motzaeiShabbat'] },
      },
    },
    {
      ...page,
      title: T.havdalah,
      from: 0,
      to: 7,
      at: { ...each(0, 2, NOT_TISHA_BAV), 3: spices, ...each(4, 5, HAVDALAH_FLAME), ...each(6, 7, NOT_TISHA_BAV) },
      edits: [
        tiklalNote(
          0,
          "ומבדיל על הכוס ויצ'י שמעה או סראג ויבהדי אד'א כאן כוס יין יברך .",
          `ומבדיל על הכוס${onFlameNights(', ומדליק נר של שעווה או של שמן')}, ומתחיל. אם הוא כוס של יין, מברך:`,
        ),
        tiklalNote(
          2,
          "או שהכל , ויתנאול אלכוס אלי' אליד אליסרא וימסך אלבשמים באלימנא ויברך .",
          `ואם אינו יין, מברך שהכל.${onSpiceNights(' ומעביר את הכוס ליד שמאל, ואוחז את הבשמים בימין, ומברך:')}`,
        ),
        tiklalNote(4, 'ויברך עלי אלנר .', 'ומברך על הנר:'),
        tiklalNote(6, 'וירד אלכוס אלא אליד אלימנא ויבדיל .', `${onSpiceNights('ומחזיר את הכוס ליד ימין, ')}ומבדיל:`),
      ],
    },
    // The print names "ויתן לך" and its verses after the havdalah of motzaei Shabbat (V1 324) and prints none.
    {
      ...TIKLAL,
      he: 'tiklalVihiNoam',
      title: T.havdalah,
      from: 20,
      to: 20,
      when: { all: ['motzaeiShabbat'], none: ['tishaBav'] },
    },
  ];
}

// Psalms 121 and 150, which the print names by their opening words, are read in place from the Sefaria Psalms;
// "קול דודי", printed in the instruction type, stays inside the instruction. The heading (#0) is the title.
function teimanKiddushLevana() {
  const page = { ...TIKLAL, he: 'tiklalKiddushLevana' };
  const psalm121 = "שיר למעלות אשא עיני אל ההרים וכו' עד סופו .";
  const psalm150 = "הללויה הללו אל בקדשו וכו' עד סופו .";
  const ending =
    'וי"א קול דודי הנה זה בא מדלג על ההרים מקפץ על הגבעות : דומה דודי לצבי או לעפר האילים הנה זה עומד אחר כתלנו משגיח מן החלונות מציץ מן החרכים : וקדיש דרבנן ואומר לחבירו ג"פ שלום עליכם וילך לביתו בלב טוב כאלו קיבל פני שכינה :';
  const instruction = (title, part) => ({
    ...page,
    title,
    from: 14,
    to: 14,
    edits: [{ seg: 14, from: `<small>${psalm121} ${psalm150} ${ending}</small>`, to: `<small>${part}</small>` }],
  });
  return [
    {
      ...page,
      title: T.levanaOpening,
      from: 1,
      to: 2,
      edits: [
        tiklalNote(
          1,
          "אלד'י ינצ'ר אלקמר ענד מא יהל באוול כל שהר יבארך ויקול קבל אלברכה.",
          'הרואה את הלבנה בחידושה בתחילת כל חודש מברך, ואומר קודם הברכה:',
        ),
      ],
    },
    {
      ...page,
      title: T.levanaBlessing,
      from: 3,
      to: 13,
      groups: [
        [3, 4],
        [8, 9],
      ],
    },
    instruction(T.levanaPsalms, psalm121),
    teimanPsalm(T.levanaPsalms, 121),
    instruction(T.levanaPsalms, psalm150),
    teimanPsalm(T.levanaPsalms, 150),
    instruction(T.levanaEnding, ending),
  ];
}

// Shehecheyanu on the first night only, as the print says, and with it the rule's last sentence, which names the
// three blessings of the first night; Hanerot Halalu, which it introduces as the custom "now", stays with that
// note. The heading (#0) is the title.
function teimanChanukahCandles() {
  const page = { ...TIKLAL, he: 'tiklalChanukahCandles' };
  return [
    {
      ...page,
      title: T.chanukahBlessings,
      from: 1,
      to: 5,
      groups: [[1, 2]],
      reviewed: [1],
      at: { 5: CHANUKAH_FIRST_NIGHT },
      edits: [
        tiklalNote(
          1,
          "מצוה מדברי סופרים אן ת'סרג אלסרג עלי' אלאבואב פי ת'מאן ליאלי אלחנוכה אוולהן לילה' כ\"ה",
          'מצוה מדברי סופרים להדליק נרות על הפתחים בשמונה לילות חנוכה, הראשון שבהם ליל כ"ה',
        ),
        tiklalNote(
          2,
          "בכסליו ואלסימן כ\"ה תברכו את בני ישראל ואלסנה אלממתדה אן ישעלו פי כל בית פי אללילה אלאוולה סראג ופי אללילה אלת'אנייה סראגין. והכד'א יזידו פי כל לילה סראג חת'י' יציר יסרג פי אלילה אלת'אמנה ת'מאנייה סרג סוא כאנו אהל אלבית קליל או כת'יר ולמה חייבו חכמים תמניא יומין משום דפכא חד דמספיק לליליא אתעביד ביה ניסא וסיפק לתמניא לילי ואסור להשתמש לנר חנוכה ומן אלוגוב אן יכון נר חנוכה על שמאל הנכנס לבית כדי שתהא מזוזה מימין ונר חנוכה משמאל. ואסראג אלחנוכה ענד מג'יב אלשמס לא קבל ולא בעד ומקדאר אלד'הן אלד'י יג'על פי אלסראג קדר מא ישעל אלי' נצ'ף סאעה מן בעד מג'יב אלשמס ואלד'י ישעל באללילה אלאוולה יברך ג' ברכות:",
          'בכסלו, וסימנך "כ"ה תברכו את בני ישראל". והמנהג הפשוט שמדליקים בכל בית בלילה הראשון נר אחד ובלילה השני שני נרות, וכך מוסיפים בכל לילה נר, עד שמדליקים בלילה השמיני שמונה נרות, בין שבני הבית מועטים בין שהם מרובים. ולמה חייבו חכמים תמניא יומין, משום דפכא חד דמספיק לליליא אתעביד ביה ניסא וסיפק לתמניא לילי. ואסור להשתמש לנר חנוכה. ומן החובה שיהא נר חנוכה על שמאל הנכנס לבית, כדי שתהא מזוזה מימין ונר חנוכה משמאל. ומדליקים נר חנוכה בשקיעת החמה, לא קודם ולא אחר כך, ונותנים בנר שמן כשיעור שידלק עד חצי שעה אחר שקיעת החמה. והמדליק בלילה הראשון מברך שלש ברכות:',
        ),
        {
          seg: 2,
          from: ' והמדליק בלילה הראשון מברך שלש ברכות:</small>',
          to: `</small>${onChanukahFirstNight(' <small>והמדליק בלילה הראשון מברך שלש ברכות:</small>')}`,
        },
      ],
    },
    {
      ...page,
      title: T.hanerotHallalu,
      from: 6,
      to: 7,
      edits: [
        tiklalNote(6, "ובאקי אללילי יכ'תצר שהחיינו ועכשיו נהגו לומר", 'ובשאר הלילות משמיט שהחיינו. ועכשיו נהגו לומר:'),
      ],
    },
  ];
}

function teimanMezuzah() {
  return [
    {
      ...TIKLAL,
      he: 'tiklalMezuzah',
      title: T.mezuzah,
      edits: [
        tiklalNote(
          0,
          "פאד'א פרג' מן כתאבתהא טואהא מת'ל ספר תורה וחפר להא בכ'ד' אלבאב ואדכ'להא או ידכ'להא בכ'שבה ויסמרהא בכ'ד' אלבאב וענד מא יסמרהא בכ'ד' אלבאב יברך:",
          'כשגומר לכתבה, כורכה כספר תורה, וחופר לה במזוזת הפתח ומכניסה בה, או מכניסה בעץ, וקובעה במסמר במזוזת הפתח. ובשעה שקובעה במזוזת הפתח מברך:',
        ),
      ],
    },
  ];
}

// Nishmat as the print gives it (V1 281-285), every word and vowel kept; the instruction before it (V1 280) places
// it inside the Shabbat service and is left out, as the other nuschaot leave their notes out.
function teimanNishmat() {
  return [{ ...TIKLAL, he: 'tiklalNishmat', title: T.nishmat, from: 1, groups: [[1, 5]] }];
}

// The Shacharit page prints each Ten Days insert as a note and its text ({{הור1}}).
const BALADI_TEN_DAYS = rule(
  'Baladi Ten Days insert',
  /<small>([^<]*)<\/small><opt>([\s\S]*?)<\/opt>/g,
  (_, note, text) => `<if all="${AYT}"><small>${note}:</small> ${text}</if>`,
);
// The small letters the Tiklal prints beside the Name in the Amidah (אדני, יאהדונהי, and pairs such as יא, הר,
// הד, הי, וג, ונ, and one after "שים" the scan leaves unreadable) are kabbalistic marks, and "טו)" points to the
// commentary: none is read.
const TIKLAL_AMIDAH_MARKS = rule(
  'Tiklal Amidah marks',
  / ?<small>(?:אדני|יאהדונהי|יא|הר|הד|הי|וג|ונ|⟦\?\?\?⟧|טו\))<\/small>/g,
  () => '',
);
const TIKLAL_TEN_DAYS = rule(
  'Tiklal Ten Days insert',
  /\(<small>(בעי"ת(?: אומר)?)<\/small> ([^()]*)\)/g,
  (_, note, text) => `<if all="${AYT}"><small>${note}</small> ${text}</if>`,
);
// The Tiklal's Gevurot prints the summer and the winter wording in parentheses, each under its note.
const tiklalSeasons = (seg) => [
  { seg, from: '(<small>בקיץ אומר</small>', to: '<if none="winter"><small>בקיץ אומר</small>' },
  { seg, from: ') (<small>בחורף אומר</small>', to: '</if><if all="winter"><small>בחורף אומר</small>' },
  { seg, from: 'הַגֶּשֶׁם)', to: 'הַגֶּשֶׁם</if>' },
];
// One segment of a Tiklal page cut to the text from `first` through `last`, then read as the page reads.
const tiklalCut = (page, seg, first, last) => compose(excerpt(seg, first, last), page.transform);

// Passages of the Shacharit page and of the Tiklal's close of Shacharit that Mincha points to as well.
const TEIMAN_AMIDAH = { ...BALADI_SHACHARIT, title: T.amidah, path: '# תפילת עמידה' };
const BALADI_ATAH_KADOSH = 'אַתָּה קָדוֹשׁ וְשִׁמְךָ קָדוֹשׁ, וּקְדוֹשִׁים בְּכָל יוֹם יְהַלְלוּךָ סֶּלָה.';
const BALADI_KEDUSHA_ONLY = { seg: 6, from: `<br> ${BALADI_ATAH_KADOSH} <small>בחזרת הש"ץ:</small> `, to: '' };
const TEIMAN_HALF_KADDISH = { ...BALADI_SHACHARIT, path: '# חצי קדיש', minyan: SAID_BY.chazzan };
const TEIMAN_ASHREI = { ...BALADI_SHACHARIT, path: '# סדר היום .. # למנצח', drop: [0] };
const TEIMAN_NO_KOHANIM = { seg: 52, from: '<small>כשאין כהנים אומר החזן:</small> <br>', to: '' };
const teimanFestivalLine = (note, text, flag) => ({
  seg: 42,
  from: ` <small>${note}:</small> ${text} <br>`,
  to: `<if all="${flag}"><small>${note}:</small> ${text}</if><br>`,
});
const TEIMAN_YAALEH_VEYAVO_DAYS = [
  teimanFestivalLine('בראש חודש', 'בְּיוֹם רֹאשׁ הַחֹדֶשׁ הַזֶּה.', 'roshChodesh'),
  teimanFestivalLine(
    'בפסח',
    'בְּיוֹם מִקְרָא קֹדֶשׁ הַזֶּה, בְּיוֹם מוֹעֵד חַג הַמַּצּוֹת הַזֶּה.',
    'cholHamoedPesach',
  ),
  teimanFestivalLine(
    'בסוכות',
    'בְּיוֹם מִקְרָא קֹדֶשׁ הַזֶּה, בְּיוֹם מוֹעֵד חַג הַסֻּכּוֹת הַזֶּה.',
    'cholHamoedSukkot',
  ),
];
const TIKLAL_SHACHARIT_CLOSE = { ...TIKLAL, he: 'tiklalShacharitClose' };
const TIKLAL_TITKABEL = { ...TIKLAL_SHACHARIT_CLOSE, title: T.kaddish, from: 107, to: 107, minyan: SAID_BY.chazzan };
const TIKLAL_RABBI_CHANANYA = {
  ...TIKLAL_SHACHARIT_CLOSE,
  title: T.rabbiChananya,
  from: 121,
  to: 123,
  groups: [[122, 123]],
  edits: [{ seg: 123, from: ' <small>ואומר ש"צ קדיש דרבנן וזה נוסחו:</small>', to: '' }],
};
const TIKLAL_KADDISH_DEATID = {
  ...TIKLAL_SHACHARIT_CLOSE,
  title: T.kaddishDerabbanan,
  from: 124,
  to: 125,
  groups: [[124, 125]],
  minyan: SAID_BY.chazzan,
};
const TEIMAN_MODIM_DERABBANAN = {
  ...TEIMAN_AMIDAH,
  from: 45,
  to: 45,
  transform: compose(
    excerpt(45, 'מוֹדִים אֲנַחְנוּ לָךְ, שֶׁאַתָּה הוּא יְיָ אֱלֹהֵינוּ, אֱלֹהֵי', 'בָּרוּךְ אֵל הַהוֹדָאוֹת.'),
    baladiName,
  ),
  minyan: SAID_BY.modimDeRabbanan,
};
const TIKLAL_MINCHA = {
  ...TIKLAL,
  he: 'tiklalMincha',
  transform: compose(TIKLAL_AMIDAH_MARKS, TIKLAL_TEN_DAYS, tiklalName),
};
const TIKLAL_HALLEL = { ...TIKLAL, he: 'tiklalHallel' };
const TIKLAL_MUSAF = { ...TIKLAL, he: 'tiklalMusaf', transform: compose(TIKLAL_AMIDAH_MARKS, tiklalName) };
// The Rosh Chodesh order after Hallel (V1 330): Kaddish Titkabel, the Torah reading, Seder HaYom and the song of
// the day, then the Rosh Chodesh psalm. The print gives it in one instruction; its two parts stand where they apply.
const TIKLAL_ROSH_CHODESH_ORDER =
  "ויקול קדיש תתקבל ומוציאין ספר תורה ויקול בפתח ההיכל, יהי ה' אלהינו עמנו וכו' ויהי בנסוע וכו' וקורין בו ד' גוברי ראשו' קורא בפ' צו את בני ישראל ג' פסוקים עד ואמרת להם ולוי חוזר וקורא ואמרת להם עם שני פסוקים אחריו וג' קורא עולת תמיד ופ' וביום השבת והד' קורא ובראשי חדשיכם עד סוף הסדר ואומר קדיש, מה רב טובך וכו' ומברך למלך ולקהל ומחזיר ס\"ת למקומו ואומר יהללו את שם ה' וכו' ומתחילין סדר היום והוא רחום תהלה לדוד עד סופו ואין אומרים למנצח יענך ואומר ובא לציון וגומר הסדר ואומר מזמור של יום ובעדה יגיב מזמור ראש חדש והו הדא:";
const ROSH_CHODESH_PSALM_LEAD = ' ובעדה יגיב מזמור ראש חדש והו הדא:';
const HALF_HALLEL_ROSH_CHODESH = { all: ['roshChodesh', 'hallelHalf'] };
const ROSH_CHODESH_ON_CHANUKAH = { all: ['roshChodesh', 'chanukah'] };
const NOT_ROSH_CHODESH = { none: ['roshChodesh'] };

// Hallel from the Tiklal (V1 327-330), printed once with the passages half Hallel skips in smaller type. The
// print's days: Rosh Chodesh (V1 327) and Chol HaMoed Pesach (V2 93) half and without a blessing, Chanukah (V1
// 344) and Chol HaMoed Sukkot (V2 131) whole, with the blessings before and after. It gives no rule for the days
// some congregations add (`hallelDisputed`); there Hallel folds as in the other four nuschaot, whole, and its
// blessings follow the print's rule for a day it does not list as a whole-Hallel day. The repeat cues (אודך, אבן
// ...) stay as printed; the two markers of the small type do not.
function teimanHallel() {
  const page = { ...TIKLAL_HALLEL, title: T.hallel, optional: SOME_SAY.hallel };
  return [
    {
      ...page,
      from: 0,
      to: 0,
      when: HALF_HALLEL_ROSH_CHODESH,
      edits: [
        tiklalNote(
          0,
          "ואח\"כ קורין ההלל בדילוג. וצפה' אלדילוג הכדא. יקרא מן אוול ההלל אלי' חלמיש למעינו מים וידלג ויקול ה' זכרנו יברך אלי' ואנחנו נברך יה וידלג ויקול מה אשיב לה' אלי' בתוככי ירושלם הללויה וידלג ויקול מן המצר קראתי יה אלי' אכר ההלל, וחאל אן יצאל אלי' אודך יבדע להם ש\"צ והם יגיבון בעדה כל פצל ולא יבארך לא קבלה ולא בעדה. ואין נופלין על פניהם.",
          'ואח"כ קורין ההלל בדילוג. וזהו סדר הדילוג: קורא מתחילת ההלל עד חלמיש למעינו מים, ומדלג ואומר ה\' זכרנו יברך עד ואנחנו נברך יה, ומדלג ואומר מה אשיב לה\' עד בתוככי ירושלם הללויה, ומדלג ואומר מן המצר קראתי יה עד סוף ההלל. וכשמגיע לאודך, ש"צ מתחיל להם והם עונים אחריו כל פסוק. ואינו מברך לא לפניו ולא לאחריו. ואין נופלין על פניהם.',
        ),
      ],
    },
    {
      ...page,
      from: 101,
      to: 101,
      when: CHANUKAH,
      edits: [
        tiklalNote(
          101,
          'ואדא פרג ש"צ מן צלוה\' אלתמיד פיקרא אלהלל כאמלא ויברך קבלה ובעדה כמא נדכרה בסדר לילי הפסח',
          'וכשגומר ש"צ תפלת התמיד קורא את ההלל שלם, ומברך לפניו ולאחריו, כמו שנזכיר בסדר לילי הפסח.',
        ),
      ],
    },
    {
      ...page,
      from: 102,
      to: 102,
      when: CHOL_HAMOED_PESACH,
      edits: [
        {
          seg: 102,
          from: '<small>יום ג\' ראשון דחה"מ שחרית מנחה וערבית כמו בחול ויעלה בעבודה כדלעיל וקורין',
          to: '<small>וקורין',
        },
      ],
    },
    {
      ...page,
      from: 1,
      to: 80,
      when: HALLEL,
      drop: [18, 30, 38, 48, 57, 62],
      groups: [
        [4, 5],
        [44, 45],
      ],
      at: {
        1: WHOLE_HALLEL,
        2: WHOLE_HALLEL,
        ...each(19, 29, WHOLE_HALLEL_ONLY),
        ...each(39, 47, WHOLE_HALLEL_ONLY),
        ...each(58, 61, WHOLE_HALLEL_ONLY),
        80: WHOLE_HALLEL,
      },
      edits: [
        tiklalNote(11, '*) יעידה', 'חוזר עליו'),
        tiklalNote(39, '*) יעידה', 'חוזר עליו'),
        tiklalNote(58, '*) יעידוה', 'חוזרים עליו'),
        tiklalNote(59, '**) יעידוה', 'חוזרים עליו'),
        { seg: 79, from: '<small>*) ועונים הקהל:</small>', to: '<small>ועונים הקהל:</small>' },
      ],
      insert: [{ at: 1, ...NOTES.hallelDisputed }],
    },
    {
      ...page,
      from: 81,
      to: 81,
      when: HALF_HALLEL_ROSH_CHODESH,
      edits: [
        tiklalNote(
          81,
          TIKLAL_ROSH_CHODESH_ORDER,
          `${TIKLAL_ROSH_CHODESH_ORDER.replace(/ויקול/g, 'ואומר').replace(ROSH_CHODESH_PSALM_LEAD, '')}.`,
        ),
      ],
    },
    { ...TEIMAN_HALF_KADDISH, title: T.hallel, optional: SOME_SAY.hallel, when: UNDISPUTED_HALLEL },
    { ...TIKLAL_TITKABEL, title: T.hallel, optional: SOME_SAY.hallel, when: UNDISPUTED_HALLEL },
  ];
}

// Musaf from the Tiklal: Rosh Chodesh (V1 332-335) and, on Chol HaMoed, the festival Musaf (V2 85-89), which the
// print says is said as on Yom Tov but for the day's line (V2 93, and spelled out for Sukkot on V2 131, its Musaf
// line included). That line is pointed as the same print points the Chol HaMoed Pesach line of Maariv the V2 93
// pointer names (in havdalah.wiki). Neither Musaf prints the offering verses. The Rosh Chodesh Musaf only points
// to its Keter, which is the festival Musaf's (V2 86), and to Al HaNissim on folio 87b, which is Mincha's (V1 195);
// the festival Musaf points to Modim DeRabbanan, the Shacharit page's as in Mincha, and both repetitions say it.
// The Shabbat and Yom Tov lines are left out, as the app is never open then. The V1 333 reading "בְחֵי רָצוֹן"
// stays as printed: no other leaf of the print has the passage.
function teimanMusaf() {
  const page = { ...TIKLAL_MUSAF, title: T.musaf };
  const roshChodesh = { ...page, when: ROSH_CHODESH };
  const cholHamoed = { ...page, when: CHOL_HAMOED };
  const festival = (pesach, sukkot) =>
    `<if all="cholHamoedPesach">${pesach}</if><if all="cholHamoedSukkot">${sukkot}</if>`;
  return chapter(T.musaf, [
    { ...roshChodesh, from: 1, to: 3, edits: tiklalSeasons(3) },
    { ...roshChodesh, from: 23, to: 23, minyan: SAID_BY.kedusha },
    { ...roshChodesh, from: 4, to: 7, groups: [[5, 6]] },
    { ...TEIMAN_MODIM_DERABBANAN, title: T.musaf, when: ROSH_CHODESH },
    { ...roshChodesh, from: 8, to: 8, transform: tiklalCut(page, 8, 'מוֹדִים', 'וְצָהֳרָיִם') },
    ...[
      ['עַל הַנִּסִּים', 'הַזּוֹאת:'],
      ['וְעַל כּוּלָּם', 'מוֹדִים לָךְ'],
    ].map(([first, last]) => ({
      ...TIKLAL_MINCHA,
      title: T.musaf,
      from: 46,
      to: 46,
      when: ROSH_CHODESH_ON_CHANUKAH,
      transform: tiklalCut(TIKLAL_MINCHA, 46, first, last),
    })),
    {
      ...roshChodesh,
      from: 8,
      to: 12,
      groups: [[8, 9]],
      transform: tiklalCut(page, 8, 'הַטּוֹב', 'הַגָּדוֹל כִּי'),
    },
    {
      ...cholHamoed,
      from: 18,
      to: 31,
      drop: [22],
      groups: [[19, 20]],
      edits: [
        ...tiklalSeasons(21),
        { seg: 26, from: ' (<small>לשבת</small> שַׁבָּתוֹת לִמְנוּחָה וּ)', to: '' },
        { seg: 26, from: ' (<small>לשבת</small> אֶת יוֹם הַמָּנוֹחַ הַזֶּה)', to: '' },
        {
          seg: 26,
          from: 'אֶת יוֹם טוֹב מִקְרָא קֹדֶשׁ הַזֶּה אֶת יוֹם חַג הַמַּצוֹת הַזֶּה זְמַן חֵירוּתֵנוּ <small>בשבועות</small> אֶת יוֹם חַג הַשָּׁבוּעוֹת הַזֶּה זְמַן מַתַּן תּוֹרָתֵנוּ <small>בסוכות</small> אֶת יוֹם חַג הַסּוּכּוֹת הַזֶּה זְמַן שִׂמְחָתֵנוּ. <small>בש"ע</small> אֶת יוֹם חַג שְׁמִינִי עֲצֶרֶת הַזֶּה זְמַן שִׂמְחָתֵנוּ',
          to: `אֶת יוֹם מִקְרָא קֹדֶשׁ הַזֶּה אֶת יוֹם מוֹעֵד חַג ${festival('הַמַּצּוֹת הַזֶּה זְמַן חֵירוּתֵנוּ', 'הַסּוּכּוֹת הַזֶּה זְמַן שִׂמְחָתֵנוּ')}`,
        },
        {
          seg: 27,
          from: ' (<small>בשבת</small> יום הַמָּנוֹחַ הַזֶּה) יוֹם טוֹב מִקְרָא קֹדֶשׁ הַזֶּה יוֹם חַג הַמַּצּוֹת הַזֶּה (<small>בשבועות</small> יום חג השבועות הזה. <small>בסוכות</small> יום חג הסוכות הזה. <small>בשמיני עצרת</small> יום חג שמיני עצרת הזה)',
          to: ` יוֹם מִקְרָא קֹדֶשׁ הַזֶּה יוֹם מוֹעֵד חַג ${festival('הַמַּצּוֹת הַזֶּה', 'הַסּוּכּוֹת הַזֶּה')}`,
        },
        { seg: 30, from: ' (<small>בשבת</small> הַשַּׁבָּת וְ)', to: '' },
        { seg: 31, from: ' <small>בחזרת הש"ץ אומרים הקהל כאן מודים דרבנן:</small>', to: '' },
      ],
      minyanParts: [{ from: 23, label: SAID_BY.kedusha }],
    },
    { ...TEIMAN_MODIM_DERABBANAN, title: T.musaf, when: CHOL_HAMOED },
    { ...cholHamoed, from: 32, to: 36, groups: [[32, 33]] },
    { ...TEIMAN_HALF_KADDISH, title: T.musaf, when: MUSAF },
    { ...TIKLAL_TITKABEL, title: T.musaf, when: MUSAF },
  ]);
}

// Weekday Shacharit from the page, its empty headings filled from the 1894 Tiklal in the print's order: on Chol
// HaMoed Sukkot the lulav blessing, with the Shehecheyanu of the Chanukah page on its first day, then Hallel
// with its Kaddish Titkabel after the Amidah, the Torah service before "סדר היום", then Uva LeTzion, the songs
// of the day with the Rosh Chodesh psalm, Ein Keloheinu, the Kaddish, Musaf with its Kaddish Titkabel, the
// Ketoret, Kaddish DeAtid, Barchu and Aleinu. Where the print points to a passage, the passage is the one this
// text already holds: the page's half Kaddish for "קדיש לעילא", and Psalm 25 and "אמר רבי אלעזר", printed
// once, after every day's song. On Rosh Chodesh the print opens the ark with another verse and calls four, as
// its order after Hallel says, so the weekday opening and the call of three stay out. The parts the page lacks
// are never taken from another nusach.
function teimanShacharit() {
  const page = BALADI_SHACHARIT;
  const [modehAni, washing, asherYatzar, elokaiNeshama, blessings, torahBlessings] = teimanBirchot();
  const pesukei = (path, extra) => ({ ...page, title: T.pesukeiDezimra, path, ...extra });
  const shema = (path, extra) => ({ ...page, title: T.shemaBlessings, path, ...extra });
  const tachanun = (path, extra) => ({ ...page, title: T.tachanun, path, ...extra });
  const techina = (day) => ({ from: `;תחינה ל${day}:`, to: `<small>תחינה ל${day}:</small>` });
  const halfKaddish = TEIMAN_HALF_KADDISH;
  const torah = { ...TIKLAL, he: 'tiklalShacharitTorah' };
  const close = TIKLAL_SHACHARIT_CLOSE;
  const onDay = (from, to, weekday) => each(from, to, { all: [weekday] });
  return [
    ...chapter(T.morningBlessings, [
      modehAni,
      washing,
      { ...page, title: T.morningBlessings, path: '# אדון העולמים' },
      asherYatzar,
      elokaiNeshama,
      blessings,
      { ...page, title: T.torahBlessings, path: '# תפילה לפני פרשת התמיד' },
      torahBlessings,
    ]),
    { ...page, title: T.sovereignty, path: '# לעולם יהא אדם .. # ברכות ציצית ותפילין' },
    ...chapter(
      T.tallitAndTefillin,
      tallitAndTefillin('teiman', {
        tallitGadol: { ...TEIMAN_TEFILLIN, to: 0 },
        tefillin: { ...TEIMAN_TEFILLIN, from: 1 },
      }),
    ),
    chapter(T.pesukeiDezimra, pesukei('# המהולל')),
    pesukei('# ברוך שאמר'),
    pesukei('# מזמור לתודה'),
    pesukei('# יהי כבוד .. # פרקי הללויה', { drop: [1] }),
    pesukei('# פרקי הללויה'),
    pesukei('# ויברך דוד'),
    pesukei('# שירת הים'),
    pesukei('# רפאני'),
    pesukei('# ישתבח'),
    chapter(
      T.shemaBlessings,
      shema('# חצי קדיש וברכו', {
        minyanParts: [
          { from: 0, to: 1, label: SAID_BY.chazzan },
          { from: 2, label: SAID_BY.chazzanAndCongregation },
        ],
      }),
    ),
    shema('# ברכה ראשונה'),
    shema('# ברכה שנייה'),
    { ...TEIMAN_MORNING_SHEMA, title: T.shemaBlessings },
    shema('# ברכה שלישית'),
    chapter(T.amidah, {
      ...TEIMAN_AMIDAH,
      transform: compose(baladiName, BALADI_TEN_DAYS),
      drop: [0, 3, 5, 8, 10, 12, 14, 16, 18, 20, 23, 25, 27, 29, 31, 34, 36, 40, 44, 46, 53, 56],
      at: { 17: FAST, 21: NO_RAIN, 22: RAIN, 32: TISHA_BAV, 33: NOT_TISHA_BAV, 38: FAST, 42: YAALEH_VEYAVO },
      reviewed: [6, 50, 52],
      edits: [
        {
          seg: 4,
          from: '<small>בקיץ:</small> מוֹרִיד הַטָּל. <small>בחורף:</small> מַשִּׁיב הָרוּחַ מוֹרִיד הַגֶּשֶׁם.',
          to: '<if none="winter"><small>בקיץ:</small> מוֹרִיד הַטָּל.</if> <if all="winter"><small>בחורף:</small> מַשִּׁיב הָרוּחַ מוֹרִיד הַגֶּשֶׁם.</if>',
        },
        BALADI_KEDUSHA_ONLY,
        { seg: 6, from: 'גָּדוֹל וְקָדוֹשׁ אָתָּה.', to: `גָּדוֹל וְקָדוֹשׁ אָתָּה.<br>${BALADI_ATAH_KADOSH}` },
        { seg: 7, from: '<br> בָּרוּךְ', to: `<br> <if none="${AYT}">בָּרוּךְ` },
        {
          seg: 7,
          from: 'הָאֵל הַקָּדוֹשׁ. <small>בעשי"ת:</small> <small>',
          to: `הָאֵל הַקָּדוֹשׁ.</if><if all="${AYT}"><small>בעשי"ת:</small> `,
        },
        { seg: 7, from: 'הַמֶּלֶךְ הַקָּדוֹשׁ.</small>', to: 'הַמֶּלֶךְ הַקָּדוֹשׁ.</if>' },
        { seg: 17, from: '<small>בחזרת הש"ץ בתענית ציבור:</small> <br> ', to: '' },
        {
          seg: 26,
          from: 'מֶלֶךְ אוֹהֵב צְדָקָה וּמִשְׁפָּט. <small>בעשרת ימי תשובה</small><opt>הַמֶּלֶךְ הַמִּשְׁפָּט.</opt>',
          to: `<if none="${AYT}">מֶלֶךְ אוֹהֵב צְדָקָה וּמִשְׁפָּט.</if><if all="${AYT}">הַמֶּלֶךְ הַמִּשְׁפָּט.</if>`,
        },
        ...TEIMAN_YAALEH_VEYAVO_DAYS,
        { seg: 45, from: ' <small>בחזרת הש"ץ, הקהל אומר:</small> <br>', to: '<br>' },
        {
          seg: 45,
          from: 'בָּרוּךְ אֵל הַהוֹדָאוֹת. <small>בחנוכה:</small> <small>',
          to: 'בָּרוּךְ אֵל הַהוֹדָאוֹת.<br><if all="chanukah"><small>בחנוכה:</small> ',
        },
        {
          seg: 45,
          from: 'אָנוּ מוֹדִים לָךְ.</small> <br><small>בפורים:</small> <small>',
          to: 'אָנוּ מוֹדִים לָךְ.</if><br><if all="purim"><small>בפורים:</small> ',
        },
        { seg: 45, from: 'אָנוּ מוֹדִים לָךְ.</small> הַטּוֹב', to: 'אָנוּ מוֹדִים לָךְ.</if><br>הַטּוֹב' },
        TEIMAN_NO_KOHANIM,
      ],
      optionalParts: [{ from: 52, label: WHEN_SAID.noKohanim }],
      minyanParts: [
        { from: 6, until: 1, label: SAID_BY.kedusha },
        { from: 17, label: SAID_BY.aneinu },
        { from: 45, paragraph: 1, until: 2, label: SAID_BY.modimDeRabbanan },
        { from: 47, to: 52, label: SAID_BY.birkatKohanim },
      ],
    }),
    {
      ...TIKLAL_HALLEL,
      title: T.lulav,
      from: 103,
      to: 103,
      when: CHOL_HAMOED_SUKKOT,
      edits: [
        {
          seg: 103,
          from: '<small>שחרית כתפלת החול ומוסיף יעלה ויבא בעבודה. ויקול פי יעלה ביום מקרא קדש הזה ביום מועד חג הסוכות הזה. וכשגומר',
          to: '<small>וכשגומר',
        },
      ],
    },
    {
      ...TIKLAL,
      he: 'tiklalLulav',
      title: T.lulav,
      to: 0,
      when: CHOL_HAMOED_SUKKOT,
      edits: [
        { seg: 0, from: "<small>מן צלאתה' אלצ'בח יברך</small> ", to: '' },
        {
          seg: 0,
          from: '<small>וביום ראשון לנטילה יברך שהחיינו:</small>',
          to: '<if all="lulavShehecheyanu"><small>וביום ראשון לנטילה יברך שהחיינו:</small></if>',
        },
      ],
    },
    {
      ...TIKLAL,
      he: 'tiklalChanukahCandles',
      title: T.lulav,
      from: 5,
      to: 5,
      when: CHOL_HAMOED_SUKKOT,
      at: { 5: { all: ['lulavShehecheyanu'] } },
    },
    { ...TIKLAL, he: 'tiklalLulav', title: T.lulav, from: 4, to: 4, when: { all: ['hoshanaRabba'] } },
    ...chapter(T.hallel, teimanHallel()),
    tachanun('# נפילת אפים', {
      when: TACHANUN_SHACHARIT,
      insert: [{ at: 0, ...NOTES.tachanunDisputedShacharit }],
    }),
    tachanun('# אבינו מלכנו', {
      when: AYT_TACHANUN_SHACHARIT,
      edits: [{ seg: 0, from: 'אָבִינוּ מַלְכֵּנוּ <br>   ', to: 'אָבִינוּ מַלְכֵּנוּ ', count: 29 }],
    }),
    tachanun('# וידוי וי"ג מידות', { when: LONG_TACHANUN, minyanParts: [{ from: 2, label: SAID_BY.withMinyan }] }),
    tachanun('# והוא רחום', { when: LONG_TACHANUN }),
    tachanun("# ה' אלהי ישראל", {
      when: LONG_TACHANUN,
      at: { ...each(1, 3, { all: ['monday'] }), ...each(4, 5, { all: ['thursday'] }) },
      edits: [
        { seg: 1, ...techina('שני') },
        { seg: 4, ...techina('חמישי') },
      ],
    }),
    tachanun('# אבינו מלכנו אבינו אתה', { when: TACHANUN_SHACHARIT }),
    { ...halfKaddish, title: T.halfKaddish, when: NO_UNDISPUTED_HALLEL },
    {
      ...torah,
      title: T.torahReading,
      when: TORAH_READING,
      to: 30,
      groups: [
        [1, 2],
        [6, 7],
        [22, 24],
        [28, 29],
      ],
      at: { ...each(0, 2, NOT_ROSH_CHODESH), 30: NOT_ROSH_CHODESH },
      edits: [{ seg: 30, from: ' ואומרים הקהל</small>', to: '</small>' }],
      minyanParts: [{ from: 25, to: 29, label: SAID_BY.chazzanAndCongregation }],
    },
    { ...halfKaddish, title: T.torahReading, when: TORAH_READING },
    {
      ...torah,
      title: T.torahReading,
      when: TORAH_READING,
      from: 31,
      to: 34,
      groups: [[31, 32]],
      insert: [{ at: 31, he: '<small>ואומרים הקהל</small>' }],
    },
    {
      ...torah,
      title: T.returningTorah,
      when: TORAH_READING,
      from: 35,
      to: 39,
      minyan: SAID_BY.chazzanAndCongregation,
    },
    chapter(T.uvaLetzion, { ...TEIMAN_ASHREI, title: T.uvaLetzion }),
    { ...page, title: T.uvaLetzion, path: '# למנצח', when: TACHANUN_SHACHARIT },
    {
      ...torah,
      title: T.uvaLetzion,
      from: 40,
      to: 47,
      groups: [
        [41, 45],
        [46, 47],
      ],
    },
    { ...close, title: T.songOfDay, to: 9, at: onDay(0, 9, 'sunday') },
    {
      ...close,
      title: T.songOfDay,
      from: 33,
      to: 103,
      drop: [48, 80, 98],
      at: {
        ...onDay(33, 47, 'monday'),
        ...onDay(49, 56, 'tuesday'),
        ...onDay(57, 79, 'wednesday'),
        ...onDay(81, 97, 'thursday'),
        ...onDay(99, 103, 'friday'),
      },
      edits: [{ seg: 56, from: ` <small>לדוד אליך ה' וכו' א"ר אלעזר וכו':</small>`, to: '' }],
    },
    {
      ...TIKLAL_HALLEL,
      title: T.songOfDay,
      from: 81,
      to: 99,
      when: ROSH_CHODESH,
      edits: [tiklalNote(81, TIKLAL_ROSH_CHODESH_ORDER, 'ואחריו מביא מזמור ראש חודש, וזה הוא:')],
    },
    { ...close, title: T.songOfDay, from: 10, to: 32 },
    {
      ...close,
      title: T.einKelokeinu,
      from: 105,
      to: 106,
      groups: [[105, 106]],
      edits: [{ seg: 106, from: ' <small>תם יקול יתגדל עד לעילא ואומר:</small>', to: '' }],
    },
    { ...halfKaddish, title: T.kaddish },
    { ...TIKLAL_TITKABEL, when: NOT_MUSAF },
    ...teimanMusaf(),
    {
      ...close,
      title: T.ketoret,
      from: 108,
      to: 120,
      drop: [115],
      groups: [
        [109, 114],
        [119, 120],
      ],
      optionalParts: [{ from: 116, to: 117, label: WHEN_SAID.plague }],
    },
    TIKLAL_RABBI_CHANANYA,
    TIKLAL_KADDISH_DEATID,
    { ...close, title: T.closingBarchu, from: 126, to: 127, minyan: SAID_BY.chazzanAndCongregation },
    {
      ...close,
      title: T.aleinu,
      from: 128,
      groups: [
        [128, 129],
        [130, 131],
        [132, 133],
      ],
    },
  ];
}

// One segment of a source cut to the text from `first` through `last`, each found there exactly once.
function excerpt(seg, first, last) {
  const [start, end] = [first.normalize('NFC'), last.normalize('NFC')];
  return (html, index) => {
    if (index !== seg) return html;
    const from = html.indexOf(start);
    const to = html.indexOf(end, from) + end.length;
    if (from < 0 || to < end.length || html.includes(start, from + 1) || html.includes(end, to))
      throw new Error(`excerpt #${seg}: "${first}" .. "${last}" must match once`);
    return html.slice(from, to);
  };
}

// Weekday Mincha from the 1894 Tiklal (V1 190-197), in the print's order. Each passage the print points to is
// the one this nusach already builds: the Tamid of the Shacharit page, the Tiklal's Ketoret cut at "מפני הכבוד",
// the page's Ashrei with its verses, half Kaddish, Kedushah, Modim DeRabbanan and daily Tachanun, and the
// Tiklal's Titkabel, R. Chananya and Kaddish DeAtid; what it says only "when there is time" folds. The print
// keeps other days' inserts in their own sections, so Chol HaMoed's Yaaleh Veyavo, Rachem on Tisha B'Av, the
// individual's Aneinu and a fast's Priestly Blessing are the Shacharit page's. Evident misprints are corrected to
// the reading the print gives in the same passage elsewhere: הֶאֵל (V1 192; V1 105), מְחַיֶה and הָאַל (V1 193;
// V1 106, 107), נְדְחֵי (V1 194; V1 111), יַרָאֶה and בו (V1 195; V2 20, V1 233), מָגַן (V1 195; V1 115).
function teimanMincha() {
  const page = TIKLAL_MINCHA;
  const cut = (seg, first, last) => tiklalCut(page, seg, first, last);
  const amidah = (from, to, extra) => ({ ...page, title: T.amidah, from, to, ...extra });
  const timePermits = { optional: WHEN_SAID.timePermits };
  const foldAll = (from, to) => ({ optionalParts: [{ from, to, label: WHEN_SAID.timePermits }] });
  const pointer = `<small>ואומר פ' התמיד ע"ס וערבה וכו' ופטום הקטרת עד מפני הכבוד וחותם</small>`;
  const closing = ' והקטיר והשׁתחוה ויצא.';
  const [, , , , , torahBlessings] = teimanBirchot();
  return [
    {
      ...page,
      title: T.korbanot,
      from: 1,
      to: 15,
      groups: [[1, 2]],
      edits: [{ seg: 2, from: ' ועכשיו נהגו לומר כשיש שהות:', to: '' }],
      ...foldAll(3, 15),
    },
    { ...torahBlessings, title: T.korbanot, from: 4, to: 5, ...foldAll(4, 5) },
    {
      ...TIKLAL_SHACHARIT_CLOSE,
      title: T.korbanot,
      from: 109,
      to: 113,
      groups: [[109, 113]],
      transform: compose(excerpt(113, 'אֵינוּ אֵלָא', 'מִפְּנֵי הַכָּבוֹד:'), tiklalName),
      ...foldAll(109, 113),
    },
    {
      ...page,
      title: T.korbanot,
      from: 16,
      to: 16,
      edits: [
        { seg: 16, from: pointer, to: '<small>וחותם</small>' },
        {
          seg: 16,
          from: ` <small>והוא רחום וכו'. תהלה לדוד וכו' ע"ס וחצי קדיש ועומדין ומתפללין י"ט ברכות בלחש:</small>`,
          to: '',
        },
      ],
      ...foldAll(16, 16),
    },
    { ...TEIMAN_ASHREI, title: T.ashrei, insert: [{ at: 23, ...NOTES.fastTorahReading }] },
    { ...TEIMAN_HALF_KADDISH, title: T.halfKaddish },
    amidah(16, 19, {
      groups: [[18, 19]],
      edits: [
        { seg: 16, from: `${pointer}${closing} `, to: '' },
        { seg: 16, from: `והוא רחום וכו'. תהלה לדוד וכו' ע"ס וחצי קדיש `, to: '' },
        { seg: 17, from: 'הֶאֵל', to: 'הָאֵל' },
        ...tiklalSeasons(18),
        { seg: 18, from: '(<small>בעי"ת אומר</small>', to: `<if all="${AYT}"><small>בעי"ת אומר</small>` },
        { seg: 18, from: 'כָמוֹךָ אָב', to: 'כָמוֹךָ אָב</if>' },
        { seg: 19, from: 'הָרַחֲמָן', to: `<if all="${AYT}">הָרַחֲמָן` },
        { seg: 19, from: 'לְחַיִּים)', to: 'לְחַיִּים</if>' },
        { seg: 19, from: 'מְחַיֶה', to: 'מְחַיֶּה' },
      ],
    }),
    { ...TEIMAN_AMIDAH, from: 6, to: 6, reviewed: [6], edits: [BALADI_KEDUSHA_ONLY], minyan: SAID_BY.kedusha },
    amidah(20, 20, { transform: cut(20, 'אַתָּה קָדוֹשׁ', 'סֶלָה') }),
    {
      ...TEIMAN_AMIDAH,
      from: 7,
      to: 7,
      when: IN_AYT,
      edits: [
        {
          seg: 7,
          from: '<br> בָּרוּךְ אַתָּה יְיָ, הָאֵל הַקָּדוֹשׁ. <small>בעשי"ת:</small> <small>',
          to: '<small>בעשי"ת:</small> ',
        },
        { seg: 7, from: 'הַמֶּלֶךְ הַקָּדוֹשׁ.</small>', to: 'הַמֶּלֶךְ הַקָּדוֹשׁ.' },
      ],
    },
    amidah(20, 36, {
      drop: [22, 23, 27],
      at: { 20: NOT_AYT, 28: FAST, 30: NO_RAIN, 31: NO_RAIN, 32: RAIN },
      groups: [[30, 31]],
      transform: cut(20, 'בָּרוּךְ אַתָּה', 'הַקָּדוֹשׁ:'),
      edits: [
        { seg: 20, from: 'הָאַל', to: 'הָאֵל' },
        { seg: 33, from: 'נְדְחֵי', to: 'נִדְחֵי' },
        { seg: 34, from: 'מֶלֶךְ אוֹהֵב', to: `<if none="${AYT}">מֶלֶךְ אוֹהֵב` },
        { seg: 34, from: ': (<small>בעי"ת אומר</small>', to: `:</if><if all="${AYT}"><small>בעי"ת אומר</small>` },
        { seg: 34, from: 'הַמִּשְׁפָּט):', to: 'הַמִּשְׁפָּט:</if>' },
      ],
      minyanParts: [{ from: 28, label: SAID_BY.aneinu }],
    }),
    { ...TEIMAN_AMIDAH, from: 32, to: 32, when: TISHA_BAV },
    amidah(37, 39, {
      at: { 37: NOT_TISHA_BAV },
      reviewed: [39],
      edits: [{ seg: 39, from: '</small>) כִּי', to: '</small>)' }],
    }),
    { ...TEIMAN_AMIDAH, from: 38, to: 38, when: FAST },
    amidah(40, 42, {
      at: { 42: ROSH_CHODESH },
      edits: [
        { seg: 40, from: 'אַתָּה שׁוֹמֵעַ', to: 'כִּי אַתָּה שׁוֹמֵעַ' },
        {
          seg: 41,
          from: ' (<small>בר"ח אומר כאן יעלה ויבוא</small>)',
          to: '<if all="roshChodesh"> (<small>בר"ח אומר כאן יעלה ויבוא</small>)</if>',
        },
        { seg: 42, from: 'יַרָאֶה', to: 'יֵרָאֶה' },
        { seg: 42, from: 'בו שִׂמְחָה', to: 'בוֹ שִׂמְחָה' },
        { seg: 42, from: " <small>ותרצנו וכו'</small>", to: '' },
      ],
    }),
    { ...TEIMAN_AMIDAH, from: 42, to: 42, when: CHOL_HAMOED, edits: TEIMAN_YAALEH_VEYAVO_DAYS },
    amidah(43, 44, {
      edits: [
        { seg: 44, from: 'מָגַן', to: 'מָגֵן' },
        {
          seg: 44,
          from: ' (<small>כאן אומרים על הנסים</small>)',
          to: '<if any="chanukah,purim"> (<small>כאן אומרים על הנסים</small>)</if>',
        },
      ],
    }),
    TEIMAN_MODIM_DERABBANAN,
    amidah(45, 48, {
      at: { 45: CHANUKAH, 46: CHANUKAH, 47: PURIM, 48: PURIM },
      transform: cut(46, 'עַל הַנִּסִּים', 'הַזּוֹאת:'),
      edits: [
        { seg: 45, from: '<small>לחנוכה *)</small>', to: '<small>לחנוכה</small>' },
        { seg: 48, from: " <small>ועל כולם וכו'</small>", to: '' },
      ],
    }),
    amidah(46, 46, { when: AL_HANISSIM, transform: cut(46, 'וְעַל כּוּלָּם', 'מוֹדִים לָךְ') }),
    amidah(50, 50),
    amidah(51, 53, { groups: [[52, 53]], insert: [{ at: 54, ...NOTES.erevYomKippurVidui }] }),
    {
      ...BALADI_SHACHARIT,
      title: T.tachanun,
      path: '# נפילת אפים',
      when: MINCHA_TACHANUN,
      insert: [{ at: 0, ...NOTES.tachanunDisputed }],
    },
    { ...BALADI_SHACHARIT, title: T.tachanun, path: '# אבינו מלכנו אבינו אתה', when: MINCHA_TACHANUN },
    { ...TEIMAN_HALF_KADDISH, title: T.kaddish },
    TIKLAL_TITKABEL,
    { ...teimanPsalm(T.afterMaarivPsalms, 141), ...timePermits },
    { ...teimanPsalm(T.afterMaarivPsalms, 142), ...timePermits },
    { ...TIKLAL_RABBI_CHANANYA, from: 122, ...timePermits },
    { ...TIKLAL_KADDISH_DEATID, ...timePermits },
  ];
}

// The Ashmurot page, the same every night of the season but for its Ten Days rows and one Elul / Ten
// Days word. What it says to skip when there is no time folds; its 13 Middot are the minyan's. The
// small vocalized print `reviewed` lists is said: the refrains, the congregation's responses, and the
// two passages of Aseh Lema'an that the page sets in small type.
function teimanSelichot() {
  const page = (path, title, extra) => ({ he: 'wikiBaladiSelichot', transform: baladiName, path, title, ...extra });
  const said = (from, to = from) => Array.from({ length: to - from + 1 }, (_, index) => from + index);
  const timePermits = { optional: WHEN_SAID.timePermits };
  const middot = (from, to = from) => ({ minyanParts: [{ from, to, label: SAID_BY.withMinyan }] });
  const tenDaysLabel = '<br><small><b>בעשרת ימי תשובה:</b></small>';
  return [
    ...['לב', 'נא', 'סה', 'פה', 'קב', 'יז', 'כז', 'לג'].map((psalm) => page(`# ${psalm}`, T.selichotPsalms)),
    page('# ישן אל תרדם', T.yashenAlTeradam, { reviewed: said(1, 6) }),
    page('# יעירוני רעיוני', T.yeiruniRayonai, { reviewed: said(1, 5) }),
    page('# בן אדם', T.benAdam, { reviewed: said(0, 1) }),
    page('# תהלה לדוד', T.ashrei),
    page('# קדיש לעילא', T.halfKaddish, { minyan: SAID_BY.chazzan }),
    page('# רשות לש"ץ', T.reshut, {
      ...timePermits,
      edits: [{ seg: 0, from: "<small>אם אין פנאי מדלגים עד לך ה' הצדקה.</small> ", to: '' }],
    }),
    page('# תהלים יז', T.psalm17, timePermits),
    page("# ה' אלהי הצבאות", T.elokeiHatzevaot, timePermits),
    page("# לך ה' הצדקה", T.lechaHashemTzedaka),
    page("# אליך ה' אקרא", T.elechaEkra),
    page('# שבט יהודה .. # בעת רצון תחנתי', T.shevetYehuda, middot(3)),
    page('# בעת רצון תחנתי', T.beetRatzon),
    page('# רחמנא אידכר לן', T.rachamanaIdkar, {
      at: { 1: IN_AYT, 2: IN_AYT },
      enDrop: [1],
      reviewed: [0, 4],
      ...middot(6, 8),
    }),
    page('# אנא כעב', T.anaKaav, { ...timePermits, drop: [0], reviewed: said(2, 8) }),
    page('# אנשי אמונה', T.ansheiEmuna, middot(4)),
    page('# תמהנו מרעות', T.tamahnu, middot(4)),
    page('# אל תעש עמנו כלה', T.alTaasImanu),
    page('# וידוי', T.selichotVidui),
    page('# חטאנו צורנו', T.chatanuTzurenu, { reviewed: [7, 8, 10] }),
    page('# אלהינו שבשמים', T.elokeinuShebashamayim, {
      at: { 2: IN_AYT, 3: IN_AYT },
      enDrop: [2],
      reviewed: [1, 5],
    }),
    page('# אלהים אתה ידעת', T.elokimAtaYadata, { reviewed: [3] }),
    page('# עננו אבינו', T.aneinu, { reviewed: [1] }),
    page('# אדון הסליחות', T.adonHaselichot, { reviewed: said(1, 6) }),
    page('# עשה למען שמך', T.asehLemaan, {
      at: { 1: IN_AYT },
      reviewed: [3, 7],
      edits: [{ seg: 0, from: tenDaysLabel, to: `<if all="${AYT}">${tenDaysLabel}</if>` }],
    }),
    page('# דעני לעניי', T.deaneiLaaniyei, { reviewed: [0, 1], ...middot(4, 6) }),
    page('# אם אפס', T.imAfes, { reviewed: said(1, 16), ...middot(20) }),
    page('# למתודה חטאתיו', T.lemitvadeh, {
      reviewed: said(1, 4),
      edits: [
        {
          seg: 2,
          from: '<small>באלול:</small> יוֹם דִּינִי <small>בעשי"ת</small><opt>כִּפּוּר עֲוֹנִי</opt>',
          to: `<if none="${AYT}"><small>באלול:</small> יוֹם דִּינִי</if><if all="${AYT}"><small>בעשי"ת:</small> כִּפּוּר עֲוֹנִי</if>`,
        },
      ],
    }),
    page('# נפילת אפים', T.tachanun),
    page("# ה' אלהי ישראל .. # ה' איה חסדיך הראשונים", T.elokeiYisrael),
    page("# ה' איה חסדיך הראשונים", T.elokeiYisrael),
    page("# ה' שארית פליטת אריאל", T.elokeiYisrael),
    page("# ה' מושיב יחידים", T.elokeiYisrael),
    page('# אם אשמנו', T.imAshamenu, { reviewed: said(0, 5) }),
    page('# אתאנו לחלות פניך', T.atanu, { reviewed: said(0, 1) }),
    page("# מרנות .. # אליך ה' נשאתי", T.maranot, { reviewed: said(0, 6) }),
    page("# אליך ה' נשאתי", T.maranot, { reviewed: [3] }),
    page('# אראלי מרומים', T.erelei),
    page('# אבינו אב הרחמן', T.avinuAvHarachaman, { reviewed: [1] }),
    page('# אבינו מלכנו', T.avinuMalkeinu, { reviewed: [0] }),
    page('# ואנחנו לא נדע', T.vaanachnuLoNeda),
    page('# אל ארך אפים', T.elErechApayim),
    page('# קדיש', T.kaddish, { minyan: SAID_BY.chazzan, reviewed: [1] }),
    page('# שיר המעלות', T.shirHamaalot),
    page('# מבית מלוני', T.mibeitMeloni),
    page('# אם תאהב', T.imTeehav, { reviewed: said(1, 3) }),
    page('# אנא בכח', T.anaBekoach),
  ];
}

const TEXTS = {
  tefillin: {
    ashkenaz: [
      { ...TALLIT_KATAN.ashkenaz, title: T.tefillin },
      { ...TEFILLIN.ashkenaz, title: T.tefillin, insert: [ASHKENAZ_TEFILLIN_CHOL_HAMOED] },
      { ...TEFILLIN_SHEMA.ashkenaz, title: T.shema },
    ],
    sefard: [
      { ...TALLIT_KATAN.sefard, title: T.tefillin },
      { ...TEFILLIN.sefard, title: T.tefillin },
      { ...TEFILLIN_SHEMA.sefard, title: T.shema },
    ],
    edot_hamizrach: [
      { ...TEFILLIN.edot_hamizrach, title: T.tefillin },
      { ...TEFILLIN_SHEMA.edot_hamizrach, title: T.shema },
    ],
    chabad: [
      { ...TALLIT_KATAN.chabad, title: T.tefillin },
      { ...TEFILLIN.chabad, title: T.tefillin },
      { ...TEFILLIN_SHEMA.chabad, title: T.shema },
      {
        ...CHABAD,
        title: T.rabbenuTam,
        path: 'Shacharit > Rabbenu Tam',
        voice: NOT_FOR_WOMEN,
        transform: chabadName,
        edits: [{ seg: 0, from: ' ויש נוהגין לומר גם כן פרשת קדש והיה כי יביאך:', to: ':' }],
        optionalParts: [{ from: 6, label: SOME_SAY.kadeshVehaya }],
      },
    ],
    teiman: [
      { ...TEIMAN_TEFILLIN, title: T.tefillin },
      { ...TEIMAN_SHEMA, title: T.shema, to: 4 },
    ],
  },
  birchot_hashachar: {
    ashkenaz: ashkenazBirchot(),
    sefard: sefardBirchot(),
    edot_hamizrach: edotBirchot(),
    chabad: chabadBirchot(),
    teiman: teimanBirchot(),
  },
  krias_shma_shacharit: {
    ashkenaz: [
      {
        ...SHEMA.ashkenaz,
        title: T.shema,
        drop: [0],
        optionalParts: [{ from: 1, label: WHEN_SAID.alone }],
        minyanParts: [{ from: 10, to: 11, label: SAID_BY.chazzan }],
      },
    ],
    sefard: [
      {
        ...SHEMA.sefard,
        title: T.shema,
        from: 18,
        to: 28,
        optionalParts: [{ from: 18, label: WHEN_SAID.alone }],
        minyanParts: [{ from: 27, to: 28, label: SAID_BY.chazzan }],
      },
    ],
    edot_hamizrach: [
      {
        ...SHEMA.edot_hamizrach,
        title: T.shema,
        from: 9,
        to: 15,
        enEdits: [EDOT_SHEMA_CONGREGATION_EN],
        minyanParts: [{ from: 15, label: SAID_BY.chazzan }],
      },
    ],
    chabad: [{ ...SHEMA.chabad, title: T.shema, from: 9, to: 13 }],
    teiman: [{ ...TEIMAN_MORNING_SHEMA, title: T.shema }],
  },
  candle_lighting: {
    ashkenaz: candles(),
    sefard: candles(),
    edot_hamizrach: [
      {
        ...EDOT,
        title: T.candlesShabbat,
        path: 'Shabbat Candle Lighting',
        from: 1,
        to: 2,
        when: { all: ['shabbat'], none: ['yomTov', 'yomKippur'] },
        edits: [
          menSay(1, 'נוֹתֶנֶת', 'נוֹתֵן', 2),
          menSay(2, 'עַל בַּעֲלִי (פלוני בן פלוני) וְתִתֶּן לוֹ', 'עַל אִשְׁתִּי (פלונית בת פלוני) וְתִתֶּן לָהּ'),
          menSay(2, 'וּתְסַיְּעֵהוּ', 'וּתְסַיְּעֶהָ'),
        ],
      },
      {
        ...EDOT,
        title: T.candlesYomTov,
        path: 'Shabbat Candle Lighting',
        from: 3,
        to: 6,
        when: { all: ['yomTov'] },
        at: each(5, 6, SHEHECHEYANU),
        edits: [
          {
            seg: 4,
            from: '<small><small>אם חל בשבת תוסיף:</small> (שַׁבָּת וְ)</small>',
            to: '<if all="shabbat">שַׁבָּת וְ</if>',
          },
        ],
      },
      ...candles().slice(3),
    ],
    chabad: candles({
      transform: chabadName,
      shabbatEdits: [{ seg: 6, from: 'לְהַדְלִיק נֵר שֶׁל שַׁבָּת:', to: 'לְהַדְלִיק נֵר שֶׁל שַׁבָּת קֹדֶשׁ:' }],
      shabbatEnEdits: [
        { seg: 6, from: 'to kindle the Shabbos light.', to: 'to kindle the light of the holy Shabbos.' },
      ],
    }),
    teiman: teimanCandleLighting(),
  },
  havdalah: {
    ashkenaz: linearHavdalah({ versesNote: HAVDALAH_WEEKDAY_YOM_KIPPUR_NOTE }),
    sefard: linearHavdalah(),
    edot_hamizrach: [
      {
        ...EDOT,
        title: T.havdalah,
        path: 'Havdalah > Havdala',
        from: 1,
        drop: [10],
        insert: [
          {
            he: '<small>יקח הכוס בידו הימנית ויאמר</small>',
            en: 'Take the cup in the right hand and say:',
            when: { none: ['motzaeiShabbat', 'tishaBav'] },
            at: 3,
          },
          ...HAVDALAH_FLAME_NOTES.map((note) => ({ ...note, at: 12 })),
        ],
        at: {
          ...each(1, 9, NOT_TISHA_BAV),
          3: HAVDALAH_SPICES,
          11: HAVDALAH_SPICES,
          ...each(12, 13, HAVDALAH_FLAME),
          ...each(14, 20, NOT_TISHA_BAV),
          17: { all: ['roshChodesh'], none: ['tishaBav'] },
          18: { all: ['cholHamoedPesach'], none: ['tishaBav'] },
          19: { all: ['cholHamoedSukkot'], none: ['tishaBav'] },
        },
      },
    ],
    chabad: linearHavdalah({ transform: chabadName }),
    teiman: teimanHavdalah(),
  },
  sefirat_haomer: {
    ashkenaz: [
      {
        ...ASHKENAZ,
        title: T.omer,
        path: 'Weekday > Maariv > Sefirat HaOmer',
        from: 1,
        omer: { first: 5, stride: 1 },
        transform: withoutOmerNumber,
        edits: [omerReady(2)],
        enEdits: [OMER_HINENI_BLESSING_EN],
      },
    ],
    sefard: [
      {
        ...SEFARD,
        title: T.omer,
        path: 'Weekday Maariv > Sefirat HaOmer',
        from: 1,
        omer: { first: 4, stride: 1 },
        transform: withoutOmerNumber,
        edits: [SEFARD_OMER_NIGHT_NOTE, omerReady(2)],
        enEdits: [OMER_HINENI_BLESSING_EN],
      },
    ],
    edot_hamizrach: [edotOmer()],
    chabad: [
      {
        ...CHABAD,
        title: T.omer,
        path: 'Sefirat HaOmer',
        from: 1,
        omer: { first: 3, stride: 1 },
        transform: withoutOmerNumber,
      },
    ],
    teiman: [teimanOmer()],
  },
  shacharit: {
    ashkenaz: ashkenazShacharit(),
    sefard: sefardShacharit(),
    edot_hamizrach: edotShacharit(),
    chabad: chabadShacharit(),
    teiman: teimanShacharit(),
  },
  mincha: {
    ashkenaz: ashkenazMincha(),
    sefard: sefardMincha(),
    edot_hamizrach: edotMincha(),
    chabad: chabadMincha(),
    teiman: teimanMincha(),
  },
  maariv: {
    ashkenaz: ashkenazMaariv(),
    sefard: sefardMaariv(),
    edot_hamizrach: edotMaariv(),
    chabad: chabadMaariv(),
    teiman: teimanMaariv(),
  },
  birkat_hamazon: {
    ashkenaz: ashkenazBirkatHamazon(),
    sefard: sefardBirkatHamazon(),
    edot_hamizrach: edotBirkatHamazon(),
    chabad: chabadBirkatHamazon(),
    teiman: teimanBirkatHamazon(),
  },
  al_hamichya: {
    ashkenaz: ashkenazAlHamichya(),
    sefard: sefardAlHamichya(),
    edot_hamizrach: edotAlHamichya(),
    chabad: chabadAlHamichya(),
    teiman: teimanAlHamichya(),
  },
  borei_nefashot: {
    ashkenaz: [
      {
        ...DAAT,
        title: T.boreiNefashot,
        path: 'Berachot > Birkat Hanehenin > Eating > Brachot Achronot > Borei Nefashot',
        edits: [
          { seg: 0, from: 'על פירות האילן', to: '<small>על פירות האילן' },
          { seg: 0, from: 'גידולו מן הארץ', to: 'גידולו מן הארץ</small>' },
          { seg: 2, from: 'אחרי האכילה אומר:', to: '<small>אחרי האכילה אומר:</small>' },
          { seg: 4, from: ' <em><small>חַי</small></em>', to: '' },
        ],
      },
    ],
    sefard: [{ ...TORAT_EMET, title: T.boreiNefashot, path: 'Blessings > Borei Nefashot', from: 1 }],
    edot_hamizrach: [{ ...EDOT, title: T.boreiNefashot, path: 'Blessings on Enjoyments', from: 11, to: 12 }],
    chabad: [{ ...CHABAD, title: T.boreiNefashot, path: 'Blessings > Berakha Acharona', from: 14, to: 15 }],
    teiman: [{ he: 'wikiBoreiNefashot', title: T.boreiNefashot, path: '*', from: 2, to: 2 }],
  },
  tefilat_haderech: {
    ashkenaz: [
      {
        ...DAAT,
        title: T.tefilatHaderech,
        path: 'Berachot > Tefillat HaDerech',
        to: 0,
        enEdits: [
          { seg: 0, from: 'May You send blessing in our every handiwork, and grant us', to: 'May You grant us' },
          {
            seg: 0,
            from: 'all who see us. May You hear the sound of our supplication, because',
            to: 'all who see us, because',
          },
          { seg: 0, from: 'grant us peace, kindness, and mercy', to: 'grant us grace, kindness, and mercy' },
        ],
      },
      { ...DAAT, title: T.derechVerses, path: 'Berachot > Tefillat HaDerech', from: 1, groups: [[3, 5]] },
    ],
    sefard: [
      { ...TORAT_EMET, title: T.tefilatHaderech, path: "Blessings > Traveler's Prayer", from: 1, to: 2, reviewed: [1] },
      {
        ...TORAT_EMET,
        title: T.derechVerses,
        path: "Blessings > Traveler's Prayer",
        from: 3,
        to: 21,
        transform: headingAsNote,
      },
      {
        ...TORAT_EMET,
        title: T.enteringCity,
        optional: WHEN_SAID.enteringCity,
        path: "Blessings > Traveler's Prayer",
        from: 22,
        to: 29,
      },
      {
        ...TORAT_EMET,
        title: T.seaPrayer,
        optional: WHEN_SAID.seaTravel,
        path: "Blessings > Traveler's Prayer",
        from: 30,
        reviewed: [31],
      },
      {
        ...TORAT_EMET,
        title: T.airPrayer,
        optional: WHEN_SAID.airTravel,
        path: "Blessings > Air Traveler's Prayer",
        from: 1,
      },
    ],
    edot_hamizrach: [
      {
        ...EDOT,
        title: T.tefilatHaderech,
        path: "Assorted Blessings and Prayers > Traveler's Prayer",
        from: 1,
        drop: [3],
        reviewed: [2, 4, 5, 6, 7, 8],
        enEdits: [
          {
            seg: 2,
            from: ', or any bad situation or encounter. And allow us to arrive to our desired destination in peace',
            to: '',
          },
        ],
        optionalParts: [{ from: 4, to: 8, label: SOME_SAY.derechVerses }],
      },
    ],
    chabad: [{ ...CHABAD, title: T.tefilatHaderech, path: "Blessings > The Travelers' Prayer" }],
    teiman: teimanTefilatHaderech(),
  },
  asher_yatzar: {
    ashkenaz: [{ ...ASHKENAZ, title: T.asherYatzar, path: ashkenazPrep('Asher Yatzar') }],
    sefard: [{ ...SEFARD, title: T.asherYatzar, path: 'Weekday Shacharit > Morning Blessings', from: 1, to: 1 }],
    edot_hamizrach: [
      {
        ...EDOT,
        title: T.asherYatzar,
        path: 'Preparatory Prayers > Morning Blessings',
        from: 3,
        to: 4,
        enEdits: [EDOT_ASHER_YATZAR_NOTE_EN],
      },
    ],
    chabad: [{ ...CHABAD, title: T.asherYatzar, path: 'Shacharit > Morning Blessings', from: 3, to: 3 }],
    teiman: [{ ...BALADI_SHACHARIT, title: T.asherYatzar, path: '# אשר יצר' }],
  },
  birchot_hanehenin: {
    ashkenaz: ashkenazBirchotHanehenin(),
    sefard: sefardBirchotHanehenin(),
    edot_hamizrach: edotBirchotHanehenin(),
    chabad: chabadBirchotHanehenin(),
    teiman: teimanBirchotHanehenin(),
  },
  kriat_shema_al_hamita: {
    ashkenaz: ashkenazBedtimeShema(),
    sefard: sefardBedtimeShema(),
    edot_hamizrach: edotBedtimeShema(),
    chabad: chabadBedtimeShema(),
    teiman: teimanBedtimeShema(),
  },
  birchot_hareiya: {
    ashkenaz: ashkenazBirchotHareiya(),
    sefard: sefardBirchotHareiya(),
    edot_hamizrach: edotBirchotHareiya(),
    chabad: chabadBirchotHareiya(),
    teiman: teimanBirchotHareiya(),
  },
  kiddush_levana: {
    ashkenaz: ashkenazKiddushLevana(),
    sefard: sefardKiddushLevana(),
    edot_hamizrach: edotKiddushLevana(),
    chabad: chabadKiddushLevana(),
    teiman: teimanKiddushLevana(),
  },
  mezuzah: {
    ashkenaz: [
      {
        ...DAAT,
        title: T.mezuzah,
        path: 'Berachot > Birkhot Hamitzvot',
        from: 6,
        to: 10,
        edits: [
          { seg: 6, from: 'מצות עשה', to: '<small>מצות עשה' },
          { seg: 6, from: '<em><small>מלמטה למעלה</small></em>', to: '(מלמטה למעלה)' },
          { seg: 6, from: 'יברך:', to: 'יברך:</small>' },
          { seg: 10, from: 'ואחר שיקבענה ינשקנה ויאמר - ', to: '<small>ואחר שיקבענה ינשקנה ויאמר</small><br>' },
          {
            seg: 10,
            from: hebrewMarks(0x5dc, 0x5b7, 0x5d9, 0x5b9, 0x5d9, 0x5b8),
            to: hebrewMarks(0x5dc, 0x5b7, 0x5d9, 0x5d9, 0x5b8),
          },
        ],
      },
    ],
    sefard: [{ ...TORAT_EMET, title: T.mezuzah, path: 'Blessings > Mezuzah', from: 1 }],
    edot_hamizrach: [
      {
        ...EDOT,
        title: T.mezuzah,
        path: 'Assorted Blessings and Prayers > Mezuza',
        from: 1,
        reviewed: [2],
        edits: [comeToFulfil(2)],
        enEdits: [
          { seg: 2, from: 'Deuteronomy 6:19', to: 'Deuteronomy 6:9' },
          { seg: 2, from: 'the name the Name of', to: 'the Name of' },
        ],
      },
    ],
    chabad: [{ ...CHABAD, title: T.mezuzah, path: 'Blessings > Various Blessings', from: 16, to: 17 }],
    teiman: teimanMezuzah(),
  },
  sheva_berachot: {
    ashkenaz: ashkenazShevaBerachot(),
    sefard: sefardShevaBerachot(),
    edot_hamizrach: edotShevaBerachot(),
    chabad: [
      {
        ...CHABAD,
        title: T.shevaBerachot,
        path: 'Blessings > Sheva Berakhot',
        minyanParts: [{ from: 0, to: 5, label: SAID_BY.withMinyan }],
      },
    ],
    teiman: teimanShevaBerachot(),
  },
  chanukah_candles: {
    ashkenaz: ashkenazChanukahCandles(),
    sefard: sefardChanukahCandles(),
    edot_hamizrach: edotChanukahCandles(),
    chabad: chabadChanukahCandles(),
    teiman: teimanChanukahCandles(),
  },
  ushpizin: {
    ashkenaz: ashkenazUshpizin(),
    sefard: sefardUshpizin(),
    edot_hamizrach: edotUshpizin(),
  },
  tikkun_haklali: { shared: tikkunHaklali() },
  tehillim: { shared: tehillim() },
  nishmat: {
    ashkenaz: ashkenazNishmat(),
    sefard: sefardNishmat(),
    edot_hamizrach: edotNishmat(),
    chabad: sefardNishmat(),
    teiman: teimanNishmat(),
  },
  selichot: {
    ashkenaz: ashkenaziSelichot({ he: 'selichotLitaHe', en: 'selichotLitaEn' }, SELICHOT_LITA),
    sefard: ashkenaziSelichot({ he: 'selichotPolinHe' }, SELICHOT_POLIN),
    edot_hamizrach: edotSelichot(),
    chabad: [
      ...ashkenaziSelichot({ he: 'selichotChabadHe' }, SELICHOT_CHABAD),
      ...ashkenaziSelichot(
        { he: 'selichotLitaHe', en: 'selichotLitaEn' },
        Object.fromEntries(CHABAD_SELICHOT_FROM_LITA.map((day) => [day, SELICHOT_LITA[day]])),
      ),
    ],
    teiman: teimanSelichot(),
  },
};

function chabadMincha() {
  const base = { ...CHABAD, transform: CHABAD_VARIANTS };
  const tachanun = 'Mincha > Tachanun';
  const aleinu = 'Mincha > Aleinu';
  return [
    { ...base, title: T.korbanot, path: 'Mincha > Korbanot' },
    {
      ...base,
      title: T.ashrei,
      path: 'Mincha > Ashrei',
      insert: [{ at: 1, ...NOTES.fastTorahReading }],
      minyanParts: [{ from: 1, to: 2, label: SAID_BY.chazzan }],
    },
    {
      ...base,
      title: T.amidah,
      path: 'Mincha > Amidah',
      at: {
        2: IN_AYT,
        7: IN_AYT,
        15: FAST,
        23: TISHA_BAV,
        26: FAST,
        29: YAALEH_VEYAVO,
        33: AL_HANISSIM,
        34: CHANUKAH,
        35: PURIM,
        37: IN_AYT,
        39: FAST,
        41: IN_AYT,
      },
      reviewed: [9, 32],
      enEdits: [
        {
          seg: 2,
          from: 'Remember us for kindness, King who desires kindness, write us in the Book of Kindness',
          to: 'Remember us for life, King who desires life, write us in the Book of Life',
        },
        { seg: 7, from: 'for a life of kindness', to: 'for a life of mercy' },
      ],
      insert: [{ at: 44, ...NOTES.erevYomKippurVidui }],
      optionalParts: [{ from: 39, label: NO_KOHANIM_IN_ISRAEL }],
      minyanParts: [
        { from: 9, label: SAID_BY.kedusha },
        { from: 15, label: SAID_BY.aneinu },
        { from: 32, label: SAID_BY.modimDeRabbanan },
        { from: 39, label: SAID_BY.birkatKohanim },
      ],
    },
    {
      ...base,
      title: T.tachanun,
      path: tachanun,
      to: 11,
      when: MINCHA_TACHANUN,
      at: { 9: MINCHA_AVINU_MALKEINU },
      insert: [{ at: 0, ...NOTES.tachanunDisputed }],
      minyanParts: [{ from: 5, to: 6, label: SAID_BY.withMinyan }],
    },
    { ...base, title: T.kaddish, path: tachanun, from: 12, minyan: SAID_BY.chazzan },
    { ...base, title: T.ledavid, path: aleinu, to: 0, when: LEDAVID },
    { ...base, title: T.aleinu, path: aleinu, from: 1, to: 2 },
    { ...base, title: T.mournersKaddish, path: aleinu, from: 4, to: 6, minyan: SAID_BY.mourners },
    { ...base, title: T.alTira, path: aleinu, from: 7 },
  ];
}

function chabadMaariv() {
  const base = { ...CHABAD, path: 'Maariv', transform: CHABAD_VARIANTS };
  return [
    { ...base, title: T.vehuRachum, to: 0 },
    { ...base, title: T.shirHamaalot, from: 1, to: 2, minyanParts: [{ from: 2, label: SAID_BY.chazzan }] },
    { ...base, title: T.barchu, from: 3, to: 4, minyan: SAID_BY.chazzanAndCongregation },
    { ...base, title: T.shemaBlessings, from: 5, to: 15, minyanParts: [{ from: 15, label: SAID_BY.chazzan }] },
    {
      ...base,
      title: T.amidah,
      from: 16,
      to: 57,
      at: {
        18: IN_AYT,
        23: IN_AYT,
        27: MOTZAEI,
        42: YAALEH_VEYAVO,
        45: AL_HANISSIM,
        46: CHANUKAH,
        47: PURIM,
        49: IN_AYT,
        52: IN_AYT,
      },
    },
    { ...base, title: T.kaddish, from: 58, to: 62, at: each(60, 62, { none: ['viHiNoam'] }), minyan: SAID_BY.chazzan },
    {
      ...base,
      title: T.motzaeiShabbat,
      from: 64,
      to: 66,
      at: { 64: VI_HI_NOAM, 65: VI_HI_NOAM, 66: VEATA_KADOSH },
      insert: [
        { at: 64, ...NOTES.megillahNight },
        { at: 66, ...NOTES.tishaBavEichah },
      ],
    },
    {
      ...base,
      title: T.kaddishAfterAdditions,
      from: 59,
      to: 62,
      when: VEATA_KADOSH,
      at: { 60: VI_HI_NOAM },
      minyan: SAID_BY.chazzan,
    },
    {
      ...CHABAD,
      title: T.omer,
      path: 'Sefirat HaOmer',
      from: 1,
      when: OMER,
      omer: { first: 3, stride: 1 },
      transform: withoutOmerNumber,
    },
    { ...base, title: T.aleinu, from: 67, to: 68 },
    { ...base, title: T.mournersKaddish, from: 70, to: 72, minyan: SAID_BY.mourners },
    { ...base, title: T.alTira, from: 73 },
  ];
}

function chabadBirchot() {
  return [
    { ...CHABAD, title: T.modehAni, path: 'Shacharit > Upon Arising', from: 1, edits: [modeh(1)] },
    {
      ...CHABAD,
      title: T.morningBlessings,
      path: 'Shacharit > Morning Blessings',
      from: 1,
      to: 23,
      drop: [2, 5, 14],
      at: { 15: NOT_FASTING_BAREFOOT },
      edits: [modeh(4)],
      voiceAt: { 20: NOT_FOR_WOMEN },
      insert: [CHABAD_WOMEN_KIRTZONO],
    },
    { ...CHABAD, title: T.torahBlessings, path: 'Shacharit > Morning Blessings', from: 25 },
  ];
}

function chabadSongs(when) {
  const heOnly = { he: 'chabadHe', transform: CHABAD_VARIANTS, path: 'Shacharit > Song of the Day' };
  const mournersKaddish = {
    he: 'chabadHe',
    transform: CHABAD_VARIANTS,
    path: "Shacharit > Mourner's Kaddish",
    minyan: SAID_BY.mourners,
  };
  return [
    chapter(T.beitYaakov, { ...heOnly, title: T.beitYaakov, from: 1, to: 4, when, at: { 1: TACHANUN_SHACHARIT } }),
    {
      ...heOnly,
      title: T.songOfDay,
      from: 6,
      to: 29,
      when,
      at: weekdaySongs([
        [6, 9],
        [10, 13],
        [14, 17],
        [18, 21],
        [22, 25],
        [26, 29],
      ]),
    },
    { ...mournersKaddish, title: T.songOfDay, when },
    { ...heOnly, title: T.barchiNafshi, from: 30, to: 32, when: both(when, ROSH_CHODESH) },
    { ...mournersKaddish, title: T.barchiNafshi, when: both(when, ROSH_CHODESH) },
    { ...heOnly, title: T.ledavid, from: 33, when: both(when, LEDAVID) },
  ];
}

function chabadShacharit() {
  const base = { ...CHABAD, transform: CHABAD_VARIANTS };
  const heOnly = { he: 'chabadHe', transform: CHABAD_VARIANTS };
  const at = (node) => `Shacharit > ${node}`;
  const tachanun = at('Tachnun');
  const torah = at('Torah Reading');
  const uvaLetzion = at('Ashrei Uva LeZion');
  const festivalMusaf = 'Musaf for Festivals';
  return [
    ...chapter(T.morningBlessings, chabadBirchot()),
    ...chapter(T.tallitAndTefillin, tallitAndTefillin('chabad')),
    {
      ...heOnly,
      title: T.lulav,
      path: 'Lulav',
      from: 1,
      when: CHOL_HAMOED_SUKKOT,
      at: each(7, 8, { all: ['lulavShehecheyanu'] }),
    },
    chapter(T.maTovu, {
      ...base,
      title: T.maTovu,
      path: at('Morning Prayer'),
      to: 2,
      edits: [womenSay(1, 'מְקַבֵּל', 'מְקַבֶּלֶת')],
    }),
    { ...base, title: T.adonOlam, path: at('Morning Prayer'), from: 3, to: 3 },
    chapter(T.korbanot, {
      ...heOnly,
      title: T.akedah,
      path: at('Morning Prayer'),
      from: 4,
      to: 7,
      at: { 4: TACHANUN_SHACHARIT, ...each(6, 7, TACHANUN_SHACHARIT) },
    }),
    { ...heOnly, title: T.sovereignty, path: at('Morning Prayer'), from: 8, to: 16 },
    {
      ...heOnly,
      title: T.korbanot,
      path: at('Morning Prayer'),
      from: 17,
      at: { 19: TACHANUN_SHACHARIT, 31: TACHANUN_SHACHARIT },
      reviewed: [17],
    },
    { ...heOnly, title: T.korbanot, path: at('Kaddish DeRabbanan'), minyan: SAID_BY.mourners },
    chapter(T.hodu, { ...heOnly, title: T.hodu, path: at('Hodu') }),
    chapter(T.pesukeiDezimra, {
      ...heOnly,
      title: T.pesukeiDezimra,
      path: at('Pesukei Dezimra'),
      to: 17,
      at: { 2: MIZMOR_LETODA, 16: IN_AYT },
      minyanParts: [{ from: 17, label: SAID_BY.chazzan }],
    }),
    chapter(T.shemaBlessings, {
      ...heOnly,
      title: T.shemaBlessings,
      path: at('Pesukei Dezimra'),
      from: 18,
      minyan: SAID_BY.chazzanAndCongregation,
    }),
    { ...heOnly, title: T.shemaBlessings, path: at('Blessings of the Shema') },
    chapter(T.amidah, { ...base, title: T.amidah, path: at('The Amidah'), to: 5, at: { 2: IN_AYT } }),
    {
      ...heOnly,
      title: T.amidah,
      path: at('The Amidah'),
      from: 6,
      at: {
        7: IN_AYT,
        15: FAST,
        26: YAALEH_VEYAVO,
        30: AL_HANISSIM,
        31: CHANUKAH,
        32: PURIM,
        34: IN_AYT,
        38: IN_AYT,
      },
      reviewed: [9, 29],
      optionalParts: [{ from: 36, label: NO_KOHANIM_IN_ISRAEL }],
      minyanParts: [
        { from: 9, label: SAID_BY.kedusha },
        { from: 15, label: SAID_BY.aneinu },
        { from: 29, label: SAID_BY.modimDeRabbanan },
        { from: 36, label: SAID_BY.birkatKohanim },
      ],
    },
    chapter(T.hallel, {
      ...heOnly,
      title: T.hallel,
      path: 'Hallel',
      to: 24,
      drop: [4, 7, 22],
      when: HALLEL,
      optional: SOME_SAY.hallel,
      at: { 5: WHOLE_HALLEL_ONLY, 8: WHOLE_HALLEL_ONLY, ...each(23, 24, ROSH_CHODESH) },
      optionalParts: [{ from: 23, to: 24, label: SOME_SAY.afterHallel }],
      insert: [{ at: 0, ...NOTES.hallelDisputed }],
    }),
    {
      ...heOnly,
      title: T.hallel,
      path: uvaLetzion,
      from: 5,
      to: 8,
      when: UNDISPUTED_HALLEL,
      optional: SOME_SAY.hallel,
      minyan: SAID_BY.chazzan,
      at: each(6, 8, MUSAF),
      insert: [{ at: 9, ...NOTES.hoshanot }],
    },
    ...chabadSongs(MUSAF),
    {
      ...base,
      title: T.tachanun,
      path: tachanun,
      to: 8,
      when: TACHANUN_SHACHARIT,
      insert: [{ at: 0, ...NOTES.tachanunDisputedShacharit }],
      minyanParts: [{ from: 5, to: 6, label: SAID_BY.withMinyan }],
    },
    { ...heOnly, title: T.tachanun, path: tachanun, from: 10, to: 30, when: LONG_TACHANUN },
    {
      ...heOnly,
      title: T.tachanun,
      path: tachanun,
      from: 31,
      to: 33,
      when: TACHANUN_SHACHARIT,
      at: { 31: SHACHARIT_AVINU_MALKEINU },
    },
    { ...heOnly, title: T.halfKaddish, path: tachanun, from: 34, when: NO_UNDISPUTED_HALLEL, minyan: SAID_BY.chazzan },
    {
      ...heOnly,
      title: T.torahReading,
      path: torah,
      to: 15,
      when: TORAH_READING,
      at: each(0, 1, CHABAD_KEL_ERECH_APAYIM),
      minyanParts: [
        { from: 5, to: 6, label: SAID_BY.chazzanAndCongregation },
        { from: 8, label: SAID_BY.chazzanAndCongregation },
        { from: 9, to: 14, label: SAID_BY.oleh },
      ],
    },
    { ...heOnly, title: T.torahReading, path: tachanun, from: 35, when: TORAH_READING, minyan: SAID_BY.chazzan },
    {
      ...heOnly,
      title: T.torahReading,
      path: torah,
      from: 17,
      drop: [20],
      when: TORAH_READING,
      insert: [
        { at: 26, ...NOTES.megillah },
        { at: 26, ...NOTES.kinot },
      ],
      optionalParts: [
        { from: 17, to: 19, label: WHEN_SAID.gomel },
        { from: 21, to: 22, label: WHEN_SAID.barMitzvahFather },
      ],
    },
    chapter(T.uvaLetzion, {
      ...heOnly,
      title: T.uvaLetzion,
      path: uvaLetzion,
      to: 3,
      drop: [1],
      at: { 2: TACHANUN_SHACHARIT },
      transform: compose(CHABAD_VARIANTS, UVA_LETZION_COVENANT),
    }),
    {
      ...heOnly,
      title: T.returningTorah,
      path: uvaLetzion,
      from: 9,
      when: TORAH_READING,
      minyan: SAID_BY.chazzanAndCongregation,
    },
    {
      ...heOnly,
      title: T.kaddish,
      path: uvaLetzion,
      from: 4,
      to: 8,
      when: NOT_MUSAF,
      at: { 6: TITKABEL_AFTER_UVA_LETZION },
      minyan: SAID_BY.chazzan,
    },
    chapter(T.musaf, {
      ...heOnly,
      title: T.musaf,
      path: 'Rosh Chodesh',
      to: 25,
      when: ROSH_CHODESH,
      at: each(16, 17, CHANUKAH),
      optionalParts: [{ from: 20, label: NO_KOHANIM_IN_ISRAEL }],
      minyanParts: [
        { from: 0, to: 1, label: SAID_BY.chazzan },
        { from: 7, label: SAID_BY.kedusha },
        { from: 15, label: SAID_BY.modimDeRabbanan },
        { from: 20, label: SAID_BY.birkatKohanim },
      ],
    }),
    {
      ...heOnly,
      title: T.musaf,
      path: festivalMusaf,
      when: CHOL_HAMOED,
      drop: [21, 24, 25, 28, 29, 32, 33, 36, 37, 40, 41, 42],
      at: {
        10: CHOL_HAMOED_PESACH,
        11: CHOL_HAMOED_SUKKOT,
        15: CHOL_HAMOED_PESACH,
        16: CHOL_HAMOED_SUKKOT,
        ...each(18, 20, CHOL_HAMOED_PESACH),
        ...each(22, 23, { all: ['sukkotOffering2'] }),
        ...each(26, 27, { all: ['sukkotOffering3'] }),
        ...each(30, 31, { all: ['sukkotOffering4'] }),
        ...each(34, 35, { all: ['sukkotOffering5'] }),
        ...each(38, 39, { all: ['sukkotOffering6'] }),
        ...each(43, 44, { all: ['sukkotOffering7'] }),
      },
      optionalParts: [{ from: 52, label: NO_KOHANIM_IN_ISRAEL }],
      minyanParts: [
        { from: 0, label: SAID_BY.chazzan },
        { from: 6, label: SAID_BY.kedusha },
        { from: 49, label: SAID_BY.modimDeRabbanan },
        { from: 52, label: SAID_BY.birkatKohanim },
      ],
    },
    { ...heOnly, title: T.musaf, path: 'Rosh Chodesh', from: 26, when: MUSAF, minyan: SAID_BY.chazzan },
    ...chabadSongs(NOT_MUSAF),
    chapter(T.kaveh, {
      ...heOnly,
      title: T.kaveh,
      path: at('Kaveh'),
      minyanParts: [{ from: 5, to: 9, label: SAID_BY.mourners }],
    }),
    { ...heOnly, title: T.aleinu, path: at('Aleinu'), to: 1 },
    { ...heOnly, title: T.mournersKaddish, path: at('Aleinu'), from: 3, to: 5, minyan: SAID_BY.mourners },
    { ...heOnly, title: T.alTira, path: at('Aleinu'), from: 6 },
    { ...heOnly, title: T.sixRemembrances, path: at('Six Remembrances') },
  ];
}

function ashkenazVidui(base) {
  return {
    ...base,
    title: T.vidui,
    path: 'Weekday > Shacharit > Post Amidah > Vidui and 13 Middot',
    edits: [{ seg: 4, from: 'וַַיִּתְיַצֵּב', to: 'וַיִּתְיַצֵּב' }],
    enDrop: [0],
    optionalParts: [{ from: 0, to: 8, label: SOME_SAY.vidui }],
    minyanParts: [{ from: 5, to: 8, label: SAID_BY.withMinyan }],
  };
}

function ashkenazMournersHouse(base, kaddishPath) {
  const inMournersHouse = { title: T.mournersHouse, optional: WHEN_SAID.mournersHouse };
  return [
    {
      ...SEFARD,
      ...inMournersHouse,
      path: "Weekday Shacharit > L'David Hashem",
      from: 4,
      to: 7,
      drop: [5, 6],
      at: { 4: TACHANUN_SHACHARIT, 7: NO_TACHANUN_SHACHARIT },
    },
    { ...base, ...inMournersHouse, path: kaddishPath, minyan: SAID_BY.mourners },
  ];
}

function ashkenazShacharit() {
  const base = { ...ASHKENAZ, transform: ASHKENAZ_VARIANTS };
  const at = (node) => `Weekday > Shacharit > ${node}`;
  const korbanot = (node, extra = {}) => ({
    ...base,
    title: T.korbanot,
    path: ashkenazPrep(`Korbanot > ${node}`),
    ...extra,
  });
  const pesukei = (node, extra = {}) => ({
    ...base,
    title: T.pesukeiDezimra,
    path: at(`Pesukei Dezimra > ${node}`),
    ...extra,
  });
  const shema = (node, extra = {}) => ({
    ...base,
    title: T.shemaBlessings,
    path: at(`Blessings of the Shema > ${node}`),
    ...extra,
  });
  const tachanun = (node, when) => ({ ...base, title: T.tachanun, path: at(`Post Amidah > Tachanun > ${node}`), when });
  const torah = (node, extra = {}) => ({
    ...base,
    title: T.torahReading,
    path: at(`Torah Reading > ${node}`),
    when: TORAH_READING,
    ...extra,
  });
  const concluding = (title, node, extra = {}) => ({
    ...base,
    title,
    path: at(`Concluding Prayers > ${node}`),
    ...extra,
  });
  const israelKorbanot = (node, extra = {}) =>
    concluding(T.einKelokeinu, `Korbanot (Israel) > ${node}`, {
      when: IN_ISRAEL,
      optional: SOME_SAY.einKelokeinu,
      ...extra,
    });
  const wikiMusaf = { he: 'wikiAshkenazAmidah', title: T.musaf, transform: WIKI_ASHKENAZ_MUSAF };
  const birchot = ashkenazBirchot();
  const morningBlessings = birchot.pop();
  return [
    ...chapter(T.modehAni, birchot),
    ...chapter(T.tallitAndTefillin, tallitAndTefillin('ashkenaz')),
    chapter(T.maTovu, { ...base, title: T.maTovu, path: ashkenazPrep('Ma Tovu') }),
    { ...base, title: T.adonOlam, path: ashkenazPrep('Adon Olam'), groups: [[0, 9]] },
    { ...base, title: T.yigdal, path: ashkenazPrep('Yigdal') },
    chapter(T.morningBlessings, morningBlessings),
    chapter(T.korbanot, { ...base, title: T.akedah, path: ashkenazPrep('Akedah') }),
    { ...base, title: T.sovereignty, path: ashkenazPrep('Sovereignty of Heaven') },
    korbanot('Kiyor'),
    korbanot('Terumat HaDeshen'),
    korbanot('Korban HaTamid', { from: 1 }),
    korbanot('Ketoret'),
    korbanot('Order of the Temple Service', { at: each(3, 4, ROSH_CHODESH) }),
    korbanot('Laws of Sacrifices'),
    korbanot('Baraita of Rabbi Yishmael'),
    korbanot('Kaddish DeRabbanan', { minyanParts: [{ from: 1, to: 8, label: SAID_BY.mourners }] }),
    chapter(T.pesukeiDezimra, pesukei('Introductory Psalm')),
    pesukei("Mourner's Kaddish", { minyan: SAID_BY.mourners }),
    pesukei("Barukh She'amar"),
    pesukei('Hodu'),
    pesukei('Mizmor Letoda', { when: MIZMOR_LETODA }),
    pesukei('Yehi Chevod'),
    pesukei('Ashrei', { enDrop: [0] }),
    ...[146, 147, 148, 149, 150].map((psalm) => pesukei(`Psalm ${psalm}`)),
    pesukei('Closing Verses'),
    pesukei('Vayevarech David'),
    pesukei('Ata Hu'),
    pesukei('Az Yashir'),
    pesukei('Yishtabach'),
    pesukei('Psalm 130', { when: IN_AYT }),
    pesukei('Half Kaddish', { minyan: SAID_BY.chazzan }),
    chapter(
      T.shemaBlessings,
      shema('Barchu', { minyanParts: [{ from: 1, to: 4, label: SAID_BY.chazzanAndCongregation }] }),
    ),
    shema('First Blessing before Shema'),
    shema('Second Blessing before Shema'),
    shema('Shema', {
      drop: [0],
      optionalParts: [{ from: 1, label: WHEN_SAID.alone }],
      minyanParts: [{ from: 10, to: 11, label: SAID_BY.chazzan }],
    }),
    shema('Blessing after Shema'),
    ...chapter(T.amidah, ashkenazAmidah('Shacharit')),
    lulavBlessing(),
    chapter(T.hallel, metsudahHallel()),
    {
      ...concluding(T.hallel, 'Kaddish Shalem'),
      when: UNDISPUTED_HALLEL,
      optional: SOME_SAY.hallel,
      minyan: SAID_BY.chazzan,
      at: each(5, 7, MUSAF),
      insert: [{ at: 8, ...NOTES.hoshanot }],
    },
    {
      ...ashkenazVidui(base),
      when: TACHANUN_SHACHARIT,
      insert: [
        { at: 0, ...NOTES.fastSelichot },
        { at: 0, ...NOTES.tachanunDisputedShacharit },
      ],
    },
    {
      ...base,
      title: T.avinuMalkeinu,
      path: at('Post Amidah > Avinu Malkenu'),
      when: SHACHARIT_AVINU_MALKEINU,
      drop: [53],
      at: { 4: IN_AYT, 5: FAST_NOT_AYT, ...each(20, 25, IN_AYT), ...each(26, 31, FAST_NOT_AYT) },
    },
    tachanun('For Monday and Thursday', LONG_TACHANUN),
    tachanun('Nefilat Apayim', TACHANUN_SHACHARIT),
    tachanun('God of Israel', LONG_TACHANUN),
    tachanun('Shomer Yisrael', TACHANUN_SHACHARIT),
    {
      ...base,
      title: T.halfKaddish,
      path: at('Post Amidah > Tachanun > Half Kaddish'),
      to: 5,
      when: NO_UNDISPUTED_HALLEL,
      minyan: SAID_BY.chazzan,
    },
    torah('Removing the Torah from Ark > El Erech Appayim', { when: KEL_ERECH_APAYIM }),
    torah('Removing the Torah from Ark > Vayehi Binsoa'),
    torah('Removing the Torah from Ark > Berich Shmei'),
    torah('Removing the Torah from Ark > Lekha Hashem', { minyan: SAID_BY.chazzanAndCongregation }),
    torah('Removing the Torah from Ark > Av Harachamim'),
    torah('Removing the Torah from Ark > Vetigaleh Veteraeh', { minyan: SAID_BY.chazzanAndCongregation }),
    torah('Reading from Sefer > Birkat HaTorah', { minyan: SAID_BY.oleh }),
    torah('Reading from Sefer > Birkat Hagomel', {
      drop: [3],
      optionalParts: [
        { from: 0, to: 2, label: WHEN_SAID.gomel },
        { from: 4, label: WHEN_SAID.barMitzvahFather },
      ],
    }),
    torah('Reading from Sefer > Half Kaddish', { minyan: SAID_BY.chazzan }),
    torah('Reading from Sefer > Raising the Torah', {
      at: each(3, 8, LONG_TACHANUN),
      minyanParts: [{ from: 3, to: 8, label: SAID_BY.chazzan }],
    }),
    torah('Returning Sefer to Aron > Yehalelu', { minyan: SAID_BY.chazzanAndCongregation }),
    torah('Returning Sefer to Aron > LeDavid Mizmor'),
    torah('Returning Sefer to Aron > Uvenucho Yomar', {
      insert: [
        { at: 1, ...NOTES.megillah },
        { at: 1, ...NOTES.kinot },
      ],
    }),
    chapter(T.uvaLetzion, concluding(T.uvaLetzion, 'Ashrei')),
    concluding(T.uvaLetzion, "Lamenatze'ach", {
      at: each(0, 1, LAMNATZEACH),
      enDrop: [0],
      insert: [{ at: 0, ...NOTES.lamnatzeachCholHamoed }],
    }),
    concluding(T.uvaLetzion, 'Uva Letzion', { transform: compose(ASHKENAZ_VARIANTS, UVA_LETZION_COVENANT) }),
    concluding(T.uvaLetzion, 'Kaddish Shalem', {
      at: { 5: TITKABEL_AFTER_UVA_LETZION, 6: NOT_MUSAF, 7: NOT_MUSAF },
      minyan: SAID_BY.chazzan,
    }),
    ...chapter(
      T.musaf,
      ashkenazAmidah('Shacharit', {
        musaf: [
          { ...wikiMusaf, path: 'ראשי חדשים | ובראשי | ומנחתם | חדש', when: { all: ['musaf', 'roshChodesh'] } },
          {
            ...wikiMusaf,
            path: 'אתה בחרתנו | ותתן רגלים | ומפני | ומפני .. פסוקים פסח א | פסוקים פסח ב | פסוקים סוכות ב | ומנחתם | מלך רחמן | והשיאנו-חול',
            when: CHOL_HAMOED,
            at: { 4: CHOL_HAMOED_PESACH, 5: CHOL_HAMOED_SUKKOT, 6: CHOL_HAMOED_SUKKOT },
          },
        ],
      }),
    ),
    concluding(T.musaf, 'Kaddish Shalem', { when: MUSAF, minyan: SAID_BY.chazzan }),
    chapter(T.aleinu, concluding(T.aleinu, 'Alenu')),
    concluding(T.mournersKaddish, "Mourner's Kaddish", { minyan: SAID_BY.mourners }),
    chapter(
      T.songOfDay,
      concluding(T.songOfDay, 'Song of the Day', {
        at: weekdaySongs([
          [1, 3],
          [4, 6],
          [7, 9],
          [10, 12],
          [13, 15],
          [16, 18],
        ]),
      }),
    ),
    {
      ...base,
      title: T.songOfDay,
      path: at('Pesukei Dezimra > Introductory Psalm'),
      from: 1,
      when: CHANUKAH,
      insert: [{ at: 1, ...NOTES.chanukahPsalm }],
    },
    concluding(T.songOfDay, "Mourner's Kaddish", {
      when: { any: ['roshChodesh', 'ledavidSeason'] },
      minyan: SAID_BY.mourners,
    }),
    concluding(T.songOfDay, 'Barchi Nafshi', { from: 1, when: ROSH_CHODESH }),
    concluding(T.songOfDay, "Mourner's Kaddish", {
      when: { all: ['roshChodesh', 'ledavidSeason'] },
      minyan: SAID_BY.mourners,
    }),
    concluding(T.songOfDay, 'LeDavid', { to: 1, when: LEDAVID }),
    concluding(T.songOfDay, 'LeDavid', { from: 2, minyan: SAID_BY.mourners }),
    ...ashkenazMournersHouse(base, at("Concluding Prayers > Mourner's Kaddish")),
    israelKorbanot('Ein Kelohenu', {
      edits: [{ seg: 2, from: ' <small>(בחלק מהמהדורות: יְהֹוָה אֱלֹהֵינוּ)</small>', to: '' }],
    }),
    israelKorbanot('Pitum HaKetoret'),
    israelKorbanot("Mourner's Kaddish", { minyan: SAID_BY.mourners }),
    israelKorbanot('Barchu', { minyan: SAID_BY.chazzanAndCongregation }),
  ];
}

function sefardBirchot() {
  return [
    { ...SEFARD, title: T.modehAni, path: 'Upon Arising > Modeh Ani', from: 0, to: 3, edits: [modeh(1)] },
    { ...SEFARD, title: T.upon, path: 'Weekday Shacharit > Morning Blessings', edits: [modeh(2)] },
    { ...SEFARD, title: T.torahBlessings, path: 'Weekday Shacharit > Blessings on Torah', to: 6 },
    {
      ...SEFARD,
      title: T.morningBlessings,
      path: 'Weekday Shacharit > Blessings on Torah',
      from: 7,
      drop: [11, 19],
      at: { 20: NOT_FASTING_BAREFOOT },
      voiceAt: { 10: NOT_FOR_WOMEN },
      optionalParts: [{ from: 12, label: WHEN_SAID.women }],
    },
  ];
}

function sefardMusaf() {
  const amidah = {
    ...SEFARD,
    title: T.musaf,
    path: 'Weekday Shacharit > Amidah',
    transform: SEFARD_VARIANTS,
    when: MUSAF,
  };
  const yomTov = { he: 'metsudahShabbatHe', en: 'metsudahShabbatEn', linear: true, title: T.musaf };
  const sanctification = { ...yomTov, path: 'Prayers for Yom Tov > Musaf for Yom Tov > Divine Sanctification' };
  const toratEmet = { he: 'toratEmetSefardHe', title: T.musaf, path: 'Rosh Chodesh > Mussaf', flattenSmall: true };
  const sukkotOfferings = [
    [2, 200, 214],
    [3, 215, 229],
    [4, 247, 261],
    [5, 279, 293],
    [6, 311, 325],
    [7, 343, 357],
  ];
  return [
    { ...toratEmet, from: 2, to: 2, when: MUSAF },
    {
      ...amidah,
      to: 19,
      drop: [19],
      at: { ...each(3, 5, IN_AYT), ...each(9, 10, SUMMER), ...each(11, 13, WINTER), ...each(15, 17, IN_AYT) },
    },
    {
      ...yomTov,
      path: 'Prayers for Yom Tov > Musaf for Yom Tov > Kedusha for Chol Hamoed',
      when: MUSAF,
      minyan: SAID_BY.kedusha,
      groups: [
        [1, 8],
        [10, 12],
        [15, 16],
        [19, 21],
        [23, 33],
      ],
    },
    { ...amidah, from: 33, to: 38, at: { 35: NOT_AYT, ...each(36, 38, IN_AYT) } },
    { ...toratEmet, from: 12, to: 15, transform: TORAT_EMET_LEAP_YEAR, when: { all: ['musaf', 'roshChodesh'] } },
    {
      ...sanctification,
      from: 9,
      to: 97,
      when: CHOL_HAMOED,
      drop: [20, 25, 30, 31, 36, 37, 39, 80, 81, 82, 83, 85, 86, 87, 89, 90],
      groups: [
        [9, 16],
        [17, 23],
        [27, 28],
        [33, 34],
        [40, 41],
        [42, 78],
        [91, 97],
      ],
      at: {
        ...each(27, 28, CHOL_HAMOED_PESACH),
        ...each(33, 34, CHOL_HAMOED_SUKKOT),
        84: CHOL_HAMOED_PESACH,
        88: CHOL_HAMOED_SUKKOT,
      },
    },
    {
      ...sanctification,
      from: 135,
      to: 150,
      when: CHOL_HAMOED_PESACH,
      groups: [
        [135, 140],
        [141, 150],
      ],
    },
    ...sukkotOfferings.map(([day, from, to]) => ({
      ...sanctification,
      from,
      to,
      when: { all: ['cholHamoedSukkot', `sukkotOffering${day}`] },
      groups: [[from, to]],
    })),
    {
      ...sanctification,
      from: 390,
      to: 450,
      when: CHOL_HAMOED,
      drop: [430, 431, 439, 442, 449],
      groups: [
        [390, 421],
        [422, 450],
      ],
    },
    {
      ...amidah,
      from: 81,
      to: 124,
      drop: [83, 84, 85, 86, 87, 88, 89, 107],
      at: {
        ...each(96, 97, AL_HANISSIM),
        ...each(98, 99, CHANUKAH),
        ...each(100, 101, PURIM),
        ...each(103, 105, IN_AYT),
        ...each(113, 114, IN_ISRAEL),
        ...each(117, 119, IN_AYT),
      },
      reviewed: [95, 114],
      optionalParts: [
        { from: 108, to: 112, label: NO_KOHANIM_IN_ISRAEL },
        { from: 113, to: 114, label: WHEN_SAID.kohanimBless },
      ],
      minyanParts: [
        { from: 94, to: 95, label: SAID_BY.modimDeRabbanan },
        { from: 108, to: 114, label: SAID_BY.birkatKohanim },
      ],
    },
    { ...amidah, path: 'Weekday Shacharit > Ashrei', from: 17, to: 22, minyan: SAID_BY.chazzan },
  ];
}

function sefardSongs(placement) {
  const base = { ...SEFARD, transform: SEFARD_VARIANTS };
  const at = (node) => `Weekday Shacharit > ${node}`;
  const early = placement === 'early';
  return [
    {
      ...base,
      title: T.songOfDay,
      path: at('Song of the Day'),
      when: early ? MUSAF : NOT_MUSAF,
      to: 23,
      drop: [4, 8, 12, 16, 20],
      at: weekdaySongs([
        [1, 3],
        [5, 7],
        [9, 11],
        [13, 15],
        [17, 19],
        [21, 23],
      ]),
    },
    {
      he: 'toratEmetSefardHe',
      title: T.songOfDay,
      path: 'Rosh Chodesh > Song of the Day',
      from: 4,
      to: 4,
      when: early ? MUSAF : NOT_MUSAF,
    },
    {
      ...base,
      title: T.songOfDay,
      path: at("L'David Hashem"),
      from: 8,
      to: 12,
      when: early ? MUSAF : NOT_MUSAF,
      minyan: SAID_BY.mourners,
    },
    ...(early
      ? [{ ...base, title: T.barchiNafshi, path: at('Barchi Nafshi'), when: { all: ['musaf', 'roshChodesh'] } }]
      : []),
    {
      ...base,
      title: T.ledavid,
      path: at("L'David Hashem"),
      to: 2,
      when: early ? { all: ['ledavidSeason', 'musaf'] } : { all: ['ledavidSeason'], none: ['musaf'] },
    },
  ];
}

function sefardShacharit() {
  const base = { ...SEFARD, transform: SEFARD_VARIANTS };
  const at = (node) => `Weekday Shacharit > ${node}`;
  const ashrei = (title, extra) => ({ ...base, title, path: at('Ashrei'), ...extra });
  const enteringSynagogue = { ...SEFARD, path: 'Upon Arising > Upon Entering Synagogue' };
  const birchot = sefardBirchot();
  const morningBlessings = birchot.pop();
  return [
    ...chapter(T.modehAni, birchot),
    ...chapter(T.tallitAndTefillin, tallitAndTefillin('sefard')),
    chapter(T.maTovu, {
      ...enteringSynagogue,
      title: T.maTovu,
      to: 3,
      edits: [womenSay(1, 'מְקַבֵּל', 'מְקַבֶּלֶת')],
    }),
    { ...enteringSynagogue, title: T.adonOlam, from: 4, to: 14, groups: [[5, 14]] },
    {
      ...enteringSynagogue,
      title: T.yigdal,
      from: 15,
      drop: [16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40],
      groups: [[17, 41]],
    },
    chapter(T.morningBlessings, morningBlessings),
    chapter(T.korbanot, {
      ...base,
      title: T.akedah,
      path: at('Morning Prayer'),
      to: 3,
      at: each(2, 3, TACHANUN_SHACHARIT),
    }),
    { ...base, title: T.sovereignty, path: at('Morning Prayer'), from: 4 },
    { ...base, title: T.korbanot, path: at('Korbanot'), drop: [5], at: each(24, 25, ROSH_CHODESH) },
    {
      ...base,
      title: T.korbanot,
      path: at("B'raita d'Rabi Yishmael"),
      minyanParts: [{ from: 3, to: 8, label: SAID_BY.mourners }],
    },
    chapter(T.hodu, { ...base, title: T.hodu, path: at('Hodu'), to: 10 }),
    chapter(T.pesukeiDezimra, {
      ...base,
      title: T.pesukeiDezimra,
      path: at('Hodu'),
      from: 11,
      enDrop: [17],
      at: each(13, 14, MIZMOR_LETODA),
    }),
    {
      ...base,
      title: T.pesukeiDezimra,
      path: at('Yishtabach'),
      at: each(2, 3, IN_AYT),
      minyanParts: [{ from: 4, to: 8, label: SAID_BY.chazzan }],
    },
    chapter(T.shemaBlessings, {
      ...base,
      title: T.shemaBlessings,
      path: at('The Shema'),
      drop: [17],
      optionalParts: [{ from: 18, label: WHEN_SAID.alone }],
      minyanParts: [
        { from: 1, to: 4, label: SAID_BY.chazzanAndCongregation },
        { from: 27, to: 28, label: SAID_BY.chazzan },
      ],
    }),
    chapter(T.amidah, {
      ...base,
      title: T.amidah,
      path: at('Amidah'),
      edits: SEFARD_PARNASSA_BEFORE_SHOMEA_TEFILLAH,
      enMoves: [{ seg: 78, text: SEFARD_SHOMEA_TEFILLAH_CLOSING_EN, to: 80 }],
      enEdits: [{ seg: 78, ...SEFARD_SHOMEA_TEFILLAH_STAR_EN }],
      at: {
        ...each(3, 5, IN_AYT),
        ...each(9, 10, SUMMER),
        ...each(11, 13, WINTER),
        ...each(15, 17, IN_AYT),
        35: NOT_AYT,
        ...each(36, 38, IN_AYT),
        47: FAST,
        ...each(55, 56, NO_RAIN),
        ...each(57, 58, RAIN),
        65: NOT_AYT,
        ...each(66, 68, IN_AYT),
        ...each(83, 89, YAALEH_VEYAVO),
        85: ROSH_CHODESH,
        86: CHOL_HAMOED_PESACH,
        87: CHOL_HAMOED_SUKKOT,
        ...each(96, 97, AL_HANISSIM),
        ...each(98, 99, CHANUKAH),
        ...each(100, 101, PURIM),
        ...each(103, 105, IN_AYT),
        ...each(113, 114, IN_ISRAEL),
        ...each(117, 119, IN_AYT),
      },
      reviewed: [51, 80, 95, 114],
      drop: [19, 20, 50, 79, 107],
      optionalParts: [
        { from: 51, label: SOME_SAY.forTheSick },
        { from: 80, until: 1, label: SOME_SAY.sustenance, englishOutside: true },
        { from: 108, to: 112, label: NO_KOHANIM_IN_ISRAEL },
        { from: 113, to: 114, label: WHEN_SAID.kohanimBless },
      ],
      minyanParts: [
        { from: 21, to: 32, label: SAID_BY.kedusha },
        { from: 94, to: 95, label: SAID_BY.modimDeRabbanan },
        { from: 108, to: 114, label: SAID_BY.birkatKohanim },
      ],
    }),
    lulavBlessing(),
    chapter(T.hallel, metsudahHallel()),
    ashrei(T.hallel, {
      from: 17,
      to: 22,
      when: UNDISPUTED_HALLEL,
      optional: SOME_SAY.hallel,
      minyan: SAID_BY.chazzan,
      at: each(20, 22, MUSAF),
      insert: [{ at: 23, ...NOTES.hoshanot }],
    }),
    ...sefardSongs('early'),
    {
      ...base,
      title: T.vidui,
      path: at('Tachanun'),
      from: 1,
      to: 9,
      when: TACHANUN_SHACHARIT,
      enDrop: [1],
      insert: [
        { at: 1, ...NOTES.fastSelichot },
        { at: 1, ...NOTES.tachanunDisputedShacharit },
      ],
      minyanParts: [{ from: 6, to: 8, label: SAID_BY.withMinyan }],
    },
    { ...base, title: T.tachanun, path: at('Tachanun'), from: 10, when: TACHANUN_SHACHARIT },
    {
      ...base,
      title: T.avinuMalkeinu,
      path: at('Avinu Malkeinu'),
      when: SHACHARIT_AVINU_MALKEINU,
      at: {
        ...each(4, 5, IN_AYT),
        ...each(6, 7, FAST_NOT_AYT),
        ...each(22, 27, IN_AYT),
        ...each(28, 33, FAST_NOT_AYT),
      },
    },
    {
      ...base,
      title: T.tachanunConclusion,
      path: at('For Monday & Thursday'),
      to: 24,
      when: TACHANUN_SHACHARIT,
      at: each(1, 19, LONG_TACHANUN),
    },
    {
      ...base,
      title: T.halfKaddish,
      path: at('For Monday & Thursday'),
      from: 25,
      to: 29,
      when: NO_UNDISPUTED_HALLEL,
      minyan: SAID_BY.chazzan,
    },
    {
      ...base,
      title: T.torahReading,
      path: at('Torah Reading'),
      when: TORAH_READING,
      drop: [28],
      enEdits: [{ seg: 31, from: SEFARD_HAGBAHA_HALF_KADDISH_EN, to: '' }],
      at: { ...each(0, 1, KEL_ERECH_APAYIM), ...each(34, 39, LONG_TACHANUN) },
      optionalParts: [
        { from: 24, to: 27, label: WHEN_SAID.gomel },
        { from: 29, to: 30, label: WHEN_SAID.barMitzvahFather },
      ],
      minyanParts: [
        { from: 7, to: 10, label: SAID_BY.chazzanAndCongregation },
        { from: 12, to: 15, label: SAID_BY.chazzanAndCongregation },
        { from: 16, to: 23, label: SAID_BY.oleh },
        { from: 34, to: 39, label: SAID_BY.chazzan },
      ],
      insert: [
        { at: 31, ...NOTES.halfKaddishAfterReading },
        { at: 40, ...NOTES.megillah },
        { at: 40, ...NOTES.kinot },
      ],
    },
    chapter(
      T.uvaLetzion,
      ashrei(T.uvaLetzion, {
        to: 15,
        transform: compose(SEFARD_VARIANTS, UVA_LETZION_COVENANT),
        enDrop: [1, 2],
        at: each(1, 3, LAMNATZEACH),
        insert: [{ at: 3, ...NOTES.lamnatzeachCholHamoed }],
      }),
    ),
    ashrei(T.returningTorah, {
      from: 23,
      when: TORAH_READING,
      minyanParts: [{ from: 23, to: 26, label: SAID_BY.chazzanAndCongregation }],
    }),
    ashrei(T.kaddish, {
      from: 16,
      to: 22,
      at: { 20: TITKABEL_AFTER_UVA_LETZION, 21: NOT_MUSAF, 22: NOT_MUSAF },
      reviewed: [16],
      minyan: SAID_BY.chazzan,
    }),
    ...chapter(T.musaf, sefardMusaf()),
    chapter(T.beitYaakov, {
      ...base,
      title: T.beitYaakov,
      path: at('Beit Yaakov'),
      when: NOT_MUSAF,
      at: { 1: TACHANUN_SHACHARIT, ...each(2, 3, LAMNATZEACH) },
    }),
    ...sefardSongs('late'),
    {
      ...base,
      title: T.mournersHouse,
      path: at("L'David Hashem"),
      from: 4,
      to: 7,
      drop: [6],
      when: NOT_MUSAF,
      at: { ...each(4, 5, TACHANUN_SHACHARIT), 7: NO_TACHANUN_SHACHARIT },
      optional: WHEN_SAID.mournersHouse,
    },
    chapter(T.kaveh, {
      ...base,
      title: T.kaveh,
      path: at('Kaveh'),
      minyanParts: [{ from: 11, to: 17, label: SAID_BY.mourners }],
    }),
    { ...base, title: T.aleinu, path: at('Aleinu'), minyanParts: [{ from: 4, to: 8, label: SAID_BY.mourners }] },
  ];
}

function ashkenazBirchot() {
  return [
    { ...ASHKENAZ, title: T.modehAni, path: ashkenazPrep('Modeh Ani'), edits: [modeh(0)] },
    { ...ASHKENAZ, title: T.netilatYadayim, path: ashkenazPrep('Netilat Yadayim') },
    { ...ASHKENAZ, title: T.asherYatzar, path: ashkenazPrep('Asher Yatzar') },
    { ...ASHKENAZ, title: T.elokaiNeshama, path: ashkenazPrep('Elokai Neshama'), edits: [modeh(0)] },
    { ...ASHKENAZ, title: T.torahBlessings, path: ashkenazPrep('Torah Blessings') },
    { ...ASHKENAZ, title: T.torahBlessings, path: ashkenazPrep('Torah Study') },
    {
      ...ASHKENAZ,
      title: T.morningBlessings,
      path: ashkenazPrep('Morning Blessings'),
      voiceAt: { 3: NOT_FOR_WOMEN },
      edits: [
        { seg: 4, from: '(<small>נשים אומרות:</small> ', to: '' },
        { seg: 4, from: 'כִּרְצוֹנוֹ:)', to: 'כִּרְצוֹנוֹ:' },
      ],
      optionalParts: [{ from: 4, label: WHEN_SAID.women }],
    },
  ];
}

function edotBirchot() {
  return [
    {
      ...EDOT,
      title: T.modehAni,
      path: 'Preparatory Prayers > Modeh Ani',
      from: 2,
      edits: [
        {
          seg: 3,
          from: '<b>מוֹדֶה</b> <small>האשה אומרת: מוֹדָה</small>',
          to: '<b><if voice="male,unset">מוֹדֶה</if><if voice="female">מוֹדָה</if></b><if voice="unset"> <small>האשה אומרת: מוֹדָה</small></if>',
        },
      ],
    },
    {
      ...EDOT,
      title: T.morningBlessings,
      path: 'Preparatory Prayers > Morning Blessings',
      from: 1,
      at: each(15, 16, NOT_FASTING_BAREFOOT),
      voiceAt: { 21: NOT_FOR_WOMEN, 22: NOT_FOR_WOMEN, 23: NOT_FOR_MEN, 24: NOT_FOR_MEN },
      edits: [
        {
          seg: 6,
          from: 'מוֹדֶה <small>(<small>האשה אומרת</small> מוֹדָה)</small>',
          to: '<if voice="male,unset">מוֹדֶה</if><if voice="female">מוֹדָה</if><if voice="unset"> <small>(<small>האשה אומרת</small> מוֹדָה)</small></if>',
        },
        {
          seg: 19,
          from: 'גוֹי: <small>האשה אומרת: <b>גּוֹיָה</b></small>',
          to: '<if voice="male,unset">גוֹי:</if><if voice="female">גּוֹיָה:</if><if voice="unset"> <small>האשה אומרת: <b>גּוֹיָה</b></small></if>',
        },
        {
          seg: 20,
          from: 'עָבֶד: <small>האשה אומרת: <b>שִׁפְחָה</b></small>',
          to: '<if voice="male,unset">עָבֶד:</if><if voice="female">שִׁפְחָה:</if><if voice="unset"> <small>האשה אומרת: <b>שִׁפְחָה</b></small></if>',
        },
      ],
      reviewed: [6],
      enEdits: [
        EDOT_ASHER_YATZAR_NOTE_EN,
        { seg: 15, from: ' But for those who have the custom to say it then, they have whom to rely on.', to: '' },
      ],
    },
    { ...EDOT, title: T.torahBlessings, path: 'Preparatory Prayers > Torah Blessings', from: 1 },
  ];
}

function edotHallel() {
  return {
    he: 'edotHe',
    transform: EDOT_VARIANTS,
    title: T.hallel,
    path: 'Rosh Hodesh > Hallel',
    from: 1,
    to: 33,
    drop: [7, 10, 23, 25],
    when: HALLEL,
    optional: SOME_SAY.hallel,
    at: {
      ...each(1, 4, WHOLE_HALLEL),
      8: WHOLE_HALLEL_ONLY,
      11: WHOLE_HALLEL_ONLY,
      24: WHOLE_HALLEL,
      26: { none: ['hallelDisputed'] },
      ...each(27, 29, MUSAF),
    },
    optionalParts: [
      { from: 30, to: 33, label: SOME_SAY.afterHallel },
      { from: 4, label: WHEN_SAID.womenHallel },
      { from: 24, label: WHEN_SAID.womenHallel },
    ],
    minyanParts: [
      { from: 1, to: 2, label: SAID_BY.chazzanAndCongregation },
      { from: 26, to: 29, label: SAID_BY.chazzan },
    ],
    insert: [
      { at: 1, ...NOTES.hallelDisputed },
      { at: 30, ...NOTES.hoshanot },
    ],
    edits: [{ seg: 8, from: '<b><small>לֹ֤א</small></b><small> <small>', to: '<b>לֹ֤א</b> <small><small>' }],
  };
}

function edotMusaf() {
  const heOnly = { he: 'edotHe', transform: EDOT_VARIANTS, title: T.musaf };
  return [
    {
      ...heOnly,
      path: 'Rosh Hodesh > Song of the Day',
      from: 16,
      when: MUSAF,
      at: { 16: ROSH_CHODESH },
      edits: [
        {
          seg: 17,
          from: 'אומר החזן חצי קדיש וחולצין תפילין',
          to: 'אומר החזן חצי קדיש<if all="roshChodesh"> וחולצין תפילין</if>',
        },
      ],
      minyanParts: [{ from: 17, to: 18, label: SAID_BY.chazzan }],
    },
    {
      ...heOnly,
      path: 'Rosh Hodesh > Mussaf',
      from: 2,
      to: 40,
      drop: [21, 29],
      when: ROSH_CHODESH,
      at: each(17, 19, CHANUKAH),
      optionalParts: [{ from: 30, to: 33, label: WHEN_SAID.noKohanim }],
      edits: [
        {
          seg: 12,
          from: '<small><small>בשנה מעוברת אומרים:</small> וּלְכַפָּרַת פֶּשַׁע.</small>',
          to: '<if all="ulechaparatPesha">וּלְכַפָּרַת פֶּשַׁע.</if>',
        },
        { seg: 16, ...EDOT_MUSAF_MODIM_DERABBANAN_HEADING },
      ],
      minyanParts: [
        { from: 7, label: SAID_BY.kedusha },
        { from: 16, label: SAID_BY.modimDeRabbanan },
        { from: 22, to: 33, label: SAID_BY.birkatKohanim },
      ],
    },
    {
      ...heOnly,
      path: 'Prayers for Three Festivals > Mussaf',
      from: 1,
      to: 56,
      drop: [6, 7, 8, 13, 15, 17, 23, 25, 29, 30, 31, 37],
      when: CHOL_HAMOED,
      at: { 14: CHOL_HAMOED_PESACH, 22: CHOL_HAMOED_PESACH, 16: CHOL_HAMOED_SUKKOT, 24: CHOL_HAMOED_SUKKOT },
      edits: [
        { seg: 35, ...EDOT_MUSAF_MODIM_DERABBANAN_HEADING },
        { seg: 46, from: '<small><small>אם אין כהנים אומר החזן:</small><br>', to: '<small>' },
      ],
      optionalParts: [{ from: 46, to: 49, label: WHEN_SAID.noKohanim }],
      transform: compose(EDOT_FESTIVAL_INSERTS, EDOT_VARIANTS),
      minyanParts: [
        { from: 9, label: SAID_BY.kedusha },
        { from: 35, label: SAID_BY.modimDeRabbanan },
        { from: 38, to: 49, label: SAID_BY.birkatKohanim },
      ],
    },
    {
      ...heOnly,
      path: 'Rosh Hodesh > Mussaf',
      from: 41,
      when: MUSAF,
      minyanParts: [{ from: 43, to: 47, label: SAID_BY.chazzan }],
    },
  ];
}

function hoshienuAfterEverySong(fridaySegment, otherDays) {
  return [
    {
      seg: fridaySegment,
      from: '<small>(תהילים צ״ג:א׳-ב׳)</small>',
      to: '<if all="friday"><small>(תהילים צ״ג:א׳-ב׳)</small>',
    },
    { seg: fridaySegment, from: '<br><br><b>הוֹשִׁיעֵ֨נוּ</b>', to: '</if><br><br><b>הוֹשִׁיעֵ֨נוּ</b>' },
    ...otherDays.map((seg) => ({ seg, from: '<small>וממשיך הושיענו</small>', to: '' })),
  ];
}

function edotShacharit() {
  const base = { ...EDOT, transform: EDOT_VARIANTS };
  const heOnly = { he: 'edotHe', transform: EDOT_VARIANTS };
  const at = (node) => `Weekday Shacharit > ${node}`;
  const amidah = at('Amida');
  const vidui = at('Vidui');
  const torah = at('Torah Reading');
  const uvaLetzion = at('Uva LeSion');
  const songs = at('Song of the Day');
  const rcSongs = 'Rosh Hodesh > Song of the Day';
  const barchiNafshi = 'Rosh Hodesh > Barchi Nafshi';
  const withMinyanAt = (indices) => indices.map((from) => ({ from, label: SAID_BY.withMinyan }));
  return [
    ...chapter(T.morningBlessings, edotBirchot()),
    chapter(T.petichatEliyahu, {
      ...base,
      title: T.petichatEliyahu,
      path: at('Petichat Eliyahu'),
      from: 2,
      reviewed: [8],
    }),
    ...chapter(T.tallitAndTefillin, tallitAndTefillin('edot_hamizrach')),
    {
      ...base,
      title: T.hannah,
      path: at("Hanna's Prayer"),
      from: 1,
      edits: [
        { seg: 1, from: '<small><small>בשבת ויום טוב אין אומרים פסוק זה</small> ', to: '<if none="shabbat,yomTov">' },
        { seg: 1, from: 'לִֽי:</small>', to: 'לִֽי:</if>' },
      ],
    },
    chapter(T.korbanot, {
      ...base,
      title: T.akedah,
      path: at('Morning Prayer'),
      from: 1,
      to: 9,
      drop: [5],
      reviewed: [1, 2],
      edits: [
        { seg: 2, from: '<br><br><small>וַהֲרֵינִי', to: '<br><br>וַהֲרֵינִי' },
        { seg: 2, from: 'הַקָּדוֹשׁ בָּרוּךְ הוּא:</small></small>', to: 'הַקָּדוֹשׁ בָּרוּךְ הוּא:</small>' },
        womenSay(2, 'מְקַבֵּל', 'מְקַבֶּלֶת'),
        womenSay(2, 'אוֹהֵב', 'אוֹהֶבֶת'),
        womenSay(2, 'מְזַמֵּן', 'מְזַמֶּנֶת'),
      ],
      optionalParts: [{ from: 6, label: SOME_SAY.akedahVerse }],
    }),
    { ...base, title: T.sovereignty, path: at('Morning Prayer'), from: 10, to: 17 },
    { ...base, title: T.korbanot, path: at('Morning Prayer'), from: 18 },
    { ...base, title: T.korbanot, path: at('Incense Offering'), from: 1, to: 17 },
    {
      ...heOnly,
      title: T.korbanot,
      path: at('Incense Offering'),
      from: 18,
      minyanParts: [{ from: 31, to: 34, label: SAID_BY.mourners }],
    },
    chapter(T.hodu, {
      ...base,
      title: T.hodu,
      path: at('Hodu'),
      from: 1,
      drop: [12],
      at: each(6, 7, { any: [AYT, 'hoshanaRabba'] }),
    }),
    chapter(T.pesukeiDezimra, {
      ...base,
      title: T.pesukeiDezimra,
      path: at("Pesukei D'Zimra"),
      from: 1,
      to: 22,
      at: { 2: MIZMOR_LETODA, ...each(19, 20, IN_AYT) },
      minyanParts: [{ from: 21, to: 22, label: SAID_BY.chazzan }],
    }),
    chapter(T.shemaBlessings, {
      ...base,
      title: T.shemaBlessings,
      path: at("Pesukei D'Zimra"),
      from: 23,
      minyan: SAID_BY.chazzanAndCongregation,
    }),
    {
      ...base,
      title: T.shemaBlessings,
      path: at('The Shema'),
      from: 1,
      enEdits: [EDOT_SHEMA_CONGREGATION_EN],
      minyanParts: [{ from: 15, label: SAID_BY.chazzan }],
    },
    chapter(T.amidah, {
      ...base,
      title: T.amidah,
      path: amidah,
      from: 1,
      to: 71,
      at: {
        ...each(15, 16, FAST),
        ...each(18, 19, NO_RAIN),
        ...each(20, 21, RAIN),
        29: FAST,
        30: EDOT_THREE_FASTS_ANEINU,
        ...each(33, 38, YAALEH_VEYAVO),
        35: ROSH_CHODESH,
        36: CHOL_HAMOED_PESACH,
        37: CHOL_HAMOED_SUKKOT,
        ...each(45, 46, AL_HANISSIM),
        47: CHANUKAH,
        48: PURIM,
      },
      reviewed: [8, 44, 51, 52, 53, 55, 56, 57, 59, 60, 61, 62, 64, 67, 69, 71],
      edits: [
        { seg: 30, ...EDOT_SANSAN_LEYAIR },
        { seg: 69, from: RAVS_PRAYER_NOTE, to: '' },
      ],
      drop: [6, 7, 14, 42, 43, 50, 58],
      enMoves: [edotNetzorMove(67)],
      optionalParts: [
        { from: 30, label: SOME_SAY.threeFastsAneinu },
        { from: 59, to: 62, label: WHEN_SAID.noKohanim },
        { from: 69, paragraph: 1, label: SOME_SAY.ravsPrayer },
      ],
      minyanParts: [
        { from: 8, label: SAID_BY.kedusha },
        { from: 15, to: 16, label: SAID_BY.aneinu },
        { from: 44, label: SAID_BY.modimDeRabbanan },
        { from: 51, to: 64, label: SAID_BY.birkatKohanim },
      ],
    }),
    lulavBlessing({ from: 2 }),
    chapter(T.hallel, edotHallel()),
    { ...base, title: T.avinuMalkeinu, path: amidah, from: 73, to: 105, when: AYT_TACHANUN_SHACHARIT },
    { ...base, title: T.yehiShem, path: amidah, from: 106, when: NO_TACHANUN_NOR_HALLEL },
    {
      ...base,
      title: T.tachanun,
      path: vidui,
      from: 1,
      to: 9,
      when: TACHANUN_SHACHARIT,
      insert: [{ at: 1, ...NOTES.tachanunDisputedShacharit }],
      minyanParts: [{ from: 3, label: SAID_BY.withMinyan }],
    },
    {
      ...heOnly,
      title: T.tachanun,
      path: vidui,
      from: 13,
      to: 32,
      when: { ...LONG_TACHANUN, none: ['publicFast'] },
      minyanParts: withMinyanAt([15, 18, 21]),
    },
    ...[
      ['Fast of Gedalya', 3, 28, 'tzomGedaliah', [4, 7, 11, 15]],
      ['Tenth of Tevet', 2, 35, 'asaraBTevet', [8, 14, 18, 22]],
      ['Fast of Esther', 2, 33, 'taanitEsther', [3, 12, 16, 20]],
      ['Seventeenth of Tammuz', 3, 38, 'tzomTammuz', [10, 17, 21, 25]],
    ].map(([leaf, from, to, fast, thirteenMiddot]) => ({
      ...heOnly,
      title: T.selichot,
      path: `Fast Days and Mourning > ${leaf}`,
      from,
      to,
      when: { all: [fast, 'tachanunShacharit'] },
      minyanParts: withMinyanAt(thirteenMiddot),
    })),
    {
      ...heOnly,
      title: T.halfKaddish,
      path: vidui,
      from: 12,
      to: 12,
      when: TACHANUN_SHACHARIT,
      minyan: SAID_BY.chazzan,
    },
    {
      ...heOnly,
      title: T.halfKaddish,
      path: vidui,
      from: 12,
      to: 12,
      when: NO_TACHANUN_NOR_HALLEL,
      minyan: SAID_BY.chazzan,
    },
    {
      ...heOnly,
      title: T.torahReading,
      path: torah,
      from: 1,
      to: 5,
      when: TORAH_READING,
      at: { ...each(1, 3, TACHANUN_SHACHARIT), ...each(4, 5, NO_TACHANUN_SHACHARIT) },
    },
    { ...heOnly, title: T.torahReading, path: 'Rosh Hodesh > Hallel', from: 36, to: 37, when: MUSAF },
    {
      ...heOnly,
      title: T.torahReading,
      path: torah,
      from: 6,
      to: 17,
      when: TORAH_READING,
      minyanParts: [{ from: 9, to: 17, label: SAID_BY.oleh }],
    },
    {
      ...heOnly,
      title: T.torahReading,
      path: 'Shabbat Shacharit > HaGomel',
      from: 1,
      to: 10,
      when: TORAH_READING,
      optionalParts: [{ from: 1, to: 10, label: WHEN_SAID.gomel }],
    },
    {
      ...heOnly,
      title: T.torahReading,
      path: torah,
      from: 19,
      when: TORAH_READING,
      insert: [{ at: 21, ...NOTES.kinotEdot }],
      minyanParts: [{ from: 19, to: 20, label: SAID_BY.lastOleh }],
    },
    chapter(T.uvaLetzion, {
      ...base,
      title: T.uvaLetzion,
      path: at('Ashrei'),
      from: 1,
      drop: [4],
      at: { 5: TACHANUN_SHACHARIT },
    }),
    {
      ...heOnly,
      title: T.uvaLetzion,
      path: uvaLetzion,
      from: 1,
      to: 2,
      transform: compose(EDOT_MEGILLAH, UVA_LETZION_COVENANT, EDOT_VARIANTS),
    },
    {
      ...heOnly,
      title: T.uvaLetzion,
      path: uvaLetzion,
      from: 4,
      to: 7,
      when: NOT_MUSAF,
      at: { 5: TITKABEL_AFTER_UVA_LETZION },
      minyan: SAID_BY.chazzan,
    },
    {
      ...heOnly,
      title: T.returningTorah,
      path: uvaLetzion,
      from: 8,
      when: { all: ['torahReading'], none: ['musaf'] },
      minyan: SAID_BY.chazzanAndCongregation,
    },
    chapter(T.beitYaakov, {
      ...heOnly,
      title: T.beitYaakov,
      path: at('Beit Yaakov'),
      from: 2,
      at: { 2: TACHANUN_SHACHARIT },
    }),
    {
      ...heOnly,
      title: T.songOfDay,
      path: rcSongs,
      from: 1,
      to: 13,
      when: MUSAF,
      edits: hoshienuAfterEverySong(12, [2, 4, 6, 8, 10]),
      at: {
        ...weekdaySongs([
          [1, 2],
          [3, 4],
          [5, 6],
          [7, 8],
          [9, 10],
          [11, 11],
        ]),
        13: CHANUKAH,
      },
    },
    {
      ...heOnly,
      title: T.returningTorah,
      path: rcSongs,
      from: 14,
      to: 15,
      when: MUSAF,
      minyan: SAID_BY.chazzanAndCongregation,
    },
    ...chapter(T.musaf, edotMusaf()),
    { ...heOnly, title: T.barchiNafshi, path: barchiNafshi, from: 2, to: 2, when: ROSH_CHODESH },
    {
      ...heOnly,
      title: T.festivalPsalm,
      path: 'Prayers for Three Festivals > Song for Passover',
      from: 1,
      to: 1,
      when: CHOL_HAMOED_PESACH,
    },
    {
      ...heOnly,
      title: T.festivalPsalm,
      path: 'Prayers for Three Festivals > Song for Sukkot',
      from: 1,
      to: 1,
      when: CHOL_HAMOED_SUKKOT,
    },
    { ...heOnly, title: T.kaddish, path: barchiNafshi, from: 3, when: MUSAF, minyan: SAID_BY.mourners },
    {
      ...heOnly,
      title: T.songOfDay,
      path: songs,
      from: 1,
      to: 23,
      when: NOT_MUSAF,
      transform: compose(EDOT_LEVITES_LINE, EDOT_VARIANTS),
      edits: hoshienuAfterEverySong(13, [3, 5, 7, 9, 11]),
      at: {
        ...weekdaySongs([
          [2, 3],
          [4, 5],
          [6, 7],
          [8, 9],
          [10, 11],
          [12, 12],
        ]),
        ...each(14, 15, { any: ['tzomGedaliah', 'asaraBTevet'] }),
        ...each(16, 17, { all: ['dayAfterYomKippur'] }),
        ...each(18, 19, CHANUKAH),
        ...each(20, 21, { any: ['taanitEsther', 'purim'] }),
        ...each(22, 23, { all: ['tzomTammuz'] }),
      },
    },
    {
      ...heOnly,
      title: T.mournersHouse,
      path: songs,
      from: 25,
      to: 26,
      when: NOT_MUSAF,
      optional: WHEN_SAID.mournersHouse,
      edits: [{ seg: 26, from: '<small>ויש שמוסיפים</small><br>', to: '' }],
      optionalParts: [{ from: 26, label: SOME_SAY.mournersVerse }],
    },
    { ...heOnly, title: T.kaddish, path: songs, from: 27, when: NOT_MUSAF, minyan: SAID_BY.mourners },
    chapter(T.kaveh, { ...base, title: T.kaveh, path: at('Kaveh'), from: 1, to: 11 }),
    {
      ...heOnly,
      title: T.kaveh,
      path: at('Kaveh'),
      from: 12,
      minyanParts: [
        { from: 12, to: 15, label: SAID_BY.mourners },
        { from: 16, to: 18, label: SAID_BY.chazzanAndCongregation },
      ],
    },
    {
      ...base,
      title: T.aleinu,
      path: at('Alenu'),
      from: 1,
      to: 4,
      reviewed: [3],
      enMoves: [EDOT_ALEINU_TORAH_MOVE],
    },
    { ...heOnly, title: T.ledavid, path: at('Alenu'), from: 5, optional: SOME_SAY.ledavid },
  ];
}

function edotOmer(extra = {}) {
  return {
    ...EDOT,
    title: T.omer,
    path: 'Counting of the Omer',
    from: 1,
    omer: { first: 4, stride: 3 },
    reviewed: [1],
    edits: [
      { seg: 1, from: 'יש אומרים נוסך קצרה<br>', to: '' },
      { seg: 3, from: 'הָעֹֽמֶר: הַיּוֹם', to: 'הָעֹֽמֶר:' },
      omerReady(1),
    ],
    optionalParts: [
      { from: 1, paragraph: 6, label: SOME_SAY.shortLeshemYichud, englishInPart: true },
      { from: 3, label: WHEN_SAID.womenCountOmer },
    ],
    minyanParts: [{ from: 2, label: SAID_BY.chazzanAndCongregation }],
    transform: (html, index) =>
      index >= 5 && index <= 149 && (index - 5) % 3 === 0 ? `הַיּוֹם ${html.trimStart()}` : html,
    ...extra,
  };
}

function edotMincha() {
  const base = { ...EDOT, transform: EDOT_VARIANTS };
  const offerings = 'Weekday Mincha > Offerings';
  const amidah = 'Weekday Mincha > Amida';
  const vidui = 'Weekday Mincha > Vidui';
  return [
    {
      ...base,
      title: T.korbanot,
      path: offerings,
      from: 1,
      to: 10,
      reviewed: [1],
      enEdits: [{ seg: 1, from: ' (Tehillim / Psalm 84)', to: '' }],
    },
    {
      ...base,
      title: T.ashrei,
      path: offerings,
      from: 11,
      insert: [{ at: 16, ...NOTES.fastTorahReading }],
      minyanParts: [{ from: 14, to: 15, label: SAID_BY.chazzan }],
    },
    {
      ...base,
      title: T.amidah,
      path: amidah,
      from: 1,
      to: 71,
      at: {
        ...each(14, 15, FAST),
        ...each(17, 18, NO_RAIN),
        ...each(19, 20, RAIN),
        ...each(26, 27, TISHA_BAV),
        28: { none: ['tishaBav'] },
        31: FAST,
        32: EDOT_THREE_FASTS_ANEINU,
        ...each(35, 40, YAALEH_VEYAVO),
        37: { all: ['roshChodesh'] },
        38: { all: ['cholHamoedPesach'] },
        39: { all: ['cholHamoedSukkot'] },
        ...each(45, 46, AL_HANISSIM),
        47: CHANUKAH,
        48: PURIM,
        ...each(51, 57, FAST),
        ...each(59, 62, FAST),
      },
      reviewed: [7, 44, 65, 67, 68, 69, 71],
      insert: [{ at: 64, ...NOTES.erevYomKippurVidui }],
      edits: [
        { seg: 32, ...EDOT_SANSAN_LEYAIR },
        { seg: 44, ...EDOT_MODIM_DERABBANAN_HEADING },
        { seg: 67, from: RAVS_PRAYER_NOTE, to: '' },
        { seg: 69, from: 'ביום תענית יאמר <br>', to: '' },
      ],
      drop: [6, 13, 50, 58],
      enMoves: [
        edotNetzorMove(65),
        { seg: 55, text: '[May the] L·rd bless you &amp; protect you. [Cong. Answers : Amen]', to: 56, before: true },
        {
          seg: 57,
          text: '[May the] L·rd lift His countenance upon you &amp; place peace upon you.  [Cong. Answers : Amen]',
          to: 56,
        },
        {
          seg: 69,
          text: 'May they find favor [from You] - the saying of my mouth &amp; the reflections of my heart  before You, my L·rd, my Rock &amp; my Redeemer.',
          to: 67,
        },
      ],
      optionalParts: [
        { from: 32, label: SOME_SAY.threeFastsAneinu },
        { from: 59, to: 62, label: WHEN_SAID.noKohanim },
        { from: 67, paragraph: 1, label: SOME_SAY.ravsPrayer },
        { from: 68, label: SOME_SAY.personalFast },
        { from: 69, label: WHEN_SAID.fastDay },
      ],
      minyanParts: [
        { from: 7, label: SAID_BY.kedusha },
        { from: 14, to: 15, label: SAID_BY.aneinu },
        { from: 44, label: SAID_BY.modimDeRabbanan },
        { from: 51, to: 62, label: SAID_BY.birkatKohanim },
      ],
    },
    { ...base, title: T.avinuMalkeinu, path: amidah, from: 72, to: 104, when: AYT_TACHANUN_MINCHA },
    {
      ...base,
      title: T.yehiShem,
      path: amidah,
      from: 105,
      to: 106,
      when: { none: ['tachanunMincha'] },
      edits: [{ seg: 106, from: "<br><br><small>ואחר כך אומר הש''צ חצי קדיש</small>", to: '' }],
    },
    {
      ...base,
      title: T.tachanun,
      path: vidui,
      from: 1,
      to: 9,
      when: MINCHA_TACHANUN,
      insert: [{ at: 1, ...NOTES.tachanunDisputed }],
      minyanParts: [{ from: 3, label: SAID_BY.withMinyan }],
    },
    {
      ...base,
      title: T.kaddish,
      path: vidui,
      from: 10,
      to: 14,
      enEdits: [{ seg: 11, from: ' (For', to: '' }],
      minyan: SAID_BY.chazzan,
    },
    {
      ...base,
      title: T.psalm,
      path: vidui,
      from: 15,
      to: 20,
      at: { ...each(15, 16, { none: ['friday'] }), ...each(17, 18, { all: ['friday'] }), ...each(19, 20, FAST) },
    },
    { ...base, title: T.mournersKaddish, path: vidui, from: 21, to: 23, minyan: SAID_BY.mourners },
    {
      ...base,
      title: T.aleinu,
      path: 'Weekday Mincha > Alenu',
      from: 1,
      reviewed: [3],
      enMoves: [EDOT_ALEINU_TORAH_MOVE],
    },
  ];
}

function edotMaariv() {
  const base = { ...EDOT, transform: EDOT_VARIANTS };
  const barchu = 'Weekday Arvit > Barchu';
  const amidah = 'Weekday Arvit > Amidah';
  return [
    {
      ...base,
      title: T.barchiNafshi,
      path: barchu,
      from: 2,
      to: 2,
      when: ROSH_CHODESH,
      optional: SOME_SAY.barchiNafshi,
    },
    {
      ...base,
      title: T.vehuRachum,
      path: barchu,
      from: 3,
      to: 7,
      reviewed: [3],
      minyanParts: [{ from: 5, to: 6, label: SAID_BY.chazzan }],
    },
    { ...base, title: T.barchu, path: barchu, from: 8, to: 10, minyan: SAID_BY.chazzanAndCongregation },
    {
      ...base,
      title: T.shemaBlessings,
      path: 'Weekday Arvit > The Shema',
      from: 1,
      enEdits: [
        { seg: 10, from: '...Lay us down', to: 'Lay us down' },
        {
          seg: 10,
          from: ' [upon saying "and spread upon us" stand and concentrate upon receiving the additional Neshama / soul] and spread upon us and upon Jerusalem your city your shelter of peace. Blessed is the One spreads the shelter of peace upon us and upon His entire people Israel and upon Jerusalem. Amen.',
          to: '',
        },
        { seg: 10, from: 'And guard us,', to: 'And guard us.' },
        {
          seg: 11,
          memory: true,
          from: ' Here, as elsewhere in the Liturgy, the Half-Kaddish marks the end of a distinct section of the prayers, in this case, the Pesukei Dezimrah. It is called the Half-Kaddish, the final three verses of the complete Kaddish having been omitted.',
          to: '',
        },
      ],
      minyanParts: [
        { from: 8, paragraph: 1, label: SAID_BY.chazzan, en: '(Repeat & Say) The L-rd, Your G-d is True.' },
        { from: 11, to: 12, label: SAID_BY.chazzan },
      ],
    },
    {
      ...base,
      title: T.amidah,
      path: amidah,
      from: 1,
      to: 50,
      at: {
        ...each(8, 9, MOTZAEI),
        ...each(15, 16, NO_RAIN),
        ...each(17, 18, RAIN),
        26: TISHA_BAV,
        ...each(30, 35, YAALEH_VEYAVO),
        32: { all: ['roshChodesh'] },
        33: { all: ['cholHamoedPesach'] },
        34: { all: ['cholHamoedSukkot'] },
        ...each(39, 40, AL_HANISSIM),
        41: CHANUKAH,
        42: PURIM,
      },
      drop: [27],
      enMoves: [edotNetzorMove(46)],
      reviewed: [46, 48, 50],
      edits: [
        { seg: 26, from: 'בתשעה באב יש אומרים<br>', to: '<br>' },
        { seg: 48, from: RAVS_PRAYER_NOTE, to: '' },
      ],
      optionalParts: [
        { from: 26, label: SOME_SAY.aneinu },
        { from: 48, paragraph: 1, label: SOME_SAY.ravsPrayer },
      ],
    },
    { ...base, title: T.yehiShem, path: amidah, from: 51, to: 51 },
    { ...base, title: T.megillah, path: 'Purim > Megillah Reading', from: 1, to: 13, when: PURIM },
    {
      ...base,
      title: T.motzaeiShabbat,
      path: amidah,
      from: 53,
      to: 60,
      drop: [54, 55],
      at: {
        53: VI_HI_NOAM,
        ...each(56, 58, VI_HI_NOAM),
        59: { any: ['viHiNoam', 'tishaBav', 'purim'] },
        60: { any: ['viHiNoam', 'purim'] },
      },
      optionalParts: [{ from: 56, label: SOME_SAY.beforeShuvah }],
      minyanParts: [{ from: 53, label: SAID_BY.chazzan }],
      insert: [{ at: 59, ...NOTES.tishaBavEichah }],
    },
    { ...base, title: T.kaddish, path: amidah, from: 61, to: 65, minyan: SAID_BY.chazzan },
    { ...base, title: T.shirHamaalot, path: 'Weekday Shacharit > Beit Yaakov', from: 4, to: 4, when: PURIM },
    edotOmer({ when: OMER }),
    {
      ...base,
      title: T.shirLamaalot,
      path: amidah,
      from: 66,
      to: 69,
      minyanParts: [{ from: 67, to: 69, label: SAID_BY.mourners }],
    },
    { ...base, title: T.closingBarchu, path: amidah, from: 70, to: 72, minyan: SAID_BY.chazzanAndCongregation },
    {
      ...base,
      title: T.aleinu,
      path: 'Weekday Arvit > Alenu',
      from: 1,
      reviewed: [3],
      enMoves: [EDOT_ALEINU_TORAH_MOVE],
    },
  ];
}

function sefardMincha() {
  const base = { ...SEFARD, transform: SEFARD_VARIANTS };
  const tachanun = 'Weekday Mincha > Tachanun';
  return [
    { ...base, title: T.korbanot, path: 'Weekday Mincha > Korbanot', to: 21 },
    {
      ...base,
      title: T.ashrei,
      path: 'Weekday Mincha > Korbanot',
      from: 22,
      insert: [{ at: 23, ...NOTES.fastTorahReading }],
      minyanParts: [{ from: 23, to: 27, label: SAID_BY.chazzan }],
    },
    {
      ...base,
      title: T.amidah,
      path: 'Weekday Mincha > Amidah',
      at: {
        ...each(3, 5, IN_AYT),
        ...each(9, 10, SUMMER),
        ...each(11, 13, WINTER),
        ...each(15, 17, IN_AYT),
        35: NOT_AYT,
        ...each(36, 38, IN_AYT),
        48: FAST,
        ...each(53, 54, NO_RAIN),
        ...each(55, 56, RAIN),
        62: NOT_AYT,
        ...each(63, 64, IN_AYT),
        ...each(72, 74, TISHA_BAV),
        75: { none: ['tishaBav'] },
        ...each(80, 81, FAST),
        ...each(85, 91, YAALEH_VEYAVO),
        87: { all: ['roshChodesh'] },
        88: { all: ['cholHamoedPesach'] },
        89: { all: ['cholHamoedSukkot'] },
        ...each(98, 99, AL_HANISSIM),
        ...each(100, 101, CHANUKAH),
        ...each(102, 103, PURIM),
        ...each(105, 107, IN_AYT),
        ...each(111, 114, FAST),
        ...each(115, 116, { all: ['publicFast', 'inIsrael'] }),
        ...each(119, 121, IN_AYT),
      },
      reviewed: [65, 97],
      enDrop: [107],
      insert: [{ at: 123, ...NOTES.erevYomKippurVidui }],
      drop: [19, 20, 47, 109, 110],
      optionalParts: [
        { from: 111, to: 114, label: NO_KOHANIM_IN_ISRAEL },
        { from: 115, to: 116, label: WHEN_SAID.kohanimBless },
      ],
      minyanParts: [
        { from: 21, to: 32, label: SAID_BY.kedusha },
        { from: 48, label: SAID_BY.aneinu },
        { from: 96, to: 97, label: SAID_BY.modimDeRabbanan },
        { from: 111, to: 116, label: SAID_BY.birkatKohanim },
      ],
    },
    {
      ...base,
      title: T.tachanun,
      path: tachanun,
      to: 11,
      when: MINCHA_TACHANUN,
      enDrop: [0],
      insert: [{ at: 0, ...NOTES.tachanunDisputed }],
      minyanParts: [{ from: 5, to: 7, label: SAID_BY.withMinyan }],
    },
    {
      ...base,
      title: T.avinuMalkeinu,
      path: 'Weekday Mincha > Avinu Malkeinu',
      when: MINCHA_AVINU_MALKEINU,
      at: {
        ...each(4, 5, IN_AYT),
        ...each(6, 7, FAST_NOT_AYT),
        ...each(22, 27, IN_AYT),
        ...each(28, 33, FAST_NOT_AYT),
      },
    },
    { ...base, title: T.tachanunConclusion, path: tachanun, from: 12, to: 16, when: MINCHA_TACHANUN },
    { ...base, title: T.kaddish, path: tachanun, from: 17, to: 23, minyan: SAID_BY.chazzan },
    { ...base, title: T.aleinu, path: tachanun, from: 24, to: 26 },
    { ...base, title: T.mournersKaddish, path: tachanun, from: 27, to: 31, minyan: SAID_BY.mourners },
    { ...base, title: T.ledavid, path: tachanun, from: 32, to: 34, when: LEDAVID },
    {
      ...base,
      title: T.mournersHouse,
      path: tachanun,
      from: 36,
      to: 36,
      when: MINCHA_TACHANUN,
      optional: WHEN_SAID.mournersHouse,
      insert: [{ at: 37, he: '<small>(קדיש יתום)</small>', en: "(Mourner's Kaddish)" }],
    },
  ];
}

function sefardMaariv() {
  const base = { ...SEFARD, transform: SEFARD_VARIANTS };
  const shema = 'Weekday Maariv > The Shema';
  const amidah = 'Weekday Maariv > Amidah';
  const motzaei = 'Weekday Maariv > Motzaei Shabbat';
  return [
    { ...base, title: T.vehuRachum, path: shema, from: 1, to: 1 },
    { ...base, title: T.barchu, path: shema, from: 2, to: 5, minyan: SAID_BY.chazzanAndCongregation },
    {
      ...base,
      title: T.shemaBlessings,
      path: shema,
      from: 6,
      drop: [8],
      optionalParts: [{ from: 9, label: WHEN_SAID.alone }],
      minyanParts: [
        { from: 18, to: 19, label: SAID_BY.chazzan },
        { from: 29, to: 32, label: SAID_BY.chazzan },
      ],
    },
    {
      ...base,
      title: T.amidah,
      path: amidah,
      to: 95,
      edits: [{ seg: 62, from: 'תְּפִלָתֵֽנוּ*', to: 'תְּפִלָתֵֽנוּ' }],
      enEdits: [{ seg: 62, ...SEFARD_SHOMEA_TEFILLAH_STAR_EN }],
      at: {
        ...each(3, 5, IN_AYT),
        ...each(9, 10, SUMMER),
        ...each(11, 13, WINTER),
        ...each(15, 17, IN_AYT),
        21: NOT_AYT,
        ...each(22, 24, IN_AYT),
        27: MOTZAEI,
        ...each(39, 40, NO_RAIN),
        ...each(41, 42, RAIN),
        44: RAIN,
        49: NOT_AYT,
        ...each(50, 51, IN_AYT),
        ...each(65, 70, YAALEH_VEYAVO),
        67: { all: ['roshChodesh'] },
        68: { all: ['cholHamoedPesach'] },
        69: { all: ['cholHamoedSukkot'] },
        ...each(75, 76, AL_HANISSIM),
        ...each(77, 78, CHANUKAH),
        ...each(79, 80, PURIM),
        ...each(82, 84, IN_AYT),
        ...each(88, 90, IN_AYT),
      },
      reviewed: [52],
    },
    {
      ...base,
      title: T.kaddish,
      path: amidah,
      from: 96,
      to: 102,
      enEdits: [{ seg: 96, from: SEFARD_MAARIV_KADDISH_NOTE_CUT_EN, to: '' }],
      at: { 96: VI_HI_NOAM, ...each(100, 102, { none: ['viHiNoam'] }) },
      minyan: SAID_BY.chazzan,
    },
    {
      ...base,
      title: T.motzaeiShabbat,
      path: motzaei,
      from: 3,
      to: 10,
      at: { ...each(3, 4, VI_HI_NOAM), ...each(5, 10, VEATA_KADOSH) },
      insert: [
        { at: 3, ...NOTES.megillahNight },
        { at: 5, ...NOTES.tishaBavEichah },
      ],
    },
    {
      ...base,
      title: T.kaddishAfterAdditions,
      path: motzaei,
      from: 11,
      to: 16,
      when: VEATA_KADOSH,
      at: { 14: VI_HI_NOAM },
      minyan: SAID_BY.chazzan,
    },
    {
      ...base,
      title: T.omer,
      path: 'Weekday Maariv > Sefirat HaOmer',
      from: 1,
      when: OMER,
      omer: { first: 4, stride: 1 },
      transform: compose(SEFARD_VARIANTS, withoutOmerNumber),
      edits: [SEFARD_OMER_NIGHT_NOTE, omerReady(2)],
      enEdits: [OMER_HINENI_BLESSING_EN],
    },
    {
      ...base,
      title: T.shirLamaalot,
      path: amidah,
      from: 104,
      to: 110,
      when: IN_ISRAEL,
      optional: SOME_SAY.shirLamaalot,
      minyanParts: [{ from: 105, to: 110, label: SAID_BY.mourners }],
    },
    { ...base, title: T.closingBarchu, path: amidah, from: 111, to: 112, minyan: SAID_BY.chazzanAndCongregation },
    { ...base, title: T.aleinu, path: amidah, from: 113, to: 115 },
    { ...base, title: T.mournersKaddish, path: amidah, from: 116, to: 120, minyan: SAID_BY.mourners },
  ];
}

function ashkenazAmidah(service, { musaf } = {}) {
  const mincha = service === 'Minchah';
  const maariv = service === 'Maariv';
  const base = {
    ...ASHKENAZ,
    title: musaf ? T.musaf : T.amidah,
    transform: ASHKENAZ_VARIANTS,
    ...(musaf ? { when: MUSAF } : {}),
  };
  const at = (node) => `Weekday > ${service} > ${mincha ? 'Amida' : 'Amidah'} > ${node}`;
  const summer = { all: ['inIsrael'], none: ['winter'] };
  const middleBlessings = [
    { ...base, path: at('Knowledge'), ...(maariv ? { at: { 1: MOTZAEI } } : {}) },
    ...['Repentance', 'Forgiveness'].map((node) => ({ ...base, path: at(node) })),
    { ...base, path: at('Redemption'), ...(maariv ? {} : { drop: [1] }) },
    ...(maariv
      ? []
      : [
          {
            ...base,
            path: 'Weekday > Minchah > Amida > Response to Prayer',
            from: 2,
            to: 2,
            when: FAST,
            minyan: SAID_BY.aneinu,
          },
          {
            he: 'wikiAshkenazAmidah',
            title: base.title,
            path: 'עננו ת',
            transform: ashkenazName,
            when: FAST,
            minyan: SAID_BY.aneinu,
          },
        ]),
    {
      ...base,
      path: at('Healing'),
      ...(maariv ? {} : { drop: [1], reviewed: [2], optionalParts: [{ from: 2, label: SOME_SAY.forTheSick }] }),
    },
    {
      ...base,
      path: at('Prosperity'),
      at: maariv ? { 1: NO_RAIN, 2: RAIN, 4: RAIN } : { 1: NO_RAIN, 2: NO_RAIN, 3: RAIN, 4: RAIN, 6: RAIN },
    },
    { ...base, path: at('Gathering the Exiles') },
    { ...base, path: at('Justice'), at: { 1: NOT_AYT, 2: IN_AYT }, reviewed: [3] },
    ...['Against Enemies', 'The Righteous'].map((node) => ({ ...base, path: at(node) })),
    {
      ...base,
      path: at('Rebuilding Jerusalem'),
      ...(mincha ? { at: { 1: TISHA_BAV, 2: TISHA_BAV, 3: { none: ['tishaBav'] } } } : {}),
    },
    { ...base, path: at('Kingdom of David') },
    {
      ...base,
      path: at('Response to Prayer'),
      ...(mincha ? { at: { 1: FAST, 2: FAST }, enEdits: ASHKENAZ_SHOMEA_TEFILLAH_CLOSING_EN } : {}),
    },
  ];
  return [
    musaf
      ? { ...base, path: 'Weekday > Minchah > Amida > Patriarchs', at: each(4, 5, IN_AYT) }
      : {
          ...base,
          path: at('Patriarchs'),
          at: each(mincha ? 4 : 3, mincha ? 5 : 4, IN_AYT),
          ...(maariv ? { enDrop: [4] } : {}),
        },
    {
      ...base,
      path: at('Divine Might'),
      at: { 1: summer, 2: summer, 3: WINTER, 4: WINTER, 5: WINTER, 7: IN_AYT, 8: IN_AYT },
      ...(maariv ? {} : { drop: [10] }),
    },
    ...(maariv ? [] : [{ ...base, path: at(mincha ? 'Keduasha' : 'Kedushah'), minyan: SAID_BY.kedusha }]),
    {
      ...base,
      path: at('Holiness of God'),
      at: maariv ? { 2: NOT_AYT, 3: IN_AYT, 4: IN_AYT } : { 1: NOT_AYT, 2: IN_AYT, 3: IN_AYT },
      ...(maariv ? { drop: [0] } : {}),
    },
    ...(musaf ?? middleBlessings),
    musaf
      ? { ...base, path: at('Temple Service'), drop: [1, 2, 3] }
      : { ...base, path: at('Temple Service'), at: maariv ? each(1, 2, YAALEH_VEYAVO) : each(1, 3, YAALEH_VEYAVO) },
    {
      ...base,
      path: at('Thanksgiving'),
      at: maariv
        ? { 2: AL_HANISSIM, 3: AL_HANISSIM, 4: CHANUKAH, 5: PURIM, 7: IN_AYT, 8: IN_AYT }
        : { 4: AL_HANISSIM, 5: AL_HANISSIM, 6: CHANUKAH, 7: PURIM, 9: IN_AYT, 10: IN_AYT },
      ...(maariv ? {} : { reviewed: [3], minyanParts: [{ from: 2, to: 3, label: SAID_BY.modimDeRabbanan }] }),
    },
    ...(maariv
      ? []
      : [
          {
            ...base,
            path: at('Birkat Kohanim'),
            minyan: SAID_BY.birkatKohanim,
            ...(mincha ? { when: FAST, drop: [0] } : {}),
            optionalParts: [{ from: 1, to: mincha ? 2 : 5, label: NO_KOHANIM_IN_ISRAEL }],
          },
        ]),
    {
      ...base,
      path: at('Peace'),
      at: mincha ? { 0: NOT_FAST, 1: FAST, 2: IN_AYT, 3: IN_AYT } : { 1: IN_AYT, 2: IN_AYT },
      ...(maariv ? { edits: [{ seg: 1, from: ' (בָּרוּךְ אַתָּה יְהֹוָה עֹשֶׂה הַשָּׁלוֹם:)', to: '' }] } : {}),
      insert: [{ at: mincha ? 4 : 3, ...NOTES.ayTPeaceChatimah }],
    },
    mincha
      ? { ...base, path: at('Concluding Passage'), drop: [4], insert: [{ at: 0, ...NOTES.erevYomKippurVidui }] }
      : { ...base, path: at('Concluding Passage'), ...(maariv ? {} : { drop: [4] }) },
  ];
}

function ashkenazMincha() {
  const base = { ...ASHKENAZ, transform: ASHKENAZ_VARIANTS };
  const at = (node) => `Weekday > Minchah > ${node}`;
  return [
    {
      ...base,
      title: T.ashrei,
      path: at('Ashrei'),
      insert: [{ at: 7, ...NOTES.fastTorahReading }],
      minyanParts: [{ from: 1, to: 6, label: SAID_BY.chazzan }],
    },
    ...ashkenazAmidah('Minchah'),
    { ...ashkenazVidui(base), when: MINCHA_TACHANUN },
    {
      ...base,
      title: T.avinuMalkeinu,
      path: at('Post Amidah > Avinu Malkenu'),
      when: MINCHA_AVINU_MALKEINU,
      at: { 4: IN_AYT, 5: FAST_NOT_AYT, ...each(20, 25, IN_AYT), ...each(26, 31, FAST_NOT_AYT) },
    },
    {
      ...base,
      title: T.tachanun,
      path: at('Post Amidah > Tachanun > Nefilat Appayim'),
      when: MINCHA_TACHANUN,
      insert: [{ at: 0, ...NOTES.tachanunDisputed }],
    },
    { ...base, title: T.tachanun, path: at('Post Amidah > Tachanun > Shomer Yisrael'), when: MINCHA_TACHANUN },
    { ...base, title: T.kaddish, path: at('Post Amidah > Kaddish Shalem'), minyan: SAID_BY.chazzan },
    { ...base, title: T.aleinu, path: at('Concluding Prayers > Alenu') },
    { ...base, title: T.mournersKaddish, path: at("Concluding Prayers > Mourner's Kaddish"), minyan: SAID_BY.mourners },
  ];
}

function ashkenazMaariv() {
  const base = { ...ASHKENAZ, transform: ASHKENAZ_VARIANTS };
  const at = (node) => `Weekday > Maariv > ${node}`;
  const shema = (node, extra = {}) => ({
    ...base,
    title: T.shemaBlessings,
    path: at(`Blessings of the Shema > ${node}`),
    ...extra,
  });
  return [
    { ...base, title: T.vehuRachum, path: at('Vehu Rachum'), from: 1 },
    { ...base, title: T.barchu, path: at('Barchu'), minyan: SAID_BY.chazzanAndCongregation },
    shema('First Blessing before Shema'),
    shema('Second Blessing before Shema'),
    shema('Shema', {
      drop: [0],
      optionalParts: [{ from: 1, label: WHEN_SAID.alone }],
      minyanParts: [{ from: 10, to: 11, label: SAID_BY.chazzan }],
    }),
    shema('First Blessing after Shema', { from: 1 }),
    shema('Second Blessing after Shema', { from: 1 }),
    shema('Third Blessing after Shema', { from: 1, when: NOT_IN_ISRAEL }),
    shema('Half Kaddish', { minyan: SAID_BY.chazzan }),
    ...ashkenazAmidah('Maariv'),
    {
      ...base,
      title: T.kaddish,
      path: at('Kaddish Shalem'),
      at: { 0: VI_HI_NOAM, ...each(6, 8, { none: ['viHiNoam'] }) },
      minyan: SAID_BY.chazzan,
    },
    {
      ...base,
      title: T.motzaeiShabbat,
      path: at("Additions for Motza'ei Shabbat > Viyehi Noam"),
      at: { ...each(0, 1, VI_HI_NOAM), ...each(2, 10, VEATA_KADOSH) },
      insert: [
        { at: 0, ...NOTES.megillahNight },
        { at: 2, ...NOTES.tishaBavEichah },
      ],
    },
    {
      ...base,
      title: T.kaddishAfterAdditions,
      path: at('Kaddish Shalem'),
      from: 1,
      when: VEATA_KADOSH,
      at: { 6: VI_HI_NOAM },
      minyan: SAID_BY.chazzan,
    },
    {
      ...base,
      title: T.omer,
      path: at('Sefirat HaOmer'),
      from: 1,
      when: OMER,
      omer: { first: 5, stride: 1 },
      transform: compose(ASHKENAZ_VARIANTS, withoutOmerNumber),
      edits: [omerReady(2)],
      enEdits: [OMER_HINENI_BLESSING_EN],
    },
    { ...base, title: T.aleinu, path: at('Alenu') },
    { ...base, title: T.mournersKaddish, path: at("Mourner's Kaddish"), minyan: SAID_BY.mourners },
    {
      ...base,
      title: T.ledavid,
      path: at('LeDavid'),
      when: LEDAVID,
      minyanParts: [{ from: 2, to: 8, label: SAID_BY.mourners }],
    },
    ...ashkenazMournersHouse(base, at("Mourner's Kaddish")),
  ];
}

// Metsudah's Ashkenaz and Sefard Birkat HaMazon share one layout, so the two builders differ only
// in their indices. The zimun's speaker notes become minyan labels, the Shabbat, Yom Tov and Rosh
// Hashana lines are dropped, and Yaaleh Veyavo keeps only its Rosh Chodesh and Chol HaMoed days.
function ashkenazBirkatHamazon() {
  const base = { ...ASHKENAZ, path: 'Berachot > Birkat HaMazon' };
  const shabbat = { he: 'metsudahShabbatHe', en: 'metsudahShabbatEn' };
  const wedding = { ...shabbat, path: 'Birchas Hamazon > Birchas Hamazon for Sheva Berachos' };
  const brit = { ...shabbat, path: 'Birchas Hamazon > Birchas Hamozon for Bris Milah' };
  return [
    { ...base, title: T.beforeBirkat, to: 1 },
    {
      ...base,
      title: T.zimun,
      from: 4,
      to: 19,
      drop: [5, 7, 9, 11, 13, 15, 17],
      edits: [{ seg: 19, from: '<small>ויש המוסיפים:</small> ', to: '' }],
      minyanParts: [
        { from: 6, label: SAID_BY.mezamen },
        { from: 8, label: SAID_BY.diners },
        { from: 10, to: 12, label: SAID_BY.mezamen },
        { from: 14, label: SAID_BY.diners },
        { from: 16, label: SAID_BY.didNotEat },
        { from: 18, label: SAID_BY.mezamen },
      ],
      optionalParts: [{ from: 19, label: SOME_SAY.baruchHu }],
    },
    {
      ...wedding,
      title: T.zimunShevaBerachot,
      optional: WHEN_SAID.shevaBerachotMeal,
      from: 1,
      groups: [
        [3, 4],
        [6, 7],
        [9, 13],
        [14, 18],
        [20, 23],
        [25, 28],
      ],
      minyanParts: [
        { from: 1, label: SAID_BY.mezamen },
        { from: 3, to: 4, label: SAID_BY.diners },
        { from: 6, to: 18, label: SAID_BY.mezamen },
        { from: 20, to: 23, label: SAID_BY.diners },
        { from: 25, to: 28, label: SAID_BY.mezamen },
      ],
    },
    {
      ...brit,
      title: T.zimunBritMilah,
      optional: WHEN_SAID.britMilahMeal,
      from: 1,
      to: 63,
      groups: [
        [3, 4],
        [6, 7],
        [9, 11],
        [12, 16],
        [18, 20],
        [22, 25],
        [27, 29],
        [31, 35],
        [37, 39],
        [41, 46],
        [48, 50],
        [52, 55],
        [57, 59],
        [61, 63],
      ],
      minyanParts: [
        { from: 1, label: SAID_BY.mezamen },
        { from: 3, to: 4, label: SAID_BY.diners },
        { from: 6, to: 16, label: SAID_BY.mezamen },
        { from: 18, to: 20, label: SAID_BY.diners },
        { from: 22, to: 25, label: SAID_BY.mezamen },
        { from: 27, to: 29, label: SAID_BY.diners },
        { from: 31, to: 35, label: SAID_BY.mezamen },
        { from: 37, to: 39, label: SAID_BY.diners },
        { from: 41, to: 46, label: SAID_BY.mezamen },
        { from: 48, to: 50, label: SAID_BY.diners },
        { from: 52, to: 55, label: SAID_BY.mezamen },
        { from: 57, to: 59, label: SAID_BY.diners },
        { from: 61, to: 63, label: SAID_BY.mezamen },
      ],
    },
    {
      ...base,
      title: T.birkatHamazon,
      from: 20,
      to: 48,
      drop: [33, 34, 39, 41, 42, 43, 45],
      at: {
        ...each(24, 25, AL_HANISSIM_OR_YESTERDAY),
        ...each(26, 27, CHANUKAH_OR_YESTERDAY),
        ...each(28, 29, PURIM_OR_YESTERDAY),
        ...each(35, 36, YAALEH_VEYAVO_OR_YESTERDAY),
        37: ROSH_CHODESH_OR_YESTERDAY,
        38: CHOL_HAMOED_PESACH_OR_YESTERDAY,
        40: CHOL_HAMOED_SUKKOT_OR_YESTERDAY,
        44: YAALEH_VEYAVO_OR_YESTERDAY,
      },
      optionalParts: [
        { from: 24, to: 29, label: WHEN_SAID.mealBeganAlHanissim },
        { from: 35, to: 44, label: WHEN_SAID.mealBeganYaalehVeyavo },
      ],
    },
    {
      ...base,
      title: T.harachaman,
      from: 49,
      to: 75,
      drop: [64, 65, 68, 69, 70, 71],
      at: { ...each(66, 67, ROSH_CHODESH_OR_YESTERDAY), ...each(72, 73, CHOL_HAMOED_SUKKOT_OR_YESTERDAY) },
      edits: [{ seg: 74, from: ` ${MIGDOL_NOTE}`, to: '' }, spouseBlessing(59)],
      enEdits: [{ seg: 74, from: MIGDOL_NOTE_EN, to: '' }],
      optionalParts: [
        { from: 61, to: 62, label: WHEN_SAID.guest },
        { from: 66, to: 67, label: WHEN_SAID.mealBeganYaalehVeyavo },
        { from: 72, to: 73, label: WHEN_SAID.mealBeganYaalehVeyavo },
      ],
    },
    {
      ...brit,
      title: T.harachamanMilah,
      optional: WHEN_SAID.britMilahMeal,
      from: 66,
      groups: [
        [66, 73],
        [76, 82],
        [85, 90],
        [93, 100],
        [103, 109],
        [112, 120],
      ],
      enEdits: [{ seg: 108, from: 'to the que people', to: 'to the one people' }],
    },
    {
      ...base,
      title: T.forgotYaalehVeyavo,
      optional: WHEN_SAID.forgotYaalehVeyavo,
      from: 79,
      to: 80,
      when: ROSH_CHODESH,
    },
  ];
}

function sefardBirkatHamazon() {
  const base = { ...SEFARD, path: 'Birchat HaMazon > Birchat HaMazon' };
  const weekdayPsalmNote = {
    he: '<small>בחול אומרים לפני ברכת המזון:</small>',
    en: 'On weekdays, before Birkat HaMazon:',
  };
  return [
    { ...base, title: T.beforeBirkat, from: 1, to: 1, insert: [{ at: 1, ...weekdayPsalmNote }] },
    {
      ...base,
      title: T.zimun,
      from: 8,
      to: 20,
      drop: [13],
      edits: [{ seg: 20, from: 'בָּרוּךְ הוּא', to: '<small>בעשרה מוסיפים:</small> בָּרוּךְ הוּא' }],
      minyanParts: [
        { from: 8, label: SAID_BY.mezamen },
        { from: 10, label: SAID_BY.diners },
        { from: 12, to: 14, label: SAID_BY.mezamen },
        { from: 16, label: SAID_BY.diners },
        { from: 18, to: 20, label: SAID_BY.mezamen },
      ],
    },
    {
      ...base,
      title: T.zimunShevaBerachot,
      optional: WHEN_SAID.shevaBerachotMeal,
      from: 23,
      to: 34,
      minyanParts: [
        { from: 23, label: SAID_BY.mezamen },
        { from: 25, label: SAID_BY.diners },
        { from: 27, to: 30, label: SAID_BY.mezamen },
        { from: 32, label: SAID_BY.diners },
        { from: 34, label: SAID_BY.mezamen },
      ],
    },
    {
      ...base,
      title: T.birkatHamazon,
      from: 35,
      to: 63,
      drop: [49, 56, 57, 60],
      edits: [
        { seg: 40, ...noteBefore('בחנוכה ובפורים אומרים:', '<b>וְעַל הַנִּסִּים</b>') },
        { seg: 42, ...noteBefore('בחנוכה:', '<b>בִּימֵי מַתִּתְיָֽהוּ</b>') },
        { seg: 44, ...noteBefore('בפורים:', '<b>בִּימֵי מָרְדְּכַי וְאֶסְתֵּר</b>') },
        { seg: 51, ...noteBefore('בראש חודש ובחול המועד אומרים:', '<b>אֱלֹהֵֽינוּ</b> וֵאלֹהֵי') },
      ],
      at: {
        40: AL_HANISSIM_OR_YESTERDAY,
        42: CHANUKAH_OR_YESTERDAY,
        44: PURIM_OR_YESTERDAY,
        51: YAALEH_VEYAVO_OR_YESTERDAY,
        52: ROSH_CHODESH_OR_YESTERDAY,
        53: CHOL_HAMOED_PESACH_OR_YESTERDAY,
        55: CHOL_HAMOED_SUKKOT_OR_YESTERDAY,
        59: YAALEH_VEYAVO_OR_YESTERDAY,
      },
      optionalParts: [
        { from: 39, to: 44, label: WHEN_SAID.mealBeganAlHanissim },
        { from: 50, to: 59, label: WHEN_SAID.mealBeganYaalehVeyavo },
      ],
    },
    {
      ...base,
      title: T.harachaman,
      from: 64,
      to: 90,
      drop: [79, 80, 83, 84, 85, 86],
      insert: [
        { at: 72, he: '<small>אם סמוך על שלחן אביו יאמר:</small>', en: "When eating at your parents' table, say:" },
        { at: 74, he: '<small>ואם סמוך על שלחן עצמו יאמר:</small>', en: 'When eating at your own table, say:' },
      ],
      at: { ...each(81, 82, ROSH_CHODESH_OR_YESTERDAY), ...each(87, 88, CHOL_HAMOED_SUKKOT_OR_YESTERDAY) },
      edits: [{ seg: 89, from: ` ${MIGDOL_NOTE}`, to: '' }, spouseBlessing(74)],
      enEdits: [{ seg: 89, from: MIGDOL_NOTE_EN, to: '' }],
      optionalParts: [
        { from: 77, label: WHEN_SAID.guest },
        { from: 81, to: 82, label: WHEN_SAID.mealBeganYaalehVeyavo },
        { from: 87, to: 88, label: WHEN_SAID.mealBeganYaalehVeyavo },
      ],
    },
    {
      ...TORAT_EMET,
      title: T.harachamanMilah,
      optional: WHEN_SAID.britMilahMeal,
      path: 'Birchat HaMazon > Brit Milah',
      from: 2,
      to: 7,
      reviewed: [2, 3, 4, 5, 6, 7],
    },
    {
      ...base,
      title: T.forgotYaalehVeyavo,
      optional: WHEN_SAID.forgotYaalehVeyavo,
      from: 95,
      to: 95,
      when: ROSH_CHODESH,
    },
  ];
}

function edotBirkatHamazon() {
  const base = { ...EDOT, path: 'Post Meal Blessing' };
  const sukkahPermission = '(<small>בסוכה</small> וּבִרְשׁוּת שִׁבְעָה אוּשְׁפִּיזִין עִלָּאִין קַדִּישִׁין) ';
  const yomTovOnly = '<small><small>ביום טוב מוסיפים:</small> טוֹב</small> ';
  const migdolDays = 'musaf,motzaeiShabbat,purim';
  return [
    { ...base, title: T.beforeBirkat, from: 1, to: 3, reviewed: [2, 3] },
    {
      ...base,
      title: T.zimun,
      from: 4,
      to: 14,
      drop: [5, 7, 9, 11, 13],
      edits: [
        {
          seg: 10,
          from: '(<small>בשבת</small> וּבִרְשׁוּת שַׁבָּת מַלְכְּתָא.) (<small>ביו"ט</small> וּבִרְשׁוּת יוֹמָא טָבָא אוּשְׁפִּיזָא קַדִּישָׁא.) ',
          to: '',
        },
        { seg: 10, from: sukkahPermission, to: `<if all="cholHamoedSukkot">${sukkahPermission}</if>` },
      ],
      minyanParts: [
        { from: 6, label: SAID_BY.mezamen },
        { from: 8, label: SAID_BY.diners },
        { from: 10, label: SAID_BY.mezamen },
        { from: 12, label: SAID_BY.diners },
        { from: 14, label: SAID_BY.mezamen },
      ],
    },
    {
      ...base,
      title: T.birkatHamazon,
      from: 15,
      to: 41,
      drop: [23, 24, 29, 30, 32, 35, 36, 37, 38, 39, 40],
      edits: [
        { seg: 20, from: '<small>בפורים אומרים <b>', to: '<small>בפורים אומרים:</small> <small><b>' },
        { seg: 25, from: 'בראש חודש ביום טוב ובחול המועד אומרים', to: 'בראש חודש ובחול המועד אומרים' },
        { seg: 28, from: yomTovOnly, to: '' },
        { seg: 31, from: yomTovOnly, to: '' },
      ],
      at: {
        ...each(17, 18, AL_HANISSIM_OR_YESTERDAY),
        19: CHANUKAH_OR_YESTERDAY,
        20: PURIM_OR_YESTERDAY,
        ...each(25, 26, YAALEH_VEYAVO_OR_YESTERDAY),
        27: ROSH_CHODESH_OR_YESTERDAY,
        28: CHOL_HAMOED_PESACH_OR_YESTERDAY,
        31: CHOL_HAMOED_SUKKOT_OR_YESTERDAY,
        33: YAALEH_VEYAVO_OR_YESTERDAY,
      },
      optionalParts: [
        { from: 17, to: 20, label: WHEN_SAID.mealBeganAlHanissim },
        { from: 25, to: 33, label: WHEN_SAID.mealBeganYaalehVeyavo },
      ],
    },
    {
      ...base,
      title: T.harachaman,
      from: 42,
      to: 58,
      drop: [43, 44, 47, 48, 53, 54],
      reviewed: [56],
      enMoves: [
        {
          seg: 57,
          text: 'At a Seduat Chatan: The merciful one, bless the groom and bridge, with male children for his blessed service:',
          to: 56,
        },
        {
          seg: 56,
          text: 'The Merciful One, He will give us life &amp; merit &amp; approach us to the days of the Messiah &amp; the building of the Holy Temple &amp; life of the World to Come.',
          to: 57,
        },
      ],
      enEdits: [
        { seg: 56, from: 'A guest says: ', to: '' },
        { seg: 56, from: 'At a Seduat Chatan: ', to: '' },
        { seg: 56, from: 'groom and bridge', to: 'groom and bride' },
      ],
      at: {
        ...each(45, 46, ROSH_CHODESH_OR_YESTERDAY),
        ...each(49, 50, CHOL_HAMOED_SUKKOT_OR_YESTERDAY),
        ...each(51, 52, CHOL_HAMOED_OR_YESTERDAY),
      },
      edits: [
        { seg: 56, from: '<small>אורח אומר</small><br>', to: '' },
        { seg: 56, from: '<small>בסעודת חתן</small><br>', to: '' },
        { seg: 56, from: '<small>בסעודת מילה</small><br>', to: '' },
        {
          seg: 58,
          from: 'מַגְדִּיל (<small>ביום שמתפללים מוסף, במוצ"ש, בסעודת פורים ובסעודת מילה יאמר:</small> מִגְדּ֖וֹל)',
          to: `<if none="${migdolDays}">מַגְדִּיל</if><if any="${migdolDays}">מִגְדּ֖וֹל</if> (<small>בסעודת מילה אומרים מגדול</small>)`,
        },
      ],
      optionalParts: [
        { from: 45, to: 52, label: WHEN_SAID.mealBeganYaalehVeyavo },
        { from: 56, until: 1, label: WHEN_SAID.guest },
        {
          from: 56,
          paragraph: 1,
          until: 2,
          label: WHEN_SAID.shevaBerachotMeal,
          en: 'The merciful one, bless the groom and bride, with male children for his blessed service:',
        },
        { from: 56, paragraph: 2, label: WHEN_SAID.britMilahMeal },
      ],
    },
    {
      ...base,
      title: T.forgotYaalehVeyavo,
      optional: WHEN_SAID.forgotYaalehVeyavo,
      from: 35,
      to: 38,
      drop: [37],
      when: ROSH_CHODESH,
      edits: [
        {
          seg: 36,
          from: '<small>בָּרוּךְ (אַתָּה יְהֹוָה, אֱלֹהֵֽינוּ מֶלֶךְ הָעוֹלָם), שֶׁנָּתַן</small> ',
          to: 'בָּרוּךְ שֶׁנָּתַן',
        },
        {
          seg: 38,
          from: '<small><small>לראש חודש</small> (וְ)רָאשֵׁי חֳדָשִׁים לְעַמּוֹ יִשְׂרָאֵל לְזִּכָּרוֹן: ע"כ בחול</small> ',
          to: 'רָאשֵׁי חֳדָשִׁים לְעַמּוֹ יִשְׂרָאֵל לְזִכָּרוֹן:',
        },
      ],
    },
  ];
}

function chabadBirkatHamazon() {
  const base = { ...CHABAD, path: 'Blessings > Birkat HaMazon' };
  return [
    { ...base, title: T.beforeBirkat, to: 10 },
    {
      ...base,
      title: T.zimun,
      from: 11,
      to: 16,
      edits: [
        { seg: 13, from: '<small>מסובים עונים:</small> ', to: '' },
        { seg: 14, from: '<small>המברך אומר:</small> ', to: '' },
        { seg: 15, from: '<small>המסובים עונים:</small> ', to: '' },
        { seg: 16, from: '<small>ומי שלא אכל עונה:</small> ', to: '' },
      ],
      minyanParts: [
        { from: 12, label: SAID_BY.mezamen },
        { from: 13, label: SAID_BY.diners },
        { from: 14, label: SAID_BY.mezamen },
        { from: 15, label: SAID_BY.diners },
        { from: 16, label: SAID_BY.didNotEat },
      ],
    },
    {
      ...base,
      title: T.birkatHamazon,
      from: 17,
      to: 27,
      at: {
        ...each(19, 20, AL_HANISSIM_OR_YESTERDAY),
        21: CHANUKAH_OR_YESTERDAY,
        22: PURIM_OR_YESTERDAY,
        25: YAALEH_VEYAVO_OR_YESTERDAY,
      },
      edits: [
        {
          seg: 25,
          from: '<small>בראש חדש:</small> רֹאשׁ הַחֹדֶשׁ הַזֶּה. <small>בחוה״מ פסח:</small> חַג הַמַּצּוֹת הַזֶּה. <small>בחוה״מ סוכות:</small> חַג הַסֻּכּוֹת הַזֶּה.',
          to: yaalehVeyavoDay('רֹאשׁ הַחֹדֶשׁ הַזֶּה.', 'חַג הַמַּצּוֹת הַזֶּה.', 'חַג הַסֻּכּוֹת הַזֶּה.'),
        },
      ],
      optionalParts: [
        { from: 19, to: 22, label: WHEN_SAID.mealBeganAlHanissim },
        { from: 25, label: WHEN_SAID.mealBeganYaalehVeyavo },
      ],
    },
    {
      ...base,
      title: T.harachaman,
      from: 28,
      at: { 29: ROSH_CHODESH_OR_YESTERDAY, 30: CHOL_HAMOED_SUKKOT_OR_YESTERDAY },
      edits: [
        {
          seg: 31,
          from: 'מַגְדִּל (<small>ביום שמתפללים בו מוסף —</small>מִגְדּוֹל)',
          to: '<if none="musaf">מַגְדִּל</if><if all="musaf">מִגְדּוֹל</if>',
        },
      ],
      optionalParts: [{ from: 29, to: 30, label: WHEN_SAID.mealBeganYaalehVeyavo }],
    },
    {
      ...base,
      title: T.harachamanMilah,
      optional: WHEN_SAID.britMilahMeal,
      path: 'Blessings > Birkat HaMazon for Circumcision',
      to: 5,
    },
  ];
}

function ashkenazAlHamichya() {
  const inserts =
    '<br> <small>בשבת:</small> וּרְצֵה וְהַחֲלִיצֵנוּ בְּיוֹם הַשַׁבָּת הַזֶּה.<br>  <small>בר"ח:</small> וְזָכְרֵנוּ לְטוֹבָה בְּיוֹם רֹאשׁ הַחֹדֶשׁ הַזֶּה.<br>  <small>בר"ה:</small> וְזָכְרֵנוּ לְטוֹבָה בְּיוֹם הַזִּכָּרוֹן הַזֶּה.<br>  <small>ביום טוב ובחוה"מ:</small> וְשַׂמְּחֵנוּ בְיוֹם<br>  <small>בפסח:</small> חַג הַמַּצּוֹת הַזֶּה,<br>  <small>בשבועות:</small> חַג הַשָּׁבוּעוֹת הַזֶּה,<br>  <small>בסוכות:</small> חַג הַסֻּכּוֹת הַזֶּה,<br>  <small>בשמיני עצרת:</small> שְׁמִינִי, חַג עֲצֶרֶת הַזֶּה,<br>  בְּיוֹם (טוֹב) מִקְרָא קֹדֶשׁ הַזֶּה.<br> ';
  const dayInserts =
    `<br><if any="${anyOf(ROSH_CHODESH_OR_YESTERDAY)}"><small>בראש חודש:</small> וְזָכְרֵנוּ לְטוֹבָה בְּיוֹם רֹאשׁ הַחֹדֶשׁ הַזֶּה.</if>` +
    `<if any="${anyOf(CHOL_HAMOED_OR_YESTERDAY)}"><small>בחול המועד:</small> וְשַׂמְּחֵנוּ בְיוֹם </if>` +
    `<if any="${anyOf(CHOL_HAMOED_PESACH_OR_YESTERDAY)}">חַג הַמַּצּוֹת הַזֶּה, </if>` +
    `<if any="${anyOf(CHOL_HAMOED_SUKKOT_OR_YESTERDAY)}">חַג הַסֻּכּוֹת הַזֶּה, </if>` +
    `<if any="${anyOf(CHOL_HAMOED_OR_YESTERDAY)}">בְּיוֹם מִקְרָא קֹדֶשׁ הַזֶּה.</if><br>`;
  return [
    {
      ...DAAT,
      title: T.alHamichya,
      path: 'Berachot > Birkat Hanehenin > Eating > Brachot Achronot > Al Hamichyah',
      transform: compose(daatName, daatIsraelEnding.abroad),
      edits: [{ seg: 4, from: inserts, to: dayInserts }],
      optionalParts: [{ from: 4, paragraph: 1, until: 2, label: WHEN_SAID.mealBeganYaalehVeyavo }],
    },
    {
      ...DAAT,
      title: T.alHamichyaIsrael,
      optional: WHEN_SAID.israelProduce,
      path: 'Berachot > Birkat Hanehenin > Eating > Brachot Achronot > Al Hamichyah',
      from: 5,
      transform: compose(daatName, daatIsraelEnding.israel),
      insert: [{ at: 5, ...ISRAEL_PRODUCE_NOTE }],
    },
  ];
}

function sefardAlHamichya() {
  const festival = '<small> <small>(פלוני)</small> </small>';
  return [
    {
      ...TORAT_EMET,
      title: T.alHamichya,
      path: "Blessings > Me'ein Shalosh",
      from: 2,
      drop: [8, 10],
      transform: toratEmetIsraelEnding.abroad,
      edits: [
        { seg: 11, from: '(ביו"ט:)', to: '(בחול המועד:)' },
        {
          seg: 11,
          from: festival,
          to: `<if any="${anyOf(CHOL_HAMOED_PESACH_OR_YESTERDAY)}">הַמַּצּוֹת</if><if any="${anyOf(CHOL_HAMOED_SUKKOT_OR_YESTERDAY)}">הַסֻּכּוֹת</if>`,
        },
      ],
      at: { 9: ROSH_CHODESH_OR_YESTERDAY, 11: CHOL_HAMOED_OR_YESTERDAY },
      reviewed: [13, 14, 16],
      optionalParts: [{ from: 9, to: 11, label: WHEN_SAID.mealBeganYaalehVeyavo }],
    },
    sefardIsraelProduceFold(),
  ];
}

// Chabad takes it too (the user's decision of 2026-10-18): its source prints only the general wording,
// and this one is not verified identical to the Chabad wording.
function sefardIsraelProduceFold() {
  return {
    ...TORAT_EMET,
    title: T.alHamichyaIsrael,
    optional: WHEN_SAID.israelProduce,
    path: "Blessings > Me'ein Shalosh",
    from: 13,
    transform: toratEmetIsraelEnding.israel,
    reviewed: [13, 14, 16],
    insert: [{ at: 13, ...ISRAEL_PRODUCE_NOTE }],
  };
}

function edotAlHamichya() {
  const yomTovOnly = '<small><small>ביום טוב:</small> טוֹב</small> ';
  return [
    {
      ...EDOT,
      title: T.alHamichya,
      path: 'Al Hamihya',
      from: 1,
      drop: [6, 8, 10, 12],
      transform: edotIsraelEnding.abroad,
      edits: [
        { seg: 9, from: yomTovOnly, to: '' },
        { seg: 11, from: yomTovOnly, to: '' },
      ],
      at: { 7: ROSH_CHODESH_OR_YESTERDAY, 9: CHOL_HAMOED_PESACH_OR_YESTERDAY, 11: CHOL_HAMOED_SUKKOT_OR_YESTERDAY },
      reviewed: [14, 15, 16, 18, 19, 20],
      optionalParts: [{ from: 7, to: 11, label: WHEN_SAID.mealBeganYaalehVeyavo }],
    },
    {
      ...EDOT,
      title: T.alHamichyaIsrael,
      optional: WHEN_SAID.israelProduce,
      path: 'Al Hamihya',
      from: 14,
      transform: edotIsraelEnding.israel,
      reviewed: [14, 15, 16, 18, 19, 20],
      insert: [{ at: 14, ...ISRAEL_PRODUCE_NOTE }],
    },
  ];
}

function chabadAlHamichya() {
  return [
    {
      ...CHABAD,
      title: T.alHamichya,
      path: 'Blessings > Berakha Acharona',
      to: 13,
      at: {
        6: YAALEH_VEYAVO_OR_YESTERDAY,
        7: ROSH_CHODESH_OR_YESTERDAY,
        8: CHOL_HAMOED_PESACH_OR_YESTERDAY,
        9: CHOL_HAMOED_SUKKOT_OR_YESTERDAY,
      },
      optionalParts: [{ from: 6, to: 9, label: WHEN_SAID.mealBeganYaalehVeyavo }],
    },
    sefardIsraelProduceFold(),
  ];
}

function ashkenazBirchotHanehenin() {
  const eating = { ...DAAT, path: 'Berachot > Birkat Hanehenin > Eating > Barachot Rishonot' };
  const newThings = '<small>הלובש מלבוש חדש וכן האוכל פרי חדש הגדל בזמן קבוע בשנה ומתחדש משנה לשנה מברך:</small>';
  return [
    { ...eating, title: T.handWashing, from: 0, to: 0 },
    { ...eating, title: T.hamotzi, from: 1, to: 1 },
    { ...eating, title: T.mezonot, from: 2, to: 2 },
    { ...eating, title: T.hagafen, from: 3, to: 3 },
    { ...eating, title: T.haetz, from: 4, to: 4 },
    { ...eating, title: T.haadama, from: 5, to: 5 },
    { ...eating, title: T.shehakol, from: 6, to: 6 },
    {
      he: 'metsudahShabbatHe',
      en: 'metsudahShabbatEn',
      linear: true,
      title: T.fragrance,
      path: 'Various Other Berachos',
      from: 13,
      to: 23,
      groups: [
        [13, 15],
        [17, 19],
        [21, 23],
      ],
    },
    {
      ...DAAT,
      title: T.shehecheyanu,
      path: 'Festivals > Sukkot > Blessing on Lulav',
      from: 2,
      to: 2,
      insert: [{ at: 2, he: newThings }],
    },
  ];
}

function sefardBirchotHanehenin() {
  const meal = { ...TORAT_EMET, path: 'Mealtime Blessings' };
  const foods = { ...TORAT_EMET, path: 'Birchat HaMazon > Blessing on Foods' };
  const blessing = (title, leaf) => ({ ...TORAT_EMET, title, path: `Blessings > ${leaf}`, from: 1, to: 2 });
  return [
    { ...meal, title: T.handWashing, from: 1, to: 3, reviewed: [2] },
    { ...meal, title: T.hamotzi, from: 4, to: 5 },
    { ...foods, title: T.mezonot, from: 3, to: 4 },
    { ...foods, title: T.hagafen, from: 1, to: 2 },
    blessing(T.haetz, "Ha'etz"),
    blessing(T.haadama, "Ha'adamah"),
    blessing(T.shehakol, 'Shehakol'),
    blessing(T.fragrance, 'Fragrant Spices'),
    blessing(T.fragrance, 'Fragrant Herbs'),
    blessing(T.fragrance, 'Fragrant Shrubs'),
    blessing(T.fragrance, 'Fragrant Fruit'),
    blessing(T.fragrance, 'Fragrant Oils'),
    blessing(T.shehecheyanu, 'Shehecheyanu'),
  ];
}

function edotBirchotHanehenin() {
  const meal = { ...EDOT, path: 'Shabbat Evening > First Meal' };
  const enjoyments = { ...EDOT, path: 'Blessings on Enjoyments' };
  const untranslated = { he: EDOT.he, path: 'Blessings on Enjoyments' };
  return [
    {
      ...meal,
      title: T.handWashing,
      from: 2,
      to: 4,
      edits: [{ seg: 3, from: 'וישתחו [', to: '' }, { seg: 3, from: ']', to: '' }, comeToFulfil(2)],
      reviewed: [2, 3],
      optionalParts: [{ from: 2, to: 3, label: SOME_SAY.handWashingIntention }],
    },
    {
      ...meal,
      title: T.hamotzi,
      from: 6,
      to: 7,
      reviewed: [6],
      optionalParts: [{ from: 6, label: SOME_SAY.hamotziVerses }],
    },
    { ...enjoyments, title: T.mezonot, from: 1, to: 2 },
    { ...enjoyments, title: T.hagafen, from: 3, to: 4 },
    { ...enjoyments, title: T.haetz, from: 5, to: 6 },
    { ...enjoyments, title: T.haadama, from: 7, to: 8 },
    { ...enjoyments, title: T.shehakol, from: 9, to: 10 },
    { ...untranslated, title: T.fragrance, from: 13, to: 18 },
    { ...untranslated, title: T.shehecheyanu, from: 19, to: 20 },
  ];
}

function chabadBirchotHanehenin() {
  const base = { ...CHABAD, path: 'Blessings > Various Blessings' };
  return [
    { ...base, title: T.handWashing, from: 0, to: 1 },
    { ...base, title: T.hamotzi, from: 2, to: 3 },
    { ...base, title: T.mezonot, from: 4, to: 5 },
    { ...base, title: T.hagafen, from: 6, to: 7 },
    { ...base, title: T.haetz, from: 8, to: 9 },
    { ...base, title: T.haadama, from: 10, to: 11 },
    { ...base, title: T.shehakol, from: 12, to: 13 },
    { ...base, title: T.fragrance, from: 28, to: 29 },
    {
      ...base,
      title: T.shehecheyanu,
      from: 14,
      to: 15,
      edits: [
        {
          seg: 15,
          from: '\u05DC\u05B4\u05D6\u05B0\u05BC\u05DE\u05B7\u05DF',
          to: '\u05DC\u05B7\u05D6\u05B0\u05BC\u05DE\u05B7\u05DF',
        },
      ],
    },
  ];
}

function ashkenazBedtimeShema() {
  const base = { ...ASHKENAZ, path: "Weekday > Maariv > Keri'at Shema al Hamita" };
  return [
    { ...base, title: T.ribbonoShelOlam, to: 0, edits: [forgives(0)] },
    { ...base, title: T.hamapil, from: 1, to: 1 },
    { ...base, title: T.shema, from: 2, to: 8 },
    { ...base, title: T.bedtimePsalms, from: 9, to: 11 },
    { ...base, title: T.hashkivenu, from: 12, to: 12 },
    { ...base, title: T.baruchHashemBayom, from: 13, to: 14 },
    { ...base, title: T.protectionVerses, from: 15, to: 23 },
    { ...base, title: T.shirHamaalotRigzu, from: 24, to: 26 },
    { ...base, title: T.adonOlam, from: 27, to: 36, groups: [[27, 36]] },
  ];
}

// Metsudah Sefard prints only the first paragraph here, with a note on who says the others. The two others come from its
// own Maariv Shema: Vehaya Im Shamoa folded under the circumstance the note names (and the Ri"u's custom), Vayomer under the
// Ri"u's custom alone. The two labels carry the note, whose English says the late reader repeats "all of it", against its
// Hebrew, so the note is dropped.
function sefardBedtimeShema() {
  const base = { ...SEFARD, path: 'Bedtime Shema' };
  const maariv = { ...SEFARD, path: 'Weekday Maariv > The Shema' };
  return [
    { ...base, title: T.ribbonoShelOlam, to: 0, edits: [forgives(0)] },
    { ...base, title: T.hamapil, from: 1, to: 1 },
    { ...base, title: T.shema, from: 3, to: 7 },
    {
      ...maariv,
      title: T.shema,
      from: 14,
      to: 17,
      drop: [16],
      groups: [[15, 17]],
      enEdits: [{ seg: 17, from: '—is true—', to: 'is true' }],
      optionalParts: [
        { from: 14, to: 14, label: WHEN_SAID.bedtimeVehaya },
        { from: 15, to: 17, label: SOME_SAY.bedtimeVayomer },
      ],
    },
    { ...base, title: T.bedtimePsalms, from: 8, to: 10 },
    { ...base, title: T.hashkivenu, from: 11, to: 11 },
    { ...base, title: T.baruchHashemBayom, from: 12, to: 13 },
    { ...base, title: T.protectionVerses, from: 14, to: 22 },
    { ...base, title: T.shirHamaalotRigzu, from: 23, to: 25 },
    { ...base, title: T.adonOlam, from: 26, to: 35, groups: [[26, 35]] },
  ];
}

// The Edot HaMizrach English lines up by index only at #2, #4, #6, #8-16 and #29; the rest is built without it.
function edotBedtimeShema() {
  const base = { ...EDOT, path: 'Bedtime Shema' };
  const hebrewOnly = { he: 'edotHe', path: 'Bedtime Shema' };
  return [
    {
      ...base,
      title: T.leshemYichud,
      from: 1,
      to: 2,
      reviewed: [2],
      edits: [
        womenSay(2, 'מְקַבֵּל', 'מְקַבֶּלֶת'),
        womenSay(2, 'יָרֵא', 'יְרֵאָה'),
        womenSay(2, 'מַמְלִיכוֹ', 'מַמְלִיכָתוֹ'),
      ],
      enEdits: [
        {
          seg: 2,
          from: ' to lift the Divine Presence from the dust &amp; to raise the Divine Presence – our Force.',
          to: '.',
        },
      ],
    },
    {
      ...base,
      title: T.ribbonoShelOlam,
      from: 4,
      to: 4,
      edits: [womenSay(4, 'מוֹחֵל וְסוֹלֵֽחַ', 'מוֹחֶלֶת וְסוֹלַחַת')],
    },
    { ...hebrewOnly, title: T.hamapil, from: 5, to: 5 },
    { ...base, title: T.hamapil, from: 6, to: 6, reviewed: [6] },
    { ...hebrewOnly, title: T.shema, from: 7, to: 7 },
    { ...base, title: T.shema, from: 8, to: 13 },
    { ...base, title: T.protectionVerses, from: 14, to: 16 },
    { ...hebrewOnly, title: T.protectionVerses, from: 17, to: 17 },
    {
      ...hebrewOnly,
      title: T.bedtimeVidui,
      from: 18,
      to: 19,
      at: { 18: TACHANUN_SHACHARIT, 19: TACHANUN_SHACHARIT },
      edits: [
        {
          seg: 18,
          from: ', ואין לאומרו בליל שבת ובשאר ימים שאין אומרים בהם תחנון. וכן אין לאומרו במוצ"ש עד חצות הלילה, וכן במוצאי יו"ט ור"ח, וכיוצא בזה.',
          to: '.<if any="motzaei,roshChodeshYesterday"> אין לאומרו במוצ"ש עד חצות הלילה, וכן במוצאי יו"ט ור"ח, וכיוצא בזה.</if>',
        },
      ],
      insert: [{ at: 18, ...NOTES.tachanunDisputedBedtime }],
    },
    { ...hebrewOnly, title: T.anaBekoach, from: 20, to: 28, reviewed: [27] },
    { ...base, title: T.atahTakum, from: 29, to: 29 },
  ];
}

// Chabad omits Ribbono Shel Olam and Psalm 51 on Shabbat, Yom Tov and Yom Kippur, and ends Hashkivenu at "sukat shlomecha"
// (Sefer HaMinhagim). It omits the confession on every night after which Tachanun is not said, and waits with it until
// midnight on motzaei Shabbat (Machon Halacha Chabad). Its unvocalized passages write the Name abbreviated with a
// gershayim, as the source already does in the prayer on rising at midnight.
function chabadBedtimeShema() {
  const base = { he: 'chabadHe', path: 'Bedtime Shema' };
  return [
    { ...base, title: T.ribbonoShelOlam, to: 0, when: BEDTIME_NOT_HOLY_NIGHT, edits: [forgives(0)] },
    {
      ...base,
      title: T.hashkivenu,
      from: 1,
      to: 1,
      edits: [
        {
          seg: 1,
          from: 'סֻכַּת שְׁלוֹמֶֽךָ. וְהָגֵן',
          to: 'סֻכַּת שְׁלוֹמֶֽךָ.<if none="shabbat,yomTov,yomKippur"> וְהָגֵן',
        },
        { seg: 1, from: 'וּמַצִּילֵֽנוּ אָֽתָּה.', to: 'וּמַצִּילֵֽנוּ אָֽתָּה.</if>' },
      ],
    },
    { ...base, title: T.shema, from: 2, to: 6 },
    { ...base, title: T.protectionVerses, from: 7, to: 8 },
    {
      ...base,
      title: T.bedtimeVidui,
      from: 9,
      to: 13,
      when: TACHANUN_SHACHARIT,
      insert: [{ at: 9, ...NOTES.viduiMotzaeiShabbat }],
    },
    {
      ...base,
      title: T.fourDeaths,
      from: 14,
      to: 17,
      edits: [
        { seg: 14, from: 'מלפניך יהוה אלהינו', to: 'מלפניך יהו״ה אלהינו' },
        { seg: 14, from: '(יהוה)', to: '(יהו״ה)' },
        { seg: 15, from: '(יהוה)', to: '(יהו״ה)' },
        { seg: 16, from: '(יהוה)', to: '(יהו״ה)' },
        { seg: 17, from: '(יהוה)', to: '(יהו״ה)' },
        womenSay(14, 'מקבל', 'מקבלת'),
        womenSay(15, 'מקבל', 'מקבלת'),
        womenSay(16, 'מקבל', 'מקבלת'),
        womenSay(17, 'מקבל', 'מקבלת'),
      ],
    },
    { ...base, title: T.anaBekoach, from: 18, to: 18 },
    {
      ...base,
      title: T.psalm51,
      from: 19,
      to: 19,
      when: BEDTIME_NOT_HOLY_NIGHT,
      edits: [{ seg: 19, from: 'הרבה [הֶרֶב]', to: 'הֶרֶב' }],
    },
    { ...base, title: T.shirLamaalot, from: 20, to: 20, edits: [{ seg: 20, from: 'יְהוָה', to: 'יְיָ' }] },
    { ...base, title: T.versesBeforeSleep, from: 21, to: 21 },
    {
      ...base,
      title: T.ribonHaolamim,
      from: 22,
      to: 22,
      edits: [{ seg: 22, from: '(יהוה אלהי)', to: '(יהו״ה אלהי)', count: 2 }],
    },
    { ...base, title: T.beforeRelations, optional: WHEN_SAID.maritalRelations, from: 23, to: 24 },
    { ...base, title: T.hamapil, from: 25, to: 25 },
  ];
}

function hebrewMarks(...codes) {
  return String.fromCharCode(...codes);
}

// Daat prints the blessings of seeing and hearing twice: a plain list (6, 8, 10, 14, 16, 18) and a later block for the
// rainbow, lightning and thunder (20-32), whose lightning and thunder blessings drop the divine name and whose rainbow
// drops the vav. The plain list is the text, and the block lends only its instructions.
function ashkenazBirchotHareiya() {
  const sights = { ...DAAT, path: 'Berachot > Birkat Hanehenin > Blessings on Sights Sounds and Smells' };
  const sinDotWrittenAsHolam = hebrewMarks(0x5e9, 0x5b9, 0x5d4);
  const sinWithTsere = hebrewMarks(0x5e9, 0x5b5, 0x5c2, 0x5d4);
  const sinWithQamats = hebrewMarks(0x5e9, 0x5b8, 0x5c2, 0x5d4);
  const instruction = (text) => ({ from: text, to: `<small>${text}</small>` });
  return [
    { ...sights, title: T.lightningThunder, from: 26, to: 26, edits: [{ seg: 26, ...instruction('על הברקים מברך:') }] },
    {
      ...sights,
      title: T.lightningThunder,
      from: 6,
      to: 6,
      edits: [{ seg: 6, from: sinDotWrittenAsHolam, to: sinWithTsere, count: 2 }],
    },
    { ...sights, title: T.lightningThunder, from: 30, to: 30, edits: [{ seg: 30, ...instruction('על הרעמים מברך:') }] },
    {
      ...sights,
      title: T.lightningThunder,
      from: 14,
      to: 14,
      edits: [
        {
          seg: 14,
          from: hebrewMarks(0x5e9, 0x5c1, 0x5db, 0x5b9, 0x5bc),
          to: hebrewMarks(0x5e9, 0x5b6, 0x5c1, 0x5db, 0x5b9, 0x5bc),
        },
      ],
    },
    {
      ...sights,
      title: T.rainbow,
      from: 20,
      to: 20,
      edits: [
        {
          seg: 20,
          from: 'ברכת הקשת: הרואה קשת צריך לברך ברכה זו, ואסור להסתכל בו:',
          to: '<small>הרואה קשת צריך לברך ברכה זו, ואסור להסתכל בו:</small>',
        },
      ],
    },
    {
      ...sights,
      title: T.rainbow,
      from: 10,
      to: 10,
      edits: [
        {
          seg: 10,
          from: hebrewMarks(0x5d1, 0x5b0, 0x5bc, 0x5e8, 0x5b4, 0x5d9, 0x5ea, 0x5d5, 0x5b9),
          to: hebrewMarks(0x5d1, 0x5b4, 0x5bc, 0x5d1, 0x5b0, 0x5e8, 0x5b4, 0x5d9, 0x5ea, 0x5d5, 0x5b9),
        },
        {
          seg: 10,
          from: hebrewMarks(0x5d1, 0x5b7, 0x5bc, 0x5de, 0x5b7),
          to: hebrewMarks(0x5d1, 0x5b0, 0x5bc, 0x5de, 0x5b7),
        },
      ],
    },
    {
      ...sights,
      title: T.sea,
      from: 8,
      to: 8,
      edits: [
        { seg: 8, from: sinDotWrittenAsHolam, to: sinWithQamats },
        {
          seg: 8,
          from: hebrewMarks(0x5d4, 0x5b8, 0x5d9, 0x5b7, 0x5bc, 0x5dd),
          to: hebrewMarks(0x5d4, 0x5b7, 0x5d9, 0x5b8, 0x5bc, 0x5dd),
        },
      ],
    },
    {
      ...DAAT,
      title: T.trees,
      path: 'Berachot > Birkhot Hamitzvot',
      from: 30,
      to: 34,
      reviewed: [30],
      edits: [
        {
          seg: 30,
          from: 'סדר ברכת האילנות: הרואה בימי ניסן עצי פרי פורחים אומר:',
          to: '<small>הרואה בימי ניסן עצי פרי פורחים אומר:</small>',
        },
        { seg: 32, from: hebrewMarks(0x5d0, 0x5b1, 0x2d), to: hebrewMarks(0x5d0, 0x5b1) },
        { seg: 32, from: sinDotWrittenAsHolam, to: sinWithTsere, count: 2 },
        { seg: 32, from: '"', to: '', count: 2 },
        { seg: 32, from: ' <em><small>שם צ, יז</small></em>', to: '' },
      ],
    },
    {
      ...sights,
      title: T.praise,
      from: 16,
      to: 18,
      insert: [
        { at: 16, he: '<small>על שמועות שהם טובות לו ולאחרים מברך:</small>' },
        { at: 18, he: '<small>על שמועות רעות מברך:</small>' },
      ],
    },
    {
      ...DAAT,
      title: T.praise,
      path: 'Berachot > Asher Yatzar Etchem Badin',
      edits: [{ seg: 0, from: "ברוך אתה ד',", to: 'ברוך אתה יי,' }],
      insert: [{ at: 0, he: '<small>מי שלא ראה קברי ישראל שלשים יום יברך בראייתם:</small>' }],
    },
  ];
}

// Torat Emet carries the Hebrew of every Sefard blessing here. Where the Metsudah Shabbat siddur says the very same words,
// it supplies the blessing with its English, and Torat Emet the instruction above it.
function sefardBirchotHareiya() {
  const lightning = { ...TORAT_EMET, path: 'Blessings > Lightning & Thunder' };
  const phenomena = {
    he: 'metsudahShabbatHe',
    en: 'metsudahShabbatEn',
    linear: true,
    path: 'Berachos Said Upon Witnessing Phenomenal Sights',
  };
  return [
    { ...lightning, title: T.lightningThunder, from: 1, to: 1 },
    { ...phenomena, title: T.lightningThunder, from: 1, to: 3, groups: [[1, 3]] },
    { ...lightning, title: T.lightningThunder, from: 3, to: 3 },
    {
      ...phenomena,
      title: T.lightningThunder,
      from: 5,
      to: 8,
      groups: [[5, 8]],
      enEdits: [{ seg: 8, from: 'fill the verse.', to: 'fill the universe.' }],
    },
    { ...TORAT_EMET, title: T.rainbow, path: 'Blessings > Seeing Rainbow', from: 1, to: 2 },
    { ...TORAT_EMET, title: T.sea, path: 'Blessings > Seeing Ocean', from: 1, to: 2 },
    { ...TORAT_EMET, title: T.trees, path: 'Blessings > Blossoming Fruit Tree', from: 1, to: 2, reviewed: [1] },
    {
      ...phenomena,
      title: T.praise,
      from: 16,
      to: 18,
      groups: [[16, 18]],
      insert: [
        {
          at: 16,
          he: '<small>הרואה ימים גדולים או הרים גבוהים המפורסמים בגובהם מברך:</small>',
          en: 'When seeing great seas, or tall mountains which are famous for their great height, say:',
        },
      ],
    },
    {
      ...TORAT_EMET,
      title: T.praise,
      path: 'Blessings > Various Blessings of Praise',
      from: 1,
      to: 25,
      reviewed: [14],
      edits: [
        {
          seg: 18,
          from: hebrewMarks(0x5de, 0x5b0, 0x5d7, 0x5b7, 0x5d9, 0x5b6, 0x5d4),
          to: hebrewMarks(0x5de, 0x5b0, 0x5d7, 0x5b7, 0x5d9, 0x5b5, 0x5bc, 0x5d4),
        },
      ],
    },
    metsudahGoodNews(),
    metsudahBadNews(),
  ];
}

// Hatov Vehametiv and Dayan Ha'emet read the same in Daat, Chabad and the Metsudah siddur. Their instructions are the
// Chabad wording, with the Metsudah English of the same two instructions. Edot HaMizrach prints Dayan Ha'emet itself and
// borrows only Hatov Vehametiv.
function metsudahNewsSource() {
  return {
    he: 'metsudahShabbatHe',
    en: 'metsudahShabbatEn',
    linear: true,
    path: 'Various Other Berachos',
    title: T.praise,
  };
}

function metsudahGoodNews() {
  return {
    ...metsudahNewsSource(),
    from: 1,
    to: 3,
    groups: [[1, 3]],
    edits: [
      {
        seg: 1,
        from: hebrewMarks(0x5d9, 0x5b0, 0x5d4, 0x5d5, 0x5b8, 0x5d4),
        to: hebrewMarks(0x5d9, 0x5b0, 0x5d4, 0x5b9, 0x5d5, 0x5b8, 0x5d4),
      },
    ],
    insert: [
      {
        at: 1,
        he: '<small>על שמועות שהם טובות לו ולאחרים מברך:</small>',
        en: 'Upon hearing good news that concerns both yourself and others, say:',
      },
    ],
  };
}

function metsudahBadNews() {
  return {
    ...metsudahNewsSource(),
    from: 5,
    to: 7,
    groups: [[5, 7]],
    enEdits: [{ seg: 6, from: 'King of the verse,', to: 'King of the Universe,' }],
    insert: [{ at: 5, he: '<small>על שמועות רעות מברך:</small>', en: 'Upon hearing tragic news, say:' }],
  };
}

function edotBirchotHareiya() {
  const lightning = { ...EDOT, path: 'Assorted Blessings and Prayers > Blessings on Lighting and Thunder' };
  return [
    { ...lightning, title: T.lightningThunder, from: 1, to: 4 },
    { ...EDOT, title: T.rainbow, path: 'Assorted Blessings and Prayers > Rainbow', from: 1, to: 2 },
    {
      ...EDOT,
      title: T.trees,
      path: 'Nissan > Blessing of the Trees',
      from: 0,
      to: 14,
      drop: [1],
      reviewed: [0, 5, 6, 10, 11, 12],
      edits: [
        { seg: 0, from: '<big><b>חודש ניסן </b></big>', to: '<small>הרואה בימי ניסן עצי פרי פורחים אומר:</small>' },
        { seg: 3, from: '[שְׁבִיתֵ֑נוּ] שבותנו', to: 'שְׁבִיתֵ֑נוּ' },
        { seg: 3, from: hebrewMarks(0x5bc, 0x5a5, 0x5d4, 0x5d0), to: hebrewMarks(0x5bc, 0x5a5, 0x5d4, 0x20, 0x5d0) },
        {
          seg: 5,
          from: hebrewMarks(0x5d1, 0x5bc, 0x5db, 0x5b8, 0x5dc),
          to: hebrewMarks(0x5d1, 0x5b0, 0x5bc, 0x5db, 0x5b8, 0x5dc),
        },
        {
          seg: 5,
          from: hebrewMarks(0x5d8, 0x5d5, 0x5bc, 0x5d1, 0x5da, 0x5b8),
          to: hebrewMarks(0x5d8, 0x5d5, 0x5bc, 0x5d1, 0x5b0, 0x5da, 0x5b8),
        },
        {
          seg: 5,
          from: hebrewMarks(0x5e1, 0x5b0, 0x5d3, 0x5bc, 0x5da),
          to: hebrewMarks(0x5e1, 0x5b0, 0x5d3, 0x5b0, 0x5bc, 0x5da),
        },
        { seg: 6, from: hebrewMarks(0x5d9, 0x5e7, 0x5bb, 0x5d9), to: hebrewMarks(0x5d9, 0x5b0, 0x5e7, 0x5bb, 0x5d9) },
        { seg: 10, from: 'והיו ', to: '' },
        {
          seg: 10,
          from: hebrewMarks(0x5be, 0x5d9, 0x5d3, 0x5b5, 0x5d9),
          to: hebrewMarks(0x5be, 0x5d9, 0x5b0, 0x5d3, 0x5b5, 0x5d9),
        },
        {
          seg: 11,
          from: hebrewMarks(0x5db, 0x5bc, 0x5d1, 0x5b7, 0x5ea),
          to: hebrewMarks(0x5db, 0x5b0, 0x5bc, 0x5d1, 0x5b7, 0x5ea),
        },
      ],
    },
    metsudahGoodNews(),
    {
      ...EDOT,
      title: T.praise,
      path: 'Fast Days and Mourning > Mourning',
      from: 2,
      to: 2,
      insert: [{ at: 2, he: '<small>על שמועות רעות מברך:</small>' }],
    },
  ];
}

function chabadBirchotHareiya() {
  const base = { ...CHABAD, path: 'Blessings > Various Blessings' };
  return [
    { ...base, title: T.lightningThunder, from: 18, to: 21 },
    { ...base, title: T.rainbow, from: 22, to: 23 },
    { ...base, title: T.trees, from: 34, to: 35, reviewed: [34] },
    { ...base, title: T.praise, from: 24, to: 27 },
  ];
}

function levanaNotes(at, { timing = true } = {}) {
  return [...(timing ? [NOTES.levanaTiming] : []), NOTES.levanaTishrei, NOTES.levanaAv].map((note) => ({
    at,
    ...note,
  }));
}

function ashkenazKiddushLevana() {
  const levana = { ...ASHKENAZ, path: 'Weekday > Maariv > Birkat HaLevana' };
  const maariv = { ...ASHKENAZ, transform: ASHKENAZ_VARIANTS };
  return [
    {
      he: levana.he,
      path: levana.path,
      title: T.levanaOpening,
      to: 0,
      edits: [{ seg: 0, from: ' (אגור)', to: '' }],
      insert: levanaNotes(0),
    },
    { ...levana, title: T.levanaOpening, from: 1, to: 1 },
    { ...levana, title: T.leshemYichud, from: 2, to: 2 },
    { ...levana, title: T.levanaBlessing, from: 3, to: 11 },
    {
      ...levana,
      title: T.levanaPsalms,
      from: 12,
      to: 16,
      enEdits: [
        {
          seg: 14,
          from: 'Let every soul praise God. Praise God. Let every soul praise God. Praise God.',
          to: 'Let every soul praise God. Praise God.',
        },
        { seg: 14, from: 'instuments', to: 'instruments' },
      ],
    },
    { ...maariv, title: T.aleinu, path: 'Weekday > Maariv > Alenu' },
    {
      ...maariv,
      title: T.mournersKaddish,
      path: "Weekday > Maariv > Mourner's Kaddish",
      enEdits: [
        { seg: 0, from: '<i>Levush, Siddur HaGra</i>', to: 'Levush, Siddur HaGra' },
        { seg: 0, from: 'Yis<i>k</i>adal', to: 'Yiskadal' },
        { seg: 0, from: '<i>Mishnah Berurah 56:2</i>', to: 'Mishnah Berurah 56:2' },
        { seg: 4, from: '<i>Mishnah Berurah </i>', to: 'Mishnah Berurah ' },
      ],
      minyan: SAID_BY.mourners,
    },
  ];
}

function sefardKiddushLevana() {
  const levana = { ...TORAT_EMET, path: 'Kiddush Levanah' };
  return [
    { ...levana, title: T.levanaOpening, from: 1, to: 2, insert: levanaNotes(1, { timing: false }) },
    {
      ...levana,
      title: T.leshemYichud,
      from: 3,
      to: 3,
      edits: [{ seg: 3, from: 'הַמִצְוָה', to: 'הַמִּצְוָה' }],
      reviewed: [3],
    },
    {
      ...levana,
      title: T.levanaBlessing,
      from: 4,
      to: 14,
      edits: [
        { seg: 5, from: 'שֶׁלּא', to: 'שֶׁלֹּא' },
        { seg: 5, from: 'מַלְכוּתו', to: 'מַלְכוּתוֹ' },
        { seg: 6, from: 'יוצְרֵךְ', to: 'יוֹצְרֵךְ' },
      ],
    },
    {
      ...levana,
      title: T.levanaPsalms,
      from: 15,
      to: 19,
      edits: [
        { seg: 15, from: 'דּודִי', to: 'דּוֹדִי' },
        { seg: 18, from: 'שֶׁבַּשָׁמַיִם', to: 'שֶׁבַּשָּׁמַיִם' },
        { seg: 18, from: 'דַּיָם', to: 'דַּיָּם' },
        { seg: 18, from: 'אַבַּיֵי', to: 'אַבַּיֵּי' },
        { seg: 18, from: 'עולָה', to: 'עוֹלָה' },
        { seg: 18, from: 'כְּמו שֶׁהָיְתָה', to: 'כְּמוֹ שֶׁהָיְתָה' },
        { seg: 18, from: 'הַמְּארוֹת', to: 'הַמְּאֹרוֹת' },
      ],
    },
    { ...levana, title: T.aleinu, from: 20, to: 21 },
    {
      ...levana,
      title: T.mournersKaddish,
      from: 23,
      to: 24,
      edits: [
        {
          seg: 23,
          from: 'לְעֵלָּא <small>(בעשי"ת וּלְעֵלָּא מִכָּל)</small> מִן כָּל',
          to: `לְעֵלָּא <if none="${AYT}">מִן כָּל</if><if all="${AYT}">וּלְעֵלָּא מִכָּל</if>`,
        },
        {
          seg: 24,
          from: 'שָׁלוֹם <small> <small>(בעשי"ת <b>הַשָּׁלוֹם</b>)</small> </small>',
          to: `<if none="${AYT}">שָׁלוֹם</if><if all="${AYT}">הַשָּׁלוֹם</if>`,
        },
      ],
      minyan: SAID_BY.mourners,
    },
  ];
}

function edotKiddushLevana() {
  const levana = { ...EDOT, path: 'Blessing of the Moon' };
  const withoutEnglish = { ...levana, en: undefined };
  return [
    { ...withoutEnglish, title: T.levanaOpening, from: 1, to: 1, insert: levanaNotes(1) },
    {
      ...levana,
      title: T.levanaOpening,
      from: 2,
      to: 5,
      enEdits: [
        { seg: 2, from: ' My heart is before You, O Lord, my Rock and my Redeemer.', to: '' },
        { seg: 4, from: ' (Baalach Shab 2:2, Leviticus 23)', to: '' },
      ],
    },
    { ...levana, title: T.leshemYichud, from: 6, to: 7, reviewed: [7] },
    { ...levana, title: T.levanaBlessing, from: 8, to: 11, enEdits: [{ seg: 9, from: 'Yisrael....', to: 'Yisrael.' }] },
    { ...withoutEnglish, title: T.levanaBlessing, from: 12, to: 13 },
    { ...levana, title: T.levanaBlessing, from: 14, to: 15 },
    { ...levana, title: T.levanaPsalms, from: 16, to: 18 },
    { ...levana, title: T.kaddishDerabbanan, from: 20, to: 22, minyan: SAID_BY.mourners },
    {
      ...levana,
      title: T.levanaEnding,
      from: 24,
      to: 25,
      edits: [
        { seg: 24, from: 'ששי ', to: '' },
        { seg: 24, from: 'אכלתי ', to: '' },
        { seg: 24, from: '[', to: '', count: 2 },
        { seg: 24, from: ']', to: '', count: 2 },
      ],
      reviewed: [24],
      optionalParts: [{ from: 24, label: SOME_SAY.afterKaddishLevana }],
    },
  ];
}

function chabadKiddushLevana() {
  const levana = { ...CHABAD, path: 'Kiddush Levanah' };
  const psalm150Body =
    '<b>הַלְלוּיָהּ</b> הַֽלְלוּ־אֵל בְּקָדְשׁוֹ הַלְלֽוּהוּ בִּרְקִֽיעַ עֻזּוֹ: הַלְלֽוּהוּ בִּגְבוּרֹתָיו הַלְלֽוּהוּ כְּרֹב גֻּדְלוֹ: הַלְלֽוּהוּ בְּתֵֽקַע שׁוֹפָר הַלְלֽוּהוּ בְּנֵֽבֶל וְכִנּוֹר: הַלְלֽוּהוּ בְּתֹף וּמָחוֹל הַלְלֽוּהוּ בְּמִנִּים וְעֻגָב: הַלְלֽוּהוּ בְצִלְצְלֵי־שָֽׁמַע הַלְלֽוּהוּ בְּצִלְצְלֵי תְרוּעָה: ';
  const psalm150Closing = 'כֹּל הַנְּשָׁמָה תְּהַלֵּל יָהּ הַלְלוּיָהּ: כֹּל הַנְּשָׁמָה תְּהַלֵּל יָהּ הַלְלוּיָהּ: ';
  return [
    { ...levana, title: T.levanaOpening, from: 0, to: 1, insert: levanaNotes(0, { timing: false }) },
    { ...levana, title: T.levanaBlessing, from: 2, to: 9 },
    { ...levana, title: T.levanaPsalms, from: 10, to: 11 },
    { ...levana, title: T.levanaPsalms, from: 12, to: 12, edits: [{ seg: 12, from: psalm150Closing, to: '' }] },
    { ...levana, title: T.levanaPsalms, from: 12, to: 12, edits: [{ seg: 12, from: psalm150Body, to: '' }] },
    { ...levana, title: T.levanaPsalms, from: 13, to: 14 },
    { ...levana, title: T.aleinu, from: 15, to: 16 },
    {
      ...levana,
      title: T.mournersKaddish,
      from: 18,
      to: 20,
      edits: [
        {
          seg: 20,
          from: 'שָׁלֽוֹם בִּמְרוֹמָֽיו',
          to: `<if none="${AYT}">שָׁלֽוֹם</if><if all="${AYT}">הַשָּׁלֽוֹם</if> בִּמְרוֹמָֽיו`,
        },
      ],
      minyan: SAID_BY.mourners,
    },
    { ...levana, title: T.alTira, from: 21, to: 22 },
  ];
}

function sefardName(html) {
  return html.replace(/\u05D9\u05B0\u05D4\u05D5\u05B8\u05B9\u05D4/g, '\u05D9\u05B0\u05D4\u05B9\u05D5\u05B8\u05D4');
}

// The qere replaces the unpointed ketiv before it. A qere may span two bracketed words ("חלכאים [חֵיל]
// [כָּאִים׃]"), and a ketiv joined by a maqaf keeps the qere joined to the next word.
function tanachReading(html) {
  return html
    .replace(/(^|\s|־)[א-ת]+־? ?((?:\[[^\]]+\] ?)+)/g, (_, lead, qere) => {
      const words = [...qere.matchAll(/\[([^\]]+)\]/g)].map(([, word]) => word.trim()).join(' ');
      return lead + words + (qere.endsWith(' ') && !words.endsWith('־') ? ' ' : '');
    })
    .replace(/‍/g, '')
    .replace(/(יְ?)ה(וָה)/g, '$1הֹ$2');
}

function psalmVerses(title, chapter, range) {
  return { he: 'tanachNikkudHe', title, path: String(chapter - 1), ...range, transform: tanachReading };
}

function tikkunHaklali() {
  const wikisource = { he: 'wikiTikkunHaklali', transform: ashkenazName };
  const opening = { ...wikisource, title: T.tikkunBefore, path: '# יהי רצון קודם אמירת תהלים .. # עשרת המזמורים' };
  return [
    { ...opening, to: 1, drop: [0], at: { 1: NOT_SHABBAT_YOM_TOV } },
    psalmVerses(T.tikkunBefore, 95, { from: 0, to: 2 }),
    {
      ...opening,
      from: 2,
      edits: [
        womenSay(3, 'מְזַמֵּן', 'מְזַמֶּנֶת'),
        womenSay(5, 'מְקַשֵׁר', 'מְקַשֶּׁרֶת'),
        womenSay(6, 'אני אומר', 'אני אומרת'),
      ],
    },
    ...TIKKUN_PSALMS.map(([number, numeral]) => psalmVerses({ he: `מזמור ${numeral}`, en: `Psalm ${number}` }, number)),
    psalmVerses(T.tikkunAfter, 14, { from: 6, to: 6 }),
    psalmVerses(T.tikkunAfter, 37, { from: 38, to: 39 }),
    { ...wikisource, title: T.tikkunAfter, path: '# תפילה שנהגו לומר לאחר אמירת התיקון .. # ראו גם' },
  ];
}

function tehillimPsalm(number) {
  const title = { he: `פרק ${gematriya(number).replace(/[׳״]/g, '')}`, en: `Psalm ${number}` };
  if (number === 119) {
    return PSALM_119_STANZAS.map(([letter, name], index) =>
      psalmVerses({ he: `${title.he} · ${letter}`, en: `${title.en} · ${name}` }, number, {
        from: index * 8,
        to: index * 8 + 7,
      }),
    );
  }
  const book = TEHILLIM_BOOKS.find(([first]) => first === number)?.[2];
  const day = TEHILLIM_WEEK.find(([first]) => first === number)?.[1];
  const headings = [...(book ? [{ ...book, level: 1 }] : []), ...(day ? [{ ...day, level: 2 }] : [])];
  return [
    { ...psalmVerses(title, number), ...(headings.length ? { headings } : {}), ...(day ? { chapter: day } : {}) },
  ];
}

function tehillimBookPrayer(book) {
  const name = TEHILLIM_BOOKS[book][2];
  return {
    he: 'wikiAfterPsalms',
    title: { he: `יהי רצון לאחר ${name.he}`, en: `After the ${name.en}` },
    optional: { he: `המסיים ${name.he} אומר`, en: `Said on finishing the ${name.en}` },
    path: 'יהר"מ | שתכפר',
    transform: ashkenazName,
    edits: [
      { seg: 0, from: BOOK_ORDINALS.join(' • '), to: BOOK_ORDINALS[book] },
      { seg: 2, from: BOOK_CHUMASHIM.join(' • '), to: BOOK_CHUMASHIM[book] },
    ],
    groups: [[0, 3]],
  };
}

function tehillim() {
  const psalms = Array.from({ length: 150 }, (_, index) => index + 1).flatMap((number) => {
    const book = TEHILLIM_BOOKS.findIndex(([, last]) => last === number);
    return book === -1 ? tehillimPsalm(number) : [...tehillimPsalm(number), tehillimBookPrayer(book)];
  });
  return [
    {
      he: 'wikiBeforePsalms',
      title: T.tehillimBefore,
      chapter: T.tehillimBefore,
      path: '*',
      transform: ashkenazName,
      drop: [0],
      at: { 1: NOT_SHABBAT_YOM_TOV },
    },
    psalmVerses(T.tehillimBefore, 95, { from: 0, to: 2 }),
    ...psalms,
    {
      he: 'wikiAfterPsalms',
      title: T.tehillimAfter,
      chapter: T.tehillimAfter,
      path: 'מי יתן | מזמורי | שתכפר',
      transform: ashkenazName,
      groups: [[1, 2]],
    },
  ];
}

function ashkenazShevaBerachot() {
  return [
    {
      he: 'metsudahShabbatHe',
      en: 'metsudahShabbatEn',
      title: T.shevaBerachot,
      path: 'Birchas Hamazon > The Seven Marriage Blessings',
      groups: [
        [0, 2],
        [3, 5],
        [6, 13],
        [14, 18],
        [19, 24],
        [25, 41],
        [42, 44],
      ],
      minyanParts: [{ from: 0, to: 41, label: SAID_BY.withMinyan }],
      edits: [{ seg: 9, ...METSUDAH_BETZELEM_DAGESH }],
      insert: [
        {
          at: 0,
          he: '<small>אחר ברכת המזון מברכים שבע ברכות על כוס שני:</small>',
          en: 'After Birkat HaMazon, the Seven Berachot are said over a second cup of wine:',
        },
        { at: 42, he: '<small>המזמן מברך:</small>', en: 'The leader blesses:' },
      ],
      enEdits: [1, 4].map((seg) => ({ seg, from: 'King of the verse', to: 'King of the Universe' })),
    },
  ];
}

function sefardShevaBerachot() {
  const base = { ...SEFARD, title: T.shevaBerachot, path: 'Various Blessings > Sheva Berachot', transform: sefardName };
  return [
    {
      ...base,
      from: 2,
      to: 7,
      minyan: SAID_BY.withMinyan,
      edits: [{ seg: 4, ...METSUDAH_BETZELEM_DAGESH }],
      insert: [
        {
          at: 2,
          he: '<small>בשבע ברכות שלאחר ברכת המזון מתחילים כאן, ומסיימים בבורא פרי הגפן:</small>',
          en: 'After Birkat HaMazon, the Seven Berachot begin here and end with the blessing over the wine.',
        },
      ],
    },
    { ...base, from: 0, to: 0 },
  ];
}

function edotShevaBerachot() {
  return [
    {
      ...EDOT,
      title: T.shevaBerachot,
      path: 'Assorted Blessings and Prayers > Sheva Berachot',
      from: 1,
      to: 8,
      reviewed: [8],
      minyanParts: [{ from: 3, to: 8, label: SAID_BY.withMinyan }],
    },
  ];
}

function ashkenazChanukahCandles() {
  const lighting = 'Festivals > Chanukah > Service for Lighting Chanukah Candles';
  return [
    {
      ...DAAT,
      title: T.chanukahBlessings,
      path: `${lighting} > Blessings on Chanukah Candles`,
      groups: [
        [1, 2],
        [3, 4],
        [7, 8],
      ],
      edits: [
        { seg: 0, from: 'לפני ההדלקה מברכים:', to: '<small>לפני ההדלקה מברכים:</small>' },
        { seg: 6, from: 'בלילה הראשון מוסיפים:', to: '<small>בלילה הראשון מוסיפים:</small>' },
      ],
      at: each(6, 8, CHANUKAH_FIRST_NIGHT),
    },
    { ...DAAT, title: T.hanerotHallalu, path: `${lighting} > Hanerot Hallalu` },
    {
      ...DAAT,
      title: T.maozTzur,
      path: `${lighting} > Maoz Tzur`,
      groups: [
        [0, 3],
        [5, 8],
        [10, 13],
        [15, 18],
        [20, 23],
        [25, 28],
      ],
    },
  ];
}

function sefardChanukahCandles() {
  const lighting = { ...TORAT_EMET, path: 'Chanukah > Menorah Lighting' };
  const firstNightShehecheyanu = ' ובערב הראשון מוסיפים ברכת שהחיינו';
  const lightingTheRest = ' כשמדליק השאר';
  const withoutWholeLineBold = (html) => html.replace(/<b><b>|<\/b><\/b>/g, '');
  return [
    { ...lighting, title: T.chanukahPlacement, from: 2, to: 2, reviewed: [2] },
    {
      ...lighting,
      title: T.leshemYichud,
      from: 3,
      to: 4,
      edits: [
        { seg: 4, from: 'ובני"ו)</small> </small>.', to: 'ובני"ו)</small></small>.' },
        womenSay(4, 'מְכַוֵּן', 'מְכַוֶּנֶת'),
        womenSay(4, 'עוֹשֶׂה', 'עוֹשָׂה'),
      ],
    },
    {
      ...lighting,
      title: T.chanukahBlessings,
      from: 5,
      to: 9,
      edits: [{ seg: 5, from: firstNightShehecheyanu, to: onChanukahFirstNight(firstNightShehecheyanu) }],
      at: each(8, 9, CHANUKAH_FIRST_NIGHT),
    },
    {
      ...lighting,
      title: T.hanerotHallalu,
      from: 10,
      to: 11,
      edits: [{ seg: 10, from: lightingTheRest, to: afterChanukahFirstNight(lightingTheRest) }],
    },
    { ...lighting, title: T.maozTzur, from: 12, to: 19 },
    { ...lighting, title: T.psalm30, from: 20, to: 20 },
    { ...lighting, title: T.psalm111, from: 21, to: 21 },
    { ...lighting, title: T.psalm112, from: 22, to: 22 },
    { ...lighting, title: T.vihiNoamYoshev, from: 23, to: 24 },
    { ...lighting, title: T.psalm67, from: 25, to: 25 },
    { ...lighting, title: T.anaBekoach, from: 26, to: 34, transform: withoutWholeLineBold },
    { ...lighting, title: T.psalm33, from: 35, to: 35 },
    { ...lighting, title: T.psalm133, from: 36, to: 36 },
  ];
}

function edotChanukahCandles() {
  const lighting = { ...EDOT, path: 'Hanukkah > Menorah Lighting', transform: EDOT_VARIANTS };
  return [
    { ...lighting, title: T.leshemYichud, from: 2, to: 2, reviewed: [2] },
    { ...lighting, title: T.chanukahBlessings, from: 3, to: 6, at: each(5, 6, CHANUKAH_FIRST_NIGHT) },
    { ...lighting, title: T.hanerotHallalu, from: 7, to: 8 },
    {
      ...lighting,
      title: T.psalm30,
      from: 9,
      to: 9,
      edits: [
        { seg: 9, from: 'מיורדי [', to: '' },
        { seg: 9, from: ']־', to: '־' },
      ],
    },
    { ...lighting, title: T.vihiNoamYoshev, from: 10, to: 12, reviewed: [10] },
    { ...lighting, title: T.maozTzur, from: 14, to: 20 },
  ];
}

function chabadChanukahCandles() {
  const firstNightShehecheyanu = ' ובלילה ראשונה יברך גם כן שהחיינו';
  const firstNightOrder = ' ויתחיל להדליק בליל ראשון מנר הימין';
  const laterNightsOrder = ' ומליל שני ואילך יברך על הנוסף וילך משמאל לימין';
  return [
    {
      he: 'chabadHe',
      path: 'Chanukah',
      title: T.chanukahBlessings,
      from: 0,
      to: 3,
      reviewed: [0],
      edits: [
        { seg: 0, from: firstNightShehecheyanu, to: onChanukahFirstNight(firstNightShehecheyanu) },
        { seg: 0, from: firstNightOrder, to: onChanukahFirstNight(firstNightOrder) },
        { seg: 0, from: laterNightsOrder, to: afterChanukahFirstNight(laterNightsOrder) },
      ],
      at: { 3: CHANUKAH_FIRST_NIGHT },
    },
    { he: 'chabadHe', path: 'Chanukah', title: T.hanerotHallalu, from: 4, to: 4 },
  ];
}

function onUshpizinNights(...nights) {
  return Object.fromEntries(
    nights.flatMap((segments, n) => segments.map((seg) => [seg, { all: [`ushpizinNight${n + 1}`] }])),
  );
}

function ashkenazUshpizin() {
  const sukkah = 'Festivals > Sukkot > Prayers in the Sukkah';
  const instruction = (seg, text) => ({ seg, from: text, to: `<small>${text}</small>` });
  const days = ['הראשון', 'השני', 'השלישי', 'הרביעי', 'החמישי', 'הששי', 'השביעי'];
  return [
    { ...DAAT, title: T.enteringSukkah, path: `${sukkah} > Entering the Sukkah` },
    {
      ...DAAT,
      title: T.ushpizin,
      path: `${sukkah} > Ushpizin`,
      edits: [
        { seg: 2, from: '<em><small>פב"פ ', to: '<small><small>(פב"פ)</small></small> ' },
        { seg: 2, from: '</small></em>', to: '' },
        instruction(4, 'בלילה ראשון כשנכנס לסוכה קודם שישב לאכול ובכל יום קודם סעודתו יאמר זה:'),
        ...days.map((day, n) => instruction(7 + 2 * n, `ביום ${day} אומר:`)),
      ],
      at: onUshpizinNights(...days.map((_, n) => [7 + 2 * n, 8 + 2 * n])),
    },
  ];
}

function sefardUshpizin() {
  const entering = { ...TORAT_EMET, path: 'Holidays > Prayer Upon Entering Sukkah' };
  return [
    { ...entering, title: T.enteringSukkah, from: 2, to: 2, reviewed: [2] },
    {
      ...entering,
      title: T.ushpizin,
      from: 3,
      to: 20,
      reviewed: [3, 4, 6],
      edits: [
        { seg: 4, from: '(פב"פ <b>', to: '(פב"פ)</small></small> ' },
        { seg: 4, from: '</b>)</small> </small>', to: '' },
      ],
      at: onUshpizinNights([7, 8], [9, 10], [11, 12], [13, 14], [15, 16], [17, 18], [19, 20]),
    },
  ];
}

function edotUshpizin() {
  const order = { ...EDOT, path: 'Prayers for Three Festivals > Mussaf' };
  const qere = (seg, ketiv) => [
    { seg, from: `${ketiv} [`, to: '' },
    { seg, from: ']', to: '' },
  ];
  return [
    {
      ...order,
      title: T.enteringSukkah,
      from: 159,
      to: 184,
      edits: qere(171, 'שירה'),
      at: onUshpizinNights([161], [162], [163], [164], [165], [166], [167]),
    },
    {
      ...order,
      title: T.ushpizin,
      from: 185,
      to: 193,
      at: onUshpizinNights([186], [187], [188], [189], [190], [191], [192]),
    },
    {
      ...order,
      title: T.sittingInSukkah,
      from: 194,
      to: 206,
      edits: qere(206, 'מגדיל'),
      at: onUshpizinNights([195], [196], [197], [198, 199, 200], [201], [202, 203, 204], [205, 206]),
    },
    {
      ...order,
      title: T.sukkahDayVerses,
      from: 208,
      to: 214,
      optional: SOME_SAY.sukkahDayVerses,
      edits: qere(210, 'תרים'),
      at: onUshpizinNights([208], [209], [210], [211], [212], [213], [214]),
    },
    { ...order, title: T.ushpizinChair, from: 215, to: 216 },
  ];
}

// Selichot Edot HaMizrach is one text for every day of the season: its Ten Days passages are
// conditioned, the passages only some say fold, and each source note a label replaces is dropped.
function edotSelichot() {
  const base = { he: 'selichotEdotHe', en: 'selichotEdotEn', path: '*' };
  const note = (seg, he, en) => ({
    edits: [{ seg, from: `<small>(${he})</small><br>`, to: '' }],
    enEdits: [{ seg, from: `(${en}) `, to: '' }],
  });
  const merge = (...parts) => ({
    edits: parts.flatMap((part) => part.edits),
    enEdits: parts.flatMap((part) => part.enEdits),
  });
  const vayaavor = (...segs) => segs.map((seg) => ({ from: seg, to: seg, label: SAID_BY.withMinyan }));
  return [
    { ...base, title: T.kamtiBeashmoret, from: 0, to: 0 },
    { ...base, title: T.ashrei, from: 1, to: 1 },
    {
      ...base,
      title: T.halfKaddish,
      from: 2,
      to: 2,
      minyan: SAID_BY.chazzan,
      ...note(2, 'ואומר השליח צבור חצי קדיש', 'And the prayer leader says half-Kaddish:'),
    },
    { ...base, title: T.benAdam, from: 3, to: 3 },
    {
      ...base,
      title: T.lechaHashemTzedaka,
      from: 4,
      to: 59,
      at: { ...each(5, 9, IN_AYT), ...each(35, 39, IN_AYT) },
      optionalParts: [{ from: 5, to: 9, label: SOME_SAY.someAddInAyt }],
      minyanParts: vayaavor(13, 53, 56, 59),
      ...note(5, 'בעשרת ימי תשובה יש מוסיפים', 'Some add this on the Ten Days of Repentance:'),
    },
    { ...base, title: T.selichotVidui, from: 60, to: 70 },
    { ...base, title: T.hashemHuHaelokim, from: 71, to: 85 },
    { ...base, title: T.elokeinuShebashamayim, from: 86, to: 149, at: each(108, 114, IN_AYT) },
    {
      ...base,
      title: T.aneinu,
      from: 150,
      to: 200,
      at: { ...each(155, 161, IN_AYT), ...each(162, 168, IN_AYT), ...each(185, 190, IN_AYT) },
      optionalParts: [
        { from: 155, to: 161, label: SOME_SAY.someAddInAyt },
        { from: 185, to: 190, label: SOME_SAY.someAddInAyt },
        { from: 191, to: 191, label: SOME_SAY.some },
        { from: 195, to: 199, label: SOME_SAY.some },
      ],
      minyanParts: vayaavor(194),
      ...merge(
        note(155, 'בעשרת ימי תשובה יש מוסיפים:', 'On the Ten Days of Repentance, we add:'),
        note(185, 'בעשרת ימי תשובה יש אומרים:', 'On the Ten Days of Repentance, some say:'),
        note(191, 'יש אומרים:', 'Some say:'),
        note(195, 'יש נוהגים לומר:', 'Some are accustomed to say:'),
      ),
    },
    { ...base, title: T.ledavidElecha, from: 201, to: 219 },
    {
      ...base,
      title: T.avinuMalkeinu,
      from: 220,
      to: 225,
      optionalParts: [{ from: 220, to: 220, label: SOME_SAY.someAdd }],
      edits: [{ seg: 220, from: '<small>(יש מוסיפים:)</small><br>', to: '' }],
    },
    {
      ...base,
      title: T.kaddish,
      from: 226,
      to: 226,
      minyan: SAID_BY.chazzan,
      edits: [
        { seg: 226, from: '<small>(ואומר השליח ציבור קדיש:)</small><br>', to: '' },
        {
          seg: 226,
          from: '<small>(בעשרת ימי תשובה: וְיִכְתָּבְכֶם הָאֵל בְּסֵפֶר חַיִּים טוֹבִים)</small>',
          to: `<if all="${AYT}">וְיִכְתָּבְכֶם הָאֵל בְּסֵפֶר חַיִּים טוֹבִים</if>`,
        },
      ],
      enEdits: [{ seg: 226, from: '(And the prayer leader says Kaddish:) ', to: '' }],
    },
    { ...base, title: T.shirHamaalot, from: 227, to: 227 },
    {
      ...base,
      title: T.mournersKaddish,
      from: 228,
      to: 228,
      minyan: SAID_BY.mourners,
      ...note(228, 'ואומרים קדיש יהא שלמא:', "And mourners say the mourner's Kaddish:"),
    },
  ];
}

const HEBREW_ONLY_TEXTS = ['tikkun_haklali', 'tehillim'];

module.exports = {
  SOURCES,
  TEXTS,
  CONDITIONAL_INSTRUCTION,
  ALWAYS_SAID,
  RULES,
  MINYAN_ONLY_TITLES,
  HEBREW_ONLY_TEXTS,
  tanachReading,
};
