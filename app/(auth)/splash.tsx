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
    outputRange: [0.6, 1],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F0C29', '#302b63', '#24243e']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <LinearGradient
        colors={['rgba(102, 126, 234, 0.4)', 'transparent', 'rgba(118, 75, 162, 0.4)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.2,
            bottom: 100,
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
            right: width * 0.25,
            bottom: 150,
            opacity: particle2Opacity,
            transform: [{ translateY: particle2Y }],
          },
        ]}
      >
        <View style={[styles.particleDot, { width: 6, height: 6 }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.particle,
          {
            left: width * 0.7,
            bottom: 80,
            opacity: particle3Opacity,
            transform: [{ translateY: particle3Y }],
          },
        ]}
      >
        <View style={[styles.particleDot, { width: 10, height: 10 }]} />
      </Animated.View>

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
        <View style={styles.logoWrapper}>
          <Animated.View
            style={[
              styles.logoGlow,
              {
                opacity: logoGlow,
              },
            ]}
          />
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.logoCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.logoText}>ZP</Text>
          </LinearGradient>
        </View>

        <View style={styles.taglineContainer}>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Your Digital Wallet</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.subtitleContainer}>
          <View style={styles.dotIndicator} />
          <Text style={styles.subtitle}>Fast • Secure • Reliable</Text>
        </View>
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
    marginBottom: 32,
  },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  logoText: {
    fontSize: 72,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logoGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(102, 126, 234, 0.5)',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '500' as const,
    color: '#FFFFFF',
    opacity: 0.9,
    marginHorizontal: 16,
    letterSpacing: 1,
  },
  divider: {
    width: 40,
    height: 1.5,
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    opacity: 0.75,
    letterSpacing: 1.5,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#667eea',
    marginRight: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  particle: {
    position: 'absolute',
  },
  particleDot: {
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -150,
    left: -120,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(118, 75, 162, 0.15)',
    shadowColor: '#764ba2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
  },
});
