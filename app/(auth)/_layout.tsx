import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* ✅ allow /auth/* pages */}
      <Stack.Screen name="auth" options={{ headerShown: false }} />
    </Stack>
  );
}
