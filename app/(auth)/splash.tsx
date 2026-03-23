import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Easing,
} from "react-native";
import { Image } from "expo-image";
import { Asset } from "expo-asset";
import { supabase } from "@/lib/supabase";

const splashIcon = require("@/assets/images/splash-icon.png");

export default function SplashScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(12)).current;
  const glowOpacity = useRef(new Animated.Value(0.18)).current;

  useEffect(() => {
    let mounted = true;

    const preload = async () => {
      try {
        await Asset.loadAsync([splashIcon]);
      } catch {}
      if (mounted) setReady(true);
    };

    preload();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 48,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        delay: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(textTranslate, {
        toValue: 0,
        duration: 500,
        delay: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: -8,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.34,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.18,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [ready, logoOpacity, logoScale, logoFloat, textOpacity, textTranslate, glowOpacity]);

  useEffect(() => {
    if (!ready) return;

    const checkSession = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1800));

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data?.session) {
          router.replace("/(auth)/login" as any);
          return;
        }

        router.replace("/(app)/dashboard" as any);
      } catch {
        router.replace("/(auth)/login" as any);
      }
    };

    checkSession();
  }, [ready, router]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

      {ready ? (
        <Animated.View
          style={[
            styles.center,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { translateY: logoFloat }],
            },
          ]}
        >
          <Image
            source={splashIcon}
            style={styles.logo}
            contentFit="contain"
            cachePolicy="memory-disk"
          />

          <Animated.View
            style={{
              opacity: textOpacity,
              transform: [{ translateY: textTranslate }],
              alignItems: "center",
            }}
          >
            <Text style={styles.appName}>ZenoPay Wallet</Text>
            <Text style={styles.tagline}>Safe • Fast • Trusted Wallet</Text>
          </Animated.View>
        </Animated.View>
      ) : (
        <View style={styles.center} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1F44",
    alignItems: "center",
    justifyContent: "center",
  },

  center: {
    alignItems: "center",
    justifyContent: "center",
  },

  glow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#1D4ED8",
    opacity: 0.22,
  },

  logo: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },

  appName: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  tagline: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.88)",
    letterSpacing: 0.2,
  },
});