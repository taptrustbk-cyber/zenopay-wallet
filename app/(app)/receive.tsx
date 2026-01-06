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
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CryptoType } from '@/lib/types';
import * as ImagePicker from 'expo-image-picker';
import { Upload, Copy } from 'lucide-react-native';
import i18n from '@/lib/i18n';
import * as Clipboard from 'expo-clipboard';

const CRYPTO_ADDRESSES = {
  BTC: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  USDT_TRC20: 'TQ4KL3FXUFyp291fwby6ZsVYRBw61Jv4dS',
  XRP: 'rN7n7otQDd6FczFgLdlqtyMVrn3HMgk5j',
  DOGE: 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L',
  ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
};

const CRYPTO_QR_CODES = {
  BTC: 'https://r2-pub.rork.com/generated-images/901e157a-1f2a-4dc8-911d-27f561da8b75.png',
  USDT_TRC20: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/1sxbyc8zfez7z91thstuh',
  XRP: 'https://r2-pub.rork.com/generated-images/5ed43514-fde5-4a68-a84e-69807286b836.png',
  DOGE: 'https://r2-pub.rork.com/generated-images/1d4b41e2-175d-4285-9558-cfbcd6397459.png',
  ETH: 'https://r2-pub.rork.com/generated-images/b45cda94-31a9-440a-9c55-96730ad218aa.png',
};

export default function DepositScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [amount, setAmount] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Success copied');
  };

  const QRCode = ({ crypto, size = 200 }: { crypto: CryptoType; size?: number }) => {
    const qrCodeUrl = CRYPTO_QR_CODES[crypto];
    
    return (
      <View style={styles.qrContainer}>
        <Image
          source={{ uri: qrCodeUrl }}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </View>
    );
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
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      console.error('Image picker error:', error);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!amount || !selectedCrypto || !transactionId) {
        throw new Error('Please fill all required fields');
      }

      const { error } = await supabase.from('deposit_orders').insert({
        user_id: user!.id,
        amount: parseFloat(amount),
        crypto_type: selectedCrypto,
        transaction_id: transactionId,
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
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
    },
  });

  if (orderSubmitted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
        <View style={styles.successContainer}>
          <View style={[styles.successCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.successTitle, { color: theme.colors.success }]}>{i18n.t('orderSubmitted')}</Text>
            <Text style={[styles.successText, { color: theme.colors.textSecondary }]}>
              {i18n.t('depositSuccessMessage')}
            </Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setOrderSubmitted(false)}
            >
              <Text style={styles.doneButtonText}>{i18n.t('done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{i18n.t('depositMoney')}</Text>

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{i18n.t('amount')} (USD)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.cardSecondary, color: theme.colors.text }]}
            placeholder={i18n.t('enterAmount')}
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{i18n.t('selectPaymentMethod')}</Text>
          <View style={styles.cryptoGrid}>
            {(['USDT_TRC20'] as CryptoType[]).map((crypto) => (
              <TouchableOpacity
                key={crypto}
                style={[
                  styles.cryptoButton,
                  { backgroundColor: theme.colors.cardSecondary, borderColor: 'transparent' },
                  selectedCrypto === crypto && [styles.cryptoButtonActive, { borderColor: theme.colors.primary, backgroundColor: theme.colors.card }],
                ]}
                onPress={() => setSelectedCrypto(crypto)}
              >
                <Text
                  style={[
                    styles.cryptoText,
                    { color: theme.colors.textSecondary },
                    selectedCrypto === crypto && [styles.cryptoTextActive, { color: theme.colors.primary }],
                  ]}
                >
                  {crypto.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedCrypto && (
            <>
              <View style={styles.addressSection}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{i18n.t('sendToAddress')}</Text>
                <QRCode crypto={selectedCrypto} size={200} />
                <TouchableOpacity
                  style={[styles.addressBox, { backgroundColor: theme.colors.cardSecondary }]}
                  onPress={() => copyToClipboard(CRYPTO_ADDRESSES[selectedCrypto])}
                >
                  <Text style={[styles.addressText, { color: theme.colors.primary }]}>
                    {CRYPTO_ADDRESSES[selectedCrypto]}
                  </Text>
                  <Copy size={16} color={theme.colors.primary} style={{ marginTop: 8 }} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{i18n.t('transactionID')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.cardSecondary, color: theme.colors.text }]}
                placeholder={i18n.t('enterTransactionID')}
                placeholderTextColor={theme.colors.textSecondary}
                value={transactionId}
                onChangeText={setTransactionId}
              />

              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{i18n.t('uploadScreenshot')}</Text>
              <TouchableOpacity style={[styles.uploadButton, { backgroundColor: theme.colors.cardSecondary }]} onPress={pickImage}>
                <Upload size={20} color={theme.colors.primary} />
                <Text style={[styles.uploadText, { color: theme.colors.primary }]}>
                  {screenshot ? i18n.t('screenshotSelected') : i18n.t('chooseScreenshot')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>{i18n.t('submitOrder')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    marginBottom: 24,
    textAlign: 'center' as const,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  cryptoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  cryptoButton: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  cryptoButtonActive: {},
  cryptoText: {
    fontWeight: '600' as const,
    fontSize: 14,
  },
  cryptoTextActive: {},
  addressSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
  },
  addressBox: {
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 12,
    textAlign: 'center' as const,
  },
  uploadButton: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  successCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    textAlign: 'center' as const,
    lineHeight: 24,
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
