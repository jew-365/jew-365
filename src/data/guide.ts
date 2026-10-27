import { DateTime } from 'luxon';
import type { IconName } from '@/components/MitzvahIcon';
import { LIBRARY_GROUPS, MITZVOT } from '@/data/mitzvot';
import { SIDDUR_GROUPS, STANDALONE_TEXTS, standaloneTextsIn } from '@/data/siddur';
import { formatDate, translate, type AppLanguage } from '@/i18n';
import { THEME_NAMES } from '@/theme/colors';
import type { Nusach } from '@/types/mitzvah';
import { mitzvahName } from '@/utils/mitzvahName';

export type GuideText = { he: string; en: string };

export type GuideTopicId =
  | 'start'
  | 'home'
  | 'reminders'
  | 'library'
  | 'shabbat'
  | 'siddur'
  | 'tehillim'
  | 'chok'
  | 'history'
  | 'schedule'
  | 'roshChodesh'
  | 'taharah'
  | 'settings'
  | 'updates'
  | 'about';

export type GuideListKind = 'mitzvot' | 'texts' | 'palettes';

export type GuideHref =
  | '/mitzvot'
  | '/schedule'
  | '/report'
  | '/rosh-chodesh'
  | { pathname: '/siddur/[id]'; params: { id: string } }
  | { pathname: '/mitzvah/[id]'; params: { id: string } };

export type GuideTopic = {
  id: GuideTopicId;
  icon: IconName;
  title: GuideText;
  body: readonly GuideText[];
  routes: readonly string[];
  action?: { label: GuideText; href: GuideHref };
  list?: GuideListKind;
  taharahOnly?: true;
};

export type WhatsNewLabel = `${number}.${number}.${number}-${number}`;

export type WhatsNewEntry = { label: WhatsNewLabel; date: string; items: readonly GuideText[] };

export type GuideListGroup = { key: string; label: string | null; items: readonly string[] };

export type GuideList = { kind: GuideListKind; title: string; groups: readonly GuideListGroup[] };

export const GUIDE_WHATS_NEW_SHOWN = 3;

export const GUIDE_TOPICS: readonly GuideTopic[] = [
  {
    id: 'start',
    icon: 'sparkle',
    title: { he: 'תחילת הדרך', en: 'Getting started' },
    body: [
      {
        he: 'בפתיחה הראשונה האפליקציה שואלת כמה שאלות קצרות: שם וטלפון (אפשר לדלג), מגדר ומצב משפחתי, נוסח התפילה, אחרי אילו מצוות לעקוב, ועיר או מיקום לפי GPS לחישוב הזמנים. אחרי אישור ההתראות מצוות היום כבר מחכות בדף הבית.',
        en: "The first time the app opens it asks a few short questions: name and phone (optional), gender and marital status, your nusach, which mitzvot to track, and a city or a GPS location for the zmanim. Once notifications are allowed, today's mitzvot are waiting on Home.",
      },
      {
        he: 'במעבר לטלפון חדש מקישים במסך הפתיחה על ״יש לי קובץ גיבוי״ ומשחזרים את הקובץ שיוצא בטלפון הקודם.',
        en: 'Moving to a new phone? On the welcome screen tap “I have a backup file” and restore the file exported on the old phone.',
      },
      {
        he: 'בתחתית המסך חמש לשוניות: עוד, סידור, בית, מעקב והגדרות. בלשונית עוד נמצאים לוח הזמנים, חק לישראל, תהילים, ההילולות, מצפן התפילה, קו ההלכה והמדריך הזה, ואפשר לפתוח אותו גם מהגדרות ← אודות ויצירת קשר או לחפש ״מדריך״ בחיפוש שבהגדרות.',
        en: 'Five tabs sit at the bottom: More, Siddur, Home, Tracking and Settings. More holds the schedule, Chok LeYisrael, Tehillim, the hilulot, the prayer compass, the halacha hotline and this guide, which also opens from Settings → About and contact or by searching “guide” in Settings.',
      },
      {
        he: 'מצפן התפילה בלשונית עוד הוא רדאר: קו סריקה מסתובב, והכותל נדלק כנקודה במרחק שלו ובכיוון שלו ביחס לטלפון. מתחתיו כתוב כמה מעלות לסובב ולאיזה צד, המרחק בקילומטרים והכיוון מהצפון, וכשהטלפון פונה לכותל הוא נצבע ירוק ומגיע רטט קצר. הוא צריך הרשאת מיקום, ובלעדיה הוא מבקש אותה. הכיוון מחושב מהמקום שבו אתה עומד, וכשהמיקום לא נמצא המסך אומר זאת, מחשב לפי העיר שבהגדרות ומאפשר לנסות שוב. כשהמצפן מבקש כיול, מזיזים את הטלפון בצורת שמונה.',
        en: 'The prayer compass in the More tab is a radar: a sweep line turns and the Kotel lights up as a point at its distance and direction from the phone. Under it the screen says how many degrees to turn and which way, the distance in kilometres and the bearing from north, and when the phone faces the Kotel it turns green with a short vibration. It needs the location permission and asks for it when missing. The direction is measured from where you stand; when your location is not found the screen says so, measures from the city in Settings and lets you try again. When it asks for calibration, move the phone in a figure eight.',
      },
    ],
    routes: ['/(tabs)/more', '/guide', '/compass'],
  },
  {
    id: 'home',
    icon: 'sun',
    title: { he: 'דף הבית וסימון מצווה', en: 'Home and marking a mitzvah' },
    body: [
      {
        he: 'בדף הבית מופיעות המצוות שהזמן שלהן פתוח עכשיו, הדחופה ראשונה, ולכל אחת הזמן שנותר ופס התקדמות. כל מצווה מופיעה בחלון הזמן ההלכתי שלה, שמחושב לפי המיקום שנבחר. מתחתיהן מופיעים ״הבא בתור״, מה שלא בוצע ומה שכבר בוצע היום.',
        en: 'Home shows the mitzvot whose time is open now, the most urgent first, each with the time left and a progress bar. Each mitzvah appears in its halachic time window, computed for the location you chose. Below them are Next up, what was missed and what is already done today.',
      },
      {
        he: 'הקשה על כפתור הסימון בכרטיס מסמנת את המצווה כבוצעה ומבטלת את שאר ההתראות שלה לאותו יום. ״בטל״ ברשימת ״בוצעו״ מחזיר אותה. גם מצווה שהזמן שלה עבר אפשר לסמן עד סוף היום.',
        en: 'Tap the check button on a card to mark the mitzvah done; its other notifications for that day are cancelled. Undo in the Completed list brings it back. A mitzvah whose time has passed can still be marked until the day ends.',
      },
      {
        he: 'הקשה על הכרטיס פותחת את מסך המצווה, ולחיצה ארוכה פותחת פעולות מהירות: ״פרטים״, או ״דלג היום״ ליום שבו המצווה לא נוגעת. כשיש למצווה נוסח, ״פתח נוסח״ פותח אותו בסידור. פס בראש הדף מזכיר את מה שדורש תשומת לב, כמו סימון אחרי שבת או מיקום שלא אושר.',
        en: "Tapping a card opens the mitzvah's screen, and a long press opens quick actions: Details, or Skip today for a day it does not apply. When the mitzvah has a text, Open text opens it in the siddur. A strip at the top flags what needs attention, such as the check-in after Shabbat or a location that was not allowed.",
      },
      {
        he: 'היום באפליקציה מתחלף בעלות השחר ולא בחצות: הלילה שייך לערב שלפניו, ולכן ערבית שנאמרת אחרי חצות נרשמת ליום של אותו ערב.',
        en: "The app's day turns at dawn (alot hashachar), not at midnight: the night belongs to the evening before, so Maariv said after midnight is filed under that evening's day.",
      },
    ],
    routes: ['/(tabs)/home'],
  },
  {
    id: 'reminders',
    icon: 'bell',
    title: { he: 'תזכורות ועורך התזכורות', en: 'Reminders and the reminder editor' },
    body: [
      {
        he: 'במסך של כל מצווה מופיעים חלון הזמן של היום, ההתראה הבאה ורשימת התזכורות לפי סדר השליחה, ולצד כל אחת מתי היא תישלח בפעם הבאה. ״הוסף תזכורת״ מוסיף עוד אחת, ו״חזרה לברירת מחדל״ מחזיר את התזכורות המקוריות.',
        en: "Each mitzvah's screen shows today's time window, the next notification and its reminders in the order they go out, each with when it fires next. Add reminder adds one more, and Reset to default brings back the original reminders.",
      },
      {
        he: 'ב״מתי לשלוח״ בוחרים מתי התזכורת נשלחת: לפני תחילת הזמן (עד שלוש שעות לפני), בתחילת הזמן או אחריה, לפני סוף הזמן או בשעה קבועה, ומתחת קובעים כמה דקות. ״דלג אם כבר סומן״ מוותר עליה כשהמצווה כבר סומנה. במצווה אישית יש גם ״אחרי סוף הזמן, אם לא סימנת״, ובקידוש לבנה ״אחרי צאת שבת או חג״.',
        en: 'In When to send you choose when the reminder goes out: before the time starts (up to three hours before), at the start or after it, before the time ends or at a set time, and below it how many minutes. Skip if already done drops it once the mitzvah is marked. A custom mitzvah also offers After the end, if not marked, and Kiddush Levana offers After Shabbat or Yom Tov ends.',
      },
      {
        he: 'מצווה פעילה נשארת תמיד עם תזכורת אחת לפחות: את האחרונה אי אפשר למחוק, והפעלה של מצווה בלי תזכורות מבקשת קודם להגדיר אחת.',
        en: 'A mitzvah that is on always keeps at least one reminder: the last one cannot be deleted, and switching on a mitzvah with none asks you to set one first.',
      },
      {
        he: 'בהתראה עצמה ״עשיתי״ מסמן את המצווה בלי לפתוח את האפליקציה, ו״פתח נוסח״ פותח את הנוסח כשיש כזה. הקשה על ההתראה פותחת את הנוסח, או את מסך המצווה כשאין לה נוסח. באנדרואיד כדאי לפטור את האפליקציה מחיסכון בסוללה בהגדרות ← מכשיר והתראות, כדי שהתזכורות יגיעו בזמן.',
        en: "In the notification, Done marks the mitzvah without opening the app, and Open text opens its text when it has one. Tapping the notification opens the text, or the mitzvah's screen when there is none. On Android, exempt the app from battery saving in Settings → Device and notifications so reminders arrive on time.",
      },
      {
        he: 'התזכורות נקבעות מראש לימים הבאים, גם אם לא פותחים את האפליקציה: באנדרואיד לכחודש, ובאייפון לכשבוע וחצי, כשמהיום השלישי נשארת תזכורת אחת לכל מצווה. ביום האחרון שתוכנן מגיעה בשמונה בערב התראה ״התזכורות עומדות להיגמר״, וכל פתיחה של האפליקציה מתכננת מחדש.',
        en: 'Reminders are set ahead for the coming days even if the app is not opened: about a month on Android and about a week and a half on iPhone, where from the third day each mitzvah keeps one reminder. On the last planned day a notification at 8 pm says your reminders are about to run out, and every time the app opens it plans again.',
      },
    ],
    routes: ['/mitzvah/[id]'],
  },
  {
    id: 'library',
    icon: 'star',
    title: { he: 'המצוות שלי ומצוות אישיות', en: 'My mitzvot and custom mitzvot' },
    body: [
      {
        he: 'בהגדרות ← המצוות שלי מופיעות כל המצוות לפי קבוצות, כל אחת עם מתג, והקשה על שורה פותחת את מסך המצווה. מצוות שנוספות בעדכון מופעלות מעצמן, והימים שלפני כן לא נחשבים כהחמצה. מצווה שלא נהוגה אצל נשים כבויה אצל אישה ומסומנת ״לא נהוג אצל נשים״, ואפשר להפעיל אותה. בקבוצה ״עוד״ נמצאות גם ההילולות וראש חודש.',
        en: "Settings → My mitzvot lists every mitzvah by group, each with a switch, and tapping a row opens the mitzvah's screen. Mitzvot added in an update are switched on for you, and the days before that never count as missed. A mitzvah not customary for women is off for a woman and marked Not customary for women, and she can still switch it on. The More group also holds hilulot and Rosh Chodesh.",
      },
      {
        he: 'מצוות עונתיות מופיעות רק בזמנן: ספירת העומר, נרות חנוכה (התזכורת אומרת איזה נר), הסליחות בעונה של הנוסח, והאושפיזין בלילות סוכות עם האושפיז של אותו לילה. קידוש לבנה מופיע פעם בחודש, מהלילה הראשון שבו אומרים אותו ועד סוף הזמן, עד שמסמנים אותו. חלק מהמצוות תלויות בנוסח.',
        en: "Seasonal mitzvot appear only in their time: the Omer count, Chanukah candles (the reminder names the night), Selichot in your nusach's season, and Ushpizin on the nights of Sukkot with that night's guest. Kiddush Levana appears once a month, from the first night it is said until the period ends, until it is marked. Some mitzvot depend on the nusach.",
      },
      {
        he: '״הוסף מצווה חדשה״ בתחתית המסך יוצר מצווה אישית: שם, שעות (שעת סיום מוקדמת משעת ההתחלה נמשכת עד למחרת), ובתזמון המצווה ימים קבועים בשבוע, טווח מתאריך עד תאריך או מספר ימים ברצף. בוחרים אם לדלג בשבת וביום טוב, ומוסיפים תזכורות ותוכן עשיר: טקסט, ברכה, קישור או טקסט מהסידור. כשהטווח או הרצף מסתיימים המצווה נכבית, וההיסטוריה שלה נשמרת.',
        en: 'Add custom mitzvah at the bottom of the screen creates your own mitzvah: a name, hours (an end before the start runs into the next day), and a schedule of set weekdays, a range from date to date or a run of days. You choose whether to skip it on Shabbat and Yom Tov, and add reminders and rich content: text, a blessing, a link or a text from the siddur. When its range or streak ends it switches off, and its history is kept.',
      },
    ],
    routes: ['/mitzvot', '/custom-mitzvah'],
    list: 'mitzvot',
    action: { label: { he: 'לפתיחת המצוות שלי', en: 'Open My mitzvot' }, href: '/mitzvot' },
  },
  {
    id: 'shabbat',
    icon: 'candles',
    title: { he: 'שבת ויום טוב', en: 'Shabbat and Yom Tov' },
    body: [
      {
        he: 'בשבת וביום טוב האפליקציה נחה: מהדלקת הנרות ועד עשר דקות אחרי צאת הכוכבים לא נשלחות התראות, ובמקום המסכים מופיע מסך שקט עם שעת היציאה. זה במכוון, והאפליקציה חוזרת לפעול מעצמה.',
        en: 'On Shabbat and Yom Tov the app rests: from candle lighting until ten minutes after nightfall no notifications go out, and a quiet screen with the exit time covers the app. This is by design, and the app comes back by itself.',
      },
      {
        he: 'שעה לפני הדלקת הנרות מגיעה התראה עם זמני ההדלקה והיציאה, ולפי מה שמופעל גם ספירת העומר, ההילולות, ראש חודש והאושפיזין של הלילות שבתוך השבת או החג.',
        en: 'An hour before candle lighting a notification gives the lighting and exit times and, as switched on, the Omer count, hilulot, Rosh Chodesh and the Ushpizin of the nights inside the Shabbat or Yom Tov.',
      },
      {
        he: 'אחרי השבת או החג האפליקציה פותחת מסך סימון למה שנעשה בזמן הזה, ובדף הבית מופיע פס שמזכיר לסמן. התראות מזכירות בצאת השבת, שעתיים אחר כך ובערב שלמחרת. אפשר לסמן עד עלות השחר שאחרי היום הראשון בחול, ומה שלא סומן עד אז נחשב כלא בוצע. שבתות וחגים נספרים בהיסטוריה וברצף כמו כל יום.',
        en: 'After Shabbat or Yom Tov the app opens a check-in to mark what was done in that time, and a strip on Home reminds you to mark. Notifications remind you at the exit, two hours later and the next evening. You can mark until dawn after the first weekday; anything unmarked by then counts as missed. Shabbat and Yom Tov count in history and the streak like any other day.',
      },
    ],
    routes: ['/checkin'],
  },
  {
    id: 'siddur',
    icon: 'siddur',
    title: { he: 'הסידור', en: 'The siddur' },
    body: [
      {
        he: 'בלשונית סידור כל קבוצה נפתחת ונסגרת בהקשה על הכותרת שלה: קודם הטקסטים שהזמן שלהם פתוח עכשיו (פתוחים בכל כניסה ללשונית), אחר כך ברכות הסעודה, התפילות (שחרית, מנחה וערבית), המצוות (תפילין, קריאת שמע, ברכות השחר, הדלקת נרות, הבדלה וספירת העומר), ואחריהן שאר הברכות והתפילות לפי קבוצות. טקסט שלא נאמר היום מופיע באפור, עם הזמן שבו הוא נאמר, ואפשר לפתוח אותו תמיד: הוא נפתח בנוסח של היום הבא שבו אומרים אותו, בלי ״סיימתי״. כל טקסט מותאם ליום: הלל, מוסף ותוספות כמו יעלה ויבוא מופיעים בימים שלהם.',
        en: "In the Siddur tab each group opens and closes with a tap on its title: first the texts whose time is open now (open each time you enter the tab), then the meal blessings, the prayers (Shacharit, Mincha and Maariv), the mitzvot (tefillin, the morning Shema, the morning blessings, candle lighting, havdalah and the Omer), then the other blessings and prayers by group. A text not said today is greyed out, with when it is said, and it still opens at any time, in the text of the next day it is said and without Done. Each text is set for the day: Hallel, Musaf and inserts such as Ya'aleh VeYavo appear on their days.",
      },
      {
        he: 'בראש הקורא: ״בחר חלק״ לקפיצה לחלק אחר, במניין או ביחיד בתפילות שיש בהן קטעים למניין (ביחיד, קדיש, ברכו, קדושה וקריאת התורה מקופלים), הגדלה והקטנה של הטקסט, וגלילה אוטומטית במהירות שבוחרים. קטע מקופל נפתח בהקשה. בזמן הקריאה הכלים מתקפלים לשורה אחת עם ״חזור״ ושם הטקסט, וחוזרים כשגוללים למעלה או מקישים על השורה. כשהאפליקציה באנגלית, מתחת לעברית מופיע התרגום, כשיש למקור תרגום.',
        en: "At the top of the reader: Jump to section, Minyan or Alone in prayers with minyan passages (Alone folds Kaddish, Barchu, Kedusha and the Torah reading), larger and smaller text, and auto-scroll at the speed you choose. A folded passage opens on tap. While you read, the controls fold into one line with Back and the text's name, and come back when you scroll up or tap that line. When the app is in English, the source's translation appears under the Hebrew where it has one.",
      },
      {
        he: 'כפתור הכוכב שומר את המקום הנוכחי כסימנייה; כשכבר יש סימניות בטקסט הוא שואל אם להוסיף סימנייה חדשה או להעביר אחת קיימת למקום הזה, ו״סימניות״ מציג את ״המקום האחרון״ ואת הסימניות של הטקסט, לקפיצה או למחיקה. בפתיחה הבאה הקורא מציע להמשיך מהמקום שבו עצרתם: בטקסט של מצווה (התפילות, הדלקת נרות, הבדלה וספירת העומר) רק באותו יום, ובשאר הטקסטים תמיד. ״סיימתי״ בסוף הטקסט מסמן את המצווה, ובטקסט של מצווה כפתור ההגדרות בראש הקורא פותח את מסך המצווה.',
        en: "The star button saves the current place as a bookmark; when the text already has bookmarks it asks whether to add a new one or move one of them here, and Bookmarks shows Where you left off and the text's bookmarks, to jump to or delete. Next time the reader offers to continue where you left off: for a mitzvah's text (the prayers, candle lighting, havdalah, the Omer) on the same day only, for every other text always. Done at the end of the text marks its mitzvah, and in a mitzvah's text the settings button at the top opens the mitzvah's screen.",
      },
      {
        he: 'בהגדרות ← תפילה וסידור בוחרים נוסח, דעת זמן ק״ש (הגר״א או המגן אברהם, שקובעת מתי נגמר חלון קריאת שמע של שחרית), במניין או ביחיד, ״נוסח הסידור״ לגבר או לאישה, וגלילה. נוסח הסידור מתעדכן לפי המגדר בפרופיל: אישה קוראת את ״מודה אני״, את ברכות השחר ואת שאר הנוסחים בלשון אישה.',
        en: "Settings → Prayer and siddur sets the nusach, the Shema opinion (Gra or Magen Avraham, which decides when the morning Shema window ends), Minyan or Alone, the Siddur wording for a man or a woman, and scrolling. The siddur wording follows the gender in your profile: a woman reads Modeh Ani, the morning blessings and the other women's forms.",
      },
      {
        he: 'הסליחות יורדות כתוסף בנוסח שלך: עד שהן מותקנות, השורה בסידור, מסך המצווה ולשונית עוד מציעים להוריד אותן, ושבוע לפני תחילת העונה מופיעה גם בדף הבית הצעה להוריד. החלפת נוסח מציעה את הסליחות של הנוסח החדש.',
        en: "Selichot download as an add-on in your nusach: until it is installed, its row in the siddur, its mitzvah screen and the More tab offer the download, and a week before the season Home offers it too. Changing your nusach offers the new nusach's Selichot.",
      },
    ],
    routes: ['/(tabs)/siddur', '/siddur/[id]'],
    list: 'texts',
  },
  {
    id: 'tehillim',
    icon: 'tehillim',
    title: { he: 'תהילים ותיקון הכללי', en: 'Tehillim and Tikkun HaKlali' },
    body: [
      {
        he: 'ספר התהילים כולו הוא טקסט אחד, אותו בכל הנוסחים, שנפתח מלשונית עוד או מהקבוצה ״כללי״ בסידור. ״בחר חלק״ מציע את התפילה שלפני האמירה, את שבעת ימי השבוע של החלוקה השבועית ואת התפילה שאחרי.',
        en: 'The whole book of Tehillim is one text, the same in every nusach, opened from the More tab or the General group of the siddur. Jump to section offers the prayer before, the seven days of the weekly division and the prayer after.',
      },
      {
        he: 'התיקון הכללי פותח את הקבוצה ״כללי״ בסידור. בשניהם הקורא זוכר את המקום האחרון ומציע להמשיך ממנו בכל פתיחה, ואפשר לשמור סימניות.',
        en: 'Tikkun HaKlali leads the General group of the siddur. In both, the reader remembers where you left off and offers to continue there every time, and bookmarks can be kept.',
      },
    ],
    routes: [],
    action: {
      label: { he: 'לפתיחת תהילים', en: 'Open Tehillim' },
      href: { pathname: '/siddur/[id]', params: { id: 'tehillim' } },
    },
  },
  {
    id: 'chok',
    icon: 'chok',
    title: { he: 'חק לישראל', en: 'Chok LeYisrael' },
    body: [
      {
        he: 'חק לישראל הוא תוסף שיורד פעם אחת, כ־5 MB, ממסך המצווה או מלשונית עוד, ואחרי ההורדה הוא זמין גם בלי חיבור לאינטרנט. בסוף ההורדה האפליקציה שואלת אם להפעיל תזכורות ומעקב. כשיש גרסה חדשה של הטקסט מסך המצווה מציע לעדכן, ושם אפשר גם למחוק את התוסף.',
        en: 'Chok LeYisrael is an add-on downloaded once, about 5 MB, from its mitzvah screen or the More tab, and after that it is available without an internet connection. When the download ends, the app asks whether to turn on reminders and tracking. When there is a new version of the text, the mitzvah screen offers the update, and the add-on can be deleted there too.',
      },
      {
        he: 'הקורא מציג את הלימוד של היום מפרשת השבוע, עם שורת ימים לבחירת יום אחר, ובשבוע של פרשות מחוברות בחירה איזו פרשה ללמוד. כשהמצווה פעילה ״סיימתי״ מסמן את היום, וימים קודמים בשבוע שלא סומנו מופיעים כהשלמה מקופלת. רש״י וברטנורה מוצגים או מקופלים לפי ״עם פירושים״ או ״בלי פירושים״ בראש הקורא או בהגדרות, וכל פירוש נפתח בהקשה. בשורת הפרשה אפשר לבחור כל פרשה אחרת ולקרוא בה, בלי ״סיימתי״, ו״חזרה לפרשת השבוע״ מחזיר; סימנייה או המקום האחרון בפרשה אחרת מחזירים אליה.',
        en: "The reader shows today's portion of the week's parasha, with a row of days to pick another day and, in a double week, a choice of which parasha to learn. While the mitzvah is on, Done marks the day, and earlier unmarked days of the week appear as folded make-ups. Rashi and Bartenura show or fold by Commentary or Text only at the top of the reader or in Settings, and each one opens on tap. The parasha row picks any other parasha to read, without Done, and Back to this week's parasha returns; a bookmark or the last place in another parasha takes you back there.",
      },
      {
        he: 'המצווה פתוחה ביום הלימוד, מעלות השחר עד עלות השחר שלמחרת, ובערב שבת וחג עד הדלקת הנרות, ותזכורת ברירת המחדל שלה בשעה 09:00. ליל שישי נרשם ליום חמישי או ליום שישי, לפי מה שבוחרים ב״סיימתי״ הראשון או בהגדרות ← תפילה וסידור. הטקסט מתוך מאגר תורת אמת, ברישיון CC BY-NC-SA 2.5; הקרדיט המלא בהגדרות ← אודות ויצירת קשר.',
        en: 'The mitzvah is open for the learning day, from dawn to the next dawn, and until candle lighting before Shabbat and Yom Tov, with its default reminder at 09:00. Thursday night counts for Thursday or Friday, as you choose on the first Done or in Settings → Prayer and siddur. The text is from the Torat Emet database under CC BY-NC-SA 2.5; the full credit is in Settings → About and contact.',
      },
    ],
    routes: [],
    action: {
      label: { he: 'למסך חק לישראל', en: 'Open Chok LeYisrael' },
      href: { pathname: '/mitzvah/[id]', params: { id: 'chok_leyisrael' } },
    },
  },
  {
    id: 'history',
    icon: 'check',
    title: { he: 'מעקב, רצף וסיכום שבועי', en: 'Tracking, streak and the weekly report' },
    body: [
      {
        he: 'בלשונית מעקב, מעל שלוש לשוניות, מופיעים הרצף שלך וכמה ימים נשארו עד היעד הבא. ״סיכום״ מראה כמה סימנת היום, השבוע והחודש העברי, לוח של החודש העברי שבו כל יום צבוע לפי כמה ממנו בוצע (הקשה על יום מציגה את המצוות שלו), ועקביות ורצף לכל מצווה. הקשה על מצווה, ברשימה או בתוך יום, פותחת את המסך שלה. מצווה שהופעלה היום מסומנת ״חדש״ עד שנספר לה יום.',
        en: "The Tracking tab shows your streak and the days left to the next goal above three tabs. Summary shows how much you marked today, this week and this Hebrew month, a calendar of the Hebrew month where each day is shaded by how much of it was done (tap a day to see its mitzvot), and each mitzvah's consistency and streak. Tapping a mitzvah, in the list or inside a day, opens its screen. A mitzvah switched on today reads New until one of its days is counted.",
      },
      {
        he: '״מגמות״ מציג את 12 השבועות האחרונים, היום החזק שלך בשבוע (שבת וחג בנפרד, כי הם נסמנים בצ׳ק־אין), איך כל מצווה השתנתה לעומת 30 הימים שלפני, ואת הדוחות השבועיים. ״הישגים״ שומר את ההישגים שהשגת ואת השיאים שלך, גם אחרי שההיסטוריה הישנה נמחקת.',
        en: 'Trends shows the last 12 weeks, your strongest day of the week (Shabbat and Yom Tov apart, since they are marked in the check-in), how each mitzvah changed from the 30 days before, and the weekly reports. Achievements keeps the badges you earned and your records, even after old history is cleared.',
      },
      {
        he: 'הרצף סופר ימים רצופים שבהם סומנה מצווה אחת לפחות. יום בלי שום סימון שבו הוחמצה מצווה קוטע אותו, ושבת או חג שעוד מחכים לסימון לא קוטעים אותו.',
        en: 'The streak counts days in a row with at least one mitzvah marked. A day with nothing marked and something missed breaks it; a Shabbat or Yom Tov still waiting for its check-in does not.',
      },
      {
        he: 'דוח שבועי נפתח מרשימת הדוחות בלשונית מגמות: מה סומן, היום הכי טוב, איזו מצווה כדאי לחזק ומה מחכה בשבוע הבא, ומעבר בין השבועות. כ־45 דקות אחרי צאת השבת מגיעה התראה שהסיכום מוכן; אפשר לכבות אותה בהגדרות ← מכשיר והתראות.',
        en: 'A weekly report opens from the reports list in Trends: what was marked, the best day, which mitzvah to strengthen and what the next week holds, with buttons to move between weeks. About 45 minutes after Shabbat ends a notification says the report is ready; it can be turned off in Settings → Device and notifications.',
      },
    ],
    routes: ['/(tabs)/history', '/report'],
    action: { label: { he: 'לסיכום השבועי', en: 'Open the weekly report' }, href: '/report' },
  },
  {
    id: 'schedule',
    icon: 'calendar',
    title: { he: 'לוח הזמנים', en: 'The schedule' },
    body: [
      {
        he: 'לוח הזמנים נפתח מלשונית עוד, בתצוגת יום, שבוע או חודש, עם חיצים לקודם ולבא. תצוגת היום מציגה את זמני היום ואת המצוות לפי השעה, והקשה על מצווה פותחת אותה.',
        en: "The schedule opens from the More tab, by day, week or month, with arrows to the previous and next. The day view lists the day's zmanim and mitzvot by the hour, and tapping a mitzvah opens it.",
      },
      {
        he: 'הקשה על יום בתצוגת השבוע או החודש פותחת את המצוות של אותו יום, עם חיצים ליום הקודם ולבא ומונה של מה שבוצע. המסך הזה לקריאה בלבד: מסמנים בדף הבית, או במסך הסימון שאחרי שבת וחג.',
        en: "Tapping a day in the week or month view opens that day's mitzvot, with arrows to the previous and next day and a count of what was done. That screen is for reading: marks are made on Home, or in the check-in after Shabbat and Yom Tov.",
      },
    ],
    routes: ['/schedule', '/day/[date]'],
    action: { label: { he: 'לפתיחת לוח הזמנים', en: 'Open the schedule' }, href: '/schedule' },
  },
  {
    id: 'roshChodesh',
    icon: 'moon',
    title: { he: 'ראש חודש והילולות', en: 'Rosh Chodesh and hilulot' },
    body: [
      {
        he: 'התראות ראש חודש והתראות על הילולות צדיקים כבויות כברירת מחדל. מפעילים אותן בהגדרות ← המצוות שלי, בקבוצה ״עוד״, או במסכים שלהן.',
        en: 'Rosh Chodesh notices and hilula notices are off by default. Switch them on in Settings → My mitzvot, in the More group, or on their own screens.',
      },
      {
        he: 'בכל מסך מופיעות ההתראות לבחירה: בראש חודש התראה מוקדמת, בערב שלפני וביום עצמו, ובהילולה התראה מוקדמת ובכניסת ההילולה. כל אחת אפשר לכבות או לתזמן: בשקיעה או לפניה, או בשעה קבועה, ובהתראה המוקדמת גם כמה ימים לפני. כל עוד ההתראות פעילות נשארת לפחות אחת דלוקה. מתחת מופיעים ראשי החודשים וההילולות הקרובים. הקשה על צדיק ברשימה פותחת דף עליו, וכך גם הקשה על התראת ההילולה.',
        en: 'Each screen lists its notices: for Rosh Chodesh an early notice, the evening before and on the day; for a hilula an early notice and as it begins. Each can be turned off or timed: at or before sunset, or at a set time, and the early notice also how many days ahead. While the notices are on, at least one stays on. The coming dates are listed below. Tapping a tzaddik in the list opens a page about him, and so does tapping the hilula notice.',
      },
      {
        he: 'התראה שנופלת בשבת או בחג מופיעה בהתראה שלפני כניסתם. אלה התראות ולא מצוות, ולכן הן לא נספרות בהיסטוריה.',
        en: 'A notice that falls on Shabbat or Yom Tov is folded into the notification before it begins. These are notices, not mitzvot, so they do not count in history.',
      },
    ],
    routes: ['/rosh-chodesh', '/hilulot', '/hilula/[id]'],
    action: { label: { he: 'למסך ראש חודש', en: 'Open Rosh Chodesh' }, href: '/rosh-chodesh' },
  },
  {
    id: 'taharah',
    icon: 'user',
    title: { he: 'טהרת המשפחה', en: 'Family purity' },
    body: [
      {
        he: 'מעקב טהרת המשפחה מוצע רק למשתמשים נשואים שענו על שאלת המגדר, ומופעל בהגדרות ← פרופיל ← טהרת המשפחה. הוא עוקב אחרי הספירה, הבדיקות, ליל הטבילה ועונות הפרישה, עם תזכורות לפי זמני ההלכה.',
        en: 'Family purity tracking is offered only to married users who answered the gender question, and is switched on in Settings → Profile → Family purity. It follows the count, the bedikot, the tevila night and the onot of separation, with reminders by the halachic times.',
      },
      {
        he: 'במסך הטהרה רושמים ראייה, הפסק טהרה, בדיקות וטבילה, ורואים את המשימות של היום, את עונות הפרישה הקרובות ואת לוח החודש. בהגדרות הטהרה בוחרים מנהג, מי משתמש (אישה, או בעל שרואה רק עונות פרישה וליל טבילה), ניסוח דיסקרטי בהתראות ונעילה ביומטרית.',
        en: "The family purity screen records an onset, the hefsek tahara, bedikot and the tevila, and shows today's tasks, the coming onot and the month's calendar. Taharah settings choose the custom, who uses it (a woman, or a husband who sees only the onot and the tevila night), discreet notification wording and a biometric lock.",
      },
      {
        he: 'הנתונים נשמרים מוצפנים ואינם נכללים בגיבוי. ״מחיקת הרישומים״ מתחילה ספירה חדשה, ו״איפוס מעקב הטהרה״ מוחק גם את ההגדרות ומכבה את המעקב. האפליקציה אינה פוסקת הלכה: בכל ספק היא עוצרת את הספירה עד שרושמים את הוראת הרב.',
        en: "The data is stored encrypted and is not part of the backup. Delete the records starts a new count, and Reset family purity tracking also deletes the settings and turns tracking off. The app does not rule on halacha: on any doubt it stops the count until the rav's instruction is recorded.",
      },
    ],
    routes: ['/taharah', '/taharah/log', '/taharah/calendar', '/taharah/settings'],
    taharahOnly: true,
  },
  {
    id: 'settings',
    icon: 'sliders',
    title: { he: 'הגדרות, חיפוש, גיבוי ואיפוס', en: 'Settings: search, backup and reset' },
    body: [
      {
        he: 'בראש ההגדרות יש חיפוש: מקלידים מילה כמו ״התראות״, ״נוסח״ או ״גיבוי״ ומגיעים ישר להגדרה. החיפוש מוצא כל דבר באפליקציה: מסכים, מצוות וקטגוריות, תפילות, קטעים ומשפטים מתוכן, צדיקים לפי שמם, ספריהם או מקום קבורתם, רבני קו ההלכה, נושאי המדריך, וההישגים והנתונים שלך עם הערך שלהם. הוא סולח על הקלדה במקלדת של השפה השנייה. התוצאות הקרובות מופיעות מיד, החיפוש בתוך התפילות מצטרף אחרי רגע, ותוצאות שנמצאו רק למרות שגיאת כתיב מופיעות בנפרד, תחת ״אולי התכוונת״. אותו חיפוש נמצא גם בראש לשונית עוד, ומשם הגדרה נפתחת בהגדרות במקום שלה.',
        en: "Settings opens with a search: type a word such as “notifications”, “nusach” or “backup” to go straight to the setting. It finds anything in the app: screens, mitzvot and categories, prayers and the passages and phrases inside them, tzaddikim by name, works or grave, the rabbis of the halacha hotline, guide topics, and your badges and figures with their values. It forgives typing on the other language's keyboard. Close results show at once, the search inside the prayers joins a moment later, and results found only despite a misspelling show apart, under “Did you mean”. The same search sits at the top of the More tab, and a setting found there opens in Settings at its place.",
      },
      {
        he: 'החלקים: פרופיל (שם, טלפון, מגדר ומצב משפחתי), תפילה וסידור, מכשיר והתראות (עיר או GPS, התראות, הסיכום השבועי, ערכת נושא, גודל התצוגה ושפה), גיבוי, שחזור ואיפוס, ואודות ויצירת קשר. העיר או מיקום ה־GPS קובעים גם אם אתם בישראל או בחוץ לארץ, למשל לעניין יום טוב שני.',
        en: 'Its sections: Profile (name, phone, gender and marital status), Prayer and siddur, Device and notifications (city or GPS, notifications, the weekly report, theme, display size and language), Backup, restore and reset, and About and contact. The city or GPS location also decides whether you count as in Israel or abroad, for example for the second day of Yom Tov.',
      },
      {
        he: 'באנדרואיד ההגדרות, המצוות וההיסטוריה מגובות לחשבון Google, ובאייפון בגיבוי iCloud של המכשיר. בהגדרות ← גיבוי, שחזור ואיפוס אפשר גם לייצא קובץ גיבוי ולשחזר ממנו בכל טלפון; שחזור מחליף את מה שיש בטלפון. ״איפוס האפליקציה״ מוחק הכל, גם את נתוני הטהרה, שאינם נכללים בגיבוי.',
        en: "On Android your settings, mitzvot and history are backed up to your Google account, and on iPhone in the device's iCloud backup. Settings → Backup, restore and reset also exports a backup file and restores it on any phone; a restore replaces what is on the phone. Reset the app deletes everything, including the family purity data, which no backup holds.",
      },
    ],
    routes: ['/(tabs)/settings'],
    list: 'palettes',
  },
  {
    id: 'updates',
    icon: 'cloud',
    title: { he: 'עדכונים', en: 'Updates' },
    body: [
      {
        he: 'רוב העדכונים מגיעים לבד: האפליקציה בודקת אם יש עדכון בכל פתיחה וחזרה אליה ומורידה אותו ברקע. כשהוא מוכן מופיע הפס ״גרסה חדשה של האפליקציה מוכנה״, והקשה עליו טוענת אותה. גם כשהאפליקציה ברקע מגיעה התראה כשעדכון מוכן, כשההתראות פעילות ולא בשבת ובחג.',
        en: 'Most updates arrive by themselves: the app checks for one each time it opens or comes back, and downloads it in the background. When it is ready a strip says “A new version of the app is ready”, and tapping it loads it. Even with the app in the background, a notification says when an update is ready, while notifications are on and never on Shabbat or Yom Tov.',
      },
      {
        he: 'מספר הגרסה מופיע בהגדרות ← אודות ויצירת קשר, בצורה גרסה־מספר עדכון. מה שהשתנה בכל עדכון מופיע ב״מה חדש״ בראש המדריך הזה. שינויים שדורשים גרסה חדשה של האפליקציה מגיעים דרך החנות.',
        en: "The version number is in Settings → About and contact, as version-update number. What changed in each update is under What's new at the top of this guide. Changes that need a new version of the app come through the store.",
      },
    ],
    routes: [],
  },
  {
    id: 'about',
    icon: 'chat',
    title: { he: 'אודות ויצירת קשר', en: 'About and contact' },
    body: [
      {
        he: 'בהגדרות ← אודות ויצירת קשר: הגרסה, טופס פנייה (שם, טלפון ותוכן, שנשלחים אלינו דרך Formspree יחד עם גרסת האפליקציה וסוג המכשיר), המייל 365jew@gmail.com, וקישורים לדף התמיכה, למדיניות הפרטיות, לעמוד האפליקציה בחנות ולקרדיט של חק לישראל.',
        en: "Settings → About and contact holds the version, a contact form (name, phone and message, sent to us through Formspree with the app version and device type), the email 365jew@gmail.com, and links to the support page, the privacy policy, the app's store page and the Chok LeYisrael credit.",
      },
      {
        he: 'לשאלה הלכתית, ״קו ההלכה״ בלשונית עוד מחייג לקו לפי הנוסח שבהגדרות: קווים אשכנזיים, ולעדות המזרח קו לפי פסקי מרן, גם בוואטסאפ.',
        en: 'For a halachic question, the halacha hotline in the More tab dials a line by the nusach in Settings: Ashkenazi lines, and for Edot HaMizrach a line following Maran, by WhatsApp too.',
      },
      {
        he: 'האפליקציה אינה פוסקת הלכה. הזמנים והכללים שהיא מיישמת נמסרים לעיון רב, וכל תשובה שלו משנה את הכלל שלה. בכל ספק יש לשאול רב.',
        en: 'The app does not rule on halacha. The times and rules it applies are given to a rav for review, and each answer changes that one rule. In any doubt, ask a rav.',
      },
    ],
    routes: [],
  },
];

export const WHATS_NEW: readonly WhatsNewEntry[] = [
  {
    label: '1.0.21-4',
    date: '2026-10-27',
    items: [
      {
        he: 'החיפוש בהגדרות ובלשונית עוד מוצא עכשיו הכל: כל מסך, הגדרה, מצווה, קטגוריה, תפילה ואפילו קטע או משפט מתוכה, צדיק לפי ספריו או מקום קבורתו, רב בקו ההלכה, נושא במדריך, ההישגים והנתונים שלך עם הערך שלהם. התוצאות הקרובות מופיעות מיד, והחיפוש בתוך התפילות מצטרף אחרי רגע. תוצאות עם שגיאת כתיב מופיעות בנפרד, תחת ״אולי התכוונת״.',
        en: 'The search in Settings and in the More tab now finds everything: every screen, setting, mitzvah, category, prayer and even a passage or a phrase inside it, a tzaddik by his works or his grave, a rav of the halacha hotline, a guide topic, and your badges and figures with their values. Close results show at once and the search inside the prayers joins a moment later. Results found despite a misspelling show apart, under “Did you mean”.',
      },
    ],
  },
  {
    label: '1.0.21-3',
    date: '2026-10-26',
    items: [
      {
        he: 'לשונית מעקב חדשה, במקום ההיסטוריה: סיכום יומי, שבועי וחודשי, לוח של החודש העברי, מגמות של 12 שבועות והיום החזק שלך, הישגים ושיאים אישיים שנשמרים, והדוחות השבועיים בתוכה.',
        en: 'A new Tracking tab, in place of History: daily, weekly and monthly summaries, a Hebrew-month calendar, 12-week trends and your strongest day, achievements and personal records that are kept, and the weekly reports inside it.',
      },
      {
        he: 'התזכורות מגיעות גם כשלא פותחים את האפליקציה כמה ימים: באנדרואיד הן נקבעות לכחודש קדימה ובאייפון לכשבוע וחצי, ולפני שהן נגמרות מגיעה התראה שמזכירה לפתוח.',
        en: 'Reminders keep coming when the app is not opened for days: on Android they are set about a month ahead and on iPhone about a week and a half, and before they run out a notification reminds you to open the app.',
      },
      {
        he: 'מצפן תפילה בלשונית עוד: הכיוון לכותל מכל מקום, עם המרחק.',
        en: 'A prayer compass in the More tab: the direction of the Kotel from anywhere, with the distance.',
      },
      {
        he: 'בסידור: הכלים מתקפלים בזמן הקריאה ומשאירים כמעט את כל המסך לטקסט, וכל קבוצה בלשונית הסידור נפתחת ונסגרת, עם ברכות הסעודה מיד אחרי ״עכשיו״.',
        en: 'In the siddur: the controls fold while you read and leave almost the whole screen to the text, and each group of the Siddur tab opens and closes, with the meal blessings right after Now.',
      },
      {
        he: 'החיפוש מוצא צדיקים מרשימת ההילולות, וגם הוא וגם ההילולות נמצאים עכשיו בלשונית עוד, בנוסף להגדרות.',
        en: 'The search finds the tzaddikim of the hilulot list, and both the search and the hilulot are in the More tab too, besides Settings.',
      },
      {
        he: '23 צדיקים חדשים ברשימת ההילולות, כל אחד עם דף משלו: ספרדים, חסידים, גדולי ליטא וגדולי הדורות האחרונים, ובהם רבי חיים חורי, בבא מאיר, הבני יששכר, ר׳ ישעיה׳לה מקרעסטיר, הרמח״ל, רבי חיים מבריסק, הרב כדורי והרב שטיינמן.',
        en: 'Twenty-three more tzaddikim in the hilulot list, each with a page of his own: Sephardi, Chassidic and Lithuanian tzaddikim and gedolim of the last generations, among them Rabbi Chaim Chouri, Baba Meir, the Bnei Yissaschar, Reb Shayele of Kerestir, the Ramchal, Rabbi Chaim of Brisk, Rav Kaduri and Rav Shteinman.',
      },
      {
        he: 'האפליקציה מהירה יותר: מעברים, פתיחה וסימון מצווה בלי תקיעות, וטקסטים ארוכים נפתחים מהר יותר.',
        en: 'The app is faster: moving between screens, opening and marking a mitzvah without stalls, and long texts open faster.',
      },
    ],
  },
  {
    label: '1.0.21-2',
    date: '2026-10-25',
    items: [
      {
        he: 'מצוות חדשות עם תזכורות בזמנן: קריאת שמע על המיטה, קידוש לבנה, סליחות, נרות חנוכה ואושפיזין. הן מופעלות מעצמן (קידוש לבנה לגברים), ואפשר לכבות כל אחת בהגדרות ← המצוות שלי.',
        en: 'New mitzvot with reminders in their time: the Bedtime Shema, Kiddush Levana, Selichot, Chanukah candles and Ushpizin. They are switched on for you (Kiddush Levana for men), and each can be turned off in Settings → My mitzvot.',
      },
      {
        he: 'ערבית פתוחה כל הלילה עד עלות השחר, וברכות השחר עד חצות היום.',
        en: 'Maariv stays open all night until dawn, and Birchot HaShachar until midday.',
      },
      {
        he: 'תזכורות גמישות: לכל מצווה כמה תזכורות שרוצים, לפני תחילת הזמן (עד שלוש שעות), בתחילתו או אחריה, לפני סופו או בשעה קבועה, ובחירה ברורה של ״מתי לשלוח״ וכמה דקות. מצווה פעילה נשארת תמיד עם תזכורת אחת לפחות.',
        en: 'Flexible reminders: as many as you like on any mitzvah, before the start (up to three hours), at the start or after it, before the end or at a set time, with a clear choice of when to send and how many minutes. A mitzvah that is on always keeps at least one reminder.',
      },
      {
        he: 'מצוות אישיות: תזמון של ימים קבועים בשבוע, טווח מתאריך עד תאריך או מספר ימים ברצף, ותזכורת אחרי סוף הזמן אם המצווה עוד לא סומנה.',
        en: 'Custom mitzvot: schedule them on set weekdays, from date to date or for a run of days, with a reminder after the end if the mitzvah is not marked yet.',
      },
      {
        he: 'המצוות שלי מסודרות לפי קבוצות, עם כפתור הוספה קבוע בתחתית, ומשתמשים חדשים בוחרים בהרשמה את המצוות שרוצים לעקוב אחריהן.',
        en: 'My mitzvot is grouped by kind, with an add button fixed at the bottom, and new users choose which mitzvot to track during setup.',
      },
      {
        he: 'נוסח הסידור לגבר או לאישה, לפי המגדר בפרופיל: מודה אני, ברכות השחר, הריני מוכנה ושאר הנוסחים לאישה, בכל ארבעת הנוסחים.',
        en: "The siddur in a man's or a woman's wording, following the gender in your profile: Modeh Ani, the morning blessings, the feminine forms and the rest of the women's wording, in all four nusachim.",
      },
      {
        he: 'סימניות בסידור, והמקום האחרון: הקורא מציע להמשיך מהמקום שבו עצרתם.',
        en: 'Bookmarks in the siddur, and the last place you read: the reader offers to continue where you left off.',
      },
      {
        he: 'כל נוסח בסידור נפתח תמיד: נוסח שלא אומרים היום, כמו נרות חנוכה או סליחות, נפתח בנוסח של היום הבא שבו אומרים אותו, ותפילה שהזמן שלה עבר היום נפתחת בנוסח של היום. בלשונית הסידור נוספה קבוצת מצוות קבועה, ובנוסח של מצווה יש כפתור להגדרות שלה.',
        en: "Every siddur text opens at any time: a text not said today, such as the Chanukah candles or Selichot, opens in the text of the next day it is said, and a prayer whose time has passed today opens in today's text. The Siddur tab has a fixed Mitzvot group, and a mitzvah's text has a button to its settings.",
      },
      {
        he: 'החיפוש בהגדרות מוצא גם מצוות, תפילות ופרקים בסידור.',
        en: 'The search in Settings also finds mitzvot, prayers and sections of the siddur.',
      },
      {
        he: 'חק לישראל: נשמר דחוס, כ־5 MB במכשיר, אפשר לקרוא כל פרשה, רש״י וברטנורה עם פירושים או בלי לבחירה, ליל שישי נרשם לחמישי או לשישי לבחירתכם, ואחרי ההורדה מוצע להפעיל את המצווה.',
        en: 'Chok LeYisrael: stored compressed, about 5 MB on the phone, any parasha can be read, Rashi and Bartenura shown or not as you choose, Thursday night counted for Thursday or Friday as you choose, and right after the download an offer to turn the mitzvah on.',
      },
      {
        he: 'הסליחות יורדות כתוסף בנוסח שלך, ולפני העונה מופיעה בדף הבית הצעה להוריד אותן.',
        en: 'Selichot are a download in your nusach, and before the season Home offers to download them.',
      },
      {
        he: 'התראות ראש חודש והילולות: אפשר לכבות כל התראה ולבחור את היום והשעה שלה, והנוסח שלהן מתאים לזמן שבו הן מגיעות.',
        en: 'Rosh Chodesh and hilula notices: turn any of them off and choose its day and time, and their wording fits when they arrive.',
      },
      {
        he: 'בהגדרות: גיבוי, שחזור ואיפוס במקום אחד, ו״אודות ויצירת קשר״ עם הגרסה, קישורים לאתר, למדיניות הפרטיות ולחנות, והקרדיט של חק לישראל.',
        en: 'In Settings: backup, restore and reset in one place, and About and contact with the version, links to the site, the privacy policy and the store, and the Chok LeYisrael credit.',
      },
      {
        he: 'חמש ערכות הנושא הנוספות עוצבו מחדש, עם צבעים קריאים יותר.',
        en: 'The five other themes were redesigned with more readable colours.',
      },
      {
        he: 'באייפון: שמות הימים והחודשים מוצגים נכון, גם בהתראות, סרגל הלשוניות יושב בתחתית, ומסך ריק במעבר בין לשוניות תוקן.',
        en: 'On iPhone: day and month names show correctly, in notifications too, the tab bar sits at the bottom, and the blank page between tabs is fixed.',
      },
      {
        he: 'תיקונים: מצווה אישית בשעות הלילה נספרת ליום אחד בכל מקום, מצווה שהופעלה היום לא מוצגת כ־0% בהיסטוריה, והיסט שהוקלד בטעות בעורך התזכורות נדחה במקום להישמר כאפס.',
        en: 'Fixes: a custom mitzvah set at night counts on one day everywhere, a mitzvah switched on today no longer reads 0% in history, and a mistyped reminder offset is refused instead of being saved as zero.',
      },
      {
        he: 'דף לכל צדיק ברשימת ההילולות: קורות חיים, מה אפשר ללמוד, ספרים וחיבורים, סיפור וניווט ב־Waze למקום הקבורה. הקשה על הצדיק ברשימה או על ההתראה פותחת אותו.',
        en: 'A page for every tzaddik of the hilulot list: his life, what we can learn, his books, a story and Waze directions to the burial place. Tap the tzaddik in the list, or the notice, to open it.',
      },
      {
        he: 'גודל התצוגה: בהגדרות ← מכשיר והתראות אפשר להקטין או להגדיל את כל האפליקציה, טקסט, כפתורים ומרווחים, מ־80% עד 120%.',
        en: 'Display size: in Settings → Device and notifications the whole app can be made smaller or larger, text, buttons and spacing, from 80% to 120%.',
      },
      {
        he: 'המדריך הזה: הסבר על כל חלק באפליקציה, ומה חדש בכל עדכון.',
        en: "This guide: every part of the app explained, and what's new in each update.",
      },
    ],
  },
];

export function latestWhatsNew(entries: readonly WhatsNewEntry[] = WHATS_NEW, count = GUIDE_WHATS_NEW_SHOWN) {
  return entries.slice(0, count);
}

export function whatsNewHeading(entry: WhatsNewEntry, language: AppLanguage): string {
  const date = formatDate(DateTime.fromISO(entry.date), language === 'he' ? 'd LLLL yyyy' : 'LLL d, yyyy', language);
  return translate('guide.whatsNewEntry', { label: entry.label, date }, language, null);
}

export function visibleGuideTopics(taharahVisible: boolean): readonly GuideTopic[] {
  return GUIDE_TOPICS.filter((topic) => taharahVisible || !topic.taharahOnly);
}

export function guideList(kind: GuideListKind, language: AppLanguage, nusach: Nusach | null): GuideList {
  const tr = (key: string) => translate(key, undefined, language, null);
  if (kind === 'mitzvot') {
    const groups = LIBRARY_GROUPS.filter((group) => group !== 'mine')
      .map((group) => ({
        key: group,
        label: tr(`library.group.${group}`),
        items: MITZVOT.filter(
          (mitzvah) => mitzvah.group === group && (nusach === null || mitzvah.nuschaotSupported.includes(nusach)),
        ).map((mitzvah) => mitzvahName(mitzvah, language)),
      }))
      .filter((group) => group.items.length > 0);
    return { kind, title: tr('guide.list.mitzvot'), groups };
  }
  if (kind === 'texts') {
    const groups = SIDDUR_GROUPS.map((group) => ({
      key: group,
      label: tr(`siddur.group.${group}`),
      items: standaloneTextsIn(group, nusach ?? undefined).map((id) => STANDALONE_TEXTS[id].name[language]),
    }));
    return { kind, title: tr('guide.list.texts'), groups };
  }
  const items = THEME_NAMES.map((name) => tr(`settings.theme.${name}`));
  return { kind, title: tr('guide.list.palettes'), groups: [{ key: 'palettes', label: null, items }] };
}
