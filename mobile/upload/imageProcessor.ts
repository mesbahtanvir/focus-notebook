import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';

export interface CompressionOptions {
  longestEdgePx?: number;
  quality?: number;
  maxKilobytes?: number;
  minKilobytes?: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  longestEdgePx: 1080,
  quality: 75,
  maxKilobytes: 500,
  minKilobytes: 150,
};

export async function compressImageForUpload(
  uri: string,
  options: CompressionOptions = {}
): Promise<{ uri: string; size: number }> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let currentQuality = config.quality;
  let lastResult: { uri: string; size: number } | null = null;

  while (currentQuality >= 50) {
    const resized = await ImageResizer.createResizedImage(
      uri,
      config.longestEdgePx,
      config.longestEdgePx,
      'JPEG',
      currentQuality,
      0,
      undefined,
      false,
      { mode: 'contain', onlyScaleDown: true }
    );

    const resizedUri = resized.uri || resized.path;
    const stats = await RNFS.stat(resizedUri);
    lastResult = { uri: resizedUri, size: stats.size };

    const sizeKb = stats.size / 1024;
    if (sizeKb > config.maxKilobytes) {
      currentQuality -= 5;
      continue;
    }

    if (sizeKb < config.minKilobytes && currentQuality < config.quality) {
      // Small enough already, no need to keep reducing quality.
      break;
    }

    break;
  }

  if (!lastResult) {
    throw new Error('Image compression failed');
  }

  return lastResult;
}
