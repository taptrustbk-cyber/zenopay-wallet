import "@/lib/console-override";
import "@/lib/error-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { loadStoredLanguage } from "@/lib/i18n";
import { trpc, trpcClient } from "@/lib/trpc";
import { ErrorBoundary } from "react-error-boundary";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ErrorFallback({ error, resetErrorBoundary }: any) {
  
  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.title}>App Error</Text>
      <Text style={errorStyles.message}>{error?.message || 'Unknown error'}</Text>
      <TouchableOpacity style={errorStyles.button} onPress={resetErrorBoundary}>
        <Text style={errorStyles.buttonText}>Restart App</Text>
      </TouchableOpacity>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    loadStoredLanguage()
      .then(() => {
        SplashScreen.hideAsync();
      })
      .catch(() => {
        SplashScreen.hideAsync();
      });
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </GestureHandlerRootView>
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}
