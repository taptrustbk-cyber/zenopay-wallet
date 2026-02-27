import React, { useMemo, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '@/lib/i18n';

export default function TermsConditionsScreen() {
  const router = useRouter();
  const goingBackRef = useRef(false);

  const goBackSafe = () => {
    if (goingBackRef.current) return; // ✅ prevent double click
    goingBackRef.current = true;
    router.back();
    setTimeout(() => {
      goingBackRef.current = false;
    }, 700);
  };

  // ✅ If translation is missing, i18n often returns: `missing "en.key" translation`
  // This helper prevents showing that text in UI.
  const t = (key: string, fallback: string) => {
    const val = i18n.t(key) as unknown as string;
    if (!val) return fallback;

    const lower = String(val).toLowerCase();
    const looksMissing =
      lower.includes('missing "') ||
      lower.includes(' translation') ||
      lower.includes('missing translation') ||
      String(val).includes(`"${key}"`) ||
      String(val) === key;

    return looksMissing ? fallback : String(val);
  };

  // ✅ Remove leading numbers from translations (fix: "10. 10." or "5. 5.")
  const cleanTitle = (text: string) => {
    // removes: "10.", "10)", "10 -", "10:" at the beginning
    return String(text).replace(/^\s*\d+\s*[\.\)\-:]\s*/g, '').trim();
  };

  const UI_TEXT = useMemo(
    () => ({
      headerTitle: t('termsConditions', 'Terms & Conditions'),

      mainTitle: t('tcNewTitle', 'Terms & Conditions'),
      lastUpdated: t('tcNewLastUpdated', 'Last updated: January 2025'),
      intro: t(
        'tcNewIntro',
        'Welcome to ZenoPay Wallet. By accessing or using our mobile application and services, you agree to be bound by these Terms and Conditions. Please read them carefully.'
      ),

      // Platform notice fallbacks (so you don’t see “missing translation” in UI)
      pnTitle: t('tcPlatformNoticeTitle', 'Platform Notice'),
      pnIntro: t(
        'tcPlatformNoticeIntro',
        'Zenopay is a digital wallet platform. We are not a bank, and we do not issue Visa or Mastercard cards.'
      ),
      pn2Title: t('tcPlatformNotice2Title', 'Virtual Internal Card'),
      pn2Item1: t(
        'tcPlatformNotice2Item1',
        'The Zenopay card is an internal virtual card that works only inside the Zenopay system.'
      ),

      pn3Title: t('tcPlatformNotice3Title', 'No Bank Deposit'),
      pn3Item1: t(
        'tcPlatformNotice3Item1',
        'Funds stored in Zenopay are not bank deposits and are not covered by deposit insurance.'
      ),

      pn4Title: t('tcPlatformNotice4Title', 'Fees'),
      pn4Item1: t('tcPlatformNotice4Item1', 'Card creation fee: $25'),

      pn5Title: t('tcPlatformNotice5Title', 'User Responsibility'),
      pn5Item1: t('tcPlatformNotice5Item1', 'Users are responsible for how their account is used.'),
      pn5Item2: t('tcPlatformNotice5Item2', 'Users must ensure their information is accurate.'),

      pn6Title: t('tcPlatformNotice6Title', 'Account Suspension'),
      pn6Desc: t(
        'tcPlatformNotice6Desc',
        'Zenopay reserves the right to suspend accounts in case of suspicious activity.'
      ),

      pn8Title: t('tcPlatformNotice8Title', 'Severability'),
      pn8Desc: t(
        'tcPlatformNotice8Desc',
        'If any provision of these terms is found to be unenforceable, the remaining provisions will remain in effect.'
      ),

      supportTitle: t('tcSupportTitle', 'Support'),
      supportLine: t('tcSupportLine', 'Support: info@zenopay.bond'),
      supportReply: t('tcSupportReply', 'We aim to respond within 48 hours'),
    }),
    []
  );

  const renderNumberedTitle = (num: number, titleKey: string, fallback: string) => {
    const title = cleanTitle(t(titleKey, fallback));
    return (
      <Text style={styles.sectionTitle}>
        {num}. {title}
      </Text>
    );
  };

  const renderPlatformSubTitle = (num: number, title: string) => {
    return (
      <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
        {num}. {cleanTitle(title)}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBackSafe} style={styles.backButton} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#111111" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{UI_TEXT.headerTitle}</Text>

        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top card */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>{UI_TEXT.mainTitle}</Text>
          <Text style={styles.lastUpdated}>{UI_TEXT.lastUpdated}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.introText}>{UI_TEXT.intro}</Text>
        </View>

        {/* 1 */}
        <View style={styles.section}>
          {renderNumberedTitle(1, 'tcNewSection1Title', 'Acceptance of Terms')}
          <Text style={styles.bulletItem}>• {t('tcNewSection1Item1', 'By creating an account, you accept these terms')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection1Item2', 'You must be at least 18 years old to use our services')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection1Item3', 'You agree to provide accurate and complete information')}</Text>
        </View>

        {/* 2 */}
        <View style={styles.section}>
          {renderNumberedTitle(2, 'tcNewSection2Title', 'Account Registration')}
          <Text style={styles.bulletItem}>• {t('tcNewSection2Item1', 'You must complete signup account to access full features')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection2Item2', 'You are responsible for maintaining the security of your account')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection2Item3', 'Notify us immediately of any unauthorized access')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection2Item4', 'One account per person is allowed')}</Text>
        </View>

        {/* 3 */}
        <View style={styles.section}>
          {renderNumberedTitle(3, 'tcNewSection3Title', 'Services Provided')}
          <Text style={styles.bulletItem}>• {t('tcNewSection3Item1', 'Digital wallet for managing funds')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection3Item2', 'Marketplace for purchasing cards, phones, and travel bookings')}</Text>
        </View>

        {/* 4 */}
        <View style={styles.section}>
          {renderNumberedTitle(4, 'tcNewSection4Title', 'User Responsibilities')}
          <Text style={styles.bulletItem}>• {t('tcNewSection4Item1', 'Comply with all applicable laws and regulations')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection4Item2', 'Do not use our services for illegal activities')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection4Item3', 'Do not attempt to manipulate or defraud the system')}</Text>
        </View>

        {/* 5 */}
        <View style={styles.section}>
          {renderNumberedTitle(5, 'tcNewSection5Title', 'Fees and Payments')}
          <Text style={styles.sectionText}>
            {t('tcNewSection5Desc', 'Fees may apply to certain transactions. We reserve the right to change fees with notice.')}
          </Text>

          <Text style={[styles.bulletItem, { marginTop: 10 }]}>
            • {t('tcNewSection5Item1', 'Transaction fees are disclosed before confirmation')}
          </Text>
          <Text style={styles.bulletItem}>
            • {t('tcNewSection5Item2', 'All payments are final and non-refundable unless otherwise stated')}
          </Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection5Item3', 'You are responsible for any applicable taxes')}</Text>

          <Text style={[styles.sectionText, { marginTop: 10 }]}>
            {t('tcNewSection5Desc2', 'Payment methods may include bank transfers, cards, and cryptocurrencies (where available).')}
          </Text>
        </View>

        {/* 6 */}
        <View style={styles.section}>
          {renderNumberedTitle(6, 'tcNewSection6Title', 'Prohibited Activities')}
          <Text style={styles.bulletItem}>• {t('tcNewSection6Item1', 'Money laundering or terrorist financing')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection6Item2', 'Fraudulent transactions')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection6Item3', 'Intellectual property infringement')}</Text>
        </View>

        {/* 7 */}
        <View style={styles.section}>
          {renderNumberedTitle(7, 'tcNewSection7Title', 'Account Suspension and Termination')}
          <Text style={styles.bulletItem}>• {t('tcNewSection7Item1', 'We may suspend or terminate your account for violating these terms')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection7Item2', 'You may close your account at any time')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection7Item3', 'Upon termination, outstanding balances will be handled according to our policy')}</Text>
        </View>

        {/* 8 */}
        <View style={styles.section}>
          {renderNumberedTitle(8, 'tcNewSection8Title', 'Limitation of Liability')}
          <Text style={styles.bulletItem}>• {t('tcNewSection8Item1', 'We are not liable for indirect, incidental, or consequential damages')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection8Item2', 'Our liability is limited to the amount of fees you paid in the past 12 months')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection8Item3', 'We do not guarantee uninterrupted or error-free service')}</Text>
        </View>

        {/* 9 */}
        <View style={styles.section}>
          {renderNumberedTitle(9, 'tcNewSection9Title', 'Intellectual Property')}
          <Text style={styles.bulletItem}>• {t('tcNewSection9Item1', 'All content and trademarks are owned by ZenoPay or our licensors')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection9Item2', 'You may not reproduce or distribute our content without permission')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection9Item3', 'User-generated content remains your property, but you grant us a license to use it')}</Text>
        </View>

        {/* 10 */}
        <View style={styles.section}>
          {renderNumberedTitle(10, 'tcNewSection10Title', 'Dispute Resolution')}
          <Text style={styles.sectionText}>
            {t('tcNewSection10Desc', 'Any disputes arising from these terms will be resolved through arbitration.')}
          </Text>

          <Text style={[styles.bulletItem, { marginTop: 10 }]}>
            • {t('tcNewSection10Item1', 'These terms are governed by the laws of your local applicable jurisdiction')}
          </Text>
          <Text style={styles.bulletItem}>
            • {t('tcNewSection10Item2', 'Arbitration will be conducted in a mutually agreed location')}
          </Text>
          <Text style={styles.bulletItem}>
            • {t('tcNewSection10Item3', 'You waive the right to participate in class-action lawsuits')}
          </Text>
          <Text style={styles.bulletItem}>
            • {t('tcNewSection10Item4', 'Exceptions: Small claims court disputes are allowed')}
          </Text>

          <Text style={[styles.sectionText, { marginTop: 10 }]}>
            {t('tcNewSection10Desc2', 'Governing law applies as permitted by local regulations.')}
          </Text>
        </View>

        {/* 11 */}
        <View style={styles.section}>
          {renderNumberedTitle(11, 'tcNewSection11Title', 'Changes to Terms')}
          <Text style={styles.bulletItem}>• {t('tcNewSection11Item1', 'We may modify these terms at any time')}</Text>
          <Text style={styles.bulletItem}>• {t('tcNewSection11Item2', 'Continued use of our services constitutes acceptance of changes')}</Text>
        </View>

        {/* 12 */}
        <View style={styles.section}>
          {renderNumberedTitle(12, 'tcNewSection12Title', 'Third-Party Services')}
          <Text style={styles.sectionText}>
            {t('tcNewSection12Desc', 'Our app integrates with third-party services for payments, bookings, and other features.')}
          </Text>
          <Text style={[styles.sectionText, { marginTop: 10 }]}>
            {t('tcNewSection12Desc2', 'Third-party terms apply:')}
          </Text>

          <Text style={[styles.bulletItem, { marginTop: 10 }]}>
            • {t('tcNewSection12Item1', 'We are not responsible for third-party service failures')}
          </Text>
          <Text style={styles.bulletItem}>
            • {t('tcNewSection12Item2', 'Third-party privacy policies govern their data practices')}
          </Text>
          <Text style={styles.bulletItem}>
            • {t('tcNewSection12Item3', 'We do not endorse third-party products or services')}
          </Text>

          <Text style={[styles.sectionText, { marginTop: 10 }]}>
            {t('tcNewSection12Desc3', 'Examples: Payment processors, travel booking platforms, and cryptocurrency exchanges.')}
          </Text>
        </View>

        {/* 13 */}
        <View style={styles.section}>
          {renderNumberedTitle(13, 'tcNewSection13Title', 'Privacy')}
          <Text style={styles.bulletItem}>
            • {t('tcNewSection13Item1', 'Your use of our services is also governed by our Privacy Policy')}
          </Text>
          <Text style={styles.bulletItem}>
            • {t('tcNewSection13Item2', 'By using our app, you consent to data collection as described in the Privacy Policy')}
          </Text>
        </View>

        {/* Platform Notice */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{cleanTitle(UI_TEXT.pnTitle)}</Text>
          <Text style={styles.sectionText}>{UI_TEXT.pnIntro}</Text>

          {renderPlatformSubTitle(2, UI_TEXT.pn2Title)}
          <Text style={styles.bulletItem}>• {UI_TEXT.pn2Item1}</Text>

          {renderPlatformSubTitle(3, UI_TEXT.pn3Title)}
          <Text style={styles.bulletItem}>• {UI_TEXT.pn3Item1}</Text>

          {renderPlatformSubTitle(4, UI_TEXT.pn4Title)}
          <Text style={styles.bulletItem}>• {UI_TEXT.pn4Item1}</Text>

          {renderPlatformSubTitle(5, UI_TEXT.pn5Title)}
          <Text style={styles.bulletItem}>• {UI_TEXT.pn5Item1}</Text>
          <Text style={styles.bulletItem}>• {UI_TEXT.pn5Item2}</Text>

          {renderPlatformSubTitle(6, UI_TEXT.pn6Title)}
          <Text style={styles.sectionText}>{UI_TEXT.pn6Desc}</Text>

          {renderPlatformSubTitle(8, UI_TEXT.pn8Title)}
          <Text style={styles.sectionText}>{UI_TEXT.pn8Desc}</Text>
        </View>

        {/* ✅ Support moved to bottom */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{UI_TEXT.supportTitle}</Text>

          <View style={styles.supportBox}>
            <View style={styles.supportIcon}>
              <Ionicons name="mail" size={18} color="#16a34a" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.supportText}>{UI_TEXT.supportLine}</Text>
              <Text style={styles.supportSubText}>{UI_TEXT.supportReply}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 46,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: { padding: 6, borderRadius: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111111' },

  content: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { paddingBottom: 10 },

  headerSection: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 30,
    color: '#111111',
  },
  lastUpdated: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    color: '#6B7280',
    fontWeight: '600',
  },

  section: { marginHorizontal: 20, marginTop: 22 },
  introText: { fontSize: 16, lineHeight: 26, color: '#111111', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 10, color: '#111111' },
  sectionText: { fontSize: 16, lineHeight: 26, color: '#111111', fontWeight: '600' },
  bulletItem: {
    fontSize: 16,
    lineHeight: 28,
    color: '#111111',
    fontWeight: '600',
    marginTop: 6,
  },

  supportBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  supportIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  supportText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111111',
  },
  supportSubText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
});
