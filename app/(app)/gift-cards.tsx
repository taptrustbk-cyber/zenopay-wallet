import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import i18n from '@/lib/i18n';
import React from 'react';

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
  const { theme } = useTheme();
  const router = useRouter();
  const [selectedCard, setSelectedCard] = React.useState<GiftCard | null>(null);

  const handleCardSelect = (card: GiftCard) => {
    setSelectedCard(card);
  };

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

  if (selectedCard) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setSelectedCard(null)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                {selectedCard.name}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={[styles.selectedCardPreview, { backgroundColor: theme.colors.card }]}>
              <View style={[styles.selectedCardIcon, { backgroundColor: `${selectedCard.color}20` }]}>
                <Ionicons name={selectedCard.icon as any} size={60} color={selectedCard.color} />
              </View>
              <Text style={[styles.selectedCardName, { color: theme.colors.text }]}>
                {selectedCard.name}
              </Text>
              <Text style={[styles.selectValueText, { color: theme.colors.textSecondary }]}>
                {i18n.t('selectValue')}
              </Text>
            </View>

            <View style={styles.valuesGrid}>
              {selectedCard.values.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.valueCard, { backgroundColor: theme.colors.card }]}
                  onPress={() => handleValueSelect(value)}
                >
                  <Text style={[styles.valueAmount, { color: theme.colors.text }]}>
                    ${value}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.selectButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleValueSelect(value)}
                  >
                    <Text style={styles.selectButtonText}>{i18n.t('select')}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {i18n.t('onlineGiftCards')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {i18n.t('selectGiftCard')}
          </Text>

          <View style={styles.grid}>
            {giftCards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={[styles.cardItem, { backgroundColor: theme.colors.card }]}
                onPress={() => handleCardSelect(card)}
              >
                <View style={[styles.cardIconContainer, { backgroundColor: `${card.color}20` }]}>
                  <Ionicons name={card.icon as any} size={40} color={card.color} />
                </View>
                <Text style={[styles.cardName, { color: theme.colors.text }]}>
                  {card.name}
                </Text>
                <Text style={[styles.cardValues, { color: theme.colors.textSecondary }]}>
                  ${card.values[0]} - ${card.values[card.values.length - 1]}
                </Text>
              </TouchableOpacity>
            ))}
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
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardItem: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  cardValues: {
    fontSize: 12,
    textAlign: 'center' as const,
  },
  selectedCardPreview: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  selectedCardIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  selectedCardName: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  selectValueText: {
    fontSize: 14,
  },
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  valueCard: {
    width: '47%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  valueAmount: {
    fontSize: 32,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  selectButton: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
