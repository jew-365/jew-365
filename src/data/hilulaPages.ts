export type Bilingual = { he: string; en: string };

export type HilulaPage = {
  bio: Bilingual;
  lessons: readonly [{ title: Bilingual; text: Bilingual }, { title: Bilingual; text: Bilingual }];
  biblical: boolean;
  works: readonly { title: Bilingual; about: Bilingual }[];
  stories: readonly { title: Bilingual; text: Bilingual; source: string }[];
  grave: {
    place: Bilingual;
    lat: number | null;
    lng: number | null;
    link: boolean;
    // A Waze search (a cemetery's name) for a reachable grave with no pinned coordinates.
    query?: string;
    noLinkReason: Bilingual | null;
  };
  sources: readonly string[];
};

export const HILULA_PAGES: Readonly<Partial<Record<string, HilulaPage>>> = {
  moshe_rabbeinu: {
    bio: {
      he: 'משה רבנו, בן עמרם ויוכבד משבט לוי, נולד במצרים וגדל בארמון פרעה. לאחר שברח למדין ורעה שם צאן, נגלה אליו ה׳ בסנה. הוא הוציא עם ישראל ממצרים, קיבל תורה בסיני ולימד אותה, והנהיג העם ארבעים שנה במדבר. לפי חז״ל נפטר בז׳ באדר ב׳תפ״ח, בגיל 120, על הר נבו, לאחר שראה הארץ מרחוק. התורה מעידה שלא קם עוד נביא כמוהו.',
      en: "Moshe Rabbeinu, son of Amram and Yocheved, was born in Egypt and raised in Pharaoh's palace. After he fled to Midian, God appeared to him at the burning bush. He led Israel out of Egypt, received the Torah at Sinai and led the people forty years in the desert. According to the Sages he died on 7 Adar 2488, aged 120, on Mount Nevo, after seeing the Land from afar. No prophet like him arose again.",
    },
    lessons: [
      {
        title: {
          he: 'ענווה אמיתית',
          en: 'True humility',
        },
        text: {
          he: 'התורה מתארת את משה ״עניו מאד מכל האדם״, אף שה׳ דיבר עמו פנים אל פנים. גדולתו לא הרחיקה אותו מאנשים, ומכאן שאפשר להיות מנהיג גדול ולשמור על ענווה.',
          en: "The Torah calls Moshe 'very humble, more than any man,' though God spoke with him face to face. His greatness never set him apart from people: a great leader can remain humble.",
        },
      },
      {
        title: {
          he: 'עמידה לצד העם',
          en: 'Standing by his people',
        },
        text: {
          he: 'אחרי חטא העגל ביקש משה רחמים על העם, ואמר שאם ה׳ לא יסלח להם, ״מחני נא מספרך״. מנהיג אמיתי עומד לצד הציבור שלו גם כשהוא טועה.',
          en: "After the golden calf, Moshe pleaded for the people and said that if God would not forgive them, 'erase me from Your book.' A true leader stands by his people even when they stumble.",
        },
      },
    ],
    biblical: true,
    works: [],
    stories: [
      {
        title: {
          he: 'הגדי שברח',
          en: 'The runaway kid',
        },
        text: {
          he: 'לפי המדרש, כשרעה משה צאנו של יתרו במדבר, ברח ממנו גדי. משה רדף אחריו עד שהגיע הגדי לבריכת מים ועצר לשתות. משה הבין שהגדי ברח מפני הצמא ושהוא עייף, הרכיב אותו על כתפו והחזיר אותו. אמר הקב״ה: מי שמרחם כך על צאן של בשר ודם, הוא שירעה צאני, ישראל.',
          en: "According to the Midrash, while Moshe was shepherding Yitro's flock in the wilderness, a young goat ran away. Moshe chased it until it reached a pool and stopped to drink. Realizing it had run from thirst and was tired, he carried it back on his shoulder. God said: one who shows such compassion to a man's flock will shepherd My flock, Israel.",
        },
        source: 'Shemot Rabbah 2:2 (https://www.sefaria.org/Shemot_Rabbah.2.2)',
      },
      {
        title: {
          he: 'משה בבית מדרשו של רבי עקיבא',
          en: "Moshe in Rabbi Akiva's study hall",
        },
        text: {
          he: 'הגמרא מספרת שכאשר עלה משה למרום, ראה הקב״ה קושר כתרים לאותיות התורה, ושמע שחכם בשם עקיבא בן יוסף ידרוש מהם הלכות רבות. משה ביקש לראותו, ומצא עצמו יושב בסוף בית מדרשו. הוא לא הבין במה עוסקים ותשש כוחו, עד שתלמיד שאל מניין הדבר, ורבי עקיבא ענה: ״הלכה למשה מסיני״. אז נתיישבה דעתו.',
          en: "The Talmud relates that when Moshe ascended on high he saw God tying crowns to the Torah's letters, for a future sage, Akiva ben Yosef, who would derive many laws from them. Moshe asked to see him and found himself at the back of Rabbi Akiva's study hall, unable to follow. His strength waned, until a student asked for a source and Rabbi Akiva answered: 'It is a law given to Moshe at Sinai.' Moshe was comforted.",
        },
        source: 'Babylonian Talmud, Menachot 29b (https://www.sefaria.org/Menachot.29b)',
      },
    ],
    grave: {
      place: {
        he: 'בגיא בארץ מואב, מול בית פעור; המקום המדויק לא נודע',
        en: 'In the valley in the land of Moab, opposite Beit Peor; the exact spot is unknown',
      },
      lat: null,
      lng: null,
      link: false,
      noLinkReason: {
        he: 'התורה אומרת שאיש לא ידע מקום קבורתו',
        en: 'The Torah states that no one knows his burial place',
      },
    },
    sources: [
      'https://www.sefaria.org/Deuteronomy.34',
      'https://www.sefaria.org/Kiddushin.38a',
      'https://www.sefaria.org/Numbers.12.3',
      'https://www.sefaria.org/Exodus.32.32',
      'https://www.sefaria.org/Shemot_Rabbah.2.2',
      'https://www.sefaria.org/Menachot.29b',
      'https://en.wikipedia.org/wiki/Moses',
    ],
  },
  aharon_hakohen: {
    bio: {
      he: 'אהרן הכהן, אחיו הבכור של משה ואחיה של מרים, היה דוברו של משה לפני פרעה ושותפו ביציאת מצרים. הוא נבחר להיות הכהן הגדול הראשון, ובניו אחריו היו לכהני ישראל לדורות. הוא שירת במשכן ונודע כאוהב שלום. נפטר בהר ההר בגיל 123, בא׳ באב ב׳תפ״ז, והוא היחיד שיום פטירתו נזכר בתורה. כל בית ישראל בכו עליו שלושים יום.',
      en: "Aharon HaKohen, elder brother of Moshe and brother of Miriam, was Moshe's spokesman before Pharaoh and his partner in the Exodus. He was chosen as the first Kohen Gadol, and his sons after him became Israel's kohanim for all generations. He served in the Mishkan and was known as a lover of peace. He died on Hor HaHar at 123, on 1 Av 2487, the only date of passing stated in the Torah. All Israel mourned him thirty days.",
    },
    lessons: [
      {
        title: {
          he: 'אוהב שלום ורודף שלום',
          en: 'Loving and pursuing peace',
        },
        text: {
          he: 'הלל לימד: ״הוי מתלמידיו של אהרן, אוהב שלום ורודף שלום״. אהרן לא חיכה שהשלום יבוא מעצמו, אלא יצא לחפש דרכים לקרב בין אנשים שרבו.',
          en: "Hillel taught: 'Be among the disciples of Aharon, loving peace and pursuing peace.' Aharon did not wait for peace to arrive; he went out to bring quarreling people back together.",
        },
      },
      {
        title: {
          he: 'לקרב באהבה',
          en: 'Drawing people close',
        },
        text: {
          he: 'הלל מתאר את אהרן כמי שאהב בריות וקירב אותן לתורה. לפי אבות דרבי נתן, אהרן בירך לשלום גם אנשים שחטאו, והם התביישו לחטוא שוב.',
          en: 'Hillel describes Aharon as one who loved people and drew them close to the Torah. According to Avot deRabbi Natan, he greeted even wrongdoers warmly, and they became ashamed to sin again.',
        },
      },
    ],
    biblical: true,
    works: [],
    stories: [
      {
        title: {
          he: 'עשיית שלום בין רעים',
          en: 'Making peace between friends',
        },
        text: {
          he: 'לפי אבות דרבי נתן, כששני אנשים רבו, היה אהרן הולך ויושב עם אחד מהם ואומר לו שחברו מצטער, קורע בגדיו ומתבייש על שפגע בו. הוא ישב עמו עד שהסיר כל כעס מלבו, ואחר כך עשה כך גם עם השני. כשנפגשו השניים, התחבקו ונישקו זה לזה.',
          en: "According to Avot deRabbi Natan, when two people quarreled, Aharon would sit with one of them and tell him that his friend was distressed, tearing his clothes in shame for having hurt him. He stayed until all anger left the man's heart, then did the same with the other. When the two met, they embraced and kissed.",
        },
        source: 'Avot deRabbi Natan, chapter 12 (https://www.sefaria.org/Avot_DeRabbi_Natan.12)',
      },
      {
        title: {
          he: 'פטירה בשלווה',
          en: 'A peaceful passing',
        },
        text: {
          he: 'רש״י מביא מן המדרש שעל הר ההר הלביש משה לאלעזר בגדי הכהונה הגדולה של אהרן אביו. אחר כך אמר לאהרן להיכנס למערה, ושם ראה מיטה מוצעת ונר דולק. משה אמר לו לעלות על המיטה, לפשוט ידיו, לסגור פיו ולעצום עיניו, וכך נפטר אהרן בשלווה. באותה שעה, אומר רש״י, השתוקק משה למיתה כזו.',
          en: 'Rashi, citing the Midrash, tells that on Hor HaHar Moshe dressed Elazar in the high-priestly garments of his father Aharon. Then he told Aharon to enter a cave, where he saw a made bed and a burning lamp. Moshe told him to lie down, stretch out his hands, close his mouth and shut his eyes, and so Aharon passed away in peace. At that moment, Rashi says, Moshe longed for such a death.',
        },
        source: 'Rashi on Numbers 20:26, from the Sifrei (https://www.sefaria.org/Rashi_on_Numbers.20.26)',
      },
    ],
    grave: {
      place: {
        he: 'הר ההר; האתר המסורתי הוא ג׳בל הארון ליד פטרה שבירדן',
        en: 'Hor HaHar; the traditional site is Jabal Harun near Petra, Jordan',
      },
      lat: null,
      lng: null,
      link: false,
      noLinkReason: {
        he: 'זיהוי הר ההר שנוי במחלוקת, ובאתר המסורתי בירדן, שמוגדר מסגד, תפילה יהודית אסורה',
        en: 'The location of Hor HaHar is disputed, and the traditional site in Jordan is treated as a mosque where Jewish prayer is forbidden',
      },
    },
    sources: [
      'https://www.sefaria.org/Numbers.20.22-29',
      'https://www.sefaria.org/Numbers.33.38-39',
      'https://www.sefaria.org/Pirkei_Avot.1.12',
      'https://www.sefaria.org/Avot_DeRabbi_Natan.12',
      'https://www.sefaria.org/Rashi_on_Numbers.20.26',
      'https://en.wikipedia.org/wiki/Tomb_of_Aaron_(Jordan)',
      'https://www.chabad.org/article.asp?aid=297584',
    ],
  },
  rachel_imeinu: {
    bio: {
      he: 'רחל אמנו, בתו הצעירה של לבן, הייתה אשתו האהובה של יעקב אבינו, שעבד בעבורה ארבע עשרה שנה. היא הייתה אמם של יוסף ובנימין. לפי המסורת נפטרה בי״א בחשוון ב׳ר״ח, בלידת בנימין, בדרך לאפרת היא בית לחם. יעקב קבר אותה על אם הדרך והציב מצבה על קברה. ירמיהו הנביא מתאר אותה מבכה על בניה שיצאו לגלות, וה׳ מבטיח לה ש״שבו בנים לגבולם״.',
      en: "Rachel Imeinu, Lavan's younger daughter, was the beloved wife of Yaakov, who worked fourteen years for her. She was the mother of Yosef and Binyamin. According to tradition she died on 11 Cheshvan 2208, giving birth to Binyamin on the road to Efrat, which is Bethlehem. Yaakov buried her by the road and set a pillar on her grave. The prophet Jeremiah describes her weeping for her exiled children, and God promising that they will return.",
    },
    lessons: [
      {
        title: {
          he: 'ויתור למען אחר',
          en: 'Giving up for another',
        },
        text: {
          he: 'רחל זכורה כמי שוויתרה על היקר לה מכול כדי שאחותה לאה לא תתבייש. היא מלמדת ששמירה על כבודו של אדם אחר שווה גם מחיר אישי גבוה.',
          en: "Rachel is remembered for giving up what was dearest to her so that her sister Leah would not be shamed. Protecting another person's dignity can be worth a high personal price.",
        },
      },
      {
        title: {
          he: 'תפילה על הבנים',
          en: 'Praying for her children',
        },
        text: {
          he: 'לפי רש״י, רחל נקברה בדרך כדי שתבקש רחמים על בניה כשיעברו שם בדרכם לגלות. קברה הפך למקום תפילה על ילדים ועל המשפחה.',
          en: 'According to Rashi, Rachel was buried by the road so that she could plead for her children as they passed on their way into exile. Her grave became a place of prayer for children and family.',
        },
      },
    ],
    biblical: true,
    works: [],
    stories: [
      {
        title: {
          he: 'הסימנים שנמסרו ללאה',
          en: 'The signs she gave Leah',
        },
        text: {
          he: 'הגמרא מספרת שרחל הזהירה את יעקב שאביה לבן רמאי ועלול להחליף אותה באחותה הגדולה. יעקב מסר לה סימנים כדי שיזהה אותה. בליל החתונה, כשלבן הביא את לאה, חששה רחל שאחותה תתבייש, ומסרה לה את הסימנים. בזכות צניעות זו, אומרת הגמרא, יצא ממנה שאול המלך.',
          en: 'The Talmud tells that Rachel warned Yaakov that her father Lavan was a trickster who might switch her for her older sister. Yaakov gave her signs so he would recognize her. On the wedding night, as Lavan brought Leah, Rachel feared her sister would be shamed and passed the signs to her. For this modesty, the Talmud says, King Shaul descended from her.',
        },
        source: 'Babylonian Talmud, Megillah 13b (https://www.sefaria.org/Megillah.13b)',
      },
      {
        title: {
          he: 'רחל מבקשת רחמים',
          en: 'Rachel pleads for her children',
        },
        text: {
          he: 'לפי המדרש, כשחרב בית המקדש ביקשו האבות ומשה רחמים על ישראל ולא נענו. אז עמדה רחל לפני הקב״ה ואמרה: היא, בשר ודם, לא קינאה באחותה ואף מסרה לה הסימנים כדי שלא תתבייש; מדוע יקנא מלך רחמן בעבודה זרה ויגלה בניה? מיד נתגלגלו רחמיו, ואמר: ״בשבילך, רחל, אני מחזיר ישראל למקומן״.',
          en: "According to the Midrash, when the Temple was destroyed the Patriarchs and Moshe pleaded for Israel without being answered. Then Rachel stood before God: she, flesh and blood, had not been jealous of her sister and even gave her the signs to spare her shame; why should the merciful King be jealous of idols and exile her children? God's mercy was stirred, and He said: 'For your sake, Rachel, I will return Israel to their place.'",
        },
        source: 'Eicha Rabbah, Petichta 24 (https://www.sefaria.org/Eikhah_Rabbah%2C_Petichta.24)',
      },
    ],
    grave: {
      place: {
        he: 'קבר רחל, בכניסה לבית לחם',
        en: "Rachel's Tomb, at the entrance to Bethlehem",
      },
      lat: 31.71935,
      lng: 35.2021,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://www.sefaria.org/Genesis.35.16-20',
      'https://www.sefaria.org/Jeremiah.31.14-16',
      'https://www.sefaria.org/Rashi_on_Genesis.48.7',
      'https://www.sefaria.org/Megillah.13b',
      'https://www.sefaria.org/Eikhah_Rabbah%2C_Petichta.24',
      'https://en.wikipedia.org/wiki/Rachel%27s_Tomb',
      'https://breslov.org/the-11th-day-of-cheshvan-the-day-of-the-passing-of-our-mother-rachel/',
    ],
  },
  david_hamelech: {
    bio: {
      he: 'דוד בן ישי, רועה צאן מבית לחם, נמשח למלך בידי שמואל הנביא וגבר בצעירותו על גלית הפלשתי. הוא היה מלך ישראל השני ומלך ארבעים שנה, שבע בחברון ושלושים ושלוש בירושלים, שבה קבע בירתו והעלה אליה ארון ה׳. הוא הכין הכול לבניין בית המקדש, שבנה בנו שלמה. דוד נקרא ״נעים זמירות ישראל״, ולפי חז״ל נפטר בחג השבועות בגיל שבעים. לפי המסורת, המשיח יבוא מזרעו.',
      en: "David son of Yishai, a shepherd from Bethlehem, was anointed king by the prophet Shmuel and as a youth defeated Goliath. Israel's second king, he reigned forty years, seven in Hebron and thirty-three in Jerusalem, which he made his capital, bringing the Ark there. He prepared everything for the Temple, which his son Shlomo built. Called 'the sweet singer of Israel,' he died, according to the Sages, on Shavuot at seventy. By tradition, the Mashiach will descend from him.",
    },
    lessons: [
      {
        title: {
          he: 'תשובה בלב שלם',
          en: 'Wholehearted repentance',
        },
        text: {
          he: 'כשנתן הנביא הוכיח את דוד על חטאו, דוד לא התגונן אלא אמר מיד: ״חטאתי לה׳״. מזמור נ״א בתהלים מבטא תשובה זו. גם מלך גדול יכול להודות בטעותו ולתקן.',
          en: "When the prophet Natan rebuked David for his sin, David did not defend himself but said at once, 'I have sinned against God.' Psalm 51 voices that repentance. Even a great king can admit his wrong and mend it.",
        },
      },
      {
        title: {
          he: 'לילות של תורה ושירה',
          en: 'Nights of Torah and song',
        },
        text: {
          he: 'לפי הגמרא, כינור היה תלוי מעל מיטתו של דוד, ובחצות הלילה ניגנה בו רוח צפונית. דוד קם ועסק בתורה עד עלות השחר. לא רק ימיו אלא גם לילותיו הוקדשו לקדושה.',
          en: "According to the Talmud, a lyre hung over David's bed, and at midnight the north wind played it. David would rise and study Torah until dawn. He gave his nights, not only his days, to holiness.",
        },
      },
    ],
    biblical: true,
    works: [],
    stories: [
      {
        title: {
          he: 'דוד וגלית',
          en: 'David and Goliath',
        },
        text: {
          he: 'דוד הצעיר נשלח להביא מזון לאחיו שבמחנה ישראל, ושמע כיצד גלית הפלשתי מחרף מערכות ישראל, כפי שעשה ארבעים יום. הוא אמר לשאול המלך שה׳, שהצילו מן הארי ומן הדוב, יצילו גם מן הפלשתי. דוד ויתר על שריון המלך, יצא עם מקלו, קלע וחמש אבנים חלוקות, ואמר לגלית שהוא בא אליו בשם ה׳. באבן אחת מן הקלע הפיל הענק ארצה.',
          en: "Young David was sent with food for his brothers in Israel's camp and heard Goliath the Philistine taunting Israel's ranks, as he had for forty days. He told King Shaul that God, who had saved him from the lion and the bear, would save him from the Philistine. Refusing the king's armor, he went out with his staff, a sling and five smooth stones, telling Goliath he came in God's name. One stone from the sling felled the giant.",
        },
        source: '1 Samuel 17 (https://www.sefaria.org/I_Samuel.17)',
      },
      {
        title: {
          he: 'דוד ומלאך המוות',
          en: 'David and the Angel of Death',
        },
        text: {
          he: 'הגמרא מספרת שדוד ביקש לדעת יום מותו, ונאמר לו שימות בשבת. מאז ישב בכל שבת ולמד תורה כל היום, ומלאך המוות לא יכול לו, כי פיו לא פסק מלימוד. ביום שנגזר, עלה המלאך ונענע אילנות בגינה שמאחורי ביתו. דוד יצא לראות, המדרגה נשברה תחתיו, הוא השתתק לרגע, ובאותו רגע נפטר.',
          en: 'The Talmud relates that David asked to know when he would die and was told it would be on Shabbat. From then on he studied Torah all day every Shabbat, and the Angel of Death could not take him, for his mouth never paused. On the appointed day the angel shook the trees in the garden behind his house. David went out to look, a step broke beneath him, his study paused for a moment, and he died.',
        },
        source: 'Babylonian Talmud, Shabbat 30a-b (https://www.sefaria.org/Shabbat.30b)',
      },
    ],
    grave: {
      place: {
        he: 'קבר דוד המלך המסורתי בהר ציון, ירושלים',
        en: 'The traditional Tomb of King David on Mount Zion, Jerusalem',
      },
      lat: 31.77171,
      lng: 35.22922,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://www.sefaria.org/I_Samuel.16-17',
      'https://www.sefaria.org/II_Samuel.5.4-5',
      'https://www.sefaria.org/II_Samuel.12.13',
      'https://www.sefaria.org/I_Kings.2.10-11',
      'https://www.sefaria.org/Jerusalem_Talmud_Chagigah.2.3',
      'https://www.sefaria.org/Ruth_Rabbah.3.2',
      'https://www.sefaria.org/Berakhot.3b',
      'https://www.sefaria.org/Shabbat.30a',
      'https://en.wikipedia.org/wiki/David%27s_Tomb',
    ],
  },
  shmuel_hanavi: {
    bio: {
      he: 'שמואל הנביא, בנם של אלקנה וחנה מרמתיים צופים, נולד לאחר תפילתה של חנה וגדל במשכן שבשילה אצל עלי הכהן. הוא היה האחרון לשופטים ונביא גדול, שהשיב העם לעבודת ה׳ וסבב בכל שנה בין בית אל, הגלגל והמצפה כדי לשפוט. בידיו נמשחו לממלכה שאול, המלך הראשון, ואחריו דוד. הוא נקבר בביתו ברמה, ולפי המסורת נפטר בכ״ח באייר.',
      en: "Shmuel HaNavi, son of Elkanah and Chana of Ramatayim Tzofim, was born after Chana's prayer and raised in the Mishkan at Shiloh under Eli the Kohen. The last of the Judges and a great prophet, he turned the people back to God and judged them yearly in Beit El, Gilgal and Mitzpah. He anointed Shaul as the first king, and later David. He was buried in his home at Ramah; by tradition he died on 28 Iyar.",
    },
    lessons: [
      {
        title: {
          he: 'ידיים נקיות',
          en: 'Clean hands',
        },
        text: {
          he: 'לפני שפרש מהנהגת העם, שאל שמואל בפני כל ישראל אם לקח פעם שור או חמור מאיש, או עשק מישהו, והעם העיד שלא. מנהיג צריך לשמור על יושר מוחלט.',
          en: "Before stepping down, Shmuel asked all Israel whether he had ever taken anyone's ox or donkey or wronged anyone, and the people testified he had not. A leader must keep complete integrity.",
        },
      },
      {
        title: {
          he: 'לצאת אל העם',
          en: 'Going out to the people',
        },
        text: {
          he: 'שמואל לא חיכה שיבואו אליו, אלא סבב בכל שנה בין ערי ישראל כדי לשפוט ולהדריך. לפי הגמרא, ביתו היה עמו בכל מקום, כדי שלא ייהנה מכספי הציבור.',
          en: "Shmuel did not wait for people to come to him; each year he travelled among Israel's towns to judge and guide them. The Talmud adds that he took his household everywhere, so as not to live off the public.",
        },
      },
    ],
    biblical: true,
    works: [],
    stories: [
      {
        title: {
          he: '״דבר, כי שומע עבדך״',
          en: "'Speak, for Your servant listens'",
        },
        text: {
          he: 'שמואל הנער שכב בלילה בהיכל ה׳ בשילה ושמע קול קורא בשמו. הוא רץ אל עלי הכהן וחשב שהוא קרא לו, וכך שלוש פעמים. עלי הבין שה׳ קורא לנער, ולימד אותו לענות: ״דבר ה׳, כי שומע עבדך״. כשנקרא שוב ענה ״דבר, כי שומע עבדך״, וקיבל את נבואתו הראשונה. מאז ידע כל ישראל שנאמן שמואל לנביא.',
          en: "Young Shmuel was sleeping in God's sanctuary at Shiloh when he heard a voice call his name. He ran to Eli, thinking he had called, three times over. Eli understood that God was calling the boy and taught him to answer: 'Speak, God, for Your servant is listening.' When called again he answered, 'Speak, for Your servant is listening,' and received his first prophecy. From then all Israel knew Shmuel was a trusted prophet.",
        },
        source: '1 Samuel 3 (https://www.sefaria.org/I_Samuel.3)',
      },
    ],
    grave: {
      place: {
        he: 'נבי סמואל, קבר שמואל הנביא המסורתי, צפונית לירושלים',
        en: 'Nabi Samwil, the traditional Tomb of Shmuel HaNavi, north of Jerusalem',
      },
      lat: 31.83279,
      lng: 35.18024,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://www.sefaria.org/I_Samuel.1-3',
      'https://www.sefaria.org/I_Samuel.7.15-17',
      'https://www.sefaria.org/I_Samuel.12.1-5',
      'https://www.sefaria.org/I_Samuel.25.1',
      'https://www.sefaria.org/Berakhot.10b',
      'https://en.wikipedia.org/wiki/Tomb_of_Samuel',
      'https://aspaqlaria.aishdas.org/2023/05/18/the-yahrzeit-of-shemuel-hanavi/',
    ],
  },
  rashbi: {
    bio: {
      he: 'רבי שמעון בר יוחאי, הרשב״י, היה תנא בארץ ישראל במאה השנייה לספירה ומגדולי תלמידיו של רבי עקיבא. במשנה הוא נקרא ״רבי שמעון״. כשגזרו הרומאים עליו מוות, הסתתר עם בנו רבי אלעזר במערה שלוש עשרה שנה ועסק שם בתורה. לפי המסורת, ספר הזוהר מבוסס על תורתו. הוא קבור במירון, והילולתו נחוגה בל״ג בעומר.',
      en: "Rabbi Shimon bar Yochai, the Rashbi, was a sage of the Land of Israel in the second century and one of Rabbi Akiva's foremost students. The Mishnah calls him 'Rabbi Shimon.' When the Romans sentenced him to death, he hid with his son Rabbi Elazar in a cave for thirteen years, studying Torah. According to tradition, the Zohar is based on his teachings. He is buried in Meron, and his hilula is celebrated on Lag BaOmer.",
    },
    lessons: [
      {
        title: {
          he: 'תורתו אומנותו',
          en: "Torah as his life's work",
        },
        text: {
          he: 'הגמרא מביאה את רשב״י וחבריו כדוגמה לאנשים ש״תורתם אומנותם״ ואינם מפסיקים מלימודם. גם שנות המערה הפכו אצלו לשנות לימוד, ומהן לומדים כמה כוח יש בהתמדה.',
          en: "The Talmud cites Rashbi and his colleagues as the model of those 'whose Torah is their vocation,' never interrupting their study. Even his years in the cave became years of learning, showing the power of steady dedication.",
        },
      },
      {
        title: {
          he: 'דברי תורה על השולחן',
          en: 'Torah at the table',
        },
        text: {
          he: 'רבי שמעון לימד במשנה: שלושה שאכלו על שולחן אחד ואמרו עליו דברי תורה, כאילו אכלו משולחנו של מקום. גם ארוחה רגילה יכולה להפוך לרגע של קדושה.',
          en: "Rabbi Shimon taught in the Mishnah that three who ate at one table and shared words of Torah there are as if they ate at God's table. An ordinary meal can become a moment of holiness.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'ספר הזוהר',
          en: 'The Zohar',
        },
        about: {
          he: 'יסוד ספרות הקבלה, פירוש סודי לתורה; לפי המסורת נכתב על פי תורתו.',
          en: 'The foundational work of Kabbalah, a mystical commentary on the Torah; by tradition based on his teachings.',
        },
      },
      {
        title: {
          he: 'מכילתא דרבי שמעון בר יוחאי',
          en: 'Mekhilta deRabbi Shimon bar Yochai',
        },
        about: {
          he: 'מדרש הלכה על ספר שמות, המיוחס לבית מדרשו.',
          en: 'A halachic Midrash on the book of Exodus, attributed to his school.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'המערה',
          en: 'The cave',
        },
        text: {
          he: 'הגמרא מספרת שרשב״י ובנו ברחו מגזירת הרומאים והסתתרו במערה, ונבראו להם עץ חרוב ומעיין מים. שתים עשרה שנה למדו שם תורה. כשיצאו וראו אנשים חורשים וזורעים במקום ללמוד, לא יכלו לשאת זאת, ובת קול החזירה אותם למערה לעוד שנה. כשיצאו שוב, ראו זקן רץ בערב שבת עם שני צרורות הדס, כנגד ״זכור״ ו״שמור״, ונתיישבה דעתם: ״ראה כמה חביבות מצוות על ישראל״.',
          en: "The Talmud tells that Rashbi and his son fled a Roman decree and hid in a cave, sustained by a carob tree and a spring, studying Torah for twelve years. On leaving, they could not bear seeing people plowing and sowing, and a heavenly voice sent them back for a year. Later, an old man hurrying before Shabbat with two myrtle bundles, for 'remember' and 'keep,' calmed them: 'See how beloved the mitzvot are to Israel.'",
        },
        source: 'Babylonian Talmud, Shabbat 33b (https://www.sefaria.org/Shabbat.33b)',
      },
      {
        title: {
          he: 'יום ההילולא',
          en: 'The day of the hilula',
        },
        text: {
          he: 'לפי תיאור הזוהר באדרא זוטא, ביום פטירתו כינס רשב״י את תלמידיו וגילה להם סודות תורה עמוקים, ורבי אבא כתב את דבריו. הזוהר מספר שכל אותו היום אש סבבה סביב הבית, וכשסרה האש מצאו שנפטר. הילולתו בל״ג בעומר מצוינת בשמחה, בשירה ובמדורות.',
          en: "According to the Zohar's Idra Zuta, on the day of his passing Rashbi gathered his students and revealed deep secrets of the Torah, which Rabbi Abba wrote down. The Zohar relates that all that day a fire surrounded the house, and when it lifted they found he had passed away. His hilula on Lag BaOmer is marked with joy, song and bonfires.",
        },
        source: 'Zohar III 287b-296b, Idra Zuta; see https://en.wikipedia.org/wiki/Shimon_bar_Yochai',
      },
    ],
    grave: {
      place: {
        he: 'ציון רבי שמעון בר יוחאי, מירון',
        en: 'Tomb of Rabbi Shimon bar Yochai, Meron',
      },
      lat: 32.98082,
      lng: 35.4406,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://www.sefaria.org/Shabbat.33b',
      'https://www.sefaria.org/Shabbat.11a',
      'https://www.sefaria.org/Pirkei_Avot.3.3',
      'https://en.wikipedia.org/wiki/Shimon_bar_Yochai',
      'https://he.wikipedia.org/wiki/רבי_שמעון_בר_יוחאי',
    ],
  },
  rabbi_meir_baal_haness: {
    bio: {
      he: 'רבי מאיר היה תנא בארץ ישראל במאה השנייה, מגדולי תלמידיו של רבי עקיבא ובעלה של ברוריה החכמה. לפי הגמרא נקרא ״מאיר״ משום שהאיר עיני חכמים בהלכה, ורבי יוחנן קבע ש״סתם משנה רבי מאיר״. הכינוי ״בעל הנס״ קשור להצלת גיסתו, שבה לימד לומר ״אלהא דמאיר ענני״. לפי המסורת הוא קבור בטבריה, ונהוג לתת צדקה בשמו לעניי ארץ ישראל.',
      en: "Rabbi Meir, a second-century sage, was a leading student of Rabbi Akiva and husband of the learned Beruriah. The Talmud says he was called 'Meir' because he enlightened the eyes of the sages, and that an unattributed Mishnah follows his view. 'Baal HaNes' recalls a rescue in which he taught a guard to say 'God of Meir, answer me.' By tradition he is buried in Tiberias; charity in his name supports the poor of the Land of Israel.",
    },
    lessons: [
      {
        title: {
          he: 'לאכול התוך ולזרוק הקליפה',
          en: 'Fruit kept, peel discarded',
        },
        text: {
          he: 'רבי מאיר המשיך ללמוד תורה מרבו אלישע בן אבויה גם אחרי שזה סר מדרכו. הגמרא משווה אותו למי שמצא רימון, אכל תוכו וזרק קליפתו: אפשר ללמוד חכמה מכל אדם, בתבונה ובהבחנה.',
          en: "Rabbi Meir kept learning Torah from his teacher Elisha ben Avuya even after Elisha strayed. The Talmud likens him to one who ate a pomegranate's fruit and threw away the peel: wisdom can be taken from anyone, with discernment.",
        },
      },
      {
        title: {
          he: 'שלום לפני כבוד',
          en: 'Peace before honor',
        },
        text: {
          he: 'כשאישה הגיעה אליו בעקבות נדר של בעלה שתירק בפניו, העמיד רבי מאיר פנים שעינו כואבת וביקש שתירק בה, כדי להשכין שלום בביתה. הוא ויתר על כבודו כדי לקרב בין בעל לאשתו.',
          en: "When a husband vowed that his wife must spit in Rabbi Meir's face, the rabbi pretended his eye hurt and asked her to spit in it, restoring peace to their home. He gave up his honor for peace.",
        },
      },
    ],
    biblical: false,
    works: [],
    stories: [
      {
        title: {
          he: '״אלהא דמאיר ענני״',
          en: "'God of Meir, answer me'",
        },
        text: {
          he: 'הגמרא מספרת שאחותה של ברוריה הושמה בידי הרומאים בבית בושת. רבי מאיר הלך לשם בתחפושת, וכשמצא שעמדה בצניעותה, הציע לשומר כלי מלא דינרים: מחציתו לשלטונות ומחציתו לו. השומר שאל מה יעשה כשייגמר הכסף, ורבי מאיר אמר לו לומר ״אלהא דמאיר ענני״ וינצל. השומר שחרר אותה, ולאחר זמן אכן ניצל מסכנה באמירת המילים האלה.',
          en: "The Talmud tells that the Romans placed Beruriah's sister in a brothel. Rabbi Meir came in disguise and, finding she had kept her modesty, offered the guard a vessel of coins: half for the authorities, half for himself. Asked what the guard would do when the money ran out, Rabbi Meir told him to say 'God of Meir, answer me' and he would be saved. The guard freed her, and later was indeed rescued by those words.",
        },
        source: 'Babylonian Talmud, Avodah Zarah 18a-b (https://www.sefaria.org/Avodah_Zarah.18a)',
      },
      {
        title: {
          he: 'הפיקדון',
          en: 'The deposit',
        },
        text: {
          he: 'לפי המדרש, בשבת אחת, בזמן שרבי מאיר דרש בבית המדרש, מתו שני בניו. אשתו הניחה אותם על המיטה וכיסתה אותם בסדין. במוצאי שבת, אחרי ההבדלה והסעודה, שאלה אותו: אדם הפקיד אצלי פיקדון ועכשיו בא לקחתו, האם להחזירו? ענה: ודאי. אז הראתה לו את בניו. הוא בכה, ולבסוף אמר: ״ה׳ נתן וה׳ לקח, יהי שם ה׳ מבורך״.',
          en: "According to the Midrash, one Shabbat, while Rabbi Meir was teaching in the study hall, his two sons died. His wife laid them on a bed and covered them. After Havdalah and the meal, she asked him: someone left a deposit with me and now wants it back; must I return it? Certainly, he answered. She then showed him his sons. He wept, and at last said: 'God gave and God has taken; blessed be God's name.'",
        },
        source: 'Midrash Mishlei 31 (https://www.sefaria.org/Midrash_Mishlei.31)',
      },
    ],
    grave: {
      place: {
        he: 'ציון רבי מאיר בעל הנס, טבריה',
        en: 'Tomb of Rabbi Meir Baal HaNes, Tiberias',
      },
      lat: 32.766,
      lng: 35.5499,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://www.sefaria.org/Eruvin.13b',
      'https://www.sefaria.org/Sanhedrin.86a',
      'https://www.sefaria.org/Avodah_Zarah.18a',
      'https://www.sefaria.org/Chagigah.15b',
      'https://www.sefaria.org/Vayikra_Rabbah.9.9',
      'https://www.sefaria.org/Midrash_Mishlei.31',
      'https://www.hamichlol.org.il/רבי_מאיר_בעל_הנס',
      'https://he.wikipedia.org/wiki/קבר_רבי_מאיר_בעל_הנס',
    ],
  },
  rabbi_yehuda_hanasi: {
    bio: {
      he: 'רבי יהודה הנשיא, המכונה ״רבי״ ו״רבנו הקדוש״, היה נשיא הסנהדרין בסוף המאה השנייה ובתחילת השלישית, בנו של רבן שמעון בן גמליאל וצאצא של הלל הזקן. הוא ישב בבית שערים ובציפורי, ונודע בגדולתו בתורה ובעושרו. מפעלו המרכזי הוא עריכת המשנה, שבה כינס תורה שבעל פה לשישה סדרים. לפי התלמוד הייתה לו ידידות קרובה עם קיסר רומאי בשם אנטונינוס. הוא נפטר בציפורי.',
      en: "Rabbi Yehuda HaNasi, called 'Rebbi' and 'our holy teacher,' was Nasi of the Sanhedrin around 200 CE, son of Rabban Shimon ben Gamliel and a descendant of Hillel. He led from Beit She'arim and Tzippori and was known for his Torah greatness and wealth. His central achievement was editing the Mishnah, gathering the Oral Torah into six orders. The Talmud tells of his close friendship with a Roman emperor called Antoninus. He died in Tzippori.",
    },
    lessons: [
      {
        title: {
          he: 'מצווה קלה כחמורה',
          en: 'Every mitzvah matters',
        },
        text: {
          he: 'רבי לימד להיזהר במצווה קלה כמו במצווה חמורה, כי שכרן של המצוות אינו ידוע לנו. כל מעשה טוב, קטן כגדול, ראוי ליחס רציני.',
          en: 'Rebbi taught to be as careful with a light mitzvah as with a weighty one, for we do not know the reward of each. Every good deed, small or great, deserves full attention.',
        },
      },
      {
        title: {
          he: 'ענווה בגדולה',
          en: 'Humility amid greatness',
        },
        text: {
          he: 'המשנה אומרת שכאשר מת רבי בטלו הענווה ויראת החטא. אף שהיה נשיא, עשיר ומקורב לשלטון, הוא נזכר בעיקר כאדם עניו.',
          en: 'The Mishnah says that when Rebbi died, humility and fear of sin ceased. Though he was Nasi, wealthy and close to the rulers, he is remembered above all as a humble man.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'המשנה',
          en: 'The Mishnah',
        },
        about: {
          he: 'קובץ התורה שבעל פה בשישה סדרים, שערך וסידר; יסוד התלמוד הבבלי והירושלמי.',
          en: 'The Oral Torah in six orders, which he edited and arranged; the basis of both Talmuds.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'העגל שביקש מחסה',
          en: 'The calf seeking refuge',
        },
        text: {
          he: 'הגמרא מספרת שעגל שהובל לשחיטה ברח, הניח ראשו בכנף בגדו של רבי ובכה. רבי אמר לו: ״לך, לכך נוצרת״. בשמים נאמר: הואיל ולא ריחם, יבואו עליו ייסורים. שנים אחר כך טאטאה שפחתו גורי חולדה מביתו, ורבי אמר לה להניח להם, שהרי ״ורחמיו על כל מעשיו״. בשמים נאמר: הואיל ומרחם, ירוחם, וייסוריו עזבו אותו.',
          en: "The Talmud tells that a calf being led to slaughter fled, hid its head in Rebbi's cloak and wept. Rebbi said, 'Go, for this you were created.' Heaven decreed: since he showed no mercy, suffering will come upon him. Years later, when his maidservant was sweeping young weasels out, Rebbi told her to leave them, for 'His mercies are on all His works.' Heaven said: since he is merciful, let him be shown mercy, and his suffering left.",
        },
        source: 'Babylonian Talmud, Bava Metzia 85a (https://www.sefaria.org/Bava_Metzia.85a)',
      },
      {
        title: {
          he: 'תפילת השפחה',
          en: "The maidservant's prayer",
        },
        text: {
          he: 'ביום פטירתו של רבי גזרו החכמים תענית והתפללו בלי הפסקה שלא ימות. שפחתו עלתה לגג והתפללה שהתחתונים ינצחו. אך כשראתה כמה הוא סובל, התפללה שהעליונים ינצחו. כשראתה שהחכמים אינם פוסקים מתפילתם, השליכה כד מן הגג. הם השתתקו לרגע, ונשמתו של רבי עלתה למרום.',
          en: "On the day Rebbi lay dying, the sages declared a fast and prayed without pause that he not die. His maidservant went up to the roof and prayed that those below would prevail. But seeing how he suffered, she prayed that those above would prevail. When the sages would not stop praying, she threw a jar from the roof; they fell silent for a moment, and Rebbi's soul departed.",
        },
        source: 'Babylonian Talmud, Ketubot 104a (https://www.sefaria.org/Ketubot.104a)',
      },
    ],
    grave: {
      place: {
        he: 'בית שערים לפי התלמוד; מסורת אחרת מציינת קבר בציפורי',
        en: "Beit She'arim according to the Talmud; another tradition marks a grave in Tzippori",
      },
      lat: null,
      lng: null,
      link: false,
      noLinkReason: {
        he: 'מקום הקבורה שנוי במחלוקת בין בית שערים לציפורי, וזיהוי המערה בבית שערים אינו ודאי',
        en: "The burial place is disputed between Beit She'arim and Tzippori, and the identification of the cave at Beit She'arim is uncertain",
      },
    },
    sources: [
      'https://www.sefaria.org/Pirkei_Avot.2.1',
      'https://www.sefaria.org/Sotah.49b',
      'https://www.sefaria.org/Bava_Metzia.85a',
      'https://www.sefaria.org/Ketubot.104a',
      'https://www.hamichlol.org.il/רבי_(תנא)',
      'https://en.wikipedia.org/wiki/Judah_ha-Nasi',
      'https://www.inn.co.il/news/555617',
    ],
  },
  rashi: {
    bio: {
      he: 'רש״י, רבי שלמה יצחקי, נולד בטרואה שבצרפת בשנת ד׳ת״ת (1040). הוא למד בישיבות וורמייזא ומגנצא אצל תלמידי רבנו גרשום, חזר לעירו, עמד בראש בית הדין והקים ישיבה. פירושיו הקצרים והבהירים לתנ״ך ולתלמוד הבבלי הפכו לבסיס הלימוד בכל קהילות ישראל. לא היו לו בנים; בנותיו היו בקיאות בתורה, ונכדיו, ובהם הרשב״ם ורבנו תם, היו מראשוני בעלי התוספות. נפטר בכ״ט בתמוז ד׳תתס״ה.',
      en: 'Rashi, Rabbi Shlomo Yitzchaki, was born in Troyes, France, in 1040. He studied in Worms and Mainz under students of Rabbeinu Gershom, then returned home, headed the rabbinical court and founded a yeshiva. His concise, lucid commentaries on the Tanach and the Babylonian Talmud became the foundation of Jewish learning. He had no sons; his daughters were learned, and his grandsons, among them the Rashbam and Rabbeinu Tam, were early Tosafists. He died on 29 Tammuz 4865 (1105).',
    },
    lessons: [
      {
        title: {
          he: 'בהירות לכל לומד',
          en: 'Clarity for every learner',
        },
        text: {
          he: 'רש״י ביקש להסביר ״פשוטו של מקרא״ במילים מעטות וברורות, כך שגם ילד וגם תלמיד חכם יבינו. הסבר טוב פותח שערי תורה לכל אדם.',
          en: 'Rashi set out to explain the plain meaning of the text in few, clear words, so that both a child and a scholar could understand. A good explanation opens the Torah to everyone.',
        },
      },
      {
        title: {
          he: 'האומץ לומר ״איני יודע״',
          en: "Saying 'I do not know'",
        },
        text: {
          he: 'על פסוק בבראשית (כ״ח, ה) כתב רש״י: ״איני יודע מה מלמדנו״. גדול הפרשנים לא חשש להודות במה שאינו יודע, וכך לימד יושר בלימוד.',
          en: "On a verse in Genesis (28:5) Rashi wrote: 'I do not know what this teaches us.' The greatest of commentators was unafraid to admit what he did not know, teaching honesty in learning.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'פירוש רש״י על התורה',
          en: "Rashi's commentary on the Torah",
        },
        about: {
          he: 'הפירוש הנלמד ביותר על החומש, המשלב פשט ומדרש בקיצור ובבהירות.',
          en: 'The most studied commentary on the Chumash, combining plain meaning and Midrash concisely and clearly.',
        },
      },
      {
        title: {
          he: 'פירוש רש״י על נביאים וכתובים',
          en: 'Commentary on the Prophets and Writings',
        },
        about: {
          he: 'פירוש לרוב ספרי התנ״ך, המודפס במקראות גדולות.',
          en: 'A commentary on most books of the Tanach, printed in Mikraot Gedolot.',
        },
      },
      {
        title: {
          he: 'פירוש רש״י על התלמוד הבבלי',
          en: 'Commentary on the Babylonian Talmud',
        },
        about: {
          he: 'הסבר שוטף לרוב מסכתות הש״ס, המודפס בשוליים הפנימיים של דף הגמרא.',
          en: 'A running explanation of most Talmud tractates, printed in the inner margin of the Talmud page.',
        },
      },
      {
        title: {
          he: 'תשובות רש״י',
          en: 'Responsa of Rashi',
        },
        about: {
          he: 'תשובותיו לשאלות בהלכה, שנאספו ונדפסו בדורות מאוחרים.',
          en: 'His answers to halachic questions, collected and published in later generations.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'האבן היקרה שהושלכה לים',
          en: 'The gem thrown into the sea',
        },
        text: {
          he: 'לפי המסורת, אביו של רש״י, רבי יצחק, היה עני ומצא אבן יקרה. כשהתברר לו שהקונים רוצים בה כדי לקשט בה חפץ של פולחן זר, לא רצה שתשמש לכך, והשליך אותה לים. יצאה בת קול והבטיחה לו בן שיאיר את עיני העולם בתורתו, ובשנה שלאחר מכן נולד רש״י.',
          en: "According to tradition, Rashi's father, Rabbi Yitzchak, was a poor man who found a precious gem. When he learned the buyers wanted it to adorn an object of their worship, he would not let it serve that purpose and threw it into the sea. A heavenly voice promised him a son who would light up the world with Torah, and the next year Rashi was born.",
        },
        source:
          'Chabad.org, Rashi biography (https://www.chabad.org/library/article_cdo/aid/111831/jewish/Rashi.htm); Wikipedia, Rashi, Legends (https://en.wikipedia.org/wiki/Rashi)',
      },
      {
        title: {
          he: 'הגומחה בוורמייזא',
          en: 'The niche in Worms',
        },
        text: {
          he: 'לפי אגדה עממית, אמו של רש״י, כשהייתה מעוברת בו, הלכה בסמטה צרה ברובע היהודי של וורמייזא, ושתי מרכבות דהרו לעברה. היא נצמדה לקיר, והקיר נפתח וקיבל אותה לתוכו. הגומחה מוצגת עד היום בקיר בית הכנסת של וורמייזא.',
          en: "A folk legend tells that when Rashi's mother was expecting him, she was walking down a narrow lane in the Jewish quarter of Worms as two carriages bore down on her. She pressed herself against a wall, which opened to shelter her. The niche is still shown in the wall of the Worms synagogue.",
        },
        source: 'Wikipedia, Rashi, Legends (https://en.wikipedia.org/wiki/Rashi)',
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות היהודי העתיק של טרואה, צרפת',
        en: 'The old Jewish cemetery of Troyes, France',
      },
      lat: null,
      lng: null,
      link: false,
      noLinkReason: {
        he: 'בית הקברות העתיק נשכח לפני מאות שנים ומקום הקבר עצמו אינו ידוע; אנדרטה מציינת את אתר בית הקברות',
        en: "The medieval cemetery was lost centuries ago and the grave itself is unknown; a monument marks the cemetery's site",
      },
    },
    sources: [
      'https://en.wikipedia.org/wiki/Rashi',
      'https://www.chabad.org/library/article_cdo/aid/111831/jewish/Rashi.htm',
      'https://www.sefaria.org/Rashi_on_Genesis.28.5',
      'https://jguideeurope.org/?p=14152',
      'https://chareidi.org/archives5765/MTS65features.htm',
    ],
  },
  rambam: {
    bio: {
      he: 'הרמב״ם, רבי משה בן מימון, נולד בקורדובה שבספרד בשנת 1138 (או 1135). משפחתו נדדה מפני רדיפות האלמוהדים, דרך מרוקו וארץ ישראל, עד שהשתקעה במצרים. שם היה רופא בחצר השלטון ומנהיג הקהילה היהודית. הוא חיבר פירוש למשנה, ספר המצוות, ״משנה תורה״, ספר ההלכה המקיף הראשון, ו״מורה נבוכים״, וגם ספרי רפואה ואגרות. נפטר בכ׳ בטבת ד׳תתקס״ה (1204) בפוסטאט, ולפי המסורת נקבר בטבריה.',
      en: 'The Rambam, Rabbi Moshe ben Maimon, was born in Córdoba, Spain, in 1138 (or 1135). Fleeing Almohad persecution, his family moved through Morocco and the Land of Israel to Egypt, where he became a court physician and communal leader. He wrote a Mishnah commentary, the Mishneh Torah, the first comprehensive code of Jewish law, the Guide for the Perplexed, and medical works. He died in Fustat on 20 Tevet 4965 (1204); by tradition he was buried in Tiberias.',
    },
    lessons: [
      {
        title: {
          he: 'דרך האמצע',
          en: 'The middle path',
        },
        text: {
          he: 'הרמב״ם לימד שהדרך הישרה היא המידה הבינונית בכל תכונה: לא כעסן ולא אדיש, לא קמצן ולא פזרן. איזון כזה הוא הדרך לחיים שלמים.',
          en: 'The Rambam taught that the right path is the middle measure of every trait: neither quick to anger nor indifferent, neither stingy nor wasteful. Such balance is the way to a whole life.',
        },
      },
      {
        title: {
          he: 'הצדקה הגבוהה ביותר',
          en: 'The highest charity',
        },
        text: {
          he: 'בשמונה מעלות הצדקה שמנה, המעלה העליונה היא לחזק אדם לפני שייפול: מתנה, הלוואה, שותפות או מציאת עבודה, כדי שלא יצטרך לבקש מאחרים.',
          en: 'Of the eight levels of charity he listed, the highest is to strengthen a person before he falls: a gift, a loan, a partnership or a job, so he never needs to ask others.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'פירוש המשניות',
          en: 'Commentary on the Mishnah',
        },
        about: {
          he: 'פירוש לכל המשנה, ובו גם שלושה עשר עיקרי האמונה.',
          en: 'A commentary on the whole Mishnah, including the Thirteen Principles of Faith.',
        },
      },
      {
        title: {
          he: 'ספר המצוות',
          en: 'Sefer HaMitzvot',
        },
        about: {
          he: 'מניין תרי״ג המצוות והכללים למנייתן.',
          en: 'An enumeration of the 613 commandments and the rules for counting them.',
        },
      },
      {
        title: {
          he: 'משנה תורה (היד החזקה)',
          en: 'Mishneh Torah',
        },
        about: {
          he: 'ספר הלכה מקיף בארבעה עשר ספרים, הכולל כל דיני התורה.',
          en: 'A comprehensive code of Jewish law in fourteen books, covering every area of Torah law.',
        },
      },
      {
        title: {
          he: 'מורה נבוכים',
          en: 'Guide for the Perplexed',
        },
        about: {
          he: 'חיבור פילוסופי המיישב בין אמונה לשכל, למי שנבוך בשאלות אלו.',
          en: 'A philosophical work reconciling faith and reason for readers perplexed by such questions.',
        },
      },
      {
        title: {
          he: 'אגרת תימן',
          en: 'Epistle to Yemen',
        },
        about: {
          he: 'מכתב חיזוק ליהודי תימן בעת רדיפות ומשיח שקר.',
          en: "A letter strengthening Yemen's Jews during persecution and a false messiah.",
        },
      },
      {
        title: {
          he: 'פרקי משה ברפואה',
          en: 'Medical Aphorisms',
        },
        about: {
          he: 'אחד מחיבוריו הרפואיים: אוסף קצר של כללים ברפואה.',
          en: 'One of his medical works: a collection of short medical maxims.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'יום עבודה של הרמב״ם',
          en: "A day in the Rambam's life",
        },
        text: {
          he: 'כשמתרגמו שמואל אבן תיבון ביקש לבקרו, תיאר הרמב״ם במכתב סדר יומו: בכל בוקר נסע לקהיר לבית השולטן, ונשאר שם רוב היום כשמישהו בחצר חלה. אחר הצהריים שב לפוסטאט, רעב, ומצא ביתו מלא חולים, יהודים ושאינם יהודים, וטיפל בהם עד הלילה. לכן, כתב, לא יוכל להקדיש לאורחו אפילו שעה אחת של לימוד.',
          en: 'When his translator Shmuel ibn Tibbon wished to visit, the Rambam described his day in a letter. Each morning he rode to Cairo to attend the Sultan, staying most of the day when anyone at court was ill. He returned to Fustat in the afternoon, famished, to find his house full of patients, Jews and non-Jews alike, and treated them into the night. So, he wrote, he could not spare his guest even one hour of study.',
        },
        source: "Rambam's letter to Shmuel ibn Tibbon, 1199 (https://www.posenlibrary.com/node/13472)",
      },
      {
        title: {
          he: 'שמו בתפילת הקדיש',
          en: 'His name in the Kaddish',
        },
        text: {
          he: 'יהודי תימן סבלו רדיפות קשות, ואיש שהכריז על עצמו כמשיח בלבל רבים מהם. הרמב״ם שלח להם אגרת ארוכה, ״אגרת תימן״, שבה חיזק את אמונתם והזהיר מפני משיח השקר. בהכרת תודה על עזרתו הוסיפו יהודי תימן את שמו לתפילת הקדיש שלהם.',
          en: "Yemen's Jews suffered harsh persecution, and a man claiming to be the Messiah confused many of them. The Rambam sent them a long letter, the Epistle to Yemen, strengthening their faith and warning against the false messiah. Grateful for his help, the Jews of Yemen added his name to their Kaddish prayer.",
        },
        source:
          'Nissen Mangel, Rambam (Kehot, 1985), chapter Responsa, on Chabad.org (https://www.chabad.org/library/article_cdo/aid/107783/jewish/Responsa.htm); Aish.com, How Maimonides Saved the Jews of Yemen (https://aish.com/how-maimonides-saved-the-jews-of-yemen)',
      },
    ],
    grave: {
      place: {
        he: 'קבר הרמב״ם, טבריה',
        en: 'Tomb of the Rambam, Tiberias',
      },
      lat: 32.78995,
      lng: 35.5373,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Maimonides',
      'https://www.sefaria.org/Mishneh_Torah,_Human_Dispositions.1.4',
      'https://www.sefaria.org/Mishneh_Torah,_Gifts_to_the_Poor.10.7',
      'https://www.posenlibrary.com/node/13472',
      'https://www.jewishhistory.org/maimonides-letter-to-a-friend/',
      'https://www.chabad.org/library/article_cdo/aid/107783/jewish/Responsa.htm',
      'https://aish.com/how-maimonides-saved-the-jews-of-yemen',
      'https://en.wikipedia.org/wiki/Epistle_to_Yemen',
      'https://en.wikipedia.org/wiki/Tomb_of_Maimonides',
    ],
  },
  ramban: {
    bio: {
      he: 'הרמב״ן, רבי משה בן נחמן, נולד בג׳ירונה שבקטלוניה בשנת 1194. הוא היה רב, רופא ומקובל, ומנהיג יהדות קטלוניה. בשנת 1263 נאלץ להתווכח ברבים על אמונת ישראל בוויכוח ברצלונה, ובעקבותיו נאלץ לצאת מספרד. בשנת 1267 עלה לארץ ישראל, חידש היישוב היהודי בירושלים, ואחר כך לימד תורה בעכו. פירושו לתורה וחידושיו לתלמוד הם מיסודות הלימוד. נפטר בארץ ישראל בשנת ה׳ל׳ (1270 בערך).',
      en: "The Ramban, Rabbi Moshe ben Nachman, was born in Girona, Catalonia, in 1194. A rabbi, physician and kabbalist, he led Catalan Jewry. In 1263 he was compelled to defend Judaism publicly at the Disputation of Barcelona, and afterwards had to leave Spain. In 1267 he reached the Land of Israel, renewed Jerusalem's Jewish community and later taught in Akko. His Torah commentary and Talmud novellae are pillars of Jewish learning. He died there around 5030 (1270).",
    },
    lessons: [
      {
        title: {
          he: 'לדבר בנחת',
          en: 'Speaking gently',
        },
        text: {
          he: 'באגרתו לבנו הורה הרמב״ן לדבר תמיד בנחת, לכל אדם ובכל עת. כך, כתב, נשמרים מן הכעס, ומתוך כך נכנסת ללב הענווה, הטובה שבמידות.',
          en: 'In his letter to his son, the Ramban urged speaking calmly to every person at every time. That way, he wrote, one is saved from anger, and humility, the finest of traits, enters the heart.',
        },
      },
      {
        title: {
          he: 'אהבת ארץ ישראל',
          en: 'Love of the Land',
        },
        text: {
          he: 'הרמב״ן מנה ישיבת ארץ ישראל כמצוות עשה לכל הדורות, וגם קיים אותה: בזקנתו עלה לארץ אף שמצא אותה חרבה, ותיאר אותה כארץ טובה מאוד גם בחורבנה.',
          en: 'The Ramban counted settling the Land of Israel as a positive commandment for all generations, and lived by it: in old age he moved there despite its ruin, calling it a very good land even in its desolation.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'פירוש הרמב״ן על התורה',
          en: 'Commentary on the Torah',
        },
        about: {
          he: 'פירוש המשלב פשט, מדרש ורמזי קבלה, ודן לעתים קרובות בדברי רש״י ואבן עזרא.',
          en: 'A commentary blending plain meaning, Midrash and hints of Kabbalah, often engaging Rashi and Ibn Ezra.',
        },
      },
      {
        title: {
          he: 'חידושי הרמב״ן',
          en: 'Chiddushei HaRamban',
        },
        about: {
          he: 'חידושים על מסכתות רבות בתלמוד הבבלי.',
          en: 'Novellae on many tractates of the Babylonian Talmud.',
        },
      },
      {
        title: {
          he: 'מלחמות ה׳',
          en: 'Milchamot Hashem',
        },
        about: {
          he: 'הגנה על פסקי הרי״ף מפני השגות בעל המאור.',
          en: "A defense of the Rif's rulings against the critiques of the Baal HaMaor.",
        },
      },
      {
        title: {
          he: 'השגות על ספר המצוות',
          en: 'Glosses on Sefer HaMitzvot',
        },
        about: {
          he: 'השגות על מניין המצוות של הרמב״ם, ובהן מצוות ישיבת ארץ ישראל.',
          en: "Critiques of the Rambam's count of the commandments, including the mitzvah of settling the Land.",
        },
      },
      {
        title: {
          he: 'תורת האדם',
          en: 'Torat HaAdam',
        },
        about: {
          he: 'הלכות אבלות, ובסופו ״שער הגמול״ על שכר ועונש.',
          en: "Laws of mourning, ending with 'Sha'ar HaGemul' on reward and punishment.",
        },
      },
      {
        title: {
          he: 'אגרת הרמב״ן',
          en: 'Iggeret HaRamban',
        },
        about: {
          he: 'מכתב לבנו על ענווה, דיבור בנחת ויראת שמים.',
          en: 'A letter to his son on humility, gentle speech and fear of Heaven.',
        },
      },
      {
        title: {
          he: 'ספר הוויכוח',
          en: 'Sefer HaVikuach',
        },
        about: {
          he: 'תיאור ויכוח ברצלונה מפי הרמב״ן עצמו.',
          en: "The Ramban's own account of the Disputation of Barcelona.",
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'ויכוח ברצלונה',
          en: 'The Disputation of Barcelona',
        },
        text: {
          he: 'בשנת 1263 הורה מלך אראגון, ז׳אום הראשון, לרמב״ן להתווכח ברבים עם פבלו כריסטיאני, יהודי שהמיר דתו. הרמב״ן הסכים בתנאי שיקבל חופש דיבור מלא, והמלך התחייב לכך. הרמב״ן השיב בגלוי ובאומץ על כל טענה, ובסוף הוויכוח העניק לו המלך פרס של שלוש מאות מטבעות. לאחר שפרסם תיאור הוויכוח, נאלץ לצאת מספרד.',
          en: 'In 1263 King James I of Aragon ordered the Ramban to debate Pablo Christiani, a convert from Judaism, in public. The Ramban agreed on condition of full freedom of speech, which the king granted. He answered every argument openly and courageously, and at the end the king awarded him three hundred coins. Later, after he published his account of the debate, he was forced to leave Spain.',
        },
        source: 'Wikipedia, Disputation of Barcelona (https://en.wikipedia.org/wiki/Disputation_of_Barcelona)',
      },
      {
        title: {
          he: 'ירושלים החרבה',
          en: 'Jerusalem in ruins',
        },
        text: {
          he: 'בשנת 1267 הגיע הרמב״ן לירושלים, ובמכתב לבנו תיאר עיר חרבה: ככל שהמקום קדוש יותר, כך חורבנו גדול יותר, ורק מעט יהודים מתפללים בבית בשבתות. לפי המסורת, בחר בית הרוס ושיקם אותו לבית כנסת, וספרי התורה שהועברו לשכם למשמרת הוחזרו. בתוך שלושה שבועות, לקראת ראש השנה, כבר התפללו בו.',
          en: 'In 1267 the Ramban reached Jerusalem and, in a letter to his son, described a city in ruins: the holier the place, the greater its desolation, with only a few Jews praying in a home on Shabbat. According to tradition he chose a ruined house and restored it as a synagogue, and Torah scrolls taken to Shechem for safekeeping were brought back. Within three weeks, by Rosh Hashanah, prayers were held there.',
        },
        source:
          "Ramban's letter to his son; Wikipedia, Ramban Synagogue (https://en.wikipedia.org/wiki/Ramban_Synagogue)",
      },
    ],
    grave: {
      place: {
        he: 'לא ידוע בוודאות; מסורות שונות מציינות עכו, חיפה, ירושלים וחברון',
        en: 'Uncertain; traditions name Akko, Haifa, Jerusalem and Hebron',
      },
      lat: null,
      lng: null,
      link: false,
      noLinkReason: {
        he: 'מקום הקבורה שנוי במחלוקת בין כמה מסורות',
        en: 'The burial place is disputed among several traditions',
      },
    },
    sources: [
      'https://en.wikipedia.org/wiki/Nachmanides',
      'https://en.wikipedia.org/wiki/Disputation_of_Barcelona',
      'https://en.wikipedia.org/wiki/Ramban_Synagogue',
      'https://en.wikipedia.org/wiki/Cave_of_the_Ramban',
      'https://www.sefaria.org/Iggeret_HaRamban',
      'https://www.sefaria.org/Ramban_on_Numbers.33.53',
      'https://www.hamichlol.org.il/קבר_רמב%22ן',
    ],
  },
  maran_yosef_karo: {
    bio: {
      he: 'מרן רבי יוסף קארו נולד בטולדו שבספרד בשנת 1488, וגורש עם משפחתו בילדותו. הוא חי בערי האימפריה העות׳מאנית, ובשנות השלושים של המאה השש עשרה עלה לצפת. שם ישב בבית הדין של רבי יעקב בירב, ואחר כך עמד בראש בית הדין והישיבה של העיר והיה לפוסק המרכזי של דורו. חיבוריו ״בית יוסף״ ו״שולחן ערוך״ הפכו ליסוד ההלכה לדורות. נפטר בצפת בי״ג בניסן ה׳של״ה (1575).',
      en: "Maran Rabbi Yosef Karo was born in Toledo, Spain, in 1488 and expelled with his family as a child. After years in Ottoman cities, he moved to Safed in the 1530s. There he sat on Rabbi Yaakov Beirav's court, later headed the city's court and yeshiva, and became the leading halachic authority of his generation. His Beit Yosef and Shulchan Aruch became the foundation of halacha for generations. He died in Safed on 13 Nisan 5335 (1575).",
    },
    lessons: [
      {
        title: {
          he: 'התמדה לאורך שנים',
          en: 'Perseverance over decades',
        },
        text: {
          he: 'רבי יוסף קארו כתב ״בית יוסף״ במשך עשרים שנה, ועוד שתים עשרה שנה המשיך לתקן ולהשלים. עבודה גדולה נבנית בסבלנות, צעד אחר צעד.',
          en: 'Rabbi Yosef Karo spent twenty years writing Beit Yosef and twelve more refining it. Great work is built patiently, step by step.',
        },
      },
      {
        title: {
          he: 'הלכה ערוכה לכל',
          en: 'Halacha set out for all',
        },
        text: {
          he: 'בשולחן ערוך סידר רבי יוסף קארו הלכה למעשה בקיצור ובסדר, כמו שולחן ערוך ומוכן, כדי שכל אדם יוכל לדעת מה לעשות. לימוד התורה מכוון גם אל המעשה.',
          en: 'In the Shulchan Aruch he set out practical halacha briefly and in order, like a table set and ready, so that everyone could know what to do. Torah study aims at practice too.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'בית יוסף',
          en: 'Beit Yosef',
        },
        about: {
          he: 'פירוש מקיף על ״ארבעה טורים״, המברר מקור כל הלכה ומכריע בה.',
          en: "A comprehensive commentary on the Arba'ah Turim, tracing each law to its sources and ruling on it.",
        },
      },
      {
        title: {
          he: 'שולחן ערוך',
          en: 'Shulchan Aruch',
        },
        about: {
          he: 'תמצית פסקי ״בית יוסף״ בארבעה חלקים, שהתקבלה כספר ההלכה המרכזי.',
          en: "A digest of Beit Yosef's rulings in four parts, accepted as the central code of halacha.",
        },
      },
      {
        title: {
          he: 'כסף משנה',
          en: 'Kesef Mishneh',
        },
        about: {
          he: 'פירוש על ״משנה תורה״ לרמב״ם, המציין מקורותיו ומיישב השגות עליו.',
          en: "A commentary on the Rambam's Mishneh Torah, giving its sources and answering its critics.",
        },
      },
      {
        title: {
          he: 'מגיד מישרים',
          en: 'Maggid Meisharim',
        },
        about: {
          he: 'יומן רוחני של דברי ״המגיד״, המשנה המדברת מפיו; נדפס אחרי מותו.',
          en: 'A spiritual diary of the words of his Maggid, the personified Mishnah; published after his death.',
        },
      },
      {
        title: {
          he: 'אבקת רוכל',
          en: 'Avkat Rochel',
        },
        about: {
          he: 'שאלות ותשובות בהלכה.',
          en: 'A collection of halachic responsa.',
        },
      },
      {
        title: {
          he: 'בדק הבית',
          en: 'Bedek HaBayit',
        },
        about: {
          he: 'השלמות ותיקונים לספר ״בית יוסף״.',
          en: 'Supplements and corrections to Beit Yosef.',
        },
      },
      {
        title: {
          he: 'כללי התלמוד',
          en: 'Kelalei HaTalmud',
        },
        about: {
          he: 'כללים בדרכי התלמוד ובשיטת לימודו.',
          en: 'Rules on the methodology of the Talmud.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'ליל שבועות עם המגיד',
          en: 'A Shavuot night with the Maggid',
        },
        text: {
          he: 'רבי שלמה אלקבץ תיאר במכתב ליל שבועות שבילה עם רבי יוסף קארו וחברים, לפני שעלו לארץ ישראל. הם קראו כל הלילה פרקים מן התנ״ך ואחר כך למדו משניות, ואז החל קול לדבר מפיו של רבי יוסף קארו, ״המגיד״, ששיבח את לימודם והורה להם להמשיך ולעלות לארץ ישראל. המכתב הוא מן העדויות הקדומות למנהג תיקון ליל שבועות.',
          en: 'Rabbi Shlomo Alkabetz described in a letter a Shavuot night he spent with Rabbi Yosef Karo and friends before they moved to the Land of Israel. They read passages of the Tanach through the night and then studied Mishnah, when a voice, the Maggid, began speaking through Rabbi Yosef Karo, praising their study and urging them to continue and to settle in the Land. The letter is among the earliest records of the Tikkun Leil Shavuot custom.',
        },
        source:
          'Letter of Rabbi Shlomo Alkabetz, printed in Maggid Meisharim (Lublin, 1646) and the Shelah (Shnei Luchot HaBrit); summary at https://toviapreschel.com/?p=11169',
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין העתיק בצפת',
        en: 'The old cemetery of Safed',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית העלמין העתיק צפת',
    },
    sources: [
      'https://en.wikipedia.org/wiki/Joseph_Karo',
      'https://www.jewishvirtuallibrary.org/joseph-karo',
      'https://www.yeshiva.org.il/wiki/index.php/רבי_יוסף_קארו',
      'https://toviapreschel.com/?p=11169',
      'https://www.kabbalaonline.org/kabbalah/article_cdo/aid/380684/jewish/Rabbi-Yosef-Caros-Works.htm',
      'https://shulchanaruchharav.com/?p=5455',
      'https://www.lonelyplanet.com/israel-and-the-palestinian-territories/galilee/tsfat/attractions/tombs-of-the-kabbalists/a/poi-sig/1444957/361046',
    ],
  },
  rema: {
    bio: {
      he: 'רבי משה איסרליש, הרמ״א, נולד בקרקוב שבפולין בשנת ה׳ר״צ. למד בלובלין אצל רבי שלום שכנא ושב לקרקוב, שם הקים ישיבה גדולה ועמד בראש בית הדין. מפעלו המרכזי הוא המפה, הגהות על השולחן ערוך של רבי יוסף קארו שמוסיפות את פסיקות יהדות אשכנז ומנהגיה. בזכותן התקבל השולחן ערוך כספר ההלכה של כל ישראל. נפטר בל״ג בעומר, י״ח באייר ה׳של״ב, ונקבר ליד בית הכנסת שלו בקרקוב.',
      en: "Rabbi Moshe Isserles, the Rema, was born in Kraków, Poland, in 1530. He studied in Lublin under Rabbi Shalom Shachna and returned to Kraków, where he founded a large yeshiva and headed the rabbinical court. His main work, HaMapah, is a set of glosses on Rabbi Yosef Karo's Shulchan Aruch that adds Ashkenazi rulings and customs, making it the code of law for all Jewry. He died on Lag BaOmer, 18 Iyar 5332 (1572).",
    },
    lessons: [
      {
        title: {
          he: 'כבוד למנהג ישראל',
          en: 'Respect for custom',
        },
        text: {
          he: 'הרמ״א ראה במנהגי הקהילות חלק מההלכה ושמר עליהם בהגהותיו לשולחן ערוך. אפשר ללמוד ממנו לכבד את המסורת שהתקבלה מהדורות הקודמים ולהמשיך אותה הלאה.',
          en: 'The Rema treated the customs of the communities as part of halacha and preserved them in his glosses to the Shulchan Aruch. He teaches respect for traditions received from earlier generations, and continuing them.',
        },
      },
      {
        title: {
          he: 'ענווה',
          en: 'Humility',
        },
        text: {
          he: 'הרמ״א נודע בענוותנותו. לפי המסופר, אף שעמד בראש בית הדין בקרקוב, חתם את שמו אחרון, אחרי שני הדיינים האחרים. גדולה אמיתית אינה צריכה להעמיד את עצמה בראש.',
          en: 'The Rema was known for his humility. According to his biographers, though he headed the Kraków court, he signed his name last, after the two other judges. True greatness does not need to put itself first.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'המפה',
          en: 'HaMapah',
        },
        about: {
          he: 'הגהות על השולחן ערוך שמוסיפות את פסיקות יהדות אשכנז ומנהגיה.',
          en: 'Glosses on the Shulchan Aruch adding Ashkenazi rulings and customs.',
        },
      },
      {
        title: {
          he: 'דרכי משה',
          en: 'Darkhei Moshe',
        },
        about: {
          he: 'חיבור על הטור ועל הבית יוסף, עם דברי פוסקים נוספים והכרעותיו.',
          en: 'Commentary on the Tur and Beit Yosef, adding further authorities and his own rulings.',
        },
      },
      {
        title: {
          he: 'תורת חטאת',
          en: 'Torat Chatat',
        },
        about: {
          he: 'מדריך הלכתי, בעיקר בדיני איסור והיתר במאכלים.',
          en: 'A halachic guide, mainly to the dietary laws.',
        },
      },
      {
        title: {
          he: 'תורת העולה',
          en: 'Torat HaOlah',
        },
        about: {
          he: 'עיון בטעמי בית המקדש והקרבנות.',
          en: 'A study of the meaning of the Temple and its offerings.',
        },
      },
      {
        title: {
          he: 'מחיר יין',
          en: 'Mechir Yayin',
        },
        about: {
          he: 'פירוש סמלי על מגילת אסתר, שנכתב כמשלוח מנות לאביו.',
          en: 'An allegorical commentary on the Book of Esther, written as a Purim gift for his father.',
        },
      },
      {
        title: {
          he: 'שו״ת הרמ״א',
          en: 'Responsa of the Rema',
        },
        about: {
          he: 'תשובות הלכתיות לשאלות שנשלחו אליו.',
          en: 'His halachic answers to questions sent to him.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'מחיר יין',
          en: 'A substitute for wine',
        },
        text: {
          he: 'בשנת ה׳שט״ז פרצה מגפה בקרקוב, והרמ״א ובני משפחתו נמלטו לעיירה שידלוב. הפליטים היו עניים מאוד, ולדבריו בהקדמה בקושי היו להם מים לשתות, ולא יכלו לחגוג את פורים במשתה ושמחה. במקום משתה כתב פירוש על מגילת אסתר והקדיש אותו לאביו כמשלוח מנות. את הפירוש קרא מחיר יין, כלומר תמורה ליין שלא היה.',
          en: "In 1556 a plague struck Kraków, and the Rema's family fled to the town of Shidlov. The refugees were very poor; as he wrote in his introduction, they barely had water to drink and could not celebrate Purim with a feast. Instead, he wrote a commentary on the Book of Esther and dedicated it to his father as a Purim gift, naming it Mechir Yayin, a substitute for wine.",
        },
        source:
          "Mechir Yayin, author's introduction (Sefaria, https://www.sefaria.org/Mekhir_Yayin_on_Esther%2C_Introduction); Sefaria, About Mekhir Yayin (https://www.sefaria.org/Mekhir_Yayin_on_Esther); he.wikipedia, משה איסרליש",
      },
      {
        title: {
          he: 'החופה בליל שבת',
          en: 'The Friday-night wedding',
        },
        text: {
          he: 'יתומה אחת בקרקוב עמדה להינשא ביום שישי, אך הנדוניה הייתה חסרה כשליש, והחתן סירב להיכנס לחופה. ראשי הקהל הפצירו בו שלא לבייש את הכלה, והמשא ומתן נמשך עד שהחשיך. כשהתרצה החתן, ערך הרמ״א את החופה כשעה וחצי אחרי צאת הלילה, בליל שבת. בתשובה שכתב על כך הסביר שכבוד הבריות ומניעת ביושה של היתומה הצדיקו את מעשהו.',
          en: "An orphan bride in Kraków was to marry on a Friday, but her dowry fell about a third short and the groom refused to proceed. Community leaders pleaded with him not to shame her, and the talks dragged on past nightfall. Once he agreed, the Rema performed the wedding about an hour and a half into Friday night. In a responsum he explained that sparing the orphan's dignity justified it.",
        },
        source:
          'Responsa of the Rema, no. 125; Posen Library, Responsum: On a Reluctant Bridegroom (https://www.posenlibrary.com/entry/responsum-reluctant-bridegroom); Madlik, A Sabbath Bride (https://madlik.com/2016/12/22/a-sabbath-bride-marriage-on-shabbat/)',
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות של הרמ״א, ליד בית הכנסת רמ״א, קז׳ימייז׳, קרקוב',
        en: 'Remuh Cemetery beside the Remuh Synagogue, Kazimierz, Kraków',
      },
      lat: 50.0526,
      lng: 19.9471,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Moses_Isserles',
      'https://he.wikipedia.org/wiki/משה_איסרליש',
      'https://www.sefaria.org/Mekhir_Yayin_on_Esther',
      'https://www.posenlibrary.com/entry/responsum-reluctant-bridegroom',
      'https://madlik.com/2016/12/22/a-sabbath-bride-marriage-on-shabbat/',
      'https://kehilalinks.jewishgen.org/krakow/kra_old_cemetery.htm',
      'https://en.wikipedia.org/wiki/Remah_Cemetery',
      'https://www.openstreetmap.org/way/33291032',
    ],
  },
  ramak: {
    bio: {
      he: 'רבי משה קורדובירו, הרמ״ק, חי בצפת במאה ה-16, ושם משפחתו מעיד על מוצא מקורדובה שבספרד. למד הלכה אצל רבי יוסף קארו וקבלה אצל גיסו רבי שלמה אלקבץ. עמד בראש ישיבה בצפת כעשרים שנה, ובין תלמידיו היו רבי חיים ויטאל ורבי אליהו די וידאש. בספרו פרדס רימונים סידר את תורת הקבלה של הדורות שקדמו לו לשיטה אחת מסודרת. נפטר בכ״ג בתמוז ה׳ש״ל, בן כ-48.',
      en: 'Rabbi Moshe Cordovero, the Ramak, lived in 16th-century Safed; his family name points to roots in Córdoba, Spain. He studied halacha with Rabbi Yosef Karo and Kabbalah with his brother-in-law, Rabbi Shlomo Alkabetz. He headed a yeshiva in Safed for about twenty years, and his students included Rabbi Chaim Vital and Rabbi Eliyahu de Vidas. His Pardes Rimonim organized earlier Kabbalah into one system. He died on 23 Tammuz 5330 (1570), aged about 48.',
    },
    lessons: [
      {
        title: {
          he: 'להידמות לבורא',
          en: "Imitating God's ways",
        },
        text: {
          he: 'בספרו תומר דבורה לימד שעל האדם להידמות לשלוש עשרה מידות הרחמים של הבורא: לסבול עלבון, לוותר, לרחם ולהיטיב גם עם מי שפגע בו.',
          en: "In Tomer Devorah he taught that a person should imitate God's thirteen attributes of mercy: to bear insult, to forgive, to show compassion and to do good even to someone who caused hurt.",
        },
      },
      {
        title: {
          he: 'לצאת מהשגרה',
          en: 'Leaving comfort behind',
        },
        text: {
          he: 'עם רבי שלמה אלקבץ יצא לגירושין, נדודים בשדות הגליל ובין קברי הצדיקים, והחידושים שנתגלו לו בהם נכתבו בספר הגירושין. לפעמים דווקא יציאה מהבית ומהנוחות פותחת הבנה חדשה.',
          en: 'With Rabbi Shlomo Alkabetz he went on gerushin, wanderings through the fields of the Galilee and among the graves of the righteous, and recorded his insights in Sefer HaGerushin. Leaving home comforts can open new understanding.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'פרדס רימונים',
          en: 'Pardes Rimonim',
        },
        about: {
          he: 'סידור שיטתי של תורת הקבלה, עם דיון והכרעה בין שיטות הראשונים.',
          en: 'A systematic presentation of Kabbalah, weighing and deciding between earlier views.',
        },
      },
      {
        title: {
          he: 'אור יקר',
          en: 'Or Yakar',
        },
        about: {
          he: 'פירוש מקיף על ספר הזוהר ועל תיקוני הזוהר.',
          en: 'An extensive commentary on the Zohar and Tikkunei Zohar.',
        },
      },
      {
        title: {
          he: 'תומר דבורה',
          en: 'Tomer Devorah',
        },
        about: {
          he: 'ספר מוסר על תיקון המידות בדרך של הידמות למידות הבורא.',
          en: "An ethical work on refining character by imitating God's attributes.",
        },
      },
      {
        title: {
          he: 'אילימה רבתי',
          en: 'Elimah Rabbati',
        },
        about: {
          he: 'ביאורים ביסודות הקבלה.',
          en: 'Explanations of the foundations of Kabbalah.',
        },
      },
      {
        title: {
          he: 'אור נערב',
          en: "Or Ne'erav",
        },
        about: {
          he: 'קונטרס על מעלת לימוד הקבלה ועל סדרו.',
          en: 'A short work on the value of studying Kabbalah and how to approach it.',
        },
      },
      {
        title: {
          he: 'ספר הגירושין',
          en: 'Sefer HaGerushin',
        },
        about: {
          he: 'חידושים שנתגלו לו בנדודיו מחוץ לביתו.',
          en: 'Insights that came to him during his wanderings away from home.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'הענן שלפני המיטה',
          en: 'The cloud before the bier',
        },
        text: {
          he: 'לפי המסורת, לפני פטירתו אמר הרמ״ק שממשיך דרכו יהיה מי שיראה את הענן שילך לפני מיטתו בהלווייתו. בהלוויה רצו נושאי המיטה לקבור אותו ליד אחד מגדולי החכמים, אך האר״י עצר אותם ואמר שהענן עדיין לא נעצר, והוא יראה היכן רצונו להיקבר. כך נודע שהאר״י הוא הממשיך.',
          en: 'According to tradition, before he died the Ramak said that his successor would be whoever saw the cloud going before his bier at his funeral. At the funeral the bearers wanted to bury him beside one of the great sages, but the Arizal stopped them, saying the cloud had not yet stopped and would show where he wished to be buried. So it became known that the Arizal was the successor.',
        },
        source:
          'Chabad.org, Rabbi Moshe Cordovero (https://www.chabad.org/library/article_cdo/aid/83771/jewish/Rabbi-Moshe-Cordovero.htm)',
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין העתיק בצפת, צמוד לקבר האר״י',
        en: "Old Cemetery of Safed, right beside the Arizal's grave",
      },
      lat: 32.9675,
      lng: 35.4887,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Moses_ben_Jacob_Cordovero',
      'https://he.wikipedia.org/wiki/משה_קורדובירו',
      'https://www.chabad.org/library/article_cdo/aid/83771/jewish/Rabbi-Moshe-Cordovero.htm',
      'https://www.jewishvirtuallibrary.org/solomon-ben-moses-alkabetz',
      'https://www.kedem-auctions.com/en/node/131373',
      'https://thetrugmans.com/?p=2011',
      'https://www.openstreetmap.org/way/646995457',
    ],
  },
  arizal: {
    bio: {
      he: 'רבי יצחק לוריא, האר״י הקדוש, נולד בירושלים בשנת ה׳רצ״ד. התייתם בילדותו וגדל במצרים אצל דודו, ולמד אצל הרדב״ז ורבי בצלאל אשכנזי. שנים התבודד על גדות הנילוס ולמד את הזוהר. בשנת ה׳ש״ל עלה לצפת, ובשנתיים האחרונות לחייו לימד חוג תלמידים את שיטתו בקבלה, הידועה כקבלת האר״י. נפטר במגפה בה׳ באב ה׳של״ב, בן 38, ותורתו נכתבה בידי תלמידו רבי חיים ויטאל.',
      en: 'Rabbi Yitzchak Luria, the Arizal, was born in Jerusalem in 1534. Orphaned young, he grew up in Egypt with his uncle and studied with the Radbaz and Rabbi Betzalel Ashkenazi. For years he studied the Zohar in seclusion by the Nile. In 1570 he moved to Safed, where in his last two years he taught his system of Kabbalah. He died in an epidemic on 5 Av 5332 (1572), aged 38; his student Rabbi Chaim Vital recorded his teachings.',
    },
    lessons: [
      {
        title: {
          he: 'אהבת ישראל לפני התפילה',
          en: 'Love before prayer',
        },
        text: {
          he: 'האר״י נהג לקבל על עצמו לפני התפילה את המצווה ״ואהבת לרעך כמוך״, ומנהג זה נדפס בסידורים רבים. התפילה מתחילה בחיבור לכל עם ישראל.',
          en: "Before praying, the Arizal would take upon himself the commandment to love one's fellow as oneself, a practice now printed in many prayer books. Prayer begins with connecting to all of Israel.",
        },
      },
      {
        title: {
          he: 'לקבל את השבת בשמחה',
          en: 'Welcoming Shabbat with joy',
        },
        text: {
          he: 'האר״י ותלמידיו היו יוצאים בערב שבת מן העיר צפת, לבושים לבן, כדי לקבל את פני השבת בשירת מזמורי תהלים. מצפת של אותם ימים התפשט מנהג קבלת השבת לכל קהילות ישראל.',
          en: 'The Arizal and his students would leave Safed on Friday evening, dressed in white, to greet Shabbat while singing Psalms. From the Safed of those days the custom of welcoming Shabbat spread to Jewish communities everywhere.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'זמירות לשבת: אזמר בשבחין, אסדר לסעודתא, בני היכלא',
          en: 'Shabbat songs: Azamer Bishvachin, Asader LiSeudata, Bnei Heichala',
        },
        about: {
          he: 'שירים בארמית לשלוש סעודות השבת, מן המעטים שכתב בעצמו.',
          en: 'Aramaic songs for the three Shabbat meals, among the few texts he wrote himself.',
        },
      },
      {
        title: {
          he: 'כתבי האר״י (עץ חיים ועוד)',
          en: "The Arizal's writings (Etz Chaim and others)",
        },
        about: {
          he: 'תורתו כפי שכתב וערך אותה תלמידו רבי חיים ויטאל.',
          en: 'His teachings as written down and edited by his student Rabbi Chaim Vital.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'לחם הפנים של צפת',
          en: 'The showbread of Safed',
        },
        text: {
          he: 'לפי סיפור שהביא רבי משה חאגיז, יהודי מאנוסי פורטוגל שחזר ליהדות בצפת שמע דרשה על לחם הפנים, וביקש מאשתו לאפות שתי חלות. בכל ערב שבת הניח אותן בארון הקודש, והשמש לקח אותן לביתו. כשגילה הרב את הדבר, נזף ביהודי. לפי הסיפור, אמר האר״י שמאז החורבן לא הייתה לפני הקב״ה נחת רוח כמו ממנחה פשוטה זו, שניתנה בלב שלם.',
          en: "According to a story brought by Rabbi Moshe Hagiz, a former converso from Portugal living in Safed heard a sermon about the Temple showbread and asked his wife to bake two challahs. Every Friday he left them in the Holy Ark, and the caretaker took them home. When the rabbi found out, he rebuked the man. According to the story, the Arizal said that since the Temple's destruction God had not received such pleasure as from this sincere offering.",
        },
        source:
          'Rabbi Moshe Hagiz, Mishnat Chachamim; retold by Yerachmiel Tilles, A Delicious Offering, Chabad.org (https://www.chabad.org/kabbalah/article_cdo/aid/699692/jewish/A-Delicious-Offering.htm)',
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין העתיק בצפת',
        en: 'Old Cemetery of Safed',
      },
      lat: 32.9675,
      lng: 35.4887,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Isaac_Luria',
      'https://he.wikipedia.org/wiki/יצחק_לוריא',
      'https://www.chabad.org/kabbalah/article_cdo/aid/699692/jewish/A-Delicious-Offering.htm',
      'https://opensiddur.org/prayers/praxes/davvening/love-your-fellow-intention-before-prayer/',
      'https://jewish-music.huji.ac.il/node/21824',
      'https://commons.wikimedia.org/wiki/File:The_Ancient_Jewish_Cemetery_Safed_Avney_Moreshet_227bf000.jpg',
      'https://www.openstreetmap.org/way/646995457',
    ],
  },
  chaim_vital: {
    bio: {
      he: 'רבי חיים ויטאל נולד בצפת בשנת ה׳ש״ג. למד אצל רבי משה אלשיך ורבי משה קורדובירו, ובשנת ה׳ש״ל נעשה לתלמידו המובהק של האר״י. אחרי פטירת רבו כתב וערך את תורתו, ובזכותו נשמרה קבלת האר״י לדורות. חי בצפת, בירושלים ובדמשק, ובדמשק שימש רב לקהילת יוצאי סיציליה. נפטר בדמשק בל׳ בניסן ה׳ש״ף.',
      en: "Rabbi Chaim Vital was born in Safed in 1542. He studied with Rabbi Moshe Alshich and Rabbi Moshe Cordovero, and in 1570 became the leading disciple of the Arizal. After his teacher's death he wrote down and edited his teachings, preserving Lurianic Kabbalah for later generations. He lived in Safed, Jerusalem and Damascus, where he served as rabbi of the Sicilian community. He died in Damascus on 30 Nisan 5380 (1620).",
    },
    lessons: [
      {
        title: {
          he: 'המידות קודמות',
          en: 'Character comes first',
        },
        text: {
          he: 'בספרו שערי קדושה כתב שהמידות הטובות אינן נמנות בין המצוות משום שהן היסוד שעליו כל המצוות עומדות. תיקון המידות הוא תנאי לעבודת ה׳.',
          en: "In Sha'arei Kedushah he wrote that good character traits are not counted among the commandments because they are the foundation on which all the commandments stand. Refining character comes first.",
        },
      },
      {
        title: {
          he: 'נאמנות לתורת הרב',
          en: 'Faithful transmission',
        },
        text: {
          he: 'רבי חיים ויטאל הקדיש את שארית חייו לכתיבה ולסידור של מה ששמע מרבו. בזכות מסירותו, תורה שנלמדה כשנתיים בלבד ממשיכה ללמד דורות.',
          en: 'Rabbi Chaim Vital devoted the rest of his life to writing down and arranging what he had heard from his teacher. Thanks to his devotion, teachings given for only about two years still teach generations.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'עץ חיים',
          en: 'Etz Chaim',
        },
        about: {
          he: 'סידור שיטתי של קבלת האר״י, החיבור המרכזי בכתבי האר״י.',
          en: "A systematic presentation of Lurianic Kabbalah, the central work of the Arizal's writings.",
        },
      },
      {
        title: {
          he: 'שמונה שערים',
          en: "Shemonah She'arim",
        },
        about: {
          he: 'תורת האר״י בשמונה שערים, ובהם שער הכוונות ושער הגלגולים.',
          en: "The Arizal's teachings in eight gates, including Sha'ar HaKavanot and Sha'ar HaGilgulim.",
        },
      },
      {
        title: {
          he: 'שערי קדושה',
          en: "Sha'arei Kedushah",
        },
        about: {
          he: 'ספר מוסר על תיקון המידות ועל דרכי העלייה הרוחנית.',
          en: 'An ethical work on refining character and on spiritual ascent.',
        },
      },
      {
        title: {
          he: 'ספר החזיונות',
          en: 'Sefer HaChezyonot',
        },
        about: {
          he: 'יומן אישי של חלומות, חזיונות ואירועים מחייו.',
          en: 'A personal diary of his dreams, visions and life events.',
        },
      },
      {
        title: {
          he: 'עץ הדעת טוב',
          en: 'Etz HaDaat Tov',
        },
        about: {
          he: 'ביאורים על התורה, הנביאים, מדרשי חז״ל והתלמוד.',
          en: 'Explanations of the Torah, the Prophets, the Midrash and the Talmud.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'שלושה ימים של העתקה',
          en: 'Three days of copying',
        },
        text: {
          he: 'כשחלה רבי חיים ויטאל בצפת ושכב שנה במיטתו, שיחד אחד ממקורביו את אחיו הצעיר משה, וקיבל לזמן קצר חלק גדול מהכתבים שהיו שמורים נעולים בתיבה. לפי המסופר, מאה מעתיקים העתיקו יותר משש מאות דפים בשלושה ימים. כך התפשטו כתבי האר״י בעולם, אף שרבי חיים טען שהדפים שהועתקו אינם כתביו.',
          en: "When Rabbi Chaim Vital fell ill in Safed and lay in bed for a year, one of his close followers bribed his younger brother Moshe and briefly obtained much of the manuscripts he kept locked in a box. According to the account, a hundred copyists copied more than six hundred pages in three days. So the Arizal's writings spread, though Rabbi Chaim insisted that the copied pages were not his writings.",
        },
        source:
          'Jewish Encyclopedia, Vital, Hayyim ben Joseph (https://www.jewishencyclopedia.com/articles/14714-vital-hayyim-ben-joseph); en.wikipedia, Hayyim ben Joseph Vital',
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות היהודי בדמשק, סוריה',
        en: 'Jewish cemetery of Damascus, Syria',
      },
      lat: null,
      lng: null,
      link: false,
      noLinkReason: {
        he: 'הקבר בדמשק שבסוריה, מדינה שישראלים אינם יכולים לבקר בה. הוא הועבר פעמיים בשנות ה-70, נפגע בידי פורצים בשנת 2025, ויש הטוענים שעצמותיו הוצאו ממנו.',
        en: 'The grave is in Damascus, Syria, which Israelis cannot visit. It was moved twice in the 1970s, was damaged by intruders in 2025, and some claim his remains were taken out.',
      },
    },
    sources: [
      'https://en.wikipedia.org/wiki/Hayyim_ben_Joseph_Vital',
      'https://he.wikipedia.org/wiki/חיים_ויטאל',
      'https://www.jewishencyclopedia.com/articles/14714-vital-hayyim-ben-joseph',
      'https://www.chabad.org/article.asp?aid=854738',
    ],
  },
  shelah: {
    bio: {
      he: 'רבי ישעיה הלוי הורוביץ, השל״ה הקדוש, נולד בפראג במאה ה-16 ולמד בלובלין. כיהן ברבנות בקהילות בפולין, ובהן דובנא ואוסטרהא, ואחר כך בפרנקפורט ובפראג. אחרי פטירת אשתו עלה לארץ ישראל, הגיע לירושלים בשנת ה׳שפ״ב והיה רב הקהילה האשכנזית בעיר. אחר כך ישב בצפת ובטבריה. ספרו שני לוחות הברית השפיע עמוקות על המוסר ועל החסידות. נפטר בשנת ה׳ש״ץ ונקבר בטבריה.',
      en: "Rabbi Yeshayahu HaLevi Horowitz, the Shelah HaKadosh, was born in Prague in the 16th century and studied in Lublin. He served as rabbi in Polish communities, including Dubno and Ostroh, then in Frankfurt and Prague. After his wife's death he moved to the Land of Israel, reaching Jerusalem in 1621 and leading its Ashkenazi community, and later lived in Safed and Tiberias. His Shnei Luchot HaBrit deeply influenced Jewish ethics and Chassidism. He died in 5390 (1630).",
    },
    lessons: [
      {
        title: {
          he: 'תפילת הורים',
          en: "A parent's prayer",
        },
        text: {
          he: 'תפילת השל״ה, תפילת הורים על ילדיהם ועל צאצאיהם המובאת בספרו, נאמרת בידי רבים בערב ראש חודש סיון, החודש שבו ניתנה התורה. היא מלמדת שתפילה על הילדים היא חלק מגידולם.',
          en: "The Shelah's prayer, a parents' prayer for their children and descendants brought in his book, is recited by many on the eve of Rosh Chodesh Sivan, the month the Torah was given. Praying for children is part of raising them.",
        },
      },
      {
        title: {
          he: 'אהבת ארץ ישראל',
          en: 'Love of the Land',
        },
        text: {
          he: 'בערוב ימיו עזב השל״ה רבנות מכובדת בפראג ויצא לירושלים. באחד ממכתביו שמח על כך שבאו אליה עולים רבים עד שצר המקום. הוא ראה בארץ ישראל בית.',
          en: 'Late in life the Shelah left a prestigious post in Prague for Jerusalem. In a letter he rejoiced that so many newcomers arrived that the city grew crowded. He saw the Land of Israel as home.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'שני לוחות הברית',
          en: 'Shnei Luchot HaBrit',
        },
        about: {
          he: 'חיבור מקיף על מצוות, מוסר וקבלה, שהחל כצוואה לבניו.',
          en: 'A comprehensive work on commandments, ethics and Kabbalah, begun as an ethical will to his children.',
        },
      },
      {
        title: {
          he: 'שער השמים',
          en: "Sha'ar HaShamayim",
        },
        about: {
          he: 'סידור תפילה עם פירוש וכוונות, שהשפיע על נוסח אשכנז.',
          en: 'A prayer book with commentary and mystical intentions that influenced the Ashkenazi rite.',
        },
      },
      {
        title: {
          he: 'בגדי ישע',
          en: 'Bigdei Yesha',
        },
        about: {
          he: 'הגהות על ספר המרדכי, על סדר מועד.',
          en: 'Glosses on the Mordechai, on the order of Moed.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'נשבה בירושלים',
          en: 'Held for ransom in Jerusalem',
        },
        text: {
          he: 'בשנת ה׳שפ״ה, כשהמושל מוחמד אבן פארוח׳ שלט בירושלים והכביד על יהודיה, נאסר השל״ה יחד עם כחמישה עשר מרבני העיר, והמושל דרש כופר עצום תמורת שחרורם. הקהילה היהודית הקטנה הצליחה בתחנונים להפחית את הסכום ולפדות אותם. אחרי שחרורם עזבו הרבנים את ירושלים, והשל״ה קבע את מושבו בצפת ואחר כך בטבריה.',
          en: 'In 1625, when the governor Muhammad ibn Farrukh ruled Jerusalem and oppressed its Jews, the Shelah was imprisoned with about fifteen other rabbis of the city, and the governor demanded a huge ransom. Through pleading, the small Jewish community managed to lower the sum and redeem them. After their release the rabbis left Jerusalem, and the Shelah settled in Safed and later in Tiberias.',
        },
        source:
          'he.wikipedia, ישעיה הלוי הורוביץ; Jewish Encyclopedia, Horowitz, Isaiah (https://jewishencyclopedia.com/articles/7876-horowitz-isaiah); en.wikipedia, Isaiah Horowitz',
      },
    ],
    grave: {
      place: {
        he: 'מתחם קבר הרמב״ם, טבריה',
        en: 'Tomb of Maimonides compound, Tiberias',
      },
      lat: 32.79,
      lng: 35.5372,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Isaiah_Horowitz',
      'https://he.wikipedia.org/wiki/ישעיה_הלוי_הורוביץ',
      'https://jewishencyclopedia.com/articles/7876-horowitz-isaiah',
      'https://www.kedem-auctions.com/en/node/31650',
      'https://www.chabad.org/library/article_cdo/aid/112500/jewish/The-Saintly-Shaloh.htm',
      'https://en.wikipedia.org/wiki/Tomb_of_Maimonides',
      'https://www.openstreetmap.org/node/2404045955',
    ],
  },
  ohr_hachaim: {
    bio: {
      he: 'רבי חיים בן עטר, בעל אור החיים, נולד בעיר סלא שבמרוקו בשנת ה׳תנ״ו, ולמד אצל סבו, שנקרא גם הוא רבי חיים בן עטר. עמד בראש ישיבה בסלא. בשנת ה׳תצ״ט יצא לארץ ישראל, ובדרך, בליוורנו, תמכו בו נדיבים שסייעו בהדפסת ספריו. בשנת ה׳תק״ב הגיע לירושלים עם תלמידיו והקים את ישיבת כנסת ישראל. פירושו לתורה נלמד בכל קהילות ישראל. נפטר בט״ו בתמוז ה׳תק״ג.',
      en: 'Rabbi Chaim ibn Attar, author of the Ohr HaChaim, was born in Salé, Morocco, in 1696, and studied with his grandfather and namesake. He headed a yeshiva in Salé. In 1739 he set out for the Land of Israel; on the way, in Livorno, supporters helped publish his books. In 1742 he reached Jerusalem with his students and founded the Knesset Yisrael yeshiva. His Torah commentary is studied in every Jewish community. He died on 15 Tammuz 5503 (1743).',
    },
    lessons: [
      {
        title: {
          he: 'מתיקות התורה',
          en: 'The sweetness of Torah',
        },
        text: {
          he: 'בפירושו כתב שאילו הרגישו בני אדם במתיקות התורה ובעריבותה, היו משתגעים אחריה, וכסף וזהב לא היו נחשבים בעיניהם. לימוד תורה יכול להיות שמחה ולא רק חובה.',
          en: 'He wrote that if people sensed the sweetness and delight of Torah, they would pursue it passionately, and silver and gold would count for nothing in their eyes. Torah study can be a joy, not only a duty.',
        },
      },
      {
        title: {
          he: 'לעלות ולבנות',
          en: 'Going up to build',
        },
        text: {
          he: 'רבי חיים עזב את מרוקו, ובדרך התקבצו סביבו כשלושים תלמידים ובני ביתם, שעלו איתו להקים ישיבה בירושלים, אף שהדרך הייתה ארוכה וקשה. הוא מלמד לממש חלום גם כשהדבר דורש מאמץ גדול.',
          en: 'Rabbi Chaim left Morocco, gathered about thirty students and their households on the way, and led them on a long, hard journey to found a yeshiva in Jerusalem. A dream is worth great effort.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'אור החיים',
          en: 'Ohr HaChaim',
        },
        about: {
          he: 'פירוש על התורה בדרכי הפשט, הרמז, הדרש והסוד.',
          en: 'A commentary on the Torah on the levels of plain meaning, allusion, homily and mysticism.',
        },
      },
      {
        title: {
          he: 'פרי תואר',
          en: "Pri To'ar",
        },
        about: {
          he: 'חידושים על השולחן ערוך, חלק יורה דעה.',
          en: "Novellae on the Shulchan Aruch, Yoreh De'ah.",
        },
      },
      {
        title: {
          he: 'חפץ ה׳',
          en: 'Chefetz Hashem',
        },
        about: {
          he: 'חידושים על מסכתות ברכות, שבת, הוריות וחולין.',
          en: 'Novellae on the tractates Berachot, Shabbat, Horayot and Chullin.',
        },
      },
      {
        title: {
          he: 'ראשון לציון',
          en: 'Rishon LeTzion',
        },
        about: {
          he: 'חידושים על מסכתות התלמוד, על יורה דעה ועל ספרי תנ״ך, שנדפסו אחרי פטירתו.',
          en: "Novellae on Talmud tractates, Yoreh De'ah and books of the Bible, printed after his death.",
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'כבה הנר המערבי',
          en: 'The western light went out',
        },
        text: {
          he: 'לפי מסורת חסידית, הבעל שם טוב העריך מאוד את רבי חיים בן עטר ואף ניסה לפגוש אותו. כשנפטר רבי חיים בירושלים, ישב הבעש״ט בפודוליה בסעודה שלישית עם תלמידיו ואמר להם: כבה הנר המערבי. לפי המסורת, הדבר נאמר עוד לפני שיכלה להגיע ידיעה על הפטירה.',
          en: 'According to Chassidic tradition, the Baal Shem Tov greatly admired Rabbi Chaim ibn Attar and even tried to meet him. When Rabbi Chaim died in Jerusalem, the Baal Shem Tov, sitting with his students at the third Shabbat meal in Podolia, told them that the western light had gone out, before any news of the death could have arrived.',
        },
        source: 'he.wikipedia, חיים בן עטר (Chassidic tradition, with references); en.wikipedia, Chaim ibn Attar',
      },
      {
        title: {
          he: 'הכביש שעקף את הקבר',
          en: 'The road that went around',
        },
        text: {
          he: 'לפי סיפור שפרסם הרב מנדל וינבך, בימי השלטון הירדני בהר הזיתים תוכנן כביש שעבר בדיוק מעל קברו. כשהדחפור התקרב לקבר, הוא הפסיק לפעול. למחרת, לפי הסיפור, דחפור נוסף שהסתער לעבר הקבר התהפך ונפל לנחל קדרון. מתכנני הכביש ויתרו, והכביש הוסט גבוה יותר במעלה ההר.',
          en: 'According to a story published by Rabbi Mendel Weinbach, under Jordanian rule a road was planned straight over his grave on the Mount of Olives. When a bulldozer came close to the grave, it stopped working. The next day, the story goes, another bulldozer charging toward the grave overturned into the Kidron Valley. The planners gave up and moved the road higher up the slope.',
        },
        source: 'Rabbi Mendel Weinbach, The Grave That Was Saved, Ohr Somayach (https://ohr.edu/2046)',
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות בהר הזיתים, ירושלים, בחלקת אור החיים',
        en: 'Mount of Olives cemetery, Jerusalem, in the Ohr HaChaim plot',
      },
      lat: 31.7767,
      lng: 35.2391,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Chaim_ibn_Attar',
      'https://he.wikipedia.org/wiki/חיים_בן_עטר',
      'https://ohr.edu/2046',
      'https://www.hidabroot.org/article/1158335',
      'https://web.archive.org/web/2020/http://mountofolives.co.il/he/deceased_card/חיים-בן-עטר-האור-החיים-הקדוש',
      'https://www.openstreetmap.org/node/3466304208',
    ],
  },
  ramchal: {
    bio: {
      he: 'רבי משה חיים לוצאטו, הרמח״ל, נולד בשנת ה׳תס״ז בפדובה שבאיטליה. כבר בצעירותו נודע כגאון בתורה ובקבלה וכמשורר. לאחר שעזב את איטליה ישב באמסטרדם, התפרנס מליטוש יהלומים וכתב את ״מסילת ישרים״ ו״דרך ה׳״. בשנת ה׳תק״ג עלה לארץ ישראל והתיישב בעכו, ושם נפטר במגפה עם בני ביתו בכ״ו באייר. שנת פטירתו שנויה במחלוקת: ה׳תק״ד, ה׳תק״ו או ה׳תק״ז.',
      en: 'Rabbi Moshe Chaim Luzzatto, the Ramchal, was born in Padua, Italy, in 1707. Known from his youth as a master of Torah, Kabbalah and poetry, he later lived in Amsterdam, earned his living polishing diamonds, and wrote Mesillat Yesharim and Derech Hashem there. In 1743 he settled in Acre in the Land of Israel, where he and his family died in a plague on 26 Iyar. The year is disputed: 5504, 5506 or 5507.',
    },
    lessons: [
      {
        title: {
          he: 'להזכיר את הידוע',
          en: 'Remembering what we know',
        },
        text: {
          he: 'בפתיחת ״מסילת ישרים״ כתב הרמח״ל שלא חיבר את ספרו ללמד את מה שאין בני האדם יודעים, אלא להזכיר להם את הידוע להם כבר. העבודה היא לחזור ולהתבונן במה שכבר ידוע.',
          en: 'In the introduction to Mesillat Yesharim, the Ramchal wrote that he did not compose it to teach people what they do not know, but to remind them of what they already know. The task is to return and reflect.',
        },
      },
      {
        title: {
          he: 'תכלית האדם',
          en: 'Why we were created',
        },
        text: {
          he: 'בפרק הראשון של ״מסילת ישרים״ כתב, בשם חכמינו, שהאדם לא נברא אלא להתענג על ה׳ וליהנות מזיו שכינתו. מי שזוכר את התכלית רואה בכל מצווה צעד בדרך אליה.',
          en: 'In its first chapter he wrote, citing the Sages, that a person was created only to delight in God and enjoy the radiance of His Presence. Whoever remembers this goal sees each mitzvah as a step toward it.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'מסילת ישרים',
          en: 'Mesillat Yesharim',
        },
        about: {
          he: 'ספר מוסר המתווה דרך הדרגתית לתיקון המידות ולשלמות רוחנית, ונלמד עד היום.',
          en: 'A work of mussar that lays out a step-by-step path to refining character and spiritual perfection, studied to this day.',
        },
      },
      {
        title: {
          he: 'דרך ה׳',
          en: 'Derech Hashem',
        },
        about: {
          he: 'הצגה מסודרת של יסודות האמונה ושל תפקיד המצוות בעולם.',
          en: 'An orderly account of the foundations of faith and the role of the mitzvot in the world.',
        },
      },
      {
        title: {
          he: 'דעת תבונות',
          en: "Da'at Tevunot",
        },
        about: {
          he: 'עיון ביסודות האמונה ובהנהגת העולם, הכתוב כשיח בין הנשמה לשכל.',
          en: 'A study of the foundations of faith and of how God guides the world, written as a dialogue between the soul and the intellect.',
        },
      },
      {
        title: {
          he: 'קל״ח פתחי חכמה',
          en: 'Kelach Pitchei Chochmah',
        },
        about: {
          he: 'ביאור שיטתי של קבלת האר״י ב-138 פתחים.',
          en: 'A systematic explanation of the Kabbalah of the Arizal in 138 openings.',
        },
      },
      {
        title: {
          he: 'דרך תבונות',
          en: 'Derech Tevunot',
        },
        about: {
          he: 'מדריך מסודר לדרכי העיון והלימוד בתלמוד.',
          en: 'A structured guide to the methods of Talmud study.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'ללכת ברגל מווילנא',
          en: 'Walking from Vilna',
        },
        text: {
          he: 'מסופר שהגאון מווילנא אמר, אחרי שקרא את ״מסילת ישרים״, שאילו היה הרמח״ל בחיים, היה הולך אליו ברגל מווילנא כדי ללמוד לפניו. עוד מובא בשמו שבעשרת הפרקים הראשונים של הספר אין אפילו מילה אחת מיותרת.',
          en: 'It is told that the Vilna Gaon, after reading Mesillat Yesharim, said that were the Ramchal still alive he would walk on foot from Vilna to learn at his feet. It is also reported in his name that the first ten chapters of the book contain not a single superfluous word.',
        },
        source:
          'D.A.F., Mesilas Yesharim (https://dafyomi.co.il/general/info/ref/mesilat.php); en.wikipedia, Moshe Chaim Luzzatto (https://en.wikipedia.org/wiki/Moshe_Chaim_Luzzatto)',
      },
      {
        title: {
          he: 'מלטש היהלומים מאמסטרדם',
          en: 'The diamond polisher of Amsterdam',
        },
        text: {
          he: 'כשהגיע הרמח״ל לאמסטרדם הצטרף לקהילה הפורטוגזית והתפרנס מליטוש יהלומים, לימד בבית המדרש ״עץ חיים״ וכתב. שם הוציא לאור את ״מסילת ישרים״, שנעשה לאחד מספרי המוסר הנלמדים ביותר בעם ישראל.',
          en: 'When the Ramchal reached Amsterdam he joined the Portuguese community and earned his living polishing diamonds, taught at the Etz Chaim study hall and wrote. There he published Mesillat Yesharim, which became one of the most widely studied works of mussar among the Jewish people.',
        },
        source:
          'he.wikipedia, משה חיים לוצאטו (https://he.wikipedia.org/wiki/משה_חיים_לוצאטו); en.wikipedia, Moshe Chaim Luzzatto (https://en.wikipedia.org/wiki/Moshe_Chaim_Luzzatto)',
      },
    ],
    grave: {
      place: {
        he: 'ציון הרמח״ל, ליד קבר רבי עקיבא, טבריה, שם נערכות ההילולות; לפי מסורת אחרת קבור בכפר יאסיף',
        en: "Ramchal's tomb beside the tomb of Rabbi Akiva, Tiberias, where the gatherings are held; another tradition places his grave in Kfar Yasif",
      },
      lat: 32.7886,
      lng: 35.5286,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://he.wikipedia.org/wiki/משה_חיים_לוצאטו',
      'https://en.wikipedia.org/wiki/Moshe_Chaim_Luzzatto',
      'https://www.jdn.co.il/j_world/2412208/',
      'https://dafyomi.co.il/general/info/ref/mesilat.php',
      'https://www.sefaria.org/Mesillat_Yesharim,_Introduction.1',
      'https://www.sefaria.org/Mesillat_Yesharim_1.2',
      'https://dannythedigger.com/tomb-of-rabbi-akiva/',
      'https://www.openstreetmap.org/node/14056724868',
      'https://holy.org.il/epicenter/רמחל/',
      'https://etshaimmanuscripts.nl/?p=1848',
    ],
  },
  baal_shem_tov: {
    bio: {
      he: 'רבי ישראל בן אליעזר, הבעל שם טוב, נולד בסביבות שנת ה׳ת״ס, לפי המסורת בעיירה אוקופ שבפודוליה. התייתם בילדותו, ועבד כעוזר מלמד, כשמש בבית המדרש וכמלמד. בסביבות שנת ה׳ת״ק השתקע במז׳יבוז׳, ומשם משך אליו תלמידים רבים, וכך נוסדה תנועת החסידות. לימד שאפשר לעבוד את ה׳ בכל מעשה, בשמחה ובתפילה מכל הלב, והעמיד במרכז את ערכו של היהודי הפשוט. נפטר בחג השבועות, ו׳ בסיון ה׳תק״ך.',
      en: "Rabbi Yisrael ben Eliezer, the Baal Shem Tov, was born around 1700, by tradition in Okopy, Podolia. Orphaned young, he worked as a teacher's assistant, a synagogue caretaker and a teacher. Around 1740 he settled in Medzhybizh, where he drew many students and founded the Chassidic movement. He taught that God can be served in every act, with joy and heartfelt prayer, and he valued the simple Jew. He died on Shavuot, 6 Sivan 5520 (1760).",
    },
    lessons: [
      {
        title: {
          he: 'עבודת ה׳ בשמחה',
          en: 'Serving God with joy',
        },
        text: {
          he: 'הבעל שם טוב לימד שעבודת ה׳ צריכה להיעשות בשמחה, ושהעצבות מרחיקה את האדם מבוראו. גם בתוך קושי אפשר לחפש את הטוב ולשמוח במצווה.',
          en: 'The Baal Shem Tov taught that God should be served with joy, and that sadness distances a person from the Creator. Even in hardship one can look for the good and rejoice in a mitzvah.',
        },
      },
      {
        title: {
          he: 'השגחה פרטית',
          en: 'Providence in every detail',
        },
        text: {
          he: 'לפי תורתו, גם הדבר הקטן ביותר, כמו עלה שהרוח מעיפה, נעשה בהשגחת הבורא. מי שמאמין בכך יכול לראות בכל מפגש ובכל אירוע הזדמנות לעבודת ה׳.',
          en: 'He taught that even the smallest thing, like a leaf blown by the wind, happens by divine providence. Whoever believes this can see every encounter and event as an opportunity to serve God.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'איגרת הקודש',
          en: 'Iggeret HaKodesh',
        },
        about: {
          he: 'מכתב לגיסו רבי גרשון מקיטוב, ובו תיאור עליית נשמתו בראש השנה ה׳תק״ז.',
          en: "A letter to his brother-in-law, Rabbi Gershon of Kitov, describing his soul's ascent on Rosh Hashanah 5507.",
        },
      },
      {
        title: {
          he: 'צוואת הריב״ש',
          en: "Tzava'at HaRivash",
        },
        about: {
          he: 'הנהגות ודברי תורה בשמו, שליקטו תלמידיו אחרי פטירתו.',
          en: 'Guidance and teachings in his name, collected by his students after his death.',
        },
      },
      {
        title: {
          he: 'כתר שם טוב',
          en: 'Keter Shem Tov',
        },
        about: {
          he: 'לקט מתורתו, בעיקר מתוך ספרי תלמידו רבי יעקב יוסף מפולנאה.',
          en: 'An anthology of his teachings, mainly from the books of his student Rabbi Yaakov Yosef of Polonne.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'כשיפוצו מעיינותיך',
          en: 'When your wellsprings spread',
        },
        text: {
          he: 'באיגרת לגיסו רבי גרשון מקיטוב סיפר הבעש״ט שבראש השנה ה׳תק״ז עלתה נשמתו לעולמות העליונים ונכנס להיכלו של המשיח. הוא שאל מתי יבוא, ונענה: כשיתפרסם לימודך ויתגלה בעולם, ויפוצו מעיינותיך חוצה. האיגרת נדפסה לראשונה בשנת ה׳תקמ״א, בסוף הספר בן פורת יוסף.',
          en: 'In a letter to his brother-in-law, Rabbi Gershon of Kitov, the Baal Shem Tov wrote that on Rosh Hashanah 5507 (1746) his soul ascended on high and entered the chamber of the Messiah. He asked when the Messiah would come and was told: when your teaching becomes known and revealed in the world, and your wellsprings spread outward. The letter was first printed in 1781, in Ben Porat Yosef.',
        },
        source:
          'Iggeret HaKodesh, printed in Ben Porat Yosef (Korets, 1781); he.wikipedia, הבעל שם טוב; Sefaria sheet, Baal Shem Tov: When is Moshiach Coming? (https://voices.sefaria.org/sheets/90076)',
      },
      {
        title: {
          he: 'החליל בנעילה',
          en: "The flute at Ne'ilah",
        },
        text: {
          he: 'לפי סיפור חסידי ידוע, נער פשוט שלא ידע להתפלל הגיע עם אביו ביום כיפור לבית הכנסת של הבעש״ט. בתפילת נעילה הוציא מכיסו חליל קטן שאהב, ונשף בו בכל כוחו. המתפללים נבהלו, אך הבעש״ט אמר שהקול, שיצא מעומק לבו של הנער, העלה את כל התפילות לשמים.',
          en: "According to a well-known Chassidic tale, a simple boy who could not pray was brought by his father to the Baal Shem Tov's synagogue on Yom Kippur. During Ne'ilah he pulled out the small flute he loved and blew it with all his strength. The congregation was shocked, but the Baal Shem Tov said the sound, coming from the depths of the boy's heart, carried all the prayers upward.",
        },
        source:
          "S. Y. Agnon, Days of Awe (Yamim Nora'im); Aish.com, Holy Disruptions (https://aish.com/holy-disruptions/)",
      },
    ],
    grave: {
      place: {
        he: 'אוהל הבעל שם טוב, בית העלמין היהודי העתיק, מז׳יבוז׳, אוקראינה',
        en: 'Ohel of the Baal Shem Tov, old Jewish cemetery, Medzhybizh, Ukraine',
      },
      lat: 49.4409,
      lng: 27.4044,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Baal_Shem_Tov',
      'https://he.wikipedia.org/wiki/ישראל_בעל_שם_טוב',
      'https://voices.sefaria.org/sheets/90076',
      'https://aish.com/holy-disruptions/',
      'https://www.chabad.org/therebbe/article_cdo/aid/80722/jewish/Overview.htm',
      'https://www.openstreetmap.org/way/208702248',
    ],
  },
  maggid_of_mezeritch: {
    bio: {
      he: 'רבי דוב בער, המגיד ממזריטש, נולד בלוקאץ׳ שליד רובנו שבווהלין. היה למדן גדול ושימש מגיד, דרשן, בכמה קהילות. באמצע המאה ה-18 הגיע אל הבעל שם טוב ונעשה לתלמידו. אחרי פטירת הבעש״ט עמד בראש תנועת החסידות והעביר את מרכזה למזריטש. גידל דור של תלמידים שהפיצו את החסידות בארצות רבות. בסוף ימיו נמלט ממגפה לאניפולי, ושם נפטר בי״ט בכסלו ה׳תקל״ג ונקבר.',
      en: "Rabbi Dov Ber, the Maggid of Mezeritch, was born in Lokachi near Rivne, Volhynia. A great scholar, he served as a maggid (preacher) in several communities. In the mid-18th century he became a disciple of the Baal Shem Tov. After the Baal Shem Tov's death he led the Chassidic movement from Mezeritch and raised a generation of disciples who spread Chassidism widely. Fleeing a plague, he died in Hanipol on 19 Kislev 5533 (1772) and is buried there.",
    },
    lessons: [
      {
        title: {
          he: 'ללמוד מתינוק',
          en: 'Learning from a child',
        },
        text: {
          he: 'לפי תורה המיוחסת לו, אמר המגיד לתלמידו רבי זושא שאפשר ללמוד מתינוק שלושה דברים: לשמוח תמיד, לא לשבת בטל אף רגע, ולבכות ולבקש בכל כוחו את מה שהוא צריך.',
          en: 'In a teaching attributed to him, the Maggid told his disciple Reb Zusha that one can learn three things from a small child: always to be happy, never to sit idle, and to cry out wholeheartedly for what one needs.',
        },
      },
      {
        title: {
          he: 'להעמיד תלמידים',
          en: 'Raising disciples',
        },
        text: {
          he: 'המגיד לא כתב ספרים בעצמו, אבל הקדיש את כוחו לגידול תלמידים, ובהם רבי לוי יצחק מברדיצ׳ב, רבי שניאור זלמן מלאדי ורבי אלימלך מליז׳נסק. השפעה אמיתית ממשיכה לחיות דרך התלמידים.',
          en: 'The Maggid wrote no books himself but devoted his strength to raising disciples, among them Rabbi Levi Yitzchak of Berditchev, Rabbi Shneur Zalman of Liadi and Rabbi Elimelech of Lizhensk. Real influence lives on through disciples.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'מגיד דבריו ליעקב (ליקוטי אמרים)',
          en: 'Maggid Devarav LeYaakov (Likutei Amarim)',
        },
        about: {
          he: 'ליקוט מדרשותיו שערך רבי שלמה מלוצק, נדפס לראשונה בקוריץ.',
          en: 'A collection of his teachings edited by Rabbi Shlomo of Lutsk, first printed in Korets.',
        },
      },
      {
        title: {
          he: 'אור תורה',
          en: 'Or Torah',
        },
        about: {
          he: 'דברי תורה שלו על סדר התורה והתנ״ך, מתוך כתבי יד של תלמידים.',
          en: "His teachings on the Torah and the Bible, from his students' manuscripts.",
        },
      },
      {
        title: {
          he: 'אור האמת',
          en: 'Or HaEmet',
        },
        about: {
          he: 'דברי תורה שלו מתוך העתקה של כתבי תלמידו רבי לוי יצחק מברדיצ׳ב.',
          en: 'His teachings, from a copy of the notes of his student Rabbi Levi Yitzchak of Berditchev.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'הפגישה עם הבעש״ט',
          en: 'Meeting the Baal Shem Tov',
        },
        text: {
          he: 'המגיד נסע אל הבעש״ט, אך בימים הראשונים שמע ממנו רק סיפורים פשוטים, והחליט לחזור לביתו. בחצות קרא לו הבעש״ט וביקש שיסביר קטע מספר עץ חיים. המגיד הסביר, והבעש״ט אמר שאינו מבין דבר וקרא את הקטע בעצמו. לפי המסופר, הבית התמלא אור, אש סבבה אותם, והמלאכים שנזכרו בקטע נראו לעיניהם. אמר הבעש״ט: הפירוש נכון, אבל לימודך היה בלי נשמה. המגיד נשאר אצלו.',
          en: 'The Maggid came to the Baal Shem Tov but heard only simple stories, so he decided to leave. At midnight the Baal Shem Tov asked him to explain a passage in Etz Chaim. The Maggid did; the Baal Shem Tov said he understood nothing and read it himself. According to the account, the house filled with light and fire, and the angels named there appeared. The Baal Shem Tov said: your explanation was right, but soulless. The Maggid stayed.',
        },
        source:
          'Keter Shem Tov (Korets, 1795), part 2, §124, translated in a Torah in Motion source sheet (https://torahinmotion.org/sites/default/files/Torah%20in%20Motion%202%20Wiskind.pdf); he.wikipedia, דב בער ממזריטש; en.wikipedia, Dov Ber of Mezeritch',
      },
    ],
    grave: {
      place: {
        he: 'אוהל המגיד ורבי זושא, בית העלמין היהודי באניפולי (הנופיל), אוקראינה',
        en: 'Ohel of the Maggid and Reb Zusha, Jewish cemetery of Hannopil (Anipoli), Ukraine',
      },
      lat: 50.454,
      lng: 26.9048,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Dov_Ber_of_Mezeritch',
      'https://he.wikipedia.org/wiki/דב_בער_ממזריטש',
      'https://torahinmotion.org/sites/default/files/Torah%20in%20Motion%202%20Wiskind.pdf',
      'https://www.kabbalaonline.org/kabbalah/article_cdo/aid/1338631/jewish/The-Child-and-the-Thief.htm',
      'https://esjf-cemeteries.org/cemetery/hannopil-jewish-cemetery/',
      'https://www.openstreetmap.org/way/771337559',
    ],
  },
  rashash: {
    bio: {
      he: 'רבי שלום מזרחי שרעבי, הרש״ש, נולד בתימן בסביבות שנת ה׳ת״פ. בצעירותו נדד דרך הודו, בגדאד ודמשק עד שהגיע לירושלים. שם שימש שמש בישיבת המקובלים בית אל, ולימים עמד בראשה. הנהיג את חבורת אהבת שלום, שבין חבריה היה החיד״א. הסידור שלו, עם כוונות התפילה לפי שיטת האר״י, משמש עד היום בסיס לתפילת המקובלים. נפטר בי׳ בשבט ה׳תקל״ז ונקבר בהר הזיתים.',
      en: "Rabbi Shalom Mizrachi Sharabi, the Rashash, was born in Yemen around 1720. As a young man he traveled through India, Baghdad and Damascus to Jerusalem, where he served as caretaker of the Beit El kabbalists' yeshiva and later became its head. He led the Ahavat Shalom circle, which included the Chida. His prayer book with Lurianic kavanot (meditative intentions) remains the basis of kabbalistic prayer. He died on 10 Shevat 5537 (1777).",
    },
    lessons: [
      {
        title: {
          he: 'גדולה בצניעות',
          en: 'Greatness in humility',
        },
        text: {
          he: 'לפי המסורת, הרש״ש עבד שנים כשמש בישיבת בית אל והסתיר את ידיעותיו העמוקות, עד שגדולתו התגלתה. הוא מלמד שגדולה אמיתית אינה זקוקה לפרסום.',
          en: 'According to tradition, the Rashash worked for years as the caretaker of Beit El and hid his deep knowledge until his greatness came to light. He shows that true greatness needs no publicity.',
        },
      },
      {
        title: {
          he: 'תפילה בכוונה',
          en: 'Prayer with intention',
        },
        text: {
          he: 'הרש״ש הקדיש את חייו לכוונות התפילה, והסידור שלו מלמד לכוון בכל מילה. גם מי שאינו מקובל יכול ללמוד ממנו שהתפילה אינה רק מילים אלא עבודה שבלב.',
          en: 'The Rashash devoted his life to the intentions of prayer, and his siddur teaches focus on every word. Even those who are not kabbalists can learn from him that prayer is not only words but service of the heart.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'סידור הרש״ש',
          en: 'Siddur HaRashash',
        },
        about: {
          he: 'סידור תפילה עם כוונות לפי קבלת האר״י, המשמש את המקובלים עד היום.',
          en: 'A prayer book with kavanot according to Lurianic Kabbalah, still used by kabbalists.',
        },
      },
      {
        title: {
          he: 'נהר שלום',
          en: 'Nehar Shalom',
        },
        about: {
          he: 'חיבור בקבלה בביאור כתבי האר״י.',
          en: "A kabbalistic work explaining the Arizal's writings.",
        },
      },
      {
        title: {
          he: 'רחובות הנהר',
          en: 'Rechovot HaNahar',
        },
        about: {
          he: 'חיבור בקבלה, והקדמתו ידועה במיוחד.',
          en: 'A kabbalistic work whose introduction is especially well known.',
        },
      },
      {
        title: {
          he: 'אמת ושלום',
          en: 'Emet VeShalom',
        },
        about: {
          he: 'חיבור בקבלה על פי שיטת האר״י.',
          en: "A kabbalistic work following the Arizal's system.",
        },
      },
      {
        title: {
          he: 'פירוש והגהות השמ״ש',
          en: 'HaShemesh commentary and glosses',
        },
        about: {
          he: 'פירוש והגהות על כתבי האר״י.',
          en: "Commentary and glosses on the Arizal's writings.",
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'הפתקים בבית אל',
          en: 'The notes at Beit El',
        },
        text: {
          he: 'לפי מסורת ידועה, כשהגיע הרש״ש לירושלים התקבל לישיבת בית אל רק כשמש. כשהתקשו חכמי הישיבה בשאלה קשה בקבלה, הופיע בלילה פתק עם התשובה, ואיש לא ידע מי כתב אותו. בתו של ראש הישיבה, רבי גדליה חיון, הסתתרה לילה אחד בבית המדרש וראתה שהשמש הצעיר הוא הכותב. כך נודעה גדולתו, ולימים עמד בראש הישיבה.',
          en: 'According to a well-known tradition, when the Rashash reached Jerusalem he was accepted at the Beit El yeshiva only as a caretaker. Whenever the scholars struggled with a hard kabbalistic question, a note with the answer appeared overnight, and no one knew who wrote it. The daughter of the head of the yeshiva, Rabbi Gedaliah Chayun, hid one night and saw that the young caretaker was the writer. So his greatness became known, and later he headed the yeshiva.',
        },
        source:
          'Chabad.org, Rabbi Shalom Sharabi, The Rashash (https://www.chabad.org/kabbalah/article_cdo/aid/2444220/jewish/Rabbi-Shalom-Sharabi-The-Rashash.htm); City of David, Sar Shalom Sharabi (https://cityofdavid.org.il/sar-shalom-sharabi/)',
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות בהר הזיתים, ירושלים',
        en: 'Mount of Olives cemetery, Jerusalem',
      },
      lat: 31.7764,
      lng: 35.2399,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Shalom_Sharabi',
      'https://he.wikipedia.org/wiki/שלום_שרעבי',
      'https://www.hamichlol.org.il/רבי_שלום_שרעבי',
      'https://www.chabad.org/kabbalah/article_cdo/aid/2444220/jewish/Rabbi-Shalom-Sharabi-The-Rashash.htm',
      'https://cityofdavid.org.il/sar-shalom-sharabi/',
      'https://web.archive.org/web/2020/http://mountofolives.co.il/he/deceased_card/רבי-שלום-שרעבי-הרשש-הילולת-הרשש-י-שבט',
    ],
  },
  amram_ben_diwan: {
    bio: {
      he: 'רבי עמרם בן דיוואן נולד בירושלים למשפחת רבנים שמוצאה במרוקו. בשנת ה׳תקכ״ג שלחה אותו קהילת חברון למרוקו כשד״ר, שליח שאוסף כספים לעניי הארץ, והוא ייסד ישיבה באסז׳ן שליד וזאן. אחרי ששב לארץ יצא בשנת ה׳תקל״ד לשליחות שנייה, וישב בעיקר במכנאס. בדרכו חזרה לארץ ישראל נפטר בערב שבת, ט״ו באב ה׳תקמ״ב, ונקבר באסז׳ן. ההילולא ההמונית על קברו נערכת בל״ג בעומר, ולא ביום פטירתו.',
      en: 'Rabbi Amram ben Diwan was born in Jerusalem to a rabbinic family of Moroccan origin. In 1763 the Hebron community sent him to Morocco as a fundraising emissary, and he founded a yeshiva in Azjen near Ouazzane. In 1774 he left on a second mission, living mostly in Meknes. Heading home, he died on Friday, 15 Av 5542 (1782), and was buried in Azjen. The great pilgrimage to his grave is on Lag BaOmer, not this date.',
    },
    lessons: [
      {
        title: {
          he: 'שליחות למען הציבור',
          en: 'A mission for the public',
        },
        text: {
          he: 'רבי עמרם עזב את ביתו לשנים ארוכות כדי לפרנס את עניי חברון, ובדרכים לא הסתפק באיסוף כספים: פתח ישיבה ולימד תורה. מי שיוצא לשליחות למען הכלל יכול להוסיף טוב בכל מקום שאליו הוא מגיע.',
          en: 'Rabbi Amram left home for years to support the poor of Hebron, and on the road he did more than collect funds: he opened a yeshiva and taught Torah. One who serves the public can add good wherever he goes.',
        },
      },
      {
        title: {
          he: 'גדולה בפשטות',
          en: 'Greatness in simplicity',
        },
        text: {
          he: 'חכמי חברון כינו אותו ״סיני ועוקר הרים״, ובכל זאת נודע בענוותנותו ובהליכותיו הצנועות. גדולה בתורה אינה צריכה להרחיק אדם מאנשים פשוטים, אלא לקרב אותו אליהם.',
          en: "Hebron's sages called him 'Sinai and uprooter of mountains,' yet he was known for his humility and modest ways. Greatness in Torah need not set a person apart from simple people; it should draw him closer to them.",
        },
      },
    ],
    biblical: false,
    works: [],
    stories: [
      {
        title: {
          he: 'הגלימה שניתנה לעני',
          en: 'The cloak given away',
        },
        text: {
          he: 'מסופר שבפאס כיבדו אותו רבנים ועשירים, ועני אחד ביקש ממנו עזרה כדי לפרנס את בנותיו. לרבי עמרם לא היה כסף לתת, והוא נתן לו את גלימתו ואמר שיש בה ברכה לרפואה. לפי המסופר, חולים שהתעטפו בה החלימו. כששאלו את הרב היכן גלימתו, השיב בשם האר״י שלבושו האמיתי של אדם הוא המצוות ומעשי החסד שצבר.',
          en: "It is told that in Fez he was honored by rabbis and the wealthy, and a poor man asked him for help to support his daughters. Having no money to give, Rabbi Amram gave him his cloak, saying it carried a blessing for healing. According to the story, the sick who wrapped themselves in it recovered. Asked where his cloak was, he answered, citing the Arizal, that a person's true garment is the mitzvot and kindness he has gathered.",
        },
        source: 'Told by Rabbi Herzl Hodar, tv2000 (https://www.tv2000.co.il/article/55190)',
      },
      {
        title: {
          he: 'חייו תחת חיי בנו',
          en: 'His life for his son',
        },
        text: {
          he: 'מסופר שבנו רבי חיים, שליווה אותו בשליחות, חלה במחלה קשה. רבי עמרם התפלל שייקחו את חייו שלו במקום חיי בנו. לפי המסופר, הבן החלים, ורבי עמרם נפטר זמן קצר אחר כך. רבי חיים המשיך את שליחות אביו בערי מרוקו ונקבר שם.',
          en: "It is told that his son, Rabbi Chaim, who travelled with him on the mission, fell gravely ill. Rabbi Amram prayed that his own life be taken instead of his son's. According to the story, the son recovered, and Rabbi Amram died soon afterwards. Rabbi Chaim carried on his father's mission among the towns of Morocco and is buried there.",
        },
        source:
          "Hevrat Pinto, Rabbi Amram Ben Diwan (https://hevratpinto.org/tzadikim_eng/034_rabbi_amram_ben_diwan.html); Jewish Press, How a Rabbi's Grave in Morocco Attracted Jews on Lag BaOmer (https://jewishpress.com/how-a-rabbis-grave-in-morocco-attracted-jews-on-lag-baomer/)",
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין היהודי בכפר אסז׳ן, סמוך לוזאן, מרוקו; העלייה לרגל הגדולה בל״ג בעומר',
        en: 'Jewish cemetery of Azjen (Asjen), near Ouazzane, Morocco; the great pilgrimage is on Lag BaOmer',
      },
      lat: null,
      lng: null,
      link: true,
      query: 'Rabbi Amram Ben Diwan Asjen',
      noLinkReason: null,
    },
    sources: [
      'https://he.wikipedia.org/wiki/עמרם_בן_דיוואן',
      'https://en.wikipedia.org/wiki/Amram_ben_Diwan',
      'https://www.tv2000.co.il/article/55190',
      'https://tzadikim.dailyzohar.com/rabbi-amram-ben-diwan-172',
      'https://nertzaddik.com/tzadik-info?id=2849',
      'https://hevratpinto.org/tzadikim_eng/034_rabbi_amram_ben_diwan.html',
      'https://jewishpress.com/how-a-rabbis-grave-in-morocco-attracted-jews-on-lag-baomer/',
      'https://cdp.jewishgen.org/wwd',
      'https://www.openstreetmap.org/relation/2563396',
    ],
  },
  elimelech_of_lizhensk: {
    bio: {
      he: 'רבי אלימלך מליז׳נסק נולד בפולין בשנת ה׳תע״ז, ואחיו הוא רבי זושא מאניפולי. השניים למדו אצל המגיד ממזריטש, ויחד יצאו לשנים של גלות מרצון, נדודים בין העיירות כדי לעורר יהודים לתשובה. אחרי פטירת המגיד השתקע בליז׳נסק שבגליציה והיה למנהיג החסידות בגליציה ובפולין. פיתח את תורת הצדיק, ותלמידיו, ובהם החוזה מלובלין והמגיד מקוז׳ניץ, הנהיגו את הדור הבא. נפטר בכ״א באדר ה׳תקמ״ז.',
      en: "Rebbe Elimelech of Lizhensk was born in Poland in 1717; his brother was Reb Zusha of Anipoli. Both studied under the Maggid of Mezeritch and spent years in self-imposed exile, wandering to inspire Jews to return. After the Maggid's death he settled in Leżajsk (Lizhensk), Galicia, and led Chassidism in Galicia and Poland. He developed the doctrine of the tzaddik; his disciples included the Seer of Lublin and the Maggid of Kozhnitz. He died on 21 Adar 5547 (1787).",
    },
    lessons: [
      {
        title: {
          he: 'לראות את מעלת החבר',
          en: 'Seeing the good in others',
        },
        text: {
          he: 'בתפילה שחיבר לאמירה לפני התפילה ביקש: ״אדרבה, תן בלבנו שנראה כל אחד מעלת חברינו ולא חסרונם״. ההרגל לחפש את הטוב שבאחר מביא אהבה ושלום.',
          en: "In the prayer he composed for reciting before prayer, he asked that each of us see our fellows' virtues and not their faults. The habit of looking for the good in others brings love and peace.",
        },
      },
      {
        title: {
          he: 'צעדים קטנים בכל יום',
          en: 'Small steps every day',
        },
        text: {
          he: 'בצעטל קטן, פתק קצר שכתב, ריכז הוראות מעשיות להנהגה יומיומית בעבודת ה׳. שינוי גדול נבנה מצעדים קטנים וקבועים.',
          en: 'In Tzetel Katan, a short note he wrote, he gathered practical instructions for daily spiritual conduct. Big change is built from small, steady steps.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'נועם אלימלך',
          en: 'Noam Elimelech',
        },
        about: {
          he: 'פירוש חסידי על התורה, ובו ליקוטי שושנה על פסוקים ומאמרי חז״ל. נדפס בשנת ה׳תקמ״ח.',
          en: 'A Chassidic commentary on the Torah, with Likutei Shoshana on verses and sayings of the sages. Printed in 1788.',
        },
      },
      {
        title: {
          he: 'צעטל קטן',
          en: 'Tzetel Katan',
        },
        about: {
          he: 'רשימה קצרה של הנהגות לעבודת ה׳ בכל יום.',
          en: 'A short list of practices for daily service of God.',
        },
      },
      {
        title: {
          he: 'תפילה קודם התפילה',
          en: 'Prayer before prayer',
        },
        about: {
          he: 'תפילה לאמירה לפני תפילת שחרית, ובה הבקשה לראות את מעלת החבר.',
          en: 'A prayer recited before the morning prayer, including the request to see the good in others.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'הכנסת אורחים של העשיר',
          en: "A rich man's hospitality",
        },
        text: {
          he: 'רבי אלימלך ורבי זושא נדדו מחופשים לקבצנים והגיעו בלילה ללודמיר. עשיר אחד סירב לארח אותם והפנה אותם לבית ההקדש, והם התארחו בביתו הדל של סופר העיר. שנים אחר כך שבו כרבנים מפורסמים, והעשיר זכה לארח אותם. הם שלחו לביתו את העגלה, הסוסים והמטען, ונשארו אצל הסופר. לעשיר הנעלב הסביר רבי אלימלך: כשבאנו בלי כל אלה דחית אותנו, ולכן אתה מארח את מה שכיבדת.',
          en: "Disguised as beggars, Rebbe Elimelech and Reb Zusha reached Lodmir one night. A rich man turned them away to the poorhouse, so they stayed in the town scribe's humble home. Years later they returned as famous rabbis, and the rich man was chosen to host them. They sent their coach, horses and luggage to his house but stayed with the scribe. Rebbe Elimelech explained: without these you turned us away, so you are hosting what you honored.",
        },
        source:
          "Yanki Tauber, A Rich Man's Hospitality, Chabad.org (https://www.chabad.org/library/article_cdo/aid/312880/jewish/A-Rich-Mans-Hospitality.htm)",
      },
    ],
    grave: {
      place: {
        he: 'אוהל רבי אלימלך, בית העלמין היהודי בליז׳נסק, פולין',
        en: 'Ohel of Rebbe Elimelech, Jewish cemetery, Leżajsk, Poland',
      },
      lat: 50.2511,
      lng: 22.4223,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Elimelech_of_Lizhensk',
      "https://he.wikipedia.org/wiki/אלימלך_מליז'נסק",
      'https://www.chabad.org/library/article_cdo/aid/312880/jewish/A-Rich-Mans-Hospitality.htm',
      'https://jewishpress.com/judaism/jewish-columns/chodesh-tov/reb-elimelech-m%e2%80%99lizhensk-part-ii/2011/11/24',
      'https://pl.wikipedia.org/wiki/Cmentarz_żydowski_w_Leżajsku',
      'https://www.openstreetmap.org/node/1303959621',
    ],
  },
  menachem_mendel_of_vitebsk: {
    bio: {
      he: 'רבי מנחם מנדל מוויטבסק, בעל ״פרי הארץ״, נולד בשנת ה׳ת״צ בוויטבסק. בילדותו הובא אל הבעל שם טוב, ולמד אצל המגיד ממזריטש, שבשליחותו הפיץ חסידות ברוסיה הלבנה. אחרי פטירת המגיד הנהיג את חסידיה מוויטבסק ומהורודוק. באדר ה׳תקל״ז עלה לארץ ישראל בראש כשלוש מאות איש, ישב בצפת ואחר כך בטבריה, ויסד בה את הקהילה החסידית. הוציא את כל ממונו על היישוב, ונפטר בעוני בא׳ באייר ה׳תקמ״ח בטבריה.',
      en: "Born in Vitebsk in 1730, Rabbi Menachem Mendel wrote Pri HaAretz. Brought as a boy to the Baal Shem Tov, he studied under the Maggid of Mezeritch, spread Chassidism in White Russia, and after the Maggid's death led its Chassidim from Vitebsk and Horodok. In 1777 he led some three hundred people to the Holy Land, settling in Safed, then Tiberias, where he founded the Chassidic community. He spent everything on it and died poor on 1 Iyar 5548 (1788).",
    },
    lessons: [
      {
        title: {
          he: 'השפל באמת',
          en: 'Truly lowly',
        },
        text: {
          he: 'רבי מנחם מנדל חתם על מכתביו ״השפל באמת״, ולא הסכים שיכתבו על מצבתו דברי שבח, אלא רק את שמו. גדולה אמיתית אינה צריכה תארים, ומי שמקטין את עצמו מפנה מקום לאחרים.',
          en: "Rabbi Menachem Mendel signed his letters 'the truly lowly' and would not allow words of praise on his tombstone, only his name. True greatness needs no titles, and one who makes himself small leaves room for others.",
        },
      },
      {
        title: {
          he: 'בניין הארץ באחדות',
          en: 'Building the Land in unity',
        },
        text: {
          he: 'הוא הוציא את כל ממונו על היישוב בארץ ישראל, ופעל לאחדות בין הספרדים לאשכנזים, ואף השיא את בנו לבת משפחה ספרדית מכובדת בטבריה. בניין הארץ מתחיל בנתינה ובאהבת ישראל.',
          en: 'He spent everything on the settlement in the Land and worked for unity between Sephardim and Ashkenazim, marrying his son into a respected Sephardi family of Tiberias. Building the Land begins with giving and love of Israel.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'פרי הארץ',
          en: 'Pri HaAretz',
        },
        about: {
          he: 'פירוש חסידי על חמישה חומשי תורה, ובסופו מכתביו מטבריה לחסידיו בחו״ל על יישוב הארץ ותמיכה בו.',
          en: 'A Chassidic commentary on the Five Books of Moses, ending with his letters from Tiberias urging his followers abroad to support the settlement of the Land.',
        },
      },
      {
        title: {
          he: 'פרי העץ',
          en: 'Pri HaEtz',
        },
        about: {
          he: 'ספר נוסף מדברי תורתו, שנדפס בז׳יטומיר בשנת ה׳תרל״ד.',
          en: 'A further book of his teachings, printed in Zhitomir in 1874.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'ריח המשיח',
          en: 'The scent of the Messiah',
        },
        text: {
          he: 'מסופר שזמן קצר אחרי שהגיע רבי מנחם מנדל לארץ ישראל, עלה אדם על הר הזיתים ותקע בשופר, ושמועה פשטה שהמשיח בא. כשנודע לו הדבר, פתח את חלונו והריח את האוויר, ואחר כך סגר אותו בצער ואמר שאינו מריח את המשיח. חסידים הסבירו שבחדרו שלו שרר תמיד ריח הגאולה, ולכן חיפש אותו בחוץ.',
          en: "It is told that soon after Rabbi Menachem Mendel reached the Land of Israel, a man climbed the Mount of Olives and blew a shofar, and word spread that the Messiah had come. When he heard, he opened his window and sniffed the air, then sadly closed it and said, 'I do not smell the Messiah.' Chassidim explained that his own room always held the scent of redemption, so he looked for it outside.",
        },
        source:
          'Chabad.org, The Inside Out House (https://www.chabad.org/parshah/article_cdo/aid/346432/jewish/The-Inside-Out-House.htm); Kikar HaShabbat (https://www.kikar.co.il/actualy/svgumn)',
      },
      {
        title: {
          he: 'בגדים קרועים ולבבות שלמים',
          en: 'Torn clothes and whole hearts',
        },
        text: {
          he: 'בשמו מובא שאמר על חסידי רייסין, היא רוסיה הלבנה: ״ברייסין מצאתי לבבות שלמים ובגדים קרועים, הפכתי אותם ללבבות קרועים ובגדים שלמים״. כלומר, מצא שם יהודים עניים ותמימים, דאג לפרנסתם ולמצבם החומרי, ובד בבד עורר אותם ללב נשבר לפני הבורא.',
          en: "A saying is told in his name about the Chassidim of Reisin, White Russia: 'In Reisin I found whole hearts and torn clothes; I turned them into torn hearts and whole clothes.' He found poor, simple Jews there, cared for their livelihood and material needs, and at the same time stirred them to a heart humbled before the Creator.",
        },
        source:
          'he.wikipedia, מנחם מנדל מוויטבסק (https://he.wikipedia.org/wiki/מנחם_מנדל_מוויטבסק); Kikar HaShabbat (https://www.kikar.co.il/actualy/svgumn)',
      },
    ],
    grave: {
      place: {
        he: 'חלקת תלמידי הבעל שם טוב, בית העלמין הישן, טבריה',
        en: "Plot of the Baal Shem Tov's disciples, Old Cemetery, Tiberias",
      },
      lat: null,
      lng: null,
      link: true,
      query: 'בית העלמין הישן טבריה',
      noLinkReason: null,
    },
    sources: [
      'https://he.wikipedia.org/wiki/מנחם_מנדל_מוויטבסק',
      'https://www.kikar.co.il/actualy/svgumn',
      'https://www.jdn.co.il/j_world/2396833/',
      'https://www.chabad.org/parshah/article_cdo/aid/346432/jewish/The-Inside-Out-House.htm',
      'https://www.chabad.org/article.asp?aid=150190',
      'https://he.wikipedia.org/wiki/בית_הקברות_היהודי_העתיק_בטבריה',
      'https://commons.wikimedia.org/wiki/Category:Menachem_Mendel_of_Vitebsk_grave',
      'https://www.openstreetmap.org/way/619206997',
      'https://www.wikidata.org/wiki/Q7047088',
    ],
  },
  noda_biyehuda: {
    bio: {
      he: 'רבי יחזקאל לנדא, הנודע ביהודה, נולד בשנת ה׳תע״ד בעיר אפטא שבפולין. כיהן כדיין בברודי וכרב בימפולי, ומשנת ה׳תקט״ו ועד פטירתו היה רבה של פראג ושל בוהמיה. הקים בפראג ישיבה גדולה, ורבנים מכל אירופה שלחו אליו את שאלותיהם. ספרו נודע ביהודה הוא מספרי השו״ת החשובים ביותר, ופירושו לתלמוד, הצל״ח, נלמד עד היום. נפטר בפראג בי״ז באייר ה׳תקנ״ג.',
      en: 'Rabbi Yechezkel Landau, the Noda BiYehuda, was born in Opatów, Poland, in 1713. He served as a judge in Brody and rabbi of Yampol, and from 1755 until his death was chief rabbi of Prague and Bohemia. He founded a large yeshiva in Prague, and rabbis across Europe sent him questions. His Noda BiYehuda is among the most important books of responsa, and his Talmud commentary, the Tzlach, is still studied. He died on 17 Iyar 5553 (1793).',
    },
    lessons: [
      {
        title: {
          he: 'כבוד הורים',
          en: 'Honoring parents',
        },
        text: {
          he: 'את ספריו קרא על שם הוריו: נודע ביהודה על שם אביו רבי יהודה, וציון לנפש חיה על שם אמו חיה. כך הפך את מפעל חייו לזיכרון ולכבוד להוריו.',
          en: "He named his books after his parents: Noda BiYehuda after his father, Rabbi Yehuda, and Tziyun LeNefesh Chaya after his mother, Chaya. His life's work became a tribute to them.",
        },
      },
      {
        title: {
          he: 'תורה בכל יום',
          en: 'Torah every day',
        },
        text: {
          he: 'כרב העיר פראג מסר בישיבתו ארבעה שיעורים בכל יום, שניים בגמרא ושניים בשולחן ערוך, לצד הנהגת הקהילה. גם עול ציבורי כבד לא דחק את לימוד התורה.',
          en: 'As rabbi of Prague he gave four classes every day in his yeshiva, two in Talmud and two in Shulchan Aruch, alongside leading the community. Heavy public duties never pushed Torah study aside.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'נודע ביהודה',
          en: 'Noda BiYehuda',
        },
        about: {
          he: 'שו״ת בשתי מהדורות, על כל חלקי ההלכה.',
          en: 'Responsa in two editions, covering all areas of halacha.',
        },
      },
      {
        title: {
          he: 'ציון לנפש חיה (צל״ח)',
          en: 'Tziyun LeNefesh Chaya (Tzlach)',
        },
        about: {
          he: 'חידושים על מסכתות התלמוד.',
          en: 'Novellae on tractates of the Talmud.',
        },
      },
      {
        title: {
          he: 'דגול מרבבה',
          en: 'Dagul MeRevava',
        },
        about: {
          he: 'הגהות על השולחן ערוך.',
          en: 'Glosses on the Shulchan Aruch.',
        },
      },
      {
        title: {
          he: 'אהבת ציון',
          en: 'Ahavat Tziyon',
        },
        about: {
          he: 'דרשות, שנדפסו בידי בנו רבי שמואל.',
          en: 'Sermons, published by his son Rabbi Shmuel.',
        },
      },
      {
        title: {
          he: 'דורש לציון',
          en: 'Doresh LeTziyon',
        },
        about: {
          he: 'דרשות, שנדפסו בידי בנו רבי שמואל.',
          en: 'Sermons, published by his son Rabbi Shmuel.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'סדר תשובה לאדם חלש',
          en: 'Repentance for a frail man',
        },
        text: {
          he: 'רב אחד כתב לנודע ביהודה בשם אדם חלוש בגופו ושקוע בלימוד תורה, שחטא חטא חמור ורצה לשוב בתשובה, וביקש עבורו סדר תשובה. הנודע ביהודה השיב שהתעניות והסיגופים אינם עיקר התשובה. העיקר הוא עזיבת החטא, וידוי בלב נשבר, חרטה וקרבה לבורא. לאדם החלש קבע תעניות מתונות, שאפשר לפדות חלק מהן בצדקה, ולצדן לימוד תורה ואמירת תהלים בכוונה.',
          en: 'A rabbi wrote to the Noda BiYehuda on behalf of a frail man devoted to Torah study, who had committed a grave sin and wished to repent. The Noda BiYehuda answered that fasts and self-affliction are not the essence of repentance. The essence is abandoning the sin, confession with a broken heart, regret and drawing close to God. For the frail man he set moderated fasts, partly redeemable with charity, alongside Torah study and heartfelt Psalms.',
        },
        source:
          'Noda BiYehuda, Mahadura Kamma, Orach Chaim 35, Sefaria (https://www.sefaria.org/Noda_BiYhudah_I%2C_Orach_Chaim.35)',
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות היהודי הישן בז׳יז׳קוב, פראג',
        en: 'Old Jewish Cemetery, Žižkov, Prague',
      },
      lat: 50.0816,
      lng: 14.4505,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Ezekiel_Landau',
      'https://he.wikipedia.org/wiki/יחזקאל_לנדא',
      'https://www.sefaria.org/Noda_BiYhudah_I%2C_Orach_Chaim.35',
      'https://cs.wikipedia.org/wiki/Židovský_hřbitov_v_Praze-Žižkově',
      'https://synagogue.cz/en/hrbitovy',
      'https://www.openstreetmap.org/relation/1515628',
    ],
  },
  vilna_gaon: {
    bio: {
      he: 'רבי אליהו בן שלמה זלמן, הגאון מווילנא (הגר״א), נולד בשנת ה׳ת״פ (1720) ונפטר בווילנא בי״ט בתשרי ה׳תקנ״ח (1797). הוא סירב לקבל משרת רבנות והקדיש את חייו ללימוד. כתב פירושים ותיקוני נוסח כמעט לכל תחומי ספרות התורה, מן המקרא והמשנה ועד השולחן ערוך והקבלה, ועסק גם בדקדוק ובמתמטיקה. תלמידו רבי חיים ייסד את ישיבת וולוז׳ין, ותלמידים אחרים עלו לארץ ישראל. במאה העשרים הועברו עצמותיו לבית הקברות היהודי בדרך סודרווה בווילנא.',
      en: "Rabbi Eliyahu ben Shlomo Zalman, the Vilna Gaon (Gra), was born in 1720 and died in Vilna on 19 Tishrei 5558 (1797). Refusing rabbinic office, he devoted himself to study, writing commentaries and corrections on nearly all Torah literature, from Bible and Mishnah to Shulchan Aruch and Kabbalah, and on grammar and mathematics. His student Rabbi Chaim founded the Volozhin yeshiva; others settled in the Land of Israel. In the 20th century his remains were moved to Vilnius's Sudervė cemetery.",
    },
    lessons: [
      {
        title: {
          he: 'התמדה בלימוד',
          en: 'Constant Torah study',
        },
        text: {
          he: 'לפי עדות בניו ישן כשעתיים ביממה, בפרקים קצרים, וכל שאר זמנו הוקדש ללימוד. דרכו מלמדת שהזמן הוא נכס יקר, וכל שעה פנויה יכולה להפוך לשעת תורה.',
          en: 'According to his sons, he slept about two hours a day in short intervals and gave the rest of his time to learning. His way teaches that time is precious, and any free hour can become an hour of Torah.',
        },
      },
      {
        title: {
          he: 'שמירת הלשון',
          en: "Guarding one's speech",
        },
        text: {
          he: 'באיגרת ששלח לבני ביתו בדרכו לארץ ישראל כתב שחטא הלשון שקול כנגד הכל. הוא הורה להרבות בשתיקה ולהתרחק מלשון הרע, מליצנות ומריבות, ובמיוחד בבית הכנסת ובשבת.',
          en: 'In the letter he sent his family on his way to the Land of Israel, he wrote that sins of speech outweigh all others, urging silence and avoidance of slander, mockery and quarrels, especially in synagogue and on Shabbat.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'ביאור הגר״א על השולחן ערוך',
          en: 'Biur HaGra on the Shulchan Aruch',
        },
        about: {
          he: 'הערות המראות את המקורות לפסקי השולחן ערוך, ומודפסות במהדורותיו המקובלות.',
          en: "Notes tracing the sources of the Shulchan Aruch's rulings, printed in its standard editions.",
        },
      },
      {
        title: {
          he: 'הגהות הגר״א על התלמוד',
          en: 'Hagahot HaGra on the Talmud',
        },
        about: {
          he: 'תיקוני נוסח קצרים בתלמוד, המודפסים במהדורות הש״ס המקובלות.',
          en: 'Brief textual corrections to the Talmud, printed in standard Talmud editions.',
        },
      },
      {
        title: {
          he: 'אדרת אליהו',
          en: 'Aderet Eliyahu',
        },
        about: {
          he: 'פירוש על התורה, שהוציא לאור בנו לאחר פטירתו.',
          en: 'A commentary on the Torah, published by his son after his death.',
        },
      },
      {
        title: {
          he: 'איל משולש',
          en: 'Ayil Meshulash',
        },
        about: {
          he: 'ספר במתמטיקה, בגאומטריה ובאסטרונומיה.',
          en: 'A book on mathematics, geometry and astronomy.',
        },
      },
      {
        title: {
          he: 'אגרת הגר״א (עלים לתרופה)',
          en: 'Iggeret HaGra (Alim LiTerufah)',
        },
        about: {
          he: 'איגרת מוסר ששלח לבני ביתו בדרכו לארץ ישראל.',
          en: 'An ethical letter he sent his family while traveling toward the Land of Israel.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'דרשה בבית הכנסת הגדול',
          en: 'A sermon in the Great Synagogue',
        },
        text: {
          he: 'לפי המסורת, כשהיה ילד כבן שש נשא דרשה בבית הכנסת הגדול של וילנא. אביו לימד אותו את הדרשה, ולכן ביקש ממנו רבי העשיל, ראש בית הדין בעיר, להוסיף גם פלפול משלו, כדי שיתברר שאינו רק משנן. הילד הוסיף דברי תורה משלו, והמאורע נעשה לאחד הסיפורים המוכרים על גאונותו המוקדמת.',
          en: "According to tradition, at about six he gave a sermon in the Great Synagogue of Vilna. His father had taught him the sermon, so Rabbi Heschel, head of the town's rabbinical court, asked him to add an original discourse too, to show he was not merely reciting. The boy added Torah thoughts of his own, and the episode became one of the best-known stories of his early brilliance.",
        },
        source:
          'Wikipedia, Vilna Gaon (https://en.wikipedia.org/wiki/Vilna_Gaon); Hebrew Wikipedia, הגאון מווילנה (https://he.wikipedia.org/wiki/הגאון_מווילנה)',
      },
      {
        title: {
          he: 'המסע לארץ ישראל',
          en: 'The journey to the Land of Israel',
        },
        text: {
          he: 'הגאון יצא לעלות לארץ ישראל, נפרד מבני ביתו והגיע עד קניגסברג. בדרך שלח לבני ביתו איגרת ובה הדרכות במוסר ובחינוך. לבסוף שב לווילנא, ולפי עדות בנו אמר שלא ניתנה לו רשות משמים להמשיך. כעבור שנים עלו רבים מתלמידיו לארץ ישראל והקימו בה קהילה.',
          en: 'The Gaon set out to settle in the Land of Israel, leaving his family behind, and reached Königsberg. On the way he sent his family a letter of moral and educational guidance. In the end he returned to Vilna; according to his son, he said he had not received permission from Heaven to go on. Years later many of his students settled in the Land of Israel and built a community there.',
        },
        source:
          'Wikipedia, Vilna Gaon (https://en.wikipedia.org/wiki/Vilna_Gaon); Hebrew Wikipedia, הגאון מווילנה (https://he.wikipedia.org/wiki/הגאון_מווילנה); Iggeret HaGra on Sefaria (https://www.sefaria.org/Iggeret_HaGra)',
      },
    ],
    grave: {
      place: {
        he: 'האוהל בבית הקברות היהודי בדרך סודרווה, וילנא, ליטא',
        en: 'Ohel in the Jewish cemetery on Sudervė Road, Vilnius, Lithuania',
      },
      lat: 54.712898,
      lng: 25.234477,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Vilna_Gaon',
      'https://he.wikipedia.org/wiki/הגאון_מווילנה',
      'https://www.sefaria.org/Iggeret_HaGra',
      'https://seforimblog.com/?p=378',
      'https://en.wikipedia.org/wiki/Jewish_cemeteries_of_Vilnius',
      'https://www.lzb.lt/en/2020/04/23/small-gathering-honors-memory-of-vilna-gaon-at-nominal-grave-in-vilnius/',
      'https://www.jewish-heritage-lithuania.org/cemetery/the-mausoleum-of-vilna-gaon-and-his-family/',
      'https://www.govilnius.lt/the-year-of-the-vilna-gaon',
    ],
  },
  zusha_of_anipoli: {
    bio: {
      he: 'רבי משולם זושא מאניפולי, הנודע בכינוי ״הרבי ר׳ זושא״, היה מגדולי תלמידי המגיד ממזריטש ואחיו של רבי אלימלך מליז׳נסק. בצעירותו נדד עם אחיו שנים רבות ב״גלות״ מרצון, ובמסעותיהם הפיצו את החסידות. לבסוף ישב בעיירה אניפולי שבווהלין. חי בעוני ובמחלות, אך נודע בשמחתו, בענוותו, בתמימותו ובאהבת ישראל. נפטר בב׳ בשבט ה׳תק״ס (1800) ונקבר באניפולי, ליד רבו המגיד.',
      en: 'Rabbi Meshulam Zusha of Anipoli, known as Reb Zusha, was a leading disciple of the Maggid of Mezritch and brother of Rabbi Elimelech of Lizhensk. In his youth he wandered for years with his brother in voluntary "exile", spreading Hasidism. He later settled in Anipoli in Volhynia. Though poor and often ill, he was known for joy, humility, simplicity and love of fellow Jews. He died on 2 Shevat 5560 (1800) and is buried in Anipoli beside the Maggid.',
    },
    lessons: [
      {
        title: {
          he: 'להיות זושא',
          en: 'Being Zusha',
        },
        text: {
          he: 'רבי זושא אמר שבעולם הבא לא ישאלו אותו מדוע לא היה משה רבנו, אלא מדוע לא היה זושא. כל אדם נמדד לפי הכוחות שקיבל והאם מימש אותם, ולא בהשוואה לאחרים.',
          en: 'Reb Zusha said that in Heaven he would not be asked why he was not Moses, but why he was not Zusha. Each person is judged by fulfilling his own gifts, not by comparison with others.',
        },
      },
      {
        title: {
          he: 'תוכחה מתוך ענווה',
          en: 'Rebuke through humility',
        },
        text: {
          he: 'כשרצה לעורר אדם לתשובה, לא הטיף לו. במקום זאת התוודה בקול על חטאים כאילו חטא בהם בעצמו, והשומע הבין את הרמז לבדו. ענווה פותחת לבבות יותר מביקורת.',
          en: 'When he wanted to move someone to repent, he did not preach. Instead he confessed aloud to sins as if he had committed them himself, and the listener grasped the hint alone. Humility opens hearts more than criticism does.',
        },
      },
    ],
    biblical: false,
    works: [],
    stories: [
      {
        title: {
          he: 'מעולם לא היה לי רע',
          en: 'Nothing bad ever happened to me',
        },
        text: {
          he: 'לפי המסורת, באו אל המגיד ממזריטש ושאלו כיצד אפשר לברך על הרעה כשם שמברכים על הטובה. המגיד שלח אותם אל רבי זושא. הם מצאו אותו עני וחולה, יושב מאחורי התנור, והציגו לו את השאלה. רבי זושא השיב בפשטות שאינו יכול להסביר להם, כי מעולם לא קרה לו דבר רע.',
          en: 'According to tradition, visitors asked the Maggid of Mezritch how one can bless God for the bad just as for the good. The Maggid sent them to Reb Zusha. They found him poor and ill, sitting behind the stove, and put the question to him. Reb Zusha simply answered that he could not explain it, since nothing bad had ever happened to him.',
        },
        source:
          'Chabad.org, Perspective (https://www.chabad.org/library/article_cdo/aid/2262/jewish/Perspective.htm); Niflaot HaRabbi as quoted by the Etzion Institute (https://etzion.org.il/en/node/49720); Hebrew Wikipedia, משולם זושא מאניפולי (https://he.wikipedia.org/wiki/משולם_זושא_מאניפולי)',
      },
      {
        title: {
          he: 'הגלות עם רבי אלימלך',
          en: 'Wandering with Rabbi Elimelech',
        },
        text: {
          he: 'במשך שנים יצאו רבי זושא ואחיו רבי אלימלך ל״גלות״ מרצון: נדדו מעיר לעיר בלי כסף ובלי מזון, ולא לנו באותו מקום יותר מלילה אחד. במסעותיהם הגיעו אל המגיד ממזריטש ונעשו לתלמידיו. לפי מסורת חסידית, החסידות התפשטה במיוחד במקומות שבהם עברו השניים.',
          en: 'For years Reb Zusha and his brother Rabbi Elimelech went into voluntary "exile", wandering from town to town without money or food and never staying more than one night in one place. On their travels they reached the Maggid of Mezritch and became his disciples. According to Hasidic tradition, Hasidism spread especially in the places the two passed through.',
        },
        source:
          'Hebrew Wikipedia, משולם זושא מאניפולי (https://he.wikipedia.org/wiki/משולם_זושא_מאניפולי); Wikipedia, Zusha of Hanipol, citing Rabbi Noach of Kobryn via Martin Buber (https://en.wikipedia.org/wiki/Zusha_of_Hanipol)',
      },
    ],
    grave: {
      place: {
        he: 'אוהל המגיד ממזריטש ורבי זושא, אניפולי (האנופיל), אוקראינה',
        en: 'Ohel of the Maggid of Mezritch and Reb Zusha, Anipoli (Hannopil), Ukraine',
      },
      lat: 50.4540097,
      lng: 26.9047842,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Zusha_of_Hanipol',
      'https://he.wikipedia.org/wiki/משולם_זושא_מאניפולי',
      'https://www.chabad.org/library/article_cdo/aid/2262/jewish/Perspective.htm',
      'https://etzion.org.il/en/node/49720',
      'https://www.esjf-cemeteries.org/survey/hannopil-jewish-cemetery/',
    ],
  },
  levi_yitzchak_of_berditchev: {
    bio: {
      he: 'רבי לוי יצחק מברדיצ׳ב נולד בשנת ה׳ת״ק (1740) בהוסקוב, למשפחת רבנים. היה מגדולי תלמידי המגיד ממזריטש ותלמידו של רבי שמעלקה מניקלשבורג. כיהן כרב בכמה קהילות, ומאמצע שנות השמונים של המאה ה-18 ועד פטירתו כרבה של ברדיצ׳ב. נודע כ״סנגורם של ישראל״, שלימד זכות על כל יהודי, וחיבר את ״קדושת לוי״. נפטר בכ״ה בתשרי ה׳תק״ע (1809) ונקבר בברדיצ׳ב.',
      en: 'Rabbi Levi Yitzchak of Berditchev was born in 1740 in Husakiv to a rabbinic family. A leading disciple of the Maggid of Mezritch and a student of Rabbi Shmelke of Nikolsburg, he served several communities and from the mid-1780s was rabbi of Berditchev until his death. Known as the "defender of Israel", he always pleaded the merit of every Jew, and wrote Kedushat Levi. He died on 25 Tishrei 5570 (1809) and is buried in Berditchev.',
    },
    lessons: [
      {
        title: {
          he: 'ללמד זכות על כל יהודי',
          en: "Seeing every Jew's good",
        },
        text: {
          he: 'רבי לוי יצחק נודע כסנגורם של ישראל. גם כשראה יהודי נכשל, חיפש את הצד הטוב שבו ולימד עליו זכות לפני הקב״ה. דרכו מלמדת להתבונן בזולת בעין טובה ולא למהר לשפוט.',
          en: 'Known as the defender of Israel, Rabbi Levi Yitzchak looked for the good even in a Jew who faltered and pleaded his merit before God. His way teaches looking at others kindly rather than rushing to judge.',
        },
      },
      {
        title: {
          he: 'התלהבות במצוות',
          en: 'Fervor in mitzvot',
        },
        text: {
          he: 'הוא קיים מצוות בהתלהבות גדולה. לפי סיפור ידוע, בסוכות מיהר כל כך אל האתרוג שהכניס את ידו דרך דלת הזכוכית של הארון, ורק אחר כך הבחין שנפצע. מצווה יכולה להיעשות מתוך להט ושמחה, ולא מתוך הרגל.',
          en: 'He performed mitzvot with great fervor. It is told that on Sukkot he reached for the etrog so eagerly that he put his hand through a glass cabinet door, noticing the injury only later. Mitzvot deserve passion, not routine.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'קדושת לוי',
          en: 'Kedushat Levi',
        },
        about: {
          he: 'פירוש חסידי על פרשות התורה ועל המועדים; נדפס לראשונה בשנת 1798.',
          en: 'A Hasidic commentary on the weekly Torah portions and the festivals; first printed in 1798.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'סחורה מוברחת וחמץ',
          en: 'Contraband and chametz',
        },
        text: {
          he: 'בערב פסח ביקש רבי לוי יצחק לברר מי בעיר מחזיק סחורה שהוברחה בניגוד לחוק הצאר, ומיד הוצעו לו טבק ובדים יקרים. אחר כך חיפש מעט חמץ, ואיש לא יכול היה להשיג לו. אז פנה לקב״ה: לצאר יש משמר גבול ובתי משפט, ובכל זאת חוקיו מופרים, ואילו את איסור החמץ שלך שומרים ישראל מרצונם.',
          en: "On the eve of Passover, Rabbi Levi Yitzchak asked around for goods smuggled against the Czar's law and was quickly offered tobacco and fine fabrics. Then he asked for a little chametz, and no one could find any. He turned to God: the Czar has border guards and courts, yet his laws are broken, while Your people keep Your ban on chametz of their own free will.",
        },
        source:
          'Chabad.org, Minister for the Defense (https://www.chabad.org/library/article_cdo/aid/1007684/jewish/Minister-for-the-Defense.htm)',
      },
      {
        title: {
          he: 'סיכת הגלגלים',
          en: 'Greasing the wheels',
        },
        text: {
          he: 'פעם ראה רבי לוי יצחק יהודי עטוף בטלית ובתפילין משמן את גלגלי עגלתו באמצע התפילה. במקום לנזוף בו פנה לשמים ואמר: ראה כמה קדוש עמך, אפילו כשהוא משמן גלגלים הוא מתפלל אליך.',
          en: 'Once Rabbi Levi Yitzchak saw a Jew wrapped in tallit and tefillin greasing the wheels of his wagon in the middle of prayer. Instead of scolding him, he turned to Heaven and said: see how holy Your people are; even while greasing wheels, they pray to You.',
        },
        source:
          'Chabad.org, Rabbi Levi Yitzchak of Berditchev: A Brief Biography by Chana Lewis (https://www.chabad.org/1007604)',
      },
    ],
    grave: {
      place: {
        he: 'אוהל רבי לוי יצחק בבית הקברות היהודי בברדיצ׳ב, אוקראינה',
        en: 'Ohel of Rabbi Levi Yitzchak in the Jewish cemetery of Berdychiv, Ukraine',
      },
      lat: 49.9085062,
      lng: 28.5903642,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Levi_Yitzchok_of_Berditchev',
      'https://www.chabad.org/1007604',
      'https://www.chabad.org/library/article_cdo/aid/1007684/jewish/Minister-for-the-Defense.htm',
      'https://he.wikipedia.org/wiki/לוי_יצחק_מברדיצ%27ב',
      'https://www.esjf-cemeteries.org/survey/berdychiv-new-jewish-cemetery/',
      'https://www.jewishgen.org/Ukraine/OTW_Berdichev_cem.asp',
    ],
  },
  avraham_of_kalisk: {
    bio: {
      he: 'רבי אברהם הכהן מקאליסק נולד בשנת ה׳תק״א בקאליסק שברוסיה הלבנה. בצעירותו למד עם הגאון מווילנא, ואחר כך היה לתלמיד המגיד ממזריטש, וחסידיו נודעו בהתלהבותם בעבודת ה׳. בשנת ה׳תקל״ז עלה לארץ ישראל עם רבי מנחם מנדל מוויטבסק וסייע לו בהנהגת העולים. אחרי פטירתו עמד בראש העדה החסידית בארץ, מטבריה, כעשרים ושתיים שנה. נפטר בד׳ בשבט ה׳תק״ע ונקבר בבית העלמין הישן בטבריה.',
      en: 'Rabbi Avraham HaKohen of Kalisk was born in 1741 in Kalisk, White Russia. He studied in his youth with the Vilna Gaon, then became a disciple of the Maggid of Mezeritch; his followers were known for their fervour. In 1777 he went up to the Land of Israel with Rabbi Menachem Mendel of Vitebsk, helping him lead the group, and after his death led the Chassidic community from Tiberias for some twenty-two years. He died on 4 Shevat 5570 (1810).',
    },
    lessons: [
      {
        title: {
          he: 'אמונה פשוטה',
          en: 'Simple faith',
        },
        text: {
          he: 'רבי אברהם סבר שאת רוב החסידים יש להדריך ביראת שמים פשוטה ובאמונת חכמים, ואת רזי התורה לשמור ליחידים. היסוד הוא אמונה תמימה, שכל אדם יכול להגיע אליה.',
          en: "Rabbi Avraham held that most Chassidim should be guided by simple fear of Heaven and faith in the Sages, keeping the Torah's hidden depths for the few. The foundation is wholehearted faith, open to every person.",
        },
      },
      {
        title: {
          he: 'אחריות לציבור',
          en: 'Responsibility for a community',
        },
        text: {
          he: 'כעשרים ושתיים שנה החזיק את העדה החסידית בארץ ישראל, ובמכתביו לחו״ל עודד את יישוב הארץ וביקש תמיכה בו. אחריות לציבור פירושה לדאוג לו גם בשנים הקשות.',
          en: 'For some twenty-two years he held the Chassidic community in the Land together, and his letters abroad encouraged settling the Land and asked for support. Responsibility for a community means caring for it in hard years too.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'חסד לאברהם',
          en: 'Chesed LeAvraham',
        },
        about: {
          he: 'חידושים בדרך הסוד על התורה, שנדפסו יחד עם ספרו של רבי אברהם המלאך באותו שם.',
          en: 'Mystical insights on the Torah, printed together with the book of the same name by Rabbi Avraham HaMalach.',
        },
      },
      {
        title: {
          he: 'אגרותיו',
          en: 'His letters',
        },
        about: {
          he: 'מכתביו מטבריה, שחלקם נדפסו בסוף ״פרי הארץ״, ומתעדים את חיי העדה החסידית בארץ.',
          en: 'His letters from Tiberias, some printed at the end of Pri HaAretz, which record the life of the Chassidic community in the Land.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'רבי נחמן מברסלב בטבריה',
          en: 'Rebbe Nachman in Tiberias',
        },
        text: {
          he: 'לפי ״שבחי הר״ן״, כשהגיע רבי נחמן מברסלב לטבריה בשנת ה׳תקנ״ט, הזמין אותו רבי אברהם לשבת פרשת נח. בליל שבת כפף רבי נחמן את ראשו שיברך אותו, אך רבי אברהם קפץ לאחוריו ברעדה גדולה, אמר ״איך אנו מתביישים בפני זרע הבעל שם טוב״, ולא רצה לברך אותו. רבי נחמן אמר עליו לימים שראה צדיקים רבים, אך שלמות ראה רק באיש קדוש זה.',
          en: 'According to Shivchei HaRan, when Rebbe Nachman of Breslov came to Tiberias in 1798, Rabbi Avraham invited him for Shabbat Noach. On Friday night Rebbe Nachman bowed his head to receive his blessing, but Rabbi Avraham drew back trembling, said how abashed they were before a descendant of the holy Baal Shem Tov, and would not bless him. Rebbe Nachman later said he had seen many tzaddikim, but perfection only in this holy man.',
        },
        source:
          "Shivchei HaRan, An Account of His Pilgrimage to the Holy Land 18, Hebrew original and Rabbi Nachman's Wisdom, trans. Aryeh Kaplan (https://www.sefaria.org/Shivchei_HaRan,_An_Account_of_His_Pilgrimage_to_the_Holy_Land.18)",
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין הישן, טבריה',
        en: 'Old Cemetery, Tiberias',
      },
      lat: null,
      lng: null,
      link: true,
      query: 'בית העלמין הישן טבריה',
      noLinkReason: null,
    },
    sources: [
      'https://he.wikipedia.org/wiki/אברהם_מקאליסק',
      'https://en.wikipedia.org/wiki/Abraham_Kalisker',
      'https://www.chabad.org/article.asp?aid=150190',
      'https://www.jewishencyclopedia.com/articles/9160',
      'https://www.jdn.co.il/j_world/2122121/',
      'https://www.sefaria.org/Shivchei_HaRan,_An_Account_of_His_Pilgrimage_to_the_Holy_Land.18',
      'https://he.wikipedia.org/wiki/בית_הקברות_היהודי_העתיק_בטבריה',
      'https://www.openstreetmap.org/way/619206997',
      'https://www.wikidata.org/wiki/Q7047088',
    ],
  },
  nachman_of_breslov: {
    bio: {
      he: 'רבי נחמן מברסלב נולד בשנת ה׳תקל״ב (1772) במז׳יבוז׳, נין לבעל שם טוב מצד אמו. בשנים 1798–1799 עלה לארץ ישראל וביקר בחיפה, בטבריה ובצפת. משנת 1802 ישב בברסלב, ושם נקשר אליו תלמידו רבי נתן, שכתב ופרסם את תורותיו. ייסד את חסידות ברסלב והדגיש התבודדות, שמחה ואמונה. בשנת 1810 עבר לאומן, ושם נפטר בי״ח בתשרי ה׳תקע״א ונקבר. קברו הוא כיום אתר עלייה לרגל גדול.',
      en: 'Rebbe Nachman of Breslov was born in 1772 in Medzhybizh, a great-grandson of the Baal Shem Tov through his mother. In 1798–1799 he journeyed to the Land of Israel, visiting Haifa, Tiberias and Safed. From 1802 he lived in Breslov, where his disciple Rabbi Nathan recorded his teachings. Founder of Breslov Hasidism, he stressed personal prayer, joy and faith. He moved to Uman in 1810 and died there on 18 Tishrei 5571; his grave draws vast numbers of pilgrims.',
    },
    lessons: [
      {
        title: {
          he: 'שיחה אישית עם הבורא',
          en: 'Personal prayer (hitbodedut)',
        },
        text: {
          he: 'רבי נחמן לימד להקדיש בכל יום זמן לשיחה אישית עם הקב״ה, ביחידות ובשפה של המדבר עצמו, כמו שמדברים עם חבר טוב. כך התפילה נעשית קשר חי ואישי ולא רק נוסח קבוע.',
          en: "Rebbe Nachman taught setting aside time each day to speak privately with God in one's own language, as one talks with a good friend. Prayer then becomes a living, personal bond, not only a fixed text.",
        },
      },
      {
        title: {
          he: 'שמחה בלי ייאוש',
          en: 'Joy without despair',
        },
        text: {
          he: 'הוא לימד ש״מצוה גדולה להיות בשמחה תמיד״, ושאין שום ייאוש בעולם כלל. גם אחרי נפילה אפשר לקום ולהתחיל מחדש, והשמחה עצמה נותנת כוח להתמודד.',
          en: 'He taught that it is a great mitzvah to be joyful always, and that there is no despair in the world at all. Even after a fall one can rise and begin again, and joy itself gives strength to cope.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'ליקוטי מוהר״ן',
          en: 'Likutei Moharan',
        },
        about: {
          he: 'תורותיו המרכזיות, שרשם תלמידו רבי נתן; חלקיו נדפסו החל משנת 1808.',
          en: 'His main teachings, recorded by his disciple Rabbi Nathan; its volumes were printed from 1808 on.',
        },
      },
      {
        title: {
          he: 'סיפורי מעשיות',
          en: 'Sippurei Maasiyot',
        },
        about: {
          he: 'שלושה עשר סיפורים בעלי משמעות פנימית עמוקה, שנדפסו בשנת 1816.',
          en: 'Thirteen tales with deep inner meaning, printed in 1816.',
        },
      },
      {
        title: {
          he: 'ספר המידות',
          en: 'Sefer HaMiddot',
        },
        about: {
          he: 'אמרות קצרות בעבודת המידות, מסודרות לפי סדר האלף-בית.',
          en: 'Short sayings on character and conduct, arranged alphabetically.',
        },
      },
      {
        title: {
          he: 'התיקון הכללי',
          en: 'Tikkun HaKlali',
        },
        about: {
          he: 'עשרה פרקי תהילים שקבע לאמירה, עם הסבר.',
          en: 'Ten psalms he designated for recitation, with an explanation.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'המסע לארץ ישראל',
          en: 'The journey to the Land of Israel',
        },
        text: {
          he: 'בל״ג בעומר ה׳תקנ״ח (1798) יצא רבי נחמן עם תלמיד אחד לארץ ישראל. הם הפליגו מאודסה דרך איסטנבול והגיעו לחיפה בערב ראש השנה. רבי נחמן ביקר בטבריה ובצפת, ובטבריה השכין שלום בין שני מנהיגים חסידיים. בדרך חזרה, בצל מלחמת נפוליאון, עלו על ספינת מלחמה תורכית ושבו הביתה אחרי תלאות רבות.',
          en: "On Lag BaOmer 5558 (1798) Rebbe Nachman set out with one disciple for the Land of Israel. Sailing from Odessa via Istanbul, they reached Haifa on the eve of Rosh Hashanah. He visited Tiberias and Safed, and in Tiberias made peace between two Hasidic leaders. On the way back, amid Napoleon's war, they boarded a Turkish warship and reached home after many hardships.",
        },
        source:
          'Shivchei HaRan, An Account of His Pilgrimage to the Holy Land, on Sefaria (https://www.sefaria.org/Shivchei_HaRan,_An_Account_of_His_Pilgrimage_to_the_Holy_Land.7); David Assaf, Tradition (https://traditiononline.org/wp-content/uploads/2022/04/Assaf.pdf); Wikipedia, Nachman of Breslov (https://en.wikipedia.org/wiki/Nachman_of_Breslov)',
      },
      {
        title: {
          he: 'הבחירה באומן',
          en: 'Choosing Uman',
        },
        text: {
          he: 'בשנת 1810, אחרי שביתו בברסלב נשרף, עבר רבי נחמן לאומן, העיר שבה נטבחו יהודים רבים בשנת 1768. לפי מקורות ברסלב בחר בה כדי להיקבר בין קדושי הטבח ולפעול לתיקון נשמותיהם. כעבור חודשים ספורים נפטר שם, ומאז פוקדים את קברו המוני מתפללים, ובמיוחד בראש השנה.',
          en: 'In 1810, after his home in Breslov burned, Rebbe Nachman moved to Uman, where many Jews had been massacred in 1768. According to Breslov sources, he chose it in order to be buried among the martyrs and to work for the repair of their souls. He died there a few months later, and crowds have visited his grave ever since, especially on Rosh Hashanah.',
        },
        source:
          'Wikipedia, Nachman of Breslov, citing Arthur Green, Tormented Master (https://en.wikipedia.org/wiki/Nachman_of_Breslov); Wikipedia, Rosh Hashanah kibbutz (https://en.wikipedia.org/wiki/Rosh_Hashanah_kibbutz)',
      },
    ],
    grave: {
      place: {
        he: 'ציון רבי נחמן, אומן, אוקראינה',
        en: "Rebbe Nachman's tomb (the Tziyun), Uman, Ukraine",
      },
      lat: 48.747053,
      lng: 30.2341588,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Nachman_of_Breslov',
      'https://he.wikipedia.org/wiki/נחמן_מברסלב',
      'https://www.sefaria.org/Shivchei_HaRan,_An_Account_of_His_Pilgrimage_to_the_Holy_Land.7',
      'https://traditiononline.org/wp-content/uploads/2022/04/Assaf.pdf',
      'https://en.wikipedia.org/wiki/Rosh_Hashanah_kibbutz',
      'https://he.wikipedia.org/wiki/קבר_רבי_נחמן_מברסלב',
    ],
  },
  baal_hatanya: {
    bio: {
      he: 'רבי שניאור זלמן מלאדי, ״האדמו״ר הזקן״ או ״בעל התניא״, נולד בשנת ה׳תק״ה (1745) בליוזנה והיה מתלמידי המגיד ממזריטש. לבקשת רבו חיבר את ״שולחן ערוך הרב״. הוא ייסד את חסידות חב״ד, ששמה ראשי תיבות של חכמה, בינה ודעת. בשנת 1798 נאסר בפטרבורג בעקבות האשמות שווא ושוחרר בי״ט בכסלו. בשנת 1812, בבריחה מפני צבא נפוליאון, נפטר בכ״ד בטבת ה׳תקע״ג בכפר פיענה ונקבר בהאדיטש.',
      en: "Rabbi Shneur Zalman of Liadi, the Alter Rebbe or Baal HaTanya, was born in 1745 in Liozna and was a disciple of the Maggid of Mezritch, at whose request he wrote the Shulchan Aruch HaRav. He founded Chabad Hasidism, named for wisdom, understanding and knowledge. In 1798 he was imprisoned in St. Petersburg on false charges and freed on 19 Kislev. Fleeing Napoleon's army, he died on 24 Tevet 5573 (1812) in Pena and was buried in Hadiach.",
    },
    lessons: [
      {
        title: {
          he: 'המוח שליט על הלב',
          en: 'The mind rules the heart',
        },
        text: {
          he: 'בספר התניא לימד שאדם יכול לשלוט ברגשותיו ובמעשיו בכוח ההתבוננות. גם כשהלב נמשך אחרי דבר שאינו ראוי, המחשבה, הדיבור והמעשה נשארים בידיו, ובהם נמדדת עבודתו.',
          en: "In the Tanya he taught that a person can govern feelings and deeds through contemplation. Even when the heart is drawn to something improper, thought, speech and action remain in one's control, and that is where one's service is measured.",
        },
      },
      {
        title: {
          he: 'אהבת ישראל',
          en: 'Love of fellow Jews',
        },
        text: {
          he: 'בפרק ל״ב בתניא כתב שמצוות ״ואהבת לרעך כמוך״ היא יסוד כל התורה, ושיש לאהוב כל יהודי, גדול וקטן, כי כל הנשמות קשורות זו בזו כאחים ממקור אחד.',
          en: 'In chapter 32 of the Tanya he wrote that "love your fellow as yourself" underlies the whole Torah, and that every Jew, great or small, deserves love, since all souls are bound together like siblings from one source.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'תניא (ליקוטי אמרים)',
          en: 'Tanya (Likutei Amarim)',
        },
        about: {
          he: 'ספר היסוד של חסידות חב״ד, על עבודת ה׳ ועל כוחות הנפש; נדפס לראשונה בשנת ה׳תקנ״ז.',
          en: 'The foundational book of Chabad Hasidism, on serving God and the powers of the soul; first printed in 5557 (1796–97).',
        },
      },
      {
        title: {
          he: 'שולחן ערוך הרב',
          en: 'Shulchan Aruch HaRav',
        },
        about: {
          he: 'ספר הלכה מקיף שחיבר לבקשת המגיד ממזריטש.',
          en: 'A comprehensive halachic code he wrote at the request of the Maggid of Mezritch.',
        },
      },
      {
        title: {
          he: 'סידור הרב',
          en: 'Siddur HaRav',
        },
        about: {
          he: 'סידור התפילה שערך על פי נוסח האר״י, ושעליו מבוסס סידור חב״ד.',
          en: "The prayer book he edited according to the Arizal's rite, the basis of the Chabad siddur.",
        },
      },
      {
        title: {
          he: 'תורה אור וליקוטי תורה',
          en: 'Torah Or and Likutei Torah',
        },
        about: {
          he: 'מאמרי חסידות על פרשות השבוע, שהוציא לאור נכדו ה״צמח צדק״.',
          en: 'Hasidic discourses on the weekly Torah portions, published by his grandson, the Tzemach Tzedek.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'כל נדרי של רחמים',
          en: 'A Kol Nidrei of compassion',
        },
        text: {
          he: 'בערב יום כיפור, לפני כל נדרי, הסיר האדמו״ר הזקן את הטלית והקיטל ויצא מבית הכנסת. הקהל המתין יותר משעתיים. מתברר שהלך לקצה העיר, אל יולדת שנשארה לבדה בבית קר ורעבה. הוא כרת עצים, הדליק אש ובישל לה מרק, כי פיקוח נפש דוחה את יום הכיפורים, ורק אחר כך חזר להתפלל.',
          en: 'On Yom Kippur eve, before Kol Nidrei, the Alter Rebbe took off his tallit and kittel and left the synagogue. The congregation waited over two hours. He had gone to the edge of town, to a woman who had just given birth and was alone, cold and hungry. He chopped wood, lit a fire and cooked her soup, since saving a life overrides Yom Kippur, and only then returned to pray.',
        },
        source:
          "Chabad.org, Keeping In Touch Vol. 2: Acharei, adapted by Eli Touger from the Lubavitcher Rebbe's talks (https://www.chabad.org/parshah/article_cdo/aid/2526676/jewish/Acharei.htm); Chabad.org, Higher Than Heaven (https://www.chabad.org/library/article_cdo/aid/3050225/jewish/Higher-Than-Heaven.htm)",
      },
      {
        title: {
          he: 'י״ט בכסלו',
          en: '19 Kislev',
        },
        text: {
          he: 'בשנת ה׳תקנ״ט (1798) נאסר האדמו״ר הזקן בעקבות האשמות שווא והוחזק 53 יום במבצר בפטרבורג. הצאר פאולוס הראשון הורה על שחרורו, והוא יצא לחופשי בי״ט בכסלו. חסידי חב״ד חוגגים את היום כ״חג הגאולה״, וקהילות רבות מחלקות בו בין הלומדים את לימוד הש״ס כולו.',
          en: 'In 5559 (1798) the Alter Rebbe was arrested on false charges and held for 53 days in a St. Petersburg fortress. Czar Paul I ordered his release, and he was freed on 19 Kislev. Chabad Hasidim celebrate the day as the "Festival of Redemption", and many communities divide the study of the entire Talmud among their members on it.',
        },
        source:
          'Wikipedia, Shneur Zalman of Liadi (https://en.wikipedia.org/wiki/Shneur_Zalman_of_Liadi); Chabad.org, Hayom Yom, Kislev 19 (https://www.chabad.org/therebbe/article_cdo/aid/6009/jewish/Hayom-Yom-Kislev-19.htm)',
      },
    ],
    grave: {
      place: {
        he: 'האוהל בבית הקברות היהודי בהאדיטש (גדיאץ׳), אוקראינה',
        en: 'Ohel in the Jewish cemetery of Hadiach (Haditch), Ukraine',
      },
      lat: 50.3545471,
      lng: 34.0104241,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Shneur_Zalman_of_Liadi',
      'https://he.wikipedia.org/wiki/שניאור_זלמן_מלאדי',
      'https://www.chabad.org/parshah/article_cdo/aid/2526676/jewish/Acharei.htm',
      'https://www.chabad.org/library/article_cdo/aid/3050225/jewish/Higher-Than-Heaven.htm',
      'https://www.chabad.org/therebbe/article_cdo/aid/6009/jewish/Hayom-Yom-Kislev-19.htm',
      'https://www.esjf-cemeteries.org/survey/hadyach-jewish-cemetery/',
      'https://www.jns.org/news/world/fire-destroys-chabad-center-in-ukrainian-city-where-founding-rabbi-buried',
    ],
  },
  chozeh_of_lublin: {
    bio: {
      he: 'רבי יעקב יצחק הלוי הורוביץ, ״החוזה מלובלין״, נולד בסביבות שנת ה׳תק״ה (1745). למד אצל רבי שמעלקה מניקלשבורג, שהה במחיצת המגיד ממזריטש ונעשה לתלמידו הקרוב של רבי אלימלך מליז׳נסק. הנהיג חסידים בלנצוט ואחר כך בלובלין, והיה לדמות המרכזית של החסידות בפולין ובגליציה. רבים מתלמידיו ייסדו שושלות חסידיות. לפי המסורת נקרא ״חוזה״ בשל ראייתו הרוחנית. נפטר בתשעה באב ה׳תקע״ה (1815) ונקבר בבית הקברות היהודי הישן בלובלין.',
      en: "Rabbi Yaakov Yitzchak HaLevi Horowitz, the Seer (Chozeh) of Lublin, was born around 1745. He studied with Rabbi Shmelke of Nikolsburg and the Maggid of Mezritch, and became a close disciple of Rabbi Elimelech of Lizhensk. Leading Hasidim in Łańcut and Lublin, he became the central figure of Hasidism in Poland and Galicia; many of his students founded dynasties. According to tradition, his title reflects his spiritual vision. He died on Tisha B'Av 5575 (1815) and is buried in Lublin.",
    },
    lessons: [
      {
        title: {
          he: 'חשבון נפש ובקשת סליחה',
          en: 'Self-review and asking forgiveness',
        },
        text: {
          he: 'החוזה ראה את עצמו כאדם פשוט. בכל ערב יום כיפור עבר על מעשי השנה כדי לבדוק אם פגע במישהו, ואם מצא שפגע, מיהר לבקש ממנו סליחה.',
          en: "The Seer considered himself a simple man. Every Yom Kippur eve he reviewed his year to see whether he had hurt anyone, and if he found that he had, he hurried to ask that person's forgiveness.",
        },
      },
      {
        title: {
          he: 'קרבה לכל אדם',
          en: 'Close to every person',
        },
        text: {
          he: 'החוזה קירב אליו גם למדנים צעירים וגם אנשים פשוטים, והדגיש שהצדיק אחראי לעזור לחסידיו גם בצורכי היום-יום. בזכות זה נמשכו אליו אלפים, והוא מלמד שמנהיגות רוחנית פירושה דאגה לאדם כולו.',
          en: 'The Seer drew close both young scholars and ordinary people, stressing that a tzaddik must help his followers in everyday needs too. Thousands came to him; spiritual leadership means caring for the whole person.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'דברי אמת',
          en: 'Divrei Emet',
        },
        about: {
          he: 'ספר תורות חסידיות על התורה.',
          en: 'A book of Hasidic teachings on the Torah.',
        },
      },
      {
        title: {
          he: 'זאת זכרון',
          en: 'Zot Zikaron',
        },
        about: {
          he: 'ספר חידושי תורה ותורות חסידיות.',
          en: 'A book of Torah insights and Hasidic teachings.',
        },
      },
      {
        title: {
          he: 'זכרון זאת',
          en: 'Zikaron Zot',
        },
        about: {
          he: 'חידושי תורה ורזי תורה, כלשון שער הספר.',
          en: 'Torah insights and mystical teachings, as its title page describes.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'שקרן איני',
          en: 'I am no liar',
        },
        text: {
          he: 'לפי סיפור המובא במקורות חסידיים, רבי עזריאל הורוביץ, רבה של לובלין, הציע לחוזה להכריז בשולחן השבת שהוא אדם פשוט, כדי שהחסידים יתפזרו. החוזה הכריז כך, אך ענוותו רק משכה אליו קהל רב יותר. כשהוצע לו להכריז להפך, שהוא גדול בתורה, סירב ואמר שאת זה לא יוכל לומר, כי שקרן אינו.',
          en: 'According to a story told in Hasidic sources, Rabbi Azriel Horowitz, the rabbi of Lublin, suggested that the Seer announce at his Shabbat table that he was a simple man, so his followers would leave. The Seer did so, but his humility only drew larger crowds. When it was suggested that he announce the opposite, that he was a great scholar, he refused, saying he was no liar.',
        },
        source:
          'Jewish Press, The Chozeh of Lublin (https://jewishpress.com/the-chozeh-of-lublin/); Levi Cooper, The Tisch: Crossing Swords With an Iron Head, Pardes Elmad (https://elmad.pardes.org/2011/05/the-tisch-crossing-swords-with-an-iron-head/)',
      },
    ],
    grave: {
      place: {
        he: 'האוהל בבית הקברות היהודי הישן בלובלין, פולין',
        en: 'Ohel in the Old Jewish Cemetery, Lublin, Poland',
      },
      lat: 51.2529479,
      lng: 22.5795081,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Yaakov_Yitzchak_of_Lublin',
      'https://he.wikipedia.org/wiki/יעקב_יצחק_הורוביץ',
      'https://breslev.com/259148',
      'https://jewishpress.com/the-chozeh-of-lublin/',
      'https://elmad.pardes.org/2011/05/the-tisch-crossing-swords-with-an-iron-head/',
      'https://www.nli.org.il/en/books/NNL_ALEPH001879904/NLI',
      'https://www.esjf-cemeteries.org/survey/lublin-old-jewish-cemetery/',
    ],
  },
  chaim_of_volozhin: {
    bio: {
      he: 'רבי חיים מוולוז׳ין נולד בוולוז׳ין בשנת ה׳תק״ט (1749). למד אצל בעל ״שאגת אריה״, ובגיל 25 נעשה לתלמידו המובהק של הגאון מווילנא. כיהן כרב העיר, ובשנת 1803 ייסד בה את ישיבת ״עץ חיים״, ״אם הישיבות״, שפעלה כמעט תשעים שנה והייתה לדגם לישיבות הליטאיות. חיבר את ״נפש החיים״. נפטר בי״ד בסיוון ה׳תקפ״א (1821) ונקבר בבית הקברות היהודי בעירו.',
      en: 'Rabbi Chaim of Volozhin was born in Volozhin in 1749. He studied with the author of Shaagat Aryeh, and at 25 became a leading disciple of the Vilna Gaon. He served as the town\'s rabbi, and in 1803 founded there the Etz Chaim yeshiva, the "mother of yeshivas", which ran for almost ninety years and became the model for Lithuanian yeshivas. He wrote Nefesh HaChaim. He died on 14 Sivan 5581 (1821) and is buried in his town\'s Jewish cemetery.',
    },
    lessons: [
      {
        title: {
          he: 'התורה מקיימת את העולם',
          en: 'Torah sustains the world',
        },
        text: {
          he: 'בשער הרביעי של ״נפש החיים״ הסביר שלימוד התורה הוא המעלה העליונה בעבודת ה׳, ושהעולם כולו מתקיים בזכותו. לכן כל שעת לימוד, גם קצרה, היא זכות גדולה שאין לוותר עליה.',
          en: 'In Nefesh HaChaim he explained that Torah study is the highest way of serving God and that the whole world is sustained by it. Every hour of study, even a short one, is a great privilege.',
        },
      },
      {
        title: {
          he: 'לא לעצמו נברא האדם',
          en: 'Not created for oneself',
        },
        text: {
          he: 'בנו רבי יצחק העיד שאביו היה מוכיח אותו כשלא השתתף בצער הזולת, ואומר לו תמיד: ״זה כל האדם, לא לעצמו נברא, רק להועיל לאחריני ככל אשר ימצא בכחו לעשות״.',
          en: "His son Rabbi Yitzchak recalled that his father rebuked him for not sharing others' pain, always saying: this is the whole of man; he was not created for himself, but to help others as much as he can.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'נפש החיים',
          en: 'Nefesh HaChaim',
        },
        about: {
          he: 'חיבורו העיקרי, על כוח מעשי האדם, על התפילה ועל מעלת לימוד התורה; נדפס אחרי פטירתו.',
          en: 'His main work, on the power of human deeds, prayer and the value of Torah study; printed posthumously.',
        },
      },
      {
        title: {
          he: 'רוח חיים',
          en: 'Ruach Chaim',
        },
        about: {
          he: 'פירוש על מסכת אבות, שנדפס אחרי פטירתו.',
          en: 'A commentary on Pirkei Avot, printed after his death.',
        },
      },
      {
        title: {
          he: 'חוט המשולש',
          en: 'Chut HaMeshulash',
        },
        about: {
          he: 'קובץ שאלות ותשובות שנדפס בשנת 1882, ובראשו תשובותיו שנותרו; רבות מהן אבדו בשרפה.',
          en: 'A responsa collection printed in 1882, opening with his surviving responsa; many others were lost in a fire.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'ייסוד ״אם הישיבות״',
          en: 'Founding the "mother of yeshivas"',
        },
        text: {
          he: 'בשנת 1803 פתח רבי חיים ישיבה בוולוז׳ין עם עשרה תלמידים בלבד, ופרנס אותם מכיסו. לפי המסופר, אשתו מכרה את תכשיטיה כדי לסייע בכלכלתם. כשהישיבה גדלה פנה לקהילות ישראל שיתמכו בה. ממנה צמחה דרך הלימוד בישיבות ליטא, והיא נודעה כ״אם הישיבות״.',
          en: 'In 1803 Rabbi Chaim opened a yeshiva in Volozhin with only ten students, supporting them at his own expense. It is related that his wife sold her jewelry to help maintain them. As the yeshiva grew, he appealed to Jewish communities to support it. The Lithuanian yeshiva way of learning grew from it, and it became known as the "mother of yeshivas".',
        },
        source:
          'Jewish Encyclopedia, Hayyim ben Isaac of Volozhin (https://www.jewishencyclopedia.com/articles/7375-hayyim-ben-isaac-of-volozhin-hayyim-volozhiner); Wikipedia, Chaim of Volozhin (https://en.wikipedia.org/wiki/Chaim_of_Volozhin)',
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות היהודי בוולוז׳ין, בלארוס; אנדרטה משנת 1991 עומדת במקום קבורתו',
        en: 'Jewish cemetery of Volozhin (Valozhyn), Belarus; a memorial raised in 1991 stands at his burial site',
      },
      lat: 54.0935766,
      lng: 26.5302691,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Chaim_of_Volozhin',
      'https://www.jewishencyclopedia.com/articles/7375-hayyim-ben-isaac-of-volozhin-hayyim-volozhiner',
      "https://www.sefaria.org/Nefesh_HaChayim,_An_Introduction_by_the_Author's_Son",
      'https://he.wikipedia.org/wiki/חיים_מוולוז%27ין',
      'https://www.jewishgen.org/Yizkor/volozhin/vol913.html',
      'https://cdp.jewishgen.org/eastern-europe/belarus/valozhyn',
    ],
  },
  akiva_eiger: {
    bio: {
      he: 'רבי עקיבא איגר נולד באייזנשטט בשנת ה׳תקכ״ב (1761). כיהן כרב במרקיש פרידלנד כעשרים וארבע שנים, ומשנת 1815 ועד פטירתו כרבה של פוזנן. נחשב לאחד מגדולי התלמוד והפוסקים בדורו, ונודע בענוותו ובדאגתו לציבור. בשנת 1831 הנהיג את קהילתו במגפת החולירע וקיבל מכתב תודה ממלך פרוסיה. חתנו היה החתם סופר. נפטר בי״ג בתשרי ה׳תקצ״ח (1837) ונקבר בפוזנן.',
      en: "Rabbi Akiva Eiger was born in Eisenstadt in 1761. He was rabbi of Märkisch Friedland for 24 years and of Posen (Poznań) from 1815 until his death. Among the greatest Talmudists and halachic authorities of his time, he was known for humility and care for the public, leading his community through the 1831 cholera epidemic and earning the King of Prussia's thanks. The Chatam Sofer was his son-in-law. He died on 13 Tishrei 5598 (1837) and is buried in Poznań.",
    },
    lessons: [
      {
        title: {
          he: 'ענווה אמיתית',
          en: 'True humility',
        },
        text: {
          he: 'רבי עקיבא איגר סלד מתארי כבוד ולא העתיק אותם בתשובותיו המודפסות. הוא ביקש שיספידו אותו רק ליד הקבר, ושעל מצבתו יכתבו עליו רק ״עבד לעבדי ה׳״.',
          en: 'Rabbi Akiva Eiger disliked honorific titles and would not reproduce them in his printed responsa. He asked to be eulogized only at the graveside, and that his tombstone call him simply "a servant of God\'s servants".',
        },
      },
      {
        title: {
          he: 'שמירה על כבוד הזולת',
          en: "Guarding others' dignity",
        },
        text: {
          he: 'לפי המסורת, כשאורח שפך יין על המפה בליל הסדר, הזיז רבי עקיבא איגר את השולחן כך שגם כוסו נשפכה, כדי שהאורח לא יתבייש. כבודו של אדם אחר חשוב יותר ממפה נקייה.',
          en: "According to tradition, when a guest spilled wine on the tablecloth at the Seder, Rabbi Akiva Eiger jolted the table so his own cup spilled too, sparing the guest embarrassment. Another person's dignity matters more than a clean tablecloth.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'שו״ת רבי עקיבא איגר',
          en: 'Responsa of Rabbi Akiva Eiger',
        },
        about: {
          he: 'שאלות ותשובות בהלכה; נדפסו לראשונה בוורשה בשנת 1835.',
          en: 'Halachic responsa, first printed in Warsaw in 1835.',
        },
      },
      {
        title: {
          he: 'גליון הש״ס',
          en: 'Gilyon HaShas',
        },
        about: {
          he: 'הערות קצרות על התלמוד, המודפסות בשולי הדף במהדורות הש״ס המקובלות.',
          en: 'Brief notes on the Talmud, printed in the margins of standard Talmud editions.',
        },
      },
      {
        title: {
          he: 'הגהות רבי עקיבא איגר על השולחן ערוך',
          en: 'Glosses of Rabbi Akiva Eiger on the Shulchan Aruch',
        },
        about: {
          he: 'הערות ומקורות על השולחן ערוך, המודפסות בשולי הדף.',
          en: 'Notes and references on the Shulchan Aruch, printed in its margins.',
        },
      },
      {
        title: {
          he: 'דרוש וחידוש',
          en: 'Derush VeChiddush',
        },
        about: {
          he: 'חידושים על התלמוד, שהוציאו בניו לאור בשנת 1839.',
          en: 'Talmudic novellae, published by his sons in 1839.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'במגפת החולירע',
          en: 'During the cholera epidemic',
        },
        text: {
          he: 'כשפרצה מגפת החולירע בפוזנן בשנת 1831, הקים רבי עקיבא איגר ועדה לשמירה על ניקיון והורה להרתיח את מי השתייה. כדי למנוע צפיפות הגביל בהגרלה את מספר המתפללים בימים הנוראים, קיצר את התפילות והתיר להתפלל ביחידות. על פעולתו קיבל מכתב הוקרה ממלך פרוסיה, פרידריך וילהלם השלישי.',
          en: 'When cholera broke out in Posen in 1831, Rabbi Akiva Eiger set up a hygiene committee and urged boiling drinking water. To prevent crowding, he limited High Holiday attendance by lottery, shortened the prayers and allowed praying without a minyan. For his efforts he received a letter of thanks from King Frederick William III of Prussia.',
        },
        source:
          'Wikipedia, Akiva Eiger (https://en.wikipedia.org/wiki/Akiva_Eger); Jewish Review of Books, Rov in a Time of Cholera (https://jewishreviewofbooks.com/articles/6892/rov-in-a-time-of-cholera/)',
      },
    ],
    grave: {
      place: {
        he: 'מצבה חדשה במקום המשוער של קברו, בחלקת בית הקברות היהודי ששוחזרה ברחוב גלוגובסקה, פוזנן, פולין; ביקור בתיאום מראש',
        en: 'New stone at the presumed site of his grave, in the restored Jewish cemetery plot, Głogowska Street 26A, Poznań, Poland; visits by prior arrangement',
      },
      lat: 52.4000673,
      lng: 16.9050051,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Akiva_Eger',
      'https://www.jewishencyclopedia.com/articles/5447-eger',
      'https://jewishreviewofbooks.com/articles/6892/rov-in-a-time-of-cholera/',
      'https://outorah.org/p/217069',
      'https://cdp.jewishgen.org/eastern-europe/poland/poznan',
      'https://www.inyourpocket.com/poznan/akiva-eger-memorial-former-jewish-cemetery_148817v',
    ],
  },
  chatam_sofer: {
    bio: {
      he: 'רבי משה סופר, ״החתם סופר״, נולד בפרנקפורט בשנת ה׳תקכ״ג (1762) ולמד אצל רבי נתן אדלר. כיהן כרב בדרזניץ ובמטרסדורף, ומשנת 1806 ועד פטירתו כרבה של פרשבורג (ברטיסלבה). שם עמד בראש ישיבה שלמדו בה מאות תלמידים, והשפיע רבות על יהדות הונגריה ומרכז אירופה. תשובותיו ההלכתיות נדפסו בשם ״חתם סופר״. נפטר בכ״ה בתשרי ה׳ת״ר (1839) ונקבר בפרשבורג.',
      en: 'Rabbi Moshe Sofer, the Chatam Sofer, was born in Frankfurt in 1762 and studied with Rabbi Nathan Adler. He served as rabbi of Dresnitz and Mattersdorf, and from 1806 until his death as rabbi of Pressburg (Bratislava). There he headed a yeshiva of hundreds of students and deeply shaped the Jewry of Hungary and Central Europe. His halachic responsa were printed under the title Chatam Sofer. He died on 25 Tishrei 5600 (1839) and is buried in Pressburg.',
    },
    lessons: [
      {
        title: {
          he: 'אחריות לקהילה',
          en: 'Responsibility for the community',
        },
        text: {
          he: 'אחרי שצבא נפוליאון הפגיז וכבש את פרשבורג בשנת 1809, עמד החתם סופר בראש מאמצי הסיוע והשיקום של הקהילה. מנהיג רוחני נדרש לדאוג גם לצרכים המעשיים של בני קהילתו.',
          en: "After Napoleon's army bombarded and took Pressburg in 1809, the Chatam Sofer led his community's relief and rebuilding. A spiritual leader must also care for the practical needs of his people.",
        },
      },
      {
        title: {
          he: 'אהבת ארץ ישראל',
          en: 'Loving the Land of Israel',
        },
        text: {
          he: 'בחידושיו למסכת סוכה כתב שעבודת האדמה בארץ ישראל היא עצמה מצווה, משום יישוב הארץ, ודימה זאת להנחת תפילין. הקשר לארץ אינו רק געגוע בתפילה, אלא גם בנייה ממשית שלה.',
          en: 'In his novellae on Sukkah he wrote that working the soil of the Land of Israel is itself a mitzvah, part of settling the Land, like putting on tefillin. The bond with the Land means building it, not only longing.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'שו״ת חתם סופר',
          en: 'Responsa Chatam Sofer',
        },
        about: {
          he: 'יותר מאלף תשובות הלכתיות, שנדפסו בכמה כרכים אחרי פטירתו.',
          en: 'Over a thousand halachic responsa, printed in several volumes after his death.',
        },
      },
      {
        title: {
          he: 'תורת משה',
          en: 'Torat Moshe',
        },
        about: {
          he: 'דרשות ופירושים על התורה.',
          en: 'Sermons and commentary on the Torah.',
        },
      },
      {
        title: {
          he: 'חידושי חתם סופר',
          en: 'Chiddushei Chatam Sofer',
        },
        about: {
          he: 'חידושים על מסכתות התלמוד.',
          en: 'Novellae on tractates of the Talmud.',
        },
      },
      {
        title: {
          he: 'ספר הזכרון',
          en: 'Sefer HaZikaron',
        },
        about: {
          he: 'זיכרונותיו ממצור נפוליאון על פרשבורג בשנת 1809 ומהצלת הקהילה.',
          en: "His memoir of Napoleon's 1809 siege of Pressburg and the community's survival.",
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'המצור על פרשבורג',
          en: 'The siege of Pressburg',
        },
        text: {
          he: 'בשנת 1809 הפגיז צבא נפוליאון את פרשבורג וכבש אותה, והקהילה היהודית סבלה קשות. החתם סופר הנהיג את הסיוע לנפגעים ואת שיקום הקהילה אחרי המלחמה. את קורות הימים ההם ואת הצלת הקהילה תיעד בחיבור שנדפס בשם ״ספר הזכרון״.',
          en: "In 1809 Napoleon's army bombarded and captured Pressburg, and the Jewish community suffered badly. The Chatam Sofer led relief for the victims and the community's rebuilding after the war. He recorded those days and the community's survival in a work printed as Sefer HaZikaron.",
        },
        source:
          'Jewish Virtual Library, Rabbi Moshe Sofer (https://www.jewishvirtuallibrary.org/rabbi-moshe-sofer-chasam-sofer); NJOP, Rabbi of Pressburg (https://njop.org/rabbi-of-pressburg/)',
      },
      {
        title: {
          he: 'הקבר שניצל',
          en: 'The grave that was saved',
        },
        text: {
          he: 'בשנים 1942–1943 הרסו שלטונות סלובקיה את בית הקברות היהודי הישן בברטיסלבה כדי לסלול כביש. כעשרים ושלושה קברים סביב קברו של החתם סופר נשארו במקומם, ונעטפו בבטון מתחת לכביש. בשנת 2002 נחנך במקום מבנה זיכרון, והביקור בו מתואם דרך הקהילה היהודית בעיר.',
          en: "In 1942–1943 the Slovak authorities demolished Bratislava's old Jewish cemetery to build a road. About 23 graves around the Chatam Sofer's tomb were left in place and encased in concrete beneath the roadway. In 2002 a memorial opened on the site, and visits are arranged through the city's Jewish community.",
        },
        source:
          'Wikipedia, Chatam Sofer Memorial (https://en.wikipedia.org/wiki/Chatam_Sofer_Memorial); The Slovak Spectator (https://spectator.sme.sk/politics-and-society/c/chatam-sofer-jewish-scholar-died-175-years-ago)',
      },
    ],
    grave: {
      place: {
        he: 'מבנה הזיכרון לחתם סופר, ברטיסלבה, סלובקיה; ביקור בתיאום עם הקהילה היהודית',
        en: 'Chatam Sofer Memorial, Bratislava, Slovakia; visits arranged through the Jewish community',
      },
      lat: 48.1418868,
      lng: 17.091874,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Moses_Sofer',
      'https://www.jewishvirtuallibrary.org/rabbi-moshe-sofer-chasam-sofer',
      'https://njop.org/rabbi-of-pressburg/',
      'https://en.wikipedia.org/wiki/Chatam_Sofer_Memorial',
      'https://www.sefaria.org/Chidushei_Chatam_Sofer_on_Sukkah.36a',
      'https://spectator.sme.sk/politics-and-society/c/chatam-sofer-jewish-scholar-died-175-years-ago',
    ],
  },
  bnei_yissaschar: {
    bio: {
      he: 'רבי צבי אלימלך שפירא מדינוב נולד ביאבורניק שבגליציה, ונקרא על שם קרוב משפחתו, רבי אלימלך מליז׳נסק. היה מתלמידי החוזה מלובלין, רבי מנחם מנדל מרימנוב והמגיד מקוז׳ניץ. כיהן ברבנות בכמה קהילות, ובהן סטריז׳וב ומונקאץ׳, ועיקר מושבו היה בדינוב. נודע כמקובל וכמחבר פורה, ובעיקר בזכות ספרו בני יששכר. נפטר בדינוב בי״ח בטבת ה׳תר״א.',
      en: 'Rabbi Tzvi Elimelech Spira of Dinov was born in Jawornik, Galicia, and named after his relative, Rabbi Elimelech of Lizhensk. A disciple of the Seer of Lublin, Rabbi Menachem Mendel of Rimanov and the Maggid of Kozhnitz, he served as rabbi of several towns, among them Strzyżów and Munkács, but his seat was Dinov. A kabbalist and prolific author, he is best known for his book Bnei Yissaschar. He died in Dinov on 18 Tevet 5601 (1841).',
    },
    lessons: [
      {
        title: {
          he: 'אוהב נאמן לכל ישראל',
          en: 'A faithful lover of every Jew',
        },
        text: {
          he: 'במכתביו נהג לחתום ״האוהב הנאמן לכל ישראל, דורש טוב לעמו״. גדול בתורה ובקבלה ראה את עצמו קודם כול כמי שדואג לטובתו של כל יהודי.',
          en: "He used to sign his letters 'the faithful lover of all Israel, seeking good for his people.' A master of Torah and Kabbalah saw himself first of all as one who cares for the good of every Jew.",
        },
      },
      {
        title: {
          he: 'לכל זמן אור משלו',
          en: 'Every season has its light',
        },
        text: {
          he: 'בספרו בני יששכר, הערוך לפי חודשי השנה, ביאר את פנימיותם של השבתות והמועדים. ממנו לומדים שכל חודש וכל חג מביאים עמם הזדמנות מיוחדת לעבודת ה׳.',
          en: 'In Bnei Yissaschar, arranged by the months of the year, he explained the inner meaning of Shabbat and the festivals. Every month and every holiday brings its own opportunity to serve God.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'בני יששכר',
          en: 'Bnei Yissaschar',
        },
        about: {
          he: 'מאמרים על השבתות והמועדים לפי חודשי השנה, מספרי היסוד של החסידות.',
          en: 'Discourses on Shabbat and the festivals, arranged by the months of the year; a classic of Chassidic literature.',
        },
      },
      {
        title: {
          he: 'דרך פקודיך',
          en: 'Derech Pikudecha',
        },
        about: {
          he: 'חיבור על מצוות התורה.',
          en: 'A work on the commandments of the Torah.',
        },
      },
      {
        title: {
          he: 'אגרא דכלה',
          en: 'Agra DeKallah',
        },
        about: {
          he: 'פירוש על התורה.',
          en: 'A commentary on the Torah.',
        },
      },
      {
        title: {
          he: 'אגרא דפרקא',
          en: 'Agra DePirka',
        },
        about: {
          he: 'אמרות וסגולות בנושאים שונים.',
          en: 'Sayings and segulot on a range of subjects.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'ארבעים ושלושה רובל',
          en: 'Forty-three rubles',
        },
        text: {
          he: 'מסופר שכשהיה בן עשר, שילם אביו, מלמד עני, על לינתם של שלושה איכרים קפואים שבעל האכסניה סירב לארח. בערב פסח קיזז בעל האכסניה את שכרו, והאב נותר חייב ובלי פרוטה לחג. בדרך הביתה נפל מכרכרה חולפת צרור בלי סימן, ובו בדיוק ארבעים ושלושה רובל. בליל הסדר פתח הנער את הדלת לאליהו וקרא: ״אבא, העגלון כאן!״ לפי המסופר, גילה זאת רק ביום מותו.',
          en: "It is told that when he was ten, his father, a poor teacher, paid to lodge three frozen peasants an innkeeper had turned away. Before Pesach the innkeeper set the cost against his wages, leaving him with nothing for the holiday. On the way home a passing coach dropped an unmarked bag holding exactly forty-three rubles. At the Seder the boy opened the door for Elijah and cried: 'Father, the coachman is here!' He told it only when dying.",
        },
        source:
          'Rabbi Hershel Finman, Forty Three Rubles, Chabad.org (https://www.chabad.org/library/article_cdo/aid/3005/jewish/Forty-Three-Rubles.htm)',
      },
      {
        title: {
          he: 'שמו של הספר',
          en: 'The name of the book',
        },
        text: {
          he: 'לפי המסורת, אמר לו רבו החוזה מלובלין ששורשו בשבט יששכר, שעליו נאמר ״יודעי בינה לעתים״, כלומר בקיאים בחשבון זמני השנה. משום כך קרא לספרו על חודשי השנה ומועדיה בשם בני יששכר, ובשם זה הוא נקרא עד היום.',
          en: "According to tradition, his teacher the Seer of Lublin told him that he descended from the tribe of Yissaschar, of whom it is said that they 'had understanding of the times,' expert in the reckoning of the calendar. He therefore named his book on the months and festivals Bnei Yissaschar, the name he is known by to this day.",
        },
        source:
          'he.wikipedia, צבי אלימלך שפירא (https://he.wikipedia.org/wiki/צבי_אלימלך_שפירא_מדינוב); Chabad.org biographical note (https://www.chabad.org/library/article_cdo/aid/3005/jewish/Forty-Three-Rubles.htm)',
      },
    ],
    grave: {
      place: {
        he: 'אוהל צדיקי דינוב בבית העלמין היהודי הישן ברחוב פילסודסקי, דינוב, פולין',
        en: 'Ohel of the Dinov tzaddikim in the old Jewish cemetery on Piłsudskiego Street, Dynów, Poland',
      },
      lat: 49.8089,
      lng: 22.2345,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://he.wikipedia.org/wiki/צבי_אלימלך_שפירא_מדינוב',
      'https://en.wikipedia.org/wiki/Tzvi_Elimelech_Spira_of_Dinov',
      'https://www.kikar.co.il/scoop-news/33324',
      'https://www.chabad.org/library/article_cdo/aid/3005/jewish/Forty-Three-Rubles.htm',
      'https://jewishgen.org/yizkor/dynow/dyn004.html',
      'https://www.esjf-cemeteries.org/survey/dynow-old-jewish-cemetery/',
      'https://cdp.jewishgen.org/eastern-europe/poland/dynow',
      'https://www.openstreetmap.org/way/319097325',
    ],
  },
  yismach_moshe: {
    bio: {
      he: 'רבי משה טייטלבוים, הישמח משה, נולד בפשמישל שבגליציה בשנת ה׳תקי״ט. בצעירותו התנגד לחסידות, אך התקרב אליה דרך חתנו ונעשה תלמידו של החוזה מלובלין. כיהן כרב בשיניאווא, ובשנת ה׳תקס״ח נתמנה לרבה של אוהל, היא שאטוראליאויהיי שבהונגריה, ושם הנהיג קהילה חסידית יותר משלושים שנה. נחשב לאבי שושלות החסידות בהונגריה, ומצאצאיו באו שושלות סיגט וסאטמר. נפטר בכ״ח בתמוז תר״א.',
      en: "Rabbi Moshe Teitelbaum, the Yismach Moshe, was born in Przemysl, Galicia, in 1759. At first he opposed Chassidism, but his son-in-law drew him to it and he became a disciple of the Chozeh of Lublin. He served as rabbi of Sieniawa, and in 1808 became rabbi of Ujhely (Satoraljaujhely), Hungary, leading a Chassidic community there over thirty years. He is seen as the patriarch of Hungary's Chassidic dynasties, Sighet and Satmar among them. He died on 28 Tammuz 5601 (1841).",
    },
    lessons: [
      {
        title: {
          he: 'פתוח לאמת',
          en: 'Open to the truth',
        },
        text: {
          he: 'בתחילה התנגד לחסידות, אך כשהכיר את החוזה מלובלין נעשה לחסיד ולאחד ממפיציה הגדולים בהונגריה. אדם גדול יודע לשנות את דעתו כשהוא פוגש אמת.',
          en: 'At first he opposed Chassidism, but once he came to know the Chozeh of Lublin he became a Chassid and one of its great spreaders in Hungary. A great person can change his mind when he meets the truth.',
        },
      },
      {
        title: {
          he: 'על אותו דף',
          en: 'On the same page',
        },
        text: {
          he: 'חלק גדול מפירושו לתהלים, ״תפילה למשה״, כתב על גבי הפתקאות שהביאו אליו הפונים. בקשות האנשים ולימוד התורה שלו היו מונחים זה לצד זה, על אותו דף.',
          en: 'He wrote much of his Psalms commentary, Tefillah LeMoshe, on the backs of the petition notes people brought him. Their requests and his Torah lay side by side, on the same page.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'ישמח משה',
          en: 'Yismach Moshe',
        },
        about: {
          he: 'דרשות על התורה ועל הנביאים, שעל שמו הוא מכונה.',
          en: 'Homilies on the Torah and the Prophets, after which he is called.',
        },
      },
      {
        title: {
          he: 'השיב משה',
          en: 'Hashiv Moshe',
        },
        about: {
          he: 'שאלות ותשובות בהלכה.',
          en: 'Responsa on Jewish law.',
        },
      },
      {
        title: {
          he: 'תפילה למשה',
          en: 'Tefillah LeMoshe',
        },
        about: {
          he: 'פירוש על ספר תהלים, שנדפס לראשונה בקרקוב בשנת 1880.',
          en: 'A commentary on Psalms, first printed in Krakow in 1880.',
        },
      },
      {
        title: {
          he: 'יין הרקח',
          en: 'Yayin HaRokeach',
        },
        about: {
          he: 'על פרקי אבות ועל אגדות וסוגיות בתלמוד.',
          en: 'On Pirkei Avot and on aggadot and passages of the Talmud.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'הבגדים ליד המיטה',
          en: 'Clothes by the bed',
        },
        text: {
          he: 'מסופר שבכל שעה ציפה לביאת המשיח. ליד מיטתו הניח את בגדי החג ואת מקלו, כדי לצאת בלי שהות, וכשנשמע רעש מבחוץ שלח לבדוק אם הגיע מבשר לעיר. לפי המסופר, בשנותיו האחרונות לבש בגדי שבת גם בימי החול.',
          en: 'It is told that he awaited the Messiah every hour. He kept his festive clothes and walking stick beside his bed so he could go out without delay, and at any noise outside he sent someone to see whether a herald had come to the town. In his last years, it is said, he wore Shabbat clothes on weekdays too.',
        },
        source:
          'Sefer HaHasidut (Tel Aviv, 1961), freely translated at Jewish Renewal Hasidus, Anticipating the Messianic Age (https://www.jewishrenewalhasidus.org/anticipating-the-messianic-age/); Wikipedia, Moshe Teitelbaum (Ujhel) (https://en.wikipedia.org/wiki/Moshe_Teitelbaum_(Ujhel))',
      },
      {
        title: {
          he: 'בית בארץ אחרת',
          en: 'A house in another land',
        },
        text: {
          he: 'תלמידיו הפצירו בו לקנות בית נאה ליד בית המדרש, כי גר בבית צר. הוא סירב ושאל: למה לקנות בית בארץ אחרת, כשבקרוב יבוא משיח צדקנו ואשוב לנחלת אבותי בהר הקודש?',
          en: 'His students urged him to buy a fine house near the study hall, since his home was cramped. He refused, asking why he should buy a house in a foreign land when the Messiah would soon come and he would return to his ancestral inheritance on the holy mountain.',
        },
        source:
          'Sefer HaHasidut (Tel Aviv, 1961), freely translated at Jewish Renewal Hasidus, Anticipating the Messianic Age (https://www.jewishrenewalhasidus.org/anticipating-the-messianic-age/)',
      },
    ],
    grave: {
      place: {
        he: 'אוהל הישמח משה, בית העלמין היהודי העתיק, שאטוראליאויהיי, הונגריה; נדרש רישום מראש לביקור',
        en: 'Ohel of the Yismach Moshe, old Jewish cemetery, Satoraljaujhely, Hungary; visits need advance registration',
      },
      lat: 48.3891,
      lng: 21.6551,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://he.wikipedia.org/wiki/משה_טייטלבוים_(ישמח_משה)',
      'https://en.wikipedia.org/wiki/Moshe_Teitelbaum_(Ujhel)',
      'https://www.chabad.org/calendar/view/day.asp?aid=297583',
      'https://www.kikar.co.il/hasidism/205453',
      'https://www.jewishrenewalhasidus.org/anticipating-the-messianic-age/',
      'https://ujhelyizsidosag.hu/?p=3480',
      'https://www.openstreetmap.org/node/4924834442',
      'https://commons.wikimedia.org/wiki/File:Alte_jüdische_Friedhof,_Gebäude_und_Grab,_2021_Sátoraljaújhely.jpg',
    ],
  },
  chaim_pinto: {
    bio: {
      he: 'רבי חיים פינטו ״הגדול״ היה מגדולי רבני מרוקו, דיין ומקובל בעיר מוגדור (אסואירה). נולד באגדיר למשפחת רבנים מצאצאי רבי יאשיהו פינטו, התייתם מאביו בילדותו ועבר למוגדור. שם למד בישיבת רבי יעקב ביבאס, ובשנת ה׳תקכ״ט (1769), צעיר מאוד, מונה לממלא מקומו כדיין יחד עם רבי דוד חזן. עמד בראש בית הדין והישיבה בעירו יותר משבעים שנה. נפטר בכ״ו באלול ה׳תר״ה (1845).',
      en: 'Rabbi Chaim Pinto "HaGadol" was a great Moroccan rabbi, dayan and kabbalist in Mogador (Essaouira). Born in Agadir to a rabbinic family descended from Rabbi Yoshiyahu Pinto, he lost his father as a boy and moved to Mogador, studying under Rabbi Yaakov Bibas. In 5529 (1769), still very young, he succeeded him as dayan with Rabbi David Hazan, leading the town\'s court and yeshiva for over seventy years. He died on 26 Elul 5605 (1845).',
    },
    lessons: [
      {
        title: {
          he: 'קימה בלילה לתפילה ולימוד',
          en: 'Night prayer and study',
        },
        text: {
          he: 'רבי חיים פינטו נהג לקום בכל לילה להתפלל ולבקש על צרכיו ועל צורכי עמו, ואחר כך ללמוד תורה עד אור הבוקר. בחג השבועות למד שני לילות רצופים. מסירותו מלמדת שהלילה יכול להיות זמן של קרבה מיוחדת.',
          en: 'Rabbi Chaim Pinto rose every night to pray for himself and his people, then studied Torah until dawn; on Shavuot he learned through both nights. His devotion shows that the night can be a time of special closeness.',
        },
      },
      {
        title: {
          he: 'תקיפות בדין ולב לעניים',
          en: 'Firm justice, caring heart',
        },
        text: {
          he: 'בבית הדין נהג בתקיפות ולא הניח לאיש לנהוג שלא כשורה, ובשל כך כינוהו ״אביר לב״. עם זאת היה קשוב לצורכי עדתו ודאג לעניי עירו. עמידה על האמת ורגישות לזולת יכולות לדור יחד.',
          en: 'In court he was firm and let no one act improperly, earning the name "Abir Lev" (stout-hearted), yet he heeded his community\'s needs and cared for the poor. Firmness for truth and sensitivity can go together.',
        },
      },
    ],
    biblical: false,
    works: [],
    stories: [
      {
        title: {
          he: 'שתי כוסות קפה',
          en: 'Two cups of coffee',
        },
        text: {
          he: 'לפי מסורת שנשמרה במשפחת פינטו, השמש של רבי חיים, רבי אהרן בן חיים, היה מכין לו קפה בכל לילה בשעת לימודו. לילה אחד שמע מן החדר שני קולות והכין שתי כוסות. רבי חיים אמר לו שזכה לשמוע את קולו של אליהו הנביא, וציווה עליו לשמור את הדבר בסוד. רק אחרי פטירת הרב סיפר השמש את המעשה.',
          en: "According to a tradition preserved by the Pinto family, Rabbi Chaim's attendant, Rabbi Aharon ben Chaim, made him coffee each night while he studied. One night he heard two voices from the room and prepared two cups. Rabbi Chaim told him he had merited hearing the voice of Elijah the Prophet and ordered him to keep it secret. Only after the rabbi's death did the attendant tell the story.",
        },
        source:
          'Hevrat Pinto, Rabbi Haim Pinto Hagadol (https://hevratpinto.org/tzadikim_eng/001_rabbi_chaim_pinto_hagadol.html)',
      },
    ],
    grave: {
      place: {
        he: 'קברו בבית הקברות היהודי הישן באסואירה (מוגדור), מרוקו',
        en: 'Tomb in the old Jewish cemetery of Essaouira (Mogador), Morocco',
      },
      lat: 31.518177,
      lng: -9.763872,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://he.wikipedia.org/wiki/חיים_פינטו_(מרוקו)',
      'https://en.wikipedia.org/wiki/Chaim_Pinto',
      'https://en.wikipedia.org/wiki/Hiloula_of_Rabbi_Haim_Pinto',
      'https://hevratpinto.org/tzadikim_eng/001_rabbi_chaim_pinto_hagadol.html',
      'http://archive.diarna.org/site/detail/public/2306/',
      'https://en.wikipedia.org/wiki/Jewish_cemeteries,_Essaouira',
    ],
  },
  yisrael_of_ruzhin: {
    bio: {
      he: 'רבי ישראל פרידמן מרוז׳ין נולד בג׳ בתשרי ה׳תקנ״ז (1796) בפרוהוביטש, נין למגיד ממזריטש. אביו נפטר בילדותו, ובגיל שש עשרה בערך החליף את אחיו בהנהגת החסידים. ישב ברוז׳ין ונודע בחצרו המלכותית ובהשפעתו הרבה. בשנת 1838 נאסר בידי השלטון הרוסי והוחזק במאסר כשנתיים. אחרי שחרורו עבר לאוסטריה וקבע את חצרו בסדיגורה שבבוקובינה. בניו ייסדו שושלות חסידיות רבות. נפטר בג׳ בחשוון ה׳תרי״א (1850) ונקבר בסדיגורה.',
      en: 'Rabbi Yisrael Friedman of Ruzhin was born on 3 Tishrei 5557 (1796) in Pohrebyshche, a great-grandson of the Maggid of Mezritch. Fatherless from age six, he succeeded his brother as leader of the Hasidim at about sixteen and became famed in Ruzhin for his regal court. Arrested by Russian authorities in 1838 and held nearly two years, he settled in Sadigura in Austrian Bukovina. His sons founded many dynasties. He died on 3 Cheshvan 5611 (1850) and is buried there.',
    },
    lessons: [
      {
        title: {
          he: 'הדר לכבוד שמים',
          en: "Splendor for Heaven's honor",
        },
        text: {
          he: 'רבי ישראל ניהל חצר מפוארת, ולדבריו נועד ההדר להדגיש את מעלתם של ישראל כבני מלכים. לפני פטירתו אמר לתלמידו שכל הפאר נעשה רק לכבוד הקב״ה. גם כבוד חיצוני יכול לשרת מטרה רוחנית.',
          en: "Rabbi Yisrael kept a splendid court to express the dignity of Israel as children of kings. Before his death he told a disciple that all the splendor was solely for God's honor. Outward dignity can serve a spiritual purpose.",
        },
      },
      {
        title: {
          he: 'פרישות בתוך השפע',
          en: 'Restraint amid plenty',
        },
        text: {
          he: 'למרות אורח החיים המפואר, לפי עדות חסידיו הרבה בתעניות ובסיגופים, ולפני פטירתו אמר שלא נהנה מן העולם הזה אפילו כאצבע קטנה. אפשר לחיות בתוך שפע ולשמור על לב שאינו משועבד לו.',
          en: "Despite his lavish lifestyle, his Hasidim said he fasted and afflicted himself; before his death he said he had not enjoyed this world even a little finger's worth. One can live amid plenty without being enslaved to it.",
        },
      },
    ],
    biblical: false,
    works: [],
    stories: [
      {
        title: {
          he: 'מגפיים בלי סוליות',
          en: 'Boots without soles',
        },
        text: {
          he: 'לפי סיפור חסידי ידוע, רבי ישראל עמד בליל חורף בשלג לקדש את הלבנה, נעול מגפיים מפוארים של זהב. אחר כך מצאו החסידים כתמי דם על השלג במקום שעמד בו, והתברר שלמגפיים אין סוליות, כך שלמעשה עמד יחף. הסיפור מבטא את דרכו: הדר כלפי חוץ, ובפנים פשטות ומסירות.',
          en: 'According to a well-known Hasidic tale, Rabbi Yisrael once stood in the snow on a winter night to sanctify the new moon, wearing magnificent golden boots. Afterward his Hasidim found blood on the snow where he had stood: the boots had no soles, so he had in fact been barefoot. The tale expresses his way: splendor outside, simplicity and devotion within.',
        },
        source:
          'Wikipedia, Yisrael Friedman of Ruzhin (https://en.wikipedia.org/wiki/Yisrael_Friedman_of_Ruzhin); Denver Community Kollel, Torah Weekly, Vayikra (https://www.denverkollel.org/wp-content/uploads/2015/05/Vayikra.pdf)',
      },
    ],
    grave: {
      place: {
        he: 'אוהל רוז׳ין בבית הקברות היהודי בסדיגורה (צ׳רנוביץ), אוקראינה',
        en: 'Ruzhin ohel in the Jewish cemetery of Sadhora (Sadigura), Chernivtsi, Ukraine',
      },
      lat: 48.3528537,
      lng: 25.9586031,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Yisrael_Friedman_of_Ruzhin',
      'https://he.wikipedia.org/wiki/ישראל_פרידמן_(רוז%27ין)',
      'https://www.denverkollel.org/wp-content/uploads/2015/05/Vayikra.pdf',
      'https://www.esjf-cemeteries.org/survey/chernivtsi-sadhora-jewish-cemetery/',
    ],
  },
  kotzker_rebbe: {
    bio: {
      he: 'רבי מנחם מנדל מורגנשטרן, ״הרבי מקוצק״, נולד בשנת ה׳תקמ״ז (1787) בגוריי שבפולין. בצעירותו התקרב לחסידות אצל החוזה מלובלין, ואחר כך היה מתלמידי ״היהודי הקדוש״ מפשיסחה ורבי שמחה בונם מפשיסחה. משנת 1827 הנהיג את רוב חסידי פשיסחה, ומשנת 1829 ישב בקוצק. נודע בחתירתו לאמת, בחריפות אמרותיו ובדרישה לעבודה פנימית כנה. בעשרים שנותיו האחרונות מיעט לצאת מביתו. נפטר בכ״ב בשבט ה׳תרי״ט (1859) ונקבר באוהל בקוצק.',
      en: 'Rabbi Menachem Mendel Morgenstern, the Kotzker Rebbe, was born in 1787 in Goraj. Drawn to Hasidism by the Seer of Lublin, he became a disciple of the "Holy Jew" and Rabbi Simcha Bunim of Peshischa. From 1827 he led most of their followers, settling in Kock in 1829. Known for pursuing truth and demanding sincere inner work, he rarely left home in his last twenty years. He died on 22 Shevat 5619 (1859) and is buried in Kock.',
    },
    lessons: [
      {
        title: {
          he: 'אמת בלי פשרות',
          en: 'Uncompromising truth',
        },
        text: {
          he: 'בקוצק הציבו את האמת מעל הכל. לפי אמרה המיוחסת לרבי, שלום שאין בו אמת הוא שלום מזויף. הוא דרש לבחון כל מעשה, גם מעשה טוב, כדי לוודא שאין בו זיוף או גאווה.',
          en: 'In Kotzk truth stood above all. In a saying attributed to the Rebbe, peace without truth is a false peace. He demanded examining every deed, even a good one, to make sure it held no falseness or pride.',
        },
      },
      {
        title: {
          he: 'עבודה פנימית',
          en: 'Inner work',
        },
        text: {
          he: 'הרבי מקוצק לימד שהעיקר הוא תיקון המידות של האדם עצמו, ולא עיסוק בשאלות רחוקות או השוואה לאחרים. כוונות טובות אינן מספיקות; עליהן להפוך למעשים.',
          en: "The Kotzker taught that the main task is refining one's own character, not dwelling on distant questions or comparing oneself to others. Good intentions are not enough; they must become deeds.",
        },
      },
    ],
    biblical: false,
    works: [],
    stories: [
      {
        title: {
          he: 'היכן שוכן אלוקים?',
          en: 'Where does God dwell?',
        },
        text: {
          he: 'לפי סיפור שהביא מרטין בובר, שאל הרבי מקוצק כמה תלמידי חכמים שביקרו אצלו: ״היכן שוכן אלוקים?״ הם צחקו ואמרו: ״הרי מלוא כל הארץ כבודו!״ הרבי השיב על שאלתו בעצמו: אלוקים שוכן בכל מקום שמכניסים אותו.',
          en: 'According to a story told by Martin Buber, the Kotzker Rebbe asked some learned visitors, "Where does God dwell?" They laughed: "Is not the whole world full of His glory?" The Rebbe answered his own question: God dwells wherever He is let in.',
        },
        source:
          'Martin Buber, Tales of the Hasidim: The Later Masters; Wikipedia, Menachem Mendel of Kotzk (https://en.wikipedia.org/wiki/Menachem_Mendel_of_Kotzk); Aish, Gems of Wisdom of the Kotzker Rebbe (https://aish.com/gems-of-wisdom-of-the-kotzker-rebbe/)',
      },
    ],
    grave: {
      place: {
        he: 'אוהל צדיקי קוצק בבית הקברות היהודי בקוצק, פולין',
        en: 'Ohel of the Kotzk rebbes in the Jewish cemetery of Kock, Poland',
      },
      lat: 51.64355,
      lng: 22.458469,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Menachem_Mendel_of_Kotzk',
      'https://he.wikipedia.org/wiki/מנחם_מנדל_מקוצק',
      'https://aish.com/gems-of-wisdom-of-the-kotzker-rebbe/',
      'https://www.sefaria.org.il/sheets/248853',
      'https://www.esjf-cemeteries.org/survey/kock-jewish-cemetery/',
      'https://cdp.jewishgen.org/eastern-europe/poland/kock/print',
    ],
  },
  chiddushei_harim: {
    bio: {
      he: 'רבי יצחק מאיר רוטנברג-אלתר, מייסד חסידות גור ואדמו״רה הראשון. נולד במגנישוב שבפולין בשנת 1799 ונודע כעילוי בתורה. בצעירותו היה מקורב למגיד מקוז׳ניץ, ואחר כך היה לתלמידם של רבי שמחה בונים מפשיסחא ושל רבי מנחם מנדל מקוצק. לאחר פטירת הרבי מקוצק בשנת 1859 בחרו בו רוב חסידיו, והוא הנהיג אותם מהעיירה גור (גורה קלווריה). עמד בראש קופת כולל פולין, שתמכה ביהודי ארץ ישראל. נפטר בכ״ג באדר תרכ״ו.',
      en: "Rabbi Yitzchak Meir Rotenberg-Alter, founder and first Rebbe of Ger. Born in Magnuszew, Poland, in 1799, he was a prodigy, close to the Maggid of Kozhnitz and later a disciple of Rabbi Simcha Bunim of Peshischa and the Kotzker Rebbe. After the Kotzker's death in 1859 most of his followers chose him; he led them from Góra Kalwaria (Ger). He headed the Kollel Polin fund for Jews in the Holy Land. He died on 23 Adar 5626.",
    },
    lessons: [
      {
        title: {
          he: 'התורה במרכז',
          en: 'Torah at the center',
        },
        text: {
          he: 'בדרך שהתווה לחסידות גור עמדו במרכז לימוד התורה והעבודה הפנימית של האדם, ולא המנהגים החיצוניים. לפי תורתו, הלב והכוונה הפנימית הם שמניעים את המעשה הטוב.',
          en: "The path he set for Ger placed Torah study and a person's inner work at the center, rather than outward customs. In his teaching, it is the heart and inner intention that drive a good deed.",
        },
      },
      {
        title: {
          he: 'אם לא עכשיו, אימתי',
          en: 'If not now, when?',
        },
        text: {
          he: 'פירש את דברי הלל ׳ואם לא עכשיו, אימתי׳ כך: לכל רגע ורגע יש דרישה חדשה משלו. לכן כל רגע הוא הזדמנות חדשה לעבודת ה׳, שאין לדחות אותה לזמן אחר.',
          en: "He read Hillel's words 'If not now, when?' as teaching that every single moment brings a fresh demand of its own. So each moment is a new opportunity to serve God, not to be put off to another time.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'חידושי הרי״ם על הש״ס',
          en: 'Chiddushei HaRim on the Talmud',
        },
        about: {
          he: 'חידושים על מסכתות התלמוד, ובהן בבא קמא, בבא מציעא, בבא בתרא, שבועות, גיטין וכתובות.',
          en: 'Novellae on Talmud tractates, including Bava Kamma, Bava Metzia, Bava Batra, Shevuot, Gittin and Ketubot.',
        },
      },
      {
        title: {
          he: 'חידושי הרי״ם על חושן משפט',
          en: 'Chiddushei HaRim on Choshen Mishpat',
        },
        about: {
          he: 'חידושים על חלק חושן משפט בשולחן ערוך, העוסק בדיני ממונות.',
          en: 'Novellae on the Choshen Mishpat section of the Shulchan Aruch, on monetary law.',
        },
      },
      {
        title: {
          he: 'חידושי הרי״ם על התורה',
          en: 'Chiddushei HaRim on the Torah',
        },
        about: {
          he: 'דברי תורה וחסידות שלו על פרשות השבוע, שנאספו ונדפסו.',
          en: 'His Torah and Hasidic teachings on the weekly portions, collected and printed.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'רבי בעל כורחו',
          en: 'A reluctant Rebbe',
        },
        text: {
          he: 'לאחר פטירת הרבי מקוצק בשנת 1859 ביקשו רוב חסידיו שרבי יצחק מאיר יעמוד בראשם. הוא נענה, אך אמר שאינו באמת רבי, שאינו רוצה לא כסף ולא כבוד, וכל רצונו הוא לקרב את ישראל לאביהם שבשמים. מתוך ההנהגה הזו צמחה חסידות גור, שהייתה לאחת החסידויות הגדולות.',
          en: 'After the Kotzker Rebbe died in 1859, most of his Hasidim asked Rabbi Yitzchak Meir to lead them. He agreed, but said he was not truly a Rebbe, that he wanted neither money nor honor, and that his only wish was to bring the Jewish people closer to their Father in Heaven. From that leadership grew Ger, one of the largest Hasidic movements.',
        },
        source:
          'Jewish Virtual Library (from the Orthodox Union), https://www.jewishvirtuallibrary.org/rabbi-yitzchak-meir-rothenberg-alter-the-chiddushei-harim ; English Wikipedia, https://en.wikipedia.org/wiki/Yitzchak_Meir_Alter',
      },
    ],
    grave: {
      place: {
        he: 'האוהל בבית הקברות היהודי בגורה קלווריה (גור), פולין',
        en: 'The ohel in the Jewish cemetery of Góra Kalwaria (Ger), Poland',
      },
      lat: 51.98201,
      lng: 21.19179,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Yitzchak_Meir_Alter',
      'https://he.wikipedia.org/wiki/יצחק_מאיר_אלתר',
      'https://www.jewishvirtuallibrary.org/rabbi-yitzchak-meir-rothenberg-alter-the-chiddushei-harim',
      'https://breslev.com/260164/',
      'https://www.esjf-cemeteries.org/survey/gora-kalwaria-jewish-cemetery/',
    ],
  },
  tzemach_tzedek: {
    bio: {
      he: 'רבי מנחם מנדל שניאורסון (1789–1866), האדמו״ר השלישי של חסידות חב״ד. נולד בליאזנה, התייתם מאמו בגיל שלוש וגדל בבית סבו, רבי שניאור זלמן מלאדי. נשא את בת דודו, בתו של האדמו״ר האמצעי, ובשנת 1831 קיבל עליו את הנהגת החסידות בליובאוויטש. היה מגדולי הפוסקים בדורו, ונקרא על שם ספר השאלות והתשובות שלו ׳צמח צדק׳. פעל להגנה על החינוך היהודי המסורתי מול לחצי השלטון הרוסי. נפטר בליובאוויטש בי״ג בניסן תרכ״ו.',
      en: 'Rabbi Menachem Mendel Schneersohn (1789–1866), third Rebbe of Chabad. Born in Liozna, he lost his mother at three and was raised by his grandfather, Rabbi Shneur Zalman of Liadi. He married his cousin, daughter of the Mitteler Rebbe, and in 1831 assumed the leadership in Lubavitch. A leading halachic authority, he is called by the title of his responsa, Tzemach Tzedek. He defended traditional Jewish education against Russian government pressure. He died in Lubavitch on 13 Nisan 5626.',
    },
    lessons: [
      {
        title: {
          he: 'חשוב טוב ויהיה טוב',
          en: "Think good, it'll be good",
        },
        text: {
          he: 'המשפט ׳חשוב טוב ויהיה טוב׳ מיוחס לו. כפי שביארו רבני חב״ד אחריו, ביטחון בה׳ ומחשבה חיובית אינם רק תקווה, אלא כלי שמביא את הטוב בפועל.',
          en: "The saying 'Think good and it will be good' is attributed to him. As later Chabad Rebbes explained, trust in God and positive thought are not mere hope but a vessel that actually brings about good.",
        },
      },
      {
        title: {
          he: 'הלכה ופנימיות יחד',
          en: 'Law and inner depth together',
        },
        text: {
          he: 'היה גם פוסק הלכה מוסמך, שכתב תשובות בכל חלקי ההלכה, וגם הוגה חסידי פורה. בכתביו חיבר בין דיוק הלכתי לבין עומק פנימי, ולא ראה סתירה ביניהם.',
          en: 'He was both an authoritative halachic decisor, writing responsa across Jewish law, and a prolific Hasidic thinker. His writings joined halachic precision with inner depth, and he saw no contradiction between them.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'שאלות ותשובות צמח צדק',
          en: 'Tzemach Tzedek Responsa',
        },
        about: {
          he: 'תשובות בכל חלקי ההלכה, ועל שמן הוא נקרא.',
          en: 'Responsa covering all areas of Jewish law; he is known by their title.',
        },
      },
      {
        title: {
          he: 'דרך מצותיך',
          en: 'Derech Mitzvotecha',
        },
        about: {
          he: 'ביאור טעמי המצוות על פי תורת החסידות.',
          en: 'An explanation of the reasons for the commandments according to Hasidic thought.',
        },
      },
      {
        title: {
          he: 'אור התורה',
          en: 'Ohr HaTorah',
        },
        about: {
          he: 'מאמרי חסידות על פרשות התורה, על ספרי התנ״ך ועל המועדים.',
          en: 'Hasidic discourses on the Torah portions, the books of the Bible and the festivals.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'חשוב טוב ויהיה טוב',
          en: "Think good, it'll be good",
        },
        text: {
          he: 'חסיד שבנו חלה קשה בא אל הצמח צדק לבקש ברכה. הרבי השיב לו: ׳חשוב טוב ויהיה טוב׳. בדרכו הביתה התאמץ האב לחזק את ביטחונו בה׳ ולדמיין סוף טוב, וכשהגיע לביתו מצא את בנו בריא. מאז חוזרים רבני חב״ד על המשפט הזה.',
          en: "A Hasid whose son was gravely ill came to the Tzemach Tzedek for a blessing. The Rebbe replied: 'Think good and it will be good.' On the way home the father worked to strengthen his trust in God and to picture a good outcome, and when he arrived he found his son well. Chabad Rebbes have quoted the saying ever since.",
        },
        source:
          "Mendel Kalmenson, Positivity Bias, ch. 12 'Think Positive', on Chabad.org, https://www.chabad.org/therebbe/article_cdo/aid/4405212/jewish/Chapter-12-Think-Positive.htm ; L'chaim Weekly 294, https://www25.lchaimweekly.org/lchaim/5754/294.htm",
      },
      {
        title: {
          he: 'הוועידה בפטרבורג',
          en: 'The Petersburg conference',
        },
        text: {
          he: 'בשנת 1843 כינס משרד הפנים הרוסי ועידת רבנים בפטרבורג, כדי לכפות שינויים בחיי הקהילה ובחינוך היהודי. הצמח צדק הוזמן כדי שהסכמתו תעניק לתוכנית תוקף, אך סירב לשתף פעולה. לפי מסורת חב״ד נעצר במהלך הוועידה 22 פעמים, ועמידתו מנעה את השינויים שתוכננו. הוא עזב את העיר בכ״ו באב.',
          en: 'In 1843 the Russian Interior Ministry convened a rabbinical conference in St. Petersburg to impose changes on Jewish communal life and education. The Tzemach Tzedek was invited so that his consent would lend the plan legitimacy, but he refused to cooperate. According to Chabad tradition he was arrested 22 times during the conference, and his stand blocked the planned changes. He left the city on 26 Av.',
        },
        source:
          "Chabad.org, 'Today in Jewish History', 26 Av, https://www.chabad.org/article.asp?aid=302836 ; Chabad.org, '1843 Rabbinical Conference', https://www.chabad.org/library/article_cdo/aid/5999330/jewish/1843-Rabbinical-Conference.htm",
      },
    ],
    grave: {
      place: {
        he: 'האוהל בבית הקברות היהודי בליובאוויטש (ליובאוויצ׳י), מחוז סמולנסק, רוסיה',
        en: 'The ohel in the Jewish cemetery of Lubavitch (Lyubavichi), Smolensk Oblast, Russia',
      },
      lat: 54.83178,
      lng: 30.94712,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Menachem_Mendel_Schneersohn',
      'https://www.chabad.org/library/article_cdo/aid/3268073/jewish/The-Tzemach-Tzedek.htm',
      'https://www.chabad.org/therebbe/article_cdo/aid/3316129/jewish/13-Nissan.htm',
      'https://www.chabad.org/article.asp?aid=302836',
      'https://www.chabad.org/library/article_cdo/aid/5999330/jewish/1843-Rabbinical-Conference.htm',
      'https://www.chabad.org/therebbe/article_cdo/aid/4405212/jewish/Chapter-12-Think-Positive.htm',
      'https://www.chabad.org/therebbe/article_cdo/aid/3240794/jewish/Chapter-13-Think-Good.htm',
      'https://www.esjf-cemeteries.org/fenced/lyubavichi-jewish-cemetery',
    ],
  },
  divrei_chaim: {
    bio: {
      he: 'רבי חיים הלברשטאם, הדברי חיים, נולד בטרנוגרוד שבגליציה. היה מתלמידי רבי נפתלי צבי מרופשיץ, וכיהן ברבנות ברודניק ואחר כך בצאנז, נובי סונץ׳ של היום, עד יום מותו. בצאנז נהג באדמו״רות ויסד את חסידות צאנז, שממנה יצאו חצרות רבות. נודע כגאון בהלכה, בהתלהבות בתפילה ובצדקה עצומה לעניים. נפטר בכ״ה בניסן ה׳תרל״ו ונקבר בצאנז.',
      en: 'Rabbi Chaim Halberstam, the Divrei Chaim, was born in Tarnogród, Galicia. A disciple of Rabbi Naftali Tzvi of Ropshitz, he served as rabbi of Rudnik and then of Sanz, today Nowy Sącz, Poland, until his death. There he founded the Sanz Chassidic dynasty, from which many courts descend. He was known for his mastery of halacha, his fiery prayer and his boundless charity to the poor. He died on 25 Nisan 5636 (1876).',
    },
    lessons: [
      {
        title: {
          he: 'צדקה בלי חשדנות',
          en: 'Giving without suspicion',
        },
        text: {
          he: 'רבי חיים אמר שהוא נותן בשמחה למאה קבצנים, גם אם רק אחד מהם עני באמת, משום שזכות הצדקה גדולה כל כך. החשש מרמאים לא עצר אותו מלתת.',
          en: 'Rabbi Chaim said he would gladly give to a hundred beggars even if only one was truly poor, because the merit of charity is so great. Fear of being cheated never stopped him from giving.',
        },
      },
      {
        title: {
          he: 'לאהוב את העני',
          en: 'Loving the poor',
        },
        text: {
          he: 'אלפי זהובים עברו בידיו בכל חודש, אך ביתו היה כמעט ריק מרהיטים, והוא הסתפק בזהובים ספורים. הוא אמר שהוא אוהב את העניים משום שהקב״ה אוהב אותם.',
          en: 'Thousands of gulden passed through his hands each month, yet his home was nearly bare and he lived on a few gulden. He said he loved the poor because the Holy One loves them.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'שו״ת דברי חיים',
          en: 'Divrei Chaim, responsa',
        },
        about: {
          he: 'תשובות בהלכה, בעיקר בענייני יורה דעה, מקוואות וטהרת המשפחה.',
          en: "Halachic responsa, chiefly on Yoreh De'ah, mikvaot and family purity.",
        },
      },
      {
        title: {
          he: 'דברי חיים על התורה ומועדים',
          en: 'Divrei Chaim on the Torah and festivals',
        },
        about: {
          he: 'דברי תורה וחסידות על פרשות התורה ועל המועדים.',
          en: 'Chassidic teachings on the Torah portions and the festivals.',
        },
      },
      {
        title: {
          he: 'דרכי חיים',
          en: 'Darkei Chaim',
        },
        about: {
          he: 'ליקוט של הנהגותיו ומנהגיו.',
          en: 'A collection of his customs and conduct.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'מנורת הכסף',
          en: 'The silver menorah',
        },
        text: {
          he: 'מסופר שרבי חיים כבר משכן כמעט כל חפץ בביתו לטובת נצרכים, כשבא אליו אדם שלא היה לו במה לחתן את בתו. לא נשאר בבית דבר מלבד מנורת החנוכה מכסף, והוא עטף אותה ונתן לו. בערב החנוכה עמד הבית בלי מנורה, עד שבאו זוג אורחים לבקש עצה והשאירו מתנה: מנורת כסף נאה. רבי חיים הדליק בה בלי להתפלא.',
          en: "It is told that Rabbi Chaim had already pawned nearly everything in his home for the needy when a man came who could not pay for his daughter's wedding. Nothing was left but his silver Chanukah menorah, so he wrapped it and gave it away. On the first night the house stood without one, until a couple came for his counsel and left a gift: a fine silver menorah. He lit it without surprise.",
        },
        source: 'Asharon Baltazar, The Miracle of the Missing Menorah, Chabad.org (https://www.chabad.org/4588766)',
      },
      {
        title: {
          he: 'הנוי של הסוכה',
          en: 'The finest sukkah decoration',
        },
        text: {
          he: 'בערב סוכות שלח רבי חיים את בניו ללוות כמה אלפי זהובים, ועוד באותו יום חילק את כל הסכום לנצרכים. כשנכנס בערב לסוכה, אמר לבניו שהצדקה היא הנוי היפה ביותר של הסוכה.',
          en: 'On the eve of Sukkot Rabbi Chaim sent his sons to borrow several thousand gulden, and that same day he gave the whole sum to the needy. Entering his sukkah that evening, he told his sons that charity is the most magnificent adornment of the sukkah.',
        },
        source:
          'Rabbi Avrohom Chaim Feuer, The Tzedakah Treasury, adapted by Shema Yisrael (https://shemayisrael.com/publicat/hazon/tzedaka/sanzer_rebbe.htm)',
      },
    ],
    grave: {
      place: {
        he: 'אוהל הדברי חיים בבית העלמין היהודי ברחוב ריבצקה, נובי סונץ׳ (צאנז), פולין',
        en: 'Ohel of the Divrei Chaim in the Jewish cemetery on Rybacka Street, Nowy Sącz (Sanz), Poland',
      },
      lat: 49.6337,
      lng: 20.6899,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://he.wikipedia.org/wiki/חיים_הלברשטאם',
      'https://en.wikipedia.org/wiki/Chaim_Halberstam',
      'https://jewishpress.com/my-machberes-13/',
      'https://www.chabad.org/4588766',
      'https://shemayisrael.com/publicat/hazon/tzedaka/sanzer_rebbe.htm',
      'https://cdp.jewishgen.org/k9yy',
      'https://www.openstreetmap.org/way/330144262',
      'https://www.wikidata.org/wiki/Q9194381',
    ],
  },
  abir_yaakov: {
    bio: {
      he: 'רבי יעקב אבוחצירא (1806–1880), המכונה ׳אביר יעקב׳, רבה של קהילת תאפילאלת שבמזרח מרוקו: מקובל, פוסק, דרשן ופייטן, וסבו של הבבא סאלי. עשרות שנים שימש כרב ומנהיג הקהילה, ורבני מרוקו שלחו אליו שאלות בהלכה. רוב לימודו היה בתורת הקבלה, ולפי המסורת נודע כבעל מופת. בשנת תר״ם יצא לעלות לארץ ישראל, חלה בדרך בעיר דמנהור שבמצרים ונפטר שם בכ׳ בטבת.',
      en: 'Rabbi Yaakov Abuchatzeira (1806–1880), the Abir Yaakov, was rabbi of Tafilalt in eastern Morocco: kabbalist, halachic authority, preacher and liturgical poet, and grandfather of the Baba Sali. For decades he led the community, and Moroccan rabbis sent him halachic questions. Most of his study was Kabbalah, and according to tradition he was a wonder-worker. In 1879 he set out for the Land of Israel, fell ill in Damanhur, Egypt, and died there on 20 Tevet 5640.',
    },
    lessons: [
      {
        title: {
          he: 'התלמוד קודם',
          en: 'Talmud first',
        },
        text: {
          he: 'אף שרוב לימודו היה בקבלה, התנגד ללימוד הקבלה בלי לימוד הפשט והתלמוד קודם לכן. בהקדמה לספרו ׳אלף בינה׳ כתב שבלי התלמוד אין אדם יכול להגיע לידיעת התורה.',
          en: 'Though he studied mostly Kabbalah, he opposed learning it before mastering the plain meaning and the Talmud. In his introduction to Alef Binah he wrote that without the Talmud no one can reach knowledge of the Torah.',
        },
      },
      {
        title: {
          he: 'יד פתוחה לעני',
          en: 'Open hand to the poor',
        },
        text: {
          he: 'תלמידו רבי שלמה חיון תיאר אותו כמי שמאס בהבלי העולם ופיזר צדקה לאביונים ולתלמידי חכמים. הוא גם יצא בעצמו לאסוף כסף כדי לחלק אותו לעניים.',
          en: 'His disciple Rabbi Shlomo Hayun described him as one who scorned worldly vanities and gave generously to the poor and to Torah scholars. He also went out himself to collect money to distribute to the needy.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'פתוחי חותם',
          en: 'Pituchei Chotam',
        },
        about: {
          he: 'פירוש על התורה בדרך הפרד״ס.',
          en: 'A commentary on the Torah on all four levels of interpretation (PaRDeS).',
        },
      },
      {
        title: {
          he: 'יורו משפטיך ליעקב',
          en: 'Yoru Mishpatecha LeYaakov',
        },
        about: {
          he: 'שאלות ותשובות, רובן בדיני ממונות.',
          en: 'Responsa, mostly on monetary law.',
        },
      },
      {
        title: {
          he: 'מחשוף הלבן',
          en: 'Machsof HaLavan',
        },
        about: {
          he: 'דרשות וביאורים על התורה על דרך הקבלה.',
          en: 'Sermons and explanations on the Torah according to Kabbalah.',
        },
      },
      {
        title: {
          he: 'גנזי המלך',
          en: 'Ginzei HaMelech',
        },
        about: {
          he: 'ביאורים רבים למילה ׳בראשית׳ ולענייני השבת.',
          en: 'Many explanations of the word Bereshit, and teachings on the Sabbath.',
        },
      },
      {
        title: {
          he: 'בגדי השרד',
          en: 'Bigdei HaSrad',
        },
        about: {
          he: 'פירוש על הגדה של פסח על דרך הקבלה.',
          en: 'A kabbalistic commentary on the Passover Haggadah.',
        },
      },
      {
        title: {
          he: 'יגל יעקב',
          en: 'Yagel Yaakov',
        },
        about: {
          he: 'פיוטים למועדי השנה, שלו ושל צאצאיו.',
          en: 'Liturgical poems for the festivals, by him and his descendants.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'שש פעמים בדרך לארץ ישראל',
          en: 'Six attempts to reach the Land of Israel',
        },
        text: {
          he: 'רבי יעקב השתוקק לעלות לארץ ישראל, אך בני קהילתו בתאפילאלת עיכבו אותו שוב ושוב. רק בפעם השישית, בשנת תר״ם, השתכנעו שבנו רבי מסעוד ימלא את מקומו, והניחו לו לצאת. הוא עבר באלג׳יריה, בתוניסיה ובלוב, הגיע לאלכסנדריה ומשם לדמנהור, ושם חלה פתאום ונפטר. הוא נקבר בעיר, וקברו היה למקום עלייה לרגל.',
          en: 'Rabbi Yaakov longed to settle in the Land of Israel, but his Tafilalt community held him back again and again. Only on the sixth attempt, in 1879, did they accept that his son Rabbi Masoud would take his place, and let him go. He passed through Algeria, Tunisia and Libya, reached Alexandria and then Damanhur, where he suddenly fell ill and died. He was buried there, and his grave became a pilgrimage site.',
        },
        source:
          'Hebrew Wikipedia, https://he.wikipedia.org/wiki/יעקב_אבוחצירא ; ANU Museum of the Jewish People, https://dbs.anumuseum.org.il/skn/en/c6/e194325/Personalities/Yaakov_Abuhatzeira',
      },
    ],
    grave: {
      place: {
        he: 'דמנהור, מצרים',
        en: 'Damanhur, Egypt',
      },
      lat: null,
      lng: null,
      link: false,
      noLinkReason: {
        he: 'הקבר סגור למבקרים: העלייה לרגל נאסרה מאז 2012, בית משפט מצרי אסר את ההילולה בשנת 2014, והשיפוץ בשנת 2022 לא פתח אותו מחדש.',
        en: 'Closed to visitors: pilgrimages have been barred since 2012, an Egyptian court banned the hilula in 2014, and the 2022 restoration did not reopen it.',
      },
    },
    sources: [
      'https://en.wikipedia.org/wiki/Yaakov_Abuhatzeira',
      'https://he.wikipedia.org/wiki/יעקב_אבוחצירא',
      'https://dbs.anumuseum.org.il/skn/en/c6/e194325/Personalities/Yaakov_Abuhatzeira',
      'https://www.jewishledger.com/2014/12/egyptian-court-cancels-annual-pilgrimage-rabbis-grave',
      'https://www.jewishrefugees.org.uk/2023/01/on-his-nahala-yarzeit-rabbi-abuhatzeiras-tomb-remains-closed.html',
      'https://www.algemeiner.com/2022/12/28/israeli-volunteers-repair-rabbi-yaakov-abuhatzeiras-egypt-tomb-in-covert-operation/',
    ],
  },
  yisrael_salanter: {
    bio: {
      he: 'רבי ישראל ליפקין מסלנט, מייסד תנועת המוסר. נולד בזאגר שבליטא, למד בסלנט והושפע שם עמוקות מרבי יוסף זונדל מסלנט. עמד בראש ישיבה בווילנה, ואחר כך פעל בקובנה, בממל, בקניגסברג ובפריז. הדגיש שהמצוות שבין אדם לחברו כבדות משקל כמו המצוות שבין אדם למקום, וייסד ׳בתי מוסר׳ ללימוד ולתיקון המידות. נפטר בקניגסברג בכ״ה בשבט תרמ״ג, ומקום קבורתו, שנשכח, אותר בשנת 2007.',
      en: "Rabbi Yisrael Lipkin of Salant, founder of the Musar movement. Born in Žagarė, Lithuania, he studied in Salant, where Rabbi Yosef Zundel of Salant deeply influenced him. He headed a yeshiva in Vilna and later worked in Kovno, Memel, Königsberg and Paris. He taught that duties between people weigh as much as duties toward God, and founded 'Musar houses' for ethical study. He died in Königsberg on 25 Shevat 5643; his forgotten grave was located in 2007.",
    },
    lessons: [
      {
        title: {
          he: 'בין אדם לחברו',
          en: 'Between person and person',
        },
        text: {
          he: 'הדגיש שהמצוות שבין אדם לחברו כבדות משקל כמו המצוות שבין אדם למקום. לדבריו, שמירת הצד הטקסי של הדת בלי עבודה על היחסים עם הזולת ועם עצמו היא עיוות.',
          en: "He stressed that the commandments between people weigh as much as those between people and God. In his view, keeping the ritual side of religion without working on one's relations with others and with oneself is a distortion.",
        },
      },
      {
        title: {
          he: 'לימוד מוסר בהתפעלות',
          en: 'Study with feeling',
        },
        text: {
          he: 'לימד שכדי לשנות מידות יש לחזור על מאמר מוסר שוב ושוב, בהתלהבות וברגש, עד שייכנס אל הכוחות הנסתרים שבנפש. לשם כך יזם ׳בית מוסר׳ ליד בית המדרש.',
          en: "He taught that to change one's character a person should repeat an ethical teaching again and again, with emotion, until it reaches the hidden forces of the soul. For this he created the 'Musar house' beside the study hall.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'אגרת המוסר',
          en: 'Iggeret HaMusar',
        },
        about: {
          he: 'איגרת יסוד של תנועת המוסר, הקוראת ללימוד מוסר ולתיקון המידות (1858).',
          en: 'A foundational letter of the Musar movement, calling for ethical study and character refinement (1858).',
        },
      },
      {
        title: {
          he: 'אור ישראל',
          en: 'Or Yisrael',
        },
        about: {
          he: 'מכתביו ודבריו בענייני מוסר, שערך תלמידו רבי יצחק בלאזר (1890).',
          en: 'His letters and teachings on Musar, edited by his disciple Rabbi Yitzchak Blazer (1890).',
        },
      },
      {
        title: {
          he: 'אמרי בינה',
          en: 'Imrei Binah',
        },
        about: {
          he: 'קובץ מאמריו מכתב העת ׳תבונה׳ (1878).',
          en: 'A collection of his articles from the journal Tevunah (1878).',
        },
      },
      {
        title: {
          he: 'תבונה',
          en: 'Tevunah',
        },
        about: {
          he: 'כתב עת להלכה ולמוסר שייסד בשנת 1861.',
          en: 'A journal of Jewish law and ethics that he founded in 1861.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'כל זמן שהנר דולק',
          en: 'As long as the candle burns',
        },
        text: {
          he: 'במוצאי שבת, בדרכו לאמירת סליחות, נקרעה נעלו של רבי ישראל. הוא חיפש סנדלר ומצא אחד שעדיין עבד לאור נר. כששאל אם לא מאוחר מדי לתקן, השיב הסנדלר: ׳כל זמן שהנר דולק, עוד אפשר לתקן׳. רבי ישראל מיהר לבית הכנסת ולימד את הקהל: כל עוד האדם חי, עוד אפשר לתקן את הנפש.',
          en: "One Saturday night, on his way to recite Selichot, Rabbi Yisrael's shoe tore. He found a shoemaker still working by candlelight and asked whether it was too late for a repair. The shoemaker answered: 'As long as the candle is burning, it is still possible to repair.' Rabbi Yisrael hurried to the synagogue and taught the people: as long as a person lives, the soul can still be repaired.",
        },
        source:
          'English Wikipedia, https://en.wikipedia.org/wiki/Israel_Salanter ; Hebrew Wikipedia, https://he.wikipedia.org/wiki/ישראל_מסלנט',
      },
      {
        title: {
          he: 'יום כיפור בימי המגפה',
          en: 'Yom Kippur during the cholera',
        },
        text: {
          he: 'בשנת 1848 פרצה מגפת כולרה בווילנה. רבי ישראל דאג שעבודת ההצלה בשבת תיעשה בידי יהודים, משום שהחובה להציל חיים קודמת לשאר המצוות. ביום הכיפורים של אותה שנה הורה לציבור שלא לצום אלא לאכול, כדי לשמור על בריאותם.',
          en: 'When cholera struck Vilna in 1848, Rabbi Yisrael made sure that life-saving work on Shabbat was done by Jews themselves, since the duty to save life comes before other laws. On Yom Kippur that year he instructed the community not to fast but to eat, in order to protect their health.',
        },
        source:
          'English Wikipedia, https://en.wikipedia.org/wiki/Israel_Salanter ; Immanuel Etkes, Rabbi Israel Salanter and the Musar Movement (Jewish Publication Society, 1993)',
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות היהודי הישן בקלינינגרד (קניגסברג), רוסיה',
        en: 'The old Jewish cemetery of Kaliningrad (Königsberg), Russia',
      },
      lat: null,
      lng: null,
      link: false,
      noLinkReason: {
        he: 'המיקום המדויק של הקבר בתוך בית הקברות לא אומת בשני מקורות.',
        en: "The grave's exact position inside the cemetery could not be confirmed by two sources.",
      },
    },
    sources: [
      'https://en.wikipedia.org/wiki/Israel_Salanter',
      'https://he.wikipedia.org/wiki/ישראל_מסלנט',
      'https://chareidi.org/archives5776/korach/arsalntrkrh76.htm',
      'https://jewsineastprussia.de/?p=11820',
      'https://fjc-fsu.org/kaliningrad-grave-of-father-of-musar-movement-renovated/',
      'Immanuel Etkes, Rabbi Israel Salanter and the Musar Movement (Jewish Publication Society, 1993)',
    ],
  },
  maharil_diskin: {
    bio: {
      he: 'הרב משה יהושע יהודה לייב דיסקין, המהרי״ל דיסקין, מגדולי רבני ליטא, נולד בגרודנא בשנת תקע״ט (1818). כיהן כרב בלומז׳ה, בקובנה, בשקלוב ובבריסק, ולכן כונה ״הרב מבריסק״. בשנת תרל״ז עלה לירושלים והיה מראשי העדה האשכנזית בעיר. ייסד את בית היתומים דיסקין, עמד בראש ישיבת אהל משה ומסר שיעורים עמוקים לתלמידי חכמים. נפטר במוצאי שבת, בכ״ט בטבת תרנ״ח, ונקבר בהר הזיתים.',
      en: 'Rabbi Moshe Yehoshua Yehuda Leib Diskin, the Maharil Diskin, a leading Lithuanian rabbi, was born in Grodno in 1818. He served as rabbi of Lomza, Kovno, Shklov and Brisk, and so was called the Rav of Brisk. In 1877 he settled in Jerusalem and became a leader of its Ashkenazi community. He founded the Diskin orphanage and headed the Ohel Moshe yeshiva. He died on Saturday night, 29 Tevet 5658 (1898), and was buried on the Mount of Olives.',
    },
    lessons: [
      {
        title: {
          he: 'חסד שמתחיל היום',
          en: 'Kindness that starts today',
        },
        text: {
          he: 'כשראה יתומים חסרי בית בירושלים, לא חיכה להקמת מוסד: הכניס אותם לביתו, ומשם צמח בית היתומים דיסקין. חסד אמיתי מתחיל במה שאפשר לעשות כבר היום.',
          en: 'When he saw homeless orphans in Jerusalem, he did not wait for an institution: he took them into his own home, and the Diskin orphanage grew from there. True kindness starts with what one can do today.',
        },
      },
      {
        title: {
          he: 'זמן למי שמבקש ללמוד',
          en: 'Time for those who ask to learn',
        },
        text: {
          he: 'אף שנחשב מגדולי הדור, נענה לבקשת קבוצת אברכים ומסר להם שיעור יומי בגמרא, ובמוצאי שבתות לימד את פרשת השבוע. גדול בתורה מוצא זמן ללמד את מי שמבקש ללמוד.',
          en: 'Though among the greatest of his generation, he agreed when a group of young scholars asked for a daily Gemara shiur, and on Saturday nights he taught the weekly portion. A great scholar makes time for those who ask.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'שו״ת מהרי״ל דיסקין',
          en: 'Responsa of the Maharil Diskin',
        },
        about: {
          he: 'קובץ תשובותיו בהלכה, שנדפס לאחר פטירתו.',
          en: 'A collection of his halachic responsa, printed after his death.',
        },
      },
      {
        title: {
          he: 'חידושי מהרי״ל דיסקין על מסכת חולין',
          en: 'Chiddushei HaMaharil Diskin on Chullin',
        },
        about: {
          he: 'הערותיו שנכתבו בשולי הגמרא שלו על מסכת חולין, שיצאו לאור בשנת תשפ״ד.',
          en: 'His notes from the margins of his own Gemara on tractate Chullin, published in 5784 (2024).',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'היתומים ביער',
          en: 'The orphans in the forest',
        },
        text: {
          he: 'לפי עדות תלמידו הרב יעקב אורנשטיין, בקיץ תרל״ט חלה הרב דיסקין בדלקת ריאות ויצא לנשום אוויר צח ביער שמחוץ לעיר. שם ראה ילדים יחפים ולבושי בלואים בין ערמות האשפה, ושמע שהם יתומים שאין להם בית. הוא הכניס אותם לביתו, ויחד עם רעייתו גידל אותם בו. בי״א בשבט תרמ״א נשכר הבניין הראשון, ונוסד בית היתומים דיסקין.',
          en: 'According to his disciple Rabbi Yaakov Orenstein, in the summer of 1879 Rabbi Diskin fell ill with pneumonia and went out to a forest outside the city for fresh air. There he saw barefoot children in rags among the rubbish heaps, and learned they were homeless orphans. He took them into his own home and raised them there with his wife. On 11 Shevat 5641 (1881) the first building was rented, and the Diskin orphanage was founded.',
        },
        source:
          "Diskin Orphanage, 'The way it all began', after the account of his disciple Rabbi Yaakov Orenstein: https://www.diskin.org.il/history; Hebrew Wikipedia 'יהושע לייב דיסקין' (the orphanage founded in his courtyard in 1881): https://he.wikipedia.org/wiki/יהושע_לייב_דיסקין",
      },
      {
        title: {
          he: 'חלונות אל הר הבית',
          en: 'Windows toward the Temple Mount',
        },
        text: {
          he: 'לפי מסורת שנשתמרה בירושלים, הקפיד המהרי״ל דיסקין שחלונות דירתו בעיר העתיקה יפנו אל הר הבית, כדי שלא יעברו עליו שלושים יום בלי שיראה את מקום המקדש.',
          en: 'According to a Jerusalem tradition, the Maharil Diskin made sure the windows of his Old City home faced the Temple Mount, so that thirty days would never pass without his seeing the place of the Temple.',
        },
        source:
          "Hebrew Wikipedia 'יהושע לייב דיסקין', citing Eli Schiller and Gideon Bigger, Jerusalem, the Old City (Ariel, 1988), p. 196: https://he.wikipedia.org/wiki/יהושע_לייב_דיסקין; Israel Ministry of Education, Haredi education, 'Dmuyot hod beEretz Yisrael: Maharil Diskin': https://meyda.education.gov.il/files/Mazkirut_Pedagogit/MikzootAzmaeem/Beshvili_morshet_dmuyot_hud_bartz_yisral_meharile_diskin.pdf",
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות בהר הזיתים, ירושלים; הביקור דורש תיאום ביטחוני או ליווי',
        en: 'Mount of Olives cemetery, Jerusalem; a visit needs security coordination or an escort',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית הקברות הר הזיתים',
    },
    sources: [
      'https://he.wikipedia.org/wiki/יהושע_לייב_דיסקין',
      'https://en.wikipedia.org/wiki/Yehoshua_Leib_Diskin',
      'https://www.diskin.org.il/history',
      'https://www.jdn.co.il/j_world/2558545/',
      'https://meyda.education.gov.il/files/Mazkirut_Pedagogit/MikzootAzmaeem/Beshvili_morshet_dmuyot_hud_bartz_yisral_meharile_diskin.pdf',
    ],
  },
  sfas_emes: {
    bio: {
      he: 'רבי יהודה אריה ליב אלתר (1847–1905), האדמו״ר השלישי של חסידות גור, המכונה על שם ספריו ׳שפת אמת׳. התייתם בילדותו וגדל אצל סבו, החידושי הרי״ם. לאחר פטירת סבו מונה לרב העיירה גור, אך סירב להנהיג את החסידים, וקיבל את ההנהגה רק בשנת 1870, בגיל 23, לאחר פטירת רבי חנוך העניך מאלכסנדר. בימיו הייתה גור לחסידות המרכזית בפולין. נפטר בה׳ בשבט תרס״ה ונקבר לצד סבו.',
      en: "Rabbi Yehudah Aryeh Leib Alter (1847–1905), third Rebbe of Ger, known by his works' title, Sfas Emes. Orphaned as a child, he was raised by his grandfather, the Chiddushei HaRim. After his grandfather's death he became rabbi of Ger but declined to lead the Hasidim, accepting only in 1870, at 23, after Rabbi Chanoch Henoch of Alexander died. Under him Ger became Poland's leading Hasidic court. He died on 5 Shevat 5665 and lies beside his grandfather.",
    },
    lessons: [
      {
        title: {
          he: 'הנקודה הפנימית',
          en: 'The inner point',
        },
        text: {
          he: 'רעיון מרכזי בתורתו הוא ׳הנקודה הפנימית׳: בכל יהודי ובכל דבר בעולם יש נקודה אלוקית נסתרת המחיה אותו. עבודת האדם היא לגלות אותה ולהתחבר אליה.',
          en: "A central idea in his teaching is the 'inner point': within every Jew and every thing in the world lies a hidden divine point that gives it life. A person's task is to uncover it and connect to it.",
        },
      },
      {
        title: {
          he: 'התחדשות בכל יום',
          en: 'Renewal every day',
        },
        text: {
          he: 'חזר ולימד שהבריאה מתחדשת בכל רגע מכוח הדיבור האלוקי. לכן גם האדם אינו כבול לעברו, ובכל יום ובכל שבת יש הזדמנות להתחדש ולהתחיל מחדש.',
          en: 'He taught again and again that creation is renewed every moment by the divine word. So a person is not bound to the past: each day, and each Shabbat, offers a chance to be renewed and begin again.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'שפת אמת על התורה והמועדים',
          en: 'Sfas Emes on the Torah and festivals',
        },
        about: {
          he: 'דברי תורה שנשא בשבתות ובחגים, ונדפסו אחרי פטירתו; מספרי החסידות הנפוצים ביותר.',
          en: 'Teachings he gave on Shabbat and festivals, printed after his death; among the most widely studied Hasidic works.',
        },
      },
      {
        title: {
          he: 'שפת אמת על הש״ס',
          en: 'Sfas Emes on the Talmud',
        },
        about: {
          he: 'חידושים על מסכתות התלמוד, מתוך שיעורים שמסר לבני ביתו.',
          en: 'Novellae on Talmud tractates, drawn from classes he gave his family.',
        },
      },
      {
        title: {
          he: 'שפת אמת – ליקוטים',
          en: 'Sfas Emes – Likutim',
        },
        about: {
          he: 'דברי תורה שכתב בצעירותו, לפני שקיבל את ההנהגה.',
          en: 'Torah teachings he wrote in his youth, before he became Rebbe.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'דאגה לחיילים',
          en: 'Worry for the soldiers',
        },
        text: {
          he: 'בימי מלחמת רוסיה–יפן גויסו רבים מחסידיו הצעירים לצבא הצאר ונשלחו לחזית במנצ׳וריה. השפת אמת הרבה לכתוב אליהם ודאג להם מאוד. לפי עדות בני ביתו, בכל ימי המלחמה ישן על הרצפה, מכוסה רק במעילו, ובכה על גורלם. בריאותו נחלשה, והוא נפטר בחורף 1905.',
          en: "During the Russo-Japanese War many of his young Hasidim were drafted into the Tsar's army and sent to the front in Manchuria. The Sfas Emes wrote to them constantly and worried for them deeply. According to his household, throughout the war he slept on the floor covered only by his coat, weeping over their fate. His health declined, and he died in the winter of 1905.",
        },
        source:
          'Hebrew Wikipedia, https://he.wikipedia.org/wiki/יהודה_אריה_ליב_אלתר ; English Wikipedia, https://en.wikipedia.org/wiki/Yehudah_Aryeh_Leib_Alter',
      },
      {
        title: {
          he: 'סירוב להנהגה',
          en: 'Declining leadership',
        },
        text: {
          he: 'כשנפטר סבו בשנת 1866, ביקשו החסידים שהנכד הצעיר יעמוד בראשם. הוא סירב, ואף הצטרף בעצמו לחסידיו של רבי חנוך העניך מאלכסנדר. רק לאחר פטירתו של רבי חנוך העניך, בשנת 1870, נענה להפצרות החסידים וקיבל את ההנהגה.',
          en: "When his grandfather died in 1866, the Hasidim asked the young grandson to lead them. He refused, and even became a follower of Rabbi Chanoch Henoch of Alexander himself. Only after Rabbi Chanoch Henoch's death in 1870 did he give in to the Hasidim's pleas and accept the leadership.",
        },
        source:
          'English Wikipedia, https://en.wikipedia.org/wiki/Yehudah_Aryeh_Leib_Alter ; Hebrew Wikipedia, https://he.wikipedia.org/wiki/יהודה_אריה_ליב_אלתר',
      },
    ],
    grave: {
      place: {
        he: 'האוהל בבית הקברות היהודי בגורה קלווריה (גור), פולין, לצד סבו',
        en: 'The ohel in the Jewish cemetery of Góra Kalwaria (Ger), Poland, beside his grandfather',
      },
      lat: 51.98201,
      lng: 21.19179,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Yehudah_Aryeh_Leib_Alter',
      'https://he.wikipedia.org/wiki/יהודה_אריה_ליב_אלתר',
      'https://www.esjf-cemeteries.org/survey/gora-kalwaria-jewish-cemetery/',
      'Arthur Green, The Language of Truth: The Torah Commentary of the Sefat Emet (JPS, 1998), https://www.jps.org/books/language-of-truth/',
      'https://posenlibrary.com/node/9145',
      "Avraham Segal, 'On Renewal in the Writings of R. Yehudah Aryeh Leib of Gur', Daat 70 (2011), https://www.jstor.org/stable/24232408",
    ],
  },
  ben_ish_chai: {
    bio: {
      he: 'רבי יוסף חיים מבגדאד (1835–1909), המכונה על שם ספרו ׳בן איש חי׳, מקובל, פוסק ודרשן, ומגדולי רבני יהדות המזרח. בשנת 1859, לאחר פטירת אביו, קיבל על עצמו את הנהגת קהילת בגדאד בלי לשאת משרה רבנית רשמית, והנהיג אותה כחמישים שנה. מדי שבת דרש לפני הקהל, וספרו ׳בן איש חי׳ משלב הלכה, קבלה ומוסר לפי פרשות השבוע. נפטר בי״ג באלול תרס״ט ונקבר בבגדאד.',
      en: "Rabbi Yosef Chaim of Baghdad (1835–1909), known by his book Ben Ish Chai, was a kabbalist, halachic authority and preacher, a leading Sephardi rabbi. In 1859, after his father's death, he led Baghdad's community for some fifty years without an official post. He preached to the community every Shabbat; Ben Ish Chai combines law, Kabbalah and ethics by weekly Torah portion. He died on 13 Elul 5669 and was buried in Baghdad.",
    },
    lessons: [
      {
        title: {
          he: 'תורה לכל העם',
          en: 'Torah for everyone',
        },
        text: {
          he: 'בדרשותיו פנה לכל שכבות העם, ושילב הלכה עם אגדה, משלים, חידות וסיפורים כדי למשוך את הלב. גם ספרו ׳בן איש חי׳ נכתב בלשון פשוטה ומסודר לפי פרשות השבוע.',
          en: "His sermons addressed every part of the community, weaving law with lore, parables, riddles and stories to draw people's hearts. His Ben Ish Chai, too, was written plainly and arranged by the weekly Torah portion.",
        },
      },
      {
        title: {
          he: 'תורה בלי שכר',
          en: 'Torah without pay',
        },
        text: {
          he: 'סירב לקבל שכר על שירותו הציבורי, ופרנס את משפחתו משותפות בעסק עם אחיו. גם את הדפסת ספריו מימן מכספו.',
          en: 'He refused any salary for his public service and supported his family through a business partnership with his brothers. He also paid for printing his books from his own money.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'בן איש חי',
          en: 'Ben Ish Chai',
        },
        about: {
          he: 'הלכות לחיי היום-יום בשילוב רמזי קבלה, מסודרות לפי פרשות השבוע.',
          en: 'Laws of daily life with kabbalistic insights, arranged by the weekly Torah portion.',
        },
      },
      {
        title: {
          he: 'רב פעלים',
          en: "Rav Pe'alim",
        },
        about: {
          he: 'שאלות ותשובות לפי סדר השולחן ערוך, לשאלות שנשלחו אליו מקהילות רבות.',
          en: 'Responsa arranged by the Shulchan Aruch, answering questions from many communities.',
        },
      },
      {
        title: {
          he: 'בן יהוידע',
          en: 'Ben Yehoyada',
        },
        about: {
          he: 'פירוש על האגדות שבתלמוד.',
          en: 'A commentary on the narrative (aggadic) passages of the Talmud.',
        },
      },
      {
        title: {
          he: 'קאנון אלנסא',
          en: 'Qanun al-Nisa',
        },
        about: {
          he: 'ספר מוסר והלכות לנשים, בערבית היהודית של בגדאד.',
          en: 'A book of ethics and laws for women, in Baghdadi Judeo-Arabic.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'הבור בחצר',
          en: 'The pit in the courtyard',
        },
        text: {
          he: 'כשהיה בן שבע, בעת משחק עם אחותו בחצר ביתם, נפל יוסף חיים לבור עמוק. לפי המסופר ניצל בנס, ומתוך הכרת טובה לה׳ החליט להקדיש את כל חייו ללימוד תורה.',
          en: 'At seven, while playing with his sister in the family courtyard, Yosef Chaim fell into a deep pit. According to the account he was miraculously saved, and out of gratitude to God he resolved to devote his whole life to Torah study.',
        },
        source:
          "Chabad.org, 'The Ben Ish Chai', https://www.chabad.org/975828 ; Hebrew Wikipedia, https://he.wikipedia.org/wiki/יוסף_חיים_מבגדאד",
      },
      {
        title: {
          he: 'ישיבה במקום בית חולים',
          en: 'A yeshiva instead of a hospital',
        },
        text: {
          he: 'הנדיב יוסף אברהם שלום מכלכותה רצה להקים בית חולים בירושלים. הרב יוסף חיים שכנע אותו שעדיף להשקיע בנשמה היהודית, ובהשפעתו תרם הנדיב מהונו להקמת ישיבת פורת יוסף הספרדית בעיר העתיקה בירושלים.',
          en: "The philanthropist Yosef Avraham Shalom of Calcutta wished to build a hospital in Jerusalem. Rabbi Yosef Chaim persuaded him that investing in the Jewish soul was better, and under his influence the donor gave of his fortune to found the Sephardi Porat Yosef Yeshiva in Jerusalem's Old City.",
        },
        source:
          'Hebrew Wikipedia, https://he.wikipedia.org/wiki/יוסף_חיים_מבגדאד ; English Wikipedia, https://en.wikipedia.org/wiki/Yosef_Hayyim',
      },
    ],
    grave: {
      place: {
        he: 'בגדאד, עיראק',
        en: 'Baghdad, Iraq',
      },
      lat: null,
      lng: null,
      link: false,
      noLinkReason: {
        he: 'בית הקברות היהודי הישן בבגדאד פונה בתחילת שנות ה-60 והעצמות הועברו, כך שמקום הקבר כיום אינו ודאי; עיראק גם סגורה למבקרים ישראלים.',
        en: "Baghdad's old Jewish cemetery was cleared in the early 1960s and its remains moved, so the grave's present spot is uncertain; Iraq is also closed to Israeli visitors.",
      },
    },
    sources: [
      'https://en.wikipedia.org/wiki/Yosef_Hayyim',
      'https://he.wikipedia.org/wiki/יוסף_חיים_מבגדאד',
      'https://www.chabad.org/975828',
      'https://ou.org/judaism-101/bios/leaders-in-the-diaspora/the-ben-ish-chai',
      'https://seforimblog.com/?p=4845',
    ],
  },
  chaim_of_brisk: {
    bio: {
      he: 'רבי חיים הלוי סולובייצ׳יק, ר׳ חיים מבריסק, נולד בוולוז׳ין בשנת תרי״ג, בנו של בעל ״בית הלוי״. שימש משנה לראש ישיבת וולוז׳ין לצד הנצי״ב, ואחרי סגירת הישיבה ופטירת אביו בשנת תרנ״ב נעשה רבה של בריסק. הוא אבי ״דרך בריסק״, שיטת לימוד מדויקת ומושגית שקנתה לה מקום בישיבות ליטא, והעמיד תלמידים גדולים. נפטר באוטבוצק בכ״א באב תרע״ח ונקבר בוורשה, ובנו רבי יצחק זאב מילא את מקומו.',
      en: 'Rabbi Chaim Soloveitchik, Reb Chaim of Brisk, was born in Volozhin in 1853, son of the Beis HaLevi. He taught at the Volozhin yeshiva beside the Netziv; after it closed and his father died in 1892, he became rabbi of Brisk. He founded the Brisker method, a precise, conceptual approach to Talmud study adopted across Lithuanian yeshivas. He died in Otwock on 21 Av 5678 (1918) and was buried in Warsaw; his son Rabbi Yitzchak Zev succeeded him.',
    },
    lessons: [
      {
        title: {
          he: 'רב שמגן על החלש',
          en: 'A rabbi for the defenseless',
        },
        text: {
          he: 'לפי עדות נכדו, הרב יוסף דב סולובייצ׳יק, ראה רבי חיים את תפקיד הרב לא רק בפסיקת שאלות, אלא בתיקון עוולות שנעשו לחלשים ובהגנה על מי שאין לו מגן.',
          en: "As his grandson Rabbi Joseph B. Soloveitchik recorded, Reb Chaim saw a rabbi's task not only in ruling on questions but in righting wrongs done to the weak and defending those with no one to defend them.",
        },
      },
      {
        title: {
          he: 'מחמיר בפיקוח נפש',
          en: 'Stringent about saving life',
        },
        text: {
          he: 'רבי חיים התיר לחולים לאכול ביום הכיפורים. כשטענו שהוא מקל בדיני הצום, ענה שאינו מקל ביום הכיפורים, אלא מחמיר בפיקוח נפש. שמירת החיים היא חומרה, לא קולא.',
          en: 'He permitted the sick to eat on Yom Kippur. When told he was lenient about the fast, he answered that he was not lenient about Yom Kippur but stringent about saving life. Protecting life is a stringency, not a leniency.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'חידושי רבנו חיים הלוי',
          en: 'Chiddushei Rabbeinu Chaim HaLevi',
        },
        about: {
          he: 'חידושיו על משנה תורה לרמב״ם, שכתב והגיה בעצמו, ובניו הדפיסו אחרי פטירתו.',
          en: "His insights on Maimonides' Mishneh Torah, written and corrected in his own hand and printed by his sons after his death.",
        },
      },
      {
        title: {
          he: 'חידושי הגר״ח (סטנסיל)',
          en: 'Chiddushei HaGrach (the stencil)',
        },
        about: {
          he: 'חידושיו על הש״ס, שהועתקו מכתביו שלא הוגהו בידיו, ותלמידי בנו הדפיסו אותם במכונת כתיבה כסטנסיל.',
          en: "His insights on the Talmud, copied from writings he never edited and typed as a stencil edition by his son's students.",
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'המחסן הנעול',
          en: 'The locked woodshed',
        },
        text: {
          he: 'בתחילת החורף מילאו גבאי הקהילה מחסן עצים לחימום בית הרב. רבי חיים הודיע שכל מי שצריך עצים ואין לו כסף יבוא ויקח בחינם, והעצים אזלו מהר. הגבאים נעלו את המחסן ומסרו את המפתח לרבנית, אך רבי חיים לא הניח לה להשתמש בעצים, אף שהבית קפא מקור. ״אם הוא נעול לעניים,״ אמר, ״הוא נעול גם לנו.״',
          en: "At the start of winter the trustees filled a woodshed to heat the rabbi's home. Reb Chaim announced that anyone who needed firewood and could not pay could take it free, and the wood ran out. The trustees padlocked the shed and gave the key to the Rebbetzin, but Reb Chaim would not let her use the wood, though the house was freezing. 'If it is locked to the poor,' he said, 'it is locked to us too.'",
        },
        source:
          "R' B. Yisraeli, Four Hundred Years Postmortem, Dei'ah veDibur, Vayechi 5764 (https://www.chareidi.org/archives5764/vayechi/ovaychi.htm); his open home and wood used by strangers also in VIN News, 4 August 2026 (https://vinnews.com/2026/08/04/659539/)",
      },
      {
        title: {
          he: 'מזרן מתחת למדרגות',
          en: 'A mattress under the stairs',
        },
        text: {
          he: 'אחרי השריפות בבריסק, כשמשפחות רבות נותרו בלי קורת גג, לא שכב רבי חיים לישון במיטתו אף לילה אחד. בכל תקופת הבנייה מחדש ישן על מזרן מתחת למדרגות העולות לעזרת הנשים בבית הכנסת הגדול, וביתו שלו שימש מעון לעניים רבים, קבועים ועוברי אורח.',
          en: "After the fires in Brisk, when many families were left without a roof, Reb Chaim did not sleep in his own bed a single night. Through the whole time of rebuilding he slept on a mattress under the stairs to the women's gallery of the main synagogue, while his own home housed many poor people, some passing through and some staying on.",
        },
        source:
          "R' B. Yisraeli, Four Hundred Years Postmortem, Dei'ah veDibur, Vayechi 5764 (https://www.chareidi.org/archives5764/vayechi/ovaychi.htm)",
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין היהודי ברחוב אוקופובה, ורשה, פולין, באוהל המשותף לו ולנצי״ב בחלקה 49; הנקודה במפה היא שער הכניסה',
        en: 'Okopowa Street Jewish Cemetery, Warsaw, Poland, in the ohel he shares with the Netziv in section 49; the map point is the entrance gate',
      },
      lat: 52.2446,
      lng: 20.9769,
      link: true,
      noLinkReason: null,
    },
    sources: [
      "https://he.wikipedia.org/wiki/חיים_סולובייצ'יק",
      'https://en.wikipedia.org/wiki/Chaim_Soloveitchik',
      'https://vinnews.com/2026/08/04/659539/',
      'https://www.chareidi.org/archives5764/vayechi/ovaychi.htm',
      'https://en.wikipedia.org/wiki/Chiddushei_Rabbeinu_Chaim',
      'https://en.wikipedia.org/wiki/Jewish_Cemetery,_Warsaw',
      'https://www.wikidata.org/wiki/Q1716786',
      'https://www.openstreetmap.org/way/35487661',
      'https://www.openstreetmap.org/node/416163273',
      'https://commons.wikimedia.org/wiki/File:POL_Warsaw_JCP_cemetery_gate1.jpg',
      'https://commons.wikimedia.org/wiki/Category:Ohel_of_Chaim_So%C5%82owiejczyk_and_Cwi_Naftali_Berlin',
      'https://www.wikidata.org/wiki/Q2637350',
    ],
  },
  shayele_of_kerestir: {
    bio: {
      he: 'רבי ישעיה שטיינר, ר׳ ישעיה׳לה מקרעסטיר, נולד בזבורוב שבצפון הונגריה, כיום בסלובקיה, והתייתם מאביו בגיל שלוש. בנערותו היה משמשו של רבי צבי הירש מליסקא, ולמד גם אצל רבי חיים מצאנז ורבי מרדכי מנדבורנה. בעצת רבי מרדכי עבר לקרעסטיר שבהונגריה, ושם נהג באדמו״רות ונודע בהכנסת אורחים עצומה ובצדקה רבה. רבים באו אליו לבקש ברכה. נפטר בג׳ באייר ה׳תרפ״ה, ונקבר בקרעסטיר.',
      en: "Rabbi Yeshaya Steiner, Reb Shayele of Kerestir, was born in Zborov in northern Hungary, today Slovakia, and lost his father at three. As a youth he served Rabbi Tzvi Hirsh of Liska, and he also learned from Rabbi Chaim of Sanz and Rabbi Mordechai of Nadvorna. On Rabbi Mordechai's advice he settled in Bodrogkeresztúr (Kerestir), Hungary, where he led a Chassidic court famed for vast hospitality and charity. He died on 3 Iyar 5685 (1925).",
    },
    lessons: [
      {
        title: {
          he: 'ארוחה חמה לכל אורח',
          en: 'A warm meal for every guest',
        },
        text: {
          he: 'בביתו בקרעסטיר דאג שכל אורח יאכל לשובע ויישן בנוחות. הוא הבין שמי שאינו דואג ללחמו יכול לפנות לתורה, לתפילה ולתיקון המידות. כך הפכה ארוחה חמה לפתח לעבודת ה׳.',
          en: 'In Kerestir he made sure every guest ate well and slept comfortably. He understood that a person free of worry about bread can turn to Torah, prayer and refining his character. A warm meal became a doorway to serving God.',
        },
      },
      {
        title: {
          he: 'נתינה גם בשעת דוחק',
          en: 'Giving even when short',
        },
        text: {
          he: 'כותבי תולדותיו מספרים שכאשר לא נותר בידו כסף לצדקה, לווה כדי להמשיך לתת. הצדקה לא הייתה אצלו מותרות של עת רווחה, אלא חובה של כל יום.',
          en: 'His biographers relate that when he had no money left for charity, he borrowed so he could keep giving. For him charity was not a luxury for good times but a duty of every day.',
        },
      },
    ],
    biblical: false,
    works: [],
    stories: [
      {
        title: {
          he: 'פנחס׳ל האורח',
          en: "Pinchas'l the guest",
        },
        text: {
          he: 'בין אורחיו הקבועים היה נווד מוטרד בשם פנחס׳ל, שהתנהג לעתים בגסות. הגבאים חששו לכבוד השבת ולכבוד הרבי, וביקשו שימצא לינה במקום אחר. ר׳ ישעיה׳לה השתומם: ״אשלח יהודי מביתי?!״ והוסיף שיוותר על מעמדו ועל כל רכושו ובלבד שלא ירחיק יהודי מקרעסטיר.',
          en: "Among his regular guests was Pinchas'l, a troubled wanderer who was often rude and unkempt. The gabbaim, concerned for the honor of Shabbat and of the Rebbe, asked that he lodge elsewhere. Reb Shayele was astonished: 'Should I send a Jew away from my home?!' He said he would give up his position and all he owned before sending a Jew away from Kerestir.",
        },
        source: 'Jewish Link, Ahavas Yisrael, 2021 (https://jewishlink.news/?p=48140)',
      },
      {
        title: {
          he: 'ארוחה לבאים להלוויה',
          en: 'A meal for the mourners',
        },
        text: {
          he: 'מסופר שגם על ערש דווי ביקש ר׳ ישעיה׳לה מבני ביתו לדאוג שהבאים להלווייתו לא יישארו רעבים. ברוח זו נוהגים עד היום בג׳ באייר, יום פטירתו, לחלק ארוחות חינם לזכרו בקהילות רבות.',
          en: 'It is told that even on his deathbed Reb Shayele asked his family to make sure that those coming to his funeral would not go hungry. In that spirit, on 3 Iyar, his yahrzeit, free meals are handed out in his memory in many communities.',
        },
        source:
          'Daniel Pesin, A 21st-century Hasidic pilgrimage, Times of Israel blogs, 2023 (https://blogs.timesofisrael.com/a-21st-century-hasidic-pilgrimage/); Chaya Sara Oppenheim, The Hasidic Rabbi Who Inspired a Day of Free Lunch, Mosaic, 2023 (https://ideas.tikvah.org/mosaic/picks/the-hasidic-rabbi-who-inspired-a-day-of-free-lunch)',
      },
    ],
    grave: {
      place: {
        he: 'אוהל ר׳ ישעיה׳לה בבית העלמין היהודי בבודרוגקרסטור (קרעסטיר), הונגריה',
        en: 'Ohel of Reb Shayele in the Jewish cemetery of Bodrogkeresztúr (Kerestir), Hungary',
      },
      lat: 48.1661,
      lng: 21.3593,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://he.wikipedia.org/wiki/ישעיה_שטיינר',
      'https://en.wikipedia.org/wiki/Yeshaya_Steiner',
      'https://www.jdn.co.il/j_world/2631786/',
      'https://mishpacha.com/?p=14477',
      'https://jewishlink.news/?p=48140',
      'https://blogs.timesofisrael.com/a-21st-century-hasidic-pilgrimage/',
      'https://ideas.tikvah.org/mosaic/picks/the-hasidic-rabbi-who-inspired-a-day-of-free-lunch',
      'https://www.openstreetmap.org/node/4927283880',
      'https://iwalk-dev.usc.edu/hu/bodrogkeresztur-jewish-community/map/6',
    ],
  },
  chafetz_chaim: {
    bio: {
      he: 'רבי ישראל מאיר הכהן כגן (1838–1933), המכונה ׳החפץ חיים׳ על שם ספרו הראשון, בהלכות איסור לשון הרע. נולד בזשעטל שבבלארוס של היום ולמד בווילנה. התיישב בראדין, ושם ייסד בשנת 1869 ישיבה שהתפרסמה בעולם כולו. חיבר את ׳משנה ברורה׳, הפירוש הנפוץ על חלק אורח חיים בשולחן ערוך, וספרי מוסר רבים. נודע בענוותנותו, ונסע רבות לחזק את שמירת המצוות. נפטר בראדין בכ״ד באלול תרצ״ג.',
      en: "Rabbi Yisrael Meir HaKohen Kagan (1838–1933), known as the Chafetz Chaim after his first book, on forbidden speech. Born in Zhetel (today in Belarus), he studied in Vilna and settled in Radin, where in 1869 he founded a world-famous yeshiva. He wrote the Mishnah Berurah, the standard commentary on the Shulchan Aruch's Orach Chaim, and ethical works. Known for his humility, he travelled widely to strengthen observance. He died in Radin on 24 Elul 5693.",
    },
    lessons: [
      {
        title: {
          he: 'שמירת הלשון',
          en: "Guarding one's tongue",
        },
        text: {
          he: 'ספריו ׳חפץ חיים׳ ו׳שמירת הלשון׳ פרשו באופן שיטתי את איסורי לשון הרע והרכילות, והסבירו את כוחו של הדיבור. הם לימדו דורות שגם דיבור על הזולת הוא תחום של הלכה ממש.',
          en: 'His books Chafetz Chaim and Shemirat HaLashon set out systematically the laws against gossip and slander and explained the power of speech. They taught generations that speaking about others is itself a matter of actual Jewish law.',
        },
      },
      {
        title: {
          he: 'אהבת חסד',
          en: 'Love of kindness',
        },
        text: {
          he: 'בספרו ׳אהבת חסד׳ פירט את מצוות ההלוואה לנזקק ואת הדרכים לגמול חסד זה עם זה. הוא הדגיש שהמצוות שבין אדם לחברו הן חלק מרכזי בעבודת ה׳.',
          en: 'In his book Ahavat Chesed he set out the commandment of lending to the needy and the many ways to do kindness for one another. He stressed that the commandments between people are a central part of serving God.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'חפץ חיים',
          en: 'Chafetz Chaim',
        },
        about: {
          he: 'הלכות איסור לשון הרע ורכילות (1873).',
          en: 'The laws forbidding gossip and slander (1873).',
        },
      },
      {
        title: {
          he: 'שמירת הלשון',
          en: 'Shemirat HaLashon',
        },
        about: {
          he: 'על כוחו של הדיבור ועל החשיבות להיזהר בו (1876).',
          en: 'On the power of speech and why to guard it (1876).',
        },
      },
      {
        title: {
          he: 'משנה ברורה',
          en: 'Mishnah Berurah',
        },
        about: {
          he: 'פירוש בשישה כרכים על חלק אורח חיים בשולחן ערוך (1884–1907).',
          en: 'A six-volume commentary on the Orach Chaim section of the Shulchan Aruch (1884–1907).',
        },
      },
      {
        title: {
          he: 'אהבת חסד',
          en: 'Ahavat Chesed',
        },
        about: {
          he: 'על מצוות ההלוואה לנזקק ועל דרכי גמילות חסדים (1888).',
          en: 'On lending to the needy and ways of doing kindness (1888).',
        },
      },
      {
        title: {
          he: 'ליקוטי הלכות',
          en: 'Likutei Halachot',
        },
        about: {
          he: 'סיכום סוגיות בענייני עבודת המקדש, לעידוד לימודן.',
          en: 'A digest of Talmudic topics on the Temple service, written to encourage their study.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'החנות שנסגרה',
          en: 'The shop he closed',
        },
        text: {
          he: 'החפץ חיים ואשתו פתחו חנות מכולת קטנה בראדין, ואשתו ניהלה אותה רוב היום. הוא הקפיד על משקלות מדויקים, על מחיר הוגן ועל כל דיני המסחר שבתורה. בזכות יושרו נהרו אליה קונים, וחנוונים אחרים התלוננו שהוא פוגע בפרנסתם. הוא קיצר את שעות הפתיחה למינימום, ולפי המסופר סגר לבסוף את החנות ופנה לכתיבה ולמכירת ספריו.',
          en: 'The Chafetz Chaim and his wife opened a small grocery in Radin, which she ran most of the day. He insisted on exact weights, fair prices and every Torah law of commerce. His honesty drew customers, and other shopkeepers complained that he was taking their livelihood. He cut the opening hours to a minimum and, according to the account, finally closed the shop and turned to writing and selling his books.',
        },
        source:
          "Torah-Box (from Hamodia), 'The Chafetz Chaim: honesty does not pay?', https://www.torah-box.net/news/news/the-chafetz-chaim-honesty-does-not-pay_567.html ; English Wikipedia, https://en.wikipedia.org/wiki/Yisrael_Meir_Kagan",
      },
    ],
    grave: {
      place: {
        he: 'האוהל בבית הקברות היהודי בראדין (רדון), בלארוס',
        en: 'The ohel in the Jewish cemetery of Radin (Radun), Belarus',
      },
      lat: 54.0456,
      lng: 24.97962,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Yisrael_Meir_Kagan',
      'https://he.wikipedia.org/wiki/ישראל_מאיר_הכהן',
      'https://www.torah-box.net/news/news/the-chafetz-chaim-honesty-does-not-pay_567.html',
      'https://cdp.jewishgen.org/kc4h',
      'https://www.theyeshivaworld.com/news/headlines-breaking-stories/284624/delegation-of-dirshu-rabbanim-daven-at-the-tziyun-of-the-chafetz-chaim-on-behalf-of-thousands-of-lomdei-daf-yomi-bhalacha.html',
    ],
  },
  meir_shapiro: {
    bio: {
      he: 'רבי יהודה מאיר שפירא (1887–1933), ׳הרב מלובלין׳. נולד בסוצ׳אבה (שאץ) שבבוקובינה ונודע בצעירותו כעילוי. כיהן כרב בגלינא, בסאנוק ובפיוטרקוב, ובשנת 1931 התמנה לרבה של לובלין. עמד בראש אגודת ישראל בפולין והיה חבר בסיים הפולני. בשנת 1923 הציע את לימוד ׳הדף היומי׳, ובשנת 1930 חנך את ישיבת חכמי לובלין. נפטר בז׳ בחשוון תרצ״ד בגיל 46, ובשנת 1958 הועלו עצמותיו להר המנוחות בירושלים.',
      en: 'Rabbi Yehuda Meir Shapiro (1887–1933), the Lubliner Rav. Born in Suceava (Shatz), Bukovina, he was known as a prodigy. He served as rabbi of Galina, Sanok and Piotrków, and from 1931 of Lublin. He headed Agudath Israel in Poland and sat in the Polish Sejm. In 1923 he proposed Daf Yomi, and in 1930 he opened Yeshivat Chachmei Lublin. He died on 7 Cheshvan 5694, aged 46; in 1958 his remains were reinterred on Har HaMenuchot, Jerusalem.',
    },
    lessons: [
      {
        title: {
          he: 'דף אחד, עם אחד',
          en: 'One page, one people',
        },
        text: {
          he: 'ביוזמת ׳הדף היומי׳ לומדים יהודים בכל העולם את אותו דף גמרא באותו יום, ומסיימים את הש״ס כולו בכשבע שנים וחצי. כך הפך הלימוד לחוט המאחד קהילות רחוקות.',
          en: 'Through Daf Yomi, Jews around the world study the same page of Talmud on the same day, completing the whole Talmud in about seven and a half years. Learning became a thread that binds distant communities.',
        },
      },
      {
        title: {
          he: 'כבוד ללומדי תורה',
          en: 'Dignity for Torah students',
        },
        text: {
          he: 'כאב לו שבחורי ישיבה ישנו על ספסלים ונאלצו לבקש ארוחות בבתי בעלי בתים. לכן בנה בלובלין בניין ישיבה גדול, עם מגורים, ספרייה עשירה ודאגה לכל צורכי התלמידים.',
          en: "It pained him that yeshiva students slept on benches and had to ask householders for meals. So in Lublin he built a large yeshiva building with lodging, a rich library and care for all the students' needs.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'אור המאיר',
          en: 'Or HaMeir',
        },
        about: {
          he: 'שאלות ותשובות והתכתבויות הלכתיות עם גדולי דורו, נדפס בפיוטרקוב (1926).',
          en: 'Responsa and halachic correspondence with leading rabbis of his time, printed in Piotrków (1926).',
        },
      },
      {
        title: {
          he: 'אמרי דעת',
          en: 'Imrei Daat',
        },
        about: {
          he: 'חידושיו בהלכה ובאגדה; החיבור אבד במלחמת העולם השנייה.',
          en: 'His novellae on law and lore; the work was lost in World War II.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'רק בשמחה',
          en: 'Only with joy',
        },
        text: {
          he: 'רבי מאיר חלה ונפטר בגיל צעיר, בשנת 1933. ברגעיו האחרונים קרא לתלמידיו וביקש שישירו לפניו, ולפי גרסה אחת גם שישתו ׳לחיים׳. לפני מותו אמר לאחד מהם, ולפי גרסה אחרת כתב: ׳רק בשמחה!׳. המילים האלה נעשו לסמל של דרכו.',
          en: "Rabbi Meir fell ill and died young, in 1933. In his final moments he called in his students and asked them to sing before him, and by one account also to drink 'l'chaim'. Before he died he told one of them, or by another account wrote: 'Only with joy!' Those words became a symbol of his way.",
        },
        source: 'Aish.com, https://aish.com/?p=6282 ; Hebrew Wikipedia, https://he.wikipedia.org/wiki/מאיר_שפירא',
      },
      {
        title: {
          he: 'הצעת הדף היומי',
          en: 'Proposing Daf Yomi',
        },
        text: {
          he: 'בקיץ 1923, בכנסייה הגדולה הראשונה של אגודת ישראל בווינה, הציע רבי מאיר שכל יהודי ילמד דף גמרא אחד ביום, וכולם באותו דף. המחזור הראשון החל בראש השנה תרפ״ד, והמפעל התפשט בכל העולם היהודי ונמשך עד היום.',
          en: 'In summer 1923, at the first Great Assembly of Agudath Israel in Vienna, Rabbi Meir proposed that every Jew study one page of Talmud a day, all on the same page. The first cycle began on Rosh Hashanah 5684, and the program spread across the Jewish world and continues today.',
        },
        source:
          'English Wikipedia, https://en.wikipedia.org/wiki/Meir_Shapiro ; Hebrew Wikipedia, https://he.wikipedia.org/wiki/מאיר_שפירא',
      },
    ],
    grave: {
      place: {
        he: 'הר המנוחות, ירושלים',
        en: 'Har HaMenuchot, Jerusalem',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית העלמין הר המנוחות',
    },
    sources: [
      'https://en.wikipedia.org/wiki/Meir_Shapiro',
      'https://he.wikipedia.org/wiki/מאיר_שפירא',
      'https://aish.com/?p=6282',
      'https://www.dafyomi.co.il/rmeirshapiro-yahrzeit.htm',
      'https://www.algemeiner.com/2025/11/04/doing-the-impossible-the-inspiring-life-story-of-one-of-the-greatest-rabbis-of-the-20th-century/',
    ],
  },
  rav_kook: {
    bio: {
      he: 'הרב אברהם יצחק הכהן קוק (1865–1935), הראי״ה, הרב הראשי האשכנזי הראשון לארץ ישראל בתקופת המנדט. נולד בגריבה שבלטביה, למד בישיבת וולוז׳ין וכיהן כרב בזיימל ובבויסק. בשנת 1904 התמנה לרבה של יפו. מלחמת העולם הראשונה תפסה אותו באירופה, ובלונדון כיהן כרב קהילה. בשנת 1919 שב והתמנה לרבה של ירושלים, ובשנת 1921 לרב הראשי. ייסד את ישיבת מרכז הרב, וכתב בהלכה, באגדה ובהגות. נפטר בג׳ באלול תרצ״ה.',
      en: 'Rabbi Abraham Isaac HaKohen Kook (1865–1935), first Ashkenazi Chief Rabbi of Mandatory Palestine. Born in Griva, Latvia, he studied at Volozhin and served as rabbi of Zaumel and Bauska. In 1904 he became rabbi of Jaffa. Stranded in Europe by World War I, he led a London congregation. Returning in 1919, he became rabbi of Jerusalem, and in 1921 Chief Rabbi. He founded Mercaz HaRav yeshiva and wrote on law, lore and thought. He died on 3 Elul 5695.',
    },
    lessons: [
      {
        title: {
          he: 'אהבת חינם',
          en: 'Unconditional love',
        },
        text: {
          he: 'עיקרון מרכזי בתורתו הוא אהבת חינם לכל יהודי. לדבריו, את החורבן שנגרם בשל שנאת חינם אפשר לתקן רק באהבה ובאחדות, גם כלפי מי שרחוק משמירת המצוות.',
          en: 'A central principle of his teaching is unconditional love for every Jew. In his view, the destruction caused by baseless hatred can be repaired only through love and unity, including toward those far from observance.',
        },
      },
      {
        title: {
          he: 'תשובה כצמיחה',
          en: 'Repentance as growth',
        },
        text: {
          he: 'בספרו ׳אורות התשובה׳ תיאר את התשובה לא רק כתיקון של חטא, אלא כשאיפה טבעית של האדם ושל העולם כולו להשתלם ולהתעלות, תנועה שאינה פוסקת.',
          en: 'In Orot HaTeshuvah he described repentance not only as repairing sin but as the natural striving of the person, and of the whole world, toward perfection and elevation, a movement that never stops.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'אורות',
          en: 'Orot',
        },
        about: {
          he: 'מאמרים על ארץ ישראל, על התחייה ועל קדושת עם ישראל.',
          en: 'Essays on the Land of Israel, national renewal and the holiness of the Jewish people.',
        },
      },
      {
        title: {
          he: 'אורות התשובה',
          en: 'Orot HaTeshuvah',
        },
        about: {
          he: 'על מהות התשובה ותפקידה בחיי האדם והעולם.',
          en: 'On the nature of repentance and its role in the life of the person and the world.',
        },
      },
      {
        title: {
          he: 'עין איה',
          en: 'Ein Ayah',
        },
        about: {
          he: 'פירוש על האגדות שבמסכתות ברכות ושבת.',
          en: 'A commentary on the aggadic passages of tractates Berakhot and Shabbat.',
        },
      },
      {
        title: {
          he: 'עולת ראי״ה',
          en: "Olat Re'iyah",
        },
        about: {
          he: 'פירוש על סדר התפילה.',
          en: 'A commentary on the prayer book.',
        },
      },
      {
        title: {
          he: 'אגרות הראי״ה',
          en: "Igrot HaRe'iyah",
        },
        about: {
          he: 'מכתביו בענייני הלכה, הגות והנהגה.',
          en: 'His letters on law, thought and communal guidance.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'הפרח שלא נקטף',
          en: 'The flower left unpicked',
        },
        text: {
          he: 'רבי אריה לוין סיפר שזמן קצר אחרי שהגיע לארץ ישראל בשנת 1905 ופגש את הרב קוק ביפו, טייל עמו בשדות, ובדרך תלש ענף או פרח. הרב נרתע והסביר בעדינות שמעולם לא תלש עשב או פרח שלא לצורך, והזכיר את דברי חז״ל שאין לך עשב שאין לו מזל ברקיע המכה עליו ואומר לו גדל. רבי אריה כתב שמאז נשאר בו רגש של חמלה לכל נברא.',
          en: "Rabbi Aryeh Levin recalled that soon after reaching the Land of Israel in 1905 and meeting Rav Kook in Jaffa, he joined him on a walk in the fields and plucked a twig or flower. Rav Kook was taken aback and gently explained that he never picked a plant without need, citing the sages' teaching that every blade of grass has a heavenly force urging it to grow. Rabbi Aryeh wrote that he felt compassion for every creature ever after.",
        },
        source:
          'Simcha Raz, A Tzaddik in Our Time, pp. 108–109; retold at Rav Kook Torah, https://ravkooktorah.org/tu-bishvat-73',
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין בהר הזיתים, ירושלים',
        en: 'Mount of Olives cemetery, Jerusalem',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית הקברות הר הזיתים',
    },
    sources: [
      'https://en.wikipedia.org/wiki/Abraham_Isaac_Kook',
      'https://he.wikipedia.org/wiki/אברהם_יצחק_הכהן_קוק',
      'https://ravkooktorah.org/tu-bishvat-73',
      'Simcha Raz, A Tzaddik in Our Time: The Life of Rabbi Aryeh Levin (Feldheim)',
      'https://www.ynet.co.il/articles/0,7340,L-3494570,00.html',
    ],
  },
  rayatz: {
    bio: {
      he: 'רבי יוסף יצחק שניאורסון (1880–1950), הריי״צ, האדמו״ר השישי של חב״ד. נולד בליובאוויטש, בנו היחיד של האדמו״ר הרש״ב, ושימש כמזכירו מגיל צעיר. עמד בראש חב״ד משנת 1920, ובברית המועצות פעל להחזקת החינוך היהודי בסתר. בשנת 1927 נאסר ונידון למוות, ובלחץ בינלאומי שוחרר והורשה לצאת מרוסיה. בשנת 1940 חולץ מוורשה הכבושה והגיע לניו יורק, ושם ייסד מוסדות חינוך והוצאה לאור. נפטר בי׳ בשבט תש״י ונקבר בקווינס.',
      en: "Rabbi Yosef Yitzchak Schneersohn (1880–1950), sixth Rebbe of Chabad. Born in Lubavitch, the only son of the Rebbe Rashab, he was his father's secretary from his teens. Leading Chabad from 1920, he kept Jewish education alive underground in the Soviet Union. Arrested in 1927 and sentenced to death, he was freed under international pressure and left Russia. Rescued from occupied Warsaw in 1940, he built Chabad institutions in New York. He died on 10 Shevat 5710.",
    },
    lessons: [
      {
        title: {
          he: 'מסירות נפש לחינוך',
          en: 'Self-sacrifice for education',
        },
        text: {
          he: 'בשנות השלטון הסובייטי, כשלימוד תורה נרדף, הקים והחזיק מוסדות תורה וחינוך יהודי, אף שידע שהוא מסכן את חייו.',
          en: 'Under Soviet rule, when Torah study was persecuted, he founded and sustained Torah and Jewish educational institutions, knowing that he was putting his life at risk.',
        },
      },
      {
        title: {
          he: 'אמריקה אינה שונה',
          en: 'America is no different',
        },
        text: {
          he: 'כשהגיע לניו יורק בשנת 1940 יעצו לו שלא לנסות לחדש שם את פעולות חב״ד, כי ׳אמריקה שונה׳. הוא השיב שאמריקה אינה שונה, ולמחרת פתח ישיבה. מכאן למדו שחיים יהודיים מלאים אפשריים בכל מקום.',
          en: "Arriving in New York in 1940, he was advised not to renew Chabad's work there, because 'America is different.' He answered that America is no different, and the next day opened a yeshiva: full Jewish life is possible anywhere.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'ספר המאמרים',
          en: 'Sefer HaMaamarim',
        },
        about: {
          he: 'מאמרי החסידות שאמר במשך השנים, בכרכים רבים.',
          en: 'The Hasidic discourses he delivered over the years, in many volumes.',
        },
      },
      {
        title: {
          he: 'ספר השיחות',
          en: 'Sefer HaSichot',
        },
        about: {
          he: 'שיחותיו בהתוועדויות, בהן הוראות, סיפורים ודברי חסידות.',
          en: 'His talks at Hasidic gatherings, with guidance, stories and teachings.',
        },
      },
      {
        title: {
          he: 'ספר הזכרונות',
          en: 'Sefer HaZichronot',
        },
        about: {
          he: 'זיכרונות על תולדות החסידות ועל דמויות מחב״ד.',
          en: 'Memoirs on the history of Hasidism and figures of Chabad.',
        },
      },
      {
        title: {
          he: 'אגרות קודש',
          en: 'Igrot Kodesh',
        },
        about: {
          he: 'מכתביו לחסידים ולקהילות בנושאי הדרכה, חינוך וחסידות.',
          en: 'His letters to Hasidim and communities on guidance, education and Hasidism.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'אל אחד ושני עולמות',
          en: 'One God and two worlds',
        },
        text: {
          he: 'בשנות ה-20, באחת מחקירותיו בידי השלטונות הסובייטיים, שלף החוקר אקדח כדי להפחיד אותו. הרבי השיב בשלווה שצעצוע כזה מפחיד רק את מי שיש לו עולם אחד ואלים רבים. לו, אמר, יש אל אחד ושני עולמות.',
          en: 'In the 1920s, during one of his interrogations by the Soviet authorities, the interrogator drew a gun to frighten him. The Rebbe calmly replied that such a toy frightens only someone who has one world and many gods. He, he said, had one God and two worlds.',
        },
        source:
          "Chabad.org, 'Bravery' (citing Likkutei Sichos vol. 3, p. 806), https://www.chabad.org/library/article_cdo/aid/2606160/jewish/Bravery.htm ; Chabad.org, 'Define Your G-d', https://www.chabad.org/library/article_cdo/aid/3382871/jewish/Define-Your-Gd.htm",
      },
      {
        title: {
          he: 'חג הגאולה',
          en: 'The festival of liberation',
        },
        text: {
          he: 'בשנת 1927 נאסר הרבי בלנינגרד ונידון למוות. מחאה בינלאומית הביאה להמרת העונש בגלות לעיר קוסטרומה. בי״ב בתמוז, יום הולדתו, הודיעו לו על שחרורו, והוא שוחרר בפועל למחרת. מאז מציינים חסידי חב״ד את י״ב–י״ג בתמוז כחג הגאולה.',
          en: 'In 1927 the Rebbe was arrested in Leningrad and sentenced to death. International protest led to the sentence being commuted to exile in Kostroma. On 12 Tammuz, his birthday, he was told of his release, which took effect the next day. Chabad Hasidim have marked 12–13 Tammuz as a festival of liberation ever since.',
        },
        source:
          "English Wikipedia, '12–13 Tammuz', https://en.wikipedia.org/wiki/12%E2%80%9313_Tammuz ; English Wikipedia, https://en.wikipedia.org/wiki/Yosef_Yitzchak_Schneersohn",
      },
    ],
    grave: {
      place: {
        he: 'האוהל בבית העלמין מונטיפיורי, קווינס, ניו יורק',
        en: 'The Ohel, Old Montefiore Cemetery, Queens, New York',
      },
      lat: 40.68604,
      lng: -73.73745,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Yosef_Yitzchak_Schneersohn',
      'https://en.wikipedia.org/wiki/12%E2%80%9313_Tammuz',
      'https://jewishvirtuallibrary.org/jsource/biography/schneersohn.html',
      'https://www.chabad.org/library/article_cdo/aid/2606160/jewish/Bravery.htm',
      'https://www.chabad.org/therebbe/livingtorah/player_cdo/aid/363466/jewish/Program-Seventy-Eight.htm',
      'https://en.wikipedia.org/wiki/Ohel_(Chabad-Lubavitch)',
    ],
  },
  chazon_ish: {
    bio: {
      he: 'רבי אברהם ישעיהו קרליץ (1878–1953), המכונה ׳החזון איש׳ על שם סדרת ספריו. נולד בקוסובה שבבלארוס של היום, ולמד בעיקר אצל אביו ובכוחות עצמו. מעולם לא כיהן במשרה רבנית רשמית, ובמשך שנים פרנסה אשתו את המשפחה מחנות בדים. בשנת 1933 עלה לארץ ישראל והשתקע בבני ברק, ונעשה לאחד מגדולי הפוסקים בדורו. עסק בשאלות הלכה חדשות, בשיעורי ההלכה ובמצוות התלויות בארץ. נפטר בט״ו בחשוון תשי״ד.',
      en: "Rabbi Avraham Yeshayahu Karelitz (1878–1953), called the Chazon Ish after his series of works. Born in Kosava (today in Belarus), he learned mainly from his father and on his own. He never held an official rabbinic post; for years his wife's fabric shop supported them. He moved to the Land of Israel in 1933, settling in Bnei Brak, and became a leading halachic authority, addressing new questions, halachic measures and the Land's agricultural laws. He died on 15 Cheshvan 5714.",
    },
    lessons: [
      {
        title: {
          he: 'אמונה וביטחון',
          en: 'Faith and trust',
        },
        text: {
          he: 'בספרו ׳אמונה ובטחון׳ הסביר שביטחון אינו הבטחה שהכול יסתיים כפי שהאדם רוצה, אלא ההכרה שאין דבר מקרי ושהכול נעשה בהשגחת ה׳.',
          en: "In Emunah u'Bitachon he explained that trust in God is not a promise that everything will turn out as one wishes, but the recognition that nothing happens by chance and all is under divine providence.",
        },
      },
      {
        title: {
          he: 'דיוק במצוות',
          en: 'Precision in the commandments',
        },
        text: {
          he: 'ראה בהקפדה על הפרטים הקטנים ביותר של ההלכה ערובה ליראת שמים, והקדיש לכך את השער ׳מוסר והלכה׳ בספרו ׳אמונה ובטחון׳.',
          en: "He saw careful attention to the smallest details of halacha as a safeguard of the fear of Heaven, and devoted the section 'Ethics and Halacha' of Emunah u'Bitachon to this idea.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'חזון איש',
          en: 'Chazon Ish',
        },
        about: {
          he: 'סדרה של 23 כרכים על התלמוד והשולחן ערוך; הכרך הראשון יצא בעילום שם בשנת 1911.',
          en: 'A 23-volume series on the Talmud and Shulchan Aruch; the first volume appeared anonymously in 1911.',
        },
      },
      {
        title: {
          he: 'אמונה ובטחון',
          en: "Emunah u'Bitachon",
        },
        about: {
          he: 'חיבור הגות על אמונה, ביטחון, מוסר והלכה.',
          en: 'A work of thought on faith, trust in God, ethics and halacha.',
        },
      },
      {
        title: {
          he: 'קובץ אגרות חזון איש',
          en: 'Kovetz Igrot Chazon Ish',
        },
        about: {
          he: 'לקט מאיגרותיו בשלושה חלקים, בנושאים רבים.',
          en: 'A three-part collection of his letters on many subjects.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'כבוד המת בימי מגפה',
          en: 'Honoring the dead in an epidemic',
        },
        text: {
          he: 'בשנות מלחמת העולם הראשונה, בעיירה סטויבץ, פרצה מגפה, ואנשי החברה קדישא חששו לקבור את המתים מפחד הידבקות. החזון איש נטל בעצמו אחד מהמתים על כתפיו ונשא אותו לבית הקברות, ומעשהו החזיר את אנשי החברה קדישא לתפקידם. לימים הסביר שאילו נשארו המתים בלי קבורה, היו כל תושבי העיר בסכנה.',
          en: 'During the World War I years, in the town of Stoibtz, an epidemic broke out and the burial society feared to bury the dead lest they be infected. The Chazon Ish himself lifted one of the dead onto his shoulders and carried him to the cemetery, and his act brought the burial society back to its work. He later explained that had the dead been left unburied, the whole town would have been in danger.',
        },
        source:
          'English Wikipedia (citing Rabbi Shmaryahu Greineman), https://en.wikipedia.org/wiki/Avrohom_Yeshaya_Karelitz ; the book Maase Ish, as retold at https://ahavasshalom.org/your-life-may-depend-on-it/',
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין שומרי שבת, בני ברק',
        en: 'Shomrei Shabbat cemetery, Bnei Brak',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית העלמין שומרי שבת בני ברק',
    },
    sources: [
      'https://en.wikipedia.org/wiki/Avrohom_Yeshaya_Karelitz',
      'https://he.wikipedia.org/wiki/אברהם_ישעיהו_קרליץ',
      'https://ahavasshalom.org/your-life-may-depend-on-it/',
      'https://www.theyeshivaworld.com/news/general/41517/videos-photos-yartzheits-of-chazon-ish-maran-hagon-rav-shach-zatzal-5770.html',
      "Avraham Yeshayahu Karelitz, Emunah u'Bitachon",
    ],
  },
  isser_zalman_meltzer: {
    bio: {
      he: 'רבי איסר זלמן מלצר, מגדולי ראשי הישיבות בליטא ובירושלים, נולד במיר בשנת תר״ל (1870) ולמד בוולוז׳ין אצל הנצי״ב ורבי חיים מבריסק. עמד בראש ישיבת סלבודקה ואחר כך בראש הישיבה בסלוצק, וכיהן כרבה של העיר כעשרים שנה. בשנת תרפ״ה (1925) עלה לירושלים ועמד בראש ישיבת עץ חיים עד יום פטירתו. חיבורו ״אבן האזל״ על הרמב״ם נלמד בכל עולם הישיבות. נפטר בי׳ בכסלו תשי״ד ונקבר בהר המנוחות.',
      en: 'Rabbi Isser Zalman Meltzer, born in Mir in 1870, a leading rosh yeshiva, studied at Volozhin under the Netziv and Rabbi Chaim of Brisk. He headed the Slobodka yeshiva, then the Slutsk yeshiva, where he was also town rabbi for about twenty years. From 1925 until his death he headed the Etz Chaim yeshiva in Jerusalem. His Even HaEzel on the Rambam is studied in every yeshiva. He died on 10 Kislev 5714 (1953) and was buried on Har HaMenuchot.',
    },
    lessons: [
      {
        title: {
          he: 'עין טובה',
          en: 'A good eye',
        },
        text: {
          he: 'המשגיח רבי מאיר חדש סיפר שהייתה לו ״עין טובה״ יוצאת דופן: תמיד ראה את הטוב שבזולתו והחשיב אותו כטוב ממנו. מי שמחפש את מעלות האחר לומד ממנו ומכבד אותו.',
          en: "The mashgiach Rabbi Meir Chodosh said he had an unusual 'good eye': he always saw the best in others and considered them better than himself. Looking for the virtues of others lets us learn from them and honor them.",
        },
      },
      {
        title: {
          he: 'כל תלמיד כבן יחיד',
          en: 'Every student an only child',
        },
        text: {
          he: 'תלמידיו סיפרו שכל אחד מהם הרגיש אצלו כבן יחיד. ארבעים שנה אחרי שהרחיק תלמיד מהישיבה בסלוצק, עוד דאג שמא סטה מן הדרך. מחנך אמיתי נושא את תלמידיו בלבו.',
          en: 'His students said each of them felt like an only child to him. Forty years after expelling a student in Slutsk, he still worried that the young man had strayed. A true teacher carries his students in his heart.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'אבן האזל',
          en: 'Even HaEzel',
        },
        about: {
          he: 'חיבורו המרכזי על משנה תורה לרמב״ם, בשבעה כרכים; הראשון יצא בשנת 1935 והאחרון לאחר פטירתו.',
          en: "His main work, a seven-volume commentary on Maimonides' Mishneh Torah; the first volume appeared in 1935 and the last after his death.",
        },
      },
      {
        title: {
          he: 'הגהות וביאורים על חידושי הרמב״ן',
          en: "Notes and Explanations on the Ramban's Novellae",
        },
        about: {
          he: 'הערות וביאורים על חידושי הרמב״ן לתלמוד הבבלי.',
          en: "Notes and explanations on the Ramban's novellae on the Babylonian Talmud.",
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'החדר בבית הקצב',
          en: "The room at the butcher's",
        },
        text: {
          he: 'בימי אירוסיו, כשלמד בראדין, שכר איסר זלמן חדר אצל קצב שפרש את עורות הבהמות ליד חלונו. הריח פגע בבריאותו, אך הוא סירב לעזוב, כדי שלא לפגוע בפרנסת הקצב. לבסוף חלה בשחפת וחזר לבית הוריו במיר. משפחת הכלה לחצה עליה לבטל את השידוך, אך הכלה, בילה הינדה, סירבה, והשניים נישאו לאחר שהחלים.',
          en: "During his engagement, while studying in Radin, Isser Zalman rented a room from a butcher who spread animal hides by his window. The smell harmed his health, yet he refused to leave, so as not to hurt the butcher's livelihood. He finally fell ill with tuberculosis and went home to his parents in Mir. The bride's family pressed her to cancel the match, but the bride, Beila Hinda, refused, and they married after he recovered.",
        },
        source:
          "Hebrew Wikipedia 'איסר זלמן מלצר': https://he.wikipedia.org/wiki/איסר_זלמן_מלצר; English Wikipedia 'Isser Zalman Meltzer': https://en.wikipedia.org/wiki/Isser_Zalman_Meltzer; Kikar HaShabbat, 10 Kislev 5785 (the engagement): https://www.kikar.co.il/judaism/soblsa",
      },
      {
        title: {
          he: 'ניירות עטיפה בקיץ תש״ח',
          en: 'Wrapping paper in the summer of 1948',
        },
        text: {
          he: 'במצור על ירושלים במלחמת העצמאות נפצע הרב מלצר ברגלו, והחלים בבית חתנו בפתח תקווה. הרב טוביה פרשל, שביקר אותו שם בקיץ תש״ח, מצא אותו שוכב על ספה ומשוחח בחביבות. רעייתו ישבה ליד השולחן והעתיקה את חידושיו לכרך נוסף של ״אבן האזל״, על ניירות עטיפה שיישרה, כי נייר הכתיבה אזל.',
          en: "Wounded in the leg during the siege of Jerusalem in 1948, Rabbi Meltzer recovered at his son-in-law's home in Petah Tikva. Rabbi Tovia Preschel, who visited him there that summer, found him on a couch, warm and lively. His wife sat at the table copying his Torah for another volume of Even HaEzel, on used wrapping paper she had smoothed out, since writing paper had run out.",
        },
        source:
          "Tovia Preschel, 'A Visit to Rav Isser Zalman Meltzer': https://toviapreschel.com/?p=10423; English Wikipedia 'Isser Zalman Meltzer' (the paper shortage): https://en.wikipedia.org/wiki/Isser_Zalman_Meltzer",
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין הר המנוחות, ירושלים',
        en: 'Har HaMenuchot cemetery, Jerusalem',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית העלמין הר המנוחות',
    },
    sources: [
      'https://he.wikipedia.org/wiki/איסר_זלמן_מלצר',
      'https://en.wikipedia.org/wiki/Isser_Zalman_Meltzer',
      'https://www.kikar.co.il/judaism/soblsa',
      'https://chareidi.org/archives5765/toldos/omeltzer.htm',
      'https://toviapreschel.com/?p=10423',
      'https://www.jdn.co.il/beit_hamidrash/1866537/',
    ],
  },
  chaim_chouri: {
    bio: {
      he: 'רבי חיים חורי נולד בשנת תרמ״ה (1885) ברובע חארה צגירה שבאי ג׳רבה בתוניסיה, ולמד אצל הרב משה זקן מאזוז ורבי פראג׳י עלוש. בגיל 18 הוסמך לרבנות, ומשנת 1926 כיהן כרב העיר גאבס. הקים בה את ישיבת ״תורה וחיים״ ומוסדות צדקה, הדפיס ספרים ותרגם חלקם לערבית יהודית. בגיל שבעים עלה לארץ והשתקע בבאר שבע. נפטר בכ״ה באייר תשי״ז, וקברו נעשה מקום תפילה לאלפים.',
      en: 'Rabbi Chaim Chouri was born in 1885 in the Hara Sghira quarter of Djerba, Tunisia, and studied with Rabbi Moshe Zaken Mazuz and Rabbi Fraji Allouche. Ordained at 18, he became rabbi of Gabes in 1926. There he founded the Torah VeChaim yeshiva and charitable institutions, and printed books, translating some into Judeo-Arabic. At seventy he made aliyah and settled in Beersheba. He died on 25 Iyar 5717 (1957), and his grave became a place of prayer for thousands.',
    },
    lessons: [
      {
        title: {
          he: 'בית פתוח',
          en: 'An open home',
        },
        text: {
          he: 'ביתו היה פתוח לכל נזקק, ולפי המסופר כל אורח שהגיע לעיר ידע שימצא אצלו ארוחה חמה ומיטה, בלי תשלום. הכנסת אורחים מתחילה בדלת פתוחה.',
          en: 'His home was open to anyone in need. It is told that every visitor to the town knew a hot meal and a bed awaited him there, free of charge. Hospitality begins with an open door.',
        },
      },
      {
        title: {
          he: 'אהבת ארץ ישראל במעשים',
          en: 'Love of the Land in deeds',
        },
        text: {
          he: 'בשנת 1917 היה ממייסדי אגודת ״עטרת ציון״, שלימדה עברית ועבודת אדמה כהכנה לעלייה, ועודד את יהודי תוניסיה לעלות. בגיל שבעים עלה בעצמו. אהבה אמיתית הופכת למעשים.',
          en: 'In 1917 he helped found the Atarat Tzion society, which taught Hebrew and farming to prepare for aliyah, and he urged the Jews of Tunisia to go. At seventy he went himself. True love turns into deeds.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'דרך חיים',
          en: 'Derech Chaim',
        },
        about: {
          he: 'חיבור על התורה ועל הש״ס.',
          en: 'A work on the Torah and the Talmud.',
        },
      },
      {
        title: {
          he: 'חסד ואמת',
          en: 'Chesed VeEmet',
        },
        about: {
          he: 'דרושים וביאורים לזכר חכמים שונים.',
          en: 'Sermons and explanations in memory of various sages.',
        },
      },
      {
        title: {
          he: 'מצא חיים',
          en: 'Matza Chaim',
        },
        about: {
          he: 'דרשות, חידושים על התלמוד ושאלות ותשובות.',
          en: 'Sermons, insights on the Talmud and responsa.',
        },
      },
      {
        title: {
          he: 'נפלאות גדולות',
          en: "Nifla'ot Gedolot",
        },
        about: {
          he: 'דרשות שהודפסו בג׳רבה בשנת 1940.',
          en: 'Sermons printed in Djerba in 1940.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'שמיכות לעניי העיר',
          en: 'Blankets for the poor',
        },
        text: {
          he: 'מסופר שבלילה קר אחד לא מצא רבי חיים מנוחה, כי ידע שלעניי העיר אין שמיכות. למחרת בבוקר כינס את עשירי הקהילה, וכל אחד מהם תרם כדי לקנות שמיכות לנזקקים.',
          en: 'It is told that on one cold night Rabbi Chaim could find no rest, knowing that the poor of the town had no blankets. The next morning he gathered the wealthy members of the community, and each of them gave money to buy blankets for the needy.',
        },
        source: 'Naama Green, Hidabroot, 4 May 2021 (https://www.hidabroot.org/article/1153742)',
      },
      {
        title: {
          he: 'הקדוש של באר שבע',
          en: 'The Saint of Beersheba',
        },
        text: {
          he: 'רבי חיים חי בבאר שבע שנים ספורות בלבד, אך אחרי פטירתו נבנה אוהל על קברו, והילולתו השנתית מושכת אלפים, רבים מהם עולים מתוניסיה וממרוקו. האנתרופולוג אלכס וינגרוד חקר אותה בשנות השבעים והשמונים, וכתב עליה את הספר ״הקדוש של באר שבע״.',
          en: 'Rabbi Chaim lived in Beersheba only a few years, yet after his death an ohel was built over his grave, and his yearly hilula draws thousands, many of them immigrants from Tunisia and Morocco. The anthropologist Alex Weingrod studied it in the 1970s and 1980s and wrote a book about it, The Saint of Beersheba.',
        },
        source:
          'Alex Weingrod, The Saint of Beersheba (SUNY Press, 1990), summarized by eHRAF World Cultures (https://ehrafworldcultures.yale.edu/cultures/mf01/documents/015); Hebrew Wikipedia, חיים חורי (https://he.wikipedia.org/wiki/חיים_חורי); BR7 News, 69th hilula (https://br7news.co.il/he/news/news-1777801934)',
      },
    ],
    grave: {
      place: {
        he: 'אוהל רבי חיים חורי בחלקת הרבנים, בית העלמין הישן, באר שבע',
        en: "Ohel of Rabbi Chaim Chouri in the rabbis' section, Old Cemetery, Beersheba",
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית העלמין הישן באר שבע',
    },
    sources: [
      'https://he.wikipedia.org/wiki/חיים_חורי',
      'https://fr.wikipedia.org/wiki/Haïm_Houri',
      'https://br7news.co.il/he/news/news-1777801934',
      'https://www.hidabroot.org/article/1153742',
      'https://breslevcity.co.il/רבי-חיים-חורי/',
      'https://ehrafworldcultures.yale.edu/cultures/mf01/documents/015',
      'https://he.wikipedia.org/wiki/בית_העלמין_הישן_בבאר_שבע',
      'https://openlibrary.org/works/OL20020044M',
    ],
  },
  aharon_of_belz: {
    bio: {
      he: 'רבי אהרן רוקח, המהר״א מבעלזא, נולד בבעלזא שבגליציה בשנת 1880, בנו של רבי יששכר דב מבעלזא. בשנת ה׳תרפ״ז, אחרי פטירת אביו, נעשה לרבה של בעלזא ולאדמו״ר הרביעי של חסידות בעלזא. בשואה נרצחו רוב בני משפחתו, והוא נמלט דרך הונגריה ועלה לארץ ישראל בשנת ה׳תש״ד. התיישב תחילה בתל אביב ואחר כך בירושלים, ושם בנה מחדש את חסידות בעלזא. נודע בצדקותו, באכילתו המועטת ובאהבתו לכל יהודי. נפטר במוצאי שבת, בכ״א באב תשי״ז.',
      en: 'Rabbi Aharon Rokeach was born in Belz, Galicia, in 1880, son of Rabbi Yissachar Dov. In 1926 he succeeded his father as the fourth Belzer Rebbe. Most of his family was murdered in the Holocaust; he escaped through Hungary and reached the Land of Israel in 1944. Settling in Tel Aviv, then Jerusalem, he rebuilt Belz Chassidism. He was known for piety, sparse eating and love for every Jew. He died on motzaei Shabbat, 21 Av 5717 (1957).',
    },
    lessons: [
      {
        title: {
          he: 'ללמד זכות על כל יהודי',
          en: 'Defending every Jew',
        },
        text: {
          he: 'נהג לומר שכשם שמתייגעים ליישב דברי רמב״ם קשים, כך מצווה להתייגע וליישב יהודי שמעשיו נראים קשים. מי שמחפש את הצד הטוב בכל אדם, מוצא אותו.',
          en: 'He used to say that just as one toils to resolve a difficult Rambam, it is a mitzvah to toil to explain favorably a Jew whose conduct seems difficult. Whoever looks for the good in people finds it.',
        },
      },
      {
        title: {
          he: 'מילים רכות',
          en: 'Gentle words',
        },
        text: {
          he: 'לא היה מכנה שום יהודי ״מחלל שבת״, אלא אומר שהוא שכח את חשיבות השבת או חשב שהיום יום שישי. גם כשמדברים על חטא, אפשר לבחור מילים שאינן פוגעות באדם.',
          en: 'He would not call any Jew a Shabbat desecrator; instead he said the person had forgotten the importance of Shabbat or thought it was Friday. Even when speaking of a wrong, one can choose words that do not wound.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'לקט אמרי קודש',
          en: 'Leket Imrei Kodesh',
        },
        about: {
          he: 'דברי תורתו, שרשמו חסידיו וליקט רבי אהרן רינגל, בשישה כרכים.',
          en: 'His Torah teachings, recorded by his Chassidim and collected by Rabbi Aharon Ringel, in six volumes.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'הילד הבוכה',
          en: 'The crying child',
        },
        text: {
          he: 'מסופר שבימים הנוראים בבעלזא עמד ילד קטן בתוך הקהל ובכה. אחד המתפללים חשש שנדחק, ושאל אותו מדוע הוא בוכה. הילד, אהרן הצעיר, ענה שהוא בוכה מפני שכולם בוכים. האיש אמר לו שאין לו עוונות לבכות עליהם, והילד השיב: גם סבי בוכה, ואין לו עוונות.',
          en: 'It is told that during the Days of Awe in Belz a small boy stood crying in the crowd. A worshipper feared he had been crushed and asked why he was crying. The boy, young Aharon, said he was crying because everyone was crying. The man told him he had no sins to weep for, and the boy replied: my grandfather is crying too, and he has no sins.',
        },
        source:
          'Vos Iz Neias, Rav Aharon Rokeach of Belz on His Yahrtzeit, 4 August 2026 (https://vinnews.com/2026/08/04/rav-aharon-rokeach-of-belz-ztl-on-his-yahrtzeit-21-av/)',
      },
      {
        title: {
          he: 'על מה חשב הרבי',
          en: 'What the Rebbe was thinking',
        },
        text: {
          he: 'רבי משה וועבער, מחסידי בעלזא, סיפר שפעם חלה הרבי והוזעק אליו רופא. הרופא ראה שהרבי שקוע כל העת במחשבות, ושאל אותו על מה הוא חושב. הרבי השיב: ״אני חושב טוב על יהודים״.',
          en: "Rabbi Moshe Weber, a Belz Chassid, recounted that once, when the Rebbe fell ill, a doctor was called to him. Seeing the Rebbe constantly deep in thought, the doctor asked what he was thinking about. The Rebbe answered: 'I am thinking good thoughts about Jews.'",
        },
        source: 'JDN, Hilula Kadisha: Rabbi Aharon of Belz, 21 Av 5786 (https://www.jdn.co.il/beit_hamidrash/1809363/)',
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין הר המנוחות, ירושלים, בחלקת גדולי הרבנים, סמוך לקבר רבי משה פיינשטיין',
        en: 'Har HaMenuchot cemetery, Jerusalem, in the section of leading rabbis, beside the grave of Rabbi Moshe Feinstein',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית העלמין הר המנוחות',
    },
    sources: [
      'https://he.wikipedia.org/wiki/אהרן_רוקח',
      'https://en.wikipedia.org/wiki/Aharon_Rokeach',
      'https://www.jdn.co.il/beit_hamidrash/1809363/',
      'https://vinnews.com/2026/08/04/rav-aharon-rokeach-of-belz-ztl-on-his-yahrtzeit-21-av/',
      'https://www.kikar.co.il/hasidism/121871',
    ],
  },
  brisker_rav: {
    bio: {
      he: 'רבי יצחק זאב הלוי סולובייצ׳יק, הגרי״ז או הבריסקר רב, נולד בוולוז׳ין בשנת תרמ״ז, בנו של רבי חיים מבריסק. אחרי פטירת אביו בשנת תרע״ח נעשה רבה של בריסק. בפרוץ מלחמת העולם השנייה נמלט לווילנה, ובשנת תש״א הגיע לירושלים; רעייתו ושלושה מילדיו נרצחו בשואה. בירושלים לימד תלמידים בביתו והעמיד מחדש את ישיבת בריסק, ונודע בדקדוקו במצוות. נפטר בערב יום הכיפורים, ט׳ בתשרי תש״ך, ונקבר בהר המנוחות.',
      en: 'Rabbi Yitzchak Zev Soloveitchik, the Brisker Rav, was born in Volozhin in 1886, son of Reb Chaim of Brisk, whom he succeeded as its rabbi in 1918. In World War II he fled to Vilna, reaching Jerusalem in 1941; his wife and three of his children were murdered in the Holocaust. There he re-established the Brisk yeshiva and was known for exactness in mitzvot. He died on erev Yom Kippur, 9 Tishrei 5720 (1959), and is buried on Har HaMenuchot.',
    },
    lessons: [
      {
        title: {
          he: 'מצווה בשלמותה',
          en: 'A mitzvah done completely',
        },
        text: {
          he: 'הגרי״ז נודע בהקפדתו לקיים מצוות כך שיצא ידי כל הדעות במחלוקת הפוסקים. מכאן שמצווה ראויה להיעשות בשלמות, בזהירות ובדקדוק בכל פרט.',
          en: 'The Brisker Rav was known for performing mitzvot so as to satisfy every opinion in a halachic dispute. A mitzvah deserves to be done completely, with care for every detail.',
        },
      },
      {
        title: {
          he: 'ללמוד מתוך הספר',
          en: 'Reading from the book itself',
        },
        text: {
          he: 'כשאמר דברי תורה לא ציטט מזיכרונו, אלא קרא כל מקור מתוך הספר עצמו. דיוק בלשון המקור הוא חלק מהנאמנות לתורה.',
          en: "When he taught, he did not quote from memory but read every source from the original book. Precision in a source's wording is part of faithfulness to the Torah.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'חדושי מרן רי״ז הלוי',
          en: 'Chiddushei Maran Riz HaLevi',
        },
        about: {
          he: 'חידושיו לפי סדר משנה תורה לרמב״ם, שבניו הדפיסו בירושלים אחרי פטירתו.',
          en: "His insights arranged by the order of Maimonides' Mishneh Torah, printed by his sons in Jerusalem after his death.",
        },
      },
      {
        title: {
          he: 'חדושי מרן רי״ז הלוי על התורה',
          en: 'Chiddushei Maran Riz HaLevi on the Torah',
        },
        about: {
          he: 'חידושיו על חמשת חומשי התורה.',
          en: 'His insights on the Five Books of the Torah.',
        },
      },
      {
        title: {
          he: 'חידושי הגרי״ז (סטנסיל)',
          en: 'Chiddushei HaGriz (the stencil)',
        },
        about: {
          he: 'חידושיו על מסכתות סדר קדשים, שתלמידיו הדפיסו במכונת כתיבה והפיצו כסטנסיל.',
          en: 'His insights on tractates of Seder Kodashim, typed by his students and circulated as a stencil.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'דג במים ובמלח',
          en: 'Fish in water and salt',
        },
        text: {
          he: 'את ימיו הראשונים בארץ ישראל עשה הבריסקר רב בחיפה. שק הקמח שהביא עמו מטורקיה אזל, וכשמארחיו שאלו מה להגיש לו, ביקש דג מבושל במים ובמלח בלבד. ״שמן צריך תרומות ומעשרות,״ הסביר, ולכן אין להוסיף דבר מלבד מלח ומים.',
          en: "The Brisker Rav spent his first days in the Land of Israel in Haifa. The sack of flour he had brought from Turkey ran out, and when his hosts asked what to serve him, he asked only for fish cooked in water and salt. 'Oil requires terumot and maasrot,' he explained, so nothing should be added but salt and water.",
        },
        source:
          "Yated Ne'eman staff, Stories about the Brisker Rov, Sixty Years Since his Petiroh, Dei'ah veDibur, Succos 5780 (https://chareidi.org/archives5780/succos/abriskerrovscs80.htm)",
      },
      {
        title: {
          he: 'בשעת כל נדרי',
          en: 'As Kol Nidrei began',
        },
        text: {
          he: 'לפני ראש השנה תש״ך אמר הבריסקר רב לתלמידיו שלהיות כאן ביום הכיפורים הוא מותרות. בערב יום הכיפורים, סמוך לשקיעה, כשהמניין בחדר הסמוך החל לומר כל נדרי, נפטר. הידיעה עברה בבתי הכנסת של ירושלים במהלך היום הקדוש, ואחרי יום הכיפורים נקבר בהר המנוחות.',
          en: 'Before Rosh Hashanah 5720 the Brisker Rav told his students that being here for Yom Kippur would be a luxury. On erev Yom Kippur, just before sunset, as the minyan in the next room began Kol Nidrei, he passed away. The news spread through the synagogues of Jerusalem during the holy day, and after Yom Kippur he was buried on Har HaMenuchot.',
        },
        source:
          "Mishpacha, For the Record, issue 1032, 9 October 2024 (https://mishpacha.com/?p=185118); the date and erev Yom Kippur also in Hebrew Wikipedia, 'יצחק זאב סולובייצ׳יק' (https://he.wikipedia.org/wiki/יצחק_זאב_סולובייצ'יק)",
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין הר המנוחות, ירושלים',
        en: 'Har HaMenuchot cemetery, Jerusalem',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית העלמין הר המנוחות',
    },
    sources: [
      "https://he.wikipedia.org/wiki/יצחק_זאב_סולובייצ'יק",
      'https://en.wikipedia.org/wiki/Yitzchok_Zev_Soloveitchik',
      'https://chareidi.org/archives5780/succos/abriskerrovscs80.htm',
      'https://mishpacha.com/?p=185118',
      'https://tzadikim.dailyzohar.com/rabbi-yitzchok-zev-halevi-soloveitchik-1180',
      'https://he.wikipedia.org/wiki/חדושי_מרן_רי%22ז_הלוי',
      'https://amimagazine.org/2019/10/10/an-astounding-relationship/',
    ],
  },
  satmar_rebbe: {
    bio: {
      he: 'רבי יואל טייטלבוים (תרמ״ז–תשל״ט, 1887–1979) נולד בעיר סיגט, אז בממלכת הונגריה וכיום ברומניה. כיהן כרב בכמה קהילות בהונגריה, ומשנת 1934 כרבה של העיר סאטמר. בשואה ניצל דרך מחנה ברגן-בלזן לשווייץ, ובשנת 1946 השתקע בשכונת ויליאמסבורג בברוקלין. שם בנה מחדש את חסידות סאטמר מקבוצה קטנה של פליטים לאחת הקהילות החסידיות הגדולות בעולם, עם מוסדות חינוך וצדקה ועם הכפר קרית יואל, שנקרא על שמו. נפטר בכ״ו באב תשל״ט.',
      en: 'Rabbi Yoel Teitelbaum (1887–1979) was born in Sighet, then in Hungary, today in Romania. He served as rabbi of several Hungarian communities and, from 1934, of Satmar (Satu Mare). He survived the Holocaust, reaching Switzerland via Bergen-Belsen, and in 1946 settled in Williamsburg, Brooklyn. There he rebuilt Satmar Hasidism from a few refugees into one of the largest Hasidic communities, with schools, charities and the village of Kiryas Joel, named after him. He died on 26 Av 5739.',
    },
    lessons: [
      {
        title: {
          he: 'צדקה במעורבות אישית',
          en: 'Charity with personal effort',
        },
        text: {
          he: 'דרש מחסידיו לא רק לתת צדקה אלא גם לצאת ולאסוף אותה בעצמם, כדי שירגישו את צערו של העני. נתינה שיש בה מאמץ אישי מקרבת את הנותן אל מי שזקוק לעזרה.',
          en: 'He asked his followers not only to give charity but to go out and collect it themselves, so they would feel the pain of the poor. Giving that takes personal effort brings the giver closer to those in need.',
        },
      },
      {
        title: {
          he: 'לבנות מחדש אחרי החורבן',
          en: 'Rebuilding after destruction',
        },
        text: {
          he: 'הגיע לאמריקה כפליט אחרי השואה, ואסף סביבו ניצולים שאיבדו הכול. עזר להם להתפרנס ולהקים בתי ספר ומוסדות, ובתוך שנים מעטות קמה קהילה גדולה שעמדה ברשות עצמה.',
          en: 'He arrived in America as a refugee after the Holocaust and gathered survivors who had lost everything. He helped them earn a living and build schools and institutions, and within a few years a large, self-supporting community arose.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'דברי יואל',
          en: 'Divrei Yoel',
        },
        about: {
          he: 'דרשות וחידושים על התורה ועל המועדים.',
          en: 'Sermons and insights on the Torah and the festivals.',
        },
      },
      {
        title: {
          he: 'שו״ת דברי יואל',
          en: 'Responsa Divrei Yoel',
        },
        about: {
          he: 'שאלות ותשובות בהלכה.',
          en: 'Responsa on Jewish law.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'לאסוף בעצמו',
          en: 'Collecting in person',
        },
        text: {
          he: 'לפי המסופר, הרבי מסאטמר הקפיד שחסידיו יאספו צדקה בעצמם, מדלת לדלת. כשנגידים הציעו לתת את כל הסכום מכיסם כדי שלא יצטרכו לחזר על הפתחים, הוא סירב. הוא הסביר שמי שאוסף בעצמו לומד להרגיש את מה שעובר על העני המבקש עזרה. גם על תלמידי ישיבתו הטיל לצאת מדי פעם לאסוף כסף לנזקקים.',
          en: 'According to the account, the Satmar Rebbe insisted that his followers collect charity themselves, door to door. When wealthy men offered to give the whole sum from their own pockets so they would not have to go collecting, he refused. He explained that collecting in person teaches one to feel what a poor man asking for help goes through. He also sent the students of his yeshiva out from time to time to collect for the needy.',
        },
        source:
          "Rabbi Avrohom Chaim Feuer, The Tzedakah Treasury (ArtScroll/Mesorah), as retold in the Hazon letter 'Tales of Tzedakah': https://shemayisrael.com/publicat/hazon/tzedaka/Tales_of_Tzedakah-6.html",
      },
      {
        title: {
          he: 'בגדים לחברים לכיתה',
          en: 'Clothes for his classmates',
        },
        text: {
          he: 'לפי אותו מקור, כבר כילד נהג יואל לתת את ארוחותיו לחבריו הרעבים. כשראה שלילדים העניים אין בגדים חמים ונעליים, שכנע את הילדים מהמשפחות האמידות לאסוף יחד את פרוטותיהם. בכסף שנאסף קנו אצל חייטים וסנדלרים בגדים ונעליים, וחילקו אותם לילדים שנזקקו להם.',
          en: 'According to the same source, as a boy Yoel gave his meals to hungry classmates. When he saw that the poor children lacked warm clothes and shoes, he persuaded the boys from well-off families to pool their pennies. With the money they bought clothes and shoes from local tailors and shoemakers and gave them to the boys who needed them.',
        },
        source:
          "Rabbi Avrohom Chaim Feuer, The Tzedakah Treasury (ArtScroll/Mesorah), as retold in the Hazon letter 'Tales of Tzedakah': https://shemayisrael.com/publicat/hazon/tzedaka/Tales_of_Tzedakah-6.html",
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין של סאטמר, קרית יואל, מדינת ניו יורק',
        en: 'Satmar Cemetery, Kiryas Joel, New York',
      },
      lat: 41.344474,
      lng: -74.175498,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Joel_Teitelbaum',
      'https://jewishvirtuallibrary.org/jsource/biography/teitelbaum.html',
      'https://jta.org/archive/rabbi-joel-teitel-baum-dead-at-93',
      'https://shemayisrael.com/publicat/hazon/tzedaka/Tales_of_Tzedakah-6.html',
      'https://www.theyeshivaworld.com/news/general/1570521/tombstones-knocked-over-in-kiryas-yoel-as-thousands-visit-kever-of-satmar-rebbe-zatzal-on-yartzheit.html',
      'https://www.openstreetmap.org/node/10025875343',
    ],
  },
  tzvi_yehuda_kook: {
    bio: {
      he: 'הרב צבי יהודה הכהן קוק, הרצי״ה (תרנ״א–תשמ״ב, 1891–1982), בנו של הרב אברהם יצחק הכהן קוק, נולד בליטא ועלה לארץ עם משפחתו בשנת 1904. משנת 1923 לימד אמונה ותנ״ך בישיבת מרכז הרב בירושלים, ומשנת 1952 עמד בראשה כשלושים שנה. שנים רבות ערך והוציא לאור את כתבי אביו, ובהם ״אורות״ ו״אורות התשובה״. אחרי פטירת רעייתו חי בגפו כארבעים שנה. נפטר בפורים, י״ד באדר תשמ״ב.',
      en: "Rabbi Tzvi Yehuda HaKohen Kook, the Ratziyah (1891–1982), son of Rabbi Avraham Yitzchak Kook, was born in Lithuania and came to the Land of Israel with his family in 1904. From 1923 he taught faith and Tanach at Merkaz HaRav in Jerusalem, and from 1952 headed the yeshiva for some thirty years. For decades he edited and published his father's writings, including Orot and Orot HaTeshuvah. Widowed, he lived alone about forty years. He died on Purim, 14 Adar 5742.",
    },
    lessons: [
      {
        title: {
          he: 'אהבת כל יהודי',
          en: 'Love for every Jew',
        },
        text: {
          he: 'לימד את תלמידיו לאהוב כל יהודי, חילוני או חרדי. אהבת הבריות, אמר, יש לה ערך בפני עצמה, ולא רק כאמצעי לקרב אנשים לתורה.',
          en: 'He taught his students to love every Jew, secular or Haredi. Love of people, he said, has worth of its own, not only as a means of drawing them closer to Torah.',
        },
      },
      {
        title: {
          he: 'כבוד לתורת רבו',
          en: "Reverence for his teacher's words",
        },
        text: {
          he: 'מתוך יראת כבוד לכתבי אביו ורבו, נהג לעתים קרובות לקרוא אותם לפני תלמידיו בלי להוסיף פירוש משלו, והקדיש שנים רבות לעריכתם ולהוצאתם לאור.',
          en: 'Out of awe for the writings of his father and teacher, he often simply read them aloud to his students without adding a commentary of his own, and gave many years to editing and publishing them.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'לנתיבות ישראל',
          en: 'LeNetivot Yisrael',
        },
        about: {
          he: 'מאמריו, בשני כרכים.',
          en: 'His essays, in two volumes.',
        },
      },
      {
        title: {
          he: 'שיחות הרב צבי יהודה',
          en: 'Sichot HaRav Tzvi Yehuda',
        },
        about: {
          he: 'שיחותיו, כפי שנרשמו בידי תלמידיו.',
          en: 'His talks, as recorded by his students.',
        },
      },
      {
        title: {
          he: 'מתוך התורה הגואלת',
          en: 'MiToch HaTorah HaGoelet',
        },
        about: {
          he: 'סדרה של שיחותיו, שכתב מפיו תלמידו הרב חיים אביהו שוורץ.',
          en: 'A series of his talks, written down from his words by his student Rabbi Chaim Avihu Schwartz.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'שיעור לתלמיד אחד',
          en: 'A lesson for one student',
        },
        text: {
          he: 'הרב דוד סמסון, מתלמידיו, חלה ביומו הראשון בישיבה ולא הגיע לשיעור הפתיחה. כשחזר ושאל על השיעור אחרי תפילת שחרית, שאל אותו ראש הישיבה קודם כול לשלומו, ואחר כך ישב עמו לבדו כשעה וחזר על השיעור כולו, בזמן שתלמידים אחרים חיכו.',
          en: 'Rabbi David Samson, one of his students, fell ill on his first day at the yeshiva and missed the opening lecture. When he returned and asked about it after the morning prayers, the rosh yeshiva first asked about his health, then sat with him alone for nearly an hour and went over the whole lesson while other students waited.',
        },
        source:
          'Israel National News, interview with Rabbi David Samson by Tzvi Fishman (https://www.israelnationalnews.com/news/385643)',
      },
      {
        title: {
          he: 'ספרים בלי שער',
          en: 'Books without title pages',
        },
        text: {
          he: 'הרב צבי יהודה נודע בזיכרונו: כששאלו אותו על מקור, ציין אותו במדויק ותיקן ציטוטים שגויים. לפי תלמידו הרב אליעזר מלמד, אחרי מלחמת העולם השנייה הביאו לו ספרנים ספרים ששעריהם חסרו, ופעמים רבות זיהה מזיכרונו את שם הספר ואת מחברו.',
          en: 'Rabbi Tzvi Yehuda was known for his memory: asked for a source, he gave it exactly and corrected misquotations. According to his student Rabbi Eliezer Melamed, after World War II librarians brought him books whose title pages were missing, and many times he identified the title and the author from memory.',
        },
        source:
          "Rabbi Eliezer Melamed, Revivim, 'Rabbi Tzvi Yehuda – The Generation's Educator' (https://en.yhb.org.il/revivim982/)",
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות בהר הזיתים, ירושלים, לצד קבר אביו; הביקור דורש תיאום ביטחוני או ליווי',
        en: 'Mount of Olives cemetery, Jerusalem, beside his father; a visit needs security coordination or an escort',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית הקברות הר הזיתים',
    },
    sources: [
      'https://he.wikipedia.org/wiki/צבי_יהודה_קוק',
      'https://www.inn.co.il/news/539279',
      'https://machonmeir.net/?p=213856',
      'https://www.israelnationalnews.com/news/385643',
      'https://en.yhb.org.il/revivim982/',
      'https://www.inn.co.il/news/602560',
    ],
  },
  baba_meir: {
    bio: {
      he: 'רבי מאיר אבוחצירא, המכונה ״בבא מאיר״ (תרע״ז–תשמ״ג, 1917–1983), בנו הבכור של הבבא סאלי ונינו של רבי יעקב אבוחצירא, נולד בחבל תאפילאלת שבמרוקו. נודע כעילוי, ולפי המסופר שלט בתלמוד הבבלי כולו בעל פה. כיהן כרב העיר מידלת ועמד בראש ישיבה בה, ולאחר מכן כרב העיר ארפוד. בשנת תשכ״ה עלה לארץ ישראל, ואחרי תקופה ביבנה התיישב באשדוד, ורבים באו לבקש את ברכתו ועצתו. נפטר בחול המועד פסח, בי״ז בניסן תשמ״ג, פחות משנה לפני אביו.',
      en: 'Rabbi Meir Abuhatzeira, Baba Meir (1917–1983), eldest son of the Baba Sali and great-grandson of Rabbi Yaakov Abuhatzeira, was born in Tafilalt, Morocco. A prodigy, he reportedly knew the whole Babylonian Talmud by heart. He was rabbi of Midelt, heading a yeshiva there, then of Erfoud. In 1965 he moved to Israel: Yavne, then Ashdod, where many sought his blessing and counsel. He died on Chol HaMoed Pesach, 17 Nisan 5743 (1983), less than a year before his father.',
    },
    lessons: [
      {
        title: {
          he: 'שמירת העיניים והפה',
          en: 'Guarding eyes and mouth',
        },
        text: {
          he: 'כשנשאל איך מגיעים למדרגה גבוהה, הצביע על עינו ואחר כך על פיו ואמר: ״עין, פה, צדיק״. מי ששומר את עיניו ממראות אסורים ואת פיו מדיבור רע, מתעלה.',
          en: "Asked how one reaches a high level, he pointed to his eye, then to his mouth, and said: 'Eye, mouth, tzaddik.' One who guards his eyes from forbidden sights and his mouth from bad speech rises higher.",
        },
      },
      {
        title: {
          he: 'ענווה פותחת ברכה',
          en: 'Humility opens blessing',
        },
        text: {
          he: 'לאדם שהיה נשוי ארבע עשרה שנה בלי ילדים אמר לעבוד על מידת הענווה, ורמז לפסוק ״שבשפלנו זכר לנו״. לפי המסופר, כעבור תשעה חודשים נולד לו בן. מי שמקטין את עצמו מפנה מקום לברכה.',
          en: "He told a man childless after fourteen years of marriage to work on humility, citing 'who remembered us in our lowliness.' As the story goes, a son was born nine months later. Making oneself small leaves room for blessing.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'יגל יעקב',
          en: 'Yagel Yaakov',
        },
        about: {
          he: 'קובץ פיוטי משפחת אבוחצירא, ובו עשרות שירים שחיבר, שחלקם נפוצים בקהילות יוצאי מרוקו.',
          en: 'The Abuhatzeira family collection of liturgical poems, including dozens he wrote, some popular among Moroccan communities.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: '״יהיו לו ילדים״',
          en: '"He will have children"',
        },
        text: {
          he: 'מסופר שבחור ישיבה מירושלים שמע מהרופאים שלא יוכל להוליד ילדים, ולכן סירב לכל הצעת שידוך. רבו, הרב יהודה צדקה, שלח אותו אל רבי מאיר. עוד לפני שהספיק הבחור לומר מדוע בא, ברך אותו רבי מאיר שיזכה לילדים. למחרת אמר רבי מאיר לרב צדקה בקצרה: ״יהיו לו ילדים״. לפי המסופר, הבחור נישא וזכה לצאצאים.',
          en: "It is told that a Jerusalem yeshiva student, told by doctors he could never have children, turned down every match. His teacher, Rabbi Yehuda Tzadka, sent him to Rabbi Meir. Before the young man could say why he had come, Rabbi Meir blessed him with children. The next day Rabbi Meir told Rabbi Tzadka briefly: 'He will have children.' As the story goes, the student married and had a family.",
        },
        source:
          'Abir Yaakov institutions, https://abir-yaakov.org.il/rabbi-meir-abuchatzira/ ; JDN, Hilula Kadisha, 16 Nisan 5786, https://www.jdn.co.il/beit_hamidrash/1942164/',
      },
      {
        title: {
          he: 'הנבחן שנמצא בוחן',
          en: 'The examinee who examined',
        },
        text: {
          he: 'בהיותו כבן עשרים נסע רבי מאיר לבית הדין הגדול ברבאט כדי להיבחן לדיינות. אחרי המבחן כתב אב בית הדין לאביו, הבבא סאלי, שבנו הצעיר ״בא להיבחן ונמצא בוחן״. המכתב שמור עד היום בידי המשפחה.',
          en: "At about twenty Rabbi Meir travelled to the Great Rabbinical Court in Rabat to be examined as a judge. Afterwards the head of the court wrote to his father, the Baba Sali, that his young son 'came to be examined and was found an examiner.' The family keeps the letter to this day.",
        },
        source: 'Hebrew Wikipedia, https://he.wikipedia.org/wiki/מאיר_אבוחצירא',
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות בהר הזיתים, ירושלים; הביקור דורש תיאום ביטחוני או ליווי. סעודת ההילולה נערכת בבית המדרש ״משכיל לדוד״ שייסד באשדוד',
        en: 'Mount of Olives cemetery, Jerusalem; a visit needs security coordination or an escort. A hilula meal is held at the Maskil LeDavid study hall he founded in Ashdod',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית הקברות הר הזיתים',
    },
    sources: [
      'https://he.wikipedia.org/wiki/מאיר_אבוחצירא',
      'https://abir-yaakov.org.il/rabbi-meir-abuchatzira/',
      'https://www.jdn.co.il/beit_hamidrash/1942164/',
      'https://www.jdn.co.il/gallery/2391595/',
      'https://www.torah-box.net/jewish-ethics-and-learning/our-sages/yahrzeit-of-rabbi-meir-abihssira-his-life_1526.html',
      'https://en.wikipedia.org/wiki/Abuhatzeira',
    ],
  },
  baba_sali: {
    bio: {
      he: 'רבי ישראל אבוחצירא, הבבא סאלי (תר״ן–תשמ״ד, 1889–1984), נולד בריסאני שבחבל תאפילאלת במרוקו, נכדו של רבי יעקב אבוחצירא. בצעירותו עמד בראש ישיבה בריסאני, ולאחר מכן כיהן כאב בית הדין בעיר ארפוד וכרב חבל תאפילאלת. עלה לארץ ישראל סופית בשנת 1964, ומשנת 1970 התגורר בנתיבות. נודע כמקובל, כאיש תפילה וצניעות, ורבים באו לבקש את ברכתו. נפטר בד׳ בשבט תשמ״ד, וקברו בנתיבות הפך לאחד מאתרי העלייה לקבר המרכזיים בישראל.',
      en: "Rabbi Yisrael Abuhatzeira, the Baba Sali (1889–1984), was born in Rissani in Morocco's Tafilalt region, a grandson of Rabbi Yaakov Abuhatzeira. He headed a yeshiva in Rissani, then led the rabbinical court in Erfoud and served as rabbi of Tafilalt. He settled in Israel in 1964 and in Netivot in 1970. A kabbalist known for prayer and humility, he drew many seeking his blessing. He died on 4 Shevat 5744; his tomb in Netivot draws many pilgrims.",
    },
    lessons: [
      {
        title: {
          he: 'תפילה בעד הזולת',
          en: 'Praying for others',
        },
        text: {
          he: 'את כינויו ״באבא סאלי״ נוהגים לפרש ״האבא המתפלל״. רבים פנו אליו בצרותיהם, והוא התפלל עליהם וברך אותם. תפילה על אדם אחר היא דרך לשאת עמו בעול.',
          en: "His name is often explained as 'the praying father'. Many turned to him with their troubles, and he prayed for them and blessed them. Praying for another person is a way of sharing his burden.",
        },
      },
      {
        title: {
          he: 'שמירת הדיבור',
          en: "Guarding one's speech",
        },
        text: {
          he: 'נודע בתעניות דיבור ארוכות, שבהן נמנע מדיבור רוב שעות היממה כדי להקדיש את פיו לתורה ולתפילה. מעט דיבור מפנה מקום למחשבה ומונע פגיעה בזולת.',
          en: 'He was known for long fasts of speech, keeping silent for most of the day to devote his words to Torah and prayer. Speaking little leaves room for thought and prevents hurting others.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'אהבת ישראל',
          en: 'Ahavat Yisrael',
        },
        about: {
          he: 'על הפסוק ״ואהבת לרעך כמוך״ והמצוות הרמוזות בו; בנו רבי ברוך הוציאו לאור מכתב ידו.',
          en: "On 'Love your neighbor as yourself' and the commandments it alludes to; published from his manuscript by his son.",
        },
      },
      {
        title: {
          he: 'פיוטים',
          en: 'Liturgical poems',
        },
        about: {
          he: 'פיוטים, שהידוע בהם הוא ״יודוך רעיוני״.',
          en: "Liturgical poems; the best known is 'Yoducha Ra'ayonai'.",
        },
      },
    ],
    stories: [
      {
        title: {
          he: '״קום!״',
          en: '"Stand up!"',
        },
        text: {
          he: 'לפי סיפור שפורסם בספר ״באבא סאלי – רבנו הקדוש״, הגיע אליו אדם לא שומר מצוות מחולון, שבגלל פקקת קשה ברגליו עמד לעבור קטיעת רגל. הבבא סאלי ביקש ממנו לקבל על עצמו שמירת שבת ותשובה שלמה, והאיש נדר לעשות זאת. אז אמר לו לקום, והאיש, שלא יכול היה להתרומם, קם והלך. לפי המסופר, בבדיקות בבית החולים נמצא שאין עוד צורך בקטיעה. כשנשאל הבבא סאלי איך עשה זאת, השיב שרק אמר לו ״קום״.',
          en: "According to the book 'Baba Sali – Rebbeinu HaKadosh', a non-observant man from Holon, facing leg amputation because of severe thrombosis, came to him. The Baba Sali asked him to keep Shabbat and repent fully, and he vowed to. He then told him to stand up, and the man, unable to rise until then, stood and walked. As the story goes, hospital tests found amputation unnecessary. Asked how, the Baba Sali said he had only told him to stand.",
        },
        source:
          'Baba Sali – Rebbeinu HaKadosh, pp. 114–116, adapted by Yerachmiel Tilles on Chabad.org: https://www.chabad.org/kabbalah/article_cdo/aid/1736193/jewish/Stand-Up.htm',
      },
    ],
    grave: {
      place: {
        he: 'קבר הבבא סאלי, נתיבות',
        en: 'Tomb of the Baba Sali, Netivot',
      },
      lat: 31.43035,
      lng: 34.585511,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Yisrael_Abuhatzeira',
      'https://he.wikipedia.org/wiki/ישראל_אבוחצירא',
      'https://www.hamichlol.org.il/הבבא_סאלי',
      'https://www.chabad.org/kabbalah/article_cdo/aid/1736193/jewish/Stand-Up.htm',
      'https://he.wikipedia.org/wiki/קבר_הבאבא_סאלי',
      'https://www.openstreetmap.org/way/387379428',
    ],
  },
  steipler: {
    bio: {
      he: 'רבי יעקב ישראל קניבסקי (תרנ״ט–תשמ״ה, 1899–1985) נקרא ״הסטייפלר״ על שם העיירה הורנוסטייפל שבאוקראינה, עיר משפחתו. למד בישיבות נובהרדוק, גויס לצבא האדום, ואחרי שחרורו עבר לפולין ולימד בישיבת נובהרדוק בפינסק. נשא את אחותו של החזון איש, ובשנת 1934 עלה לארץ ישראל והשתקע בבני ברק. נודע כגאון בתורה וכמחבר ״קהילות יעקב״, ואלפים פנו אליו לעצה ולברכה. נפטר בכ״ג באב תשמ״ה.',
      en: "Rabbi Yaakov Yisrael Kanievsky (1899–1985) was called 'the Steipler' after Hornostaipil, his family's town in Ukraine. He studied in the Novardok yeshivas, was drafted into the Red Army, and after his release taught at the Novardok yeshiva in Pinsk, Poland. He married the Chazon Ish's sister and in 1934 settled in Bnei Brak. Renowned for his Torah genius and his work Kehillos Yaakov, he was sought out by thousands for advice and blessings. He died on 23 Av 5745.",
    },
    lessons: [
      {
        title: {
          he: 'התמדה בתורה',
          en: 'Devotion to Torah study',
        },
        text: {
          he: 'ספרו ״קהילות יעקב״ על התלמוד נכתב מתוך לימוד רצוף לאורך עשרות שנים, גם בתנאי עוני ומחסור. לימוד קבוע ועקבי בונה עומק שאין לו תחליף.',
          en: 'His Talmud commentary Kehillos Yaakov grew out of decades of unbroken study, even in poverty and hardship. Steady, consistent learning builds a depth nothing else can replace.',
        },
      },
      {
        title: {
          he: 'חיים פשוטים',
          en: 'A simple life',
        },
        text: {
          he: 'חי בצניעות ובדוחק, בלי לבקש לעצמו נוחות או כבוד. הסתפקות במועט מפנה את הלב ואת הזמן לעיקר.',
          en: 'He lived modestly and in want, seeking neither comfort nor honor for himself. Being content with little frees the heart and the time for what matters most.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'קהילות יעקב',
          en: 'Kehillos Yaakov',
        },
        about: {
          he: 'עיונים וחידושים על מסכתות התלמוד, בכרכים רבים.',
          en: 'In-depth analyses of Talmud tractates, in many volumes.',
        },
      },
      {
        title: {
          he: 'שערי תבונה',
          en: "Sha'arei Tevunah",
        },
        about: {
          he: 'חיבורו הראשון, שיצא לאור בפולין בשנת 1925.',
          en: 'His first major work, published in Poland in 1925.',
        },
      },
      {
        title: {
          he: 'ברכת פרץ',
          en: 'Birkas Peretz',
        },
        about: {
          he: 'חידושים על התורה, שנקראו על שם הוריו.',
          en: 'Insights on the Torah, named after his parents.',
        },
      },
      {
        title: {
          he: 'חיי עולם',
          en: 'Chayei Olam',
        },
        about: {
          he: 'על יסודות האמונה ועל ערך לימוד התורה.',
          en: 'On the foundations of faith and the value of Torah study.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'שיעור מן המיטה',
          en: 'A lesson from bed',
        },
        text: {
          he: 'הרב אברהם הורוביץ סיפר שבימי לימודיו מסר הסטייפלר שיעור כשהוא שוכב במיטתו, מכוסה בסדין. הוא לא היה חולה: מכנסיו נקרעו, ולא היו לו מכנסיים נוספים ללבוש, ובמקום לבטל את השיעור מסר אותו מן המיטה.',
          en: 'Rabbi Avrohom Horowitz recalled that in his yeshiva days the Steipler once gave a lesson lying in bed, covered with a sheet. He was not ill: his trousers had torn and he had no other pair to wear, so rather than cancel the lesson he gave it from his bed.',
        },
        source:
          "Rabbi Avrohom Horowitz, 'Memories of the Steipler Gaon', Dei'ah veDibur, 15 Cheshvan 5766 (16 November 2005): https://chareidi.org/archives5766/vayero/ovayerovyr66.htm",
      },
      {
        title: {
          he: 'על שם הוריו',
          en: 'Named for his parents',
        },
        text: {
          he: 'לפי אותו מקור, אביו, רבי חיים פרץ, למד עמו בכל שבת מגיל שבע ועד אחת עשרה, כדי לנטוע בו יראת שמיים. אביו נפטר כשהיה בן אחת עשרה, ואת אמו לא ראה עוד מאז יצא לישיבות. כדי לכבד את שניהם קרא לספרו על התורה ״ברכת פרץ״, על שם אמו ברכה ואביו חיים פרץ.',
          en: 'According to the same source, his father, Rabbi Chaim Peretz, studied with him every Shabbat from age seven to eleven to instill in him the fear of Heaven. His father died when he was eleven, and after leaving for the yeshivas he never saw his mother again. To honor them both he named his book on the Torah Birkas Peretz, after his mother Bracha and his father Chaim Peretz.',
        },
        source:
          "Rabbi Avrohom Horowitz, 'Memories of the Steipler Gaon', Dei'ah veDibur, 15 Cheshvan 5766 (16 November 2005): https://chareidi.org/archives5766/vayero/ovayerovyr66.htm",
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין שומרי שבת, בני ברק, סמוך לקבר החזון איש',
        en: 'Shomrei Shabbat cemetery, Bnei Brak, near the grave of the Chazon Ish',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית העלמין שומרי שבת בני ברק',
    },
    sources: [
      'https://en.wikipedia.org/wiki/Yaakov_Yisrael_Kanievsky',
      'https://he.wikipedia.org/wiki/יעקב_ישראל_קניבסקי',
      'https://chareidi.org/archives5766/vayero/ovayerovyr66.htm',
      'https://he.wikipedia.org/wiki/בית_הקברות_שומרי_שבת',
    ],
  },
  moshe_feinstein: {
    bio: {
      he: 'רבי משה פיינשטיין (תרנ״ה–תשמ״ו, 1895–1986) נולד בעיירה אוזדא שליד מינסק. כיהן כרב העיירה ליובאן כשש עשרה שנה, ולפני מלחמת העולם השנייה היגר לניו יורק. שם עמד בראש ישיבת ״מתיבתא תפארת ירושלים״ במנהטן. נחשב לפוסק ההלכה המוביל בארצות הברית בדורו, ותשובותיו נקבצו בסדרה ״אגרות משה״. נפטר בניו יורק בי״ג באדר ב׳ תשמ״ו, ונקבר בהר המנוחות בירושלים, סמוך לרבו, רבי איסר זלמן מלצר.',
      en: "Rabbi Moshe Feinstein (1895–1986) was born in Uzda, near Minsk. He served about sixteen years as rabbi of Luban and before World War II emigrated to New York, where he headed the Mesivtha Tifereth Jerusalem yeshiva in Manhattan. He was regarded as America's leading halachic authority; his responsa are collected in Igros Moshe. He died in New York on 13 Adar II 5746 and was buried on Har HaMenuchot in Jerusalem, near his teacher Rabbi Isser Zalman Meltzer.",
    },
    lessons: [
      {
        title: {
          he: 'רגישות לרגשות הזולת',
          en: "Sensitivity to others' feelings",
        },
        text: {
          he: 'נזהר שלא לבייש איש: כבחור אכל מנות נוספות כדי שמארחת שבישלה לא טוב לא תיפגע, ועיכב מניין שלם בשביל מתפלל אחד שאיחר. גדולה ניכרת במעשים קטנים של התחשבות.',
          en: "He took care never to embarrass anyone: as a student he ate extra helpings to spare a poor cook's feelings, and he made a minyan wait for one latecomer. Greatness shows in small acts of consideration.",
        },
      },
      {
        title: {
          he: 'תשובה לשאלות הדור',
          en: "Answering his generation's questions",
        },
        text: {
          he: 'השיב על אלפי שאלות בהלכה, רבות מהן בנושאים חדשים של רפואה, טכנולוגיה וחיי קהילה בעולם המודרני. בדרכו, ההלכה נותנת מענה לכל מצב בחיים.',
          en: 'He answered thousands of halachic questions, many on new issues of medicine, technology and community life in the modern world. In his approach, halacha speaks to every situation in life.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'אגרות משה',
          en: 'Igros Moshe',
        },
        about: {
          he: 'שאלות ותשובות בהלכה: שבעה כרכים בחייו ועוד שניים אחרי פטירתו.',
          en: 'Halachic responsa: seven volumes in his lifetime and two more after his death.',
        },
      },
      {
        title: {
          he: 'דברות משה',
          en: 'Dibros Moshe',
        },
        about: {
          he: 'חידושים על מסכתות התלמוד.',
          en: 'Novellae on tractates of the Talmud.',
        },
      },
      {
        title: {
          he: 'דרש משה',
          en: 'Darash Moshe',
        },
        about: {
          he: 'דברי תורה על פרשות השבוע, שראו אור אחרי פטירתו.',
          en: 'Torah insights on the weekly portions, published after his death.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'לא לבייש את המארחת',
          en: 'Sparing his hostess',
        },
        text: {
          he: 'כבחור צעיר שלמד הרחק מביתו, כתב רבי משה לאביו רק על לימודו. בזמן חופשה הבחינה אחותו שהשמין, ושיבחה את בישולי המארחת. הוא סיפר לה שהמארחת דווקא מבשלת לא טוב: אילו השאיר את האוכל, הייתה מבינה מדוע, ולכן אכל יותר מהרגיל כדי שלא תתבייש.',
          en: "As a young student far from home, Rabbi Moshe wrote to his father only about his learning. On a break, his sister saw he had gained weight and praised his hostess's cooking. He told her the woman was actually a poor cook: if he left her food, she would understand why, so to spare her embarrassment he ate more than usual.",
        },
        source:
          "Shalom Meir (compiler), 'Ten Years Since Reb Moshe's Petiroh: Facets of His Thought and Deeds', part 4, Dei'ah veDibur: https://www.chareidi.org/archives5786/zav/fr'mosh4zav86.htm",
      },
      {
        title: {
          he: 'מחכים לכל מתפלל',
          en: 'Waiting for every worshipper',
        },
        text: {
          he: 'ביום הכיפורים, כשהגיע זמן תפילת מוסף, עיכב רבי משה את המניין שהתפלל בביתו עד שחזר אחד המתפללים, שאיחר לשוב מן ההפסקה. לדבריו, ראוי לחכות למי שבא להתפלל בביתו.',
          en: 'On Yom Kippur, when it was time for Musaf, Rabbi Moshe held back the minyan praying in his home until one worshipper, who was late returning from the break, arrived. He said it was right to wait for someone who had come to pray in his home.',
        },
        source:
          "Shalom Meir (compiler), 'Ten Years Since Reb Moshe's Petiroh: Facets of His Thought and Deeds', part 4, Dei'ah veDibur: https://www.chareidi.org/archives5786/zav/fr'mosh4zav86.htm",
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין הר המנוחות, ירושלים',
        en: 'Har HaMenuchot cemetery, Jerusalem',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית העלמין הר המנוחות',
    },
    sources: [
      'https://en.wikipedia.org/wiki/Moshe_Feinstein',
      'https://jta.org/archive/rabbi-moshe-feinstein-dead-at-91',
      'https://www.ou.org/judaism-101/bios/leaders-in-the-diaspora/rav-moshe-feinstein/',
      "https://www.chareidi.org/archives5786/zav/fr'mosh4zav86.htm",
    ],
  },
  yehuda_tzadka: {
    bio: {
      he: 'הרב יהודה צדקה נולד בירושלים בשנת תר״ע (1910), נכד לאחותו של הבן איש חי, ולמד בתלמוד תורה בני ציון ובישיבת פורת יוסף אצל רבי עזרא עטיה. בשנת 1937 החל למסור בה שיעורים, ומשנת 1970 עמד בראשה עשרים ואחת שנה, לצד הרב בן ציון אבא שאול. בין תלמידיו הרבים היה בן אחותו, הרב מרדכי אליהו. היה ממייסדי רשת מעיין החינוך התורני, וחיבר את ״קול יהודה״. נפטר בי״ב בחשוון תשנ״ב.',
      en: "Rabbi Yehuda Tzadka was born in Jerusalem in 1910, a grandson of the Ben Ish Chai's sister, and studied at Talmud Torah Bnei Zion and at the Porat Yosef yeshiva under Rabbi Ezra Attia. He taught there from 1937 and headed it from 1970 for twenty-one years, alongside Rabbi Ben Zion Abba Shaul. His many students included his nephew, Rabbi Mordechai Eliyahu. He co-founded the Maayan HaChinuch HaTorani network and wrote Kol Yehuda. He died on 12 Cheshvan 5752 (1991).",
    },
    lessons: [
      {
        title: {
          he: 'השיעור קודם',
          en: 'The lesson comes first',
        },
        text: {
          he: 'בשיעוריו בישיבה נטה לקצר במילים, וגם כשחלה ונזקק ללכת לרופא, חזר לישיבה כדי למסור את השיעור. מחויבות של מורה לתלמידיו אינה נדחית מפני הנוחות.',
          en: "His classes at the yeshiva were sparing in words, and even when ill and needing a doctor, he returned to give his class. A teacher's commitment to his students does not yield to comfort.",
        },
      },
      {
        title: {
          he: 'לצאת אל הציבור',
          en: 'Going out to the public',
        },
        text: {
          he: 'בצעירותו סייר עם חבריו במעברות העולים החדשים ודיבר אל לבם לשמור על המצוות והמסורת. בכל נסיעה, בעיקר לפריפריה, חיפש מראש בית כנסת שבו יוכל לדרוש ולחזק.',
          en: 'As a young man he toured the immigrant transit camps with colleagues, urging residents to keep the mitzvot and their traditions. Whenever he traveled, especially to outlying towns, he first looked for a synagogue where he could speak and encourage.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'קול יהודה',
          en: 'Kol Yehuda',
        },
        about: {
          he: 'דרושים על פרשיות השבוע, חידושים על הש״ס ומאמרים.',
          en: 'Sermons on the weekly Torah portions, insights on the Talmud and essays.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'מבחן בגיל שבעים',
          en: 'An exam at seventy',
        },
        text: {
          he: 'כשהיה כבן שבעים החליט הרב צדקה להיבחן על לימודו במסגרת מפעל הש״ס, שהקים האדמו״ר מצאנז. לתלמידו הרב יעקב תופיק אביעזרי אמר אז, שללמוד שבעים דף גמרא בחודש אינו גדלות, אך להיבחן עליהם זו מעלה מיוחדת.',
          en: 'At about seventy, Rabbi Tzadka decided to sit for exams in the Mifal HaShas program founded by the Rebbe of Sanz. He told his student, Rabbi Yaakov Tufik Aviezri, that learning seventy pages of Gemara a month is no great feat, but being tested on them is a special merit.',
        },
        source:
          'Rabbi Yaakov Tufik Aviezri, interview in Magazin HaKehilot 26 (5782), p. 4, as cited by Hebrew Wikipedia, יהודה צדקה (https://he.wikipedia.org/wiki/יהודה_צדקה)',
      },
      {
        title: {
          he: 'משל הרגל השבורה',
          en: 'The parable of the broken leg',
        },
        text: {
          he: 'אדם שאל את הרב צדקה מדוע מי שחילל שבת בשוגג צריך להתענות, הרי לא התכוון. השיב לו הרב במשל: מי שנפל מגג ושבר את רגלו, והרופא שם לו גבס וציווה עליו לנוח חודשיים, אינו יכול לטעון שהרופא אכזר כלפיו, אף שלא שבר את רגלו בכוונה.',
          en: 'A man asked Rabbi Tzadka why someone who broke Shabbat by accident must fast, when he meant no wrong. The rabbi answered with a parable: a man who fell from a roof and broke his leg is put in a cast and told to rest for two months. He cannot call the doctor cruel, even though he did not break his leg on purpose.',
        },
        source:
          'Betzalel Chaim and Kobi Rozen, Kikar HaShabbat, 20 October 2018 (https://www.kikar.co.il/yeshiva-world/294008)',
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות סנהדריה, ירושלים',
        en: 'Sanhedria cemetery, Jerusalem',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית הקברות סנהדריה',
    },
    sources: [
      'https://he.wikipedia.org/wiki/יהודה_צדקה',
      'https://www.kikar.co.il/yeshiva-world/294008',
      'https://www.jdn.co.il/beit_hamidrash/1852084/',
      'https://he.wikipedia.org/wiki/בית_הקברות_סנהדריה',
    ],
  },
  lubavitcher_rebbe: {
    bio: {
      he: 'רבי מנחם מנדל שניאורסון (תרס״ב–תשנ״ד, 1902–1994), הרבי השביעי של חסידות חב״ד, נולד בניקולאייב שבאוקראינה. למד באוניברסיטאות בברלין ובפריז, ובשנת 1941 הגיע לניו יורק. אחרי פטירת חותנו, הרבי הקודם, קיבל עליו בשנת 1951 את הנהגת החסידות. שלח שלוחים לקהילות ברחבי העולם, יזם ״מבצעי מצוות״ כמו הנחת תפילין והדלקת נרות שבת, ונודע באהבתו לכל יהודי. נפטר בג׳ בתמוז תשנ״ד ונקבר בקווינס שבניו יורק, ליד חותנו.',
      en: 'Rabbi Menachem Mendel Schneerson (1902–1994), the seventh Rebbe of Chabad, was born in Nikolaev, Ukraine. He studied in Berlin and Paris and reached New York in 1941. After his father-in-law, the previous Rebbe, passed away, he assumed leadership in 1951. He sent emissaries to communities worldwide, launched mitzvah campaigns such as tefillin and Shabbat candles, and was known for his love of every Jew. He died on 3 Tammuz 5754 and is buried in Queens, New York, beside his father-in-law.',
    },
    lessons: [
      {
        title: {
          he: 'אהבת ישראל',
          en: 'Love for every Jew',
        },
        text: {
          he: 'ראה בכל יהודי, בלי הבדל, נשמה יקרה הראויה לאהבה ולדאגה. שלוחיו פועלים גם בקהילות קטנות ורחוקות מתוך אותה אחריות לכל יהודי באשר הוא.',
          en: 'He saw every Jew, without distinction, as a precious soul deserving love and care. His emissaries serve even small and distant communities out of that same responsibility for every Jew wherever he is.',
        },
      },
      {
        title: {
          he: 'מצווה אחת מוסיפה אור',
          en: 'One mitzvah adds light',
        },
        text: {
          he: 'עודד יהודים בכל מקום לקיים עוד מצווה אחת, כמו הנחת תפילין או הדלקת נרות שבת, בלי לחכות לשלמות. מעשה טוב אחד, קטן ככל שיהיה, מוסיף אור בעולם.',
          en: 'He encouraged Jews everywhere to take on one more mitzvah, such as tefillin or Shabbat candles, without waiting to be perfect. A single good deed, however small, adds light to the world.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'ליקוטי שיחות',
          en: 'Likkutei Sichot',
        },
        about: {
          he: 'שיחותיו על פרשות השבוע והמועדים, בעריכתו, בשלושים ותשעה כרכים.',
          en: 'His edited talks on the weekly portions and festivals, in 39 volumes.',
        },
      },
      {
        title: {
          he: 'אגרות קודש',
          en: 'Igrot Kodesh',
        },
        about: {
          he: 'מכתביו בענייני תורה, הדרכה ועצה, בעשרות כרכים.',
          en: 'His letters of Torah, guidance and advice, in dozens of volumes.',
        },
      },
      {
        title: {
          he: 'היום יום',
          en: 'Hayom Yom',
        },
        about: {
          he: 'לוח לימוד יומי של פתגמים ומנהגים חסידיים, שערך; יצא לאור בשנת 1943.',
          en: 'A daily calendar of Hasidic sayings and customs that he compiled, published in 1943.',
        },
      },
      {
        title: {
          he: 'תורת מנחם',
          en: 'Torat Menachem',
        },
        about: {
          he: 'רשימות של שיחותיו ונאומיו, לפי סדר השנים.',
          en: 'Transcripts of his talks and addresses, arranged by year.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'כל נשמה היא יהלום',
          en: 'Every soul is a diamond',
        },
        text: {
          he: 'משנת 1986 עמד הרבי מדי יום ראשון שעות ארוכות, לעתים עד שמונה, וחילק לאלפי אנשים שטר של דולר כדי שיתנו אותו לצדקה. אישה מבוגרת שאלה אותו איך אינו מתעייף. הרבי השיב שכל נשמה היא יהלום, ואיש אינו מתעייף מספירת יהלומים.',
          en: 'From 1986, every Sunday the Rebbe stood for hours, sometimes up to eight, handing thousands of people a dollar bill to give to charity. An elderly woman asked him how he did not grow tired. He answered that every soul is a diamond, and no one grows weary of counting diamonds.',
        },
        source:
          "Chabad.org, 'The Diamond Collector': https://www.chabad.org/library/article_cdo/aid/1200/jewish/The-Diamond-Collector.htm",
      },
      {
        title: {
          he: 'תפילין לפני מלחמת ששת הימים',
          en: 'Tefillin before the Six-Day War',
        },
        text: {
          he: 'במאי 1967, ימים ספורים לפני פרוץ מלחמת ששת הימים, נאם הרבי בפני אלפי ילדים בתהלוכת ל״ג בעומר בברוקלין, וקרא ליהודים בכל מקום לעודד יהודים אחרים להניח תפילין. הוא הסתמך על הפסוק ״וראו כל עמי הארץ כי שם ה׳ נקרא עליך ויראו ממך״, שהתלמוד קושר לתפילין של ראש. רבים נענו מיד, וכך נולד ״מבצע תפילין״.',
          en: "In May 1967, days before the Six-Day War, the Rebbe addressed thousands of children at the Lag BaOmer parade in Brooklyn and called on Jews everywhere to encourage fellow Jews to put on tefillin. He cited the verse 'All the peoples of the earth shall see that the name of G-d is called upon you, and they shall fear you,' which the Talmud links to the head tefillin. Many responded at once, and so the Tefillin Campaign began.",
        },
        source:
          "Chabad.org, 'Spiritual Security': https://www.chabad.org/parshah/article_cdo/aid/312353/jewish/Spiritual-Security.htm and 'A Call to Action': https://www.chabad.org/library/article_cdo/aid/799500/jewish/A-Call-to-Action.htm",
      },
    ],
    grave: {
      place: {
        he: 'האוהל, בית העלמין מונטיפיורי, קווינס, ניו יורק',
        en: 'The Ohel, Montefiore Cemetery, Queens, New York',
      },
      lat: 40.68604,
      lng: -73.737448,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Menachem_Mendel_Schneerson',
      'https://www.chabad.org/therebbe/article_cdo/aid/244372/jewish/Biography.htm',
      'https://www.chabad.org/library/article_cdo/aid/1200/jewish/The-Diamond-Collector.htm',
      'https://www.chabad.org/parshah/article_cdo/aid/312353/jewish/Spiritual-Security.htm',
      'https://www.chabad.org/library/article_cdo/aid/799500/jewish/A-Call-to-Action.htm',
      'https://en.wikipedia.org/wiki/Ohel_(Chabad-Lubavitch)',
      'https://www.openstreetmap.org/node/2301631125',
    ],
  },
  klausenberger_rebbe: {
    bio: {
      he: 'רבי יקותיאל יהודה הלברשטאם, האדמו״ר מצאנז-קלויזנבורג, נולד ברודניק שבגליציה בשנת ה׳תרס״ה, מצאצאי רבי חיים מצאנז. כיהן כרב הקהילה החסידית בקלויזנבורג ועמד בראש ישיבתה. בשואה איבד את אשתו ואת אחד עשר ילדיו, והוא שרד את אושוויץ ואת צעדת המוות. אחרי המלחמה הקים ישיבות במחנות העקורים ובארצות הברית, ייסד את קריית צאנז בנתניה ואת בית החולים לניאדו. נפטר בט׳ בתמוז תשנ״ד.',
      en: 'Rabbi Yekusiel Yehuda Halberstam, the Klausenberger Rebbe, was born in Rudnik, Galicia, in 1905, a descendant of Rabbi Chaim of Sanz. He served as rabbi of the Chassidic community of Klausenburg and headed its yeshiva. In the Holocaust he lost his wife and eleven children, and survived Auschwitz and a death march. After the war he founded yeshivas in the DP camps and in America, then Kiryat Sanz in Netanya and Laniado Hospital. He died on 9 Tammuz 5754 (1994).',
    },
    lessons: [
      {
        title: {
          he: 'לבנות אחרי החורבן',
          en: 'Rebuilding after destruction',
        },
        text: {
          he: 'מיד אחרי השחרור, כשנודע לו שמשפחתו נרצחה, חיזק את הניצולים במחנה העקורים והקים בו ישיבות ומוסדות. גם אחרי אובדן נורא אפשר לקום ולבנות למען אחרים.',
          en: 'Right after liberation, having learned that his family was murdered, he encouraged fellow survivors in the DP camp and founded yeshivas and institutions there. Even after terrible loss, one can rise and build for others.',
        },
      },
      {
        title: {
          he: 'בלי תארים',
          en: 'Without titles',
        },
        text: {
          he: 'לפי בקשתו, לא נחקקו תארי כבוד על מצבתו. מי שבנה קהילות, ישיבות ובית חולים לא ביקש שבח באבן, ומעשיו מדברים בעדו.',
          en: 'At his request, no titles of honor were carved on his tombstone. A man who built communities, yeshivas and a hospital asked for no praise in stone; his deeds speak for him.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'שפע חיים',
          en: 'Shefa Chaim',
        },
        about: {
          he: 'סדרת ספרים ובה דברי תורתו ושיחותיו, שעל שמה הוא מכונה.',
          en: 'A series of volumes of his Torah teachings and talks, after which he is called.',
        },
      },
      {
        title: {
          he: 'דברי יציב',
          en: 'Divrei Yatziv',
        },
        about: {
          he: 'שאלות ותשובות בהלכה.',
          en: 'Responsa on Jewish law.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'הנדר בצעדת המוות',
          en: 'The vow on the death march',
        },
        text: {
          he: 'מסופר שבצעדת המוות נפצע מירייה, ועצר את הדימום בתחבושת שאילתר מעלים וענפים. אז נדר שאם ינצל, יקים בית חולים. בשנת תשל״ה נפתח הבניין הראשון של בית החולים לניאדו בקריית צאנז בנתניה, בית חולים הפועל על פי ההלכה.',
          en: 'It is told that on the death march he was shot, and stopped the bleeding with a bandage improvised from leaves and branches. He then vowed that if he survived, he would build a hospital. In 1975 the first building of Laniado Hospital opened in Kiryat Sanz, Netanya, a hospital run according to Jewish law.',
        },
        source:
          'Accidental Talmudist, He Rose from the Ashes to Build a House of Healing, 2017 (https://www.accidentaltalmudist.org/heroes/2017/12/06/he-rose-from-the-ashes-to-build-a-house-of-healing/); Laniado Hospital UK, About (https://laniado.co.uk/about); Wikipedia, Yekusiel Yehudah Halberstam (https://en.wikipedia.org/wiki/Yekusiel_Yehudah_Halberstam)',
      },
      {
        title: {
          he: 'המזרק היקר',
          en: 'The costlier syringe',
        },
        text: {
          he: 'מסופר שבבית החולים התלבטו אם לקנות מזרקים זולים או מזרקים יקרים יותר, הגורמים פחות כאב. הרבי הורה לקנות את היקרים, ואמר שאין מחיר יקר מדי כדי להקל על סבלו של יהודי.',
          en: "It is told that the hospital's staff debated whether to buy cheap syringes or costlier ones that cause less pain. The Rebbe told them to buy the costlier ones, saying that no price is too high to ease a Jew's suffering.",
        },
        source:
          'JDN, Hilula of the Rebbe of Sanz-Klausenburg, 8 Tammuz 5785 (https://www.jdn.co.il/beit_hamidrash/1990165/)',
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין שיכון ותיקים, נתניה',
        en: 'Shikun Vatikim cemetery, Netanya',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית עלמין נתניה שיכון ותיקים',
    },
    sources: [
      'https://he.wikipedia.org/wiki/יקותיאל_יהודה_הלברשטאם',
      'https://en.wikipedia.org/wiki/Yekusiel_Yehudah_Halberstam',
      'https://www.jdn.co.il/beit_hamidrash/1990165/',
      'https://www.jdn.co.il/?p=2235628',
      'https://www.accidentaltalmudist.org/heroes/2017/12/06/he-rose-from-the-ashes-to-build-a-house-of-healing/',
      'https://laniado.co.uk/about',
      'https://www.openstreetmap.org/way/26629454',
    ],
  },
  shlomo_zalman_auerbach: {
    bio: {
      he: 'רבי שלמה זלמן אויערבך (תר״ע–תשנ״ה, 1910–1995) נולד בשכונת שערי חסד בירושלים. כבר בצעירותו חיבר את ״מאורי אש״, מהספרים הראשונים שעסקו בשימוש בחשמל בשבת. במשך עשרות שנים עמד בראש ישיבת ״קול תורה״ בירושלים, ונחשב לאחד מגדולי פוסקי ההלכה בדורו, בייחוד בשאלות של רפואה וטכנולוגיה. נודע בענוותנותו ובמאור פניו לכל אדם. נפטר בכ׳ באדר א׳ תשנ״ה, ובהלווייתו השתתפו מאות אלפים.',
      en: "Rabbi Shlomo Zalman Auerbach (1910–1995) was born in Jerusalem's Shaarei Chesed neighborhood. As a young man he wrote Me'orei Esh, one of the first works on using electricity on Shabbat. For decades he headed the Kol Torah yeshiva in Jerusalem and was among the leading halachic authorities of his generation, especially on medicine and technology. He was known for his humility and warmth toward everyone. He died on 20 Adar I 5755; hundreds of thousands attended his funeral.",
    },
    lessons: [
      {
        title: {
          he: 'שלום בית',
          en: 'Peace in the home',
        },
        text: {
          he: 'חי עם רעייתו עשרות שנים בהרמוניה, וראה בכבודה ובשלום הבית ערך עליון. היחס לבן הזוג או לבת הזוג הוא מבחן אמיתי לאופיו של אדם.',
          en: "He lived with his wife for decades in harmony and saw her honor and peace in the home as a supreme value. How one treats one's spouse is a true test of character.",
        },
      },
      {
        title: {
          he: 'ענווה אמיתית',
          en: 'True humility',
        },
        text: {
          he: 'כשעיתון כינה אותו ״פוסק הדור״, ביקש שלא יעשו זאת שוב. בצוואתו אסר לכתוב על מצבתו תארים, מלבד תואר אחד מקובל, וביקש שלא תהיה גבוהה ממצבת הוריו.',
          en: "When a newspaper called him 'the halachic authority of the generation', he asked it not to do so again. His will banned all but one customary title on his tombstone and any stone taller than his parents'.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'מאורי אש',
          en: "Me'orei Esh",
        },
        about: {
          he: 'חיבור חלוצי על שימוש בחשמל בהלכה ובשבת, שיצא לאור בשנת 1935.',
          en: 'A pioneering work on electricity in halacha and on Shabbat, published in 1935.',
        },
      },
      {
        title: {
          he: 'מעדני ארץ',
          en: "Ma'adanei Eretz",
        },
        about: {
          he: 'על המצוות התלויות בארץ, ובהן שמיטה.',
          en: 'On the agricultural laws of the Land of Israel, including Shemitah.',
        },
      },
      {
        title: {
          he: 'מנחת שלמה',
          en: 'Minchat Shlomo',
        },
        about: {
          he: 'שאלות ותשובות בהלכה, וכן חידושים על התלמוד.',
          en: 'Halachic responsa, and novellae on the Talmud.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'בהלוויית רעייתו',
          en: "At his wife's funeral",
        },
        text: {
          he: 'בהלוויית רעייתו התייחס רבי שלמה זלמן למנהג לבקש מחילה מן הנפטר. לפי המסופר, אמר שאינו מוצא דבר שעליו צריך לבקש ממנה מחילה: במשך כל שנות נישואיהם לא רבו מעולם, וחייהם התנהלו על פי השולחן ערוך.',
          en: "At his wife's funeral, Rabbi Shlomo Zalman spoke about the custom of asking the deceased for forgiveness. As recounted, he said he could find nothing to ask her forgiveness for: in all their years of marriage they had never quarreled, and their life together followed the Shulchan Aruch.",
        },
        source:
          'Torah MiTzion, Chayei Sarah issue (Shema Yisrael Torah Network): https://shemayisrael.com/parsha/sobel/archives/chayei68.htm; Yonatan Halevi, Hidabroot, 8 March 2026: https://www.hidabroot.org/article/194354',
      },
      {
        title: {
          he: 'לקבל את פני השכינה',
          en: 'Greeting the Shechinah',
        },
        text: {
          he: 'פעם ליווה אותו אדם לביתו. לפני שעלה במדרגות, יישר רבי שלמה זלמן את העניבה ואת המעיל, כמו לפני תפילת שמונה עשרה. כשנשאל לפשר הדבר, הסביר שהוא מתכונן לקבל את פני השכינה, שכן חז״ל אמרו שהשכינה שורה בין איש לאשתו החיים בשלום.',
          en: 'Once a man walked him home. Before climbing the stairs, Rabbi Shlomo Zalman straightened his tie and coat, as one does before the Amidah. Asked why, he explained that he was preparing to greet the Shechinah, since the Sages taught that the Divine Presence rests between husband and wife who live in peace.',
        },
        source:
          'Torah MiTzion, Chayei Sarah issue (Shema Yisrael Torah Network): https://shemayisrael.com/parsha/sobel/archives/chayei68.htm',
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין הר המנוחות, ירושלים',
        en: 'Har HaMenuchot cemetery, Jerusalem',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית העלמין הר המנוחות',
    },
    sources: [
      'https://en.wikipedia.org/wiki/Shlomo_Zalman_Auerbach',
      'https://he.wikipedia.org/wiki/שלמה_זלמן_אויערבך',
      'https://www.hidabroot.org/article/194354',
      'https://shemayisrael.com/parsha/sobel/archives/chayei68.htm',
      'https://he.wikipedia.org/wiki/הר_המנוחות',
    ],
  },
  ben_zion_abba_shaul: {
    bio: {
      he: 'הרב בן ציון אבא שאול נולד בירושלים בכ״ט בתמוז תרפ״ד (1924), לאב שעלה מהעיר לאר שבפרס. מגיל 11 למד בישיבת פורת יוסף אצל רבי עזרא עטיה, ונודע כעילוי עמקן. לימים עמד בראש הישיבה לצד הרב יהודה צדקה, מסר בה שיעורים יומיים ארוכים ופסק הלכה לרבים. בסוף ימיו ייסד עם בנו את ישיבת אור לציון. חיבר את ספרי ״אור לציון״. נפטר בי״ט בתמוז תשנ״ח.',
      en: 'Rabbi Ben Zion Abba Shaul was born in Jerusalem in 1924 to a father from Lar in Persia. From age 11 he studied at the Porat Yosef yeshiva under Rabbi Ezra Attia and was known as a profound prodigy. He later headed it with Rabbi Yehuda Tzadka, giving long daily lessons and ruling for many. Late in life he and his son founded the Ohr LeTzion yeshiva; his books share its name. He died on 19 Tammuz 5758 (1998).',
    },
    lessons: [
      {
        title: {
          he: 'להבין כל מילה',
          en: 'Understanding every word',
        },
        text: {
          he: 'לימודו היה עמקני: התעכב להבין כל מילה בסוגיית הגמרא שלמד, דרך שקיבל מרבו רבי עזרא עטיה. לימוד אמיתי נמדד בעומק ההבנה, לא במספר הדפים.',
          en: 'His learning was deep: he paused to understand every word of the Gemara passage before him, a method he received from his teacher, Rabbi Ezra Attia. True learning is measured by depth of understanding, not by pages covered.',
        },
      },
      {
        title: {
          he: 'שמחה בתוך הייסורים',
          en: 'Joy amid suffering',
        },
        text: {
          he: 'רוב ימיו סבל ממחלות קשות, ובשנת תשמ״ג לקה באירוע מוחי, ובכל זאת קיבל כל אדם בסבר פנים יפות ונודע בשמחתו. מצבו של אדם אינו חייב לקבוע את יחסו לאחרים.',
          en: "He suffered serious illnesses for much of his life and had a stroke in 1983, yet he greeted everyone warmly and was known for his cheerfulness. A person's condition need not decide how he treats others.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'שו״ת אור לציון',
          en: 'Ohr LeTzion Responsa',
        },
        about: {
          he: 'שאלות ותשובות בהלכה בכמה כרכים: הראשון על ארבעת חלקי השולחן ערוך, והבאים בעיקר באורח חיים.',
          en: 'Halachic responsa in several volumes: the first on all four parts of the Shulchan Aruch, the later ones mostly on Orach Chaim.',
        },
      },
      {
        title: {
          he: 'אור לציון על הש״ס',
          en: 'Ohr LeTzion on the Talmud',
        },
        about: {
          he: 'חידושים על מסכתות יבמות, כתובות, קידושין ומכות.',
          en: 'Insights on the tractates Yevamot, Ketubot, Kiddushin and Makkot.',
        },
      },
      {
        title: {
          he: 'אור לציון שביעית',
          en: "Ohr LeTzion Shevi'it",
        },
        about: {
          he: 'שאלות ותשובות בענייני שמיטה וביאורים למשניות מסכת שביעית.',
          en: "Responsa on the Sabbatical year and explanations of the Mishnah of tractate Shevi'it.",
        },
      },
      {
        title: {
          he: 'אור לציון חכמה ומוסר',
          en: 'Ohr LeTzion Chochmah UMussar',
        },
        about: {
          he: 'דברי מוסר והשקפה לבחורי הישיבה.',
          en: 'Words of ethics and outlook for yeshiva students.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'שיעור שאינו למכירה',
          en: 'A lesson not for sale',
        },
        text: {
          he: 'תלמידיו הציעו לו פעם לשבות עמם במירון, אך הוא סירב, משום שבשבת מסר שיעור קבוע. כשהציעו שימנה מישהו במקומו, השיב במשל: אדם שזכה במיליון דולר בפיס אינו שולח שליח לקבל את הזכייה. כך הרגיש במסירת השיעור, ולא היה מוכן למסור אותה לאחר.',
          en: 'His students once suggested he spend Shabbat with them in Meron, but he declined, because he gave a fixed lesson on Shabbat. When they proposed a substitute, he answered with a parable: a man who wins a million dollars in the lottery does not send a messenger to collect it. Giving the lesson felt to him like that prize, and he would not hand it to another.',
        },
        source: 'JDN, 3 July 2026 (https://www.jdn.co.il/beit_hamidrash/1996448/)',
      },
      {
        title: {
          he: 'רש״י יקבל את פניו',
          en: 'Rashi will greet him',
        },
        text: {
          he: 'הרב אבא שאול נולד בכ״ט בתמוז, יום פטירתו של רש״י, ועמל רבות בהבנת דבריו. לתלמידיו אמר שרש״י יקבל את פניו בעולם האמת, משום שטרח כל כך בדבריו.',
          en: "Rabbi Abba Shaul was born on 29 Tammuz, the day of Rashi's death, and labored greatly over Rashi's words. He told his students that Rashi would greet him in the World of Truth, because he had toiled so much over his words.",
        },
        source: 'JDN, 3 July 2026 (https://www.jdn.co.il/beit_hamidrash/1996448/)',
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות סנהדריה, ירושלים, ליד קבר רעייתו הדסה',
        en: 'Sanhedria cemetery, Jerusalem, beside the grave of his wife Hadassah',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית הקברות סנהדריה',
    },
    sources: [
      'https://he.wikipedia.org/wiki/בן_ציון_אבא_שאול',
      'https://www.jdn.co.il/beit_hamidrash/1996448/',
      'https://he.wikipedia.org/wiki/בית_הקברות_סנהדריה',
      'https://en.wikipedia.org/wiki/Ben_Zion_Abba_Shaul',
    ],
  },
  rav_shach: {
    bio: {
      he: 'הרב אלעזר מנחם מן שך (נפטר בתשס״ב, 2001, בגיל יותר ממאה) נולד בליטא ולמד בישיבות פוניבז׳, סלבודקה וסלוצק. לימד בישיבת קלצק ועמד בראש ישיבות באירופה, ובשנת 1941 עלה לארץ ישראל. אחרי שלימד בירושלים, בפתח תקווה וברחובות, עמד מתחילת שנות החמישים ועד פטירתו, כחמישים שנה, בראש ישיבת פוניבז׳ בבני ברק. נחשב למנהיג היהדות החרדית הליטאית בדורו. נפטר בט״ז בחשוון תשס״ב ונקבר בבני ברק.',
      en: 'Rabbi Elazar Menachem Man Shach (died 2001, aged over a hundred) was born in Lithuania and studied at the Ponevezh, Slabodka and Slutsk yeshivas. He taught at the Kletsk yeshiva, headed yeshivas in Europe, and immigrated to the Land of Israel in 1941. After teaching in Jerusalem, Petah Tikva and Rehovot, he headed the Ponevezh Yeshiva in Bnei Brak for about fifty years. He was regarded as the leader of Lithuanian Haredi Jewry. He died on 16 Cheshvan 5762.',
    },
    lessons: [
      {
        title: {
          he: 'מסירות להוראת התורה',
          en: 'Devotion to teaching Torah',
        },
        text: {
          he: 'כחמישים שנה מסר שיעורים בישיבת פוניבז׳ וגידל דורות של תלמידי חכמים. הוא ראה בלימוד התורה ובהוראתה את מרכז חייו.',
          en: 'For about fifty years he taught at the Ponevezh Yeshiva, raising generations of Torah scholars. He saw learning and teaching Torah as the center of his life.',
        },
      },
      {
        title: {
          he: 'אחריות לזולת',
          en: 'Responsibility for others',
        },
        text: {
          he: 'חי חיים פשוטים, וויתר על נוחותו האישית כדי להיות זמין לכל מי שנזקק לו. האחריות לזולת קודמת לנוחות האישית.',
          en: "He lived simply and gave up personal comfort to stay available to everyone who needed him. Responsibility for others comes before one's own comfort.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'אבי עזרי',
          en: 'Avi Ezri',
        },
        about: {
          he: 'עיונים וחידושים על משנה תורה לרמב״ם.',
          en: "Analyses and insights on Maimonides' Mishneh Torah.",
        },
      },
      {
        title: {
          he: 'מכתבים ומאמרים',
          en: "Michtavim U'Maamarim",
        },
        about: {
          he: 'אוסף מכתביו ומאמריו בענייני השקפה והדרכה.',
          en: 'Collected letters and essays on outlook and guidance.',
        },
      },
      {
        title: {
          he: 'מחשבת מוסר',
          en: 'Machshevet Mussar',
        },
        about: {
          he: 'מבחר משיחות המוסר שלו, שראה אור בידי תלמידיו.',
          en: 'A selection of his mussar talks, published by his students.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'סיר האוכל',
          en: 'The pot of food',
        },
        text: {
          he: 'בזמן שרעייתו חלתה, נראה הרב שך נושא ברחוב סיר אוכל מן הישיבה אל ביתו. אדם שראה זאת מיהר להציע לשאת את הסיר במקומו, כי לא נאה לראש הישיבה לסחוב סיר ברחוב. הרב שך סירב, והשווה את הדאגה לאשתו למצוות לולב ואתרוג, שאיש אינו מוסר לאחר.',
          en: "When his wife was ill, Rav Shach was seen carrying a pot of food home from the yeshiva. A man hurried over to carry it for him, saying it was beneath the rosh yeshiva's dignity. Rav Shach refused, comparing caring for his wife to the mitzvah of lulav and etrog, which no one hands over to someone else.",
        },
        source:
          'Asher Bergman, Lulei Sorasecha, as cited in Torah MiTzion (Shema Yisrael Torah Network): https://www.shemayisrael.com/parsha/sobel/archives/vayera64.htm',
      },
      {
        title: {
          he: 'איך אפשר לעזוב?',
          en: 'How can I leave?',
        },
        text: {
          he: 'בקיץ חם ולח בבני ברק, כשברוב הבתים עוד לא היו מזגנים, הציע אחד ממקורביו של הרב שך שיעבור בבין הזמנים לירושלים הקרירה, ואף הכין לו דירה סמוך לישיבה. הוא סירב, והסביר שאנשים רבים באים לביתו בבקשת עזרה, ואם יעזוב ימצאו את הדלת נעולה. ״איך אפשר לעזוב כשכל כך הרבה אנשים זקוקים לי?״ אמר.',
          en: "One hot, humid summer in Bnei Brak, before most homes had air conditioning, someone close to Rav Shach urged him to spend the yeshiva break in cooler Jerusalem and arranged an apartment near a yeshiva. He declined, explaining that many people came to his home asking for help, and if he left they would find the door locked. 'How can I leave when so many people need me?' he said.",
        },
        source: "Rabbi Mendel Weinbach, 'A Giant Sense of Responsibility', Ohr Somayach: https://ohr.edu/3800",
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות של נציבי ישיבת פוניבז׳, בני ברק',
        en: 'Ponevezh Yeshiva cemetery, Bnei Brak',
      },
      lat: 32.0720413,
      lng: 34.8349327,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Elazar_Shach',
      'https://he.wikipedia.org/wiki/אלעזר_מנחם_מן_שך',
      'https://ohr.edu/3800',
      'https://www.shemayisrael.com/parsha/sobel/archives/vayera64.htm',
      "https://he.wikipedia.org/wiki/בית_הקברות_של_נציבי_ישיבת_פוניבז'",
    ],
  },
  yitzchak_kaduri: {
    bio: {
      he: 'הרב יצחק כדורי, ״זקן המקובלים״, נולד בבגדאד, לפי המקובל בשנת 1898, ולמד בצעירותו בבית המדרש זילכה, שם הכיר את הבן איש חי. בשנת 1922 עלה לירושלים, למד בישיבות שושנים לדוד ופורת יוסף, והתפרנס מכריכת ספרים. לימים עמד בראש ישיבת המקובלים נחלת יצחק, ואלפים מכל העדות באו לביתו לבקש ברכה ועצה. נפטר במוצאי שבת, כ״ט בטבת תשס״ו, ומאות אלפים ליוו אותו להר המנוחות.',
      en: "Rabbi Yitzchak Kaduri, 'the elder of the kabbalists', was born in Baghdad around 1898, and as a youth studied at the Zilkha study hall, where he knew the Ben Ish Chai. In 1922 he came to Jerusalem, studied at Shoshanim LeDavid and Porat Yosef, and earned his living as a bookbinder. He later headed the Nachalat Yitzchak kabbalists' yeshiva, and thousands from every community sought his blessing and advice. He died on motzaei Shabbat, 29 Tevet 5766 (2006).",
    },
    lessons: [
      {
        title: {
          he: 'לימוד בכל הזדמנות',
          en: 'Learning at every chance',
        },
        text: {
          he: 'ככורך ספרים לא כרך ספר לפני שלמד אותו. גם פרנסה פשוטה יכולה להפוך לשעות של לימוד, כשמחפשים בה את התורה.',
          en: 'As a bookbinder he would not bind a book before he had studied it. Even a simple livelihood can become hours of learning when one looks for the Torah in it.',
        },
      },
      {
        title: {
          he: 'סבלנות בלי כעס',
          en: 'Patience without anger',
        },
        text: {
          he: 'פעם, כשכתב קמע, קראה לו רעייתו לאכול והכתה על השולחן, והדיו נשפך על הכתב. הוא לא כעס, וישב שעות לכתוב הכול מחדש. שלוות הנפש יקרה מן הטורח שאבד.',
          en: 'Once, as he wrote an amulet, his wife called him to eat and struck the table, spilling ink over his work. He did not get angry and spent hours writing it again. Calm is worth more than lost effort.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'קדושת יצחק',
          en: 'Kedushat Yitzchak',
        },
        about: {
          he: 'תורתו בענייני קמעות, סגולות ותפילות, שיצאה לאור אחרי פטירתו בשישה כרכים, עם הערות וביאורים של הרב יעקב עדס.',
          en: 'His teachings on amulets, segulot and prayers, published after his death in six volumes with notes by Rabbi Yaakov Edess.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'הספרים שהתעכבו',
          en: 'The books that came back late',
        },
        text: {
          he: 'הרב כדורי נהג ללמוד כל ספר שהגיע אליו לכריכה, והרב יוסף עדס, מרבני ישיבת פורת יוסף, אמר שהוא ״כרך ובלע״ את הספרים. פעם הביא לו הרב הראשי יצחק נסים ספרים לכריכה, וכשעברו שבועות שאל מדוע הדבר מתעכב. הרב כדורי השיב בפשטות שעדיין לא סיים ללמוד אותם.',
          en: "Rabbi Kaduri used to study every book that came to him for binding; Rabbi Yosef Ades of the Porat Yosef yeshiva said he 'bound and devoured' them. Once Chief Rabbi Yitzchak Nissim brought him books to bind, and when weeks passed he asked what was taking so long. Rabbi Kaduri simply answered that he had not yet finished learning them.",
        },
        source:
          "Torah-Box, 'Yartzeit of Rav Yitzchak Kaduri' (https://www.torah-box.net/jewish-ethics-and-learning/our-sages/yartzeit-of-rav-yitzchak-kaduri_1091.html)",
      },
      {
        title: {
          he: 'כתבי היד של פורת יוסף',
          en: 'The Porat Yosef manuscripts',
        },
        text: {
          he: 'בשנת 1934 נתנה לו ישיבת פורת יוסף דירה סמוך לישיבה בעיר העתיקה, בתמורה לכריכת ספריה ולהעתקת כתבי יד נדירים. במלחמת העצמאות העביר כתבי יד אל ישיבת המקובלים בית אל, ומה שלא הספיק להעביר נשרף כשהישיבה הועלתה באש.',
          en: "In 1934 the Porat Yosef yeshiva in the Old City gave him an apartment beside it in return for binding its books and copying rare manuscripts. In the 1948 war he took manuscripts to the Beit El kabbalists' yeshiva; what he could not move burned when the yeshiva was set on fire.",
        },
        source:
          "English Wikipedia, 'Yitzhak Kaduri' (https://en.wikipedia.org/wiki/Yitzhak_Kaduri); The Jewish Press, 'Rav Kaduri's diary of amulets and tikkunim', on his binding and copying work at Porat Yosef (https://jewishpress.com/rav-kaduris-diary-of-amulets-and-tikkunim/)",
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין הר המנוחות, ירושלים',
        en: 'Har HaMenuchot cemetery, Jerusalem',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית העלמין הר המנוחות',
    },
    sources: [
      'https://he.wikipedia.org/wiki/יצחק_כדורי',
      'https://en.wikipedia.org/wiki/Yitzhak_Kaduri',
      'https://www.jdn.co.il/beit_hamidrash/2345738/',
      'https://www.chabad.org/article.asp?aid=150186',
      'https://www.torah-box.net/jewish-ethics-and-learning/our-sages/yartzeit-of-rav-yitzchak-kaduri_1091.html',
      'https://www.kikar.co.il/actualy/squl6p',
      'https://jewishpress.com/rav-kaduris-diary-of-amulets-and-tikkunim/',
    ],
  },
  mordechai_eliyahu: {
    bio: {
      he: 'הרב מרדכי אליהו (תרפ״ט–תש״ע, 1929–2010) נולד בעיר העתיקה בירושלים, בנו של המקובל רבי סלמאן אליהו, שנפטר כשמרדכי היה ילד. למד בישיבת ״פורת יוסף״, ומונה לדיין הצעיר ביותר בארץ, בבאר שבע. כיהן בבתי הדין בירושלים ובבית הדין הרבני הגדול, ובשנים 1983–1993 היה הראשון לציון והרב הראשי הספרדי לישראל. הרבה להרצות בכל רחבי הארץ, ועודד במיוחד שמירת שבת וטהרת המשפחה. נפטר בכ״ה בסיוון תש״ע.',
      en: "Rabbi Mordechai Eliyahu (1929–2010) was born in Jerusalem's Old City, son of the kabbalist Rabbi Salman Eliyahu, who died when Mordechai was a boy. He studied at Porat Yosef yeshiva and became Israel's youngest rabbinical judge, in Beersheba. He later sat on the Jerusalem courts and the Supreme Rabbinical Court, and in 1983–1993 was Rishon LeZion and Sephardi Chief Rabbi of Israel. He lectured nationwide, promoting Shabbat and family purity. He died on 25 Sivan 5770.",
    },
    lessons: [
      {
        title: {
          he: 'טהרת המשפחה',
          en: 'Family purity',
        },
        text: {
          he: 'כתב את ״דרכי טהרה״, מדריך בהיר להלכות טהרת המשפחה, ופעל להפיץ אותו בכל שכבות העם. בעיניו, קדושת הבית היא יסוד לחיי משפחה טובים.',
          en: 'He wrote Darkei Taharah, a clear guide to the laws of family purity, and worked to spread it among all parts of the people. For him, the holiness of the home is the foundation of good family life.',
        },
      },
      {
        title: {
          he: 'לקרב כל יהודי',
          en: 'Reaching every Jew',
        },
        text: {
          he: 'כרב ראשי יצא ליישובים, לבתי ספר חילוניים ולקהילות יהודיות בחוץ לארץ. מפגש עם אנשים במקומם, מתוך כבוד, פותח לבבות יותר מכל ויכוח.',
          en: 'As Chief Rabbi he went out to towns and settlements, to secular schools and to Jewish communities abroad. Meeting people where they are, with respect, opens hearts more than any argument.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'דרכי טהרה',
          en: 'Darkei Taharah',
        },
        about: {
          he: 'הלכות טהרת המשפחה.',
          en: 'The laws of family purity.',
        },
      },
      {
        title: {
          he: 'שו״ת מאמר מרדכי',
          en: "Responsa Ma'amar Mordechai",
        },
        about: {
          he: 'שאלות ותשובות בהלכה.',
          en: 'Halachic responsa.',
        },
      },
      {
        title: {
          he: 'סידור קול אליהו',
          en: 'Siddur Kol Eliyahu',
        },
        about: {
          he: 'סידור תפילה לימות החול ולשבת, עם הלכות.',
          en: 'A prayer book for weekdays and Shabbat, with laws.',
        },
      },
      {
        title: {
          he: 'קיצור שולחן ערוך עם הערות ״דרכי הלכה״',
          en: 'Kitzur Shulchan Aruch with Darkei Halacha notes',
        },
        about: {
          he: 'הערותיו על קיצור שולחן ערוך של רבי שלמה גנצפריד, לפי מנהגי הספרדים והאשכנזים.',
          en: "His notes on Rabbi Shlomo Ganzfried's Kitzur Shulchan Aruch, covering Sephardi and Ashkenazi customs.",
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'החיד״א שב לירושלים',
          en: 'Bringing the Chida home',
        },
        text: {
          he: 'החיד״א, רבי חיים יוסף דוד אזולאי, נפטר בליבורנו שבאיטליה בשנת 1806 ונקבר שם. בשנת 1960 הועלו עצמותיו לירושלים, ביוזמת הרב הראשי יצחק נסים, שהטיל על הרב אליהו את האחריות למשימה מן הצד הישראלי. הרב אליהו ליווה בעצמו את העצמות עד קבורתן בהר המנוחות. חמישים שנה אחר כך נקבר הרב אליהו באותה חלקה, סמוך לחיד״א.',
          en: 'The Chida, Rabbi Chaim Yosef David Azulai, died in Livorno, Italy, in 1806 and was buried there. In 1960 his remains were brought to Jerusalem, a move begun by Chief Rabbi Yitzhak Nissim, who put Rabbi Eliyahu in charge of the mission on the Israeli side. Rabbi Eliyahu took care of the remains himself until their burial on Har HaMenuchot. Fifty years later he was buried in the same plot, beside the Chida.',
        },
        source:
          "Michal Arieli, interview with Rabbi Chaim Svissa, Hidabroot, 13 June 2023: https://www.hidabroot.org/article/1182909; Hebrew Wikipedia 'חיים יוסף דוד אזולאי': https://he.wikipedia.org/wiki/חיים_יוסף_דוד_אזולאי; Hebrew Wikipedia 'מרדכי אליהו': https://he.wikipedia.org/wiki/מרדכי_אליהו",
      },
    ],
    grave: {
      place: {
        he: 'הר המנוחות, ירושלים, סמוך לאוהל החיד״א',
        en: 'Har HaMenuchot, Jerusalem, beside the tomb of the Chida',
      },
      lat: 31.797244,
      lng: 35.179469,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Mordechai_Eliyahu',
      'https://he.wikipedia.org/wiki/מרדכי_אליהו',
      'https://he.wikipedia.org/wiki/חיים_יוסף_דוד_אזולאי',
      'https://www.hidabroot.org/article/1182909',
      'https://jta.org/?p=435419',
      'https://www.israelnationalnews.com/news/137926',
    ],
  },
  rav_elyashiv: {
    bio: {
      he: 'הרב יוסף שלום אלישיב (תר״ע–תשע״ב, 1910–2012) נולד בשאוולי שבליטא, נכדו של המקובל רבי שלמה אלישיב, בעל ״לשם שבו ואחלמה״. בתחילת שנות העשרים, כנער, עלה עם משפחתו לירושלים. נשא את בתו של רבי אריה לוין, ושימש שנים רבות דיין בבתי הדין הרבניים, ובהם בית הדין הרבני הגדול. משנות השבעים הקדיש את זמנו ללימוד, לשיעורים ולמענה על שאלות, ונחשב לגדול פוסקי ההלכה בדורו. נפטר בכ״ח בתמוז תשע״ב, בן 102.',
      en: "Rabbi Yosef Shalom Elyashiv (1910–2012) was born in Šiauliai, Lithuania, a grandson of the kabbalist Rabbi Shlomo Elyashiv, author of Leshem Shevo VeAchlamah. His family brought him to Jerusalem in the early 1920s. He married the daughter of Rabbi Aryeh Levin and served for years as a rabbinical judge, including on the Supreme Rabbinical Court. Later he devoted himself to study and answering questions, regarded as his generation's foremost halachic authority. He died on 28 Tammuz 5772, aged 102.",
    },
    lessons: [
      {
        title: {
          he: 'התמדה בלי הפסקה',
          en: 'Unceasing diligence',
        },
        text: {
          he: 'במשך שנים רבות פתח את יומו בשלוש לפנות בוקר, וישן שלוש או ארבע שעות בלילה בלבד. את רוב שעות היממה הקדיש ללימוד תורה ולמענה על שאלות.',
          en: 'For many years he began his day at three in the morning and slept only three or four hours a night. He devoted most of his day to Torah study and to answering questions.',
        },
      },
      {
        title: {
          he: 'חיים צנועים',
          en: 'A modest life',
        },
        text: {
          he: 'מאז נישואיו ועד יומו האחרון גר בדירה קטנה בשכונת מאה שערים, ומעולם לא עמד בראש ישיבה או קהילה. גדולתו לא נמדדה בתארים או ברכוש.',
          en: 'From his marriage to his last day he lived in a small apartment in Meah Shearim, and he never headed a yeshiva or a community. His greatness was not measured in titles or possessions.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'קובץ תשובות',
          en: 'Kovetz Teshuvot',
        },
        about: {
          he: 'שאלות ותשובות בהלכה, בחמישה חלקים.',
          en: 'Halachic responsa, in five volumes.',
        },
      },
      {
        title: {
          he: 'הערות',
          en: "He'arot",
        },
        about: {
          he: 'סיכומי שיעוריו על מסכתות התלמוד הבבלי, שערכו תלמידיו.',
          en: 'Summaries of his lectures on tractates of the Babylonian Talmud, edited by his students.',
        },
      },
      {
        title: {
          he: 'כתבוני לדורות',
          en: 'Kitvuni LeDorot',
        },
        about: {
          he: 'יותר מארבע מאות מכתבים בענייני השקפה.',
          en: 'Over four hundred letters on matters of outlook.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'הבטחת הסבא',
          en: "The grandfather's promise",
        },
        text: {
          he: 'לפי המסורת במשפחה, אמו של הרב אלישיב הייתה חשוכת ילדים שש עשרה שנה. פעם אחת נמנעה מלכעוס על שכנה נסערת. לפי המסופר, אביה, המקובל רבי שלמה אלישיב, אמר לה שבזכות זאת תזכה לבן גדול בתורה, ואכן נולד לה בנה יוסף שלום.',
          en: "According to family tradition, Rabbi Elyashiv's mother was childless for sixteen years. Once she refrained from anger at a distraught neighbor. As the story goes, her father, the kabbalist Rabbi Shlomo Elyashiv, told her that in this merit she would have a son great in Torah, and her son Yosef Shalom was born.",
        },
        source:
          "Sandy Eller, 'The Life Of A Legendary Posek', The Jewish Press, 25 July 2012: https://jewishpress.com/the-life-of-a-legendary-posek/",
      },
      {
        title: {
          he: 'השידוך של הרב קוק',
          en: "Rav Kook's match",
        },
        text: {
          he: 'הרב אברהם יצחק הכהן קוק, הרב הראשי לארץ ישראל, הציע לרב אלישיב הצעיר, אז כבן תשע עשרה, לשאת את שיינא חיה, בתו של רבי אריה לוין. הרב קוק גם סידר את הקידושין בחתונתם, שנערכה בשנת 1930.',
          en: 'Rabbi Avraham Yitzchak HaKohen Kook, Chief Rabbi of the Land of Israel, suggested that the young Rabbi Elyashiv, then about nineteen, marry Sheina Chaya, daughter of Rabbi Aryeh Levin. Rav Kook also officiated at their wedding in 1930.',
        },
        source:
          "Yeshiva World News, 'Rav Aviner On The Petira Of Maran Rav Elyashiv': https://www.theyeshivaworld.com/news/headlines-breaking-stories/135010/rav-aviner-on-the-petira-of-maran-rav-elyashiv.html; The Jewish Press, 25 July 2012: https://jewishpress.com/the-life-of-a-legendary-posek/",
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין הר המנוחות, ירושלים',
        en: 'Har HaMenuchot cemetery, Jerusalem',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית העלמין הר המנוחות',
    },
    sources: [
      'https://en.wikipedia.org/wiki/Yosef_Shalom_Elyashiv',
      'https://he.wikipedia.org/wiki/יוסף_שלום_אלישיב',
      'https://jewishpress.com/the-life-of-a-legendary-posek/',
      'https://www.theyeshivaworld.com/news/headlines-breaking-stories/135010/rav-aviner-on-the-petira-of-maran-rav-elyashiv.html',
    ],
  },
  ovadia_yosef: {
    bio: {
      he: 'הרב עובדיה יוסף (תרפ״א–תשע״ד, 1920–2013) נולד בבגדאד ועלה עם משפחתו לירושלים בגיל ארבע. למד בישיבת ״פורת יוסף״. כיהן כאב בית דין בקהיר, כדיין בפתח תקווה ובירושלים, כרב הראשי הספרדי של תל אביב, ובשנים תשל״ג–תשמ״ג כראשון לציון והרב הראשי הספרדי לישראל. בספריו ״יביע אומר״ ו״יחווה דעת״ פסק לפי שיטת מרן השולחן ערוך, ושאף ״להחזיר עטרה ליושנה״. נפטר בג׳ בחשוון תשע״ד.',
      en: "Rabbi Ovadia Yosef (1920–2013) was born in Baghdad and came to Jerusalem at age four. A student of Porat Yosef yeshiva, he headed the rabbinical court in Cairo, sat as a judge in Petah Tikva and Jerusalem, and served as Sephardi Chief Rabbi of Tel Aviv and then, until 1983, as Rishon LeZion. In Yabia Omer and Yechaveh Da'at he ruled by the Shulchan Aruch, seeking to 'restore the crown to its former glory.' He died on 3 Cheshvan 5774.",
    },
    lessons: [
      {
        title: {
          he: 'להחזיר עטרה ליושנה',
          en: 'Restoring the crown',
        },
        text: {
          he: 'שאף להחזיר את כבודה של מסורת ההלכה הספרדית ולאחד את הפסיקה סביב מרן רבי יוסף קארו, בעל השולחן ערוך. נטע גאווה במורשת האבות ובכבודה של כל עדה.',
          en: 'He sought to restore the honor of the Sephardic halachic tradition and to unite rulings around Rabbi Yosef Karo, author of the Shulchan Aruch. He instilled pride in ancestral heritage and in the dignity of every community.',
        },
      },
      {
        title: {
          he: 'התורה קודמת',
          en: 'Torah comes first',
        },
        text: {
          he: 'מילדותו הקדיש את רוב זמנו ללימוד, גם כשמשפחתו נזקקה לעזרתו בחנות. מתוך התמדה זו חיבר עשרות כרכים של פסיקה, שהשפיעו על רבים.',
          en: 'From childhood he devoted most of his time to study, even when his family needed his help in the shop. From that diligence came dozens of volumes of rulings that influenced many.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'יביע אומר',
          en: 'Yabia Omer',
        },
        about: {
          he: 'שאלות ותשובות בהלכה, המפורסם בספריו.',
          en: 'Halachic responsa, his best-known work.',
        },
      },
      {
        title: {
          he: 'יחווה דעת',
          en: "Yechaveh Da'at",
        },
        about: {
          he: 'תשובות קצרות וממוקדות בשאלות מעשיות.',
          en: 'Shorter, focused responsa on practical questions.',
        },
      },
      {
        title: {
          he: 'חזון עובדיה',
          en: 'Chazon Ovadia',
        },
        about: {
          he: 'פסקי הלכה לשבת ולמועדים; הכרך הראשון, על הלכות פסח, היה ספרו הראשון.',
          en: 'Rulings on Shabbat and the festivals; the first volume, on Passover, was his first book.',
        },
      },
      {
        title: {
          he: 'הליכות עולם',
          en: 'Halichot Olam',
        },
        about: {
          he: 'עיון הלכתי בפסקי הספר ״בן איש חי״.',
          en: 'Halachic discussion of the rulings in the Ben Ish Chai.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'שליח במקום הבן',
          en: 'A delivery boy in his place',
        },
        text: {
          he: 'כשהיה עובדיה נער, הפסיק לבוא לישיבה, כי אביו נזקק לו כשליח בחנות המכולת של המשפחה. ראש הישיבה, רבי עזרא עטיה, בא לבית המשפחה וניסה לשכנע את האב, ללא הצלחה. למחרת בבוקר מצא האב את הרב עטיה מחכה ליד החנות בבגדי עבודה, מוכן לעשות את המשלוחים בעצמו כדי שהנער ישוב ללמוד. האב התרצה, ועובדיה חזר לישיבה.',
          en: 'As a boy, Ovadia stopped coming to yeshiva because his father needed him as a delivery boy in the family grocery. The rosh yeshiva, Rabbi Ezra Attiya, came to the family home and tried to persuade the father, without success. The next morning the father found Rabbi Attiya waiting outside the shop in work clothes, ready to make the deliveries himself so the boy could return to learning. The father relented, and Ovadia went back to yeshiva.',
        },
        source:
          "Rabbi Chaim Levy, 'Rabbi Ovadia Yosef: Torah's Commander-in-Chief', Aish.com: https://aish.com/rabbi-ovadia-yosef-torahs-commander-in-chief/; also told on NJOP: https://njop.org/a-sephardi-gaon-2",
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין סנהדריה, ירושלים, ליד קבר רעייתו הרבנית מרגלית',
        en: 'Sanhedria cemetery, Jerusalem, beside his wife Rabbanit Margalit',
      },
      lat: 31.796264,
      lng: 35.220282,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://en.wikipedia.org/wiki/Ovadia_Yosef',
      'https://aish.com/rabbi-ovadia-yosef-torahs-commander-in-chief/',
      'https://njop.org/a-sephardi-gaon-2',
      'https://meshiv.co.il/?p=27321',
    ],
  },
  shmuel_wosner: {
    bio: {
      he: 'הרב שמואל הלוי וואזנר (תרע״ג–תשע״ה, 1913–2015), המכונה ״שבט הלוי״ על שם ספרו, נולד בווינה ולמד בישיבת חכמי לובלין אצל רבי מאיר שפירא. בשנת 1938 עלה לארץ ישראל, ובשנת 1947, בעצת החזון איש, עבר לבני ברק ונעשה רבה של שכונת זכרון מאיר. שם הקים מחדש את ישיבת חכמי לובלין ובית הוראה, ורבים ראו בו פוסק הדור. נפטר בליל הסדר, בט״ו בניסן תשע״ה, בגיל 101. יום ההילולא חל תמיד ביום טוב, ובשנת תשפ״ב נערכה העלייה לקברו בערב ראש חודש ניסן.',
      en: "Rabbi Shmuel HaLevi Wosner (1913–2015), the Shevet HaLevi, born in Vienna, studied under Rabbi Meir Shapiro at Chachmei Lublin. He came to Eretz Yisrael in 1938; in 1947, advised by the Chazon Ish, he became rabbi of Zichron Meir in Bnei Brak, founding Chachmei Lublin anew and a beit hora'ah. Many called him posek hador. He died on Seder night, 15 Nisan 5775 (2015), aged 101; always Yom Tov; in 5782 his grave was visited on erev Rosh Chodesh Nisan.",
    },
    lessons: [
      {
        title: {
          he: 'הכרת הטוב על ההצלה',
          en: 'Gratitude for a rescue',
        },
        text: {
          he: 'בדרכו לארץ ישראל בשנת 1938 עברה ספינתו מסע קשה וסכנה בים. מדי שנה כינס את צאצאיו ותלמידיו כדי להודות לה׳ על ההצלה. חסד שקיבלנו ראוי לזכור ולהודות עליו גם שנים רבות אחר כך.',
          en: 'Sailing to the Land of Israel in 1938, his ship faced danger at sea. Every year he gathered his descendants and students to thank God for the rescue. A kindness received deserves thanks for years after.',
        },
      },
      {
        title: {
          he: 'זמין לכל שואל',
          en: 'Available to every questioner',
        },
        text: {
          he: 'לפי בני משפחתו השיב בדרך כלל על כשלושת אלפים שאלות הלכה בחודש, כמאה ביום, ועד יומו האחרון המשיך ללמוד וללמד. גדול בתורה אינו מתרחק מן הציבור, אלא משרת אותו בכל יום.',
          en: 'According to his family, he usually answered some three thousand halachic questions a month, about a hundred a day, and kept learning and teaching to his last day. A great scholar does not withdraw from people but serves them daily.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'שו״ת שבט הלוי',
          en: 'Shevet HaLevi',
        },
        about: {
          he: 'שאלות ותשובות בהלכה, באחד עשר כרכים ומפתח, ובהן שאלות רבות שהעלתה הטכנולוגיה החדשה.',
          en: 'Halachic responsa in eleven volumes and an index, including many questions raised by modern technology.',
        },
      },
      {
        title: {
          he: 'שיעורי שבט הלוי',
          en: 'Shiurei Shevet HaLevi',
        },
        about: {
          he: 'שיעוריו בהלכות נדה, שערך תלמידו הרב מרדכי גרוס.',
          en: 'His lectures on the laws of niddah, edited by his student Rabbi Mordechai Gross.',
        },
      },
      {
        title: {
          he: 'דרשות שבט הלוי',
          en: 'Derashot Shevet HaLevi',
        },
        about: {
          he: 'קובץ דרשותיו.',
          en: 'A collection of his sermons.',
        },
      },
      {
        title: {
          he: 'חידושי שבט הלוי על הש״ס',
          en: 'Chiddushei Shevet HaLevi al HaShas',
        },
        about: {
          he: 'חידושיו על התלמוד, ובהם על מסכתות שבת ופסחים.',
          en: 'His Talmudic novellae, including on tractates Shabbat and Pesachim.',
        },
      },
      {
        title: {
          he: 'ספר הלקט על הרמב״ם',
          en: 'Sefer HaLeket al HaRambam',
        },
        about: {
          he: 'ספרו הראשון, על משנה תורה לרמב״ם, שיצא לאור בשנת תש״ד.',
          en: "His first book, on Maimonides' Mishneh Torah, published in 1944.",
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'בהמתנה לרכבת',
          en: 'Waiting for the train',
        },
        text: {
          he: 'כשבא הצעיר להתקבל לישיבת חכמי לובלין, נאמר לו שהוא צעיר מדי. בזמן שהמתין לרכבת שתחזיר אותו הביתה, ישב ולמד בבית המדרש. רבי מאיר שפירא ראה אותו לומד, התרשם, וקיבל אותו לתקופת ניסיון של שלושה חודשים, שנמשכה בסוף חמש שנים. לדבריו, במשך שנה וחצי כמעט לא יצא מן הישיבה.',
          en: 'When the young Shmuel came to be admitted to Yeshivat Chachmei Lublin, he was told he was too young. While waiting for the train home, he sat and learned in the study hall. Rabbi Meir Shapiro saw him learning, was impressed, and accepted him for a three-month trial that lasted five years. He later said that for a year and a half he hardly saw the outside of the yeshiva.',
        },
        source:
          "Dei'ah veDibur, 'HaRav Shmuel Halevi Wosner zt\"l', Tazria 5775 (https://www.chareidi.org/archives5775/tazria/arwosnertzr75.htm)",
      },
      {
        title: {
          he: 'ליווי של החזון איש',
          en: "The Chazon Ish's escort",
        },
        text: {
          he: 'כשהתלבט אם לקבל את רבנות זכרון מאיר, בא להתייעץ עם החזון איש, שלא השיב לו דבר. כשקם ללכת, הציע החזון איש ללוות אותו, ואמר שאין ראוי שרב ילך לבדו ברחובות העיר. הרב וואזנר הבין מכך שעליו לקבל את המשרה, ואכן נעשה רבה של השכונה.',
          en: 'Unsure whether to accept the rabbinate of Zichron Meir, he went to consult the Chazon Ish, who gave him no answer. When he rose to leave, the Chazon Ish offered to walk with him, saying a rabbi should not walk alone through the city. Rabbi Wosner took this as a sign to accept the post, and he became the rabbi of the neighborhood.',
        },
        source:
          "Dei'ah veDibur, 'HaRav Shmuel Halevi Wosner zt\"l', Tazria 5775 (https://www.chareidi.org/archives5775/tazria/arwosnertzr75.htm)",
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין שומרי שבת (זכרון מאיר), בני ברק',
        en: 'Shomrei Shabbat (Zichron Meir) cemetery, Bnei Brak',
      },
      lat: null,
      lng: null,
      link: true,
      query: 'בית העלמין שומרי שבת בני ברק',
      noLinkReason: null,
    },
    sources: [
      'https://he.wikipedia.org/wiki/שמואל_הלוי_וואזנר',
      'https://en.wikipedia.org/wiki/Shmuel_Wosner',
      'https://www.toraland.org.il/%D7%9E%D7%90%D7%9E%D7%A8%D7%99%D7%9D/%D7%AA%D7%95%D7%A8%D7%AA-%D7%97%D7%9B%D7%9E%D7%99-%D7%99%D7%A9%D7%A8%D7%90%D7%9C/%D7%98%D7%95-%D7%A0%D7%99%D7%A1%D7%9F-%D7%94%D7%A8%D7%91-%D7%A9%D7%9E%D7%95%D7%90%D7%9C-%D7%94%D7%9C%D7%95%D7%99-%D7%95%D7%95%D7%90%D7%96%D7%A0%D7%A8-%D7%A1%D7%A4%D7%99%D7%A8%D7%AA-%D7%94%D7%A2%D7%95%D7%9E%D7%A8/',
      'https://www.kikar.co.il/haredim-news/166773',
      'https://www.kikar.co.il/hasidism/rebbe-shmuel-wosner-memorial',
      'https://he.mishpacha.com/%D7%9C%D7%90-%D7%99%D7%A1%D7%95%D7%A8-%D7%A9%D7%91%D7%98/',
      'https://www.chareidi.org/archives5775/tazria/arwosnertzr75.htm',
      'https://www.jdn.co.il/flashes/1725891/',
      'https://www.ynet.co.il/articles/0,7340,L-4639784,00.html',
      'https://www.genazym.com/?p=3646',
      'https://breslevcity.co.il/%D7%A8%D7%91%D7%99-%D7%97%D7%99%D7%99%D7%9D-%D7%9E%D7%90%D7%99%D7%A8-%D7%94%D7%9C%D7%95%D7%99-%D7%95%D7%95%D7%90%D7%96%D7%A0%D7%A8/',
    ],
  },
  aharon_leib_shteinman: {
    bio: {
      he: 'הרב אהרן יהודה לייב שטיינמן (תרע״ה–תשע״ח, 1914–2017) נולד בקמניץ וגדל בבריסק. בשנת 1937 עבר לשווייץ ללמוד בישיבה במונטרה, ובמלחמת העולם השנייה הוחזק במחנה עבודה ליד באזל. אחרי המלחמה עלה לארץ, עמד בראש ישיבת פוניבז׳ לצעירים וכולל פוניבז׳ בבני ברק, וייסד את ישיבות גאון יעקב ואורחות תורה. רבים ראו בו את מנהיג הציבור הליטאי, והוא חי כל ימיו בצניעות רבה. נפטר בערב חנוכה, כ״ד בכסלו תשע״ח.',
      en: "Rabbi Aharon Yehuda Leib Shteinman (1914–2017), born in Kamenets and raised in Brisk, went in 1937 to a yeshiva in Montreux, Switzerland, and in World War II was held in a labor camp near Basel. After the war he came to Israel, headed the Ponevezh yeshiva for younger students and kollel in Bnei Brak, and founded the Gaon Yaakov and Orchot Torah yeshivot. Many saw him as the Lithuanian community's leader. He died on erev Chanukah, 24 Kislev 5778.",
    },
    lessons: [
      {
        title: {
          he: 'פשטות בחיי היום יום',
          en: 'Simplicity in daily life',
        },
        text: {
          he: 'בצעירותו, בישיבה בקלצק, אכל לעתים קרובות רק תפוחי אדמה מבושלים במים, ועשרות שנים גר בדירה קטנה ודלה ברחוב חזון איש בבני ברק. מי שמסתפק במועט פנוי ללימוד ולזולת.',
          en: 'As a student in Kletsk he often ate only boiled potatoes, and for decades he lived in a small, bare flat on Chazon Ish Street, Bnei Brak. One content with little is free for learning and for others.',
        },
      },
      {
        title: {
          he: 'ללכת אל הרחוקים',
          en: 'Going to those far away',
        },
        text: {
          he: 'אחרי גיל תשעים יצא לנסיעות רבות לקהילות יהודיות בצפון אמריקה, בדרום אמריקה ובאירופה, גם רחוקות ממרכזי התורה, כדי לחזק בהן לימוד וחינוך. גיל ומרחק אינם פוטרים מדאגה לכל יהודי.',
          en: 'Past ninety he travelled to Jewish communities in North and South America and Europe, including ones far from the centres of Torah, to strengthen learning and education. Age and distance excuse no one from caring for every Jew.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'אילת השחר',
          en: 'Ayelet HaShachar',
        },
        about: {
          he: 'סדרת חידושיו על התורה ועל מסכתות רבות בש״ס, הידועה בספריו.',
          en: 'His best-known series, novellae on the Torah and on many tractates of the Talmud.',
        },
      },
      {
        title: {
          he: 'חסד ומשפט',
          en: 'Chesed UMishpat',
        },
        about: {
          he: 'חידושים על מסכת סנהדרין.',
          en: 'Novellae on Tractate Sanhedrin.',
        },
      },
      {
        title: {
          he: 'ימלא פי תהלתך',
          en: 'Yimalei Pi Tehilatecha',
        },
        about: {
          he: 'שיחות מוסר, ביאור על התפילה ומכתבים לציבור וליחידים, בכמה כרכים.',
          en: 'Ethical talks, a commentary on the prayers and letters to the public and to individuals, in several volumes.',
        },
      },
      {
        title: {
          he: 'מפקודיך אתבונן',
          en: 'Mipkudecha Etbonan',
        },
        about: {
          he: 'שיחות לימים הנוראים.',
          en: 'Talks for the High Holy Days.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'המזרן מהסוכנות',
          en: 'The Jewish Agency mattress',
        },
        text: {
          he: 'כשהגיע לארץ כפליט קיבל הרב שטיינמן מהסוכנות היהודית מזרן דק. על אותו מזרן ישן עשרות שנים, עד שנת 2014, בדירה הצנועה ברחוב חזון איש 5 בבני ברק, שאליה באו רבים לבקש את עצתו בענייני בית ופרנסה.',
          en: 'When he reached Israel as a refugee, the Jewish Agency gave Rabbi Shteinman a thin mattress. He slept on that same mattress for decades, until 2014, in the modest flat at 5 Chazon Ish Street in Bnei Brak, where many came to seek his advice on family and livelihood.',
        },
        source:
          "English Wikipedia, 'Aharon Leib Shteinman' (https://en.wikipedia.org/wiki/Aharon_Leib_Shteinman); The Jewish Chronicle obituary (https://www.thejc.com/news/obituaries/obituary-aharon-shteinman-uh08z2yy); JDN, 23 Kislev 5786 (https://www.jdn.co.il/j_world/2534911/)",
      },
      {
        title: {
          he: 'הצוואה',
          en: 'His will',
        },
        text: {
          he: 'בצוואתו ביקש הרב שטיינמן מאוד שלא יספידו אותו, לא בפניו ולא שלא בפניו, שהמצבה תהיה ״הכי זולה ופשוטה״, ושלא יוציאו כסף על קניית מקום יקר בבית הקברות. כבקשתו, נקבר כשש שעות אחרי פטירתו, ורבבות ליוו אותו.',
          en: "In his will Rabbi Shteinman asked that no one eulogize him, in his presence or not, that his tombstone be 'the cheapest and simplest', and that no money be spent on an expensive cemetery plot. As he asked, he was buried about six hours after his death, and tens of thousands followed his coffin.",
        },
        source:
          'Kikar HaShabbat (https://www.kikar.co.il/html/259699); JTA, 12 December 2017 (https://www.jta.org/?p=1492412); The Yeshiva World, 12 December 2017 (https://www.theyeshivaworld.com/news/featured/1424673/boruch-dayan-haemmes-gadol-hador-maran-hagaon-harav-shteinman-zatzal-updated-1019am-il.html)',
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות של נציבי ישיבת פוניבז׳, בני ברק',
        en: 'Ponevezh Yeshiva cemetery, Bnei Brak',
      },
      lat: 32.0720413,
      lng: 34.8349327,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://he.wikipedia.org/wiki/אהרן_יהודה_לייב_שטיינמן',
      'https://en.wikipedia.org/wiki/Aharon_Leib_Shteinman',
      'https://www.jdn.co.il/j_world/2534911/',
      'https://chareidi.org/archives5778/mikeitz/araylsbiomkz78.htm',
      'https://www.thejc.com/news/obituaries/obituary-aharon-shteinman-uh08z2yy',
      'https://www.jta.org/?p=1492412',
      'https://www.kikar.co.il/html/259699',
      'https://www.theyeshivaworld.com/news/featured/1424673/boruch-dayan-haemmes-gadol-hador-maran-hagaon-harav-shteinman-zatzal-updated-1019am-il.html',
      "https://he.wikipedia.org/wiki/בית_הקברות_של_נציבי_ישיבת_פוניבז'",
      'https://www.openstreetmap.org/way/62356402',
      'https://www.ynet.co.il/news/article/ry0h9ixu3',
    ],
  },
  chaim_kanievsky: {
    bio: {
      he: 'הרב שמריהו יוסף חיים קניבסקי (תרפ״ח–תשפ״ב, 1928–2022), בנו של הסטייפלר ואחיינו של החזון איש, נולד בפינסק ועלה עם משפחתו לבני ברק בשנת 1934. למד בישיבת לומז׳ה בפתח תקווה, ונשא את בתו של הרב יוסף שלום אלישיב. בבני ברק למד שעות רבות בכל יום, וחיבר עשרות ספרים בכל תחומי התורה. רבים ראו בו את גדול הדור, ואלפים פנו אליו בשאלות ובבקשת ברכה. נפטר בט״ו באדר ב׳ תשפ״ב.',
      en: "Rabbi Chaim Kanievsky (1928–2022), son of the Steipler and nephew of the Chazon Ish, was born in Pinsk and came to Bnei Brak in 1934. He studied at the Lomza yeshiva in Petah Tikva and married the daughter of Rabbi Yosef Shalom Elyashiv. He studied long hours daily and wrote dozens of books on every area of Torah. Many saw him as his generation's leading sage, and thousands sought his answers and blessings. He died on 15 Adar II 5782.",
    },
    lessons: [
      {
        title: {
          he: 'סדר לימוד קבוע',
          en: 'A fixed learning schedule',
        },
        text: {
          he: 'למד לפי סדר קבוע ומדויק, ובכל שנה סיים את התלמוד כולו ועוד ספרים רבים. לימוד יומיומי לפי תוכנית מצטבר להישגים גדולים.',
          en: 'He studied by a fixed, exact schedule, completing the entire Talmud and many other works every year. Daily study by a set plan adds up to great achievements.',
        },
      },
      {
        title: {
          he: 'מענה קצר לכל פונה',
          en: 'A brief answer for everyone',
        },
        text: {
          he: 'אלפי מכתבים בשאלות הגיעו אליו מדי שנה, והוא נהג להשיב עליהם, לרוב במילים ספורות. תשובה קצרה וברורה אפשרה לו לעזור לרבים בלי לוותר על הלימוד.',
          en: 'Thousands of letters with questions reached him every year, and he would answer them, usually in just a few words. Short, clear answers let him help many people without giving up his learning.',
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'דרך אמונה',
          en: 'Derech Emunah',
        },
        about: {
          he: 'ביאור על הלכות זרעים ברמב״ם, במתכונת ה״משנה ברורה״, בחמישה כרכים.',
          en: "Commentary on Maimonides' agricultural laws (Zeraim), in the style of the Mishnah Berurah, in five volumes.",
        },
      },
      {
        title: {
          he: 'שונה הלכות',
          en: 'Shoneh Halachot',
        },
        about: {
          he: 'תמצית פסקי ה״משנה ברורה״ והחזון איש על אורח חיים.',
          en: 'A summary of the rulings of the Mishnah Berurah and the Chazon Ish on Orach Chaim.',
        },
      },
      {
        title: {
          he: 'דרך חכמה',
          en: 'Derech Chochmah',
        },
        about: {
          he: 'ביאור על הלכות בית המקדש וכליו ברמב״ם.',
          en: "Commentary on Maimonides' laws of the Temple and its vessels.",
        },
      },
      {
        title: {
          he: 'טעמא דקרא',
          en: "Ta'ama DeKra",
        },
        about: {
          he: 'חידושים על התנ״ך.',
          en: 'Insights on the Tanach.',
        },
      },
      {
        title: {
          he: 'קריית מלך',
          en: 'Kiryat Melech',
        },
        about: {
          he: 'ציוני מקורות לספר משנה תורה לרמב״ם.',
          en: "Source references for Maimonides' Mishneh Torah.",
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'סיום בערב פסח',
          en: 'A siyum on the eve of Passover',
        },
        text: {
          he: 'מדי שנה סיים הרב קניבסקי את התלמוד כולו, יחד עם ספרים רבים נוספים, ואת הסיום ערך בערב פסח, כדי שסעודת המצווה תפטור אותו, כבכור, מתענית בכורות. בדרך כלל השתתפו בסיום מאות. בשנתו האחרונה, תשפ״ב, שהייתה שנה מעוברת, איפשר לו החודש הנוסף לסיים את התלמוד כבר בערב פורים, יומיים לפני פטירתו.',
          en: 'Every year Rabbi Kanievsky completed the entire Talmud, along with many other works, and held the siyum on the eve of Passover, so that the festive meal released him, as a firstborn, from the Fast of the Firstborn. Hundreds usually attended. In his last year, 5782, a leap year, the extra month let him finish the Talmud already on the eve of Purim, two days before his death.',
        },
        source:
          "Hebrew Wikipedia 'חיים קניבסקי' (the Erev Pesach siyum and the Fast of the Firstborn, citing JDN, 16 Nisan 5778): https://he.wikipedia.org/wiki/חיים_קניבסקי; Yeshiva World News, 8 April 2020 (the annual siyum, normally attended by hundreds): https://www.theyeshivaworld.com/news/featured/1848310/hagaon-harav-chaim-kanievsky-makes-76th-annual-siyum-on-entire-torah-photos.html; Yeshiva World News, 21 March 2022 (finished on Erev Purim thanks to the extra month): https://www.theyeshivaworld.com/news/israel-news/2070981/thousands-pay-shiva-calls-dozens-of-babies-named-shmaryahu-yosef-chaim.html",
      },
      {
        title: {
          he: 'עם הגמרא על הגבעה',
          en: 'A Gemara on the hill',
        },
        text: {
          he: 'במלחמת העצמאות גויסו תלמידי ישיבת לומז׳ה לשמירה בחזית המצרית. לפי המסופר, מפקדם, הרב שמואל גרוסברד, הורה לחיים הצעיר לעלות עם הגמרא שלו לראש הגבעה, ושם המשיך ללמוד עד שהסתיימו הקרבות.',
          en: 'In the 1948 war, students of the Lomza yeshiva were drafted for guard duty on the Egyptian front. As recounted, their commander, Rabbi Shmuel Grossbard, told young Chaim to take his Gemara up to the top of the hill, and there he kept learning until the fighting ended.',
        },
        source:
          "Shai Eisenberg, Behadrei Haredim, 25 August 2009, cited in Hebrew Wikipedia 'חיים קניבסקי': https://he.wikipedia.org/wiki/חיים_קניבסקי",
      },
    ],
    grave: {
      place: {
        he: 'בית העלמין שומרי שבת, בני ברק, ליד קברי רעייתו, אביו הסטייפלר ודודו החזון איש',
        en: 'Shomrei Shabbat cemetery, Bnei Brak, near the graves of his wife, his father the Steipler and his uncle the Chazon Ish',
      },
      lat: null,
      lng: null,
      link: true,
      noLinkReason: null,
      query: 'בית העלמין שומרי שבת בני ברק',
    },
    sources: [
      'https://en.wikipedia.org/wiki/Chaim_Kanievsky',
      'https://he.wikipedia.org/wiki/חיים_קניבסקי',
      'https://www.timesofisrael.com/rabbi-chaim-kanievsky-one-of-israels-leading-religious-authorities-dies-at-94/',
      'https://www.jta.org/2022/03/18/obituaries/chaim-kanievsky-haredi-rabbi-known-as-prince-of-torah-dies-at-94',
      'https://www.theyeshivaworld.com/news/israel-news/2070981/thousands-pay-shiva-calls-dozens-of-babies-named-shmaryahu-yosef-chaim.html',
      'https://he.wikipedia.org/wiki/בית_הקברות_שומרי_שבת',
    ],
  },
  gershon_edelstein: {
    bio: {
      he: 'הרב ירחמיאל גרשון אדלשטיין (תרפ״ג–תשפ״ג, 1923–2023) נולד בשומיאץ שבברית המועצות, בנו של רב העיירה, ובשנת 1934 עלה עם משפחתו לרמת השרון. למד בישיבת לומז׳ה בפתח תקווה, והיה מששת התלמידים הראשונים של ישיבת פוניבז׳ בבני ברק. בה לימד יותר משבעים וחמש שנה, ומשנת תש״ס כיהן כאחד מראשי הישיבה. היה ממנהיגי היהדות החרדית הליטאית ונשיא ועד הישיבות, ונודע בדרכו הרכה בחינוך. נפטר בי׳ בסיוון תשפ״ג, בן מאה.',
      en: 'Rabbi Yerachmiel Gershon Edelstein (1923–2023), son of the rabbi of Shumyachi, USSR, came to Ramat HaSharon in 1934. After the Lomza yeshiva in Petah Tikva, he was among the first six students of the Ponevezh Yeshiva in Bnei Brak, taught there over 75 years and from 2000 was a rosh yeshiva. A Lithuanian Haredi leader and president of the Vaad HaYeshivot, he was known for gentleness in education. He died on 10 Sivan 5783 (2023), aged 100.',
    },
    lessons: [
      {
        title: {
          he: 'בדרכי נועם, בלי כפייה',
          en: 'Gently, without coercion',
        },
        text: {
          he: 'כשנשאל על הורים הלוחצים על נער שמאחר לתפילה, השיב: ״בדרכי נועם! בלי כפיה!״. הוא הורה גם לנהוג בנושרים, שעזבו את הדרך, מנהג כבוד וידידות.',
          en: "Asked about parents pressing a teenager who came late to prayer, he answered: 'Gently! Without coercion!' He also taught that young people who left the path be treated with respect and friendship.",
        },
      },
      {
        title: {
          he: 'לשתוק ולכבד',
          en: 'Stay silent and show respect',
        },
        text: {
          he: 'לבעלים שהתקשו בשלום הבית נתן עצה קצרה: ״לשתוק ולכבד״. ויתור על המילה האחרונה וכבוד לבן הזוג בונים בית יותר מכל ויכוח.',
          en: "To husbands struggling with harmony at home he gave short advice: 'stay silent and show respect.' Giving up the last word and honoring one's spouse builds a home more than any argument.",
        },
      },
    ],
    biblical: false,
    works: [
      {
        title: {
          he: 'ממגד גרש ירחים',
          en: 'Mimeged Geresh Yerachim',
        },
        about: {
          he: 'חידושים על התלמוד הבבלי, מתוך שיעוריו בישיבת פוניבז׳.',
          en: 'Insights on the Babylonian Talmud, drawn from his lectures at the Ponevezh Yeshiva.',
        },
      },
      {
        title: {
          he: 'הערות וביאורים על הש״ס',
          en: "He'arot UBiurim on Shas",
        },
        about: {
          he: 'הערות וביאורים על מסכתות התלמוד, שראו אור משנת תשפ״א.',
          en: 'Notes and explanations on the tractates of the Talmud, published from 5781 (2020).',
        },
      },
      {
        title: {
          he: 'הערות וביאורים על סדר הרמב״ם',
          en: "He'arot UBiurim on the Rambam",
        },
        about: {
          he: 'הערות על משנה תורה לרמב״ם, שערכו תלמידיו ויצאו לאור בשנת 2012.',
          en: "Notes on Maimonides' Mishneh Torah, edited by his students and published in 2012.",
        },
      },
      {
        title: {
          he: 'שיעורי רבי גרשון',
          en: 'Shiurei Rabbi Gershon',
        },
        about: {
          he: 'סדרת שיעוריו על המסכתות הנלמדות בישיבת פוניבז׳.',
          en: 'A series of his lectures on the tractates studied at the Ponevezh Yeshiva.',
        },
      },
      {
        title: {
          he: 'אסיפת שמועות',
          en: 'Asifat Shemuot',
        },
        about: {
          he: 'מאמרים ושיחות על המועדים.',
          en: 'Essays and talks on the festivals.',
        },
      },
    ],
    stories: [
      {
        title: {
          he: 'שיעור בחדר בבית החולים',
          en: 'A lesson in the hospital room',
        },
        text: {
          he: 'בערב חג השבועות תשפ״ג אושפז הרב אדלשטיין, בן מאה, בבית החולים מעייני הישועה בבני ברק בשל קשיי נשימה. גם שם עסק בהכנת שיעור, ויום לפני פטירתו מסר שיעור לתלמידיו בחדרו בבית החולים. כך לימד תורה כמעט עד נשימתו האחרונה.',
          en: 'On the eve of Shavuot 5783, Rabbi Edelstein, aged 100, was admitted to Maayanei HaYeshua hospital in Bnei Brak with breathing difficulties. Even there he worked on preparing a lesson, and the day before he died he gave a lesson to his students in his hospital room. He taught Torah almost to his last breath.',
        },
        source:
          'Hidabroot (https://www.hidabroot.org/article/1196187); Chief Rabbi of South Africa, "The end of an era", June 2023 (https://chiefrabbi.co.za/2023/06/the-end-of-an-era/)',
      },
      {
        title: {
          he: 'השופר שחזר לבעליו',
          en: 'The shofar returned to its owner',
        },
        text: {
          he: 'משנת תש״ו ועד שנתו האחרונה תקע הרב אדלשטיין בשופר בראש השנה בישיבת פוניבז׳. כשנפטר בעליו של השופר שבו תקע, החזיר אותו ליורשים, ובחר שופר אחר מאוסף של חסיד, שסירב לקבל תשלום. לנינו אמר שמיד אחרי פטירתו, עוד לפני ההלוויה, יוחזר השופר לבעליו. וכך היה: כשעה אחרי פטירתו יצא אחד ממקורביו מביתו עם השופר, להשיבו לבעליו.',
          en: "From 1946 until his last year, Rabbi Edelstein blew the shofar on Rosh Hashanah at the Ponevezh Yeshiva. When the owner of the shofar he used died, he returned it to the heirs and chose another from a Chassid's collection; the owner refused payment. He told his great-grandson that right after his death, before the funeral, the shofar must go back to its owner. About an hour after he died, a close aide carried it out.",
        },
        source:
          "English Wikipedia, 'Gershon Edelstein' (shofar blower from 1946, https://en.wikipedia.org/wiki/Gershon_Edelstein); Shuki Lerer, JDN, 20 Sivan 5783 (eyewitness account of the shofar's return, https://www.jdn.co.il/articles-and-opinions/1980425/)",
      },
    ],
    grave: {
      place: {
        he: 'בית הקברות של נציבי ישיבת פוניבז׳, בני ברק',
        en: 'Ponevezh Yeshiva cemetery, Bnei Brak',
      },
      lat: 32.0720413,
      lng: 34.8349327,
      link: true,
      noLinkReason: null,
    },
    sources: [
      'https://he.wikipedia.org/wiki/גרשון_אדלשטיין',
      'https://en.wikipedia.org/wiki/Gershon_Edelstein',
      'https://www.inn.co.il/news/603023',
      'https://www.hidabroot.org/article/1196187',
      'https://www.ynet.co.il/judaism/article/rkterz7un',
      'https://jewishlink.news/200-000-gather-for-funeral-of-harav-gershon-edelstein-zt-l/',
      'https://chiefrabbi.co.za/2023/06/the-end-of-an-era/',
      'https://www.jdn.co.il/articles-and-opinions/1980425/',
      'https://www.wikidata.org/wiki/Q6608024',
      'https://www.openstreetmap.org/way/157513479',
      'https://breslev.com/?p=3966631',
      "https://he.wikipedia.org/wiki/בית_הקברות_של_נציבי_ישיבת_פוניבז'",
      'https://www.openstreetmap.org/way/62356402',
    ],
  },
};

export function hilulaPage(id: string): HilulaPage | undefined {
  return HILULA_PAGES[id];
}

export function wazeUrl(grave: HilulaPage['grave']): string | null {
  const { link, lat, lng, query } = grave;
  if (!link) return null;
  if (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }
  return query?.trim() ? `https://waze.com/ul?q=${encodeURIComponent(query.trim())}&navigate=yes` : null;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
