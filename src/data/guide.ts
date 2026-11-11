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
  | 'halacha'
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
        he: 'בפתיחה הראשונה האפליקציה שואלת כמה שאלות קצרות: שם וטלפון, מגדר ומצב משפחתי (על כל אלה אפשר לדלג, והתשובות נשמרות רק במכשיר), נוסח התפילה, אחרי אילו מצוות לעקוב, והמקום לחישוב הזמנים: עם אישור גישה למיקום, המיקום מתעדכן לבד בכל פתיחה של האפליקציה, כך שהזמנים תמיד של המקום שבו הטלפון נמצא; בלי אישור, בוחרים כל יישוב בישראל או כל עיר בעולם בחיפוש לפי שם, והזמנים נשארים לפיו. אחר כך מסך הרשאות שמראה מה כבר מאושר ומאפשר לאשר את השאר. אחרי אישור ההתראות מצוות היום כבר מחכות בדף הבית.',
        en: "The first time the app opens it asks a few short questions: name, phone, gender and marital status (all optional, and the answers stay on the device), your nusach, which mitzvot to track, and the place for the zmanim: with location access allowed, the location updates itself every time the app opens, so the times are always those of where the phone is; without it, you pick any locality in Israel or any city in the world by searching its name, and the times stay with it. Then comes a permissions screen that shows what is already allowed and lets you allow the rest. Once notifications are allowed, today's mitzvot are waiting on Home.",
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
        he: 'מצפן התפילה בלשונית עוד הוא רדאר: קו סריקה מסתובב, והכותל נדלק כנקודה במרחק שלו ובכיוון שלו ביחס לטלפון. מתחתיו כתוב כמה מעלות לסובב ולאיזה צד, המרחק בקילומטרים והכיוון מהצפון, וכשהטלפון פונה לכותל הוא נצבע ירוק ומגיע רטט קצר. הוא צריך הרשאת מיקום, ובלעדיה הוא מבקש אותה. הכיוון מחושב מהמקום שבו אתה עומד, וכשהמיקום לא נמצא המסך אומר זאת, מחשב לפי העיר שבהגדרות ומאפשר לנסות שוב. כשהמצפן מבקש כיול, מזיזים את הטלפון בצורת שמונה. אפשר לפתוח אותו גם מכפתור ״מצפן תפילה״ שמופיע בסידור לפני כל תפילת עמידה בשחרית, במוסף, במנחה ובערבית. כשנכנסים אליו מתפילה ופונים לכותל, מופיע בתחתית כפתור ״המשך לתפילה״.',
        en: 'The prayer compass in the More tab is a radar: a sweep line turns and the Kotel lights up as a point at its distance and direction from the phone. Under it the screen says how many degrees to turn and which way, the distance in kilometres and the bearing from north, and when the phone faces the Kotel it turns green with a short vibration. It needs the location permission and asks for it when missing. The direction is measured from where you stand; when your location is not found the screen says so, measures from the city in Settings and lets you try again. When it asks for calibration, move the phone in a figure eight. It also opens from the “Prayer compass” button the siddur shows before every Amidah of Shacharit, Musaf, Mincha and Maariv. Opened from a prayer, it shows a “Continue to the prayer” button at the bottom once you face the Kotel.',
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
        he: 'בראש דף הבית עיגול אחד של היום והלילה: השמש נעה על חציו העליון מעלות השחר ועד צאת הכוכבים, והירח על חציו התחתון עד עלות השחר הבאה, לפי זמני לוח אור החיים במיקום שנבחר. השמיים משנים את צבעם מעלות השחר ועד הלילה, ומתחת לעיגול כרטיס זכוכית שקוף בגוון של השמיים שמאחוריו, עם מסגרת דקה, שמשתנה עם השעה ועם התצוגה המקדימה, עם שלוש לשוניות: ״היום״ (מה מיוחד היום, מה מוסיפים בתפילה, תהילים היום, וגם מה שהלוח למד מהסימונים שלך, מסומן ב-✦), ״השבוע״ (הפרשה, כניסת השבת ויציאתה, שבת מברכים עם המולד ומה בא השבוע) ו״שלי״ (מה שבחרת ב-⋯). הלוח פותח לבד את הכרטיס שהכי חשוב עכשיו, ולחיצה על לשונית שומרת את הבחירה שלך. מתחתיו קרוסלת הזמנים: הזמנים הבאים ראשונים, יחד עם הדלקת נרות, נרות חנוכה וסוף הצום; בלילה זמני מחר; והזמנים שעברו בסוף. הזמן החשוב מתמלא ומראה כמה זמן נשאר, ולזמנים אחרים שרצים יחד יש פס דק, ונגיעה בהם מציגה את ההתקדמות שלהם. ב-+ שבסוף הקרוסלה עורכים את הזמנים שבה: מסירים זמן, מוסיפים זמנים שהעיגול לא מראה, כמו מנחה קטנה, ומסמנים מועדפים בכוכב, גם בלחיצה ארוכה על זמן בקרוסלה. מועדף עומד ראשון בקרוסלה בזמן הבא שלו, גם אם זה מחר, ו״שלי״ מראה כמה נשאר עד המועדף הבא. אותה רשימה נמצאת גם בהגדרות ← זמני הלכה; כברירת מחדל כל זמני העיגול מוצגים. גרירת השמש או הירח סביב כל העיגול, מהיום אל הלילה ומהלילה אל הבוקר, תמיד בתוך אותו יום, או הקשה על זמן בקרוסלה, מציגה את העיגול בשעה אחרת, ו״חזרה לעכשיו״ מחזיר אותו. הרשימות שמתחת נשארות בזמן אמת.',
        en: "At the top of Home is one circle for the day and the night: the sun moves along its upper half from dawn to nightfall and the moon along its lower half until the next dawn, by the zmanim of the Ohr HaChaim luach at the location you chose. The sky changes colour from dawn to night, and under the circle is a see-through glass card in the colour of the sky behind it, with a thin edge, that follows the hour and the preview, with three tabs: Today (what is special today, what the prayer adds, today's Tehillim, and what the board learned from your marks, marked ✦), This week (the parasha, Shabbat's start and end, Shabbat Mevarchim with the molad and what comes this week) and Mine (what you chose in ⋯). The board opens the card that matters most by itself, and tapping a tab keeps your choice. Under it is the carousel of times: the coming times first, with candle lighting, the Chanukah candles and the end of a fast among them; tomorrow's at night; the past ones last. The time that matters fills and shows how long is left, other times running at the same moment carry a thin bar, and touching one shows its progress. The + at the end of the carousel edits its times: remove a time, add times the circle does not show, such as Mincha Ketana, and star favourites, also with a long press on a time in the carousel. A favourite leads the carousel at its next time, tomorrow's too, and Mine shows how long until the next favourite. The same list is in Settings → Halachic times; by default every time of the circle shows. Drag the sun or the moon all the way around the circle, from the day into the night and from the night into the morning, always within the same day, or tap a time in the carousel, to see the circle at another time; Back to now returns it. The lists below stay live.",
      },
      {
        he: '״פתוח עכשיו״ מציג כל מצווה שהזמן שלה פתוח, עם טבעת של הזמן שנותר ושעות ההתחלה והסוף. ״עשיתי״ מסמן אותה כבוצעה ומבטל את שאר ההתראות שלה לאותו יום, ו״פתח נוסח״ פותח את הנוסח בסידור. תחת ״הודעות״ מופיע מה שדורש תשומת לב, כמו סימון אחרי שבת או מיקום שלא אושר, וגם הרצף, השבת הקרובה (מליל חמישי), ראש חודש, והילולות כשההתראות עליהן פועלות. כשאין מצווה פתוחה, ההודעות מופיעות במקום ״פתוח עכשיו״.',
        en: 'Open now shows every mitzvah whose time is open, with a ring of the time left and its start and end. Done marks it done and cancels its other notifications for that day, and Open text opens its text in the siddur. Messages shows what needs attention, such as the check-in after Shabbat or a location that was not allowed, along with your streak, the coming Shabbat (from Thursday night), Rosh Chodesh, and hilulot when their notices are on. When no mitzvah is open, the messages take the place of Open now.',
      },
      {
        he: '״היום שלי״ מסדר את כל מצוות היום: מה שעוד פתוח, אחר כך מה שבוצע ובסוף מה שפוספס, בשלוש תצוגות לבחירה, טבעות, כרטיסים או ציר, והבחירה נשמרת. מצווה שפוספסה אפשר לסמן עד סוף היום, ו״בטל״ מחזיר סימון. הקשה על מצווה פותחת את המסך שלה, ולחיצה ארוכה פותחת פעולות מהירות: ״פרטים״ או ״דלג היום״.',
        en: "My day lists all of today's mitzvot: what is still open, then what is done and last what was missed, in three views you can choose, Rings, Cards or Timeline, and your choice is kept. A missed mitzvah can still be marked until the day ends, and Undo takes a mark back. Tap a mitzvah to open its screen; a long press opens quick actions: Details or Skip today.",
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
        he: 'במסך של כל מצווה מופיעים חלון הזמן של היום, ההתראה הבאה ורשימת התזכורות לפי סדר השליחה, ולצד כל אחת מתי היא תישלח בפעם הבאה. ״הוסף תזכורת״ מוסיף עוד אחת, וכל שינוי בתזכורות או בנודניקים פותח בציר ההתראות את ״איפוס ציר ההתראות״, שמחזיר את התזכורות המקוריות ואת הנודניק החכם. כל תזכורת כותבת גם כמה זמן נשאר ועד מתי הזמן: באייפון מתחת לכותרת, ובאנדרואיד בשורה הראשונה של התוכן. לכל מצווה יש בדיוק התראה אדומה אחת, הזמן האחרון, שנפתחת ב־❗, ואחת כתומה לפניה שנפתחת ב־⚠️ (בתפילה הזמן האחרון במניין, במצוות הלילה ״לכתחילה עד חצות״, ובשאר המצוות 15 דקות לפני האדומה), בכל טלפון; כל השאר רגילות. באנדרואיד שמציג את צבע ההתראה, הסמל ירוק, כתום בכתומה ואדום באדומה.',
        en: "Each mitzvah's screen shows today's time window, the next notification and its reminders in the order they go out, each with when it fires next. Add reminder adds one more, and any change to the reminders or the nags opens Reset notification timeline on the timeline, which brings back the original reminders and the smart nag. Every reminder also says how long is left and until when the time lasts: on the iPhone under its title, and on Android in the first line of its content. Each mitzvah has exactly one red notification, the last time, which opens with ❗, and one orange before it that opens with ⚠️ (for a prayer the last time with a minyan, for a night mitzvah “ideally before midnight”, for any other mitzvah 15 minutes before the red one), on every phone; all the rest are plain. On Android phones that show the notification colour, the icon is green, orange on the orange one and red on the red one.",
      },
      {
        he: 'ב״מתי לשלוח״ בוחרים מתי התזכורת נשלחת: לפני תחילת הזמן (עד שלוש שעות לפני), בתחילת הזמן או אחריה, לפני סוף הזמן או בשעה קבועה, ומתחת קובעים כמה דקות. ״דלג אם כבר סומן״ מוותר עליה כשהמצווה כבר סומנה. במצווה אישית יש גם ״אחרי סוף הזמן, אם לא סימנת״, ובקידוש לבנה ״אחרי צאת שבת או חג״.',
        en: 'In When to send you choose when the reminder goes out: before the time starts (up to three hours before), at the start or after it, before the time ends or at a set time, and below it how many minutes. Skip if already done drops it once the mitzvah is marked. A custom mitzvah also offers After the end, if not marked, and Kiddush Levana offers After Shabbat or Yom Tov ends.',
      },
      {
        he: 'כל תזכורת נשלחת פעם אחת, כפי שהוגדרה. בנוסף, לכל מצווה יש ״הזמן האחרון להתחיל״: סוף הזמן פחות הזמן שלוקח לקיים אותה (שחרית 20 דקות ביחיד ו־45 במניין, מנחה וערבית 10 ביחיד ו־20 במניין, קריאת שמע ותפילין 5, חק לישראל 15, ובמצווה אישית מה שקבעתם בטופס). בתפילה נשלחות שתי התראות כאלה, במניין וביחיד, בכל רמה. בכל רמה נשלחת גם התראה כשנכנסים לזמן הקריטי של המצווה, ורמת הנודניקיות מוסיפה בו התראות: עדין אחת, בינוני שתיים ונודניק שלוש. ביום הזמן הקריטי הוא השליש האחרון של הזמן (במצווה אישית לכל היותר 3 השעות האחרונות, ובשעות שעוברות את חצות הלילה כמו ערבית); בערבית ובספירת העומר מתחילת הזמן ועד חצות; בקריאת שמע על המיטה השעתיים שלפני חצות, אחרי התזכורת של 21:00; בחנוכה השעה הראשונה של ההדלקה. במצוות הלילה ההתראה הכתומה היא ״לכתחילה עד חצות״, ובין חצות לעלות השחר נשלחת רק ההתראה האדומה, הזמן האחרון באמת, חצי שעה לפני עלות השחר. הניסוח לפי המצווה: ״הזמן האחרון להניח״, ״לכתחילה לספור עד חצות״ וכדומה. בין שתי התראות של אותה מצווה יש לפחות 10 דקות, ושום דבר לא נשלח אחרי ״עשיתי״, בשבת ובחג, או בשעות השקטות. בוחרים את הרמה בהגדרות ← מכשיר והתראות, ובמסך של כל מצווה אפשר לקבוע לה רמה משלה. בדף הבית, ליד שם של מצווה שקבעתם לה רמה שונה מזו של האפליקציה, או שהזזתם בה נודניק ביד, יש פעמון קטן ובתוכו כמה התראות היא שולחת בסך הכול בזמן שלה.',
        en: 'Each reminder goes out once, as set. On top of that, every mitzvah has a “last time to start”: the end of its time less the time it takes (Shacharit 20 minutes alone and 45 with a minyan, Mincha and Maariv 10 alone and 20 with a minyan, the Shema and tefillin 5, Chok LeYisrael 15, and a custom mitzvah what its form says). A prayer sends two of these, with a minyan and alone, at every level. At every level a notification also goes out when the mitzvah’s critical time begins, and the nagging level adds notifications in it: Gentle one, Medium two and Nagging three. By day the critical time is the last third of the time (for a custom mitzvah at most its last 3 hours, and like Maariv for hours past midnight); for Maariv and the Omer from the start of the time to midnight; for the bedtime Shema the two hours before midnight, after its 21:00 reminder; for Chanukah the first hour of lighting. For the night mitzvot the orange is “ideally before midnight”, and between midnight and dawn only the red goes out, the real last time, half an hour before dawn. The wording follows the mitzvah: “Last time to put on tefillin”, “Ideally, count before midnight” and so on. Two notifications of one mitzvah are at least 10 minutes apart, and nothing goes out after Done, on Shabbat and Yom Tov, or in the quiet hours. Choose the level in Settings → Device and notifications, and any mitzvah can have a level of its own on its screen. On Home, a mitzvah you gave a level different from the app’s, or whose nags you moved by hand, shows a small bell beside its name with how many notifications it sends in all during its time.',
      },
      {
        he: 'בכרטיס ״חלון הזמן״ במסך המצווה כל התראה היא נקודה על ציר הזמן: תזכורת היא נקודה זהובה עם פעמון, נודניק נקודה כתומה, והזמן האחרון להתחיל מעוין אדום, מעל רצועת הזמן הקריטי. גוררים תזכורת לאורך הציר כדי לשנות את שעתה, והנודניק החכם זז איתה. אפשר לגרור גם נודניק, ואז הנודניקים של המצווה נשארים איפה ששמתם אותם עד ״איפוס ציר ההתראות״, או עד שבוחרים לה רמה. שתי התראות לא יכולות להיות במרחק של פחות מ־10 דקות: בזמן הגרירה האזורים האלה מסומנים, הנקודה לא נכנסת אליהם, ושורה מסבירה למה. גם כשהזזה מורידה נודניקים, או כשהתראה נופלת בשעות השקטות או בשבת, שורה מתחת לציר אומרת זאת. הקשה על נקודה פותחת את פרטיה: מה היא, מתי היא נשלחת, איך תיראה ההתראה, ‎-5 ו־‎+5 דקות, עריכה מלאה של תזכורת ומחיקה. הקשה על מקום ריק בציר מוסיפה שם תזכורת. ״זום לזמן הקריטי״ מקרב את הציר אל הזמן שבו הנודניקים צפופים, ו״ההתראות שיישלחו״ מפרט את כולן לפי הסדר.',
        en: 'On the Time window card of a mitzvah’s screen every notification is a dot on the timeline: a reminder a gold dot with a bell, a nag an orange dot, and the last time to start a red diamond, over the band of the critical time. Drag a reminder along the timeline to change its time, and the smart nag moves with it. A nag drags too, and the mitzvah’s nags then stay where you put them until Reset notification timeline, or until you choose a level for it. Two notifications cannot be less than 10 minutes apart: while you drag, those stretches are marked, the dot does not enter them, and a line says why. When a move drops nags, or a notification falls in the quiet hours or on Shabbat, a line under the timeline says so too. A tap on a dot opens its details: what it is, when it goes out, how the notification will look, -5 and +5 minutes, a reminder’s full edit, and delete. A tap on an empty stretch of the timeline adds a reminder there. Zoom to the critical time brings the timeline close to the time where the nags sit together, and Notifications to be sent lists them all in order.',
      },
      {
        he: 'מצווה פעילה נשארת תמיד עם תזכורת אחת לפחות: את האחרונה אי אפשר למחוק, והפעלה של מצווה בלי תזכורות מבקשת קודם להגדיר אחת.',
        en: 'A mitzvah that is on always keeps at least one reminder: the last one cannot be deleted, and switching on a mitzvah with none asks you to set one first.',
      },
      {
        he: 'בהתראה עצמה ״עשיתי״ מסמן את המצווה בלי לפתוח את האפליקציה, ו״פתח נוסח״ פותח את הנוסח כשיש כזה. הקשה על ההתראה פותחת את הנוסח, או את מסך המצווה כשאין לה נוסח. בהגדרות ← מכשיר והתראות ← הרשאות רואים כל הרשאה שהאפליקציה צריכה ומאשרים את מה שחסר; באנדרואיד ״סוללה ללא הגבלה״ מאושרת בהקשה אחת, כדי שהתזכורות יגיעו בזמן.',
        en: "In the notification, Done marks the mitzvah without opening the app, and Open text opens its text when it has one. Tapping the notification opens the text, or the mitzvah's screen when there is none. Settings → Device and notifications → Permissions shows every permission the app needs and allows what is missing; on Android, Unrestricted battery takes one tap, so reminders arrive on time.",
      },
      {
        he: 'בהגדרות ← מכשיר והתראות אפשר לבחור ״לא לשלוח התראות לפני השעה״, ״לא לשלוח התראות אחרי השעה״, או את שתיהן. התראה שזמנה לפני השעה שנבחרה מגיעה בשעה הזו, והתראה שזמנה מאוחר יותר עוברת למחרת לשעה שנבחרה ב״החל מהשעה״, כל עוד זמן המצווה עוד פתוח; אחרת היא לא נשלחת. ההודעה לפני שבת וחג ותזכורות הסימון אחריהם נשלחות תמיד בזמנן.',
        en: "In Settings → Device and notifications you can choose No notifications before, No notifications after, or both. A notification due before the chosen hour arrives at that hour, and one due after it moves to the next day at the hour set under Send from, as long as the mitzvah's time is still open; otherwise it is not sent. The notice before Shabbat and Yom Tov and the check-in reminders after them always go out on time.",
      },
      {
        he: 'התזכורות נקבעות מראש לימים הבאים, גם אם לא פותחים את האפליקציה: באנדרואיד לכחודש, ובאייפון לכשבוע וחצי, כשמהיום השלישי נשארת תזכורת אחת לכל מצווה. ביום האחרון שתוכנן מגיעה בשמונה בערב, או בשעה המותרת הקרובה כשנבחרו שעות בלי התראות, התראה ״התזכורות עומדות להיגמר״, וכל פתיחה של האפליקציה מתכננת מחדש.',
        en: 'Reminders are set ahead for the coming days even if the app is not opened: about a month on Android and about a week and a half on iPhone, where from the third day each mitzvah keeps one reminder. On the last planned day a notification at 8 pm, or the nearest allowed hour when notification hours are limited, says your reminders are about to run out, and every time the app opens it plans again.',
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
        he: '״הוסף מצווה חדשה״ בתחתית המסך יוצר מצווה אישית: שם, אייקון מתוך האייקונים של האפליקציה, שעות (שעת סיום מוקדמת משעת ההתחלה נמשכת עד למחרת), ובתזמון המצווה ימים קבועים בשבוע, טווח מתאריך עד תאריך או מספר ימים ברצף. בוחרים אם לדלג בשבת וביום טוב, את רמת הנודניקיות וכמה דקות לוקח לקיים אותה, ומוסיפים תוכן עשיר: טקסט, ברכה, קישור או טקסט מהסידור. אחרי השמירה נפתח מסך המצווה, עם תזכורת אחת בתחילת הזמן, ושם מנהלים את התזכורות בציר ההתראות. מכל מקום, גם מ״המצוות שלי״, מצווה אישית נפתחת במסך שלה, ו״עריכת המצווה״ בראש המסך פותח את הטופס. כשהטווח או הרצף מסתיימים המצווה נכבית, וההיסטוריה שלה נשמרת.',
        en: 'Add custom mitzvah at the bottom of the screen creates your own mitzvah: a name, an icon of your choice, hours (an end before the start runs into the next day), and a schedule of set weekdays, a range from date to date or a run of days. You choose whether to skip it on Shabbat and Yom Tov, its nagging level and how many minutes it takes, and add rich content: text, a blessing, a link or a text from the siddur. Saving opens the mitzvah’s screen with one reminder at the start of its time, and its reminders are managed there, on the notification timeline. From everywhere, My mitzvot included, a custom mitzvah opens its own screen, and Edit mitzvah at the top of the screen opens the form. When its range or streak ends it switches off, and its history is kept.',
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
        he: 'בשבת וביום טוב האפליקציה נחה: מהדלקת הנרות ועד היציאה, 30 דקות אחרי השקיעה בארץ ו־40 בחוץ לארץ, לא נשלחות התראות, ובמקום המסכים מופיע מסך שקט עם שעת היציאה. זה במכוון, והאפליקציה חוזרת לפעול מעצמה.',
        en: 'On Shabbat and Yom Tov the app rests: from candle lighting until the exit, 30 minutes after sunset in Israel and 40 abroad, no notifications go out, and a quiet screen with the exit time covers the app. This is by design, and the app comes back by itself.',
      },
      {
        he: 'שעה לפני הדלקת הנרות מגיעה התראה עם זמני ההדלקה והיציאה, ולפי מה שמופעל גם ספירת העומר, ההילולות, ראש חודש והאושפיזין של הלילות שבתוך השבת או החג.',
        en: 'An hour before candle lighting a notification gives the lighting and exit times and, as switched on, the Omer count, hilulot, Rosh Chodesh and the Ushpizin of the nights inside the Shabbat or Yom Tov.',
      },
      {
        he: 'אחרי השבת או החג האפליקציה פותחת מסך סימון למה שנעשה בזמן הזה, ובדף הבית מופיע פס שמזכיר לסמן. התראות מזכירות בצאת השבת, שעתיים אחר כך ובערב שלמחרת. סימון כאן נספר כסימון בזמן, בלי שאלה. אפשר לסמן עד עלות השחר שאחרי היום הראשון בחול, ומה שלא סומן עד אז נחשב כלא בוצע. שבתות וחגים נספרים בהיסטוריה וברצף כמו כל יום.',
        en: 'After Shabbat or Yom Tov the app opens a check-in to mark what was done in that time, and a strip on Home reminds you to mark. Notifications remind you at the exit, two hours later and the next evening. A mark there counts as made in time, with no question. You can mark until dawn after the first weekday; anything unmarked by then counts as missed. Shabbat and Yom Tov count in history and the streak like any other day.',
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
        he: 'בראש הקורא: ״בחר חלק״ לקפיצה לחלק אחר, במניין או ביחיד בתפילות שיש בהן קטעים למניין (ביחיד, קדיש, ברכו, קדושה וקריאת התורה מקופלים), הגדלה והקטנה של הטקסט, וגלילה אוטומטית במהירות שבוחרים. קטע מקופל נפתח בהקשה. בזמן הקריאה הכלים מתקפלים לשורה אחת קבועה עם ״חזור״, שם הטקסט, כפתור הגלילה האוטומטית וכפתור ״כלים״ שפותח את כל הכלים; גלילה, לכל כיוון, לא פותחת אותם; הקשה קצרה על הטקסט מפעילה ועוצרת את הגלילה האוטומטית; הקשה כפולה מהירה על הטקסט פותחת או סוגרת אותם, גלילה סוגרת אותם, והם חוזרים לבד בראש הטקסט. כשהאפליקציה באנגלית, מתחת לעברית מופיע התרגום, כשיש למקור תרגום.',
        en: "At the top of the reader: Jump to section, Minyan or Alone in prayers with minyan passages (Alone folds Kaddish, Barchu, Kedusha and the Torah reading), larger and smaller text, and auto-scroll at the speed you choose. A folded passage opens on tap. While you read, the controls fold into one fixed line with Back, the text's name, the auto-scroll button and a Tools button that opens every control; scrolling either way never opens them; a short tap on the text starts or stops auto-scroll; a quick double tap on the text opens or closes the controls, scrolling closes them, and they come back by themselves at the top of the text. When the app is in English, the source's translation appears under the Hebrew where it has one.",
      },
      {
        he: 'כפתור הכוכב שומר את המקום הנוכחי כסימנייה; כשכבר יש סימניות בטקסט הוא שואל אם להוסיף סימנייה חדשה או להעביר אחת קיימת למקום הזה, ו״סימניות״ מציג את ״המקום האחרון״ ואת הסימניות של הטקסט, לקפיצה או למחיקה. בפתיחה הבאה הקורא מציע להמשיך מהמקום שבו עצרתם: בטקסט של מצווה (התפילות, הדלקת נרות, הבדלה וספירת העומר) רק באותו יום, ובשאר הטקסטים תמיד. ״סיימתי״ בסוף הטקסט מסמן את המצווה, ובטקסט של מצווה כפתור ההגדרות בראש הקורא פותח את מסך המצווה.',
        en: "The star button saves the current place as a bookmark; when the text already has bookmarks it asks whether to add a new one or move one of them here, and Bookmarks shows Where you left off and the text's bookmarks, to jump to or delete. Next time the reader offers to continue where you left off: for a mitzvah's text (the prayers, candle lighting, havdalah, the Omer) on the same day only, for every other text always. Done at the end of the text marks its mitzvah, and in a mitzvah's text the settings button at the top opens the mitzvah's screen.",
      },
      {
        he: 'בהגדרות ← תפילה וסידור בוחרים נוסח (אשכנז, ספרד, עדות המזרח, חב״ד או תימן בלדי), דעת זמן ק״ש (הגר״א או המגן אברהם, שקובעת מתי נגמר חלון קריאת שמע של שחרית; מסך המצווה והכרטיס בדף הבית מציגים את שתי הדעות לידיעה), במניין או ביחיד, ״נוסח הסידור״ לגבר או לאישה, וגלילה. נוסח הסידור מתעדכן לפי המגדר בפרופיל: אישה קוראת את ״מודה אני״, את ברכות השחר ואת שאר הנוסחים בלשון אישה.',
        en: "Settings → Prayer and siddur sets the nusach (Ashkenaz, Sefard, Edot HaMizrach, Chabad or Teiman Baladi), the Shema opinion (Gra or Magen Avraham, which decides when the morning Shema window ends; the mitzvah's screen and its Home card show both for reference), Minyan or Alone, the Siddur wording for a man or a woman, and scrolling. The siddur wording follows the gender in your profile: a woman reads Modeh Ani, the morning blessings and the other women's forms.",
      },
      {
        he: 'בהגדרות ← תפילה וסידור, ״פסוקים לשמך ותפילה אישית בעמידה״: עד שלושה פסוקים, אחד לכל שם, שנאמרים בסוף אלהי נצור לפני יהיו לרצון השני. פסוק נמצא לפי השם, או לפי האות הראשונה והאות האחרונה שלו, מתוך תהלים ומחלקי התנ״ך של חק לישראל כשהוא מותקן, או מוקלד; בחיפוש לפי שם, פסוק שגם מופיע בו השם מסומן כמומלץ ומופיע ראשון. אפשר להוסיף גם תפילה אישית בכתב חופשי. הסידור מציג את שניהם במקומם בכל עמידה של שחרית, מנחה וערבית, מודגשים בצבע הראשי כתוספת אישית שאינה חלק מנוסח התפילה ופתוחים תמיד, במניין וביחיד, ומתחת לעמידה כפתור שמוביל להגדרה.',
        en: 'Settings → Prayer and siddur, Name verses and personal prayer in the Amidah: up to three verses, one for each name, said at the end of Elokai Netzor before the second Yihyu Leratzon. A verse is found by the name, or by its first and last letter, in Tehillim and in the Tanakh parts of Chok LeYisrael when it is installed, or typed; searching by name, a verse that also holds the name is marked recommended and listed first. A personal prayer in free text can be added too. The siddur shows both in place in every Amidah of Shacharit, Mincha and Maariv, set off in the accent colour as your own addition rather than the prayer text and always open, with a minyan or alone, with a button under the Amidah that leads to the setting.',
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
    title: { he: 'חק לישראל ושניים מקרא', en: 'Chok LeYisrael and Shnayim Mikra' },
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
      {
        he: 'שניים מקרא ואחד תרגום הוא תוסף נוסף באותה דרך, כ־1.2 MB: התורה כולה עם תרגום אונקלוס ורש״י, עלייה ליום, ראשון עד חמישי עלייה אחת ושישי השישית והשביעית. כל פסוק מופיע פעמיים ואחריו התרגום, ורש״י אחריו, מוצג או מקופל לפי ״עם פירושים״ או ״בלי פירושים״ כמו בחק לישראל. בשבוע של פרשות מחוברות קוראים את שתיהן. סימון ״סיימתי״, ההשלמות של ימים קודמים והבחירה בפרשה אחרת פועלים כמו בחק לישראל, ותזכורת ברירת המחדל בשעה 20:00. שניהם נמצאים בסידור תחת ״לימוד״ ובלשונית עוד.',
        en: "Shnayim Mikra Ve'Echad Targum is another add-on of the same kind, about 1.2 MB: the whole Torah with Targum Onkelos and Rashi, an aliyah a day, Sunday to Thursday one aliyah each and Friday the sixth and the seventh. Each verse appears twice and then its translation, with Rashi after it, shown or folded by Commentary or Text only as in Chok LeYisrael. In a double week both parashiyot are read. Done, the make-ups of earlier days and reading another parasha work as in Chok LeYisrael, and the default reminder is at 20:00. Both are in the siddur under Learning and in the More tab.",
      },
    ],
    routes: [],
    action: {
      label: { he: 'למסך חק לישראל', en: 'Open Chok LeYisrael' },
      href: { pathname: '/mitzvah/[id]', params: { id: 'chok_leyisrael' } },
    },
  },
  {
    id: 'halacha',
    icon: 'chok',
    title: {
      he: 'הלכה יומית, הלכות החג, לשון הרע ושמירת הלשון',
      en: 'Daily halacha, the halachot of the festival, lashon hara and Shemirat HaLashon',
    },
    body: [
      {
        he: 'שתי מצוות לימוד מתוך ספר הלכה אחד: ״הלכה יומית״, מנה בכל יום, ו״הלכות החג״, בשלושים הימים שלפני פסח, שבועות וסוכות, ובימים שלפני ראש השנה, יום הכיפורים, חנוכה, פורים, תשעה באב והצומות. הספר לפי הנוסח: קיצור שולחן ערוך לאשכנז ולספרד, בן איש חי לעדות המזרח, ומשנה תורה לרמב״ם, פרק ליום, לחב״ד ולתימן. בהגדרות ← תפילה וסידור אפשר לבחור ספר אחר, ובבן איש חי גם להחליף בין שתי השנים שלו.',
        en: "Two learning mitzvot from one halacha book: the Daily Halacha, a portion every day, and the Halachot of the Festival, in the thirty days before Pesach, Shavuot and Sukkot, and in the days before Rosh Hashanah, Yom Kippur, Chanukah, Purim, Tisha B'Av and the fasts. The book follows the nusach: Kitzur Shulchan Aruch for Ashkenaz and Sefard, Ben Ish Chai for Edot HaMizrach, and the Rambam's Mishneh Torah, a chapter a day, for Chabad and Teiman. Settings → Prayer and siddur offers another book, and for Ben Ish Chai a swap between its two years.",
      },
      {
        he: 'הספר הוא תוסף שיורד פעם אחת ממסך המצווה, מלשונית עוד או מהסידור תחת ״לימוד״, ואחרי ההורדה הוא זמין גם בלי חיבור לאינטרנט; בסוף ההורדה האפליקציה שואלת אם להפעיל את שתי המצוות. באנגלית אפשר להוריד גם את התרגום של קיצור שולחן ערוך.',
        en: 'The book is an add-on downloaded once from the mitzvah screen, the More tab or the siddur under Learning, and after that it is available without an internet connection; when the download ends, the app asks whether to turn both mitzvot on. In English, the translation of Kitzur Shulchan Aruch can be downloaded too.',
      },
      {
        he: 'הקורא מציג את הלימוד של היום, ושורת ימים מאפשרת לקרוא יום אחר, בלי ״סיימתי״. כשהמצווה פעילה ״סיימתי״ מסמן את היום, וכל אחד משבעת הימים הקודמים שלא סומנו מופיע כהשלמה מקופלת. המצוות פתוחות מעלות השחר עד עלות השחר שלמחרת, גם בשבת ובחג, שנשאלים עליהם אחריהם, ותזכורות ברירת המחדל ב־08:00 להלכה היומית וב־19:00 להלכות החג.',
        en: "The reader shows the day's learning, and a row of days reads another day, without Done. While the mitzvah is on, Done marks the day, and each of the seven days before it left unmarked appears as a folded make-up. The mitzvot are open from dawn to the next dawn, on Shabbat and Yom Tov too, which are asked about after them, with default reminders at 08:00 for the daily halacha and 19:00 for the festival's halachot.",
      },
      {
        he: '״הלכות לשון הרע״ היא מצוות לימוד שלישית, לכל נוסח ובלי קשר לספר שנבחר: ספר חפץ חיים לפי הלוח היומי, שלושה מחזורים בשנה, הקדמה, פתיחה, הלכות לשון הרע, הלכות רכילות והציורים. הספר הוא תוסף נפרד שיורד באותם מקומות, עם תרגום לאנגלית, והקורא, ״סיימתי״ וההשלמות פועלים כמו בהלכה היומית. תזכורת ברירת המחדל ב־13:00.',
        en: 'Laws of Lashon Hara is a third learning mitzvah, for every nusach and whatever book was chosen: Sefer Chofetz Chaim by its daily luach, three cycles a year, through the preface, the introduction, the laws of lashon hara, the laws of rechilut and the illustrations. The book is an add-on of its own, downloaded from the same places, with an English translation, and the reader, Done and the make-ups work as for the daily halacha. Its default reminder is at 13:00.',
      },
      {
        he: '״שמירת הלשון״ היא מצוות לימוד רביעית, לכל נוסח: ספר שמירת הלשון של החפץ חיים, שערי הזכירה, התבונה והתורה וחלק ב, פעם אחת בשנה לפי הלוח היומי. גם הוא תוסף נפרד עם תרגום לאנגלית, ותזכורת ברירת המחדל ב־20:30.',
        en: "Shemirat HaLashon is a fourth learning mitzvah, for every nusach: the Chofetz Chaim's Sefer Shemirat HaLashon, the Gates of Remembering, Discernment and Torah and Book II, once a year by the daily luach. It is an add-on of its own too, with an English translation, and its default reminder is at 20:30.",
      },
    ],
    routes: [],
    action: {
      label: { he: 'למסך ההלכה היומית', en: 'Open the Daily Halacha' },
      href: { pathname: '/mitzvah/[id]', params: { id: 'halacha_yomit' } },
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
        he: 'בסוף ״סיכום״ נמצא כרטיס ״קריאה בסידור״: כמה פעמים קראתם כל טקסט בסידור (ברכת המזון, נשמת, תפילת הדרך וכל השאר), וכמה פרקי תהילים, השבוע, החודש ובסך הכול, בלי רצף. כל פרק תהילים נספר בנפרד, גם הפרקים של תיקון הכללי, וכשכל 150 הפרקים נקראו נספר ספר שלם. בסוף כל טקסט יש כפתור ״קראתי״, ומתחת לכל פרק תהילים ״קראתי את הפרק״ (וגם ״סיימתי״ נספר כקריאה). מי שלא לחץ, הספירה החכמה סופרת לבד: לפי הזמן שהטקסט היה מול העיניים ביחס לאורכו, ולא בגלילה מהירה עד הסוף.',
        en: 'At the end of Summary, the Reading in the siddur card counts how many times you read each siddur text (Grace After Meals, Nishmat, the traveler’s prayer and the rest) and how many Tehillim chapters, this week, this month and in all, with no streak. Each psalm counts on its own, Tikkun HaKlali’s chapters included, and once all 150 chapters are read a whole book is counted. Each text ends with an “I read it” button and each psalm with “I read this psalm” (Done counts as a read too). Without a press the smart count does it for you: by how long the text was in front of you for its length, not by scrolling fast to the end.',
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
        he: 'מצווה שהזמן שלה נגמר אפשר עדיין לסמן: ב״היום שלי״ בבית, במסך המצווה, ובסידור. האפליקציה שואלת מתי עשית. ״עשיתי בזמן ולא סימנתי״ נספר כמו סימון בזמן. ״עשיתי אחרי שעבר הזמן״ נספר כבוצע בכל מקום, באחוזים, בלוח החודש, במגמות, בדוח השבועי ובהישגים, וב״היום שלי״ בבית מוצג בירוק כמו כל מה שבוצע, עם תווית כתומה ״בוצע באיחור״. ב״סיכום״ מופיע כמה מהסימונים היו בזמן בכל תקופה, כמה איחורים היו לכל מצווה, וכרטיס ״לשיפור״ עם המצווה שאיחרת בה הכי הרבה ב-30 הימים האחרונים, שפותח את ״סימונים באיחור״: איזו מצווה, באיזה יום, מתי נגמר הזמן ומתי סימנת. ״מגמות״ מציג את האיחורים ב-12 השבועות האחרונים, והדוח השבועי את המצווה שאיחרת בה הכי הרבה השבוע. ההישגים ״שבוע בזמן״ ו״חודש בזמן״ דורשים שכל הסימונים יהיו בזמן, ו״פחות איחורים״ ניתן על שבוע עם פחות איחורים מהשבוע שלפניו.',
        en: 'A mitzvah whose time has ended can still be marked: in My day on Home, on the mitzvah\'s screen and in the siddur. The app asks when you did it. "I did it in time and didn\'t mark it" counts like a mark made in time. "I did it after the time passed" counts as done everywhere, in percentages, the month calendar, Trends, the weekly report and badges, and in My day on Home it shows in green like everything done, with an orange Done late label. Summary shows how many marks were on time in each period, the late marks of each mitzvah, and a To improve card with the mitzvah you were late on most in the last 30 days, which opens Late marks: which mitzvah, on which day, when its time ended and when you marked it. Trends shows the late marks of the last 12 weeks, and the weekly report the mitzvah you were late on most that week. The badges A week on time and A month on time need every mark in time, and Fewer late marks is given for a week with fewer late marks than the week before it.',
      },
      {
        he: 'דוח שבועי נפתח מרשימת הדוחות בלשונית מגמות: מה סומן, היום הכי טוב, איזו מצווה כדאי לחזק ומה מחכה בשבוע הבא, ומעבר בין השבועות. כ־45 דקות אחרי צאת השבת מגיעה התראה שהסיכום מוכן; אפשר לכבות אותה בהגדרות ← מכשיר והתראות.',
        en: 'A weekly report opens from the reports list in Trends: what was marked, the best day, which mitzvah to strengthen and what the next week holds, with buttons to move between weeks. About 45 minutes after Shabbat ends a notification says the report is ready; it can be turned off in Settings → Device and notifications.',
      },
    ],
    routes: ['/(tabs)/history', '/report', '/late-marks'],
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
      {
        he: 'שעות בלי התראות לא דוחות את תזכורות הפסק הטהרה, בדיקת הערב, בדיקת העונה, הטבילה והפרישה; בדיקת הבוקר נדחית לשעה שנבחרה רק כשזו לפני חצות היום.',
        en: 'Hours without notifications never delay the reminders of the hefsek, the evening bedika, the onah bedika, the tevila and separation; the morning bedika moves to the chosen hour only when that is before midday.',
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
        he: 'החלקים: פרופיל (שם, טלפון, מגדר ומצב משפחתי), תפילה וסידור, זמני הלכה (אילו זמנים מוצגים בקרוסלה ובמעגל של דף הבית, ואילו מועדפים), מכשיר והתראות (המיקום שלי או מקום שבחרתם, הפיך לכאן ולכאן, התראות, הסיכום השבועי, שעות בלי התראות, הרשאות, ערכת נושא, גודל התצוגה ושפה), גיבוי, שחזור ואיפוס, ואודות ויצירת קשר. המקום קובע גם אם אתם בישראל או בחוץ לארץ, למשל לעניין יום טוב שני. כדי להסיר את הרשאת המיקום, בוחרים ״מקום שבחרתי״ ומבטלים את ההרשאה בהגדרות הטלפון; החיפוש בראש ההגדרות מוצא גם יישובים וערים ופותח את הבחירה עליהם.',
        en: "Its sections: Profile (name, phone, gender and marital status), Prayer and siddur, Halachic times (which times Home's carousel and circle show, and your favourites), Device and notifications (my location or a place you chose, either way back and forth, notifications, the weekly report, hours without notifications, permissions, theme, display size and language), Backup, restore and reset, and About and contact. The place also decides whether you count as in Israel or abroad, for example for the second day of Yom Tov. To remove the location permission, choose A place I chose and turn the permission off in the phone's settings; the search at the top of Settings finds localities and cities too and opens the choice on them.",
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
        he: 'רוב העדכונים מגיעים לבד: האפליקציה בודקת אם יש עדכון בכל פתיחה וחזרה אליה ומורידה אותו ברקע. כשהוא מוכן מופיע הפס ״גרסה חדשה של האפליקציה מוכנה״, והקשה עליו טוענת אותה. גם כשהאפליקציה ברקע מגיעה התראה כשעדכון מוכן, כשההתראות פעילות, לא בשבת ובחג ולא בשעות בלי התראות.',
        en: 'Most updates arrive by themselves: the app checks for one each time it opens or comes back, and downloads it in the background. When it is ready a strip says “A new version of the app is ready”, and tapping it loads it. Even with the app in the background, a notification says when an update is ready, while notifications are on, never on Shabbat or Yom Tov and never in hours without notifications.',
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
        he: 'בהגדרות ← אודות ויצירת קשר: הגרסה, הודעה חשובה על דיוק הזמנים, טופס פנייה (שם, טלפון ותוכן, שנשלחים אלינו דרך Formspree יחד עם גרסת האפליקציה וסוג המכשיר), המייל 365jew@gmail.com, וקישורים לדף התמיכה, למדיניות הפרטיות, לעמוד האפליקציה בחנות ולקרדיט של חק לישראל.',
        en: "Settings → About and contact holds the version, an important notice on the accuracy of the times, a contact form (name, phone and message, sent to us through Formspree with the app version and device type), the email 365jew@gmail.com, and links to the support page, the privacy policy, the app's store page and the Chok LeYisrael credit.",
      },
      {
        he: 'לשאלה הלכתית, ״קו ההלכה״ בלשונית עוד מחייג לקו לפי הנוסח שבהגדרות: קווים אשכנזיים, ולעדות המזרח ולתימן קו לפי פסקי מרן, גם בוואטסאפ.',
        en: 'For a halachic question, the halacha hotline in the More tab dials a line by the nusach in Settings: Ashkenazi lines, and for Edot HaMizrach and Teiman a line following Maran, by WhatsApp too.',
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
    label: '1.0.21-18',
    date: '2026-11-09',
    items: [
      {
        he: 'הזמנים בקרוסלה במקום אחד: ה-+ שבקרוסלה פותח מסך שבו מסירים זמן, מוסיפים זמנים שהעיגול לא מראה (מנחה קטנה, וסוף זמן קריאת שמע לשיטה השנייה) ומסמנים מועדפים בכוכב. זמן מועדף תמיד מוצג, עומד ראשון בקרוסלה בזמן הבא שלו, גם אם זה מחר, ו״שלי״ מראה כמה נשאר עד המועדף הבא. לחיצה ארוכה על זמן בקרוסלה מסמנת אותו בכוכב. אותה רשימה מופיעה בהגדרות ← זמני הלכה ובהגדרה הראשונית של האפליקציה.',
        en: "The carousel's times in one place: the + in the carousel opens a sheet where you remove a time, add times the circle does not show (Mincha Ketana, and the latest Shema by the other opinion) and star favourites. A favourite always shows, leads the carousel at its next time, tomorrow's too, and Mine shows how long until the next favourite. A long press on a time in the carousel stars it. The same list is in Settings → Halachic times and in the app's first setup.",
      },
      {
        he: 'שמירת הלשון: מצוות לימוד יומית בספר שמירת הלשון של החפץ חיים, פעם אחת בשנה לפי הלוח היומי, לכל נוסח. תוסף להורדה עם תרגום לאנגלית, עם תזכורת ב־20:30, ״סיימתי״, השלמות ושורת ימים.',
        en: "Shemirat HaLashon: a daily learning mitzvah in the Chofetz Chaim's Sefer Shemirat HaLashon, once a year by the daily luach, for every nusach. An add-on to download, with an English translation, a reminder at 20:30, Done, make-ups and a row of days.",
      },
      {
        he: 'הלכות לשון הרע: מצוות לימוד יומית מספר חפץ חיים לפי הלוח היומי, שלושה מחזורים בשנה, לכל נוסח. תוסף להורדה עם תרגום לאנגלית, עם תזכורת, ״סיימתי״, השלמות ושורת ימים, כמו ההלכה היומית.',
        en: 'Laws of Lashon Hara: a daily learning mitzvah from Sefer Chofetz Chaim by its daily luach, three cycles a year, for every nusach. An add-on to download, with an English translation, a reminder, Done, make-ups and a row of days, like the daily halacha.',
      },
      {
        he: 'הלכה יומית והלכות החג: שתי מצוות לימוד מספר הלכה לפי הנוסח (קיצור שולחן ערוך, בן איש חי או רמב״ם, פרק ליום), תוסף להורדה, עם תזכורת, ״סיימתי״, השלמות של שבעת הימים הקודמים ושורת ימים לקריאה ביום אחר. הלכות החג נלמדות בשלושים הימים שלפני פסח, שבועות וסוכות ובימים שלפני שאר החגים והצומות. את הספר אפשר להחליף בהגדרות ← תפילה וסידור.',
        en: "Daily Halacha and Halachot of the Festival: two learning mitzvot from a halacha book by nusach (Kitzur Shulchan Aruch, Ben Ish Chai or the Rambam, a chapter a day), an add-on to download, with a reminder, Done, make-ups of the seven days before and a row of days to read another day. The festival's halachot are learned in the thirty days before Pesach, Shavuot and Sukkot and in the days before the other festivals and fasts. The book can be changed in Settings → Prayer and siddur.",
      },
      {
        he: 'דף הבית בגוון התקופה: כרטיס זכוכית שקוף בגוון של השמיים שמאחוריו, עם מסגרת דקה, שמשתנה עם השעה ועם התצוגה המקדימה עם ״היום״, ״השבוע״ (הפרשה, כניסת השבת ויציאתה, שבת מברכים והמולד) ו״שלי״, שזוכר את הבחירה שלך, וקרוסלת זמנים חיה שבה הזמן החשוב מתמלא, זמנים מקבילים מראים התקדמות בנגיעה, ובלילה מופיעים זמני מחר. הלוח לומד מהסימונים שלך (✦), למשל ״לקרוא שמע קודם״ כשהשחרית שלך מאוחרת.',
        en: "Home in the period's tone: a see-through glass card in the colour of the sky behind it, with a thin edge, that follows the hour and the preview with Today, This week (the parasha, Shabbat's start and end, Shabbat Mevarchim and the molad) and Mine, which keeps your choice, and a live carousel of times where the time that matters fills, times running together show their progress when touched, and tomorrow's times show at night. The board learns from your marks (✦), such as Read the Shema first when your Shacharit runs late.",
      },
      {
        he: 'יותר מקום למצוות שפתוחות עכשיו: הברכה והתאריך ישר על השמיים, הקשת גדולה יותר והשעה שבתוכה בגודל של הקשת ובלי רקע, הכרטיס והקרוסלה נמוכים יותר, הרווחים צפופים יותר והסרגל התחתון רזה יותר. ״חזרה לעכשיו״ מופיע בתוך הקשת, מתחת לשעה.',
        en: 'More room for the mitzvot open now: the greeting and the date sit right on the sky, the circle is larger and the clock inside it is sized to it with no background, the card and the carousel are lower, the spacing tighter and the tab bar slimmer. Back to now shows inside the circle, under the clock.',
      },
      {
        he: 'האפליקציה נפתחת תמיד בדף הבית: כל חזרה אליה מחזירה לבית, חוץ מחזרה ממשהו שהאפליקציה עצמה פתחה (אישור הרשאה, ההגדרות של הטלפון, שיתוף או קישור), שמחזירה למסך שממנו יצאת.',
        en: 'The app always opens on Home: every return to it goes to Home, except a return from something the app itself opened (a permission, the phone settings, sharing or a link), which goes back to the screen you left.',
      },
      {
        he: 'פסוקים לשמך ותפילה אישית בעמידה: עד שלושה פסוקים, אחד לכל שם, נמצאים לפי השם או לפי האות הראשונה והאחרונה, מתוך תהלים וחק לישראל, ופסוק שגם מופיע בו השם מסומן כמומלץ; או מוקלדים, ותפילה בכתב חופשי. הסידור מציג אותם בסוף אלהי נצור, לפני יהיו לרצון השני, מודגשים בצבע הראשי ופתוחים תמיד. בהגדרות ← תפילה וסידור, ובקישור מתחת לעמידה.',
        en: 'Name verses and a personal prayer in the Amidah: up to three verses, one for each name, found by the name or by their first and last letter in Tehillim and Chok LeYisrael, a verse that also holds the name marked recommended, or typed, and a prayer in free text. The siddur shows them at the end of Elokai Netzor, before the second Yihyu Leratzon, set off in the accent colour and always open. In Settings → Prayer and siddur, and by the link under the Amidah.',
      },
      {
        he: 'שניים מקרא ואחד תרגום: תוסף להורדה עם התורה כולה, תרגום אונקלוס ורש״י, עלייה ליום, כל פסוק פעמיים ואחריו התרגום, רש״י עם פירושים או בלי, עם תזכורת, ״סיימתי״ ומעקב כמו חק לישראל. בסידור נוספה קטגוריית ״לימוד״ עם חק לישראל ושניים מקרא.',
        en: "Shnayim Mikra Ve'Echad Targum: an add-on to download with the whole Torah, Targum Onkelos and Rashi, an aliyah a day, each verse twice and then its translation, Rashi shown or folded, with a reminder, Done and tracking like Chok LeYisrael. The siddur has a new Learning group with Chok LeYisrael and Shnayim Mikra.",
      },
      {
        he: 'העיגול בדף הבית שלם, ואפשר לגרור את השמש או הירח סביבו כולו, בתוך אותו יום.',
        en: "Home's circle is whole, and the sun or the moon can be dragged all the way around it, within the same day.",
      },
      {
        he: 'כשאין מצווה פתוחה, ההודעות מופיעות במקום ״פתוח עכשיו״. הודעת השבת הקרובה מופיעה מליל חמישי.',
        en: 'When no mitzvah is open, the messages take the place of Open now. The coming Shabbat shows from Thursday night.',
      },
      {
        he: 'תיקוני נוסח בסידור: ״לַמְנַצֵּחַ״ בתהילים ס״ז עם הפתח הגנוב, ״וְצֶאֱצָאֵי עַמְּךָ״ בברכות התורה בנוסח ספרד, הפסוק האחרון של ״יושב בסתר״ פעמיים בערבית של עדות המזרח, ו״אַל תִּירָאוּ״ בסליחות.',
        en: 'Siddur text fixes: "Lamnatzeach" in Psalm 67 with its vowel, "the offspring of Your people" in the Torah blessings of Nusach Sefard, the last verse of "Yoshev Beseter" said twice in the Maariv of Edot HaMizrach, and a vowel in the Selichot.',
      },
    ],
  },
  {
    label: '1.0.21-17',
    date: '2026-11-08',
    items: [
      {
        he: 'פיזור חדש של ההתראות: לכל מצווה תזכורת פתיחה אחת בשעה סבירה (תפילין וברכות השחר בערך בזריחה, קריאת שמע על המיטה ב־21:00), התראה כשנכנסים לזמן הקריטי, והנודניקים בתוכו. בכל מצווה יש בדיוק התראה כתומה אחת ⚠️ ואחת אדומה ❗, הזמן האחרון, וכל השאר רגילות. במצוות הלילה הכתומה היא ״לכתחילה עד חצות״, ואחרי חצות נשלחת רק האדומה, חצי שעה לפני עלות השחר. הניסוח מתאים לכל מצווה: ״הזמן האחרון להניח״, ״לכתחילה לספור עד חצות״.',
        en: 'Notifications placed anew: each mitzvah has one opening reminder at a sensible hour (tefillin and Birchot HaShachar about sunrise, the bedtime Shema at 21:00), a notification as its critical time begins, and the nags inside it. Every mitzvah has exactly one orange ⚠️ and one red ❗, the last time, and all the rest are plain. For the night mitzvot the orange is “ideally before midnight”, and after midnight only the red goes out, half an hour before dawn. The wording fits each mitzvah: “Last time to put on tefillin”, “Ideally, count before midnight”.',
      },
      {
        he: 'בהגדרות ← זמני הלכה בוחרים אילו זמני היום יוצגו בשורת הזמנים ובמעגל של דף הבית. כברירת מחדל כולם מוצגים, וזמן אחד לפחות נשאר. ״משיכיר״ נקרא עכשיו ״זמן תו״ט״.',
        en: "Settings → Halachic times chooses which of the day's times show in Home's strip and circle. All of them show by default, and at least one stays. Misheyakir is now named Tallit and tefillin.",
      },
      {
        he: 'בהרשמה, מגדר ומצב משפחתי הם עכשיו לא חובה: אפשר להמשיך בלי לענות, ולענות מתי שרוצים בהגדרות ← פרופיל. התשובות נשמרות רק במכשיר.',
        en: 'At sign-up, gender and marital status are now optional: you can continue without answering, and answer any time in Settings → Profile. The answers stay on the device.',
      },
    ],
  },
  {
    label: '1.0.21-16',
    date: '2026-11-08',
    items: [
      {
        he: 'סימון ״עשיתי״ מכל מקום באפליקציה מקבל עכשיו אנימציה: מהסידור, ממסך המצווה, מהיום שלי, מתצוגת היום ומהסיכום שאחרי שבת. מהסידור האנימציה מתנגנת לפני המעבר לדף הבית, ובכרטיס של דף הבית חזרה גם החותמת ״נעשה!״.',
        en: 'Marking done from anywhere in the app now plays an animation: from the siddur, the mitzvah screen, My day, the day view and the check-in after Shabbat. From the siddur it plays before the move to home, and the home card has its "Done!" stamp back as well.',
      },
      {
        he: 'מיקום לפי בחירה: בהרשמה האפליקציה מבקשת גישה למיקום, ואז הזמנים תמיד לפי המקום שבו הטלפון נמצא. מי שלא רוצה לתת מיקום בוחר כל יישוב בישראל, ביהודה ובשומרון, וכל עיר בעולם, בחיפוש לפי שם בעברית או באנגלית. בהגדרות ← מכשיר והתראות עוברים בין ״המיקום שלי״ ל״מקום שבחרתי״ בכל רגע, ומקום שבחרתם נשאר קבוע גם כשהטלפון זז. כשהאפליקציה פתוחה, ״המיקום שלי״ מתעדכן כל חצי דקה.',
        en: 'Location your way: onboarding asks for location access, and then the times always follow where the phone is. Without it, pick any locality in Israel, Judea and Samaria, or any city in the world, by searching its name in Hebrew or English. In Settings → Device and notifications switch between My location and A place I chose at any time, and a place you chose stays put even when the phone moves. While the app is open, My location updates every half minute.',
      },
    ],
  },
  {
    label: '1.0.21-15',
    date: '2026-11-05',
    items: [
      {
        he: 'האפליקציה נפתחת מהר יותר: לפעמים היא נתקעה על מסך הלוגו כחצי דקה לפני דף הבית, כי חישוב התזכורות ביקש מהטלפון את שעון אזור הזמן עשרות אלפי פעמים. עכשיו כל שעה של אזור זמן מחושבת פעם אחת, וגם דף הבית, המעקב והסידור נפתחים מהר יותר.',
        en: 'The app opens faster: it sometimes hung on the logo screen for half a minute before Home, because working out the reminders asked the phone for the time zone’s clock tens of thousands of times. Now each hour of a time zone is worked out once, and Home, Tracking and the siddur open faster too.',
      },
      {
        he: 'הודעה חשובה על דיוק הזמנים: אנחנו משקיעים מאמץ רב כדי שהזמנים יהיו מדויקים, אבל גם אנחנו עלולים לטעות, והאחריות לקיום כל מצווה בזמנה היא של המשתמש. ההודעה מופיעה בהרשמה, לפני המסך האחרון, ונשארת בהגדרות ← אודות ויצירת קשר, ושם גם מדווחים לנו על טעות.',
        en: 'An important notice on the accuracy of the times: we put a great deal of effort into accurate times, but we can make mistakes too, and keeping each mitzvah in its time is the user’s responsibility. It shows in onboarding, before the last screen, and stays in Settings → About and contact, where you can also report a mistake to us.',
      },
      {
        he: 'סימנייה ו״המשך מהמקום האחרון״ בסידור מחזירים בדיוק לשורה שבה הייתם, גם באמצע קטע ארוך, ולא לתחילת הקטע או קצת אחריו. המקום הוא השורה שקראתם מתחת לסרגל העליון, גם כשפתחתם את הכלים כדי לשמור סימנייה.',
        en: 'A bookmark and Continue from your last place in the siddur bring you back to the very line you were on, even in the middle of a long passage, not to the start of the passage or a little after it. The place is the line you were reading under the top bar, even when you opened the tools to save the bookmark.',
      },
    ],
  },
  {
    label: '1.0.21-14',
    date: '2026-11-05',
    items: [
      {
        he: 'מצפן התפילה נפתח רק כשמבקשים: בסידור מופיע לפני כל תפילת עמידה כפתור ״מצפן תפילה״, ואין יותר חלון שקופץ בכניסה לתפילה או הגדרה עבורו.',
        en: 'The prayer compass opens only when you ask: the siddur shows a “Prayer compass” button before every Amidah, and the window that popped up on opening a prayer, with its setting, is gone.',
      },
      {
        he: 'קריאת שמע של שחרית מציגה את סוף הזמן לפי שתי הדעות, המג״א והגר״א, במסך המצווה ובכרטיס שבדף הבית. זו תצוגה בלבד: החלון והתזכורות ממשיכים לפי הדעה שבחרתם בהגדרות ← תפילה וסידור.',
        en: "The morning Shema shows its latest time by both opinions, the MGA and the Gra, on the mitzvah's screen and on its Home card. It is for display only: the window and reminders still follow the opinion chosen in Settings → Prayer and siddur.",
      },
      {
        he: 'ספירת קריאה בסידור: בסוף לשונית מעקב ← סיכום רואים כמה פעמים קראתם כל טקסט וכמה פרקי תהילים (כולל תיקון הכללי), השבוע, החודש ובסך הכול. אפשר ללחוץ ״קראתי״ בסוף הטקסט או ״קראתי את הפרק״ אחרי כל פרק תהילים, ובלי לחיצה קריאה נספרת לפי הזמן שהטקסט היה מול העיניים, לא בגלילה עד הסוף.',
        en: 'Reading counts: at the end of Tracking → Summary see how many times you read each siddur text and how many Tehillim chapters (Tikkun HaKlali included), this week, this month and in all. Press “I read it” at the end of a text or “I read this psalm” after each psalm; without a press a read counts by the time the text was in front of you, not by scrolling to the end.',
      },
      {
        he: 'מצווה אישית מקבלת אייקון לבחירה, ולא רק כוכב: בטופס המצווה מקישים על ״אייקון״ ובוחרים מתוך האייקונים של האפליקציה. האייקון מופיע בבית, בלוח הזמנים, במעקב, בהמצוות שלי ובמסך המצווה.',
        en: "A custom mitzvah takes an icon of your choice, not only the star: in the mitzvah's form tap Icon and pick one of the app's icons. It shows on Home, the schedule, Tracking, My mitzvot and the mitzvah's screen.",
      },
      {
        he: 'כל תזכורת של מצווה כותבת כמה זמן נשאר ועד מתי, למשל ״נשארו 45 דק׳ · עד 09:32״: באייפון מתחת לכותרת, ובאנדרואיד בשורה הראשונה של תוכן ההתראה, שם יש לה מקום. התראת נודניק נפתחת ב־⚠️ ואומרת ״עוד לא סימנת״, כי שם המצווה כבר בכותרת, וההתראה האחרונה של המצווה, ״הזמן האחרון להתחיל״, ב־❗.',
        en: 'Every mitzvah reminder says how long is left and until when, such as “45 min left · until 09:32”: on the iPhone under its title, and on Android in the first line of the notification’s content, where it has room. A nag opens with ⚠️ and says “Not marked yet”, since the title already names the mitzvah, and the mitzvah’s last notification, the last time to start, with ❗.',
      },
      {
        he: 'נודניק חכם: התזכורות נשלחות פעם אחת, ובמקום חזרות צפופות על כל תזכורת, הנודניק מתרכז בזמן הקריטי של כל מצווה (בשליש האחרון של היום, ובמצוות הלילה עד חצות), ותמיד מגיעה התראה בזמן האחרון להתחיל, בתפילה גם במניין וגם ביחיד. במצווה אישית קובעים בטופס כמה דקות לוקח לקיים אותה. הנודניק של תזכורת בודדת הוסר.',
        en: 'A smart nag: reminders go out once, and instead of quick repeats of every reminder the nag gathers in each mitzvah’s critical time (the last third of the day, and up to midnight for the night mitzvot), and a notification always comes at the last time to start, for a prayer both with a minyan and alone. A custom mitzvah’s form sets how many minutes it takes. The nag of a single reminder is gone.',
      },
      {
        he: 'בדף הבית, ליד שם של מצווה שקבעתם לה רמת נודניקיות שונה מזו של האפליקציה, או שהזזתם בה נודניק ביד, יש פעמון קטן ובתוכו כמה התראות היא שולחת בסך הכול.',
        en: 'On Home, beside the name of a mitzvah you gave a nagging level different from the app’s, or whose nags you moved by hand, a small bell shows how many notifications it sends in all.',
      },
      {
        he: 'ציר ההתראות: בכרטיס ״חלון הזמן״ במסך כל מצווה, כל תזכורת, נודניק והזמן האחרון להתחיל הם נקודה על הציר. גוררים נקודה כדי להזיז אותה (הנודניק החכם זז אחרי התזכורות), מקישים עליה כדי לראות את פרטיה ואיך תיראה ההתראה, ומקישים על מקום ריק כדי להוסיף תזכורת. נודניק שהוזז ביד נשאר במקומו עד ״איפוס ציר ההתראות״.',
        en: 'The notification timeline: on the Time window card of every mitzvah’s screen, each reminder, nag and last time to start is a dot on the timeline. Drag a dot to move it (the smart nag follows the reminders), tap it to see its details and how the notification will look, and tap an empty stretch to add a reminder. A nag moved by hand stays where it is until Reset notification timeline.',
      },
      {
        he: 'מסך אחד לכל מצווה: גם מצווה אישית נפתחת מכל מקום במסך המצווה, עם ציר ההתראות, ו״עריכת המצווה״ בראשו פותח את הטופס, שבו כבר אין תזכורות. כפתור אחד, ״איפוס ציר ההתראות״, מופיע אחרי כל שינוי ומחזיר את התזכורות ואת הנודניק החכם. הזזה שנחסמת בגלל מרווח של 10 דקות, נודניקים שירדו, או התראה שנופלת בשעות השקטות, מוסברות בשורה מתחת לציר.',
        en: 'One screen per mitzvah: a custom mitzvah too opens its mitzvah screen from everywhere, with the notification timeline, and Edit mitzvah at its top opens the form, which no longer holds reminders. One button, Reset notification timeline, shows after any change and brings back the reminders and the smart nag. A move refused for the 10-minute gap, nags that were dropped, or a notification in the quiet hours are explained in a line under the timeline.',
      },
    ],
  },
  {
    label: '1.0.21-13',
    date: '2026-11-03',
    items: [
      {
        he: 'כל זמני היום לפי לוח אור החיים: עלות השחר, זמן טלית ותפילין, סוף זמן קריאת שמע ותפילה, מנחה, פלג המנחה וצאת הכוכבים מחושבים כמו בלוח ומעוגלים לדקה כמו בו.',
        en: 'Every zman follows the Ohr HaChaim luach: dawn, the time for tallit and tefillin, the latest Shema and prayer, mincha, plag hamincha and nightfall are computed as the luach does and rounded to the minute as it prints them.',
      },
      {
        he: 'הדלקת נרות 20 דקות לפני השקיעה בכל מקום, ויציאת שבת וחג 30 דקות אחרי השקיעה בארץ ו־40 בחוץ לארץ.',
        en: 'Candle lighting is 20 minutes before sunset everywhere, and Shabbat and Yom Tov end 30 minutes after sunset in Israel and 40 abroad.',
      },
      {
        he: 'לוח הזמנים מציג את סוף זמן קריאת שמע לפי המג״א ולפי הגר״א, כמו בלוח.',
        en: 'The schedule shows the latest Shema both by the Magen Avraham and by the Gra, as the luach does.',
      },
      {
        he: 'נוסח תימן בלדי: אפשר לבחור אותו בפתיחה הראשונה או בהגדרות ← תפילה וסידור. נוסחי הסידור מגיעים בנוסח הבלדי, מוויקיטקסט ומהתכלאל שנדפס בירושלים בשנת תרנ״ד, בעברית בלבד, והסליחות, קידוש לבנה, נרות חנוכה ושאר הכללים שתלויים בנוסח הולכים אחריו.',
        en: 'Nusach Teiman Baladi: choose it when the app first opens or in Settings → Prayer and siddur. The siddur texts come in the Baladi wording, from Hebrew Wikisource and the Tiklal printed in Jerusalem in 1894, in Hebrew only, and Selichot, Kiddush Levana, the Chanukah candles and the other rules that depend on the nusach follow it.',
      },
    ],
  },
  {
    label: '1.0.21-12',
    date: '2026-11-03',
    items: [
      {
        he: 'טהרת המשפחה: פסיקה שנרשמת בערב מסירה את הספק כבר באותו לילה, וההודעה ״הטבילה נדחתה בגלל צום״ מופיעה רק כשיש צום.',
        en: 'Family purity: a ruling recorded in the evening clears the doubt that same night, and "the immersion was deferred for a fast" shows only when there is a fast.',
      },
      {
        he: 'שחזור מגיבוי מחזיר גם את התפקיד ואת המנהג בטהרת המשפחה, וכל הגדרה שאין בקובץ חוזרת לברירת המחדל.',
        en: 'Restoring a backup also brings back the family purity role and minhag, and every setting the file lacks returns to its default.',
      },
      {
        he: 'עריכת תזכורת שומרת את ״תוכן בהתראה״, כך שהברכה נשארת בהתראת ספירת העומר.',
        en: 'Editing a reminder keeps "Content in the notification", so the blessing stays in the Omer notification.',
      },
      {
        he: 'התראות: לא נשלחת תזכורת לפני סיום ההגדרה הראשונה, סימון בזמן רענון התזכורות לא משאיר תזכורות למצווה שבוצעה, וכיבוי ההתראות תופס מיד.',
        en: 'Notifications: no reminder is sent before the first setup is finished, a mark made while the reminders refresh leaves none for that mitzvah, and turning notifications off takes effect at once.',
      },
      {
        he: 'השעות בהודעה לפני שבת, בצ׳ק־אין, בסידור, בלוח הזמנים ובמסך השבת מוצגות לפי העיר שנבחרה גם כשהטלפון באזור זמן אחר.',
        en: 'The times in the pre-Shabbat notice, the check-in, the siddur, the schedule and the Shabbat screen follow the chosen city even when the phone is in another time zone.',
      },
      {
        he: 'תיקונים קטנים: לחיצה כפולה על ״עשיתי״ לא מסמנת פעמיים, רמת הנודניקיות משתנה רק בהקשה או בגרירה הצידה, תצוגת יום מראה מתי מצווה נפתחת ומתי פוספסה, והמצפן קולט הרשאת מיקום שניתנה בהגדרות הטלפון.',
        en: "Small fixes: a double tap on Done no longer marks twice, the nagging level changes only on a tap or a sideways drag, the day view shows when a mitzvah opens and when it was missed, and the compass picks up a location permission granted in the phone's settings.",
      },
    ],
  },
  {
    label: '1.0.21-11',
    date: '2026-11-03',
    items: [
      {
        he: 'תוקנה קריסה באנדרואיד: סימון מצווה, ב״עשיתי״ בבית, ב״סיימתי״ בסוף הנוסח או במסך המצווה, הציג מסך שחור וסגר את האפליקציה.',
        en: 'Fixed a crash on Android: marking a mitzvah, with Done on home, at the end of a text or on the mitzvah screen, showed a black screen and closed the app.',
      },
    ],
  },
  {
    label: '1.0.21-10',
    date: '2026-11-01',
    items: [
      {
        he: 'רמת נודניקיות: בהגדרות ← מכשיר והתראות בוחרים כמה פעמים כל תזכורת חוזרת, מרגיל ועד נודניק, ובמסך של כל מצווה אפשר לקבוע לה רמה משלה.',
        en: 'Nagging level: in Settings → Device and notifications choose how many times each reminder repeats, from Regular to Nagging, and any mitzvah can have a level of its own on its screen.',
      },
      {
        he: 'נודניק לתזכורת: בעורך התזכורת ובמצווה אישית בוחרים כמה פעמים התזכורת חוזרת, כל כמה דקות, ולפניה או אחריה, ורואים מראש באילו שעות. ״עשיתי״ על אחת מהן מבטל את כל השאר.',
        en: 'A nag on a reminder: in the reminder editor and in a custom mitzvah choose how many times a reminder repeats, every how many minutes, and before or after it, and see the times in advance. Done on any of them cancels the rest.',
      },
      {
        he: 'מסך הפתיחה נפתח בשפת הטלפון, עם מעבר בין עברית לאנגלית, ומסמן שהשם והטלפון אינם חובה.',
        en: "The welcome screen opens in your phone's language, with a switch between Hebrew and English, and marks the name and phone as optional.",
      },
      {
        he: 'לוגו חדש: השעון עם פעמון וספר פתוח. סימון ״עשיתי״ על מצווה פתוחה סוגר את הכרטיס בתנועה אחת, בלי קפיצות במסך.',
        en: 'A new logo: the stopwatch with a bell and an open book. Marking an open mitzvah done closes its card in one motion, with no jumps on the screen.',
      },
    ],
  },
  {
    label: '1.0.21-9',
    date: '2026-11-01',
    items: [
      {
        he: 'גופן חדש לכל האפליקציה, רוביק: עגול, חם וקריא, עם ספרות ברורות לזמנים. הסידור נשאר בגופן שלו.',
        en: 'A new typeface across the app, Rubik: rounded, warm and easy to read, with clear figures for the times. The siddur keeps its own typeface.',
      },
      {
        he: 'אייקונים חדשים למצוות, לתפילות ולסידור, שצוירו במיוחד לאפליקציה: תפילין, טלית, סידור, מזוזה, נרות שבת, הבדלה, חנוכייה, סוכה, שופר ועוד, באיורים בגווני ערכת הצבעים שבחרתם.',
        en: 'New icons for the mitzvot, the prayers and the siddur, drawn for the app: tefillin, a tallit, a siddur, a mezuzah, Shabbat candles, havdalah, a chanukiah, a sukkah, a shofar and more, as illustrations in the tones of the chosen colour theme.',
      },
      {
        he: 'עוד אייקונים חדשים: שמש עולה מעל ״שמע״ לקריאת שמע של שחרית, חלון של שחר לברכות השחר ושולחן ערוך עם כיסא לאורח לאושפיזין. בסידור, לכל טקסט אייקון משלו: חלה לברכת המזון, כינור לתיקון הכללי, נשר לנשמת כל חי, מזוודה לתפילת הדרך, טבעות לשבע ברכות ועוד.',
        en: 'More new icons: the sun rising over "Shema" for the morning Shema, a dawn window for Birchot HaShachar and a set table with a chair for the guest for Ushpizin. In the siddur, every text has an icon of its own: a challah for Birkat HaMazon, a lyre for Tikkun HaKlali, an eagle for Nishmat Kol Chai, a suitcase for the traveler\'s prayer, rings for Sheva Berachot and more.',
      },
      {
        he: 'סימון ״עשיתי״ על מצווה שפתוחה עכשיו בבית: הכפתור הופך לווי ירוק עם ניצוצות, הטבעת מתמלאת בירוק, השורה מתחלפת ל״בוצע ב-״ והכרטיס נסגר בעדינות. במקום החותמת ״נעשה!״.',
        en: 'Marking a mitzvah that is open now on Home: the button turns into a green check with sparks, the ring fills in green, the line reads "Done at" and the card closes gently, instead of the "Done!" stamp.',
      },
    ],
  },
  {
    label: '1.0.21-8',
    date: '2026-10-31',
    items: [
      {
        he: 'גם עיר שנבחרה ידנית בהגדרות מתעדכנת עכשיו לפי המקום שבו הטלפון נמצא, בפתיחה הבאה של האפליקציה, כשיש הרשאת מיקום. בלי הרשאה העיר שנבחרה נשארת.',
        en: 'A city picked by hand in Settings now also moves to where the phone is the next time the app opens, when location access is allowed. Without access the city picked stays.',
      },
    ],
  },
  {
    label: '1.0.21-7',
    date: '2026-10-31',
    items: [
      {
        he: 'סימון באיחור נספר עכשיו כבוצע בכל מקום: באחוזים, בלוח החודש, במגמות, בדוח השבועי ובהישגים. ב״היום שלי״ בבית הוא מוצג בירוק כמו כל מה שבוצע, עם תווית כתומה ״בוצע באיחור״.',
        en: 'A late mark now counts as done everywhere: percentages, the month calendar, Trends, the weekly report and badges. In My day on Home it shows in green like everything done, with an orange Done late label.',
      },
      {
        he: 'במעקב: כמה מהסימונים היו בזמן בכל תקופה, איחורים לכל מצווה, כרטיס ״לשיפור״, גרף איחורים ב-12 השבועות, ושלושה הישגים חדשים: שבוע בזמן, חודש בזמן ופחות איחורים.',
        en: 'In Tracking: how many marks were on time in each period, late marks per mitzvah, a To improve card, a 12-week chart of late marks, and three new badges: A week on time, A month on time and Fewer late marks.',
      },
      {
        he: 'העיגול של הזמן שנשאר ב״פתוח עכשיו״ גדל מעט והמספרים בו קטנו מעט, כך שהם לא נוגעים בעיגול.',
        en: 'The time-left ring in Open now is a little larger and its figures a little smaller, so they never touch it.',
      },
      {
        he: 'במסך ״מה עשית בשבת?״ סימון נספר כסימון בזמן, בלי השאלה מתי עשית.',
        en: 'In the "What did you do on Shabbat?" check-in a mark counts as made in time, with no question about when.',
      },
      {
        he: 'המיקום מתעדכן לבד לפי המקום שבו הטלפון נמצא, בכל פתיחה של האפליקציה, והזמנים וההתראות זזים איתו. עיר שנבחרה ידנית בהגדרות נשארת קבועה.',
        en: 'The location now follows where the phone is, every time the app opens, and the times and notifications move with it. A city picked by hand in Settings stays fixed.',
      },
      {
        he: 'במעקב, כרטיס ״לשיפור״ עבר לסוף ״סיכום״, אחרי העקביות לפי מצווה.',
        en: 'In Tracking, the To improve card moved to the end of Summary, after the consistency per mitzvah.',
      },
      {
        he: 'באנדרואיד, כפתור החזרה בדף הבית יוצא מהאפליקציה, ומכל לשונית אחרת חוזר לדף הבית.',
        en: 'On Android, the back button on Home leaves the app, and on any other tab returns to Home.',
      },
      {
        he: 'כשמגירה נפתחת, הרקע מאחוריה מופיע במקומו ורק המגירה עולה מלמטה.',
        en: 'When a drawer opens, the backdrop behind it appears in place and only the drawer rises from the bottom.',
      },
    ],
  },
  {
    label: '1.0.21-6',
    date: '2026-10-29',
    items: [
      {
        he: 'בקורא, הקשה קצרה על הטקסט מפעילה ועוצרת את הגלילה האוטומטית.',
        en: 'In the reader, a short tap on the text starts or stops auto-scroll.',
      },
      {
        he: 'דף בית חדש: מעגל היום עם השמש, הירח וזמני היום, ״פתוח עכשיו״ עם טבעת של הזמן שנותר, הודעות במקום אחד, ו״היום שלי״ בשלוש תצוגות: טבעות, כרטיסים או ציר.',
        en: "A new Home: the day's circle with the sun, the moon and the day's zmanim, Open now with a ring of the time left, messages in one place, and My day in three views: Rings, Cards or Timeline.",
      },
      {
        he: 'בהגדרות ← מכשיר והתראות אפשר לבחור שעות בלי התראות: לא לפני שעה מסוימת, לא אחריה, או שתיהן. התראה שנופלת בשעות האלה נדחית לשעה המותרת כשזמן המצווה עוד פתוח.',
        en: "Settings → Device and notifications can now keep notifications out of chosen hours: not before an hour, not after one, or both. A notification due in those hours moves to the allowed hour while the mitzvah's time is still open.",
      },
      {
        he: 'סימון של מצווה שהזמן שלה נגמר שואל מתי עשית: בזמן ולא סימנת, או אחרי שעבר הזמן. סימון באיחור שומר על הרצף ולא נספר באחוזים ובהישגים, ובמעקב יש דוח של כל הסימונים באיחור. במסך המצווה אפשר עכשיו לסמן את החלון של היום.',
        en: "Marking a mitzvah whose time has ended asks when you did it: in time without marking, or after the time passed. A late mark keeps your streak but does not count toward percentages and badges, and Tracking has a report of every late mark. The mitzvah screen can now mark today's window.",
      },
      {
        he: 'בדף הבית היום והלילה הם עכשיו עיגול אחד: השמש נעה על חציו העליון, הירח על חציו התחתון, וגרירה עוברת בו מהיום אל הלילה.',
        en: 'On Home the day and the night are now one circle: the sun moves along its upper half, the moon along its lower half, and a drag passes through it from the day into the night.',
      },
      {
        he: 'ב״היום שלי״ הציר מסודר לפי שעות בלבד, והכרטיסים והטבעות לפי פתוח, בוצע ופוספס. הצבעים של בוצע ופוספס מתונים, והודעות מופיעות מתחת ל״היום שלי״.',
        en: 'In My day the timeline is ordered by time alone, while the cards and rings go open, done, missed. The done and missed colours are softer, and messages now sit below My day.',
      },
    ],
  },
  {
    label: '1.0.21-5',
    date: '2026-10-28',
    items: [
      {
        he: 'מסך הרשאות חדש, בהרשמה ובהגדרות ← מכשיר והתראות: התראות, מיקום, ובאנדרואיד גם סוללה ללא הגבלה בהקשה אחת, כל אחת מסומנת ״פעיל״ כשהיא מאושרת.',
        en: 'A new permissions screen, in onboarding and in Settings → Device and notifications: notifications, location and, on Android, unrestricted battery in one tap, each marked On once granted.',
      },
      {
        he: 'בסידור, הכלים מתקפלים בזמן הקריאה לשורה קבועה עם כפתור הגלילה האוטומטית וכפתור ״כלים״, גלילה כבר לא פותחת אותם באמצע הטקסט, והקשה כפולה על הטקסט פותחת או סוגרת אותם.',
        en: 'In the siddur, the controls fold while you read into a fixed line with the auto-scroll button and a Tools button, scrolling no longer opens them mid-text, and a double tap on the text opens or closes them.',
      },
      {
        he: 'מצפן התפילה נפתח גם משחרית, מנחה וערבית בסידור, עם הצעה קצרה בכניסה שאפשר לכבות בהגדרות ← תפילה וסידור, וכפתור שחוזר לתפילה כשפונים לכותל.',
        en: 'The prayer compass also opens from Shacharit, Mincha and Maariv in the siddur, with a short offer on opening that you can turn off in Settings → Prayer and siddur, and a button back to the prayer once you face the Kotel.',
      },
      {
        he: 'האנימציות מתחילות רק כשהחלק שלהן מגיע למסך, כך שגם מה שנמצא למטה בדף מונפש כשגוללים אליו.',
        en: 'Animations now start only when their part of the screen comes into view, so what sits lower on a page animates when you scroll to it.',
      },
    ],
  },
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
