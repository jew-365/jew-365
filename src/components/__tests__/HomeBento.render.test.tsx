import { fireEvent, screen } from '@testing-library/react-native';
import { HomeBento, type HomeBentoProps } from '../HomeBento';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';
import { defaultBento, type BentoWidget } from '@/utils/homeBento';
import type { DayFrame } from '@/utils/dayArc';
import { ARC_ZMANIM, type ZmanId } from '@/utils/zmanIds';

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 9, h, m));
const CLOCK: Record<ZmanId, [number, number]> = {
  alot: [2, 50],
  misheyakir: [2, 56],
  netz: [4, 2],
  sofShma: [6, 39],
  sofTfila: [7, 34],
  chatzot: [9, 23],
  minchaGedola: [9, 53],
  plag: [13, 54],
  shkia: [14, 48],
  tzeit: [15, 2],
  chatzotLayla: [21, 23],
};
const FRAME: DayFrame = {
  start: at(2, 50),
  tzeit: at(15, 2),
  end: new Date(at(2, 51).getTime() + 86400000),
  zmanim: ARC_ZMANIM.map((id) => ({ id, at: at(...CLOCK[id]) })),
};
const ENABLED = new Set(['krias_shma_shacharit', 'shacharit', 'mincha', 'maariv']);

function renderBento(over: Partial<HomeBentoProps> = {}) {
  const props: HomeBentoProps = {
    widgets: defaultBento(ENABLED),
    frame: FRAME,
    now: at(6),
    tz: 'UTC',
    hidden: [],
    pins: [],
    suggestions: [{ id: 'plag', reason: 'mincha' }],
    next: { label: 'קריאת שמע של שחרית', at: at(6, 39), kind: 'end', onPress: jest.fn() },
    selected: null,
    onPick: jest.fn(),
    onLayoutChange: jest.fn(),
    onPinsChange: jest.fn(),
    ...over,
  };
  renderWithTheme(<HomeBento {...props} />);
  return props;
}

describe('HomeBento', () => {
  beforeEach(() => useUserStore.getState().reset());

  it('draws the next tile, the four tiles and the row', () => {
    const props = renderBento();
    const next = screen.getByTestId('home-bento-next');
    expect(next.props.accessibilityLabel).toBe('הבא, קריאת שמע של שחרית, 06:39, בעוד 39 דק\'');
    for (const id of ['sofShma', 'sofTfila', 'shkia', 'tzeit'])
      expect(screen.getByTestId(`home-bento-zman-${id}`)).toBeOnTheScreen();
    // 06:00 is morning: of its zmanim only chatzot is not a tile.
    expect(screen.getByTestId('home-bento-now-chatzot')).toBeOnTheScreen();
    expect(screen.getByTestId('home-bento-rest-plag')).toBeOnTheScreen();
    fireEvent.press(next);
    expect(props.next!.onPress).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId('home-bento-zman-shkia'));
    expect(props.onPick).toHaveBeenCalledWith('shkia');
  });

  it('edits a tile: size, move, replace and remove, through the toolbar', () => {
    const props = renderBento();
    fireEvent.press(screen.getByText('עריכה'));
    expect(screen.getByText('בוחרים אריח כדי להחליף, להגדיל, להזיז או להסיר אותו.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('home-bento-zman-shkia'));
    fireEvent.press(screen.getByText('גודל: קטן'));
    const sized = (props.onLayoutChange as jest.Mock).mock.calls.at(-1)[0] as BentoWidget[];
    expect(sized.find((w) => w.kind === 'zman' && w.id === 'shkia')).toEqual({ kind: 'zman', id: 'shkia', size: 'w' });
    fireEvent.press(screen.getByLabelText('הזזה קדימה'));
    const moved = (props.onLayoutChange as jest.Mock).mock.calls.at(-1)[0] as BentoWidget[];
    expect(moved.map((w) => (w.kind === 'zman' ? w.id : w.kind)).indexOf('shkia')).toBe(2);
    fireEvent.press(screen.getByText('החלפה'));
    fireEvent.press(screen.getByText('פלג המנחה'));
    const replaced = (props.onLayoutChange as jest.Mock).mock.calls.at(-1)[0] as BentoWidget[];
    expect(replaced.some((w) => w.kind === 'zman' && w.id === 'plag')).toBe(true);
    // The layout here is a mock's, so the tile is chosen again before it is removed.
    fireEvent.press(screen.getByTestId('home-bento-zman-shkia'));
    fireEvent.press(screen.getByText('הסרה'));
    const removed = (props.onLayoutChange as jest.Mock).mock.calls.at(-1)[0] as BentoWidget[];
    expect(removed.some((w) => w.kind === 'zman' && w.id === 'shkia')).toBe(false);
    fireEvent.press(screen.getByText('איפוס'));
    expect((props.onLayoutChange as jest.Mock).mock.calls.at(-1)[0]).toBeNull();
  });

  it('adds a tile from the sheet, before the row', () => {
    const props = renderBento();
    fireEvent.press(screen.getByText('עריכה'));
    fireEvent.press(screen.getByText('+ אריח'));
    fireEvent.press(screen.getByText('חצות הלילה'));
    const added = (props.onLayoutChange as jest.Mock).mock.calls.at(-1)[0] as BentoWidget[];
    expect(added.at(-2)).toEqual({ kind: 'zman', id: 'chatzotLayla', size: 's' });
    expect(added.at(-1)).toEqual({ kind: 'row' });
  });

  it('pins a suggested time with its reason, and shows the pins in the row', () => {
    const props = renderBento();
    fireEvent.press(screen.getByTestId('home-bento-pin'));
    expect(screen.getByText('מומלץ לך')).toBeOnTheScreen();
    fireEvent.press(screen.getByText(/כי מנחה מופעלת אצלך/));
    expect(props.onPinsChange).toHaveBeenCalledWith(['plag']);
    screen.unmount();
    renderBento({ pins: ['plag'] });
    expect(screen.getByTestId('home-bento-mine-plag')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-bento-rest-plag')).toBeNull();
  });

  it('leaves the hidden zmanim out of the row and the sheets', () => {
    renderBento({ hidden: ['plag'] });
    expect(screen.queryByTestId('home-bento-rest-plag')).toBeNull();
  });
});
