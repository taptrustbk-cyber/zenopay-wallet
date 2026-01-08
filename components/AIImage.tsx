import React, { useState } from 'react';
import { Image, ImageStyle, StyleProp, View, ActivityIndicator, StyleSheet } from 'react-native';

interface AIImageProps {
  prompt: string;
  style?: StyleProp<ImageStyle>;
}

export default function AIImage({ prompt, style }: AIImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const seed = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&nologo=true&seed=${seed}&model=flux`;
  
  return (
    <View style={[styles.container, style]}>
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      )}
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, error && styles.errorImage]}
        resizeMode="contain"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  errorImage: {
    opacity: 0.5,
  },
});
