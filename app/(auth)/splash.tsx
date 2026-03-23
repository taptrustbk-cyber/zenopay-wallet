import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Easing,
  Image,
} from "react-native";
import { supabase } from "@/lib/supabase";

export default function SplashScreen() {
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textTranslateAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 700,
        delay: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateAnim, {
        toValue: 0,
        duration: 700,
        delay: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, textFadeAnim, textTranslateAnim]);

  useEffect(() => {
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
  }, [router]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require("@/assets/images/splash-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Animated.View
          style={{
            opacity: textFadeAnim,
            transform: [{ translateY: textTranslateAnim }],
            alignItems: "center",
          }}
        >
          <Text style={styles.appName}>ZenoPay Wallet</Text>
          <Text style={styles.tagline}>Safe • Fast • Trusted Wallet</Text>
        </Animated.View>
      </Animated.View>
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

  content: {
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 240,
    height: 240,
    marginBottom: 22,
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