import { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
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
    // Main animation
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

    // Glow loop
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

    // Particles
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

    // Navigate
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

      {/* logo */}
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: fade,
            transform: [{ scale }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glow,
            { opacity: glowOpacity },
          ]}
        />

        <Animated.Image
          source={require('@/assets/images/splash.PNG')}
          style={styles.logo}
          resizeMode="contain"
        />
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

  logo: {
    width: 220,
    height: 220,
  },

  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.15)',
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