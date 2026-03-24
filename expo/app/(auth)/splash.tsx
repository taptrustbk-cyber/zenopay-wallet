import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const logoGlowAnim = useRef(new Animated.Value(0.25)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(16)).current;
  const ringRotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;
  const particle4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 950,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 42,
        useNativeDriver: true,
      }),
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 1100,
        delay: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(textSlideAnim, {
        toValue: 0,
        duration: 1100,
        delay: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlowAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoGlowAnim, {
          toValue: 0.25,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(ringRotateAnim, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(particle1, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(particle2, {
        toValue: 1,
        duration: 4200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(particle3, {
        toValue: 1,
        duration: 5200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(particle4, {
        toValue: 1,
        duration: 3800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [
    fadeAnim,
    scaleAnim,
    logoGlowAnim,
    textFadeAnim,
    textSlideAnim,
    ringRotateAnim,
    floatAnim,
    particle1,
    particle2,
    particle3,
    particle4,
  ]);

  useEffect(() => {
    const checkSession = async () => {
      await new Promise((resolve) => setTimeout(resolve, 2600));

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
    outputRange: [0, -height * 0.58],
  });
  const particle1Opacity = particle1.interpolate({
    inputRange: [0, 0.2, 0.75, 1],
    outputRange: [0, 1, 0.95, 0],
  });

  const particle2Y = particle2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.68],
  });
  const particle2Opacity = particle2.interpolate({
    inputRange: [0, 0.2, 0.75, 1],
    outputRange: [0, 1, 0.95, 0],
  });

  const particle3Y = particle3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.52],
  });
  const particle3Opacity = particle3.interpolate({
    inputRange: [0, 0.2, 0.75, 1],
    outputRange: [0, 1, 0.95, 0],
  });

  const particle4Y = particle4.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.62],
  });
  const particle4Opacity = particle4.interpolate({
    inputRange: [0, 0.2, 0.75, 1],
    outputRange: [0, 1, 0.95, 0],
  });

  const logoGlow = logoGlowAnim.interpolate({
    inputRange: [0.25, 1],
    outputRange: [0.28, 0.82],
  });

  const rotate = ringRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F4CFF', '#2563EB', '#0EA5E9']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <LinearGradient
        colors={['rgba(255,255,255,0.14)', 'transparent', 'rgba(0,0,0,0.10)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.16,
            bottom: 80,
            opacity: particle1Opacity,
            transform: [{ translateY: particle1Y }],
          },
        ]}
      >
        <View style={[styles.particleDot, { width: 8, height: 8 }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.particle,
          {
            right: width * 0.18,
            bottom: 130,
            opacity: particle2Opacity,
            transform: [{ translateY: particle2Y }],
          },
        ]}
      >
        <View style={[styles.particleDot, { width: 6, height: 6, opacity: 0.8 }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.72,
            bottom: 72,
            opacity: particle3Opacity,
            transform: [{ translateY: particle3Y }],
          },
        ]}
      >
        <View style={[styles.particleDot, { width: 10, height: 10, opacity: 0.58 }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.34,
            bottom: 150,
            opacity: particle4Opacity,
            transform: [{ translateY: particle4Y }],
          },
        ]}
      >
        <View style={[styles.particleDot, { width: 5, height: 5, opacity: 0.72 }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateY: floatAnim }],
          },
        ]}
      >
        <View style={styles.logoWrapper}>
          <Animated.View style={[styles.logoGlow, { opacity: logoGlow }]} />

          <Animated.View
            style={[
              styles.outerRing,
              {
                transform: [{ rotate }],
              },
            ]}
          />

          <LinearGradient
            colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.08)']}
            style={styles.logoCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <LinearGradient
              colors={['#FFFFFF', '#EAF2FF']}
              style={styles.innerBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoText}>Z</Text>
            </LinearGradient>
          </LinearGradient>
        </View>

        <Animated.View
          style={{
            opacity: textFadeAnim,
            transform: [{ translateY: textSlideAnim }],
            alignItems: 'center',
            marginTop: 34,
          }}
        >
          <Text style={styles.appName}>ZenoPay</Text>
          <Text style={styles.tagline}>Safe • Fast • Trusted Wallet</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoContainer: {
    alignItems: 'center',
    zIndex: 10,
  },

  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },

  logoCircle: {
    width: 144,
    height: 144,
    borderRadius: 72,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    shadowColor: '#001B64',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 14,
  },

  innerBadge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },

  logoText: {
    fontSize: 58,
    fontWeight: '900' as const,
    color: '#2563EB',
    letterSpacing: 1.2,
  },

  outerRing: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    borderTopColor: 'rgba(255,255,255,0.88)',
    borderRightColor: 'rgba(255,255,255,0.35)',
    zIndex: 2,
  },

  logoGlow: {
    position: 'absolute',
    width: 208,
    height: 208,
    borderRadius: 104,
    backgroundColor: 'rgba(255,255,255,0.16)',
    shadowColor: 'rgba(255,255,255,0.40)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 46,
    elevation: 18,
    zIndex: 1,
  },

  appName: {
    fontSize: 38,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 0.25,
  },

  tagline: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '800' as const,
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.3,
  },

  particle: {
    position: 'absolute',
  },

  particleDot: {
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.78)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.58,
    shadowRadius: 10,
    elevation: 10,
  },

  decorativeCircle1: {
    position: 'absolute',
    top: -130,
    right: -130,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  decorativeCircle2: {
    position: 'absolute',
    bottom: -170,
    left: -150,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  decorativeCircle3: {
    position: 'absolute',
    top: height * 0.2,
    left: -80,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});