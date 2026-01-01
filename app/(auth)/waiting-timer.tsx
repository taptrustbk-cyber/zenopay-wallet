import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import i18n, { getCurrentLanguage } from '@/lib/i18n';

export default function WaitingTimerScreen() {
  const { user, profile, signOut, hardRefresh } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const toEasternArabic = (num: number): string => {
    const locale = getCurrentLanguage();
    if (locale === 'ar' || locale === 'ckb') {
      return num.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
    }
    return num.toString();
  };

  const formatTime = useCallback((hours: number, minutes: number, seconds: number): string => {
    const locale = getCurrentLanguage();
    const h = toEasternArabic(hours);
    const m = toEasternArabic(minutes);
    const s = toEasternArabic(seconds);

    if (locale === 'ar' || locale === 'ckb') {
      if (hours > 0) {
        return `${h}${i18n.t('hours')} ${m}${i18n.t('minutes')} ${s}${i18n.t('seconds')}`;
      } else if (minutes > 0) {
        return `${m} ${i18n.t('minute')}`;
      } else {
        return `${s} ${i18n.t('second')}`;
      }
    } else {
      if (hours > 0) {
        return `${hours}${i18n.t('hours')} ${minutes}${i18n.t('minutes')} ${seconds}${i18n.t('seconds')}`;
      } else if (minutes > 0) {
        return `${minutes}${i18n.t('minutes')} ${seconds}${i18n.t('seconds')}`;
      } else {
        return `${seconds}${i18n.t('seconds')}`;
      }
    }
  }, []);
  const [canActivate, setCanActivate] = useState(false);
  const [, forceUpdate] = useState({});

  useFocusEffect(
    useCallback(() => {
      forceUpdate({});
    }, [])
  );

  const getRemainingTime = useCallback(() => {
    if (!profile) return null;
    if (profile.force_active) return null;

    const pendingUntilIso = profile.approval_pending_until;
    if (pendingUntilIso) {
      const unlockAt = new Date(pendingUntilIso).getTime();
      const diff = unlockAt - Date.now();
      console.log('⏳ WaitingTimer: using approval_pending_until', {
        pendingUntilIso,
        diffMs: diff,
      });
      if (diff <= 0) return null;
      return diff;
    }

    const startAtIso = profile.approved_at ?? profile.created_at;
    const startAt = new Date(startAtIso).getTime();
    const waitTimeMinutes = profile.wait_time_minutes ?? 120;
    const unlockAt = startAt + waitTimeMinutes * 60 * 1000;
    const diff = unlockAt - Date.now();
    console.log('⏳ WaitingTimer: using fallback approved_at/created_at + wait_time_minutes', {
      startAtIso,
      waitTimeMinutes,
      diffMs: diff,
    });

    if (diff <= 0) return null;

    return diff;
  }, [profile]);

  useEffect(() => {
    if (!profile || !user) return;

    const updateTimer = () => {
      const remainingMs = getRemainingTime();

      if (remainingMs === null || remainingMs <= 0) {
        console.log('⏰ Time elapsed, ready to activate');
        setCanActivate(true);
        setTimeLeft(i18n.t('readyToActivate'));
        return;
      }

      setCanActivate(false);
      const totalSeconds = Math.floor(remainingMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft(formatTime(hours, minutes, seconds));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [profile, user, getRemainingTime, formatTime]);



  const handleActivateAccount = async () => {
    if (!user || !canActivate) return;
    
    setChecking(true);
    try {
      console.log('🔄 Approving KYC...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'approved'
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      console.log('✅ Account activated, KYC approved');
      await hardRefresh();
      
      console.log('📍 Navigating to dashboard...');
      setTimeout(() => {
        router.replace('/(app)/dashboard' as any);
      }, 100);
    } catch (error) {
      console.error('❌ Error activating account:', error);
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
          <View style={styles.iconContainer}>
            {canActivate ? (
              <CheckCircle size={80} color="#10B981" strokeWidth={1.5} />
            ) : (
              <Clock size={80} color="#3B82F6" strokeWidth={1.5} />
            )}
          </View>

          <Text style={styles.title}>
            {canActivate ? i18n.t('accountReady') : i18n.t('accountApproved')}
          </Text>
          <Text style={styles.subtitle}>
            {canActivate
              ? i18n.t('accountReadyDesc')
              : i18n.t('waitingActivation')}
          </Text>

          <View style={styles.timerCard}>
            {canActivate ? (
              <CheckCircle size={48} color="#10B981" strokeWidth={2} />
            ) : (
              <Clock size={32} color="#3B82F6" />
            )}
            <Text style={styles.timerLabel}>
              {canActivate ? i18n.t('readyToActivate') : i18n.t('timeRemaining')}
            </Text>
            <Text style={[styles.timerValue, canActivate && styles.timerValueReady]}>
              {canActivate ? i18n.t('readyWait') : timeLeft}
            </Text>
          </View>

          {!canActivate && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {i18n.t('kycApprovedInfo')}
              </Text>
              <Text style={styles.infoText}>
                {i18n.t('securityWaitInfo')}
              </Text>
              <Text style={styles.infoText}>
                {i18n.t('fullAccessInfo')}
              </Text>
            </View>
          )}

          {canActivate && (
            <View style={styles.readyInfoBox}>
              <Text style={styles.readyInfoText}>
                {i18n.t('clickToLogin')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            testID="waiting-timer-zenopay"
            style={[
              styles.activateButton,
              !canActivate && styles.activateButtonDisabled,
            ]}
            onPress={handleActivateAccount}
            disabled={checking || !canActivate}
          >
            {checking ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.activateButtonText}>
                {canActivate ? 'Zenopay' : i18n.t('pleaseWait')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity testID="waiting-timer-signout" style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutText}>{i18n.t('signOut')}</Text>
          </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 60,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    padding: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center' as const,
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  timerCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    width: '100%',
  },
  timerLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600' as const,
  },
  timerValue: {
    fontSize: 36,
    fontWeight: 'bold' as const,
    color: '#3B82F6',
  },
  timerValueReady: {
    color: '#10B981',
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  readyInfoBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  readyInfoText: {
    fontSize: 16,
    color: '#10B981',
    lineHeight: 24,
    textAlign: 'center' as const,
    fontWeight: '600' as const,
  },
  activateButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  activateButtonDisabled: {
    backgroundColor: '#64748B',
    opacity: 0.6,
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  signOutButton: {
    paddingVertical: 12,
  },
  signOutText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
