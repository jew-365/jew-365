import { HILULOT } from '@/data/hilulot';
import { HILULA_PAGES, hilulaPage, wazeUrl, wordCount, type Bilingual, type HilulaPage } from '@/data/hilulaPages';

const NIKUD = /[֑-ֽֿׁׂׄ-ׇ]/;
const LATIN = /[A-Za-z]/;
const HEBREW = /[֐-׿]/;
const BIO_MAX_WORDS = 80;
const STORY_MAX_WORDS = 80;
const LESSON_MAX_WORDS = 40;

const words = (count: number) => Array.from({ length: count }, () => 'word').join(' ');
const hebrewWords = (count: number) => Array.from({ length: count }, () => 'מילה').join(' ');
const both = (he: string, en: string): Bilingual => ({ he, en });

function textsOf(page: HilulaPage): [string, Bilingual][] {
  return [
    ['bio', page.bio],
    ...page.lessons.flatMap((lesson, index): [string, Bilingual][] => [
      [`lessons[${index}].title`, lesson.title],
      [`lessons[${index}].text`, lesson.text],
    ]),
    ...page.works.flatMap((work, index): [string, Bilingual][] => [
      [`works[${index}].title`, work.title],
      [`works[${index}].about`, work.about],
    ]),
    ...page.stories.flatMap((story, index): [string, Bilingual][] => [
      [`stories[${index}].title`, story.title],
      [`stories[${index}].text`, story.text],
    ]),
    ['grave.place', page.grave.place],
    ...(page.grave.noLinkReason ? [['grave.noLinkReason', page.grave.noLinkReason] as [string, Bilingual]] : []),
  ];
}

function pageProblems(id: string, page: HilulaPage): string[] {
  const problems: string[] = [];
  const problem = (message: string) => problems.push(`${id}: ${message}`);
  const overLimit = (label: string, text: Bilingual, limit: number) => {
    for (const language of ['he', 'en'] as const) {
      if (wordCount(text[language]) > limit) problem(`${label}.${language} is over ${limit} words`);
    }
  };

  if (!HILULOT.some((hilula) => hilula.id === id)) problem('is not an id of HILULOT');
  overLimit('bio', page.bio, BIO_MAX_WORDS);
  page.lessons.forEach((lesson, index) => overLimit(`lessons[${index}].text`, lesson.text, LESSON_MAX_WORDS));
  page.stories.forEach((story, index) => overLimit(`stories[${index}].text`, story.text, STORY_MAX_WORDS));
  if (page.lessons.length !== 2) problem('does not have exactly two lessons');
  if (page.stories.length < 1 || page.stories.length > 2) problem('does not have one or two stories');
  if (page.biblical && page.works.length) problem('is biblical and lists works');

  const { grave } = page;
  if (grave.link) {
    const inRange = (value: number | null, limit: number) =>
      value !== null && Number.isFinite(value) && Math.abs(value) <= limit;
    const pinned = inRange(grave.lat, 90) && inRange(grave.lng, 180);
    if (!pinned && !grave.query?.trim()) problem('has a linked grave without coordinates in range or a search');
  } else if (!grave.noLinkReason) {
    problem('has an unlinked grave without a noLinkReason');
  }

  for (const [label, text] of textsOf(page)) {
    if (NIKUD.test(text.he)) problem(`${label}.he has nikud`);
    if (LATIN.test(text.he)) problem(`${label}.he has Latin letters`);
    if (HEBREW.test(text.en)) problem(`${label}.en has Hebrew letters`);
  }
  if (page.sources.length < 2) problem('has fewer than two sources');
  return problems;
}

const FIXTURE: HilulaPage = {
  bio: both('חי בצפת ולימד תורה.', 'Lived in Safed and taught Torah.'),
  lessons: [
    { title: both('ענווה', 'Humility'), text: both('להקטין את עצמך.', 'Make yourself small.') },
    { title: both('שמחה', 'Joy'), text: both('לעבוד מתוך שמחה.', 'Serve with joy.') },
  ],
  biblical: false,
  works: [{ title: both('ספר לדוגמה', 'A sample book'), about: both('על הלכה.', 'On halacha.') }],
  stories: [{ title: both('סיפור', 'A story'), text: both('היה היה.', 'Once upon a time.'), source: 'Source A' }],
  grave: { place: both('צפת', 'Safed'), lat: 32.97, lng: 35.5, link: true, noLinkReason: null },
  sources: ['Source A', 'Source B'],
};

describe('wazeUrl', () => {
  const grave = FIXTURE.grave;

  it('builds the navigate link from the coordinates of a linked grave', () => {
    expect(wazeUrl(grave)).toBe('https://waze.com/ul?ll=32.97,35.5&navigate=yes');
    expect(wazeUrl({ ...grave, lat: -33.5, lng: 0 })).toBe('https://waze.com/ul?ll=-33.5,0&navigate=yes');
  });

  it('gives no link for a grave visitors cannot reach, however complete its coordinates', () => {
    expect(wazeUrl({ ...grave, link: false, noLinkReason: both('סגור', 'Closed') })).toBeNull();
  });

  it('falls back to a Waze search when a linked grave has no coordinates', () => {
    expect(wazeUrl({ ...grave, lat: null, lng: null, query: 'בית העלמין הר המנוחות' })).toBe(
      `https://waze.com/ul?q=${encodeURIComponent('בית העלמין הר המנוחות')}&navigate=yes`,
    );
    expect(wazeUrl({ ...grave, query: 'בית העלמין הר המנוחות' })).toBe(
      'https://waze.com/ul?ll=32.97,35.5&navigate=yes',
    );
    expect(wazeUrl({ ...grave, lat: null, query: '  ' })).toBeNull();
    expect(
      wazeUrl({ ...grave, link: false, lat: null, query: 'הר המנוחות', noLinkReason: both('סגור', 'Closed') }),
    ).toBeNull();
  });

  it('gives no link for missing or non-finite coordinates', () => {
    expect(wazeUrl({ ...grave, lat: null })).toBeNull();
    expect(wazeUrl({ ...grave, lng: null })).toBeNull();
    expect(wazeUrl({ ...grave, lat: Number.NaN })).toBeNull();
    expect(wazeUrl({ ...grave, lng: Number.POSITIVE_INFINITY })).toBeNull();
  });
});

describe('wordCount', () => {
  it('counts whitespace separated pieces and ignores empty ones', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('   \n ')).toBe(0);
    expect(wordCount('one')).toBe(1);
    expect(wordCount('  one   two\nthree\t')).toBe(3);
    expect(wordCount('רבי שמעון בר יוחאי')).toBe(4);
  });
});

describe('hilulaPage', () => {
  it('reads the record and gives nothing for an id without a page', () => {
    expect(hilulaPage('no_such_tzaddik')).toBeUndefined();
    for (const id of Object.keys(HILULA_PAGES)) expect(hilulaPage(id)).toBe(HILULA_PAGES[id]);
  });
});

describe('pageProblems, the guard behind HILULA_PAGES', () => {
  it('passes a complete page of a listed tzaddik', () => {
    expect(pageProblems('rashbi', FIXTURE)).toEqual([]);
  });

  it('passes a biblical page with no works and a page with two stories', () => {
    const second = { title: both('עוד סיפור', 'Another story'), text: both('ועוד.', 'And more.'), source: 'Source B' };
    expect(pageProblems('moshe_rabbeinu', { ...FIXTURE, biblical: true, works: [] })).toEqual([]);
    expect(pageProblems('rashbi', { ...FIXTURE, stories: [...FIXTURE.stories, second] })).toEqual([]);
  });

  it('accepts the limits exactly and refuses one word more', () => {
    const atLimit: HilulaPage = {
      ...FIXTURE,
      bio: both(hebrewWords(BIO_MAX_WORDS), words(BIO_MAX_WORDS)),
      lessons: [
        { ...FIXTURE.lessons[0], text: both(hebrewWords(LESSON_MAX_WORDS), words(LESSON_MAX_WORDS)) },
        FIXTURE.lessons[1],
      ],
      stories: [{ ...FIXTURE.stories[0], text: both(hebrewWords(STORY_MAX_WORDS), words(STORY_MAX_WORDS)) }],
    };
    expect(pageProblems('rashbi', atLimit)).toEqual([]);

    const over: HilulaPage = {
      ...atLimit,
      bio: both(hebrewWords(BIO_MAX_WORDS + 1), words(BIO_MAX_WORDS)),
      lessons: [
        { ...FIXTURE.lessons[0], text: both(hebrewWords(LESSON_MAX_WORDS), words(LESSON_MAX_WORDS + 1)) },
        FIXTURE.lessons[1],
      ],
      stories: [{ ...FIXTURE.stories[0], text: both(hebrewWords(STORY_MAX_WORDS + 1), words(STORY_MAX_WORDS + 1)) }],
    };
    expect(pageProblems('rashbi', over)).toEqual([
      `rashbi: bio.he is over ${BIO_MAX_WORDS} words`,
      `rashbi: lessons[0].text.en is over ${LESSON_MAX_WORDS} words`,
      `rashbi: stories[0].text.he is over ${STORY_MAX_WORDS} words`,
      `rashbi: stories[0].text.en is over ${STORY_MAX_WORDS} words`,
    ]);
  });

  it('names every other way a page can break the rules', () => {
    const broken = {
      ...FIXTURE,
      lessons: [FIXTURE.lessons[0]],
      stories: [],
      biblical: true,
      grave: { place: both('ציון', 'Tomb'), lat: 91, lng: 35, link: true, noLinkReason: null },
      sources: ['Source A'],
    } as unknown as HilulaPage;
    expect(pageProblems('not_listed', broken)).toEqual([
      'not_listed: is not an id of HILULOT',
      'not_listed: does not have exactly two lessons',
      'not_listed: does not have one or two stories',
      'not_listed: is biblical and lists works',
      'not_listed: has a linked grave without coordinates in range or a search',
      'not_listed: has fewer than two sources',
    ]);
    expect(pageProblems('rashbi', { ...FIXTURE, grave: { ...FIXTURE.grave, lng: 181 } })).toEqual([
      'rashbi: has a linked grave without coordinates in range or a search',
    ]);
    expect(
      pageProblems('rashbi', { ...FIXTURE, grave: { ...FIXTURE.grave, link: false, noLinkReason: null } }),
    ).toEqual(['rashbi: has an unlinked grave without a noLinkReason']);
  });

  it('refuses nikud and Latin letters in Hebrew and Hebrew letters in English, and lets geresh and gershayim pass', () => {
    expect(
      pageProblems('rashbi', {
        ...FIXTURE,
        bio: both('בְּרֵאשִׁית', 'Genesis'),
        lessons: [{ ...FIXTURE.lessons[0], title: both('Humility', 'ענווה') }, FIXTURE.lessons[1]],
      }),
    ).toEqual([
      'rashbi: bio.he has nikud',
      'rashbi: lessons[0].title.he has Latin letters',
      'rashbi: lessons[0].title.en has Hebrew letters',
    ]);
    expect(pageProblems('rashbi', { ...FIXTURE, bio: both('רש״י והרמ״א בליז׳נסק', 'Rashi') })).toEqual([]);
  });

  it('lets the maqaf, paseq and sof pasuq pass, and refuses a patach', () => {
    const punctuation = 'בית־המקדש ׀ סוף׃';
    expect(pageProblems('rashbi', { ...FIXTURE, bio: both(punctuation, 'Temple') })).toEqual([]);
    expect(pageProblems('rashbi', { ...FIXTURE, bio: both('בַית', 'House') })).toEqual(['rashbi: bio.he has nikud']);
  });
});

describe('HILULA_PAGES', () => {
  it('holds only pages that pass the guard', () => {
    const problems = Object.entries(HILULA_PAGES).flatMap(([id, page]) => (page ? pageProblems(id, page) : []));
    expect(problems).toEqual([]);
  });
});
