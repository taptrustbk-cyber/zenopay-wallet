import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Linking, Alert, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, Stack } from 'expo-router';
import i18n from '@/lib/i18n';

const UI = {
  bg: '#EEF4FF',
  page: '#F7FAFF',
  card: '#FFFFFF',
  soft: '#F8FBFF',
  text: '#0F172A',
  text2: '#64748B',
  text3: '#94A3B8',
  border: '#D9E5F6',

  blue: '#2563EB',
  blue2: '#3B82F6',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',
  blueSoft2: '#DCEBFF',

  white: '#FFFFFF',
  shadow: '#7DA8E6',
};

const SHADOWS = {
  card: {
    shadowColor: UI.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: UI.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

interface BookingOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  url: string;
  color: string;
}

const tSafe = (key: string, fallback: string) => {
  try {
    const value = i18n.t(key) as unknown as string;
    if (!value) return fallback;

    const s = String(value).trim();
    const lower = s.toLowerCase();

    if (
      !s ||
      s === key ||
      lower.includes('missing translation') ||
      lower.includes('[missing') ||
      lower.includes(`"${key.toLowerCase()}"`)
    ) {
      return fallback;
    }

    return s;
  } catch {
    return fallback;
  }
};

export default function TravelBookingScreen() {
  useTheme();
  const router = useRouter();
  const isRTL = I18nManager.isRTL;

  const bookingOptions: BookingOption[] = [
    {
      id: '1',
      title: tSafe('travelBookingHotelsTitle', 'Hotels'),
      description: tSafe('travelBookingHotelsDesc', 'Book hotels worldwide with best prices'),
      icon: 'bed',
      url: 'https://www.booking.com',
      color: '#003580',
    },
    {
      id: '2',
      title: tSafe('travelBookingAgodaTitle', 'Hotels (Agoda)'),
      description: tSafe('travelBookingAgodaDesc', 'Alternative hotel booking platform'),
      icon: 'home',
      url: 'https://www.agoda.com',
      color: '#D10074',
    },
    {
      id: '3',
      title: tSafe('travelBookingFlightsTitle', 'Flights'),
      description: tSafe('travelBookingFlightsDesc', 'Search and compare flight prices'),
      icon: 'airplane',
      url: 'https://www.skyscanner.com',
      color: '#00B2D6',
    },
    {
      id: '4',
      title: tSafe('travelBookingCarsTitle', 'Car Rentals'),
      description: tSafe('travelBookingCarsDesc', 'Rent cars for your journey'),
      icon: 'car',
      url: 'https://www.rentalcars.com',
      color: '#FF6B00',
    },
    {
      id: '5',
      title: tSafe('travelBookingTrainsTitle', 'Train Tickets'),
      description: tSafe('travelBookingTrainsDesc', 'Book train tickets worldwide'),
      icon: 'train',
      url: 'https://www.trainline.com',
      color: '#55AB26',
    },
  ];

  const handleBookingPress = async (option: BookingOption) => {
    try {
      const supported = await Linking.canOpenURL(option.url);

      if (supported) {
        await Linking.openURL(option.url);
      } else {
        Alert.alert(
          tSafe('error', 'Error'),
          tSafe('cannotOpenLink', 'Cannot open this link')
        );
      }
    } catch {
      Alert.alert(
        tSafe('error', 'Error'),
        tSafe('failedToOpenLink', 'Failed to open link')
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: UI.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.9}>
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={22}
                color={UI.blueDark}
              />
              <Text style={styles.backText}>{tSafe('back', 'Back')}</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{tSafe('travelBooking', 'Travel Booking')}</Text>

            <View style={styles.headerGhost} />
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="information-circle" size={22} color={UI.blue} />
            </View>
            <Text style={[styles.infoText, isRTL && styles.textRTL]}>
              {tSafe(
                'travelBookingInfo',
                'Use trusted travel platforms to book hotels, flights, cars, and train tickets.'
              )}
            </Text>
          </View>

          <View style={styles.optionsList}>
            {bookingOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, isRTL && styles.optionCardRTL]}
                onPress={() => handleBookingPress(option)}
                activeOpacity={0.92}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${option.color}18` }]}>
                  <Ionicons name={option.icon} size={28} color={option.color} />
                </View>

                <View style={styles.optionInfo}>
                  <Text style={[styles.optionTitle, isRTL && styles.textRTL]}>{option.title}</Text>
                  <Text style={[styles.optionDescription, isRTL && styles.textRTL]}>
                    {option.description}
                  </Text>
                </View>

                <View style={styles.openPill}>
                  <Ionicons name="open-outline" size={18} color={UI.blue} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.noteCard}>
            <View style={styles.noteIconCircle}>
              <Ionicons name="shield-checkmark" size={20} color={UI.blue} />
            </View>
            <Text style={[styles.noteText, isRTL && styles.textRTL]}>
              {tSafe(
                'travelBookingSafe',
                'You will be redirected to external trusted booking services. Please review their prices, policies, and terms before booking.'
              )}
            </Text>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    width: 90,
    height: 46,
    borderRadius: 16,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...SHADOWS.soft,
  },
  backText: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
  },
  headerGhost: {
    width: 90,
    height: 46,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 14,
    ...SHADOWS.soft,
  },
  infoIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: UI.text,
    fontWeight: '700',
  },

  optionsList: {
    gap: 12,
    marginBottom: 14,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 22,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    gap: 12,
    ...SHADOWS.soft,
  },
  optionCardRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: { flex: 1 },
  optionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: UI.text2,
    fontWeight: '700',
  },
  openPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    ...SHADOWS.soft,
  },
  noteIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: UI.text2,
    fontWeight: '700',
  },

  textRTL: {
    textAlign: 'right',
  },
});