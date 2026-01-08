import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import i18n from '@/lib/i18n';

interface SimCard {
  id: string;
  name: string;
  price: number;
  provider: string;
  amount: number;
  image: string;
}

const simCards: SimCard[] = [
  { 
    id: '1', 
    name: 'Korek 5,000 IQD', 
    price: 3.6, 
    provider: 'korek', 
    amount: 5000,
    image: 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=300&h=200&fit=crop'
  },
  { 
    id: '2', 
    name: 'Korek 10,000 IQD', 
    price: 7.6, 
    provider: 'korek', 
    amount: 10000,
    image: 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=300&h=200&fit=crop'
  },
  { 
    id: '3', 
    name: 'Korek 15,000 IQD', 
    price: 11.1, 
    provider: 'korek', 
    amount: 15000,
    image: 'https://images.unsplash.com/photo-606229365485-93a3b8ee0385?w=300&h=200&fit=crop'
  },
  { 
    id: '4', 
    name: 'FTTH 29,000 IQD', 
    price: 21, 
    provider: 'ftth', 
    amount: 29000,
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=300&h=200&fit=crop'
  },
  { 
    id: '5', 
    name: 'Zain 5,000 IQD', 
    price: 3.6, 
    provider: 'zain', 
    amount: 5000,
    image: 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=300&h=200&fit=crop'
  },
  { 
    id: '6', 
    name: 'Zain 10,000 IQD', 
    price: 7.6, 
    provider: 'zain', 
    amount: 10000,
    image: 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=300&h=200&fit=crop'
  },
  { 
    id: '7', 
    name: 'Asiacell 5,000 IQD', 
    price: 3.6, 
    provider: 'asiacell', 
    amount: 5000,
    image: 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=300&h=200&fit=crop'
  },
  { 
    id: '8', 
    name: 'Asiacell 10,000 IQD', 
    price: 7.6, 
    provider: 'asiacell', 
    amount: 10000,
    image: 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=300&h=200&fit=crop'
  },
];

export default function SimCardsScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const handleCardPress = (card: SimCard) => {
    router.push({
      pathname: '/(app)/buy-card' as any,
      params: {
        name: card.name,
        price: card.price.toString(),
        provider: card.provider,
        amount: card.amount.toString(),
        type: 'sim',
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                {i18n.t('internetSim')}
              </Text>
              <View style={{ width: 24 }} />
            </View>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {i18n.t('selectSimCard')}
            </Text>
          </View>

          <View style={styles.grid}>
            {simCards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={[styles.cardItem, { backgroundColor: theme.colors.card }]}
                onPress={() => handleCardPress(card)}
              >
                <View style={[styles.cardImageContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <MaterialIcons name="sim-card" size={48} color="#3B82F6" />
                </View>
                <Text style={[styles.cardName, { color: theme.colors.text }]}>
                  {card.name}
                </Text>
                <Text style={[styles.cardPrice, { color: theme.colors.primary }]}>
                  ${card.price.toFixed(2)}
                </Text>
                <TouchableOpacity 
                  style={[styles.buyButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handleCardPress(card)}
                >
                  <Text style={styles.buyButtonText}>{i18n.t('buyNow')}</Text>
                </TouchableOpacity>
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
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
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
  cardImageContainer: {
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
    marginBottom: 8,
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  buyButton: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  buyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
