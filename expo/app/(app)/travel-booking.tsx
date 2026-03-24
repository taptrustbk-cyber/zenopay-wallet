import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
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
  icon: any;
  url: string;
  color: string;
}

const bookingOptions: BookingOption[] = [
  {
    id: '1',
    title: 'Hotels',
    description: 'Book hotels worldwide with best prices',
    icon: 'bed',
    url: 'https://www.booking.com',
    color: '#003580',
  },
  {
    id: '2',
    title: 'Hotels (Agoda)',
    description: 'Alternative hotel booking platform',
    icon: 'home',
    url: 'https://www.agoda.com',
    color: '#D10074',
  },
  {
    id: '3',
    title: 'Flights',
    description: 'Search and compare flight prices',
    icon: 'airplane',
    url: 'https://www.skyscanner.com',
    color: '#00B2D6',
  },
  {
    id: '4',
    title: 'Car Rentals',
    description: 'Rent cars for your journey',
    icon: 'car',
    url: 'https://www.rentalcars.com',
    color: '#FF6B00',
  },
  {
    id: '5',
    title: 'Train Tickets',
    description: 'Book train tickets worldwide',
    icon: 'train',
    url: 'https://www.trainline.com',
    color: '#55AB26',
  },
];

export default function TravelBookingScreen() {
  useTheme();
  const router = useRouter();

  const handleBookingPress = async (option: BookingOption) => {
    try {
      const supported = await Linking.canOpenURL(option.url);

      if (supported) {
        await Linking.openURL(option.url);
      } else {
        Alert.alert(i18n.t('error'), i18n.t('cannotOpenLink'));
      }
    } catch {
      Alert.alert(i18n.t('error'), i18n.t('failedToOpenLink'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: UI.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.9}>
              <Ionicons name="arrow-back" size={22} color={UI.blueDark} />
              <Text style={styles.backText}>{i18n.t('back')}</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{i18n.t('travelBooking')}</Text>

            <View style={styles.headerGhost} />
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="information-circle" size={22} color={UI.blue} />
            </View>
            <Text style={styles.infoText}>{i18n.t('travelBookingInfo')}</Text>
          </View>

          <View style={styles.optionsList}>
            {bookingOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionCard}
                onPress={() => handleBookingPress(option)}
                activeOpacity={0.92}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${option.color}18` }]}>
                  <Ionicons name={option.icon} size={28} color={option.color} />
                </View>

                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
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
            <Text style={styles.noteText}>{i18n.t('travelBookingSafe')}</Text>
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
});