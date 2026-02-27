import { Stack } from 'expo-router';
import { ErrorBoundary } from 'react-error-boundary';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={resetErrorBoundary}>
        <Text style={styles.retryText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* ✅ THIS LINE IS THE FIX: it enables /auth/* routes */}
        <Stack.Screen name="auth" options={{ headerShown: false }} />

        {/* ✅ Keep your other app routes/groups here if you have them */}
        {/* Example: */}
        {/* <Stack.Screen name="(tabs)" options={{ headerShown: false }} /> */}
        {/* <Stack.Screen name="index" /> */}
      </Stack>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0F172A',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#60A5FA',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
