import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext'; // keep (not breaking)
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CryptoType } from '@/lib/types';
import * as ImagePicker from 'expo-image-picker';
import i18n from '@/lib/i18n';
import * as Clipboard from 'expo-clipboard';

const UI = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  text: '#111827',
  text2: '#6B7280',
  border: '#E5E7EB',
  green: '#47B08A',
  greenSoft: '#EAF7F1',
};

const CRYPTO_ADDRESSES: Record<string, string> = {
  BTC: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  USDT_TRC20: 'TX5rcy8dZJ259igNNebcyyaVn7hWLkjxzY',
  XRP: 'rN7n7otQDd6FczFgLdlqtyMVrn3HMgk5j',
  DOGE: 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L',
  ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
};

const USDT_QR =
  'https://wzjnwgygmiznavrdgppo.supabase.co/storage/v1/object/public/qr/usdt-qrcode.png';

export default function DepositScreen() {
  // ✅ hide default header (removes dark-blue top bar)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const header = <Stack.Screen options={{ headerShown: false }} />;

  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme(); // keep (not used for colors now)

  const [amount, setAmount] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert(i18n.t('success'), i18n.t('done'));
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        setScreenshot(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert(i18n.t('error'), 'Failed to pick image. Please try again.');
      console.error('Image picker error:', error);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found');

      if (!amount.trim() || !selectedCrypto || !transactionId.trim()) {
        throw new Error(i18n.t('fillAllFields'));
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error(i18n.t('invalidAmount'));
      }

      const { error } = await supabase.from('deposit_orders').insert({
        user_id: user.id,
        amount: amountNum,
        crypto_type: selectedCrypto,
        transaction_id: transactionId.trim(),
        screenshot_url: screenshot,
        status: 'pending',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setOrderSubmitted(true);
      setAmount('');
      setTransactionId('');
      setScreenshot(null);
      setSelectedCrypto(null);
    },
    onError: (error: any) => {
      Alert.alert(i18n.t('error'), error?.message || 'Failed to submit order');
    },
  });

  // ✅ Success view (same white + green style)
  if (orderSubmitted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.successWrap}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={46} color={UI.green} />
            <Text style={styles.successTitle}>{i18n.t('orderSubmitted')}</Text>
            <Text style={styles.successText}>{i18n.t('depositSuccessMessage')}</Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setOrderSubmitted(false)} activeOpacity={0.9}>
              <Text style={styles.primaryBtnText}>{i18n.t('done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const selectedAddress = selectedCrypto ? CRYPTO_ADDRESSES[selectedCrypto] : '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: UI.bg }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* ✅ Custom header (only one) */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={22} color={UI.text} />
            <Text style={styles.headerBack}>{i18n.t('back')}</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{i18n.t('deposit')}</Text>

          <View style={{ width: 70 }} />
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          <Text style={styles.title}>{i18n.t('depositMoney')}</Text>

          <Text style={styles.label}>{i18n.t('amount')} (USD)</Text>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('enterAmount')}
            placeholderTextColor={UI.text2}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>{i18n.t('selectPaymentMethod')}</Text>

          {/* Only USDT TRC20 (clean button) */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedCrypto('USDT_TRC20' as CryptoType)}
            style={[
              styles.cryptoBtn,
              selectedCrypto === ('USDT_TRC20' as CryptoType) && styles.cryptoBtnActive,
            ]}
          >
            <View style={styles.cryptoLeft}>
              <View style={styles.cryptoIconCircle}>
                <Ionicons name="card" size={18} color={UI.green} />
              </View>
              <Text style={[styles.cryptoBtnText, selectedCrypto && styles.cryptoBtnTextActive]}>
                USDT TRC20
              </Text>
            </View>
            {selectedCrypto === ('USDT_TRC20' as CryptoType) ? (
              <Ionicons name="checkmark-circle" size={20} color={UI.green} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={UI.text2} />
            )}
          </TouchableOpacity>

          {selectedCrypto && (
            <>
              {/* Address + QR */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{i18n.t('sendToAddress')}</Text>

                <View style={styles.qrBox}>
                  <Image source={{ uri: USDT_QR }} style={{ width: 220, height: 220 }} resizeMode="contain" />
                </View>

                <TouchableOpacity
                  style={styles.addressBox}
                  onPress={() => copyToClipboard(selectedAddress)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.addressText} numberOfLines={2}>
                    {selectedAddress}
                  </Text>
                  <View style={styles.copyRow}>
                    <Ionicons name="copy" size={16} color={UI.green} />
                    <Text style={styles.copyText}>Copy</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>{i18n.t('transactionID')}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('enterTransactionID')}
                placeholderTextColor={UI.text2}
                value={transactionId}
                onChangeText={setTransactionId}
              />

              <Text style={styles.label}>{i18n.t('uploadScreenshot')}</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} activeOpacity={0.9}>
                <Ionicons name="cloud-upload" size={20} color={UI.green} />
                <Text style={styles.uploadText}>
                  {screenshot ? i18n.t('screenshotSelected') : i18n.t('chooseScreenshot')}
                </Text>
              </TouchableOpacity>

              {screenshot ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: screenshot }} style={styles.previewImg} resizeMode="cover" />
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.primaryBtn, submitMutation.isPending && { opacity: 0.7 }]}
                onPress={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                activeOpacity={0.9}
              >
                {submitMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  // ✅ use existing key to avoid: missing 'en.submitOrder'
                  <Text style={styles.primaryBtnText}>{i18n.t('submit')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={{ height: 70 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  scroll: {
    padding: 16,
    paddingTop: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  },

  // Card
  card: {
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
    marginBottom: 10,
  },

  label: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
    marginTop: 12,
    marginBottom: 8,
  },

  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    color: UI.text,
  },

  // Crypto button
  cryptoBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: '#F8FAFC',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cryptoBtnActive: {
    borderColor: 'rgba(71,176,138,0.55)',
    backgroundColor: 'rgba(71,176,138,0.08)',
  },
  cryptoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cryptoIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: UI.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cryptoBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
  },
  cryptoBtnTextActive: { color: UI.text },

  // Section
  section: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: UI.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: UI.text,
    textAlign: 'center',
    marginBottom: 12,
  },

  qrBox: {
    alignSelf: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
  },

  addressBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: '#F8FAFC',
    padding: 14,
    alignItems: 'center',
  },
  addressText: {
    fontSize: 12,
    fontWeight: '800',
    color: UI.text,
    textAlign: 'center',
  },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  copyText: { color: UI.green, fontWeight: '900', fontSize: 13 },

  uploadBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  uploadText: { color: UI.text, fontWeight: '900', fontSize: 14 },

  previewWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 12,
  },
  previewImg: { width: '100%', height: 170 },

  // Primary button (green)
  primaryBtn: {
    backgroundColor: UI.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },

  // Success
  successWrap: { flex: 1, justifyContent: 'center', padding: 16 },
  successCard: {
    backgroundColor: UI.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
  },
  successTitle: { marginTop: 10, fontSize: 18, fontWeight: '900', color: UI.text },
  successText: {
    marginTop: 8,
    marginBottom: 14,
    fontSize: 14,
    fontWeight: '700',
    color: UI.text2,
    textAlign: 'center',
    lineHeight: 20,
  },
});
