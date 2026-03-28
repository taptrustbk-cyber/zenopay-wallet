import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import i18n from '@/lib/i18n';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const isRTL = I18nManager.isRTL;

  const t = (key: string, fallback: string) => {
    const val = i18n.t(key) as unknown as string;
    if (!val) return fallback;

    const str = String(val).trim();
    const lower = str.toLowerCase();

    if (
      !str ||
      str === key ||
      lower.includes('missing') ||
      str.includes(`"${key}"`)
    ) {
      return fallback;
    }

    return str;
  };

  const UI = useMemo(
    () => ({
      title: t('privacyPolicy.title', 'Privacy Policy'),
      lastUpdated: t('privacyPolicy.lastUpdated', 'Last updated: March 28, 2026'),
      intro: t(
        'privacyPolicy.intro',
        'This Privacy Policy explains how ZenoPay collects, uses, stores, and protects your information when you use the app and related services.'
      ),

      section1Title: t('privacyPolicy.section1Title', 'Information We Collect'),
      section1Desc: t(
        'privacyPolicy.section1Desc',
        'We collect information that is needed to create and protect your account, provide wallet features, process purchases, and improve app security and support.'
      ),
      section1Items: [
        t(
          'privacyPolicy.section1Item1',
          'Account details such as full name, email address, password or login information, city, country, phone number, gender, and date of birth when you create an account.'
        ),
        t(
          'privacyPolicy.section1Item2',
          'Profile information such as profile photo, avatar, city, phone number, email, and other details you choose to add or update.'
        ),
        t(
          'privacyPolicy.section1Item3',
          'Wallet and transaction information such as deposits, withdrawals, money transfers, balances, transaction history, and related records.'
        ),
        t(
          'privacyPolicy.section1Item4',
          'Purchase and order information related to mobile shop, gift cards, top-up cards, and virtual card creation, including product details, order status, payment amount, and delivery-related information.'
        ),
        t(
          'privacyPolicy.section1Item5',
          'Card information related to internal virtual card creation, including one-card-per-user setup and creation fee records such as 25,000 IQD where applicable.'
        ),
        t(
          'privacyPolicy.section1Item6',
          'Additional account protection information such as selfie or document images, including ID front, ID back, and selfie, when needed to help protect accounts and reduce fraud or misuse of the platform.'
        ),
        t(
          'privacyPolicy.section1Item7',
          'Location information may be used only to help suggest or display your city inside the mobile shop page. Users can still manually enter their city.'
        ),
        t(
          'privacyPolicy.section1Item8',
          'Support, password reset, security check, and account recovery information when you contact support or use account security features.'
        ),
      ],

      section2Title: t('privacyPolicy.section2Title', 'How We Use Information'),
      section2Desc: t(
        'privacyPolicy.section2Desc',
        'We use your information only for purposes related to operating, securing, and improving the app.'
      ),
      section2Items: [
        t('privacyPolicy.section2Item1', 'To create, manage, and secure your account.'),
        t('privacyPolicy.section2Item2', 'To process deposits, withdrawals, wallet transfers, and other wallet activity.'),
        t('privacyPolicy.section2Item3', 'To process purchases from mobile shop, gift cards, top-up cards, and virtual card services.'),
        t('privacyPolicy.section2Item4', 'To display your profile information, account settings, and transaction history inside the app.'),
        t('privacyPolicy.section2Item5', 'To help protect accounts, review suspicious activity, and prevent fraud or misuse.'),
        t('privacyPolicy.section2Item6', 'To support password reset, login verification, and account recovery features.'),
        t('privacyPolicy.section2Item7', 'To improve app performance, user experience, and feature reliability.'),
        t('privacyPolicy.section2Item8', 'To respond to support requests and communicate important service updates.'),
      ],

      section3Title: t('privacyPolicy.section3Title', 'Location Information'),
      section3Desc: t(
        'privacyPolicy.section3Desc',
        'If you allow location access, ZenoPay may use it only to suggest or show your city in the mobile shop page. Location is not required for general app use, and users may manually enter their city instead.'
      ),

      section4Title: t('privacyPolicy.section4Title', 'Data Sharing'),
      section4Desc: t(
        'privacyPolicy.section4Desc',
        'We do not sell your personal information. Some information may be processed using secure service providers or internal admin tools only when needed to operate the app, provide support, store account data, process orders, or maintain security.'
      ),

      section5Title: t('privacyPolicy.section5Title', 'Data Security'),
      section5Desc: t(
        'privacyPolicy.section5Desc',
        'We use reasonable technical and organizational measures to help protect your account and information. No system can guarantee absolute security, but we work to reduce unauthorized access, misuse, and loss of data.'
      ),

      section6Title: t('privacyPolicy.section6Title', 'Data Retention'),
      section6Desc: t(
        'privacyPolicy.section6Desc',
        'We retain information for as long as needed to operate the app, maintain wallet and order records, protect accounts, resolve disputes, meet legal obligations, and improve service reliability.'
      ),

      section7Title: t('privacyPolicy.section7Title', 'User Rights and Choices'),
      section7Desc: t(
        'privacyPolicy.section7Desc',
        'You may review or update parts of your account information inside the app. You may also contact support regarding account information, security issues, or other privacy-related requests.'
      ),

      section8Title: t('privacyPolicy.section8Title', 'Third-Party Services'),
      section8Desc: t(
        'privacyPolicy.section8Desc',
        'Some app features may rely on secure external services such as hosting, authentication, storage, notifications, or app infrastructure providers. These services may process data only as needed to support app functionality.'
      ),

      section9Title: t('privacyPolicy.section9Title', 'Children'),
      section9Desc: t(
        'privacyPolicy.section9Desc',
        'ZenoPay is intended for users aged 18 and above.'
      ),

      section10Title: t('privacyPolicy.section10Title', 'Changes to This Policy'),
      section10Desc: t(
        'privacyPolicy.section10Desc',
        'We may update this Privacy Policy from time to time. When we do, the updated version will appear in the app with a revised last updated date.'
      ),

      section11Title: t('privacyPolicy.section11Title', 'Contact Us'),
      section11Desc: t(
        'privacyPolicy.section11Desc',
        'If you have any questions about this Privacy Policy or your information, please contact us at:'
      ),
      contactLabel: t('privacyPolicy.contactEmailLabel', 'Email'),
    }),
    []
  );

  const renderBullet = (text: string, index: number) => (
    <View
      key={index}
      style={[styles.bulletRow, isRTL && styles.bulletRowRTL]}
    >
      <Text style={[styles.bulletDot, isRTL && styles.bulletDotRTL]}>•</Text>
      <Text style={[styles.bulletText, isRTL && styles.textRTL]}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#EEF4FF', '#F7FAFF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.9}>
            <Ionicons
              name={isRTL ? 'arrow-forward' : 'arrow-back'}
              size={22}
              color="#1D4ED8"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {UI.title}
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={['#4B8DFF', '#2563EB']} style={styles.hero}>
            <Ionicons name="shield-outline" size={30} color="#fff" />
            <Text style={styles.heroTitle}>{UI.title}</Text>
            <Text style={styles.heroSub}>{UI.lastUpdated}</Text>
          </LinearGradient>

          <View style={styles.card}>
            <Text style={[styles.text, isRTL && styles.textRTL]}>{UI.intro}</Text>

            <Text style={[styles.title, isRTL && styles.textRTL]}>
              1. {UI.section1Title}
            </Text>
            <Text style={[styles.text, isRTL && styles.textRTL]}>{UI.section1Desc}</Text>
            {UI.section1Items.map(renderBullet)}

            <Text style={[styles.title, isRTL && styles.textRTL]}>
              2. {UI.section2Title}
            </Text>
            <Text style={[styles.text, isRTL && styles.textRTL]}>{UI.section2Desc}</Text>
            {UI.section2Items.map(renderBullet)}

            <Text style={[styles.title, isRTL && styles.textRTL]}>
              3. {UI.section3Title}
            </Text>
            <Text style={[styles.text, isRTL && styles.textRTL]}>{UI.section3Desc}</Text>

            <Text style={[styles.title, isRTL && styles.textRTL]}>
              4. {UI.section4Title}
            </Text>
            <Text style={[styles.text, isRTL && styles.textRTL]}>{UI.section4Desc}</Text>

            <Text style={[styles.title, isRTL && styles.textRTL]}>
              5. {UI.section5Title}
            </Text>
            <Text style={[styles.text, isRTL && styles.textRTL]}>{UI.section5Desc}</Text>

            <Text style={[styles.title, isRTL && styles.textRTL]}>
              6. {UI.section6Title}
            </Text>
            <Text style={[styles.text, isRTL && styles.textRTL]}>{UI.section6Desc}</Text>

            <Text style={[styles.title, isRTL && styles.textRTL]}>
              7. {UI.section7Title}
            </Text>
            <Text style={[styles.text, isRTL && styles.textRTL]}>{UI.section7Desc}</Text>

            <Text style={[styles.title, isRTL && styles.textRTL]}>
              8. {UI.section8Title}
            </Text>
            <Text style={[styles.text, isRTL && styles.textRTL]}>{UI.section8Desc}</Text>

            <Text style={[styles.title, isRTL && styles.textRTL]}>
              9. {UI.section9Title}
            </Text>
            <Text style={[styles.text, isRTL && styles.textRTL]}>{UI.section9Desc}</Text>

            <Text style={[styles.title, isRTL && styles.textRTL]}>
              10. {UI.section10Title}
            </Text>
            <Text style={[styles.text, isRTL && styles.textRTL]}>{UI.section10Desc}</Text>

            <Text style={[styles.title, isRTL && styles.textRTL]}>
              11. {UI.section11Title}
            </Text>
            <Text style={[styles.text, isRTL && styles.textRTL]}>{UI.section11Desc}</Text>

            <View style={[styles.contactBox, isRTL && styles.contactBoxRTL]}>
              <Ionicons name="mail-outline" size={18} color="#2563EB" />
              <Text style={styles.contactLabel}>{UI.contactLabel}:</Text>
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
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },

  content: {
    padding: 20,
  },

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
    textAlign: 'center',
  },
  heroSub: {
    color: '#fff',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
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
  textRTL: {
    textAlign: 'right',
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  bulletRowRTL: {
    flexDirection: 'row-reverse',
  },
  bulletDot: {
    fontSize: 14,
    color: '#0F172A',
    marginRight: 8,
    marginTop: 1,
  },
  bulletDotRTL: {
    marginRight: 0,
    marginLeft: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
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
    flexWrap: 'wrap',
  },
  contactBoxRTL: {
    flexDirection: 'row-reverse',
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  contactText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
});