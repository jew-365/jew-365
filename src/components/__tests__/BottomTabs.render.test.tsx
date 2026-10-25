import { Platform, StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BottomTabs } from '../BottomTabs';
import { MitzvahIcon } from '../MitzvahIcon';
import { renderWithTheme } from '@/testing/render';
import { useUserStore } from '@/stores/useUserStore';
import { THEMES, THEME_NAMES } from '@/theme/colors';
import { radius, spacing } from '@/theme/tokens';
import { fontFamilies } from '@/theme/typography';

const ROUTE_NAMES = ['index', 'more', 'siddur', 'home', 'history', 'settings'];

function tabBarProps(focused: string, bottomInset = 0) {
  const routes = ROUTE_NAMES.map((name) => ({ key: `${name}-key`, name }));
  const descriptors = Object.fromEntries(
    routes.map((route) => [route.key, { options: route.name === 'index' ? { href: null } : {} }]),
  );
  const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() };
  const props = {
    state: { index: ROUTE_NAMES.indexOf(focused), routes },
    descriptors,
    navigation,
    insets: { top: 0, right: 0, bottom: bottomInset, left: 0 },
  } as unknown as BottomTabBarProps;
  return { props, navigation };
}

type Node = ReturnType<typeof screen.getByRole>;
const hostsStyled = (match: (style: Record<string, unknown>) => boolean): Node[] =>
  screen.UNSAFE_root.findAll(
    (node: Node) =>
      typeof node.type === 'string' && match((StyleSheet.flatten(node.props.style) ?? {}) as Record<string, unknown>),
  );
const pills = () => hostsStyled((s) => s.width === 48 && s.height === 32);
const underlines = () => hostsStyled((s) => s.width === 16 && s.height === 3);
const fillOf = (node: Node) => StyleSheet.flatten(node.props.style).backgroundColor;
const hostParent = (node: Node): Node => {
  let up = node.parent!;
  while (typeof up.type !== 'string') up = up.parent!;
  return up;
};
const barOf = () => hostParent(screen.getAllByRole('tab')[0]);

function onOS(os: typeof Platform.OS, run: () => void) {
  const replaced = jest.replaceProperty(Platform, 'OS', os);
  try {
    run();
  } finally {
    replaced.restore();
  }
}

describe('BottomTabs', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
  });

  it('draws the five tabs in the registered order, More first and home third', () => {
    renderWithTheme(<BottomTabs {...tabBarProps('home').props} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    ['עוד', 'סידור', 'בית', 'היסטוריה', 'הגדרות'].forEach((name, index) => {
      expect(tabs[index]).toHaveAccessibleName(name);
    });
  });

  it('names the More tab in English and draws no schedule tab', () => {
    useUserStore.setState({ language: 'en' });
    renderWithTheme(<BottomTabs {...tabBarProps('home').props} />);
    expect(screen.getByRole('tab', { name: 'More' })).toBeOnTheScreen();
    expect(screen.queryByRole('tab', { name: 'Schedule' })).toBeNull();
  });

  it('navigates to the more route when its tab is pressed', () => {
    const { props, navigation } = tabBarProps('home');
    renderWithTheme(<BottomTabs {...props} />);
    fireEvent.press(screen.getByRole('tab', { name: 'עוד' }));
    expect(navigation.navigate).toHaveBeenCalledWith('more');
  });

  it('marks only the focused tab as selected', () => {
    renderWithTheme(<BottomTabs {...tabBarProps('more').props} />);
    expect(screen.getByRole('tab', { name: 'עוד' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'בית' })).not.toBeSelected();
  });

  it.each(['android', 'web'] as const)('%s: sits the bar spacing.sm above the bottom inset on a bg strip', (os) => {
    onOS(os, () => {
      const first = renderWithTheme(<BottomTabs {...tabBarProps('home', 34).props} />);
      expect(hostParent(barOf())).toHaveStyle({
        backgroundColor: THEMES.gold.bg,
        paddingBottom: 34 + spacing.sm,
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.md,
      });
      first.unmount();

      renderWithTheme(<BottomTabs {...tabBarProps('home').props} />);
      expect(hostParent(barOf())).toHaveStyle({ paddingBottom: spacing.sm });
    });
  });

  it.each([
    [34, 14],
    [24, spacing.sm],
    [0, spacing.sm],
  ])('ios: a bottom inset of %i leaves %i under the bar, just above the home indicator', (inset, padding) => {
    onOS('ios', () => {
      renderWithTheme(<BottomTabs {...tabBarProps('home', inset).props} />);
      expect(hostParent(barOf())).toHaveStyle({
        backgroundColor: THEMES.gold.bg,
        paddingBottom: padding,
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.md,
      });
    });
  });

  it.each(THEME_NAMES)('%s: draws the bar as a floating tabBg card with no border', (name) => {
    useUserStore.setState({ theme: name });
    renderWithTheme(<BottomTabs {...tabBarProps('home').props} />);
    const bar = barOf();
    expect(bar).toHaveStyle({ backgroundColor: THEMES[name].tabBg, borderRadius: radius.xxl });
    expect(StyleSheet.flatten(bar.props.style).borderTopWidth).toBeUndefined();
  });

  it.each(THEME_NAMES)(
    '%s: the focused tab gets the goldLight pill, a bold goldText label and the gold underline',
    (name) => {
      useUserStore.setState({ theme: name });
      renderWithTheme(<BottomTabs {...tabBarProps('siddur').props} />);
      const filled = pills().filter((pill) => fillOf(pill) === THEMES[name].goldLight);
      expect(filled).toHaveLength(1);
      expect(filled[0]).toBe(screen.UNSAFE_getByType(MitzvahIcon).parent);
      expect(screen.getByText('סידור')).toHaveStyle({
        color: THEMES[name].goldText,
        fontFamily: fontFamilies.heebo.bold,
      });
      expect(underlines().filter((line) => fillOf(line) === THEMES[name].gold)).toHaveLength(1);
      expect(underlines()).toHaveLength(5);
    },
  );

  it('draws the other tabs with a textMuted regular label and a transparent pill', () => {
    renderWithTheme(<BottomTabs {...tabBarProps('siddur').props} />);
    expect(screen.getByText('בית')).toHaveStyle({
      color: THEMES.gold.textMuted,
      fontFamily: fontFamilies.heebo.regular,
    });
    const fills = pills().map(fillOf);
    expect(fills.filter((fill) => fill === THEMES.gold.goldLight)).toHaveLength(1);
    expect(fills.filter((fill) => fill === 'transparent')).toHaveLength(4);
  });

  it('colours the focused icon gold and an unfocused one textMuted', () => {
    const first = renderWithTheme(<BottomTabs {...tabBarProps('siddur').props} />);
    expect(screen.UNSAFE_getByType(MitzvahIcon).props).toMatchObject({ color: THEMES.gold.gold, size: 22 });
    first.unmount();

    renderWithTheme(<BottomTabs {...tabBarProps('home').props} />);
    expect(screen.UNSAFE_getByType(MitzvahIcon).props).toMatchObject({ color: THEMES.gold.textMuted, size: 22 });
  });

  it('draws no raised home disc: home is laid out like every other tab', () => {
    renderWithTheme(<BottomTabs {...tabBarProps('home').props} />);
    const all = pills();
    expect(all).toHaveLength(5);
    all.forEach((pill) => {
      expect(pill).toHaveStyle({ width: 48, height: 32 });
      expect(StyleSheet.flatten(pill.props.style).marginTop).toBeUndefined();
    });
    expect(hostsStyled((s) => s.width === 44 && s.height === 44)).toHaveLength(0);
  });

  it.each(ROUTE_NAMES.slice(1))(
    '%s focused: every pill, filled or transparent, is a real native view with a radius of half its height and never radius.full',
    (name) => {
      renderWithTheme(<BottomTabs {...tabBarProps(name).props} />);
      const all = pills();
      expect(all).toHaveLength(5);
      all.forEach((pill) => {
        expect(StyleSheet.flatten(pill.props.style).borderRadius).toBe(16);
        expect(StyleSheet.flatten(pill.props.style).borderRadius).not.toBe(radius.full);
        expect(pill.props.collapsable).toBe(false);
        expect([THEMES.gold.goldLight, 'transparent']).toContain(fillOf(pill));
      });
    },
  );

  it('draws every underline as a real native view too, so its rounded ends survive a tab switch', () => {
    renderWithTheme(<BottomTabs {...tabBarProps('home').props} />);
    const lines = underlines();
    expect(lines).toHaveLength(5);
    lines.forEach((line) => {
      expect(line.props.collapsable).toBe(false);
    });
  });

  it('keeps the same pill views mounted across a tab switch and only moves the fill', () => {
    const view = renderWithTheme(<BottomTabs {...tabBarProps('home').props} />);
    const before = pills();
    const filledBefore = before.map((pill) => fillOf(pill) === THEMES.gold.goldLight);
    expect(filledBefore.filter(Boolean)).toHaveLength(1);

    view.rerender(<BottomTabs {...tabBarProps('history').props} />);
    const after = pills();
    expect(after).toHaveLength(5);
    after.forEach((pill, index) => {
      expect(pill).toBe(before[index]);
      expect(StyleSheet.flatten(pill.props.style).borderRadius).toBe(16);
    });
    const filledAfter = after.map((pill) => fillOf(pill) === THEMES.gold.goldLight);
    expect(filledAfter.filter(Boolean)).toHaveLength(1);
    expect(filledAfter).not.toEqual(filledBefore);
  });
});
