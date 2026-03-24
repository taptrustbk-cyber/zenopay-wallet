import { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function Splash() {
  const router = useRouter();

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(particle1, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(particle2, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: true,
      })
    ).start();

    setTimeout(() => {
      router.replace('/(tabs)');
    }, 3000);
  }, []);

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.7],
  });

  const particle1Y = particle1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.5],
  });

  const particle2Y = particle2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.6],
  });

  return (
    <View style={styles.container}>

      {/* particles */}
      <Animated.View
        style={[
          styles.particle,
          { left: 60, bottom: 80, transform: [{ translateY: particle1Y }] },
        ]}
      />
      <Animated.View
        style={[
          styles.particleSmall,
          { right: 60, bottom: 120, transform: [{ translateY: particle2Y }] },
        ]}
      />

      {/* LOGO (no image) */}
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: fade,
            transform: [{ scale }],
          },
        ]}
      >
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>Z</Text>
        </View>

        <Text style={styles.appName}>ZenoPay</Text>
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

  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1D4ED8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },

  logoText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
  },

  appName: {
    marginTop: 12,
    fontSize: 20,
    color: '#fff',
    fontWeight: '800',
  },

  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(59,130,246,0.25)',
  },

  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },

  particleSmall: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});