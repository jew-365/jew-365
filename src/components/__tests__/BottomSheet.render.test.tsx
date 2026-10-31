import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text } from 'react-native';
import { fireEvent, screen, userEvent, within } from '@testing-library/react-native';
import { BottomSheet, SheetAction } from '../BottomSheet';
import { QuietBlockContext } from '../ShabbatScreen';
import { findBackdrop, renderWithTheme } from '@/testing/render';
import { THEMES, THEME_NAMES } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useUserStore } from '@/stores/useUserStore';
import type { HolyBlock } from '@/types/zmanim';

const QUIET_BLOCK: HolyBlock = {
  start: new Date('2026-10-09T15:00:00Z'),
  end: new Date('2026-10-10T16:00:00Z'),
  days: ['2026-10-10'],
  kind: 'shabbat',
};

describe('BottomSheet', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
  });

  it('shows the title, the caption and its children', () => {
    renderWithTheme(
      <BottomSheet visible title="Pick a city" caption="Used for the times" onClose={jest.fn()}>
        <Text>Jerusalem</Text>
      </BottomSheet>,
    );
    expect(screen.getByText('Pick a city')).toBeOnTheScreen();
    expect(screen.getByText('Used for the times')).toBeOnTheScreen();
    expect(screen.getByText('Jerusalem')).toBeOnTheScreen();
  });

  it('fades the backdrop in place and slides only the sheet', () => {
    renderWithTheme(
      <BottomSheet visible title="Pick a city" onClose={jest.fn()}>
        <Text>Jerusalem</Text>
      </BottomSheet>,
    );
    // A sliding Modal carried the backdrop up with the sheet (the owner's report, 2026-10-31).
    expect(screen.UNSAFE_getByType(Modal).props.animationType).toBe('fade');
    const sheet = screen.getByTestId('bottom-sheet');
    expect(StyleSheet.flatten(sheet.props.style).transform).toEqual([{ translateY: expect.any(Number) }]);
    expect(StyleSheet.flatten(findBackdrop().props.style).transform).toBeUndefined();
  });

  it('draws no heading when it has neither title nor caption', () => {
    renderWithTheme(
      <BottomSheet visible onClose={jest.fn()}>
        <Text>Body</Text>
      </BottomSheet>,
    );
    expect(screen.getByText('Body')).toBeOnTheScreen();
    expect(screen.queryByText('Pick a city')).toBeNull();
  });

  it('always draws a Close button labelled common.close in Hebrew', () => {
    renderWithTheme(
      <BottomSheet visible title="T" onClose={jest.fn()}>
        <Text>Body</Text>
      </BottomSheet>,
    );
    expect(screen.getByRole('button', { name: 'סגור' })).toBeOnTheScreen();
  });

  it('draws Close as a surface2 pill with its label in text', () => {
    renderWithTheme(
      <BottomSheet visible title="T" onClose={jest.fn()}>
        <Text>Body</Text>
      </BottomSheet>,
    );
    expect(screen.getByRole('button', { name: 'סגור' })).toHaveStyle({
      backgroundColor: THEMES.gold.surface2,
      borderRadius: radius.full,
    });
    expect(screen.getByText('סגור')).toHaveStyle({ color: THEMES.gold.text });
  });

  it('labels the Close button in English when the language is English', () => {
    useUserStore.setState({ language: 'en' });
    renderWithTheme(
      <BottomSheet visible title="T" onClose={jest.fn()}>
        <Text>Body</Text>
      </BottomSheet>,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeOnTheScreen();
  });

  it('fires onClose once when Close is pressed', () => {
    const onClose = jest.fn();
    renderWithTheme(
      <BottomSheet visible title="T" onClose={onClose}>
        <Text>Body</Text>
      </BottomSheet>,
    );
    fireEvent.press(screen.getByRole('button', { name: 'סגור' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fires onClose once on a backdrop tap', () => {
    const onClose = jest.fn();
    renderWithTheme(
      <BottomSheet visible title="T" onClose={onClose}>
        <Text>Body</Text>
      </BottomSheet>,
    );
    fireEvent.press(findBackdrop());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fires onClose once on Android back', () => {
    const onClose = jest.fn();
    renderWithTheme(
      <BottomSheet visible title="T" onClose={onClose}>
        <Text>Body</Text>
      </BottomSheet>,
    );
    screen.UNSAFE_getByType(Modal).props.onRequestClose();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while visible is false', () => {
    renderWithTheme(
      <BottomSheet visible={false} title="Pick a city" onClose={jest.fn()}>
        <Text>Jerusalem</Text>
      </BottomSheet>,
    );
    expect(screen.queryByText('Pick a city')).toBeNull();
    expect(screen.queryByText('Jerusalem')).toBeNull();
    expect(screen.queryByRole('button', { name: 'סגור' })).toBeNull();
  });

  it('renders nothing inside a quiet block even when visible is true', () => {
    renderWithTheme(
      <QuietBlockContext.Provider value={QUIET_BLOCK}>
        <BottomSheet visible title="Pick a city" onClose={jest.fn()}>
          <Text>Jerusalem</Text>
        </BottomSheet>
      </QuietBlockContext.Provider>,
    );
    expect(screen.queryByText('Pick a city')).toBeNull();
    expect(screen.queryByText('Jerusalem')).toBeNull();
  });
});

describe('SheetAction', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
  });

  it('fires onPress once with its label as the button name', async () => {
    const onPress = jest.fn();
    renderWithTheme(<SheetAction label="Skip today" onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Skip today' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is not selected by default and keeps the plain border colour', () => {
    renderWithTheme(<SheetAction label="Skip today" onPress={jest.fn()} />);
    const row = screen.getByRole('button', { name: 'Skip today' });
    expect(row).not.toBeSelected();
    expect(row).toHaveStyle({ borderBottomColor: THEMES.gold.border });
  });

  it.each(THEME_NAMES)('%s: selected carries the selected state and draws a rounded, padded goldLight fill', (name) => {
    useUserStore.setState({ theme: name });
    renderWithTheme(<SheetAction label="Ashkenaz" selected onPress={jest.fn()} />);
    const row = screen.getByRole('button', { name: 'Ashkenaz' });
    expect(row).toBeSelected();
    expect(row).not.toHaveStyle({ backgroundColor: THEMES[name].goldLight });
    const fill = screen.getByText('Ashkenaz').parent!.parent!;
    expect(fill).toHaveStyle({
      backgroundColor: THEMES[name].goldLight,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
    });
  });

  it('draws no fill on a row that is not selected', () => {
    renderWithTheme(<SheetAction label="Sefard" onPress={jest.fn()} />);
    const fill = screen.getByText('Sefard').parent!.parent!;
    expect(fill).not.toHaveStyle({ backgroundColor: THEMES.gold.goldLight });
    expect(fill).toHaveStyle({ paddingHorizontal: spacing.md });
  });

  it('draws a destructive label in the urgent colour and a plain one in the text colour', () => {
    renderWithTheme(
      <>
        <SheetAction label="Delete" destructive onPress={jest.fn()} />
        <SheetAction label="Edit" onPress={jest.fn()} />
      </>,
    );
    expect(screen.getByText('Delete')).toHaveStyle({ color: THEMES.gold.urgent });
    expect(screen.getByText('Edit')).toHaveStyle({ color: THEMES.gold.text });
  });

  it('passes onLayout through so a long list can scroll the selected row into view', () => {
    const onLayout = jest.fn();
    renderWithTheme(<SheetAction label="Ashkenaz" selected onPress={jest.fn()} onLayout={onLayout} />);
    const layout = { nativeEvent: { layout: { x: 0, y: 48, width: 300, height: 44 } } };
    // fireEvent would find the handler on the SheetAction element itself, so call the host row's own prop.
    screen.getByRole('button', { name: 'Ashkenaz' }).props.onLayout(layout);
    expect(onLayout).toHaveBeenCalledTimes(1);
    expect(onLayout).toHaveBeenCalledWith(layout);
  });

  it('draws no caption line when it has none', () => {
    renderWithTheme(<SheetAction label="Ashkenaz" onPress={jest.fn()} />);
    const row = screen.getByRole('button', { name: 'Ashkenaz' });
    expect(within(row).getAllByText(/./)).toHaveLength(1);
  });

  it.each(THEME_NAMES)(
    '%s: draws a caption under the label in textSub and keeps the button named by the label',
    (name) => {
      useUserStore.setState({ theme: name });
      const onPress = jest.fn();
      renderWithTheme(<SheetAction label="Ashkenaz" caption="The default nusach" selected onPress={onPress} />);
      const row = screen.getByRole('button', { name: 'Ashkenaz' });
      expect(row).toBeSelected();
      expect(within(row).getByText('The default nusach')).toHaveStyle({
        color: THEMES[name].textSub,
        fontSize: typography.caption.fontSize,
        marginTop: 2,
      });
      expect(within(row).getByText('Ashkenaz')).toHaveStyle({ color: THEMES[name].text });
      fireEvent.press(screen.getByText('The default nusach'));
      expect(onPress).toHaveBeenCalledTimes(1);
    },
  );

  it('sits inside a sheet and fires through the sheet tree', async () => {
    const onPress = jest.fn();
    renderWithTheme(
      <BottomSheet visible title="Quick actions" onClose={jest.fn()}>
        <SheetAction label="Skip today" onPress={onPress} />
      </BottomSheet>,
    );
    await userEvent.setup().press(screen.getByRole('button', { name: 'Skip today' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('BottomSheet keyboard', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['ios', 'android', 'web'] as const)('lifts the sheet above the keyboard with padding on %s', (os) => {
    jest.replaceProperty(Platform, 'OS', os);
    renderWithTheme(
      <BottomSheet visible title="T" onClose={jest.fn()}>
        <Text>Body</Text>
      </BottomSheet>,
    );
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('padding');
  });
});
