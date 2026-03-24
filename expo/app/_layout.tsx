import "@/lib/console-override";
import "@/lib/error-handler";

import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "react-error-boundary";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { loadStoredLanguage } from "@/lib/i18n";
import { trpc, trpcClient } from "@/lib/trpc";

if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

// keep native splash visible until app is actually ready
SplashScreen.preventAutoHideAsync().catch(() => {});

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
      <Text style={errorStyles.message}>{error?.message || "Unknown error"}</Text>
      <TouchableOpacity style={errorStyles.button} onPress={resetErrorBoundary}>
        <Text style={errorStyles.buttonText}>Restart App</Text>
      </TouchableOpacity>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#0A1F44",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#EF4444",
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: "#CBD5E1",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0A1F44" },
        animation: "none",
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

function AppShell() {
  const { scheme } = useTheme();

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "light"} backgroundColor="#0A1F44" />
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0A1F44" }}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </GestureHandlerRootView>
    </>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function prepare() {
      try {
        await loadStoredLanguage();
      } catch (error) {
        console.warn("Failed to load stored language:", error);
      } finally {
        if (mounted) {
          setAppReady(true);
        }
      }
    }

    prepare();

    return () => {
      mounted = false;
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      try {
        await SplashScreen.hideAsync();
      } catch {}
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A1F44" }} onLayout={onLayoutRootView}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AppShell />
            </ThemeProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </ErrorBoundary>
    </View>
  );
}