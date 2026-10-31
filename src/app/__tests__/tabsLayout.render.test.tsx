const mockTabsProps: Record<string, unknown>[] = [];

jest.mock('expo-router', () => ({
  Tabs: Object.assign(
    (props: Record<string, unknown>) => {
      mockTabsProps.push(props);
      return null;
    },
    { Screen: () => null },
  ),
}));

import * as fs from 'fs';
import { createRequire } from 'module';
import * as path from 'path';
import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import TabsLayout from '../(tabs)/_layout';
import { useUserStore } from '@/stores/useUserStore';
import { renderWithTheme } from '@/testing/render';
import { THEMES } from '@/theme/colors';
import { ThemeProvider } from '@/theme/ThemeProvider';

type TabScreenElement = React.ReactElement<{ name: string; options?: Record<string, unknown> }>;

function renderTabs() {
  mockTabsProps.length = 0;
  renderWithTheme(<TabsLayout />);
  expect(mockTabsProps.length).toBeGreaterThan(0);
  return mockTabsProps[mockTabsProps.length - 1];
}

const APP_ROOT = path.join(__dirname, '..', '..', '..');

function installedPackage(name: string, fromDir: string): string {
  return fs.realpathSync(createRequire(path.join(fromDir, 'package.json')).resolve(`${name}/package.json`));
}

function versionOf(packageJson: string): string {
  return JSON.parse(fs.readFileSync(packageJson, 'utf8')).version;
}

function atLeast(version: string, floor: string): boolean {
  const have = version.split('.').map(Number);
  const need = floor.split('.').map(Number);
  const index = have.findIndex((part, i) => part !== need[i]);
  return index === -1 || have[index] > need[index];
}

function navigationInstall() {
  const routerDir = path.dirname(installedPackage('expo-router', APP_ROOT));
  const tabs = installedPackage('@react-navigation/bottom-tabs', APP_ROOT);
  const stack = installedPackage('@react-navigation/native-stack', routerDir);
  return { routerDir, tabs, tabsDir: path.dirname(tabs), stackDir: path.dirname(stack) };
}

function renderRealTabs() {
  const { Stack, Tabs: RealTabs, router } = jest.requireActual<typeof import('expo-router')>('expo-router');
  const testingLibrary =
    jest.requireActual<typeof import('expo-router/testing-library')>('expo-router/testing-library');
  const { children, ...shipped } = renderTabs();
  const tabs = React.Children.toArray(children as React.ReactNode) as TabScreenElement[];
  const names = tabs.map((tab) => tab.props.name);

  function ShippedTabs() {
    return (
      <RealTabs {...(shipped as React.ComponentProps<typeof RealTabs>)}>
        {tabs.map((tab) => (
          <RealTabs.Screen key={tab.props.name} {...tab.props} />
        ))}
      </RealTabs>
    );
  }

  const routes: Record<string, () => React.JSX.Element> = {
    _layout: () => (
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    ),
    '(tabs)/_layout': ShippedTabs,
  };
  names.forEach((name) => {
    routes[`(tabs)/${name}`] = () => <Text>{`tab ${name}`}</Text>;
  });
  testingLibrary.renderRouter(routes, { initialUrl: '/home' });

  function displayOf(name: string): unknown {
    let node = testingLibrary.screen.getByText(`tab ${name}`, { includeHiddenElements: true }).parent;
    while (node) {
      const display = StyleSheet.flatten(node.props.style)?.display;
      if (display) return display;
      node = node.parent;
    }
    return undefined;
  }

  return {
    names,
    displayOf,
    displays: () => Object.fromEntries(names.map((name) => [name, displayOf(name)])),
    goTo: (name: string) => testingLibrary.act(() => router.navigate(`/${name}` as never)),
    canGoBack: () => router.canGoBack(),
    back: () => testingLibrary.act(() => router.back()),
    focused: () => names.find((name) => displayOf(name) === 'flex'),
    advance: (ms: number) => testingLibrary.act(() => jest.advanceTimersByTime(ms)),
  };
}

describe('tabs layout', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
  });

  it.each(['ios', 'android', 'web'] as const)('never detaches an inactive tab on %s', (os) => {
    const restore = jest.replaceProperty(Platform, 'OS', os);
    try {
      expect(renderTabs().detachInactiveScreens).toBe(false);
    } finally {
      restore.restore();
    }
  });

  it('keeps the fade and the eager tabs and freezes no tab', () => {
    const props = renderTabs();
    expect(props.screenOptions).not.toHaveProperty('freezeOnBlur');
    expect(props.screenOptions).toEqual({
      headerShown: false,
      sceneStyle: { backgroundColor: THEMES.gold.bg },
      animation: 'fade',
      lazy: false,
    });
    const screens = React.Children.toArray(props.children as React.ReactNode) as TabScreenElement[];
    expect(screens.map((tab) => tab.props.name)).toEqual(['index', 'more', 'siddur', 'home', 'history', 'settings']);
    screens.forEach((tab) => expect(tab.props.options ?? {}).not.toHaveProperty('freezeOnBlur'));
  });
});

describe('installed react-navigation', () => {
  it('gives expo-router the one bottom-tabs copy, 7.18.8 or later, with the detach fix', () => {
    const { routerDir, tabs } = navigationInstall();
    expect(installedPackage('@react-navigation/bottom-tabs', routerDir)).toBe(tabs);
    const version = versionOf(tabs);
    expect({ version, carriesDetachFix: atLeast(version, '7.18.8') }).toEqual({ version, carriesDetachFix: true });
  });

  it('shares one @react-navigation/native, 7.3.8 or later, across bottom-tabs, native-stack and expo-router', () => {
    const { routerDir, tabsDir, stackDir } = navigationInstall();
    const copies = [tabsDir, stackDir, routerDir].map((dir) => installedPackage('@react-navigation/native', dir));
    expect(copies).toEqual(copies.map(() => copies[0]));
    const version = versionOf(copies[0]);
    expect({ version, meetsPeer: atLeast(version, '7.3.8') }).toEqual({ version, meetsPeer: true });
  });

  it('shares one @react-navigation/elements, 2.9.30 or later, between bottom-tabs and native-stack', () => {
    const { tabsDir, stackDir } = navigationInstall();
    const copies = [tabsDir, stackDir].map((dir) => installedPackage('@react-navigation/elements', dir));
    expect(copies).toEqual(copies.map(() => copies[0]));
    const version = versionOf(copies[0]);
    expect({ version, meetsPeer: atLeast(version, '2.9.30') }).toEqual({ version, meetsPeer: true });
  });
});

describe('tab visibility under the installed bottom-tabs', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function onlyDisplayed(names: string[], focused: string) {
    return Object.fromEntries(names.map((name) => [name, name === focused ? 'flex' : 'none']));
  }

  it('displays the focused tab and hides every other one once the fade ends', () => {
    const tabs = renderRealTabs();
    expect(tabs.displays()).toEqual(onlyDisplayed(tabs.names, 'home'));
    ['more', 'siddur', 'history', 'settings', 'home'].forEach((name) => {
      tabs.goTo(name);
      tabs.advance(1000);
      expect(tabs.displays()).toEqual(onlyDisplayed(tabs.names, name));
    });
  });

  it('back from home leaves the app, and back from any other tab returns home', () => {
    const tabs = renderRealTabs();
    // Nothing to go back to on home, so Android's back button closes the app instead of opening the hidden index tab.
    expect(tabs.canGoBack()).toBe(false);
    ['more', 'siddur', 'history', 'settings'].forEach((name) => {
      tabs.goTo(name);
      tabs.advance(1000);
      expect(tabs.canGoBack()).toBe(true);
      tabs.back();
      tabs.advance(1000);
      expect(tabs.focused()).toBe('home');
      expect(tabs.canGoBack()).toBe(false);
    });
  });

  it('never hides the focused tab, mid-fade or across thirty rapid switches', () => {
    const tabs = renderRealTabs();
    const order = ['more', 'siddur', 'home', 'history', 'settings'];
    const switches = 30;
    for (let i = 0; i < switches; i++) {
      const name = order[i % order.length];
      tabs.goTo(name);
      expect(tabs.displayOf(name)).toBe('flex');
      tabs.advance(5);
      expect(tabs.displayOf(name)).toBe('flex');
    }
    tabs.advance(1000);
    expect(tabs.displays()).toEqual(onlyDisplayed(tabs.names, order[(switches - 1) % order.length]));
  });
});
