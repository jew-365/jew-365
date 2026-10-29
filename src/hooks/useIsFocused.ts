import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigation } from 'expo-router';
import { afterPaint } from '@/utils/afterPaint';

type FocusNavigation = {
  addListener: (event: 'focus' | 'blur', listener: () => void) => () => void;
  isFocused: () => boolean;
  getState?: () => { index: number; routes: { key: string }[] } | undefined;
};

function useFocusNavigation(): FocusNavigation | null {
  try {
    return useNavigation() as unknown as FocusNavigation;
  } catch {
    return null;
  }
}

export function useIsFocused(): boolean {
  const navigation = useFocusNavigation();
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!navigation) return () => {};
      const offFocus = navigation.addListener('focus', onChange);
      const offBlur = navigation.addListener('blur', onChange);
      return () => {
        offFocus();
        offBlur();
      };
    },
    [navigation],
  );
  const isFocused = useCallback(() => (navigation ? navigation.isFocused() : true), [navigation]);
  return useSyncExternalStore(subscribe, isFocused, isFocused);
}

export function useReplayKey(onReplay?: () => void): number {
  const navigation = useFocusNavigation();
  const focused = useIsFocused();
  const was = useRef(focused);
  const left = useRef(!focused);
  const tabKey = useRef<string | null>(null);
  const replay = useRef(onReplay);
  replay.current = onReplay;
  const [key, setKey] = useState(0);
  const focusedRouteKey = useCallback(() => {
    const state = navigation?.getState?.();
    return state ? (state.routes[state.index]?.key ?? null) : null;
  }, [navigation]);
  useEffect(() => {
    if (!navigation) return;
    return navigation.addListener('blur', () => {
      const state = navigation.getState?.();
      left.current = !state || state.routes[state.index]?.key !== tabKey.current;
    });
  }, [navigation]);
  useEffect(() => {
    const returned = focused && !was.current && left.current;
    was.current = focused;
    if (focused) {
      tabKey.current = focusedRouteKey();
      left.current = false;
    }
    if (!returned) return;
    const task = afterPaint(() => {
      replay.current?.();
      setKey((n) => n + 1);
    });
    return () => task.cancel();
  }, [focused, focusedRouteKey]);
  return key;
}
