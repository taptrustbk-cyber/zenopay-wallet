import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext'; // keep (not breaking)
import { useRouter, Stack } from 'expo-router';
import i18n from '@/lib/i18n';

const UI = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  text: '#111827',
  text2: '#6B7280',
  border: '#E5E7EB',
  green: '#47B08A',
  greenSoft: '#EAF7F1',
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
  const { theme } = useTheme(); // keep (not used for colors now)
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
      {/* ✅ REMOVE Expo Router default dark header (fix double back/title) */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* ✅ FIX: include top safe area so header/back/title are not too high */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header (single header only) */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.85}>
              <Ionicons name="arrow-back" size={22} color={UI.text} />
              <Text style={styles.backText}>{i18n.t('back')}</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{i18n.t('travelBooking')}</Text>

            <View style={{ width: 70 }} />
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="information-circle" size={22} color={UI.green} />
            </View>
            <Text style={styles.infoText}>{i18n.t('travelBookingInfo')}</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsList}>
            {bookingOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionCard}
                onPress={() => handleBookingPress(option)}
                activeOpacity={0.9}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${option.color}18` }]}>
                  <Ionicons name={option.icon} size={28} color={option.color} />
                </View>

                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>

                <View style={styles.openPill}>
                  <Ionicons name="open-outline" size={18} color={UI.green} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note card */}
          <View style={styles.noteCard}>
            <View style={styles.noteIconCircle}>
              <Ionicons name="shield-checkmark" size={20} color={UI.green} />
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
    padding: 16,
    paddingTop: 16, // ✅ a bit more space so header is clearly visible & clickable
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingTop: 2, // ✅ keep small (SafeArea now handles top)
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 90,
  },
  backText: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 14,
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
    borderRadius: 18,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    gap: 12,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
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
    lineHeight: 16,
    color: UI.text2,
    fontWeight: '700',
  },
  openPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
  },
  noteIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: UI.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: UI.text2,
    fontWeight: '700',
  },
});
