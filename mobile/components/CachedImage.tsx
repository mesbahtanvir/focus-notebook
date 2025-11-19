"use client";

import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import FastImage, { type FastImageProps } from "react-native-fast-image";

interface CachedImageProps {
  localUri?: string;
  thumbUrl?: string;
  fullUrl?: string;
  style?: StyleProp<ImageStyle>;
  wrapperStyle?: StyleProp<ViewStyle>;
  resizeMode?: FastImageProps["resizeMode"];
  showLoader?: boolean;
}

export function CachedImage({
  localUri,
  thumbUrl,
  fullUrl,
  style,
  wrapperStyle,
  resizeMode = "cover",
  showLoader = false,
}: CachedImageProps) {
  const [activeSource, setActiveSource] = useState<{ uri: string } | null>(() => {
    if (localUri) return { uri: localUri };
    if (thumbUrl) return { uri: thumbUrl };
    return fullUrl ? { uri: fullUrl } : null;
  });
  const [isHighResReady, setHighResReady] = useState(false);

  useEffect(() => {
    if (!fullUrl) return;
    let cancelled = false;

    FastImage.preload([{ uri: fullUrl }]);
    Image.prefetch(fullUrl)
      .then(() => {
        if (!cancelled) {
          setHighResReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHighResReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fullUrl]);

  useEffect(() => {
    if (localUri) {
      setActiveSource({ uri: localUri });
      return;
    }
    if (thumbUrl) {
      setActiveSource({ uri: thumbUrl });
      return;
    }
    if (fullUrl) {
      setActiveSource({ uri: fullUrl });
    }
  }, [localUri, thumbUrl, fullUrl]);

  useEffect(() => {
    if (isHighResReady && fullUrl) {
      setActiveSource({ uri: fullUrl });
    }
  }, [isHighResReady, fullUrl]);

  const renderLoader = showLoader && !isHighResReady && fullUrl && activeSource?.uri !== fullUrl;

  if (!activeSource) {
    return null;
  }

  return (
    <View style={wrapperStyle}>
      <FastImage
        source={{
          uri: activeSource.uri,
          cache: "immutable",
          priority: "high",
        }}
        resizeMode={resizeMode}
        style={style}
      />
      {renderLoader ? (
        <View
          style={[
            StyleSheet.flatten(style),
            {
              position: "absolute",
              alignItems: "center",
              justifyContent: "center",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            },
          ]}
        >
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
    </View>
  );
}
