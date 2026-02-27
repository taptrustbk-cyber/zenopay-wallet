import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* ✅ REQUIRED: enable /auth/* routes */}
      <Stack.Screen name="auth" options={{ headerShown: false }} />
    </Stack>
  );
}
