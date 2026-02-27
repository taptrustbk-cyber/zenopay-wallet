import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* ✅ IMPORTANT: allow /auth/* routes */}
      <Stack.Screen name="auth" options={{ headerShown: false }} />

      {/* your other stacks/groups */}
      {/* مثال */}
      {/* <Stack.Screen name="(tabs)" /> */}
      {/* <Stack.Screen name="index" /> */}
    </Stack>
  );
}
