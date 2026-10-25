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
        he: 'בתחתית המסך חמש לשוניות: עוד, סידור, בית, היסטוריה והגדרות. בלשונית עוד נמצאים לוח הזמנים, חק לישראל, תהילים, קו ההלכה והמדריך הזה, ואפשר לפתוח אותו גם מהגדרות ← אודות ויצירת קשר או לחפש ״מדריך״ בחיפוש שבהגדרות.',
        en: 'Five tabs sit at the bottom: More, Siddur, Home, History and Settings. More holds the schedule, Chok LeYisrael, Tehillim, the halacha hotline and this guide, which also opens from Settings → About and contact or by searching “guide” in Settings.',
      },
    ],
    routes: ['/(tabs)/more', '/guide'],
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
        he: 'תזכורת נשלחת מתחילת הזמן, לפני סוף הזמן או בשעה קבועה, ואפשר להקדים אותה עד שלוש שעות לפני שהזמן נפתח. ״דלג אם כבר סומן״ מוותר עליה כשהמצווה כבר סומנה. במצווה אישית יש גם ״אחרי הסוף, אם לא בוצע״, ובקידוש לבנה ״במוצאי שבת וחג״.',
        en: 'A reminder goes out from the start of the window, before its end or at a set time, and can come up to three hours before the window opens. Skip if already done drops it once the mitzvah is marked. A custom mitzvah also offers After the end, if not done, and Kiddush Levana offers After Shabbat and Yom Tov.',
      },
      {
        he: 'מצווה פעילה נשארת תמיד עם תזכורת אחת לפחות: את האחרונה אי אפשר למחוק, והפעלה של מצווה בלי תזכורות מבקשת קודם להגדיר אחת.',
        en: 'A mitzvah that is on always keeps at least one reminder: the last one cannot be deleted, and switching on a mitzvah with none asks you to set one first.',
      },
      {
        he: 'בהתראה עצמה ״עשיתי״ מסמן את המצווה בלי לפתוח את האפליקציה, ו״פתח נוסח״ פותח את הנוסח כשיש כזה. הקשה על ההתראה פותחת את הנוסח, או את מסך המצווה כשאין לה נוסח. באנדרואיד כדאי לפטור את האפליקציה מחיסכון בסוללה בהגדרות ← מכשיר והתראות, כדי שהתזכורות יגיעו בזמן.',
        en: "In the notification, Done marks the mitzvah without opening the app, and Open text opens its text when it has one. Tapping the notification opens the text, or the mitzvah's screen when there is none. On Android, exempt the app from battery saving in Settings → Device and notifications so reminders arrive on time.",
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
        he: '״הוסף מצווה חדשה״ בתחתית המסך יוצר מצווה אישית: שם, שעות (שעת סיום מוקדמת משעת ההתחלה נמשכת עד למחרת), ותזמון לפי ימי השבוע, לפי טווח תאריכים ביומן או לכמה ימים ברצף. בוחרים אם לדלג בשבת וביום טוב, ומוסיפים תזכורות ותוכן עשיר: טקסט, ברכה, קישור או טקסט מהסידור. כשהטווח או הרצף מסתיימים המצווה נכבית, וההיסטוריה שלה נשמרת.',
        en: 'Add custom mitzvah at the bottom of the screen creates your own mitzvah: a name, hours (an end before the start runs into the next day), and a schedule by weekdays, by a date range picked on a calendar or for a number of days in a row. You choose whether to skip it on Shabbat and Yom Tov, and add reminders and rich content: text, a blessing, a link or a text from the siddur. When its range or streak ends it switches off, and its history is kept.',
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
        he: 'בלשונית סידור מופיעים קודם הטקסטים שהזמן שלהם פתוח עכשיו, אחר כך התפילות (שחרית, מנחה וערבית), ואחריהן הברכות והתפילות לפי קבוצות. טקסט שלא נאמר היום מופיע באפור, עם הזמן שבו הוא נאמר. כל טקסט מותאם ליום: הלל, מוסף ותוספות כמו יעלה ויבוא מופיעים בימים שלהם.',
        en: "The Siddur tab starts with the texts whose time is open now, then the prayers (Shacharit, Mincha and Maariv), then blessings and prayers by group. A text not said today is greyed out, with when it is said. Each text is set for the day: Hallel, Musaf and inserts such as Ya'aleh VeYavo appear on their days.",
      },
      {
        he: 'בראש הקורא: ״בחר חלק״ לקפיצה לחלק אחר, במניין או ביחיד בתפילות שיש בהן קטעים למניין (ביחיד, קדיש, ברכו, קדושה וקריאת התורה מקופלים), הגדלה והקטנה של הטקסט, וגלילה אוטומטית במהירות שבוחרים. קטע מקופל נפתח בהקשה. כשהאפליקציה באנגלית, מתחת לעברית מופיע התרגום, כשיש למקור תרגום.',
        en: "At the top of the reader: Jump to section, Minyan or Alone in prayers with minyan passages (Alone folds Kaddish, Barchu, Kedusha and the Torah reading), larger and smaller text, and auto-scroll at the speed you choose. A folded passage opens on tap. When the app is in English, the source's translation appears under the Hebrew where it has one.",
      },
      {
        he: 'כפתור הכוכב שומר את המקום הנוכחי כסימנייה, ו״סימניות״ מציג את ״המקום האחרון״ ואת הסימניות של הטקסט, לקפיצה או למחיקה. בפתיחה הבאה הקורא מציע להמשיך מהמקום שבו עצרתם: בטקסט של מצווה (התפילות, הדלקת נרות, הבדלה וספירת העומר) רק באותו יום, ובשאר הטקסטים תמיד. ״סיימתי״ בסוף הטקסט מסמן את המצווה.',
        en: "The star button saves the current place as a bookmark, and Bookmarks shows Where you left off and the text's bookmarks, to jump to or delete. Next time the reader offers to continue where you left off: for a mitzvah's text (the prayers, candle lighting, havdalah, the Omer) on the same day only, for every other text always. Done at the end of the text marks its mitzvah.",
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
        he: 'הקורא מציג את הלימוד של היום מפרשת השבוע, עם שורת ימים לבחירת יום אחר, ובשבוע של פרשות מחוברות בחירה איזו פרשה ללמוד. כשהמצווה פעילה ״סיימתי״ מסמן את היום, וימים קודמים בשבוע שלא סומנו מופיעים כהשלמה מקופלת. רש״י וברטנורה מקופלים או פתוחים לפי ״פירושים״ בראש הקורא או בהגדרות, וכל פירוש נפתח בהקשה.',
        en: "The reader shows today's portion of the week's parasha, with a row of days to pick another day and, in a double week, a choice of which parasha to learn. While the mitzvah is on, Done marks the day, and earlier unmarked days of the week appear as folded make-ups. Rashi and Bartenura are folded or open by Commentaries at the top of the reader or in Settings, and each one opens on tap.",
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
    title: { he: 'היסטוריה, רצף וסיכום שבועי', en: 'History, streak and the weekly report' },
    body: [
      {
        he: 'בלשונית היסטוריה: הרצף, כמה ימים נשארו עד היעד הבא, 30 הימים האחרונים ועקביות לפי מצווה. הקשה על יום פותחת את המצוות של אותו יום, והקשה על מצווה פותחת את המסך שלה. מצווה שהופעלה היום מסומנת ״חדש״ עד שנספר לה יום.',
        en: "The History tab shows your streak, the days left to the next goal, the last 30 days and consistency by mitzvah. Tapping a day opens that day's mitzvot, and tapping a mitzvah opens its screen. A mitzvah switched on today reads New until one of its days is counted.",
      },
      {
        he: 'הרצף סופר ימים רצופים שבהם סומנה מצווה אחת לפחות. יום בלי שום סימון שבו הוחמצה מצווה קוטע אותו, ושבת או חג שעוד מחכים לסימון לא קוטעים אותו.',
        en: 'The streak counts days in a row with at least one mitzvah marked. A day with nothing marked and something missed breaks it; a Shabbat or Yom Tov still waiting for its check-in does not.',
      },
      {
        he: '״דוחות״ פותח את הסיכום השבועי: מה סומן, היום הכי טוב, איזו מצווה כדאי לחזק ומה מחכה בשבוע הבא, ומעבר בין השבועות. כ־45 דקות אחרי צאת השבת מגיעה התראה שהסיכום מוכן; אפשר לכבות אותה בהגדרות ← מכשיר והתראות.',
        en: 'Reports opens the weekly report: what was marked, the best day, which mitzvah to strengthen and what the next week holds, with buttons to move between weeks. About 45 minutes after Shabbat ends a notification says the report is ready; it can be turned off in Settings → Device and notifications.',
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
        he: 'בכל מסך מופיעות ההתראות לבחירה: בראש חודש התראה מוקדמת, בערב שלפני וביום עצמו, ובהילולה התראה מוקדמת ובכניסת ההילולה. כל אחת אפשר לכבות או לתזמן: בשקיעה או לפניה, או בשעה קבועה, ובהתראה המוקדמת גם כמה ימים לפני. כל עוד ההתראות פעילות נשארת לפחות אחת דלוקה. מתחת מופיעים ראשי החודשים וההילולות הקרובים.',
        en: 'Each screen lists its notices: for Rosh Chodesh an early notice, the evening before and on the day; for a hilula an early notice and as it begins. Each can be turned off or timed: at or before sunset, or at a set time, and the early notice also how many days ahead. While the notices are on, at least one stays on. The coming dates are listed below.',
      },
      {
        he: 'התראה שנופלת בשבת או בחג מופיעה בהתראה שלפני כניסתם. אלה התראות ולא מצוות, ולכן הן לא נספרות בהיסטוריה.',
        en: 'A notice that falls on Shabbat or Yom Tov is folded into the notification before it begins. These are notices, not mitzvot, so they do not count in history.',
      },
    ],
    routes: ['/rosh-chodesh', '/hilulot'],
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
        he: 'בראש ההגדרות יש חיפוש: מקלידים מילה כמו ״התראות״, ״נוסח״ או ״גיבוי״ ומגיעים ישר להגדרה. החיפוש מוצא גם מצוות, טקסטים בסידור ופרקים בתוכם, וסולח על שגיאות הקלדה ועל הקלדה במקלדת של השפה השנייה.',
        en: "Settings opens with a search: type a word such as “notifications”, “nusach” or “backup” to go straight to the setting. It also finds mitzvot, siddur texts and the sections inside them, and forgives typos and typing on the other language's keyboard.",
      },
      {
        he: 'החלקים: פרופיל (שם, טלפון, מגדר ומצב משפחתי), תפילה וסידור, מכשיר והתראות (עיר או GPS, התראות, הסיכום השבועי, ערכת נושא ושפה), גיבוי, שחזור ואיפוס, ואודות ויצירת קשר. העיר או מיקום ה־GPS קובעים גם אם אתם בישראל או בחוץ לארץ, למשל לעניין יום טוב שני.',
        en: 'Its sections: Profile (name, phone, gender and marital status), Prayer and siddur, Device and notifications (city or GPS, notifications, the weekly report, theme and language), Backup, restore and reset, and About and contact. The city or GPS location also decides whether you count as in Israel or abroad, for example for the second day of Yom Tov.',
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
        he: 'תזכורות גמישות: לכל מצווה כמה תזכורות שרוצים, מתחילת הזמן, לפני סופו או בשעה קבועה, ואפילו עד שלוש שעות לפני שהזמן נפתח. מצווה פעילה נשארת תמיד עם תזכורת אחת לפחות.',
        en: 'Flexible reminders: as many as you like on any mitzvah, from the start, before the end or at a set time, even up to three hours before the window opens. A mitzvah that is on always keeps at least one reminder.',
      },
      {
        he: 'מצוות אישיות: תזמון לפי ימי השבוע, לפי טווח תאריכים ביומן או לכמה ימים ברצף, ותזכורת אחרי סוף הזמן אם המצווה עוד לא סומנה.',
        en: 'Custom mitzvot: schedule them by weekdays, by a date range on a calendar or for a number of days in a row, with a reminder after the end if the mitzvah is not marked yet.',
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
        he: 'החיפוש בהגדרות מוצא גם מצוות, תפילות ופרקים בסידור.',
        en: 'The search in Settings also finds mitzvot, prayers and sections of the siddur.',
      },
      {
        he: 'חק לישראל: נשמר דחוס, כ־5 MB במכשיר, רש״י וברטנורה מקופלים או פתוחים לבחירה, ליל שישי נרשם לחמישי או לשישי לבחירתכם, ואחרי ההורדה מוצע להפעיל את המצווה.',
        en: 'Chok LeYisrael: stored compressed, about 5 MB on the phone, Rashi and Bartenura folded or open as you choose, Thursday night counted for Thursday or Friday as you choose, and right after the download an offer to turn the mitzvah on.',
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
        he: 'בהגדרות: גיבוי, שחזור ואיפוס במקום אחד, ו״אודות ויצירת קשר״ עם הגרסה וקישורים לאתר, למדיניות הפרטיות ולחנות.',
        en: 'In Settings: backup, restore and reset in one place, and About and contact with the version and links to the site, the privacy policy and the store.',
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
