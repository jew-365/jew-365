import { useCallback, useSyncExternalStore } from 'react';
import { useNavigation } from 'expo-router';

type FocusNavigation = {
  addListener: (event: 'focus' | 'blur', listener: () => void) => () => void;
  isFocused: () => boolean;
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
