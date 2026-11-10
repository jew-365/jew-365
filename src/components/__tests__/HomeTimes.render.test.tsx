import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { HomeTimes, type HomeTimesProps } from '../HomeTimes';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';
import type { CardModel } from '@/utils/homeCard';
import { timeChips } from '@/utils/homeTimes';
import type { ZmanId } from '@/utils/zmanIds';

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 12, h, m));
const ZMANIM: { id: ZmanId; at: Date }[] = [
  { id: 'netz', at: at(4, 4) },
  { id: 'sofShma', at: at(6, 40) },
  { id: 'sofTfila', at: at(7, 35) },
  { id: 'plag', at: at(13, 53) },
  { id: 'shkia', at: at(14, 47) },
];
const NOW = at(6, 15);
const CARD: CardModel = {
  pages: {
    day: { id: 'day', title: 'יום חמישי', icon: 'calendar', facts: [{ label: 'בתפילה', value: 'קריאת התורה' }] },
    week: { id: 'week', title: 'פרשת תולדות', icon: 'calendar', facts: [{ label: 'כניסה', value: 'ו׳ 16:26' }] },
    mine: { id: 'mine', title: 'שלי', icon: 'star', facts: [{ label: 'עד השבת', value: '3 ימים' }] },
  },
  smart: 'day',
  candleLighting: null,
  fastEnd: null,
};

function renderTimes(over: Partial<HomeTimesProps> = {}) {
  const { chips, lead, next } = timeChips({
    now: NOW,
    zmanim: ZMANIM,
    extras: [],
    tomorrow: null,
    openWindows: [
      { start: at(4, 4), end: at(6, 40) },
      { start: at(4, 4), end: at(7, 35) },
    ],
    pins: ['plag'],
    learned: null,
  });
  const props: HomeTimesProps = {
    card: CARD,
    page: null,
    onPage: jest.fn(),
    chips,
    lead,
    next,
    now: NOW,
    tz: 'UTC',
    inks: { plain: '#000000', next: '#000000' },
    glass: { fill: '#FFFFFF9E', ink: '#0A1228', edge: '#0A122847' },
    selected: null,
    onPickZman: jest.fn(),
    mine: ['toShabbat'],
    onMineChange: jest.fn(),
    learn: true,
    onLearnChange: jest.fn(),
    ...over,
  };
  renderWithTheme(<HomeTimes {...props} />);
  return props;
}

describe('HomeTimes', () => {
  it('opens on the smart page, keeps a tab chosen and moves on when the card is pressed', () => {
    const props = renderTimes();
    expect(screen.getByText('יום חמישי')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-card-tab-week'));
    expect(props.onPage).toHaveBeenCalledWith('week');
    fireEvent.press(screen.getByTestId('home-card-page-day'));
    expect(props.onPage).toHaveBeenLastCalledWith('week');
  });

  it('shows the page the user kept', () => {
    renderTimes({ page: 'mine' });
    expect(screen.getByTestId('home-card-page-mine')).toBeOnTheScreen();
    expect(screen.getByText('3 ימים')).toBeOnTheScreen();
  });

  it('fills the most urgent running time, and another one when touched', () => {
    renderTimes();
    expect(within(screen.getByTestId('home-times-sofShma')).getByTestId('home-times-fill')).toBeOnTheScreen();
    expect(within(screen.getByTestId('home-times-sofShma')).getByText(/^סוף ק״ש · 25 /)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-times-sofTfila'));
    expect(within(screen.getByTestId('home-times-sofTfila')).getByTestId('home-times-fill')).toBeOnTheScreen();
    expect(within(screen.getByTestId('home-times-sofShma')).queryByTestId('home-times-fill')).toBeNull();
    fireEvent.press(screen.getByTestId('home-times-sofTfila'));
    expect(within(screen.getByTestId('home-times-sofShma')).getByTestId('home-times-fill')).toBeOnTheScreen();
  });

  it('previews a plain time and marks a starred one', () => {
    const props = renderTimes();
    fireEvent.press(screen.getByTestId('home-times-plag'));
    expect(props.onPickZman).toHaveBeenCalledWith('plag');
    expect(screen.getByTestId('home-times-plag').props.accessibilityLabel).toContain('מועדף');
  });

  it('puts the starred times first, the rest by time', () => {
    renderTimes();
    const keys = screen.getAllByTestId(/^home-times-(netz|sofShma|sofTfila|plag|shkia)$/).map((n) => n.props.testID);
    expect(keys).toEqual([
      'home-times-plag',
      'home-times-sofShma',
      'home-times-sofTfila',
      'home-times-shkia',
      'home-times-netz',
    ]);
  });

  it('an added time is shown but previews nothing on the circle', () => {
    const { chips, lead, next } = timeChips({
      now: NOW,
      zmanim: [...ZMANIM, { id: 'minchaKetana', at: at(12, 50) }],
      extras: [],
      tomorrow: null,
      openWindows: [],
      pins: [],
      learned: null,
    });
    const props = renderTimes({ chips, lead, next });
    expect(screen.getByTestId('home-times-minchaKetana')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-times-minchaKetana'));
    expect(props.onPickZman).not.toHaveBeenCalled();
  });

  it('customizes the board: the smart choice, the learning switch and what Mine shows', () => {
    const props = renderTimes({ page: 'week' });
    fireEvent.press(screen.getByTestId('home-card-more'));
    fireEvent.press(screen.getByText('בחירה חכמה'));
    expect(props.onPage).toHaveBeenCalledWith(null);
    fireEvent(screen.getByTestId('home-card-learn'), 'valueChange', false);
    expect(props.onLearnChange).toHaveBeenCalledWith(false);
    fireEvent.press(screen.getByText('ההילולא הקרובה'));
    expect(props.onMineChange).toHaveBeenCalledWith(['toShabbat', 'hilula']);
  });

  it('refuses a fourth fact for Mine and says why, instead of dropping one', () => {
    const props = renderTimes({ mine: ['toShabbat', 'hilula', 'pins'] });
    fireEvent.press(screen.getByTestId('home-card-more'));
    expect(screen.getAllByText('כבר נבחרו שלושה: הסר אחד כדי להוסיף')).toHaveLength(2);
    fireEvent.press(screen.getByText('תהילים היום'));
    expect(props.onMineChange).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('ההילולא הקרובה'));
    expect(props.onMineChange).toHaveBeenCalledWith(['toShabbat', 'pins']);
  });

  describe('the times sheet', () => {
    beforeEach(() => useUserStore.getState().reset());

    it('opens from the chip: the times shown, each with a star and a remove button, then the times to add', () => {
      useUserStore.setState({ hiddenZmanim: ['plag'] });
      renderTimes();
      expect(within(screen.getByTestId('home-times-pin')).getByText('הזמנים שלי')).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId('home-times-pin'));
      expect(screen.getByText('הזמנים בקרוסלה')).toBeOnTheScreen();
      expect(screen.getByTestId('zmanim-row-alot')).toBeOnTheScreen();
      expect(screen.queryByTestId('zmanim-row-plag')).toBeNull();
      expect(screen.getByText('פלג המנחה')).toBeOnTheScreen();
      expect(screen.getByText('מנחה קטנה')).toBeOnTheScreen();
      // Under the GRA opinion the other Shema time is the Magen Avraham's.
      expect(screen.getByText('סוף זמן קריאת שמע לשיטת המג״א')).toBeOnTheScreen();
      expect(screen.queryByText('סוף זמן קריאת שמע לשיטת הגר״א')).toBeNull();
    });

    it('stars, removes and adds through the store', () => {
      renderTimes();
      fireEvent.press(screen.getByTestId('home-times-pin'));
      act(() => fireEvent.press(screen.getByTestId('zmanim-star-chatzot')));
      expect(useUserStore.getState().zmanPins).toEqual(['chatzot']);
      expect(screen.getByTestId('zmanim-star-chatzot').props.accessibilityState).toMatchObject({ selected: true });
      act(() => fireEvent.press(screen.getByTestId('zmanim-remove-chatzot')));
      expect(useUserStore.getState().hiddenZmanim).toEqual(['chatzot']);
      expect(useUserStore.getState().zmanPins).toEqual([]);
      act(() => fireEvent.press(screen.getByText('מנחה קטנה')));
      expect(useUserStore.getState().addedZmanim).toEqual(['minchaKetana']);
      expect(screen.getByTestId('zmanim-row-minchaKetana')).toBeOnTheScreen();
    });

    it('never removes the last zman of the circle', () => {
      useUserStore.setState({
        hiddenZmanim: [
          'alot',
          'misheyakir',
          'netz',
          'sofShma',
          'sofTfila',
          'chatzot',
          'minchaGedola',
          'plag',
          'shkia',
          'tzeit',
        ],
      });
      renderTimes();
      fireEvent.press(screen.getByTestId('home-times-pin'));
      expect(screen.getByTestId('zmanim-remove-chatzotLayla').props.accessibilityState).toMatchObject({
        disabled: true,
      });
    });
  });
});
