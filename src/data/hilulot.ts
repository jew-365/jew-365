import { HDate, HebrewCalendar, months } from '@hebcal/core';

export type Hilula = {
  id: string;
  name: { he: string; en: string };
  aliases?: { he: string[]; en: string[] };
  day: number;
  // A hebcal month. Plain Adar is ADAR_I; a death in a leap year's second Adar is ADAR_II.
  month: number;
  // The Hebrew year of death, when it is recorded.
  year?: number;
};

// Stands in for an unrecorded year: hebcal needs one, and only the day and month count.
const UNDATED_YEAR = 1;

const { NISAN, IYYAR, SIVAN, TAMUZ, AV, ELUL, TISHREI, CHESHVAN, KISLEV, TEVET, SHVAT, ADAR_I, ADAR_II } = months;

// Dates checked against at least two sources each (2026-10-08, and 2026-10-27 for the entries added
// then); the disputed ones are listed for review in AGENTS.md.
export const HILULOT: readonly Hilula[] = [
  {
    id: 'moshe_rabbeinu',
    name: { he: 'משה רבנו', en: 'Moshe Rabbeinu' },
    aliases: { he: [], en: ['Moses'] },
    day: 7,
    month: ADAR_I,
    year: 2488,
  },
  { id: 'aharon_hakohen', name: { he: 'אהרן הכהן', en: 'Aharon HaKohen' }, day: 1, month: AV, year: 2487 },
  { id: 'rachel_imeinu', name: { he: 'רחל אמנו', en: 'Rachel Imeinu' }, day: 11, month: CHESHVAN, year: 2208 },
  { id: 'david_hamelech', name: { he: 'דוד המלך', en: 'King David' }, day: 6, month: SIVAN, year: 2924 },
  { id: 'shmuel_hanavi', name: { he: 'שמואל הנביא', en: 'Shmuel HaNavi' }, day: 28, month: IYYAR },
  {
    id: 'rashbi',
    name: { he: 'רבי שמעון בר יוחאי', en: 'Rabbi Shimon bar Yochai' },
    aliases: { he: ['רשב״י', 'רבי שמעון'], en: ['Rashbi', 'Rabbi Shimon', 'Shimon bar Yochai'] },
    day: 18,
    month: IYYAR,
  },
  {
    id: 'rabbi_meir_baal_haness',
    name: { he: 'רבי מאיר בעל הנס', en: 'Rabbi Meir Baal HaNes' },
    aliases: { he: ['רבי מאיר'], en: ['Rabbi Meir'] },
    day: 14,
    month: IYYAR,
  },
  {
    id: 'rabbi_yehuda_hanasi',
    name: { he: 'רבי יהודה הנשיא', en: 'Rabbi Yehuda HaNasi' },
    aliases: { he: ['רבנו הקדוש'], en: ['Rebbi'] },
    day: 15,
    month: KISLEV,
  },
  {
    id: 'rashi',
    name: { he: 'רש״י', en: 'Rashi' },
    aliases: { he: ['רבי שלמה יצחקי'], en: ['Rabbi Shlomo Yitzchaki'] },
    day: 29,
    month: TAMUZ,
    year: 4865,
  },
  {
    id: 'rambam',
    name: { he: 'הרמב״ם', en: 'Rambam' },
    aliases: { he: ['רבי משה בן מימון'], en: ['Maimonides', 'Rabbi Moshe ben Maimon'] },
    day: 20,
    month: TEVET,
    year: 4965,
  },
  {
    id: 'ramban',
    name: { he: 'הרמב״ן', en: 'Ramban' },
    aliases: { he: ['רבי משה בן נחמן'], en: ['Nachmanides', 'Rabbi Moshe ben Nachman'] },
    day: 11,
    month: NISAN,
    year: 5030,
  },
  {
    id: 'maran_yosef_karo',
    name: { he: 'מרן רבי יוסף קארו', en: 'Rabbi Yosef Karo' },
    aliases: { he: ['בית יוסף'], en: ['Beit Yosef', 'Joseph Karo'] },
    day: 13,
    month: NISAN,
    year: 5335,
  },
  {
    id: 'rema',
    name: { he: 'הרמ״א', en: 'Rema' },
    aliases: { he: ['רבי משה איסרליש', 'איסרליש'], en: ['Moshe Isserles', 'Isserles'] },
    day: 18,
    month: IYYAR,
    year: 5332,
  },
  { id: 'ramak', name: { he: 'הרמ״ק', en: 'Ramak' }, day: 23, month: TAMUZ, year: 5330 },
  {
    id: 'arizal',
    name: { he: 'האר״י הקדוש', en: 'Arizal' },
    aliases: { he: ['רבי יצחק לוריא', 'האר״י', 'ארי'], en: ['Ari', 'Ari HaKadosh', 'Rabbi Yitzchak Luria'] },
    day: 5,
    month: AV,
    year: 5332,
  },
  { id: 'chaim_vital', name: { he: 'רבי חיים ויטאל', en: 'Rabbi Chaim Vital' }, day: 30, month: NISAN, year: 5380 },
  {
    id: 'shelah',
    name: { he: 'השל״ה הקדוש', en: 'Shelah HaKadosh' },
    aliases: { he: ['רבי ישעיה הלוי הורוביץ', 'הורוביץ'], en: ['Yeshayahu Horowitz', 'Horowitz'] },
    day: 11,
    month: NISAN,
    year: 5390,
  },
  {
    id: 'ohr_hachaim',
    name: { he: 'האור החיים הקדוש', en: 'Ohr HaChaim' },
    aliases: { he: ['רבי חיים בן עטר', 'בן עטר'], en: ['Chaim ibn Attar', 'Ibn Attar'] },
    day: 15,
    month: TAMUZ,
    year: 5503,
  },
  {
    id: 'ramchal',
    name: { he: 'הרמח״ל', en: 'Ramchal' },
    aliases: {
      he: ['רמח״ל', 'רבי משה חיים לוצאטו', 'לוצאטו', 'מסילת ישרים'],
      en: ['Moshe Chaim Luzzatto', 'Luzzatto', 'Ramhal', 'Mesillat Yesharim'],
    },
    day: 26,
    month: IYYAR,
  },
  {
    id: 'baal_shem_tov',
    name: { he: 'הבעל שם טוב', en: 'Baal Shem Tov' },
    aliases: { he: ['בעש״ט', 'רבי ישראל בן אליעזר'], en: ['Besht', 'Rabbi Yisrael ben Eliezer'] },
    day: 6,
    month: SIVAN,
    year: 5520,
  },
  {
    id: 'maggid_of_mezeritch',
    name: { he: 'המגיד ממזריטש', en: 'Maggid of Mezeritch' },
    day: 19,
    month: KISLEV,
    year: 5533,
  },
  { id: 'rashash', name: { he: 'הרש״ש', en: 'Rashash' }, day: 10, month: SHVAT, year: 5537 },
  {
    id: 'amram_ben_diwan',
    name: { he: 'רבי עמרם בן דיוואן', en: 'Rabbi Amram ben Diwan' },
    aliases: { he: ['עמרם בן דיוואן'], en: ['Amram ben Diwan', 'Amram Ben Diwane'] },
    day: 15,
    month: AV,
    year: 5542,
  },
  {
    id: 'elimelech_of_lizhensk',
    name: { he: 'רבי אלימלך מליז׳נסק', en: 'Rebbe Elimelech of Lizhensk' },
    day: 21,
    month: ADAR_I,
    year: 5547,
  },
  {
    id: 'menachem_mendel_of_vitebsk',
    name: { he: 'רבי מנחם מנדל מוויטבסק', en: 'Rabbi Menachem Mendel of Vitebsk' },
    aliases: { he: ['פרי הארץ', 'מנחם מנדל מהורודוק'], en: ['Pri HaAretz', 'Menachem Mendel of Horodok'] },
    day: 1,
    month: IYYAR,
    year: 5548,
  },
  { id: 'noda_biyehuda', name: { he: 'הנודע ביהודה', en: 'Noda BiYehuda' }, day: 17, month: IYYAR, year: 5553 },
  {
    id: 'vilna_gaon',
    name: { he: 'הגאון מווילנא', en: 'Vilna Gaon' },
    aliases: { he: ['הגר״א', 'רבי אליהו בן שלמה זלמן'], en: ['Gra', 'Rabbi Eliyahu ben Shlomo Zalman'] },
    day: 19,
    month: TISHREI,
    year: 5558,
  },
  {
    id: 'zusha_of_anipoli',
    name: { he: 'רבי זושא מאניפולי', en: 'Rebbe Zusha of Anipoli' },
    day: 2,
    month: SHVAT,
    year: 5560,
  },
  {
    id: 'levi_yitzchak_of_berditchev',
    name: { he: 'רבי לוי יצחק מברדיצ׳ב', en: 'Rebbe Levi Yitzchak of Berditchev' },
    day: 25,
    month: TISHREI,
    year: 5570,
  },
  {
    id: 'avraham_of_kalisk',
    name: { he: 'רבי אברהם מקאליסק', en: 'Rabbi Avraham of Kalisk' },
    aliases: { he: ['רבי אברהם הכהן מקליסק', 'רבי אברהם מקליסק'], en: ['Abraham Kalisker', 'Abraham of Kalisk'] },
    day: 4,
    month: SHVAT,
    year: 5570,
  },
  {
    id: 'nachman_of_breslov',
    name: { he: 'רבי נחמן מברסלב', en: 'Rebbe Nachman of Breslov' },
    aliases: { he: ['רבי נחמן', 'ברסלב'], en: ['Rebbe Nachman', 'Rabbi Nachman', 'Breslov'] },
    day: 18,
    month: TISHREI,
    year: 5571,
  },
  {
    id: 'baal_hatanya',
    name: { he: 'בעל התניא', en: 'Baal HaTanya' },
    aliases: { he: ['האדמו״ר הזקן', 'רבי שניאור זלמן מלאדי'], en: ['Alter Rebbe', 'Shneur Zalman of Liadi'] },
    day: 24,
    month: TEVET,
    year: 5573,
  },
  {
    id: 'chozeh_of_lublin',
    name: { he: 'החוזה מלובלין', en: 'Chozeh of Lublin' },
    aliases: { he: ['רבי יעקב יצחק הלוי הורוביץ', 'הורוביץ'], en: ['Horowitz'] },
    day: 9,
    month: AV,
    year: 5575,
  },
  {
    id: 'chaim_of_volozhin',
    name: { he: 'רבי חיים מוולוז׳ין', en: 'Rabbi Chaim of Volozhin' },
    day: 14,
    month: SIVAN,
    year: 5581,
  },
  { id: 'akiva_eiger', name: { he: 'רבי עקיבא איגר', en: 'Rabbi Akiva Eiger' }, day: 13, month: TISHREI, year: 5598 },
  {
    id: 'chatam_sofer',
    name: { he: 'החתם סופר', en: 'Chatam Sofer' },
    aliases: { he: ['רבי משה סופר'], en: ['Rabbi Moshe Sofer', 'Moshe Sofer'] },
    day: 25,
    month: TISHREI,
    year: 5600,
  },
  {
    id: 'bnei_yissaschar',
    name: { he: 'הבני יששכר', en: 'Bnei Yissaschar' },
    aliases: {
      he: ['בני יששכר', 'מהרצ״א', 'רבי צבי אלימלך מדינוב'],
      en: ['Bnei Yissachar', 'Tzvi Elimelech of Dinov', 'Zvi Elimelech Spira'],
    },
    day: 18,
    month: TEVET,
    year: 5601,
  },
  {
    id: 'yismach_moshe',
    name: { he: 'הישמח משה', en: 'Yismach Moshe' },
    aliases: { he: ['ישמח משה', 'משה טייטלבוים'], en: ['Moshe Teitelbaum of Ujhel', 'Moses Teitelbaum'] },
    day: 28,
    month: TAMUZ,
    year: 5601,
  },
  {
    id: 'chaim_pinto',
    name: { he: 'רבי חיים פינטו הגדול', en: 'Rabbi Chaim Pinto HaGadol' },
    day: 26,
    month: ELUL,
    year: 5605,
  },
  {
    id: 'yisrael_of_ruzhin',
    name: { he: 'רבי ישראל מרוז׳ין', en: 'Rebbe Yisrael of Ruzhin' },
    day: 3,
    month: CHESHVAN,
    year: 5611,
  },
  { id: 'kotzker_rebbe', name: { he: 'הרבי מקוצק', en: 'Kotzker Rebbe' }, day: 22, month: SHVAT, year: 5619 },
  { id: 'chiddushei_harim', name: { he: 'החידושי הרי״ם', en: 'Chiddushei HaRim' }, day: 23, month: ADAR_I, year: 5626 },
  { id: 'tzemach_tzedek', name: { he: 'הצמח צדק', en: 'Tzemach Tzedek' }, day: 13, month: NISAN, year: 5626 },
  {
    id: 'divrei_chaim',
    name: { he: 'הדברי חיים מצאנז', en: 'Divrei Chaim of Sanz' },
    aliases: { he: ['דברי חיים', 'רבי חיים מצאנז'], en: ['Chaim of Sanz', 'Sanzer Rav', 'Tsanzer Rov'] },
    day: 25,
    month: NISAN,
    year: 5636,
  },
  {
    id: 'abir_yaakov',
    name: { he: 'רבי יעקב אבוחצירא', en: 'Rabbi Yaakov Abuchatzeira' },
    day: 20,
    month: TEVET,
    year: 5640,
  },
  {
    id: 'yisrael_salanter',
    name: { he: 'רבי ישראל סלנטר', en: 'Rabbi Yisrael Salanter' },
    day: 25,
    month: SHVAT,
    year: 5643,
  },
  {
    id: 'maharil_diskin',
    name: { he: 'המהרי״ל דיסקין', en: 'Maharil Diskin' },
    aliases: {
      he: ['מהרי״ל דיסקין', 'יהושע לייב דיסקין'],
      en: ['Yehoshua Leib Diskin', 'Moshe Yehoshua Yehuda Leib Diskin'],
    },
    day: 29,
    month: TEVET,
    year: 5658,
  },
  { id: 'sfas_emes', name: { he: 'השפת אמת', en: 'Sfas Emes' }, day: 5, month: SHVAT, year: 5665 },
  {
    id: 'ben_ish_chai',
    name: { he: 'הבן איש חי', en: 'Ben Ish Chai' },
    aliases: { he: ['רבי יוסף חיים מבגדאד'], en: ['Yosef Chaim of Baghdad'] },
    day: 13,
    month: ELUL,
    year: 5669,
  },
  {
    id: 'chaim_of_brisk',
    name: { he: 'רבי חיים מבריסק', en: 'Rabbi Chaim of Brisk' },
    aliases: {
      he: ['הגר״ח', 'רבי חיים סולובייצ׳יק'],
      en: ['Chaim Brisker', 'Reb Chaim of Brisk', 'Rav Chaim Soloveitchik'],
    },
    day: 21,
    month: AV,
    year: 5678,
  },
  {
    id: 'shayele_of_kerestir',
    name: { he: 'רבי ישעיה מקרעסטיר', en: 'Rabbi Shayele of Kerestir' },
    aliases: { he: ['ר׳ ישעיה׳לה', 'קרעסטיר', 'ישעיה שטיינר'], en: ['Reb Shayele', 'Kerestirer', 'Yeshaya Steiner'] },
    day: 3,
    month: IYYAR,
    year: 5685,
  },
  {
    id: 'chafetz_chaim',
    name: { he: 'החפץ חיים', en: 'Chafetz Chaim' },
    aliases: {
      he: ['חפץ חיים', 'רבי ישראל מאיר הכהן כגן', 'משנה ברורה'],
      en: ['Yisrael Meir Kagan', 'Kagan', 'Mishnah Berurah'],
    },
    day: 24,
    month: ELUL,
    year: 5693,
  },
  {
    id: 'meir_shapiro',
    name: { he: 'רבי מאיר שפירא מלובלין', en: 'Rabbi Meir Shapiro of Lublin' },
    day: 7,
    month: CHESHVAN,
    year: 5694,
  },
  {
    id: 'rav_kook',
    name: { he: 'הרב קוק', en: 'Rav Kook' },
    aliases: { he: ['הראי״ה', 'רבי אברהם יצחק הכהן קוק'], en: ['Abraham Isaac Kook'] },
    day: 3,
    month: ELUL,
    year: 5695,
  },
  {
    id: 'rayatz',
    name: { he: 'הרבי הריי״צ', en: 'Rabbi Yosef Yitzchak Schneersohn' },
    day: 10,
    month: SHVAT,
    year: 5710,
  },
  {
    id: 'chazon_ish',
    name: { he: 'החזון איש', en: 'Chazon Ish' },
    aliases: { he: ['רבי אברהם ישעיהו קרליץ', 'קרליץ'], en: ['Avraham Yeshayahu Karelitz', 'Karelitz'] },
    day: 15,
    month: CHESHVAN,
    year: 5714,
  },
  {
    id: 'isser_zalman_meltzer',
    name: { he: 'רבי איסר זלמן מלצר', en: 'Rabbi Isser Zalman Meltzer' },
    aliases: { he: ['אבן האזל', 'הרא״ז'], en: ['Even HaEzel', 'Rav Isser Zalman', 'Slutsker Rov'] },
    day: 10,
    month: KISLEV,
    year: 5714,
  },
  {
    id: 'chaim_chouri',
    name: { he: 'רבי חיים חורי', en: 'Rabbi Chaim Chouri' },
    aliases: { he: ['הרב חורי'], en: ['Haim Houri', 'Hacham Haim Houri'] },
    day: 25,
    month: IYYAR,
    year: 5717,
  },
  {
    id: 'aharon_of_belz',
    name: { he: 'רבי אהרן מבעלזא', en: 'Rabbi Aharon of Belz' },
    aliases: { he: ['מהר״א מבעלזא', 'המהר״א', 'אהרן רוקח'], en: ['Belzer Rebbe', 'Aharon Rokeach'] },
    day: 21,
    month: AV,
    year: 5717,
  },
  {
    id: 'brisker_rav',
    name: { he: 'הבריסקר רב', en: 'Brisker Rav' },
    aliases: {
      he: ['הגרי״ז', 'ר׳ וועלוול', 'רבי יצחק זאב סולובייצ׳יק'],
      en: ['Brisker Rov', 'the Griz', 'Reb Velvel', 'Yitzchok Zev Soloveitchik'],
    },
    day: 9,
    month: TISHREI,
    year: 5720,
  },
  { id: 'satmar_rebbe', name: { he: 'הרבי מסאטמר', en: 'Satmar Rebbe' }, day: 26, month: AV, year: 5739 },
  {
    id: 'tzvi_yehuda_kook',
    name: { he: 'הרב צבי יהודה קוק', en: 'Rabbi Tzvi Yehuda Kook' },
    aliases: { he: ['הרצי״ה', 'הרב צבי יהודה'], en: ['Rav Tzvi Yehuda', 'Zvi Yehuda Kook'] },
    day: 14,
    month: ADAR_I,
    year: 5742,
  },
  {
    id: 'baba_meir',
    name: { he: 'בבא מאיר', en: 'Baba Meir' },
    aliases: {
      he: ['הבבא מאיר', 'רבי מאיר אבוחצירא', 'רבי מאיר אביחצירא'],
      en: ['Meir Abuhatzeira', 'Meir Abuchatzira', 'Meir Abihssira'],
    },
    day: 17,
    month: NISAN,
    year: 5743,
  },
  {
    id: 'baba_sali',
    name: { he: 'הבבא סאלי', en: 'Baba Sali' },
    aliases: { he: ['בבא סאלי', 'רבי ישראל אבוחצירא', 'אבוחצירא'], en: ['Yisrael Abuhatzeira', 'Abuhatzeira'] },
    day: 4,
    month: SHVAT,
    year: 5744,
  },
  {
    id: 'steipler',
    name: { he: 'הסטייפלר', en: 'Steipler Gaon' },
    aliases: { he: ['רבי יעקב ישראל קניבסקי'], en: ['Yaakov Yisrael Kanievsky'] },
    day: 23,
    month: AV,
    year: 5745,
  },
  {
    id: 'moshe_feinstein',
    name: { he: 'רבי משה פיינשטיין', en: 'Rabbi Moshe Feinstein' },
    day: 13,
    month: ADAR_II,
    year: 5746,
  },
  {
    id: 'yehuda_tzadka',
    name: { he: 'רבי יהודה צדקה', en: 'Rabbi Yehuda Tzadka' },
    aliases: { he: ['הקול יהודה', 'יהודה יהושע צדקה'], en: ['Yehuda Yehoshua Tzadka'] },
    day: 12,
    month: CHESHVAN,
    year: 5752,
  },
  {
    id: 'lubavitcher_rebbe',
    name: { he: 'הרבי מלובביץ׳', en: 'Lubavitcher Rebbe' },
    aliases: { he: ['רבי מנחם מנדל שניאורסון', 'שניאורסון'], en: ['Menachem Mendel Schneerson', 'Schneerson'] },
    day: 3,
    month: TAMUZ,
    year: 5754,
  },
  {
    id: 'klausenberger_rebbe',
    name: { he: 'הרבי מקלויזנבורג', en: 'Klausenberger Rebbe' },
    aliases: {
      he: ['שפע חיים', 'דברי יציב', 'האדמו״ר מצאנז-קלויזנבורג'],
      en: ['Shefa Chaim', 'Yekusiel Yehudah Halberstam', 'Sanz-Klausenburg Rebbe'],
    },
    day: 9,
    month: TAMUZ,
    year: 5754,
  },
  {
    id: 'shlomo_zalman_auerbach',
    name: { he: 'רבי שלמה זלמן אויערבך', en: 'Rabbi Shlomo Zalman Auerbach' },
    day: 20,
    month: ADAR_I,
    year: 5755,
  },
  {
    id: 'ben_zion_abba_shaul',
    name: { he: 'הרב בן ציון אבא שאול', en: 'Rabbi Ben Zion Abba Shaul' },
    aliases: { he: ['אור לציון', 'בן ציון אבא-שאול'], en: ['Ohr LeZion', 'Bentzion Abba Shaul'] },
    day: 19,
    month: TAMUZ,
    year: 5758,
  },
  { id: 'rav_shach', name: { he: 'הרב שך', en: 'Rav Shach' }, day: 16, month: CHESHVAN, year: 5762 },
  {
    id: 'yitzchak_kaduri',
    name: { he: 'הרב יצחק כדורי', en: 'Rabbi Yitzchak Kaduri' },
    aliases: { he: ['הרב כדורי', 'זקן המקובלים'], en: ['Kaduri', 'Yitzhak Kaduri'] },
    day: 29,
    month: TEVET,
    year: 5766,
  },
  {
    id: 'mordechai_eliyahu',
    name: { he: 'הרב מרדכי אליהו', en: 'Rabbi Mordechai Eliyahu' },
    day: 25,
    month: SIVAN,
    year: 5770,
  },
  { id: 'rav_elyashiv', name: { he: 'הרב אלישיב', en: 'Rav Elyashiv' }, day: 28, month: TAMUZ, year: 5772 },
  {
    id: 'ovadia_yosef',
    name: { he: 'הרב עובדיה יוסף', en: 'Rabbi Ovadia Yosef' },
    day: 3,
    month: CHESHVAN,
    year: 5774,
  },
  {
    id: 'shmuel_wosner',
    name: { he: 'הרב שמואל וואזנר', en: 'Rabbi Shmuel Wosner' },
    aliases: {
      he: ['שבט הלוי', 'בעל שבט הלוי', 'הרב וואזנר', 'שמואל הלוי ואזנר'],
      en: ['Shevet HaLevi', 'Shmuel Wosner', 'Wosner', 'Vosner'],
    },
    day: 15,
    month: NISAN,
    year: 5775,
  },
  {
    id: 'aharon_leib_shteinman',
    name: { he: 'הרב אהרן לייב שטיינמן', en: 'Rabbi Aharon Leib Shteinman' },
    aliases: {
      he: ['הגראי״ל', 'הרב שטיינמן', 'שטינמן', 'אילת השחר'],
      en: ['Shteinman', 'Steinman', 'Aharon Leib Steinman'],
    },
    day: 24,
    month: KISLEV,
    year: 5778,
  },
  {
    id: 'chaim_kanievsky',
    name: { he: 'הרב חיים קנייבסקי', en: 'Rabbi Chaim Kanievsky' },
    aliases: { he: ['קניבסקי'], en: ['Kanievsky'] },
    day: 15,
    month: ADAR_II,
    year: 5782,
  },
  {
    id: 'gershon_edelstein',
    name: { he: 'הרב גרשון אדלשטיין', en: 'Rabbi Gershon Edelstein' },
    aliases: { he: ['רבי גרשון', 'הגרי״ג אדלשטיין'], en: ['Rav Gershon Edelstein', 'Edelstein'] },
    day: 10,
    month: SIVAN,
    year: 5783,
  },
];

// The day a hilula falls on in a Hebrew year, by hebcal's yahrzeit rules (a date in Adar II stays
// in the year's last Adar), except a plain Adar date in a leap year: Adar I abroad and Adar II in
// Israel, as the Mishna Berura records the custom for 7 Adar.
export function hilulaDayIn(hilula: Hilula, hebrewYear: number, inIsrael: boolean): HDate | null {
  const deathYear = hilula.year ?? UNDATED_YEAR;
  const plainAdar = hilula.month === ADAR_I && !HDate.isLeapYear(deathYear);
  // getYahrzeit rewrites the date it is given into the anniversary, so it gets a fresh one.
  const day = HebrewCalendar.getYahrzeit(hebrewYear, new HDate(hilula.day, hilula.month, deathYear));
  if (!day) return null;
  return inIsrael && plainAdar && HDate.isLeapYear(hebrewYear) ? new HDate(day.getDate(), ADAR_II, hebrewYear) : day;
}

const byYear = new Map<string, Map<number, Hilula[]>>();

function hilulotOfYear(hebrewYear: number, inIsrael: boolean): Map<number, Hilula[]> {
  const key = `${hebrewYear}:${inIsrael}`;
  const cached = byYear.get(key);
  if (cached) return cached;
  const days = new Map<number, Hilula[]>();
  for (const hilula of HILULOT) {
    const day = hilulaDayIn(hilula, hebrewYear, inIsrael);
    if (day) days.set(day.abs(), [...(days.get(day.abs()) ?? []), hilula]);
  }
  byYear.set(key, days);
  return days;
}

export function hilulotOn(day: HDate, inIsrael: boolean): Hilula[] {
  return hilulotOfYear(day.getFullYear(), inIsrael).get(day.abs()) ?? [];
}

export function hilulaNames(list: readonly Hilula[], language: 'he' | 'en'): string {
  return list.map((h) => h.name[language]).join(', ');
}

// "י״ח אייר" / "18 Iyyar": the day and month, without the year.
export function hilulaDateLabel(day: HDate, language: 'he' | 'en'): string {
  return language === 'en' ? day.render('en', false) : day.renderGematriya(true).replace(/ \S+$/, '');
}

// Every hilula once, on its next day from `today` on, soonest first; a shared day keeps the list's order.
export function upcomingHilulot(today: HDate, inIsrael: boolean): { hilula: Hilula; day: HDate }[] {
  return HILULOT.flatMap((hilula) => {
    const thisYear = hilulaDayIn(hilula, today.getFullYear(), inIsrael);
    const day =
      thisYear && thisYear.abs() >= today.abs() ? thisYear : hilulaDayIn(hilula, today.getFullYear() + 1, inIsrael);
    return day ? [{ hilula, day }] : [];
  }).sort((a, b) => a.day.abs() - b.day.abs());
}
