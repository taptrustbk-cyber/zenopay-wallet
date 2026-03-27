import React, { useMemo, useRef } from 'react';
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

export default function TermsConditionsScreen() {
  const router = useRouter();
  const goingBackRef = useRef(false);

  const goBackSafe = () => {
    if (goingBackRef.current) return;
    goingBackRef.current = true;
    router.back();
    setTimeout(() => {
      goingBackRef.current = false;
    }, 700);
  };

  const t = (key: string, fallback: string) => {
    const val = i18n.t(key) as unknown as string;
    if (!val) return fallback;

    const str = String(val);
    const lower = str.toLowerCase();

    const looksMissing =
      lower.includes('missing "') ||
      lower.includes('missing translation') ||
      lower.includes('" translation') ||
      str === key ||
      str.includes(`"${key}"`);

    return looksMissing ? fallback : str;
  };

  const cleanTitle = (text: string) => {
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

      section1Title: t('tcNewSection1Title', 'Acceptance of Terms'),
      section1Item1: t('tcNewSection1Item1', 'By creating an account, you accept these terms'),
      section1Item2: t('tcNewSection1Item2', 'You must be at least 18 years old to use our services'),
      section1Item3: t('tcNewSection1Item3', 'You agree to provide accurate and complete information'),

      section2Title: t('tcNewSection2Title', 'Account Registration'),
      section2Item2: t(
        'tcNewSection2Item2',
        'You are responsible for maintaining the security of your account'
      ),
      section2Item3: t(
        'tcNewSection2Item3',
        'Notify us immediately of any unauthorized access'
      ),
      section2Item4: t('tcNewSection2Item4', 'One account per person is allowed'),

      section3Title: t('tcNewSection3Title', 'Services Provided'),
      section3Item1: t(
        'tcNewSection3Item1',
        'Digital wallet services for storing, sending, receiving, depositing, and withdrawing funds.'
      ),
      section3Item2: t(
        'tcNewSection3Item2',
        'Marketplace features may include mobile products, gift cards, top-up cards, travel information, consulate information, and virtual card services.'
      ),

      section4Title: t('tcNewSection4Title', 'User Responsibilities'),
      section4Item1: t(
        'tcNewSection4Item1',
        'Comply with all applicable laws and regulations.'
      ),
      section4Item2: t(
        'tcNewSection4Item2',
        'Do not use our services for illegal activities.'
      ),
      section4Item3: t(
        'tcNewSection4Item3',
        'Do not attempt to manipulate, abuse, or defraud the system.'
      ),

      section5Title: t('tcNewSection5Title', 'Fees and Payments'),
      section5Desc: t(
        'tcNewSection5Desc',
        'Certain services may include fees. We may update fees from time to time with notice inside the app.'
      ),
      section5Item1: t(
        'tcNewSection5Item1',
        'Applicable fees are shown before confirmation when available.'
      ),
      section5Item2: t(
        'tcNewSection5Item2',
        'Completed payments may be final unless otherwise stated.'
      ),
      section5Item3: t(
        'tcNewSection5Item3',
        'You are responsible for reviewing payment details before submission.'
      ),
      section5Desc2: t(
        'tcNewSection5Desc2',
        'Payment methods and available services may vary depending on your region and account status.'
      ),

      section6Title: t('tcNewSection6Title', 'Prohibited Activities'),
      section6Item1: t(
        'tcNewSection6Item1',
        'Fraud, money laundering, abuse of services, or unlawful transactions are prohibited.'
      ),
      section6Item2: t(
        'tcNewSection6Item2',
        'You must not impersonate another person or use false information.'
      ),
      section6Item3: t(
        'tcNewSection6Item3',
        'You must not interfere with the security or normal operation of the platform.'
      ),

      section7Title: t('tcNewSection7Title', 'Account Suspension and Termination'),
      section7Item1: t(
        'tcNewSection7Item1',
        'We may suspend or restrict accounts when misuse, fraud, or suspicious activity is detected.'
      ),
      section7Item2: t(
        'tcNewSection7Item2',
        'You may stop using the service at any time.'
      ),
      section7Item3: t(
        'tcNewSection7Item3',
        'Some records may be retained where required for operational, security, or legal reasons.'
      ),

      section8Title: t('tcNewSection8Title', 'Limitation of Liability'),
      section8Item1: t(
        'tcNewSection8Item1',
        'We aim to provide a reliable service, but we do not guarantee uninterrupted availability.'
      ),
      section8Item2: t(
        'tcNewSection8Item2',
        'We are not responsible for losses caused by third-party providers, outages, or events beyond our reasonable control.'
      ),
      section8Item3: t(
        'tcNewSection8Item3',
        'Your use of the platform is at your own responsibility, subject to applicable law.'
      ),

      section9Title: t('tcNewSection9Title', 'Intellectual Property'),
      section9Item1: t(
        'tcNewSection9Item1',
        'The app design, branding, content, and software are owned by ZenoPay or its licensors.'
      ),
      section9Item2: t(
        'tcNewSection9Item2',
        'You may not copy, redistribute, or misuse our brand or content without permission.'
      ),
      section9Item3: t(
        'tcNewSection9Item3',
        'Any feedback you provide may be used to improve our services.'
      ),

      section10Title: t('tcNewSection10Title', 'Dispute Resolution'),
      section10Desc: t(
        'tcNewSection10Desc',
        'If a dispute arises, both parties should first try to resolve it through support communication.'
      ),
      section10Item1: t(
        'tcNewSection10Item1',
        'Applicable laws and regulations may govern how disputes are handled.'
      ),
      section10Item2: t(
        'tcNewSection10Item2',
        'Formal dispute procedures may depend on your country or jurisdiction.'
      ),
      section10Item3: t(
        'tcNewSection10Item3',
        'We encourage users to contact support before escalating a dispute.'
      ),
      section10Item4: t(
        'tcNewSection10Item4',
        'Nothing in these terms limits rights that cannot legally be waived.'
      ),
      section10Desc2: t(
        'tcNewSection10Desc2',
        'Local legal requirements may apply depending on where you use the service.'
      ),

      section11Title: t('tcNewSection11Title', 'Changes to Terms'),
      section11Item1: t(
        'tcNewSection11Item1',
        'We may update these Terms from time to time.'
      ),
      section11Item2: t(
        'tcNewSection11Item2',
        'Continued use of the app after updates means you accept the revised Terms.'
      ),

      section12Title: t('tcNewSection12Title', 'Third-Party Services'),
      section12Desc: t(
        'tcNewSection12Desc',
        'Some features may connect to third-party services or content.'
      ),
      section12Desc2: t(
        'tcNewSection12Desc2',
        'Those services may have their own rules, availability, and policies.'
      ),
      section12Item1: t(
        'tcNewSection12Item1',
        'We are not responsible for third-party service interruptions or policy changes.'
      ),
      section12Item2: t(
        'tcNewSection12Item2',
        'Your use of third-party services may also be subject to their terms and privacy policies.'
      ),
      section12Item3: t(
        'tcNewSection12Item3',
        'External links and services are used at your own discretion.'
      ),
      section12Desc3: t(
        'tcNewSection12Desc3',
        'Examples may include travel platforms, payment channels, or external information pages.'
      ),

      section13Title: t('tcNewSection13Title', 'Privacy'),
      section13Item1: t(
        'tcNewSection13Item1',
        'Your use of our services is also governed by our Privacy Policy.'
      ),
      section13Item2: t(
        'tcNewSection13Item2',
        'By using the app, you agree to the collection and use of information as described in the Privacy Policy.'
      ),

      platformTitle: t('tcPlatformNoticeTitle', 'Platform Notice'),
      platformIntro: t(
        'tcPlatformNoticeIntro',
        'ZenoPay is a digital wallet platform and service application. It may provide wallet functions, profile management, mobile shopping, gift card access, top-up services, travel information, consulate information, and internal virtual card features.'
      ),
      platform2Title: t('tcPlatformNotice2Title', 'Virtual Internal Card'),
      platform2Item1: t(
        'tcPlatformNotice2Item1',
        'The ZenoPay virtual card is intended for supported internal or designated service use only.'
      ),
      platform3Title: t('tcPlatformNotice3Title', 'Account Information'),
      platform3Item1: t(
        'tcPlatformNotice3Item1',
        'Users are responsible for providing correct registration details such as full name, email, password, gender, city, optional phone number, and date of birth where required.'
      ),
      platform4Title: t('tcPlatformNotice4Title', 'App Features'),
      platform4Item1: t(
        'tcPlatformNotice4Item1',
        'Features may include send and receive, deposit and withdraw, profile settings, avatar upload, password change, account deletion, mobile shop, gift cards, top-up cards, travel information, and consulate information.'
      ),
      platform5Title: t('tcPlatformNotice5Title', 'User Responsibility'),
      platform5Item1: t(
        'tcPlatformNotice5Item1',
        'Users are responsible for protecting their account and reviewing submitted information before using services.'
      ),
      platform5Item2: t(
        'tcPlatformNotice5Item2',
        'Users must not use the app in a way that violates law, policy, or platform safety.'
      ),
      platform6Title: t('tcPlatformNotice6Title', 'Account Suspension'),
      platform6Desc: t(
        'tcPlatformNotice6Desc',
        'ZenoPay reserves the right to limit or suspend accounts in cases of suspicious, abusive, or unsafe activity.'
      ),
      platform8Title: t('tcPlatformNotice8Title', 'Severability'),
      platform8Desc: t(
        'tcPlatformNotice8Desc',
        'If any part of these Terms is found unenforceable, the remaining parts remain in effect.'
      ),

      supportTitle: t('tcSupportTitle', 'Support'),
      supportLine: t('tcSupportLine', 'Support email: info@zenopay.bond'),
      supportReply: t('tcSupportReply', 'We aim to respond within 48 hours.'),
    }),
    []
  );

  const renderSectionTitle = (num: number, title: string) => (
    <Text style={styles.sectionTitle}>
      {num}. {cleanTitle(title)}
    </Text>
  );

  const renderBullet = (text: string) => <Text style={styles.bulletItem}>• {text}</Text>;

  const renderPlatformSubTitle = (num: number, title: string) => (
    <Text style={[styles.sectionTitle, styles.platformSubTitle]}>
      {num}. {cleanTitle(title)}
    </Text>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EEF4FF', '#F7FAFF', '#EEF4FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.topGlowOne} />
        <View style={styles.topGlowTwo} />

        <View style={styles.header}>
          <TouchableOpacity onPress={goBackSafe} style={styles.backButton} activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={22} color="#1D4ED8" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{UI_TEXT.headerTitle}</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['#4B8DFF', '#2563EB', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />

            <View style={styles.heroIconWrap}>
              <Ionicons name="document-text-outline" size={28} color="#FFFFFF" />
            </View>

            <Text style={styles.mainTitle}>{UI_TEXT.mainTitle}</Text>
            <Text style={styles.lastUpdated}>{UI_TEXT.lastUpdated}</Text>
          </LinearGradient>

          <View style={styles.card}>
            <View style={styles.section}>
              <Text style={styles.introText}>{UI_TEXT.intro}</Text>
            </View>

            <View style={styles.section}>
              {renderSectionTitle(1, UI_TEXT.section1Title)}
              {renderBullet(UI_TEXT.section1Item1)}
              {renderBullet(UI_TEXT.section1Item2)}
              {renderBullet(UI_TEXT.section1Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(2, UI_TEXT.section2Title)}
              {renderBullet(UI_TEXT.section2Item2)}
              {renderBullet(UI_TEXT.section2Item3)}
              {renderBullet(UI_TEXT.section2Item4)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(3, UI_TEXT.section3Title)}
              {renderBullet(UI_TEXT.section3Item1)}
              {renderBullet(UI_TEXT.section3Item2)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(4, UI_TEXT.section4Title)}
              {renderBullet(UI_TEXT.section4Item1)}
              {renderBullet(UI_TEXT.section4Item2)}
              {renderBullet(UI_TEXT.section4Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(5, UI_TEXT.section5Title)}
              <Text style={styles.sectionText}>{UI_TEXT.section5Desc}</Text>
              {renderBullet(UI_TEXT.section5Item1)}
              {renderBullet(UI_TEXT.section5Item2)}
              {renderBullet(UI_TEXT.section5Item3)}
              <Text style={[styles.sectionText, styles.extraTopSpacing]}>
                {UI_TEXT.section5Desc2}
              </Text>
            </View>

            <View style={styles.section}>
              {renderSectionTitle(6, UI_TEXT.section6Title)}
              {renderBullet(UI_TEXT.section6Item1)}
              {renderBullet(UI_TEXT.section6Item2)}
              {renderBullet(UI_TEXT.section6Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(7, UI_TEXT.section7Title)}
              {renderBullet(UI_TEXT.section7Item1)}
              {renderBullet(UI_TEXT.section7Item2)}
              {renderBullet(UI_TEXT.section7Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(8, UI_TEXT.section8Title)}
              {renderBullet(UI_TEXT.section8Item1)}
              {renderBullet(UI_TEXT.section8Item2)}
              {renderBullet(UI_TEXT.section8Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(9, UI_TEXT.section9Title)}
              {renderBullet(UI_TEXT.section9Item1)}
              {renderBullet(UI_TEXT.section9Item2)}
              {renderBullet(UI_TEXT.section9Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(10, UI_TEXT.section10Title)}
              <Text style={styles.sectionText}>{UI_TEXT.section10Desc}</Text>
              {renderBullet(UI_TEXT.section10Item1)}
              {renderBullet(UI_TEXT.section10Item2)}
              {renderBullet(UI_TEXT.section10Item3)}
              {renderBullet(UI_TEXT.section10Item4)}
              <Text style={[styles.sectionText, styles.extraTopSpacing]}>
                {UI_TEXT.section10Desc2}
              </Text>
            </View>

            <View style={styles.section}>
              {renderSectionTitle(11, UI_TEXT.section11Title)}
              {renderBullet(UI_TEXT.section11Item1)}
              {renderBullet(UI_TEXT.section11Item2)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(12, UI_TEXT.section12Title)}
              <Text style={styles.sectionText}>{UI_TEXT.section12Desc}</Text>
              <Text style={[styles.sectionText, styles.extraTopSpacing]}>
                {UI_TEXT.section12Desc2}
              </Text>
              {renderBullet(UI_TEXT.section12Item1)}
              {renderBullet(UI_TEXT.section12Item2)}
              {renderBullet(UI_TEXT.section12Item3)}
              <Text style={[styles.sectionText, styles.extraTopSpacing]}>
                {UI_TEXT.section12Desc3}
              </Text>
            </View>

            <View style={styles.section}>
              {renderSectionTitle(13, UI_TEXT.section13Title)}
              {renderBullet(UI_TEXT.section13Item1)}
              {renderBullet(UI_TEXT.section13Item2)}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{cleanTitle(UI_TEXT.platformTitle)}</Text>
              <Text style={styles.sectionText}>{UI_TEXT.platformIntro}</Text>

              {renderPlatformSubTitle(2, UI_TEXT.platform2Title)}
              {renderBullet(UI_TEXT.platform2Item1)}

              {renderPlatformSubTitle(3, UI_TEXT.platform3Title)}
              {renderBullet(UI_TEXT.platform3Item1)}

              {renderPlatformSubTitle(4, UI_TEXT.platform4Title)}
              {renderBullet(UI_TEXT.platform4Item1)}

              {renderPlatformSubTitle(5, UI_TEXT.platform5Title)}
              {renderBullet(UI_TEXT.platform5Item1)}
              {renderBullet(UI_TEXT.platform5Item2)}

              {renderPlatformSubTitle(6, UI_TEXT.platform6Title)}
              <Text style={styles.sectionText}>{UI_TEXT.platform6Desc}</Text>

              {renderPlatformSubTitle(8, UI_TEXT.platform8Title)}
              <Text style={styles.sectionText}>{UI_TEXT.platform8Desc}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{UI_TEXT.supportTitle}</Text>

              <View style={styles.supportBox}>
                <View style={styles.supportIcon}>
                  <Ionicons name="mail-outline" size={18} color="#2563EB" />
                </View>

                <View style={styles.supportTextWrap}>
                  <Text style={styles.supportText}>{UI_TEXT.supportLine}</Text>
                  <Text style={styles.supportSubText}>{UI_TEXT.supportReply}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: 28 }} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF4FF',
  },

  gradient: {
    flex: 1,
  },

  topGlowOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(37,99,235,0.08)',
    top: -40,
    left: -70,
  },
  topGlowTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(37,99,235,0.06)',
    top: 90,
    right: -50,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 42,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D9E5F6',
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E5F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7DA8E6',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },

  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },

  heroCard: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#7DA8E6',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  lastUpdated: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '700',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D9E5F6',
    shadowColor: '#7DA8E6',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  section: {
    marginBottom: 22,
  },
  introText: {
    fontSize: 14.5,
    lineHeight: 24,
    color: '#0F172A',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
    color: '#0F172A',
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 23,
    color: '#334155',
    fontWeight: '700',
  },
  bulletItem: {
    fontSize: 14,
    lineHeight: 24,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 7,
  },
  extraTopSpacing: {
    marginTop: 10,
  },
  platformSubTitle: {
    marginTop: 14,
  },

  supportBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#EAF2FF',
    borderWidth: 1,
    borderColor: '#D9E5F6',
  },
  supportIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E5F6',
    marginRight: 12,
  },
  supportTextWrap: {
    flex: 1,
  },
  supportText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  supportSubText: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
});