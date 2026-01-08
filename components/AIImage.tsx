import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

interface AIImageProps {
  prompt?: string;
  imageUrl?: string;
  style?: StyleProp<ImageStyle>;
}

export default function AIImage({ prompt, imageUrl, style }: AIImageProps) {
  const finalImageUrl = imageUrl || `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt || '')}?width=800&height=800&nologo=true`;
  
  return (
    <Image
      source={{ uri: finalImageUrl }}
      style={style}
      resizeMode="contain"
    />
  );
}
