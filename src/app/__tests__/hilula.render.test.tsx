const mockParams: Record<string, string | undefined> = {};
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPages: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: mockBack, canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/data/hilulaPages', () => ({
  ...jest.requireActual('@/data/hilulaPages'),
  hilulaPage: (id: string) => mockPages[id],
}));

import { Linking, ScrollView } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import HilulaScreen from '../hilula/[id]';
import { CITIES } from '@/data/cities';
import type { Bilingual, HilulaPage } from '@/data/hilulaPages';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { at } from '@/testing/zmanim';

const JERUSALEM = CITIES[0];
const ONLY_DATE = [
  'nextTick',
  'queueMicrotask',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
] as const;

const both = (he: string, en: string): Bilingual => ({ he, en });

const REMA_URL = 'https://waze.com/ul?ll=50.05,19.94&navigate=yes';

const REMA: HilulaPage = {
  bio: both('חיבר את המפה על השולחן ערוך', 'Wrote the glosses on the Shulchan Aruch'),
  lessons: [
    { title: both('ענווה בלימוד', 'Humble learning'), text: both('ללמוד מכל אדם', 'Learn from everyone') },
    { title: both('אחדות', 'Unity'), text: both('לחבר בין המנהגים', 'Join the customs') },
  ],
  biblical: false,
  works: [
    { title: both('המפה', 'The Mappa'), about: both('הגהות על השולחן ערוך', 'Glosses on the Shulchan Aruch') },
    { title: both('תורת העולה', 'Torat HaOlah'), about: both('על העבודה בבית המקדש', 'On the Temple service') },
  ],
  stories: [
    { title: both('הסעודה', 'The meal'), text: both('סעודה בליל שבת', 'A Friday night meal'), source: 'A' },
    { title: both('הנדיבות', 'The generosity'), text: both('נתן כל מה שהיה לו', 'Gave all he had'), source: 'B' },
  ],
  grave: {
    place: both('בית הקברות העתיק בקרקוב', 'The old cemetery in Krakow'),
    lat: 50.05,
    lng: 19.94,
    link: true,
    noLinkReason: null,
  },
  sources: ['A', 'B'],
};

const RASHBI: HilulaPage = {
  bio: both('תנא בדור אחרי החורבן', 'A Tanna of the generation after the destruction'),
  lessons: [
    { title: both('אהבת התורה', 'Love of Torah'), text: both('ללמוד גם בצרה', 'Learn even in distress') },
    { title: both('הסתר', 'Modesty'), text: both('לא להתפאר', 'Do not boast') },
  ],
  biblical: false,
  works: [{ title: both('הזוהר', 'The Zohar'), about: both('ספר הקבלה', 'The book of Kabbalah') }],
  stories: [
    { title: both('המערה', 'The cave'), text: both('שתים עשרה שנה במערה', 'Twelve years in a cave'), source: 'A' },
  ],
  grave: {
    place: both('מירון', 'Meron'),
    lat: null,
    lng: null,
    link: false,
    noLinkReason: both('הגישה מוגבלת בלילות', 'Access is limited at night'),
  },
  sources: ['A', 'B'],
};

const MOSHE: HilulaPage = {
  ...RASHBI,
  bio: both('הוציא את ישראל ממצרים', 'Led Israel out of Egypt'),
  biblical: true,
  works: [{ title: both('חמשה חומשי תורה', 'The Five Books'), about: both('התורה', 'The Torah') }],
  grave: { place: both('בעבר הירדן', 'East of the Jordan'), lat: 31.77, lng: 35.72, link: true, noLinkReason: null },
};

const REMA_NAME = { he: 'הרמ״א', en: 'Rema' };
const RASHBI_NAME = { he: 'רבי שמעון בר יוחאי', en: 'Rabbi Shimon bar Yochai' };

const SECTIONS = {
  he: ['קורות חיים', 'מה אפשר ללמוד', 'ספרים וחיבורים', 'סיפורים', 'מקום הקבורה'],
  en: ['Life', 'What we can learn', 'Books and writings', 'Stories', 'Burial place'],
} as const;

const open = (params: Record<string, string>, language: 'he' | 'en' = 'he') => {
  useUserStore.setState({ language });
  for (const key of Object.keys(mockParams)) delete mockParams[key];
  Object.assign(mockParams, params);
  renderWithTheme(<HilulaScreen />);
};

const headers = () => screen.getAllByRole('header').map((node) => node.props.children as string);
const inOrder = (texts: string[]) => {
  const tree = JSON.stringify(screen.toJSON());
  let from = 0;
  return texts.every((text) => {
    const found = tree.indexOf(JSON.stringify(text).slice(1, -1), from);
    from = found + 1;
    return found >= 0;
  });
};

describe('Hilula page', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: at(JERUSALEM, '2026-10-12T06:00'), doNotFake: [...ONLY_DATE] });
  });
  afterAll(() => jest.useRealTimers());
  beforeEach(() => {
    useUserStore.getState().reset();
    useUserStore.getState().setLocation(JERUSALEM);
    mockBack.mockReset();
    mockReplace.mockReset();
    for (const key of Object.keys(mockPages)) delete mockPages[key];
    mockPages.rema = REMA;
    mockPages.rashbi = RASHBI;
    mockPages.moshe_rabbeinu = MOSHE;
  });

  it.each(['he', 'en'] as const)('draws the five parts in order in %s', (language) => {
    open({ id: 'rema' }, language);
    const [bio, lessons, works, stories, grave] = SECTIONS[language];

    expect(headers()).toEqual([REMA_NAME[language], bio, lessons, works, stories, grave]);
    expect(
      inOrder([
        REMA.bio[language],
        REMA.lessons[0].title[language],
        REMA.lessons[1].text[language],
        REMA.works[0].title[language],
        REMA.works[1].about[language],
        REMA.stories[0].title[language],
        REMA.stories[1].text[language],
        REMA.grave.place[language],
      ]),
    ).toBe(true);
  });

  it('rejects a reversed order, so the order check can fail', () => {
    open({ id: 'rema' });
    expect(inOrder([REMA.grave.place.he, REMA.bio.he])).toBe(false);
  });

  it('says when the next hilula is and the year of death in Hebrew', () => {
    open({ id: 'rema' });
    expect(screen.getByText('יום ההילולא: י״ח אייר, שנת של״ב')).toBeOnTheScreen();
  });

  it('says when the next hilula is and the year of death in English', () => {
    open({ id: 'rema' }, 'en');
    expect(screen.getByText('Hilula: 18th of Iyyar, in 5332')).toBeOnTheScreen();
  });

  it('leaves out the year of a tzaddik whose year is not recorded', () => {
    open({ id: 'rashbi' });
    expect(screen.getByText('יום ההילולא: י״ח אייר')).toBeOnTheScreen();
  });

  it('draws no works card for a biblical figure', () => {
    open({ id: 'moshe_rabbeinu' });

    expect(screen.queryByText('ספרים וחיבורים')).toBeNull();
    expect(screen.queryByText('חמשה חומשי תורה')).toBeNull();
    expect(headers()).toEqual(['משה רבנו', 'קורות חיים', 'מה אפשר ללמוד', 'סיפור', 'מקום הקבורה']);
  });

  it('heads one story with "סיפור" and two with "סיפורים"', () => {
    open({ id: 'rashbi' });
    expect(screen.getByRole('header', { name: 'סיפור' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'סיפורים' })).toBeNull();
    expect(screen.getByText('המערה')).toBeOnTheScreen();
  });

  it('heads two stories with "סיפורים" and draws both', () => {
    open({ id: 'rema' });
    expect(screen.getByRole('header', { name: 'סיפורים' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'סיפור' })).toBeNull();
    expect(screen.getByText('הסעודה')).toBeOnTheScreen();
    expect(screen.getByText('הנדיבות')).toBeOnTheScreen();
  });

  describe('the Waze button', () => {
    let openURL: jest.SpyInstance;
    beforeEach(() => {
      openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    });
    afterEach(() => openURL.mockRestore());

    it('opens the exact navigate link of the grave', () => {
      open({ id: 'rema' });
      fireEvent.press(screen.getByRole('button', { name: 'ניווט ב־Waze' }));

      expect(openURL).toHaveBeenCalledTimes(1);
      expect(openURL).toHaveBeenCalledWith(REMA_URL);
    });

    it('is named in English in the English UI', () => {
      open({ id: 'rema' }, 'en');
      fireEvent.press(screen.getByRole('button', { name: 'Navigate with Waze' }));
      expect(openURL).toHaveBeenCalledWith(REMA_URL);
    });

    it('swallows a refusal to open', async () => {
      const refusal = Promise.reject(new Error('no app'));
      const caught = jest.spyOn(refusal, 'catch');
      openURL.mockReturnValue(refusal);
      open({ id: 'rema' });
      fireEvent.press(screen.getByRole('button', { name: 'ניווט ב־Waze' }));
      await act(async () => {});

      expect(openURL).toHaveBeenCalledTimes(1);
      expect(caught).toHaveBeenCalledTimes(1);
      expect(screen.getByText('בית הקברות העתיק בקרקוב')).toBeOnTheScreen();
    });

    it('is absent from a grave that has no link, which gives its reason instead', () => {
      open({ id: 'rashbi' });

      expect(screen.queryByRole('button', { name: 'ניווט ב־Waze' })).toBeNull();
      expect(screen.getByText('מירון')).toBeOnTheScreen();
      expect(screen.getByText('הגישה מוגבלת בלילות')).toBeOnTheScreen();
    });

    it('is absent from a linked grave whose coordinates are missing', () => {
      mockPages.rashbi = { ...RASHBI, grave: { ...RASHBI.grave, link: true, noLinkReason: null } };
      open({ id: 'rashbi' });

      expect(screen.queryByRole('button', { name: 'ניווט ב־Waze' })).toBeNull();
      expect(screen.getByText('מירון')).toBeOnTheScreen();
    });
  });

  it('shows the missing line under the header for a tzaddik without a page', () => {
    delete mockPages.rashbi;
    open({ id: 'rashbi' });

    expect(screen.getByText('עוד אין כאן תוכן על הצדיק הזה')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: RASHBI_NAME.he })).toBeOnTheScreen();
    expect(screen.getByText('יום ההילולא: י״ח אייר')).toBeOnTheScreen();
    expect(headers()).toEqual([RASHBI_NAME.he]);
    expect(screen.queryByRole('button', { name: 'ניווט ב־Waze' })).toBeNull();
  });

  it('shows the missing line in English', () => {
    delete mockPages.rashbi;
    open({ id: 'rashbi' }, 'en');
    expect(screen.getByText('There is no content about this tzaddik yet')).toBeOnTheScreen();
  });

  it('shows a generic error and no page for an unknown id', () => {
    open({ id: 'no_such_tzaddik', ids: 'rema,rashbi' });

    expect(screen.getByRole('header', { name: 'משהו השתבש. נסה שוב.' })).toBeOnTheScreen();
    expect(headers()).toEqual(['משהו השתבש. נסה שוב.']);
    expect(screen.queryByLabelText('בחירת צדיק')).toBeNull();
  });

  it('shows the generic error when no id is given', () => {
    open({});
    expect(screen.getByRole('header', { name: 'משהו השתבש. נסה שוב.' })).toBeOnTheScreen();
  });

  it('goes back from the back pill', () => {
    open({ id: 'rema' });
    fireEvent.press(screen.getByRole('button', { name: 'חזור' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  describe('a notice that names more than one tzaddik', () => {
    it('shows the switch on the first one named and changes the page on a press', () => {
      const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
      open({ id: 'rashbi', ids: 'rashbi,rema' });

      expect(screen.getByLabelText('בחירת צדיק').props.accessibilityRole).toBe('radiogroup');
      expect(screen.getByRole('radio', { name: RASHBI_NAME.he })).toBeSelected();
      expect(screen.getByRole('radio', { name: REMA_NAME.he })).not.toBeSelected();
      expect(screen.getByRole('header', { name: RASHBI_NAME.he })).toBeOnTheScreen();
      expect(screen.getByText(RASHBI.bio.he)).toBeOnTheScreen();
      expect(scrollTo).not.toHaveBeenCalled();

      fireEvent.press(screen.getByRole('radio', { name: REMA_NAME.he }));

      expect(screen.getByRole('radio', { name: REMA_NAME.he })).toBeSelected();
      expect(screen.getByRole('radio', { name: RASHBI_NAME.he })).not.toBeSelected();
      expect(screen.getByRole('header', { name: REMA_NAME.he })).toBeOnTheScreen();
      expect(screen.getByText(REMA.bio.he)).toBeOnTheScreen();
      expect(screen.queryByText(RASHBI.bio.he)).toBeNull();
      expect(screen.getByText('יום ההילולא: י״ח אייר, שנת של״ב')).toBeOnTheScreen();
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });

      fireEvent.press(screen.getByRole('radio', { name: RASHBI_NAME.he }));
      expect(screen.getByText(RASHBI.bio.he)).toBeOnTheScreen();
      scrollTo.mockRestore();
    });

    it('names the options in English in the English UI', () => {
      open({ id: 'rashbi', ids: 'rashbi,rema' }, 'en');

      expect(screen.getByLabelText('Choose a tzaddik').props.accessibilityRole).toBe('radiogroup');
      fireEvent.press(screen.getByRole('radio', { name: 'Rema' }));
      expect(screen.getByText(REMA.bio.en)).toBeOnTheScreen();
    });

    it('shows a page the switch lands on that has no entry', () => {
      delete mockPages.rema;
      open({ id: 'rashbi', ids: 'rashbi,rema' });
      fireEvent.press(screen.getByRole('radio', { name: REMA_NAME.he }));

      expect(screen.getByText('עוד אין כאן תוכן על הצדיק הזה')).toBeOnTheScreen();
    });

    it('drops an unknown id from the switch and draws none when one tzaddik is left', () => {
      open({ id: 'rema', ids: 'rema,no_such_tzaddik' });

      expect(screen.queryByLabelText('בחירת צדיק')).toBeNull();
      expect(screen.getByRole('header', { name: REMA_NAME.he })).toBeOnTheScreen();
    });

    it('keeps the unknown id out of a switch that still has two', () => {
      open({ id: 'rema', ids: 'no_such_tzaddik,rema,rashbi' });

      expect(screen.getAllByRole('radio')).toHaveLength(2);
      expect(screen.getByRole('radio', { name: REMA_NAME.he })).toBeSelected();
    });

    it('adds the id of the route to the switch when the list leaves it out', () => {
      open({ id: 'rema', ids: 'rashbi' });

      expect(screen.getAllByRole('radio')).toHaveLength(2);
      expect(screen.getByRole('radio', { name: REMA_NAME.he })).toBeSelected();
    });

    it('draws no switch for a single tzaddik', () => {
      open({ id: 'rema' });
      expect(screen.queryByLabelText('בחירת צדיק')).toBeNull();
    });
  });
});
