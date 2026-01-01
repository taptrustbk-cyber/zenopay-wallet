import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import i18n from '@/lib/i18n';

const CONSULATES = [
  {
    id: 'baghdad',
    name: 'Erbil&Baghdad Consulate',
    image: 'https://images.unsplash.com/photo-1591608516796-61b6b50e05e9?w=400',
    location: 'Iraq',
    verified: true,
  },
  {
    id: 'italy',
    name: 'Italy',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400',
    location: 'Rome',
  },
  {
    id: 'france',
    name: 'France',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400',
    location: 'Paris',
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400',
    location: 'London',
  },
  {
    id: 'germany',
    name: 'Germany',
    image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400',
    location: 'Berlin',
  },
  {
    id: 'finland',
    name: 'Finland',
    image: 'https://images.unsplash.com/photo-1543832923-44667a44c804?w=400',
    location: 'Helsinki',
  },
  {
    id: 'sweden',
    name: 'Sweden',
    image: 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=400',
    location: 'Stockholm',
  },
  {
    id: 'usa',
    name: 'USA',
    image: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400',
    location: 'New York',
  },
  {
    id: 'canada',
    name: 'Canada',
    image: 'https://images.unsplash.com/photo-1517935706615-2717063c2225?w=400',
    location: 'Toronto',
  },
];

export default function ConsulateScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {i18n.t('consulate')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {i18n.t('consulateSubtitle')}
          </Text>
        </View>

        <View style={styles.grid}>
          {CONSULATES.map((consulate) => (
            <TouchableOpacity
              key={consulate.id}
              style={[styles.card, { backgroundColor: theme.colors.card }]}
              activeOpacity={0.7}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: consulate.image }}
                  style={styles.image}
                  resizeMode="cover"
                />
                {consulate.verified && (
                  <View style={styles.verifiedPill}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.verifiedText}>{i18n.t('verified')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                  {consulate.name}
                </Text>
                {consulate.location && (
                  <Text style={[styles.cardLocation, { color: theme.colors.textSecondary }]}>
                    {consulate.location}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  grid: {
    padding: 20,
    paddingTop: 10,
    gap: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative' as const,
  },
  image: {
    width: '100%',
    height: 180,
  },
  verifiedPill: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  verifiedText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  cardLocation: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
