declare module '@react-native-async-storage/async-storage' {
  export interface AsyncStorageStatic {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }

  const AsyncStorage: AsyncStorageStatic;
  export default AsyncStorage;
}

declare module 'react-native-image-resizer' {
  export interface ImageResizerResponse {
    path: string;
    uri: string;
    name?: string;
    size?: number;
  }

  export default class ImageResizer {
    static createResizedImage(
      uri: string,
      width: number,
      height: number,
      format: 'JPEG' | 'PNG' | 'WEBP',
      quality: number,
      rotation?: number,
      outputPath?: string,
      keepMeta?: boolean,
      options?: { mode?: 'contain' | 'cover'; onlyScaleDown?: boolean }
    ): Promise<ImageResizerResponse>;
  }
}

declare module 'react-native-fast-image' {
  import { ComponentType } from 'react';
  import { ImageProps } from 'react-native';

  export interface FastImageProps extends ImageProps {
    source: {
      uri?: string;
      headers?: Record<string, string>;
      priority?: 'low' | 'normal' | 'high';
      cache?: 'immutable' | 'web' | 'cacheOnly';
    };
    resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
    fallback?: boolean;
  }

  const FastImage: ComponentType<FastImageProps> & {
    preload(sources: { uri: string }[]): void;
  };
  export default FastImage;
}

declare module 'react-native-fs' {
  export interface StatResult {
    size: number;
    mtime: number;
    ctime: number;
    path: string;
    isFile(): boolean;
    isDirectory(): boolean;
  }

  export interface RNFSModule {
    DocumentDirectoryPath: string;
    TemporaryDirectoryPath: string;
    mkdir(path: string): Promise<void>;
    stat(path: string): Promise<StatResult>;
    unlink(path: string): Promise<void>;
    readFile(path: string, encoding?: 'utf8' | 'base64'): Promise<string>;
    writeFile(path: string, data: string, encoding?: 'utf8' | 'base64'): Promise<void>;
    copyFile(from: string, to: string): Promise<void>;
  }

  const RNFS: RNFSModule;
  export default RNFS;
}

declare module 'react-native' {
  import { Component, ComponentType, ReactNode } from 'react';

  export interface ViewStyle {
    [key: string]: unknown;
  }

  export interface TextStyle extends ViewStyle {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
  }

  export interface ImageStyle extends ViewStyle {
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  }

  export type StyleProp<T> = T | T[] | null | undefined;

  export interface ImageProps {
    style?: StyleProp<ImageStyle>;
    source?: { uri?: string };
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  }

  export const Image: {
    prefetch(uri: string): Promise<boolean>;
  };

  export interface ViewProps {
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
  }

  export interface TextProps {
    style?: StyleProp<TextStyle>;
    children?: ReactNode;
  }

  export interface TouchableOpacityProps {
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
    children?: ReactNode;
  }

  export interface FlatListProps<ItemT> {
    data: ReadonlyArray<ItemT>;
    renderItem: (info: { item: ItemT; index: number }) => ReactNode;
    keyExtractor?: (item: ItemT, index: number) => string;
    numColumns?: number;
    contentContainerStyle?: StyleProp<ViewStyle>;
    ListEmptyComponent?: ReactNode;
  }

  export interface ActivityIndicatorProps {
    color?: string;
  }

  export const View: ComponentType<ViewProps>;
  export const Text: ComponentType<TextProps>;
  export const TouchableOpacity: ComponentType<TouchableOpacityProps>;
  export const ActivityIndicator: ComponentType<ActivityIndicatorProps>;
  export class FlatList<ItemT> extends Component<FlatListProps<ItemT>> {}
  export const StyleSheet: {
    flatten<T>(style?: StyleProp<T>): T;
    create<T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(styles: T): T;
  };
}

declare module '@react-native-firebase/storage' {
  export interface FirebaseStorageTypes {
    Reference: any;
  }

  export interface FirebaseStorage {
    ref(path: string): any;
  }

  export default function storage(): FirebaseStorage;
}

declare module 'react-native-image-picker' {
  export interface Asset {
    uri?: string;
    fileName?: string;
    type?: string;
    fileSize?: number;
  }

  export interface ImageLibraryOptions {
    mediaType?: 'photo' | 'video' | 'mixed';
    selectionLimit?: number;
  }

  export interface ImagePickerResponse {
    didCancel?: boolean;
    assets?: Asset[];
    errorCode?: string;
    errorMessage?: string;
  }

  export function launchImageLibrary(options: ImageLibraryOptions): Promise<ImagePickerResponse>;
}
