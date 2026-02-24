import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
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

interface GiftCard {
  id: string;
  name: string;
  icon: string;
  color: string;
  values: number[];
}

const giftCards: GiftCard[] = [
  { id: '1', name: 'iTunes', icon: 'logo-apple', color: '#000000', values: [5, 10, 50, 100] },
  { id: '2', name: 'Google Play', icon: 'logo-google', color: '#4285F4', values: [5, 10, 50, 100] },
  { id: '3', name: 'Steam', icon: 'game-controller', color: '#1B2838', values: [5, 10, 50, 100] },
  { id: '4', name: 'PlayStation', icon: 'logo-playstation', color: '#003087', values: [5, 10, 50, 100] },
  { id: '5', name: 'Amazon', icon: 'logo-amazon', color: '#FF9900', values: [5, 10, 50, 100] },
  { id: '6', name: 'Netflix', icon: 'film', color: '#E50914', values: [5, 10, 50, 100] },
  { id: '7', name: 'Spotify', icon: 'musical-notes', color: '#1DB954', values: [5, 10, 50, 100] },
  { id: '8', name: 'Xbox', icon: 'logo-xbox', color: '#107C10', values: [5, 10, 50, 100] },
  { id: '9', name: 'PUBG UC', icon: 'game-controller', color: '#F8B825', values: [5, 10, 50, 100] },
  { id: '10', name: 'Free Fire', icon: 'flame', color: '#FF5F00', values: [5, 10, 50, 100] },
];

export default function GiftCardsScreen() {
  // ✅ hide default header (removes dark-blue top bar)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const header = <Stack.Screen options={{ headerShown: false }} />;

  const { theme } = useTheme(); // keep theme (not used for colors now)
  const router = useRouter();
  const [selectedCard, setSelectedCard] = React.useState<GiftCard | null>(null);

  const handleCardSelect = (card: GiftCard) => setSelectedCard(card);

  const handleValueSelect = (value: number) => {
    if (!selectedCard) return;

    router.push({
      pathname: '/(app)/buy-card' as any,
      params: {
        name: `${selectedCard.name} $${value}`,
        price: value.toString(),
        provider: selectedCard.name.toLowerCase().replace(' ', '_'),
        amount: value,
        type: 'gift',
      },
    });
  };

  const Header = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack} activeOpacity={0.85}>
        <Ionicons name="chevron-back" size={22} color={UI.text} />
        <Text style={styles.headerBack}>{i18n.t('back')}</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>

      <View style={{ width: 70 }} />
    </View>
  );

  if (selectedCard) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Header title={selectedCard.name} onBack={() => setSelectedCard(null)} />

          <View style={styles.previewCard}>
            <View style={[styles.previewIcon, { backgroundColor: `${selectedCard.color}14` }]}>
              <Ionicons name={selectedCard.icon as any} size={56} color={selectedCard.color} />
            </View>

            <Text style={styles.previewName}>{selectedCard.name}</Text>
            <Text style={styles.previewHint}>{i18n.t('selectValue')}</Text>
          </View>

          <View style={styles.valuesGrid}>
            {selectedCard.values.map((value) => (
              <TouchableOpacity
                key={value}
                style={styles.valueCard}
                onPress={() => handleValueSelect(value)}
                activeOpacity={0.9}
              >
                <Text style={styles.valueAmount}>${value}</Text>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => handleValueSelect(value)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.primaryBtnText}>{i18n.t('select')}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title={i18n.t('onlineGiftCards')} onBack={() => router.back()} />

        <Text style={styles.subtitle}>{i18n.t('selectGiftCard')}</Text>

        <View style={styles.grid}>
          {giftCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={styles.cardItem}
              onPress={() => handleCardSelect(card)}
              activeOpacity={0.9}
            >
              <View style={[styles.cardIconContainer, { backgroundColor: `${card.color}14` }]}>
                <Ionicons name={card.icon as any} size={36} color={card.color} />
              </View>

              <Text style={styles.cardName}>{card.name}</Text>
              <Text style={styles.cardValues}>
                ${card.values[0]} - ${card.values[card.values.length - 1]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },

  // Header (one only)
  header: {
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 90,
  },
  headerBack: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
    maxWidth: 220,
  },

  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.text2,
    textAlign: 'center',
    marginBottom: 14,
  },

  // Grid list
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardItem: {
    width: '48%',
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardValues: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.text2,
    textAlign: 'center',
  },

  // Selected preview
  previewCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  previewIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  previewName: {
    fontSize: 22,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 6,
  },
  previewHint: {
    fontSize: 13,
    fontWeight: '700',
    color: UI.text2,
  },

  // Values grid
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  valueCard: {
    width: '48%',
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    alignItems: 'center',
  },
  valueAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 12,
  },

  // Green button
  primaryBtn: {
    width: '100%',
    backgroundColor: UI.green,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});
