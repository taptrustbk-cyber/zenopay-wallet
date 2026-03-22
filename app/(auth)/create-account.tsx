import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import React, { useMemo, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

export const options = {
  headerShown: false,
};

const COLORS = {
  bg: '#EEF4FF',
  page: '#F7FAFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#D9E5F6',
  inputBg: '#F8FBFF',
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueSoft: '#EAF2FF',
  blueSoft2: '#DCEBFF',
  white: '#FFFFFF',
  danger: '#DC2626',
  shadow: '#7DA8E6',
};

const SHADOWS = {
  card: {
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

const PENDING_PROFILE_KEY = 'zenopay_pending_profile_v1';

function isAtLeast18(dob: Date): boolean {
  const today = new Date();
  const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return dob <= eighteenYearsAgo;
}

function toISODateOnly(d: Date) {
  return d.toISOString().split('T')[0];
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function normalizeIraqPhoneToE164(input: string) {
  const raw = (input || '').trim().replace(/[^\d+]/g, '');
  if (!raw) return '';

  if (raw.startsWith('+964')) {
    const after = raw.replace('+', '');
    return `+${after.replace(/[^\d]/g, '')}`;
  }

  let digits = raw.replace(/[^\d]/g, '');
  while (digits.startsWith('0')) digits = digits.slice(1);

  if (digits.startsWith('964')) return `+${digits}`;
  return `+964${digits}`;
}

export default function CreateAccount() {
  const router = useRouter();

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [country, setCountry] = useState<string>('Iraq');
  const [phone, setPhone] = useState<string>('');
  const [dob, setDob] = useState<Date | null>(null);
  const [dobError, setDobError] = useState<string | null>(null);

  const minDate = useMemo(() => new Date(1940, 0, 1), []);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, []);

  const [openDob, setOpenDob] = useState<boolean>(false);
  const [tempDob, setTempDob] = useState<Date>(new Date(1995, 0, 1));
  const [isCreating, setIsCreating] = useState<boolean>(false);

  function handleDobChange(date: Date) {
    if (!isAtLeast18(date)) {
      setDob(null);
      setDobError(i18n.t('mustBe18'));
      return;
    }
    setDob(date);
    setDobError(null);
  }

  async function createAccount() {
    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCity = city.trim();
    const cleanCountry = country.trim() || 'Iraq';
    const cleanPassword = password;

    if (
      !cleanFullName ||
      !cleanEmail ||
      !cleanPassword ||
      !cleanCity ||
      !phone.trim() ||
      !cleanCountry
    ) {
      Alert.alert(i18n.t('error'), i18n.t('completeAllFields'));
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      Alert.alert(i18n.t('error'), i18n.t('invalidEmail') || 'Invalid email');
      return;
    }

    if (cleanPassword.length < 6) {
      Alert.alert(
        i18n.t('error'),
        i18n.t('passwordTooShort') || 'Password must be at least 6 characters'
      );
      return;
    }

    if (!dob) {
      Alert.alert(i18n.t('error'), i18n.t('pleaseSelectDOB'));
      return;
    }

    const age = Math.floor(
      (new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    if (age < 18) {
      Alert.alert(i18n.t('error'), i18n.t('mustBe18'));
      return;
    }

    const phoneE164 = normalizeIraqPhoneToE164(phone);
    if (!phoneE164 || phoneE164.length < 8) {
      Alert.alert(i18n.t('error'), i18n.t('invalidPhone') || 'Invalid phone number');
      return;
    }

    setIsCreating(true);

    try {
      const dobISO = toISODateOnly(dob);

      await AsyncStorage.setItem(
        PENDING_PROFILE_KEY,
        JSON.stringify({
          email: cleanEmail,
          full_name: cleanFullName,
          city: cleanCity,
          country: cleanCountry,
          phone: phoneE164,
          date_of_brith: dobISO,
          pending_profile_created_at: new Date().toISOString(),
        })
      );

      const emailRedirectTo = Linking.createURL('confirm');

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          emailRedirectTo,
          data: {},
        },
      });

      if (error) {
        const extra = (error as any)?.status ? ` (status ${(error as any).status})` : '';
        Alert.alert(i18n.t('error'), `${error.message}${extra}`);
        return;
      }

      const userId = data?.user?.id;
      const hasSession = !!data?.session;

      if (hasSession && userId) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: userId,
            full_name: cleanFullName,
            city: cleanCity,
            country: cleanCountry,
            phone: phoneE164,
            date_of_brith: dobISO,
          },
          { onConflict: 'id' }
        );

        if (profileError) {
          console.log('Profile upsert error:', profileError.message);
        } else {
          await AsyncStorage.removeItem(PENDING_PROFILE_KEY);
        }
      }

      router.replace({
        pathname: '/email-verification' as any,
        params: { email: cleanEmail },
      } as any);
    } catch (e: any) {
      Alert.alert(i18n.t('error'), e?.message ?? 'Unknown error');
    } finally {
      setIsCreating(false);
    }
  }

  const webDateValue = tempDob.toISOString().split('T')[0];
  const webMin = minDate.toISOString().split('T')[0];
  const webMax = maxDate.toISOString().split('T')[0];

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backIconBtn}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.blueDark} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{i18n.t('createAccount')}</Text>

        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroIconWrap}>
            <Ionicons name="person-add-outline" size={26} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>{i18n.t('createAccount')}</Text>
          <Text style={styles.heroSubtitle}>
            {i18n.t('completeAllFields') || 'Complete all fields to create your account'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('fullName')}</Text>
            <TextInput
              placeholder={i18n.t('fullName')}
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('email')}</Text>
            <TextInput
              placeholder={i18n.t('email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('password')}</Text>
            <TextInput
              placeholder={i18n.t('password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('dateOfBirth')}</Text>
            <TouchableOpacity
              testID="dob-open"
              onPress={() => {
                setTempDob(dob ?? new Date(1995, 0, 1));
                setOpenDob(true);
              }}
              activeOpacity={0.85}
              style={styles.dobButton}
            >
              <Text style={styles.dobText}>
                {dob
                  ? dob.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : i18n.t('dateOfBirth')}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={COLORS.blueDark} />
            </TouchableOpacity>
          </View>

          {Platform.OS === 'android' ? (
            openDob ? (
              <DateTimePicker
                value={dob ?? new Date(1995, 0, 1)}
                mode="date"
                display="default"
                maximumDate={maxDate}
                minimumDate={minDate}
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  setOpenDob(false);
                  if (event.type === 'set' && date) handleDobChange(date);
                }}
              />
            ) : null
          ) : Platform.OS === 'web' ? (
            <Modal
              visible={openDob}
              transparent
              animationType="fade"
              onRequestClose={() => setOpenDob(false)}
            >
              <Pressable
                testID="dob-backdrop"
                style={styles.dobModalBackdrop}
                onPress={() => setOpenDob(false)}
              >
                <Pressable style={styles.dobModalCard} onPress={() => null}>
                  <Text style={styles.dobModalTitle}>{i18n.t('dateOfBirth')}</Text>

                  <View style={styles.webDatePickerContainer}>
                    {React.createElement('input', {
                      type: 'date',
                      value: webDateValue,
                      min: webMin,
                      max: webMax,
                      onChange: (e: any) => {
                        const v = e?.target?.value;
                        if (!v) return;
                        const newDate = new Date(`${v}T00:00:00`);
                        if (!isNaN(newDate.getTime())) setTempDob(newDate);
                      },
                      style: {
                        width: '100%',
                        padding: 16,
                        fontSize: 18,
                        borderRadius: 12,
                        border: `1px solid ${COLORS.border}`,
                        backgroundColor: COLORS.white,
                        color: COLORS.text,
                        fontFamily:
                          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial',
                        outline: 'none',
                        appearance: 'none',
                        cursor: 'pointer',
                        minHeight: 48,
                        boxSizing: 'border-box',
                      },
                    })}
                  </View>

                  <View style={styles.dobModalActions}>
                    <TouchableOpacity
                      testID="dob-cancel"
                      onPress={() => setOpenDob(false)}
                      activeOpacity={0.85}
                      style={[styles.dobActionSecondary, styles.dobActionLeft]}
                    >
                      <Text style={styles.dobActionSecondaryText}>{i18n.t('cancel')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      testID="dob-confirm"
                      onPress={() => {
                        handleDobChange(tempDob);
                        setOpenDob(false);
                      }}
                      activeOpacity={0.85}
                      style={styles.dobActionPrimary}
                    >
                      <Text style={styles.dobActionPrimaryText}>{i18n.t('confirm')}</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          ) : (
            <Modal
              visible={openDob}
              transparent
              animationType="fade"
              onRequestClose={() => setOpenDob(false)}
            >
              <Pressable
                testID="dob-backdrop"
                style={styles.dobModalBackdrop}
                onPress={() => setOpenDob(false)}
              >
                <Pressable style={styles.dobModalCard} onPress={() => null}>
                  <Text style={styles.dobModalTitle}>{i18n.t('dateOfBirth')}</Text>

                  <View style={styles.iosPickerContainer}>
                    <DateTimePicker
                      value={tempDob}
                      mode="date"
                      display="spinner"
                      maximumDate={maxDate}
                      minimumDate={minDate}
                      textColor={COLORS.text}
                      onChange={(event: DateTimePickerEvent, date?: Date) => {
                        if (date) setTempDob(date);
                      }}
                    />
                  </View>

                  <View style={styles.dobModalActions}>
                    <TouchableOpacity
                      testID="dob-cancel"
                      onPress={() => setOpenDob(false)}
                      activeOpacity={0.85}
                      style={[styles.dobActionSecondary, styles.dobActionLeft]}
                    >
                      <Text style={styles.dobActionSecondaryText}>{i18n.t('cancel')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      testID="dob-confirm"
                      onPress={() => {
                        handleDobChange(tempDob);
                        setOpenDob(false);
                      }}
                      activeOpacity={0.85}
                      style={styles.dobActionPrimary}
                    >
                      <Text style={styles.dobActionPrimaryText}>{i18n.t('confirm')}</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          )}

          {dobError ? <Text style={styles.errorText}>{dobError}</Text> : null}

          <Text style={styles.complianceText}>{i18n.t('mustBe18OrOlder')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('city')}</Text>
            <TextInput
              placeholder={i18n.t('city')}
              value={city}
              onChangeText={setCity}
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('country')}</Text>
            <TextInput
              placeholder={i18n.t('country')}
              value={country}
              onChangeText={setCountry}
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t('phoneLabel') || 'Phone'}</Text>
            <View style={styles.phoneContainer}>
              <Text style={styles.phonePrefix}>+964</Text>
              <TextInput
                placeholder={i18n.t('phonePlaceholder')}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                style={styles.phoneInput}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={createAccount}
            style={[
              styles.createBtn,
              (isCreating || !!dobError || !dob) && styles.createBtnDisabled,
            ]}
            disabled={isCreating || !!dobError || !dob}
            activeOpacity={0.9}
          >
            {isCreating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
                <Text style={styles.createBtnText}>{i18n.t('createAccount')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.9}>
            <Text style={styles.backText}>{i18n.t('alreadyHaveAccountShort')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 26 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  backIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: COLORS.text,
  },
  headerRightSpacer: {
    width: 44,
    height: 44,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.page,
  },
  content: {
    padding: 20,
    paddingTop: 18,
  },

  heroCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: COLORS.blue,
    marginBottom: 16,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.14)',
    right: -30,
    top: -45,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.10)',
    left: -50,
    bottom: -75,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.84)',
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },

  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '700' as const,
    ...SHADOWS.soft,
  },

  dobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  dobText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '700' as const,
  },

  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    ...SHADOWS.soft,
  },
  phonePrefix: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: COLORS.blueDark,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '700' as const,
  },

  createBtn: {
    backgroundColor: COLORS.blue,
    paddingVertical: 16,
    borderRadius: 18,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...SHADOWS.card,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900' as const,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },

  backBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 8,
  },
  backText: {
    color: COLORS.blueDark,
    fontSize: 14,
    fontWeight: '800' as const,
    textDecorationLine: 'underline' as const,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: -8,
    marginBottom: 10,
    fontWeight: '700' as const,
  },
  complianceText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: -6,
    marginBottom: 12,
    fontWeight: '700' as const,
  },

  dobModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  dobModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  dobModalTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: COLORS.text,
    marginBottom: 12,
  },

  iosPickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  webDatePickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'visible',
    marginBottom: 8,
  },

  dobModalActions: {
    flexDirection: 'row',
    marginTop: 14,
  },
  dobActionLeft: {
    marginRight: 12,
  },

  dobActionSecondary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: COLORS.blueSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dobActionSecondaryText: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: COLORS.blueDark,
  },
  dobActionPrimary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: COLORS.blue,
  },
  dobActionPrimaryText: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: '#FFFFFF',
  },
});