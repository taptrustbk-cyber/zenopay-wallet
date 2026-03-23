import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const ringAnim = useRef(new Animated.Value(0.85)).current;
  const ringOpacity = useRef(new Animated.Value(0.35)).current;

  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 35,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringAnim, {
            toValue: 1.08,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim, {
            toValue: 0.85,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(ringOpacity, {
            toValue: 0.12,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.35,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
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
  }, [fadeAnim, scaleAnim, ringAnim, ringOpacity, particle1, particle2, particle3]);

  useEffect(() => {
    const checkSession = async () => {
      await new Promise((resolve) => setTimeout(resolve, 2200));

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
    outputRange: [0, -height * 0.55],
  });

  const particle1Opacity = particle1.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.9, 0.9, 0],
  });

  const particle2Y = particle2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.62],
  });

  const particle2Opacity = particle2.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.7, 0.7, 0],
  });

  const particle3Y = particle3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.48],
  });

  const particle3Opacity = particle3.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.65, 0.65, 0],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2F64F5', '#2D5FEA', '#2196E8']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.circleTopRight} />
      <View style={styles.circleLeft} />
      <View style={styles.circleBottomLeft} />

      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.17,
            bottom: 135,
            opacity: particle1Opacity,
            transform: [{ translateY: particle1Y }],
          },
        ]}
      >
        <View style={[styles.dot, { width: 10, height: 10 }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.particle,
          {
            right: width * 0.18,
            bottom: 200,
            opacity: particle2Opacity,
            transform: [{ translateY: particle2Y }],
          },
        ]}
      >
        <View style={[styles.dot, { width: 8, height: 8 }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.35,
            bottom: 240,
            opacity: particle3Opacity,
            transform: [{ translateY: particle3Y }],
          },
        ]}
      >
        <View style={[styles.dot, { width: 7, height: 7 }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoWrap}>
          <Animated.View
            style={[
              styles.ring,
              {
                opacity: ringOpacity,
                transform: [{ scale: ringAnim }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring2,
              {
                opacity: ringOpacity,
                transform: [{ scale: ringAnim }],
              },
            ]}
          />
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>Z</Text>
          </View>
        </View>

        <Text style={styles.appName}>ZenoPay</Text>
        <Text style={styles.tagline}>Safe • Fast • Trusted Wallet</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B2458',
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  ring: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
  },

  ring2: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  logoCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#F2F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoLetter: {
    fontSize: 58,
    fontWeight: '900',
    color: '#2F64F5',
  },

  appName: {
    fontSize: 40,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 10,
  },

  tagline: {
    fontSize: 17,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
  },

  circleTopRight: {
    position: 'absolute',
    top: -40,
    right: -80,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  circleLeft: {
    position: 'absolute',
    left: -100,
    top: 360,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  circleBottomLeft: {
    position: 'absolute',
    left: -140,
    bottom: -120,
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  particle: {
    position: 'absolute',
  },

  dot: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
});