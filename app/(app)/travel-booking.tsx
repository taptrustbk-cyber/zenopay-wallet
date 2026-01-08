import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import i18n from '@/lib/i18n';

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
  const { theme } = useTheme();
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {i18n.t('travelBooking')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={[styles.infoCard, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
            <Ionicons name="information-circle" size={32} color="#8B5CF6" />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              {i18n.t('travelBookingInfo')}
            </Text>
          </View>

          <View style={styles.optionsList}>
            {bookingOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, { backgroundColor: theme.colors.card }]}
                onPress={() => handleBookingPress(option)}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${option.color}20` }]}>
                  <Ionicons name={option.icon} size={32} color={option.color} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                    {option.description}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.noteCard, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="shield-checkmark" size={24} color="#10B981" />
            <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>
              {i18n.t('travelBookingSafe')}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  optionsList: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
