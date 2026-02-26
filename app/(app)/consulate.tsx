import React from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
    address: "15 Avenue de l'Europe, Baghdad",
    contact: '+964 770 444 5555',
    image: 'https://images.unsplash.com/photo-1559113202-c916b8e44373?w=400&q=80',
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

const UI = {
  bg: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  green: '#16A34A',
  greenDark: '#15803D',
};

export default function ConsulateScreen() {
  // Keeping your theme hook (even if we use a fixed white design)
  useTheme();
  const router = useRouter();

  const groupedByCity = CONSULATES.reduce((acc, consulate) => {
    if (!acc[consulate.city]) acc[consulate.city] = [];
    acc[consulate.city].push(consulate);
    return acc;
  }, {} as Record<string, Consulate[]>);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* New Header (white bg, black title, green back button) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.85}
          style={styles.headerBackBtn}
        >
          <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{i18n.t('consulateInfo')}</Text>

        {/* Spacer to keep title centered */}
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {Object.entries(groupedByCity).map(([city, cityConsulates]) => (
          <View key={city} style={styles.citySection}>
            <Text style={styles.cityTitle}>{city}</Text>

            <View style={styles.grid}>
              {cityConsulates.map((consulate) => (
                <View key={consulate.id} style={styles.card}>
                  <Image source={{ uri: consulate.image }} style={styles.image} resizeMode="cover" />

                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>
                      {consulate.country} {i18n.t('consulate')}
                    </Text>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{i18n.t('city')}:</Text>
                      <Text style={styles.infoValue}>{consulate.city}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{i18n.t('capital')}:</Text>
                      <Text style={styles.infoValue}>{consulate.capital}</Text>
                    </View>

                    <Text style={styles.cardAddress}>{consulate.address}</Text>
                    <Text style={styles.cardContact}>{consulate.contact}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Removed: Back to Dashboard bottom button */}
        <View style={{ height: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    backgroundColor: UI.bg,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: UI.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: UI.text,
  },
  headerRightSpacer: {
    width: 38,
    height: 38,
  },

  scrollContent: {
    paddingBottom: 18,
  },

  citySection: {
    marginTop: 18,
  },
  cityTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: UI.text,
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  grid: {
    paddingHorizontal: 16,
    gap: 14,
  },

  card: {
    backgroundColor: UI.bg,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 14,
  },
  image: {
    width: '100%',
    height: 190,
    backgroundColor: UI.border,
  },
  cardContent: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: UI.text,
    marginBottom: 10,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.text,
  },

  cardAddress: {
    fontSize: 13,
    color: UI.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  cardContact: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '800',
    color: UI.greenDark,
  },
});
