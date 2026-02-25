import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoGlowAnim = useRef(new Animated.Value(0)).current;
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(logoGlowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(particle1, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(particle2, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(particle3, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: true,
      })
    ).start();
  }, [fadeAnim, scaleAnim, logoGlowAnim, particle1, particle2, particle3]);

  useEffect(() => {
    const checkSession = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data?.session) {
          router.replace('/(auth)/login' as any);
          return;
        }

        router.replace('/(app)/dashboard' as any);
      } catch {
        router.replace('/(auth)/login' as any);
      }
    };

    checkSession();
  }, [router]);

  const particle1Y = particle1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.6],
  });

  const particle1Opacity = particle1.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });

  const particle2Y = particle2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.7],
  });

  const particle2Opacity = particle2.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });

  const particle3Y = particle3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.5],
  });

  const particle3Opacity = particle3.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });

  const logoGlow = logoGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.7],
  });

  return (
    <View style={styles.container}>
      {/* ✅ Modern clean green background like your image */}
      <LinearGradient
        colors={['#16A34A', '#12B76A']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* ✅ soft highlight (very light) */}
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'transparent', 'rgba(0,0,0,0.10)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* particles (keep your animation but modern white soft) */}
      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.18,
            bottom: 90,
            opacity: particle1Opacity,
            transform: [{ translateY: particle1Y }],
          },
        ]}
      >
        <View style={[styles.particleDot, { width: 7, height: 7 }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.particle,
          {
            right: width * 0.22,
            bottom: 160,
            opacity: particle2Opacity,
            transform: [{ translateY: particle2Y }],
          },
        ]}
      >
        <View style={[styles.particleDot, { width: 6, height: 6, opacity: 0.7 }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.70,
            bottom: 70,
            opacity: particle3Opacity,
            transform: [{ translateY: particle3Y }],
          },
        ]}
      >
        <View style={[styles.particleDot, { width: 9, height: 9, opacity: 0.6 }]} />
      </Animated.View>

      {/* decorative circles (green glass) */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* ✅ optional logo circle (minimal like your design) */}
        <View style={styles.logoWrapper}>
          <Animated.View style={[styles.logoGlow, { opacity: logoGlow }]} />
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.10)']}
            style={styles.logoCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.logoText}>Z</Text>
          </LinearGradient>
        </View>

        {/* ✅ Text like your image */}
        <Text style={styles.appName}>ZenoPay</Text>
        <Text style={styles.tagline}>Safe &amp; Trust Wallet</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  logoContainer: { alignItems: 'center', zIndex: 10 },

  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
  },

  logoText: {
    fontSize: 56,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  logoGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.12)',
    shadowColor: 'rgba(255,255,255,0.35)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
    elevation: 16,
  },

  appName: {
    fontSize: 34,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  tagline: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.92)',
  },

  particle: { position: 'absolute' },
  particleDot: {
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 10,
  },

  decorativeCircle1: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -160,
    left: -140,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
});
