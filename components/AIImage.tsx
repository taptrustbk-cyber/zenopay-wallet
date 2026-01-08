import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

interface AIImageProps {
  prompt: string;
  style?: StyleProp<ImageStyle>;
}

export default function AIImage({ prompt, style }: AIImageProps) {
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&nologo=true`;
  
  return (
    <Image
      source={{ uri: imageUrl }}
      style={style}
      resizeMode="contain"
    />
  );
}
