import { Image, ImageStyle, StyleProp } from 'react-native';

interface AIImageProps {
  prompt: string;
  style?: StyleProp<ImageStyle>;
  width?: number;
  height?: number;
}

export default function AIImage({ prompt, style, width = 140, height = 140 }: AIImageProps) {
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true`;
  
  return (
    <Image
      source={{ uri: imageUrl }}
      style={[{ width: '100%', height, resizeMode: 'contain' }, style]}
    />
  );
}
