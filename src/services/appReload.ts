import { DevSettings, Platform } from 'react-native';
import * as Updates from 'expo-updates';

export async function reloadApp() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.location.reload();
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    if (__DEV__ && DevSettings && typeof DevSettings.reload === 'function') {
      DevSettings.reload();
    }
  }
}
