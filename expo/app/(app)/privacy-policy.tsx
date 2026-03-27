import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import i18n from '@/lib/i18n';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  const t = (key: string, fallback: string) => {
    const val = i18n.t(key) as unknown as string;
    if (!val) return fallback;

    const str = String(val);
    const lower = str.toLowerCase();

    if (
      lower.includes('missing') ||
      str === key ||
      str.includes(`"${key}"`)
    ) {
      return fallback;
    }

    return str;
  };

  const UI = useMemo(() => ({
    title: t('privacyPolicy', 'Privacy Policy'),
    lastUpdated: t('ppLastUpdated', 'Last updated: January 2025'),
    intro: t(
      'ppIntro',
      'This Privacy Policy explains how ZenoPay collects, uses, and protects your information when you use our application.'
    ),

    s1: t('ppNewSection1Title', 'Information We Collect'),
    s1Desc: t(
      'ppPersonalInfoDesc',
      'We may collect basic information required to create and manage your account.'
    ),
    s1Items: [
      t('ppPersonalInfoItem1', 'Full name and account details'),
      t('ppPersonalInfoItem3', 'Email address and login credentials'),
      t('ppPersonalInfoItem5', 'Optional phone number and profile details'),
    ],

    s2: t('ppNewSection2Title', 'How We Use Information'),
    s2Desc: t(
      'ppNewSection2Desc',
      'We use your information to operate and improve our services.'
    ),
    s2Items: [
      t('ppNewSection2Item1', 'Provide wallet and app functionality'),
      t('ppNewSection2Item3', 'Improve user experience'),
      t('ppNewSection2Item4', 'Ensure account security'),
      t('ppNewSection2Item5', 'Provide support services'),
      t('ppNewSection2Item6', 'Maintain system performance'),
    ],

    s3: t('ppNewSection3Title', 'Data Sharing'),
    s3Desc: t(
      'ppNewSection3Desc',
      'We do not sell your personal data. Limited data may be shared with service providers when necessary.'
    ),

    s4: t('ppNewSection4Title', 'Data Security'),
    s4Desc: t(
      'ppNewSection4Desc',
      'We use security measures to protect your account and information.'
    ),

    s5: t('ppNewSection5Title', 'Data Retention'),
    s5Desc: t(
      'ppNewSection5Desc1',
      'We retain data only as long as necessary for app functionality and legal obligations.'
    ),

    s6: t('ppNewSection6Title', 'User Rights'),
    s6Desc: t(
      'ppNewSection6Desc',
      'You can access, update, or delete your account through settings.'
    ),

    s7: t('ppNewSection7Title', 'Third-Party Services'),
    s7Desc: t(
      'ppNewSection7Desc',
      'Some features may connect to external services with their own policies.'
    ),

    s8: t('ppNewSection8Title', 'Children'),
    s8Desc: t(
      'ppNewSection8Desc',
      'This app is intended for users aged 18 and above.'
    ),

    s9: t('ppNewSection9Title', 'Changes'),
    s9Desc: t(
      'ppNewSection9Desc',
      'We may update this Privacy Policy from time to time.'
    ),

    contact: t('ppNewSection12Title', 'Contact Us'),
    contactDesc: t(
      'ppNewSection12Desc',
      'If you have questions, contact us at:'
    ),
  }), []);

  const bullet = (text: string) => (
    <Text style={styles.bullet}>• {text}</Text>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EEF4FF', '#F7FAFF']}
        style={styles.gradient}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1D4ED8" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{UI.title}</Text>

          <View style={{ width: 42 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* HERO */}
          <LinearGradient
            colors={['#4B8DFF', '#2563EB']}
            style={styles.hero}
          >
            <Ionicons name="shield-outline" size={30} color="#fff" />
            <Text style={styles.heroTitle}>{UI.title}</Text>
            <Text style={styles.heroSub}>{UI.lastUpdated}</Text>
          </LinearGradient>

          <View style={styles.card}>
            <Text style={styles.text}>{UI.intro}</Text>

            {/* SECTION 1 */}
            <Text style={styles.title}>1. {UI.s1}</Text>
            <Text style={styles.text}>{UI.s1Desc}</Text>
            {UI.s1Items.map((i, idx) => <View key={idx}>{bullet(i)}</View>)}

            {/* SECTION 2 */}
            <Text style={styles.title}>2. {UI.s2}</Text>
            <Text style={styles.text}>{UI.s2Desc}</Text>
            {UI.s2Items.map((i, idx) => <View key={idx}>{bullet(i)}</View>)}

            {/* SECTION 3 */}
            <Text style={styles.title}>3. {UI.s3}</Text>
            <Text style={styles.text}>{UI.s3Desc}</Text>

            {/* SECTION 4 */}
            <Text style={styles.title}>4. {UI.s4}</Text>
            <Text style={styles.text}>{UI.s4Desc}</Text>

            {/* SECTION 5 */}
            <Text style={styles.title}>5. {UI.s5}</Text>
            <Text style={styles.text}>{UI.s5Desc}</Text>

            {/* SECTION 6 */}
            <Text style={styles.title}>6. {UI.s6}</Text>
            <Text style={styles.text}>{UI.s6Desc}</Text>

            {/* SECTION 7 */}
            <Text style={styles.title}>7. {UI.s7}</Text>
            <Text style={styles.text}>{UI.s7Desc}</Text>

            {/* SECTION 8 */}
            <Text style={styles.title}>8. {UI.s8}</Text>
            <Text style={styles.text}>{UI.s8Desc}</Text>

            {/* SECTION 9 */}
            <Text style={styles.title}>9. {UI.s9}</Text>
            <Text style={styles.text}>{UI.s9Desc}</Text>

            {/* CONTACT */}
            <Text style={styles.title}>{UI.contact}</Text>
            <Text style={styles.text}>{UI.contactDesc}</Text>

            <View style={styles.contactBox}>
              <Ionicons name="mail-outline" size={18} color="#2563EB" />
              <Text style={styles.contactText}>info@zenopay.bond</Text>
            </View>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 55 : 40,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  content: { padding: 20 },

  hero: {
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
  },
  heroSub: {
    color: '#fff',
    fontSize: 13,
    marginTop: 4,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
  },

  title: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 18,
    color: '#0F172A',
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    marginTop: 6,
  },
  bullet: {
    fontSize: 14,
    marginTop: 6,
    color: '#0F172A',
  },

  contactBox: {
    flexDirection: 'row',
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
});