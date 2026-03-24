import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
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
        useNativeDriver: true,
      }),
      Animated.timing(textSlideAnim, {
        toValue: 0,
        duration: 1100,
        delay: 250,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlowAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(logoGlowAnim, {
          toValue: 0.25,
          duration: 1800,
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
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(particle1, {
        toValue: 1,
        duration: 3200,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(particle2, {
        toValue: 1,
        duration: 4200,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(particle3, {
        toValue: 1,
        duration: 5200,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(particle4, {
        toValue: 1,
        duration: 3800,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // ✅ FIXED ROUTING
  useEffect(() => {
    const checkSession = async () => {
      await new Promise((r) => setTimeout(r, 2600));

      try {
        const { data } = await supabase.auth.getSession();

        if (!data?.session) {
          router.replace('/login'); // ✅ FIX
          return;
        }

        router.replace('/dashboard'); // ✅ FIX
      } catch {
        router.replace('/login'); // ✅ FIX
      }
    };

    checkSession();
  }, [router]);

  const interpolateY = (anim: Animated.Value, range: number) =>
    anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -height * range],
    });

  const interpolateOpacity = (anim: Animated.Value) =>
    anim.interpolate({
      inputRange: [0, 0.2, 0.75, 1],
      outputRange: [0, 1, 0.95, 0],
    });

  const rotate = ringRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const logoGlow = logoGlowAnim.interpolate({
    inputRange: [0.25, 1],
    outputRange: [0.3, 0.85],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F4CFF', '#2563EB', '#0EA5E9']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* particles */}
      {[particle1, particle2, particle3, particle4].map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              opacity: interpolateOpacity(p),
              transform: [{ translateY: interpolateY(p, 0.6) }],
            },
          ]}
        >
          <View style={styles.particleDot} />
        </Animated.View>
      ))}

      {/* logo */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateY: floatAnim }],
        }}
      >
        <Animated.View style={[styles.logoGlow, { opacity: logoGlow }]} />

        <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />

        <View style={styles.logo}>
          <Text style={styles.logoText}>Z</Text>
        </View>

        <Animated.Text style={[styles.title, { opacity: textFadeAnim }]}>
          ZenoPay
        </Animated.Text>

        <Animated.Text style={[styles.subtitle, { opacity: textFadeAnim }]}>
          Safe • Fast • Trusted Wallet
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  logo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoText: {
    fontSize: 60,
    fontWeight: '900',
    color: '#2563EB',
  },

  title: {
    marginTop: 16,
    fontSize: 34,
    color: '#fff',
    fontWeight: '900',
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#fff',
  },

  ring: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  logoGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  particle: {
    position: 'absolute',
    bottom: 0,
  },

  particleDot: {
    width: 6,
    height: 6,
    borderRadius: 50,
    backgroundColor: '#fff',
  },
});