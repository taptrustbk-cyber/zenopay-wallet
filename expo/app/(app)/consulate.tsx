import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import i18n, { getCurrentLanguage } from '@/lib/i18n';

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
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  },
  {
    id: 2,
    country: 'Germany',
    city: 'Erbil',
    capital: 'Berlin',
    address: '45 Avenue, Erbil',
    contact: '+964 750 987 6543',
    image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80',
  },
  {
    id: 3,
    country: 'Italy',
    city: 'Baghdad',
    capital: 'Rome',
    address: '12 Main Street, Baghdad',
    contact: '+964 770 555 1234',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80',
  },
  {
    id: 4,
    country: 'Spain',
    city: 'Baghdad',
    capital: 'Madrid',
    address: '77 Avenue, Baghdad',
    contact: '+964 770 111 2233',
    image: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800&q=80',
  },
  {
    id: 5,
    country: 'UK',
    city: 'Erbil',
    capital: 'London',
    address: '1 King Street, Erbil',
    contact: '+964 750 444 5566',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80',
  },
  {
    id: 6,
    country: 'USA',
    city: 'Baghdad',
    capital: 'Washington D.C.',
    address: '1600 Embassy Road, Baghdad',
    contact: '+964 770 999 8888',
    image: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=800&q=80',
  },
  {
    id: 7,
    country: 'Canada',
    city: 'Erbil',
    capital: 'Ottawa',
    address: '12 Maple Street, Erbil',
    contact: '+964 750 222 3333',
    image: 'https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&q=80',
  },
  {
    id: 8,
    country: 'Belgium',
    city: 'Baghdad',
    capital: 'Brussels',
    address: "15 Avenue de l'Europe, Baghdad",
    contact: '+964 770 444 5555',
    image: 'https://images.unsplash.com/photo-1559113202-c916b8e44373?w=800&q=80',
  },
  {
    id: 9,
    country: 'Netherlands',
    city: 'Erbil',
    capital: 'Amsterdam',
    address: '5 Canal Street, Erbil',
    contact: '+964 750 888 9999',
    image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&q=80',
  },
];

const UI = {
  bg: '#F4F8FF',
  card: '#FFFFFF',
  cardSoft: '#F4F7FB',
  text: '#0F1B33',
  textSecondary: '#5B6B82',
  border: '#D9E6FF',
  blue: '#0F2A5C',
  blueDark: '#0A1F45',
  blueSoft: '#DBEAFE',
  blueSoft2: '#EFF6FF',
  white: '#FFFFFF',
  shadow: '#0A1F45',
};

const COUNTRY_TRANSLATIONS: Record<string, Record<string, string>> = {
  France: { en: 'France', ar: 'فرنسا', ckb: 'فەرەنسا', kmr: 'فەرەنسا' },
  Germany: { en: 'Germany', ar: 'ألمانيا', ckb: 'ئەڵمانیا', kmr: 'ئەڵمانیا' },
  Italy: { en: 'Italy', ar: 'إيطاليا', ckb: 'ئیتالیا', kmr: 'ئیتالیا' },
  Spain: { en: 'Spain', ar: 'إسبانيا', ckb: 'ئیسپانیا', kmr: 'ئیسپانیا' },
  UK: { en: 'United Kingdom', ar: 'المملكة المتحدة', ckb: 'شانشینی یەکگرتوو', kmr: 'شانشینی یەکگرتوو' },
  USA: { en: 'United States', ar: 'الولايات المتحدة', ckb: 'ئەمریکا', kmr: 'ئەمریکا' },
  Canada: { en: 'Canada', ar: 'كندا', ckb: 'کەنەدا', kmr: 'کەنەدا' },
  Belgium: { en: 'Belgium', ar: 'بلجيكا', ckb: 'بەلجیکا', kmr: 'بەلجیکا' },
  Netherlands: { en: 'Netherlands', ar: 'هولندا', ckb: 'هۆڵەندا', kmr: 'هۆڵەندا' },
};

const CITY_TRANSLATIONS: Record<string, Record<string, string>> = {
  Erbil: { en: 'Erbil', ar: 'أربيل', ckb: 'هەولێر', kmr: 'هەولێر' },
  Baghdad: { en: 'Baghdad', ar: 'بغداد', ckb: 'بەغدا', kmr: 'بەغدا' },
};

const CAPITAL_TRANSLATIONS: Record<string, Record<string, string>> = {
  Paris: { en: 'Paris', ar: 'باريس', ckb: 'پاریس', kmr: 'پاریس' },
  Berlin: { en: 'Berlin', ar: 'برلين', ckb: 'بەرلین', kmr: 'بەرلین' },
  Rome: { en: 'Rome', ar: 'روما', ckb: 'ڕۆم', kmr: 'ڕۆم' },
  Madrid: { en: 'Madrid', ar: 'مدريد', ckb: 'مەدرید', kmr: 'مەدرید' },
  London: { en: 'London', ar: 'لندن', ckb: 'لەندەن', kmr: 'لەندەن' },
  'Washington D.C.': { en: 'Washington D.C.', ar: 'واشنطن', ckb: 'واشنتن', kmr: 'واشنتن' },
  Ottawa: { en: 'Ottawa', ar: 'أوتاوا', ckb: 'ئۆتاوا', kmr: 'ئۆتاوا' },
  Brussels: { en: 'Brussels', ar: 'بروكسل', ckb: 'بروکسل', kmr: 'بروکسل' },
  Amsterdam: { en: 'Amsterdam', ar: 'أمستردام', ckb: 'ئەمستەردام', kmr: 'ئەمستەردام' },
};

function tSafe(key: string, fallback: string) {
  try {
    const value = i18n.t(key as any);

    if (
      value === null ||
      value === undefined ||
      typeof value === 'object' ||
      String(value).trim() === '' ||
      String(value) === key ||
      String(value).includes('[missing')
    ) {
      return fallback;
    }

    return String(value);
  } catch {
    return fallback;
  }
}

function getLocalizedValue(
  map: Record<string, Record<string, string>>,
  key: string,
  lang: string
) {
  const normalizedLang = lang === 'cbk' ? 'ckb' : lang;
  return map[key]?.[normalizedLang] || map[key]?.en || key;
}

export default function ConsulateScreen() {
  useTheme();
  const router = useRouter();
  const currentLang = getCurrentLanguage?.() || 'en';

  const groupedByCity = CONSULATES.reduce((acc, consulate) => {
    if (!acc[consulate.city]) acc[consulate.city] = [];
    acc[consulate.city].push(consulate);
    return acc;
  }, {} as Record<string, Consulate[]>);

  const titleText = tSafe('consulateInfo.title', 'Consulate Info');
  const cityText = tSafe('consulateInfo.city', 'City');
  const capitalText = tSafe('consulateInfo.capital', 'Capital');
  const addressText = tSafe('consulateInfo.address', 'Address');
  const contactText = tSafe('consulateInfo.contact', 'Contact');
  const consulateText = tSafe('consulateInfo.consulate', 'Consulate');
  const directoryTitleText = tSafe(
    'consulateInfo.directoryTitle',
    'Embassy & Consulate Directory'
  );
  const directorySubtitleText = tSafe(
    'consulateInfo.directorySubtitle',
    'Find quick contact details, capital city, and address information for consulates available in Iraq.'
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={UI.bg} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.86}
          style={styles.headerBackBtn}
        >
          <Ionicons name="arrow-back" size={20} color={UI.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{titleText}</Text>
          <Text style={styles.headerSubtitle}>
            {cityText} & {capitalText}
          </Text>
        </View>

        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Ionicons name="business-outline" size={18} color={UI.blueDark} />
            <Text style={styles.heroBadgeText}>{titleText}</Text>
          </View>

          <Text style={styles.heroTitle}>{directoryTitleText}</Text>

          <Text style={styles.heroText}>{directorySubtitleText}</Text>
        </View>

        {Object.entries(groupedByCity).map(([city, cityConsulates]) => (
          <View key={city} style={styles.citySection}>
            <View style={styles.cityHeader}>
              <View style={styles.cityHeaderLeft}>
                <View style={styles.cityDot} />
                <Text style={styles.cityTitle}>
                  {getLocalizedValue(CITY_TRANSLATIONS, city, currentLang)}
                </Text>
              </View>

              <View style={styles.cityCountBadge}>
                <Text style={styles.cityCountText}>{cityConsulates.length}</Text>
              </View>
            </View>

            <View style={styles.grid}>
              {cityConsulates.map((consulate) => {
                const localizedCountry = getLocalizedValue(
                  COUNTRY_TRANSLATIONS,
                  consulate.country,
                  currentLang
                );

                const localizedCity = getLocalizedValue(
                  CITY_TRANSLATIONS,
                  consulate.city,
                  currentLang
                );

                const localizedCapital = getLocalizedValue(
                  CAPITAL_TRANSLATIONS,
                  consulate.capital,
                  currentLang
                );

                return (
                  <View key={consulate.id} style={styles.card}>
                    <View style={styles.imageWrap}>
                      <Image
                        source={{ uri: consulate.image }}
                        style={styles.image}
                        resizeMode="cover"
                      />

                      <View style={styles.imageOverlay} />

                      <View style={styles.countryPill}>
                        <Text style={styles.countryPillText}>{localizedCountry}</Text>
                      </View>
                    </View>

                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>
                        {localizedCountry} {consulateText}
                      </Text>

                      <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                          <View style={styles.infoIconBox}>
                            <Ionicons name="location-outline" size={15} color={UI.blueDark} />
                          </View>
                          <View style={styles.infoTextWrap}>
                            <Text style={styles.infoLabel}>{cityText}</Text>
                            <Text style={styles.infoValue}>{localizedCity}</Text>
                          </View>
                        </View>

                        <View style={styles.infoDivider} />

                        <View style={styles.infoRow}>
                          <View style={styles.infoIconBox}>
                            <Ionicons name="flag-outline" size={15} color={UI.blueDark} />
                          </View>
                          <View style={styles.infoTextWrap}>
                            <Text style={styles.infoLabel}>{capitalText}</Text>
                            <Text style={styles.infoValue}>{localizedCapital}</Text>
                          </View>
                        </View>

                        <View style={styles.infoDivider} />

                        <View style={styles.infoRow}>
                          <View style={styles.infoIconBox}>
                            <Ionicons name="navigate-outline" size={15} color={UI.blueDark} />
                          </View>
                          <View style={styles.infoTextWrap}>
                            <Text style={styles.infoLabel}>{addressText}</Text>
                            <Text style={styles.infoValueAddress}>{consulate.address}</Text>
                          </View>
                        </View>

                        <View style={styles.infoDivider} />

                        <View style={styles.infoRow}>
                          <View style={styles.infoIconBox}>
                            <Ionicons name="call-outline" size={15} color={UI.blueDark} />
                          </View>
                          <View style={styles.infoTextWrap}>
                            <Text style={styles.infoLabel}>{contactText}</Text>
                            <Text style={styles.infoValuePhone}>{consulate.contact}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View style={{ height: 16 }} />
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
    paddingTop: 4,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  headerBackBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: UI.blue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: UI.text,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.textSecondary,
    marginTop: 2,
  },
  headerRightSpacer: {
    width: 42,
    height: 42,
  },

  scrollContent: {
    paddingBottom: 22,
  },

  heroCard: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: UI.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 12,
  },
  heroBadgeText: {
    marginLeft: 6,
    color: UI.blueDark,
    fontSize: 12,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 8,
  },
  heroText: {
    fontSize: 13,
    lineHeight: 20,
    color: UI.textSecondary,
    fontWeight: '600',
  },

  citySection: {
    marginTop: 20,
  },
  cityHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: UI.blue,
    marginRight: 8,
  },
  cityTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
  },
  cityCountBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 99,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cityCountText: {
    fontSize: 12,
    fontWeight: '900',
    color: UI.blueDark,
  },

  grid: {
    paddingHorizontal: 16,
  },

  card: {
    backgroundColor: UI.card,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
    marginBottom: 16,
  },

  imageWrap: {
    position: 'relative',
    width: '100%',
    height: 210,
    backgroundColor: UI.blueSoft2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(29,78,216,0.12)',
  },
  countryPill: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  countryPillText: {
    fontSize: 12,
    fontWeight: '900',
    color: UI.blueDark,
  },

  cardContent: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 12,
  },

  infoCard: {
    backgroundColor: UI.cardSoft,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: UI.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: UI.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: UI.textSecondary,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '800',
    color: UI.text,
  },
  infoValueAddress: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: UI.text,
  },
  infoValuePhone: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.blueDark,
  },
  infoDivider: {
    height: 1,
    backgroundColor: UI.border,
    marginVertical: 8,
  },
});