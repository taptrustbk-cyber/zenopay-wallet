import { StyleSheet, View, Text, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import i18n from '@/lib/i18n';

interface Consulate {
  id: number;
  country: string;
  city: string;
  capital: string;
  address: string;
  contact: string;
  image: string;
}

const CONSULATES: Consulate[] = [
  {
    id: 1,
    country: 'France',
    city: 'Erbil',
    capital: 'Paris',
    address: '123 Street, Erbil',
    contact: '+964 750 123 4567',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400',
  },
  {
    id: 2,
    country: 'Germany',
    city: 'Erbil',
    capital: 'Berlin',
    address: '45 Avenue, Erbil',
    contact: '+964 750 987 6543',
    image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400',
  },
  {
    id: 3,
    country: 'Italy',
    city: 'Baghdad',
    capital: 'Rome',
    address: '12 Main Street, Baghdad',
    contact: '+964 770 555 1234',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400',
  },
  {
    id: 4,
    country: 'Spain',
    city: 'Baghdad',
    capital: 'Madrid',
    address: '77 Avenue, Baghdad',
    contact: '+964 770 111 2233',
    image: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=400',
  },
  {
    id: 5,
    country: 'UK',
    city: 'Erbil',
    capital: 'London',
    address: '1 King Street, Erbil',
    contact: '+964 750 444 5566',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400',
  },
  {
    id: 6,
    country: 'USA',
    city: 'Baghdad',
    capital: 'Washington D.C.',
    address: '1600 Embassy Road, Baghdad',
    contact: '+964 770 999 8888',
    image: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400',
  },
  {
    id: 7,
    country: 'Canada',
    city: 'Erbil',
    capital: 'Ottawa',
    address: '12 Maple Street, Erbil',
    contact: '+964 750 222 3333',
    image: 'https://images.unsplash.com/photo-1517935706615-2717063c2225?w=400',
  },
  {
    id: 8,
    country: 'Belgium',
    city: 'Baghdad',
    capital: 'Brussels',
    address: '15 Avenue de l\'Europe, Baghdad',
    contact: '+964 770 444 5555',
    image: 'https://images.unsplash.com/photo-1559564484-e48bf0d43468?w=400',
  },
  {
    id: 9,
    country: 'Netherlands',
    city: 'Erbil',
    capital: 'Amsterdam',
    address: '5 Canal Street, Erbil',
    contact: '+964 750 888 9999',
    image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400',
  },
];

export default function ConsulateScreen() {
  const { theme } = useTheme();

  const groupedByCity = CONSULATES.reduce((acc, consulate) => {
    if (!acc[consulate.city]) {
      acc[consulate.city] = [];
    }
    acc[consulate.city].push(consulate);
    return acc;
  }, {} as Record<string, Consulate[]>);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {i18n.t('consulateInfo')}
          </Text>
        </View>

        {Object.entries(groupedByCity).map(([city, cityConsulates]) => (
          <View key={city} style={styles.citySection}>
            <Text style={[styles.cityTitle, { color: theme.colors.text }]}>{city}</Text>
            <View style={styles.grid}>
              {cityConsulates.map((consulate) => (
                <View
                  key={consulate.id}
                  style={[styles.card, { backgroundColor: theme.colors.card }]}
                >
                  <Image
                    source={{ uri: consulate.image }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                      {consulate.country} Consulate
                    </Text>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                        {i18n.t('city')}:
                      </Text>
                      <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                        {consulate.city}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                        {i18n.t('capital')}:
                      </Text>
                      <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                        {consulate.capital}
                      </Text>
                    </View>
                    <Text style={[styles.cardAddress, { color: theme.colors.textSecondary }]}>
                      {consulate.address}
                    </Text>
                    <Text style={[styles.cardContact, { color: '#60A5FA' }]}>
                      {consulate.contact}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
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
  },
  citySection: {
    marginTop: 24,
  },
  cityTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  grid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 200,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row' as const,
    marginBottom: 6,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  cardAddress: {
    fontSize: 13,
    marginTop: 8,
  },
  cardContact: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500' as const,
  },
});
