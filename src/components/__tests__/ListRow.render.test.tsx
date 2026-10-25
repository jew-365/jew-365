import type { ComponentProps } from 'react';
import { Platform, StyleSheet, Switch, Text } from 'react-native';
import { Path } from 'react-native-svg';
import { fireEvent, screen, userEvent, within } from '@testing-library/react-native';
import { ListRow } from '../ListRow';
import { IconTile } from '../IconTile';
import { MitzvahIcon } from '../MitzvahIcon';
import { renderWithTheme } from '@/testing/render';
import { THEMES } from '@/theme/colors';
import { spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { useUserStore } from '@/stores/useUserStore';

describe('ListRow', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
  });

  it('shows the title and the caption', () => {
    renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" caption="After a meal" />);
    expect(screen.getByText('Birkat Hamazon')).toBeOnTheScreen();
    expect(screen.getByText('After a meal')).toBeOnTheScreen();
  });

  it('draws no caption line when the caption is omitted', () => {
    renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" />);
    expect(screen.queryByText('After a meal')).toBeNull();
  });

  it('draws its icon through an IconTile named after the icon prop, accent by default', () => {
    renderWithTheme(<ListRow icon="candles" title="Candle lighting" />);
    const tile = screen.UNSAFE_getByType(IconTile);
    expect(tile.props.name).toBe('candles');
    expect(tile.props.tone).toBe('accent');
  });

  it('passes the muted icon tone to the tile and mutes the title', () => {
    renderWithTheme(<ListRow icon="candles" iconTone="muted" title="Candle lighting" />);
    expect(screen.UNSAFE_getByType(IconTile).props.tone).toBe('muted');
    expect(screen.getByText('Candle lighting')).toHaveStyle({ color: THEMES.gold.textMuted });
  });

  it('reads the title in the text colour for the accent tone', () => {
    renderWithTheme(<ListRow icon="candles" title="Candle lighting" />);
    expect(screen.getByText('Candle lighting')).toHaveStyle({ color: THEMES.gold.text });
  });

  it('is not a button without onPress', () => {
    renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is a button with onPress, named by its accessibilityLabel, and fires once per tap', async () => {
    const onPress = jest.fn();
    renderWithTheme(
      <ListRow icon="siddur" title="Birkat Hamazon" accessibilityLabel="Open Birkat Hamazon" onPress={onPress} />,
    );
    await userEvent.setup().press(screen.getByRole('button', { name: 'Open Birkat Hamazon' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('fires onLongPress once on a real long press and not onPress', async () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" onPress={onPress} onLongPress={onLongPress} />);
    await userEvent.setup().longPress(screen.getByText('Birkat Hamazon'));
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('stays a plain row with only onLongPress: no button role, and the long press still fires once', async () => {
    const onLongPress = jest.fn();
    renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" onLongPress={onLongPress} />);
    expect(screen.queryByRole('button')).toBeNull();
    await userEvent.setup().longPress(screen.getByText('Birkat Hamazon'));
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('dims a disabled row to half opacity and swallows its taps', async () => {
    const onPress = jest.fn();
    renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" disabled onPress={onPress} />);
    const row = screen.getByRole('button', { name: 'Birkat Hamazon' });
    expect(row).toBeDisabled();
    expect(row).toHaveStyle({ opacity: 0.5 });
    await userEvent.setup().press(row);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps an enabled row at full opacity', () => {
    renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" onPress={jest.fn()} />);
    const row = screen.getByRole('button', { name: 'Birkat Hamazon' });
    expect(row).toBeEnabled();
    expect(row).toHaveStyle({ opacity: 1 });
  });

  it('draws no fill and no divider of its own', () => {
    renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" onPress={jest.fn()} />);
    const row = screen.getByRole('button', { name: 'Birkat Hamazon' });
    const style = StyleSheet.flatten(row.props.style);
    expect(style.backgroundColor).toBeUndefined();
    expect(style.borderBottomWidth).toBeUndefined();
  });

  it('draws a default 44-point tile', () => {
    renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" />);
    expect(screen.UNSAFE_getByType(IconTile).props.size).toBeUndefined();
    expect(screen.UNSAFE_getByType(MitzvahIcon).parent!).toHaveStyle({ width: 44 });
  });

  it('reads the caption in textSub caption type', () => {
    renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" caption="After a meal" />);
    expect(screen.getByText('After a meal')).toHaveStyle({
      color: THEMES.gold.textSub,
      fontSize: typography.caption.fontSize,
    });
  });

  it('renders the trailing node after the title', () => {
    renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" trailing={<Text>3 left</Text>} />);
    expect(screen.getByText('3 left')).toBeOnTheScreen();
  });

  describe('a trailing control', () => {
    type Node = ReturnType<typeof screen.getByRole>;
    const ROW = 'Birkat Hamazon';
    const SWITCH = 'Birkat Hamazon switch';

    const hostAncestors = (node: Node): Node[] => {
      const found: Node[] = [];
      let current = node.parent;
      while (current) {
        if (typeof current.type === 'string') found.push(current);
        current = current.parent;
      }
      return found;
    };
    const hostParent = (node: Node) => hostAncestors(node)[0];

    function onOS(os: typeof Platform.OS, run: () => void) {
      const replaced = jest.replaceProperty(Platform, 'OS', os);
      try {
        run();
      } finally {
        replaced.restore();
      }
    }

    function setup(extra: Partial<ComponentProps<typeof ListRow>> = {}) {
      const onPress = jest.fn();
      const onValueChange = jest.fn();
      renderWithTheme(
        <ListRow
          icon="siddur"
          title={ROW}
          caption="After a meal"
          onPress={onPress}
          trailing={<Switch value={false} onValueChange={onValueChange} accessibilityLabel={SWITCH} />}
          {...extra}
        />,
      );
      return { onPress, onValueChange };
    }

    it.each(['ios', 'android', 'web'] as const)(
      '%s: sits beside the row button as its own element, never inside it',
      (os) => {
        onOS(os, () => {
          setup();
          const row = screen.getByRole('button', { name: ROW });
          const toggle = screen.getByLabelText(SWITCH);
          const above = hostAncestors(toggle);
          expect(above).not.toContain(row);
          expect(above.filter((node) => node.props.accessible === true)).toEqual([]);
          expect(
            above.filter(
              (node) => typeof node.props.onClick === 'function' || typeof node.props.onResponderGrant === 'function',
            ),
          ).toEqual([]);
          expect(within(row).queryByLabelText(SWITCH)).toBeNull();
          expect(within(row).getByText('After a meal')).toBeOnTheScreen();
          expect(hostParent(hostParent(toggle))).toBe(hostParent(row));
        });
      },
    );

    it('names the row button by its accessibilityLabel and leaves the switch its own name', () => {
      setup({ accessibilityLabel: 'Open Birkat Hamazon' });
      const button = screen.getByRole('button', { name: 'Open Birkat Hamazon' });
      expect(button).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: SWITCH })).toBeOnTheScreen();
      expect(within(button).queryByRole('switch')).toBeNull();
    });

    it('pressing the switch never calls onPress, and pressing the row never flips the switch', async () => {
      const { onPress, onValueChange } = setup();
      const user = userEvent.setup();
      const toggle = screen.getByRole('switch', { name: SWITCH });
      await user.press(toggle);
      expect(onPress).not.toHaveBeenCalled();
      fireEvent(toggle, 'valueChange', true);
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith(true);
      expect(onPress).not.toHaveBeenCalled();
      await user.press(screen.getByRole('button', { name: ROW }));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    it('keeps the long press on the row part', async () => {
      const onLongPress = jest.fn();
      const { onPress } = setup({ onLongPress });
      await userEvent.setup().longPress(screen.getByText(ROW));
      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('is its own element on a row without onPress, which has no button', () => {
      renderWithTheme(
        <ListRow icon="siddur" title={ROW} trailing={<Switch value={false} accessibilityLabel={SWITCH} />} />,
      );
      expect(screen.queryByRole('button')).toBeNull();
      expect(
        hostAncestors(screen.getByRole('switch', { name: SWITCH })).filter((node) => node.props.accessible === true),
      ).toEqual([]);
    });

    it('stands apart as a trailing text too', () => {
      renderWithTheme(<ListRow icon="siddur" title={ROW} trailing={<Text>3 left</Text>} />);
      expect(hostAncestors(screen.getByText('3 left')).filter((node) => node.props.accessible === true)).toEqual([]);
    });

    it('keeps the row spacing: the row part pads the start and the gap, the trailing wrapper the end', () => {
      setup();
      const row = screen.getByRole('button', { name: ROW });
      const toggle = screen.getByLabelText(SWITCH);
      const wrapper = hostParent(toggle);
      const container = hostParent(row);
      const rowStyle = StyleSheet.flatten(row.props.style);
      expect(rowStyle).toMatchObject({
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingStart: spacing.lg,
        paddingEnd: spacing.md,
        paddingVertical: spacing.lg,
      });
      expect(rowStyle.paddingHorizontal).toBeUndefined();
      expect(rowStyle.opacity).toBeUndefined();
      expect(StyleSheet.flatten(wrapper.props.style)).toEqual({ justifyContent: 'center', paddingEnd: spacing.lg });
      const containerStyle = StyleSheet.flatten(container.props.style);
      expect(containerStyle).toMatchObject({ flexDirection: 'row', alignItems: 'stretch', opacity: 1 });
      expect(containerStyle.backgroundColor).toBeUndefined();
      expect(containerStyle.borderBottomWidth).toBeUndefined();
    });

    it('puts the caller style and the disabled dimming on the outer row, which holds the trailing node', async () => {
      const { onPress } = setup({ disabled: true, style: { marginTop: spacing.sm } });
      const row = screen.getByRole('button', { name: ROW });
      const container = hostParent(row);
      expect(row).toBeDisabled();
      expect(StyleSheet.flatten(container.props.style)).toMatchObject({ opacity: 0.5, marginTop: spacing.sm });
      expect(StyleSheet.flatten(row.props.style).marginTop).toBeUndefined();
      expect(hostAncestors(screen.getByRole('switch', { name: SWITCH }))).toContain(container);
      await userEvent.setup().press(row);
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('a row without a trailing node', () => {
    it('stays one button holding its icon, title, caption and chevron, with the caller style on it', () => {
      useUserStore.setState({ language: 'he' });
      renderWithTheme(
        <ListRow
          icon="siddur"
          title="Birkat Hamazon"
          caption="After a meal"
          onPress={jest.fn()}
          chevron
          style={{ marginTop: spacing.sm }}
        />,
      );
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
      const button = buttons[0];
      expect(within(button).getByText('After a meal')).toBeOnTheScreen();
      expect(within(button).UNSAFE_getByType(IconTile)).toBeTruthy();
      expect(
        within(button)
          .UNSAFE_getAllByType(Path)
          .map((path) => path.props.d),
      ).toContain('M15,6L9,12L15,18');
      expect(StyleSheet.flatten(button.props.style)).toMatchObject({
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        marginTop: spacing.sm,
        opacity: 1,
      });
    });
  });

  describe('the forward chevron', () => {
    const chevrons = () =>
      screen
        .UNSAFE_getAllByType(Path)
        .map((path) => path.props.d)
        .filter((d) => d === 'M15,6L9,12L15,18' || d === 'M9,6L15,12L9,18');

    it('is drawn pointing left in Hebrew', () => {
      useUserStore.setState({ language: 'he' });
      renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" chevron />);
      expect(chevrons()).toEqual(['M15,6L9,12L15,18']);
      expect(screen.queryByText('‹')).toBeNull();
      expect(screen.queryByText('›')).toBeNull();
    });

    it('is drawn pointing right in English', () => {
      useUserStore.setState({ language: 'en' });
      renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" chevron />);
      expect(chevrons()).toEqual(['M9,6L15,12L9,18']);
      expect(screen.queryByText('‹')).toBeNull();
      expect(screen.queryByText('›')).toBeNull();
    });

    it('is left out when both trailing and chevron are given', () => {
      renderWithTheme(<ListRow icon="siddur" title="Birkat Hamazon" trailing={<Text>3 left</Text>} chevron />);
      expect(screen.getByText('3 left')).toBeOnTheScreen();
      expect(chevrons()).toEqual([]);
      expect(screen.queryByText('‹')).toBeNull();
      expect(screen.queryByText('›')).toBeNull();
    });
  });
});
