import { Stack } from 'expo-router';
import { ErrorBoundary } from 'react-error-boundary';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Shield } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={resetErrorBoundary}>
        <Text style={styles.retryText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

function KycPendingScreen() {
  const { signOut } = useAuth();
  
  return (
    <View style={styles.kycContainer}>
      <View style={styles.kycContent}>
        <View style={styles.kycIconContainer}>
          <Shield size={64} color="#F59E0B" strokeWidth={1.5} />
        </View>
        
        <Text style={styles.kycTitle}>{i18n.t('kycVerificationRequired')}</Text>
        <Text style={styles.kycSubtitle}>
          {i18n.t('kycPendingMessage')}
        </Text>
        
        <View style={styles.kycInfoBox}>
          <Clock size={20} color="#94A3B8" style={styles.kycInfoIcon} />
          <View style={styles.kycInfoContent}>
            <Text style={styles.kycInfoTitle}>{i18n.t('whatsNext')}</Text>
            <Text style={styles.kycInfoText}>
              {i18n.t('kycNextSteps')}
            </Text>
          </View>
        </View>
        
        <View style={styles.kycSecurityNote}>
          <Text style={styles.kycSecurityText}>
            {i18n.t('documentsSecure')}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.kycSignOutButton} onPress={signOut}>
          <Text style={styles.kycSignOutText}>{i18n.t('signOut')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { profile, loading } = useAuth();
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }
  
  if (profile && profile.kyc_status !== 'approved') {
    return <KycPendingScreen />;
  }
  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Stack
        screenOptions={{
          headerBackTitle: '',
          headerTitleAlign: 'center',
          headerTintColor: '#E2E8F0',
          headerStyle: {
            backgroundColor: '#0F172A',
          },
          headerTitleStyle: {
            color: '#E2E8F0',
            fontWeight: '700',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: '#0B1220',
          },
        }}
      >
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="kyc" options={{ title: 'KYC Verification' }} />
        <Stack.Screen 
          name="send" 
          options={({ navigation }) => ({
            title: i18n.t('sendMoney'),
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => navigation.navigate('dashboard')}
                style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8 }}
              >
                <Ionicons name="arrow-back" size={24} color="#E2E8F0" style={{ marginRight: 4 }} />
                <Text style={{ color: '#E2E8F0', fontSize: 16, fontWeight: '600' }}>{i18n.t('back')}</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen 
          name="receive" 
          options={({ navigation }) => ({
            title: i18n.t('deposit'),
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => navigation.navigate('dashboard')}
                style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8 }}
              >
                <Ionicons name="arrow-back" size={24} color="#E2E8F0" style={{ marginRight: 4 }} />
                <Text style={{ color: '#E2E8F0', fontSize: 16, fontWeight: '600' }}>{i18n.t('back')}</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen name="transactions" options={{ title: 'Transactions' }} />
        <Stack.Screen 
          name="withdraw" 
          options={({ navigation }) => ({
            title: i18n.t('withdraw'),
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => navigation.navigate('dashboard')}
                style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8 }}
              >
                <Ionicons name="arrow-back" size={24} color="#E2E8F0" style={{ marginRight: 4 }} />
                <Text style={{ color: '#E2E8F0', fontSize: 16, fontWeight: '600' }}>{i18n.t('back')}</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen 
          name="consulate" 
          options={({ navigation }) => ({
            title: i18n.t('consulateInfo'),
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => navigation.navigate('dashboard')}
                style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8 }}
              >
                <Ionicons name="arrow-back" size={24} color="#E2E8F0" style={{ marginRight: 4 }} />
                <Text style={{ color: '#E2E8F0', fontSize: 16, fontWeight: '600' }}>{i18n.t('back')}</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ title: 'Admin Panel' }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="terms-conditions" options={{ headerShown: false }} />
        <Stack.Screen name="security" options={{ headerShown: false }} />
        <Stack.Screen name="crypto" options={{ headerShown: false }} />
      </Stack>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0F172A',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#60A5FA',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  kycContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  kycContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kycIconContainer: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  kycTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  kycSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center' as const,
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  kycInfoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    width: '100%',
    alignItems: 'flex-start',
  },
  kycInfoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  kycInfoContent: {
    flex: 1,
  },
  kycInfoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  kycInfoText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
  },
  kycSecurityNote: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
  },
  kycSecurityText: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center' as const,
  },
  kycSignOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  kycSignOutText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
