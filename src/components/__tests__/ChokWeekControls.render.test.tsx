import { ScrollView } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { ChokWeekControls } from '../ChokWeekControls';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';
import { CHOK_PARASHIYOT } from '@/data/chok';
import { CHOK_SLOTS } from '@/utils/chok';
import { ChokDoubleChoice, ChokSlot } from '@/types/chok';

type Overrides = Partial<{
  week: string[];
  browsing: string | null;
  onBrowse: (parasha: string | null) => void;
  offered: readonly string[];
  slots: readonly ChokSlot[];
  slot: ChokSlot;
  onSlot: (slot: ChokSlot) => void;
  names: string[];
  choice: ChokDoubleChoice;
  onChoice: (choice: ChokDoubleChoice) => void;
  asking: boolean;
}>;

function renderControls(overrides: Overrides = {}) {
  return renderWithTheme(
    <ChokWeekControls
      week={['Vayakhel']}
      browsing={null}
      onBrowse={jest.fn()}
      offered={CHOK_PARASHIYOT}
      slots={CHOK_SLOTS}
      slot="sun"
      onSlot={jest.fn()}
      names={['ויקהל']}
      choice="first"
      onChoice={jest.fn()}
      asking={false}
      onAskClose={jest.fn()}
      {...overrides}
    />,
  );
}

describe('ChokWeekControls', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
  });

  it('draws one radio per slot, named by the full day, with the current slot selected', () => {
    renderControls({ slot: 'thuNight' });
    expect(screen.getAllByRole('radio')).toHaveLength(7);
    expect(screen.getByRole('radio', { name: 'ליל שישי' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'יום ראשון' })).not.toBeSelected();
    expect(screen.getByText('ליל ו׳')).toBeOnTheScreen();
  });

  it('reports the slot pressed', () => {
    const onSlot = jest.fn();
    renderControls({ onSlot });
    fireEvent.press(screen.getByRole('radio', { name: 'יום שישי' }));
    expect(onSlot).toHaveBeenCalledTimes(1);
    expect(onSlot).toHaveBeenCalledWith('fri');
  });

  it('draws only the slots it is given: Vezot Haberakhah has no Friday', () => {
    renderControls({ slots: CHOK_SLOTS.filter((slot) => slot !== 'fri') });
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    expect(screen.queryByRole('radio', { name: 'יום שישי' })).toBeNull();
  });

  it('adds the choice between the two parashiyot only in a double week', () => {
    const onChoice = jest.fn();
    renderControls({ names: ['ויקהל', 'פקודי'], choice: 'both', onChoice });
    expect(screen.getAllByRole('radio')).toHaveLength(10);
    expect(screen.getByRole('radio', { name: 'שתיהן' })).toBeSelected();
    fireEvent.press(screen.getByRole('radio', { name: 'פקודי' }));
    expect(onChoice).toHaveBeenCalledWith('second');
  });

  it('asks in a sheet with the three choices', () => {
    const onChoice = jest.fn();
    renderControls({ names: ['ויקהל', 'פקודי'], asking: true, onChoice });
    expect(screen.getByText('השבוע שתי פרשיות')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'רק פרשת ויקהל' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'רק פרשת פקודי' })).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'שתיהן, זו אחר זו' }));
    expect(onChoice).toHaveBeenCalledWith('both');
  });

  it('never asks in a week of one parasha', () => {
    renderControls({ asking: true });
    expect(screen.queryByText('השבוע שתי פרשיות')).toBeNull();
  });

  describe('the parasha row', () => {
    const openSheet = () => fireEvent.press(screen.getByRole('button', { name: /^(בחירת פרשה|Choose a parasha): / }));
    const headings = () => screen.getAllByRole('header').map((node) => node.props.children);

    it('comes first, titled by this week, and names the choice for a screen reader', () => {
      renderControls();
      const row = screen.getByRole('button', { name: 'בחירת פרשה: פרשת השבוע · ויקהל' });
      expect(screen.getByText('פרשת השבוע · ויקהל')).toBeOnTheScreen();
      const all = screen.getAllByRole(/^(radio|button)$/);
      expect(all.indexOf(row)).toBe(0);
      expect(all.indexOf(row)).toBeLessThan(all.indexOf(screen.getByRole('radio', { name: 'יום ראשון' })));
    });

    it('joins the two parashiyot of a double week in its title', () => {
      renderControls({ week: ['Vayakhel', 'Pekudei'], names: ['ויקהל', 'פקודי'] });
      expect(screen.getByText('פרשת השבוע · ויקהל־פקודי')).toBeOnTheScreen();
    });

    it('names the parasha browsed instead of the week', () => {
      renderControls({ browsing: 'Bereshit' });
      expect(screen.getByRole('button', { name: 'בחירת פרשה: פרשת בראשית' })).toBeOnTheScreen();
      expect(screen.queryByText(/פרשת השבוע/)).toBeNull();
    });

    it('lists the five books with their parashiyot, and this week marked', () => {
      renderControls();
      expect(screen.queryByText('שמות')).toBeNull();
      openSheet();
      expect(headings()).toEqual(['בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים']);
      expect(screen.getByRole('button', { name: 'ויקהל · השבוע' })).toBeSelected();
      expect(screen.getByRole('button', { name: 'בראשית' })).not.toBeSelected();
      expect(screen.getByRole('button', { name: 'וזאת הברכה' })).toBeOnTheScreen();
    });

    it('marks both parashiyot of a double week as this week when the choice is both', () => {
      renderControls({ week: ['Vayakhel', 'Pekudei'], names: ['ויקהל', 'פקודי'], choice: 'both' });
      openSheet();
      expect(screen.getByRole('button', { name: 'ויקהל · השבוע' })).toBeSelected();
      expect(screen.getByRole('button', { name: 'פקודי · השבוע' })).toBeSelected();
    });

    it('marks only the parasha of a double week the choice shows, and browses the other', () => {
      const onBrowse = jest.fn();
      renderControls({ week: ['Vayakhel', 'Pekudei'], names: ['ויקהל', 'פקודי'], choice: 'second', onBrowse });
      openSheet();
      expect(screen.getByRole('button', { name: 'פקודי · השבוע' })).toBeSelected();
      expect(screen.getByRole('button', { name: 'ויקהל · השבוע' })).not.toBeSelected();
      fireEvent.press(screen.getByRole('button', { name: 'ויקהל · השבוע' }));
      expect(onBrowse).toHaveBeenCalledWith('Vayakhel');
    });

    it('marks the browsed parasha and nothing of this week', () => {
      renderControls({ browsing: 'Bereshit' });
      openSheet();
      expect(screen.getByRole('button', { name: 'בראשית' })).toBeSelected();
      expect(screen.getByRole('button', { name: 'ויקהל · השבוע' })).not.toBeSelected();
    });

    it('lists only the parashiyot offered and leaves out a book with none', () => {
      renderControls({ offered: ['Bereshit', 'Vayakhel', 'Vayikra'] });
      openSheet();
      expect(headings()).toEqual(['בראשית', 'שמות', 'ויקרא']);
      expect(screen.queryByRole('button', { name: 'נח' })).toBeNull();
      expect(screen.getByRole('button', { name: 'בראשית' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'ויקרא' })).toBeOnTheScreen();
    });

    it('browses the parasha chosen and closes the sheet', () => {
      const onBrowse = jest.fn();
      renderControls({ onBrowse });
      openSheet();
      fireEvent.press(screen.getByRole('button', { name: 'נח' }));
      expect(onBrowse).toHaveBeenCalledTimes(1);
      expect(onBrowse).toHaveBeenCalledWith('Noach');
      expect(screen.queryByText('שמות')).toBeNull();
    });

    it('goes back to the week when a parasha of this week is chosen, also from a browsed one', () => {
      const onBrowse = jest.fn();
      renderControls({
        browsing: 'Bereshit',
        onBrowse,
        week: ['Vayakhel', 'Pekudei'],
        names: ['ויקהל', 'פקודי'],
        choice: 'both',
      });
      openSheet();
      fireEvent.press(screen.getByRole('button', { name: 'פקודי · השבוע' }));
      expect(onBrowse).toHaveBeenCalledWith(null);
    });

    it('scrolls the first parasha marked into view when the sheet opens', () => {
      const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
      renderControls({ browsing: 'Devarim' });
      openSheet();
      fireEvent(screen.getByRole('button', { name: 'דברים' }), 'layout', {
        nativeEvent: { layout: { x: 0, y: 1000, width: 300, height: 52 } },
      });
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ y: 904, animated: false });
      scrollTo.mockRestore();
    });

    it('names the books and the parashiyot in English', () => {
      useUserStore.setState({ language: 'en' });
      renderControls();
      expect(screen.getByText('This week · Vayakhel')).toBeOnTheScreen();
      openSheet();
      expect(headings()).toEqual(['Bereshit', 'Shemot', 'Vayikra', 'Bamidbar', 'Devarim']);
      expect(screen.getByRole('button', { name: 'Vayakhel · this week' })).toBeSelected();
    });
  });

  it('names the slots in English', () => {
    useUserStore.setState({ language: 'en' });
    renderControls();
    expect(screen.getByRole('radio', { name: 'Thursday night' })).toBeOnTheScreen();
    expect(screen.getByText('Night')).toBeOnTheScreen();
  });
});
