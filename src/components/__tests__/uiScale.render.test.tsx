import * as React from 'react';
import * as ReactNative from 'react-native';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

type Node = { type: unknown; props: Record<string, unknown> };
type Sizes = {
  tile: { width: number; height: number; borderRadius: number; icon: number };
  chevron: number;
  button: { regular: number; compact: number; icon: number };
  tabs: {
    pill: { width: number; height: number; borderRadius: number };
    underline: { width: number; height: number };
    icon: number;
  };
  wheel: { height: number; snap: number };
};

const hostStyle = (node: Node) => StyleSheet.flatten(node.props.style as never) as Record<string, number>;

const sizesAt = (uiScale: number): Sizes => {
  let sizes: Sizes | undefined;
  jest.isolateModules(() => {
    jest.doMock('react', () => React);
    jest.doMock('react-native', () => ReactNative);
    require('@/theme/scale').__setUiScaleForTests(uiScale);
    const { ThemeProvider } = require('@/theme/ThemeProvider') as typeof import('@/theme/ThemeProvider');
    const { ListRow } = require('../ListRow') as typeof import('../ListRow');
    const { IconTile } = require('../IconTile') as typeof import('../IconTile');
    const { MitzvahIcon } = require('../MitzvahIcon') as typeof import('../MitzvahIcon');
    const { Button } = require('../Button') as typeof import('../Button');
    const { BottomTabs } = require('../BottomTabs') as typeof import('../BottomTabs');
    const { WheelPicker } = require('../WheelPicker') as typeof import('../WheelPicker');
    const hosts = (root: Node & { findAll: (match: (node: Node) => boolean) => Node[] }) =>
      root.findAll((node) => typeof node.type === 'string');
    const draw = (ui: React.ReactElement) => render(ui, { wrapper: ThemeProvider });

    let view = draw(<ListRow icon="siddur" title="Row" chevron />);
    const tile = view.UNSAFE_getByType(IconTile);
    const [tileView] = hosts(tile as never);
    const tileStyle = hostStyle(tileView);
    const tileIcon = (tile.findAll((node: Node) => node.type === MitzvahIcon)[0].props as { size: number }).size;
    const chevron = (
      view.UNSAFE_getAllByType(MitzvahIcon).find((icon) => icon.props.name === 'chevronLeft')!.props as {
        size: number;
      }
    ).size;
    view.unmount();

    view = draw(<Button label="Regular" icon="check" onPress={jest.fn()} />);
    const regular = hostStyle(view.getByRole('button', { name: 'Regular' })).minHeight;
    const buttonIcon = (view.UNSAFE_getByType(MitzvahIcon).props as { size: number }).size;
    view.unmount();
    view = draw(<Button label="Compact" size="compact" onPress={jest.fn()} />);
    const compact = hostStyle(view.getByRole('button', { name: 'Compact' })).minHeight;
    view.unmount();

    const routes = ['more', 'siddur', 'home', 'history', 'settings'].map((name) => ({ key: `${name}-key`, name }));
    const tabProps = {
      state: { index: 2, routes },
      descriptors: Object.fromEntries(routes.map((route) => [route.key, { options: {} }])),
      navigation: { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    };
    view = draw(<BottomTabs {...(tabProps as unknown as React.ComponentProps<typeof BottomTabs>)} />);
    const [pillView, underlineView] = hosts(view.getAllByRole('tab')[0] as never).filter(
      (node) => node.props.collapsable === false && hostStyle(node).width !== undefined,
    );
    const pill = hostStyle(pillView);
    const underline = hostStyle(underlineView);
    const tabIcon = (view.UNSAFE_getByType(MitzvahIcon).props as { size: number }).size;
    view.unmount();

    view = draw(
      <WheelPicker values={[0, 1, 2, 3, 4, 5]} selected={2} onChange={jest.fn()} accessibilityLabel="wheel" />,
    );
    const wheelHeight = hostStyle(hosts(view.UNSAFE_getByType(WheelPicker) as never)[0]).height;
    const snap = (view.getByLabelText('wheel').props as { snapToInterval: number }).snapToInterval;
    view.unmount();

    sizes = {
      tile: { width: tileStyle.width, height: tileStyle.height, borderRadius: tileStyle.borderRadius, icon: tileIcon },
      chevron,
      button: { regular, compact, icon: buttonIcon },
      tabs: {
        pill: { width: pill.width, height: pill.height, borderRadius: pill.borderRadius },
        underline: { width: underline.width, height: underline.height },
        icon: tabIcon,
      },
      wheel: { height: wheelHeight, snap },
    };
  });
  return sizes!;
};

describe('display size in the shared components', () => {
  afterAll(() => {
    jest.dontMock('react');
    jest.dontMock('react-native');
  });

  it('keeps every size as it was at the default step', () => {
    expect(sizesAt(1)).toEqual({
      tile: { width: 44, height: 44, borderRadius: 18, icon: 24 },
      chevron: 16,
      button: { regular: 48, compact: 40, icon: 18 },
      tabs: { pill: { width: 48, height: 32, borderRadius: 16 }, underline: { width: 16, height: 3 }, icon: 22 },
      wheel: { height: 200, snap: 40 },
    });
  });

  it('shrinks the tile, the button, the tab bar and the wheel at 0.8', () => {
    expect(sizesAt(0.8)).toEqual({
      tile: { width: 35, height: 35, borderRadius: 14, icon: 19 },
      chevron: 13,
      button: { regular: 38.5, compact: 32, icon: 14.5 },
      tabs: {
        pill: { width: 38.5, height: 25.5, borderRadius: 12.75 },
        underline: { width: 13, height: 2.5 },
        icon: 17.5,
      },
      wheel: { height: 160, snap: 32 },
    });
  });

  it('grows them at 1.2', () => {
    expect(sizesAt(1.2)).toEqual({
      tile: { width: 53, height: 53, borderRadius: 21, icon: 29 },
      chevron: 19,
      button: { regular: 57.5, compact: 48, icon: 21.5 },
      tabs: {
        pill: { width: 57.5, height: 38.5, borderRadius: 19.25 },
        underline: { width: 19, height: 3.5 },
        icon: 26.5,
      },
      wheel: { height: 240, snap: 48 },
    });
  });

  it('keeps the ListRow tile in step with its icon at every step', () => {
    for (const step of [0.8, 0.85, 0.9, 0.95, 1, 1.1, 1.2]) {
      const { tile } = sizesAt(step);
      expect(tile.width).toBe(tile.height);
      expect(tile.icon).toBe(Math.round(tile.width * 0.55));
      expect(tile.borderRadius).toBe(Math.round(tile.width * 0.4));
    }
  });
});
