import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

// The text of a file bundled as an asset (a `.siddur` or `.places` module), read from disk on a phone and
// fetched on the web.
export async function readBundledAsset(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (Platform.OS === 'web') return (await fetch(uri)).text();
  return new File(uri).text();
}
