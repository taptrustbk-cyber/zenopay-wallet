import React, { useMemo, useRef } from 'react';
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

export default function TermsConditionsScreen() {
  const router = useRouter();
  const goingBackRef = useRef(false);
  const isRTL = I18nManager.isRTL;

  const goBackSafe = () => {
    if (goingBackRef.current) return;
    goingBackRef.current = true;
    router.back();
    setTimeout(() => {
      goingBackRef.current = false;
    }, 700);
  };

  const t = (key: string, fallback: string) => {
    try {
      const val = i18n.t(key) as unknown;
      if (!val || typeof val !== 'string') return fallback;

      const str = val.trim();
      const lower = str.toLowerCase();

      const looksMissing =
        !str ||
        lower.includes('missing "') ||
        lower.includes('missing translation') ||
        lower.includes('" translation') ||
        str === key ||
        str.includes(`"${key}"`);

      return looksMissing ? fallback : str;
    } catch {
      return fallback;
    }
  };

  const UI_TEXT = useMemo(
    () => ({
      headerTitle: t('terms.headerTitle', 'Terms & Conditions'),

      mainTitle: t('terms.mainTitle', 'Terms & Conditions'),
      lastUpdated: t('terms.lastUpdated', 'Last updated: March 28, 2026'),
      intro: t(
        'terms.intro',
        'Welcome to SwedBank. By creating an account or using the app, you agree to these Terms and Conditions. Please read them carefully.'
      ),

      section1Title: t('terms.section1Title', 'Acceptance of Terms'),
      section1Item1: t('terms.section1Item1', 'By creating an account or using the app, you agree to these Terms and Conditions.'),
      section1Item2: t('terms.section1Item2', 'You must be at least 18 years old to use SwedBank.'),
      section1Item3: t('terms.section1Item3', 'You agree to provide accurate and complete information.'),

      section2Title: t('terms.section2Title', 'Account Registration and Security'),
      section2Item1: t('terms.section2Item1', 'You are responsible for keeping your login details and password secure.'),
      section2Item2: t('terms.section2Item2', 'You must notify us if you believe your account has been accessed without permission.'),
      section2Item3: t('terms.section2Item3', 'One personal account per user may be allowed for certain services or features.'),

      section3Title: t('terms.section3Title', 'Services Available in the App'),
      section3Item1: t('terms.section3Item1', 'SwedBank may provide wallet-related services such as deposit, withdraw, send, receive, and transaction history.'),
      section3Item2: t('terms.section3Item2', 'The app may also include mobile shop, gift cards, top-up cards, travel information, consulate information, and internal virtual card features.'),
      section3Item3: t('terms.section3Item3', 'Some services, features, or payment methods may vary depending on account status, region, or app updates.'),

      section4Title: t('terms.section4Title', 'Profile and Account Information'),
      section4Item1: t('terms.section4Item1', 'You may provide information such as full name, email, city, country, phone number, gender, date of birth, and profile photo.'),
      section4Item2: t('terms.section4Item2', 'You are responsible for making sure the information you submit is correct and up to date.'),
      section4Item3: t('terms.section4Item3', 'You must not use false, misleading, or another person’s information.'),

      section5Title: t('terms.section5Title', 'Payments, Wallet, and Fees'),
      section5Desc: t('terms.section5Desc', 'Some services may include fees or payment conditions shown inside the app.'),
      section5Item1: t('terms.section5Item1', 'You are responsible for reviewing payment details before confirming any action.'),
      section5Item2: t('terms.section5Item2', 'Completed wallet actions or purchases may be final unless otherwise stated inside the app or required by law.'),
      section5Item3: t('terms.section5Item3', 'Wallet balances, fees, prices, and availability may change from time to time.'),

      section6Title: t('terms.section6Title', 'Virtual Card'),
      section6Item1: t('terms.section6Item1', 'SwedBank may provide an internal virtual card feature for supported services.'),
      section6Item2: t('terms.section6Item2', 'Virtual card creation may include a one-time creation fee such as 25,000 SEK if shown in the app.'),
      section6Item3: t('terms.section6Item3', 'Certain users may be limited to one virtual card per account.'),

      section7Title: t('terms.section7Title', 'Mobile Shop, Gift Cards, and Top-Up'),
      section7Item1: t('terms.section7Item1', 'Product names, images, prices, stock, installment options, and delivery information may change or be updated inside the app.'),
      section7Item2: t('terms.section7Item2', 'You are responsible for checking product details before placing an order.'),
      section7Item3: t('terms.section7Item3', 'Orders may be reviewed, delayed, completed, or cancelled depending on availability, account status, payment status, or safety checks.'),

      section8Title: t('terms.section8Title', 'Location and City Suggestion'),
      section8Desc: t('terms.section8Desc', 'If you allow location access, the app may use it only to help suggest your city in the mobile shop page. You may also enter your city manually.'),

      section9Title: t('terms.section9Title', 'Account Protection and Safety Checks'),
      section9Item1: t('terms.section9Item1', 'To help protect accounts and reduce misuse, we may request additional information such as a selfie or document images in some situations.'),
      section9Item2: t('terms.section9Item2', 'Submitting additional information does not guarantee account approval, access to a feature, or uninterrupted service.'),
      section9Item3: t('terms.section9Item3', 'You must not submit false, edited, or misleading information.'),

      section10Title: t('terms.section10Title', 'Prohibited Activities'),
      section10Item1: t('terms.section10Item1', 'You must not use the app for fraud, abuse, unlawful activity, or attempts to bypass platform safety.'),
      section10Item2: t('terms.section10Item2', 'You must not interfere with the app, servers, payment flows, security systems, or other users.'),
      section10Item3: t('terms.section10Item3', 'You must not misuse promotions, orders, balances, or system errors.'),

      section11Title: t('terms.section11Title', 'Suspension, Restriction, and Termination'),
      section11Item1: t('terms.section11Item1', 'We may suspend, restrict, review, or close accounts when suspicious, unsafe, abusive, or policy-violating activity is detected.'),
      section11Item2: t('terms.section11Item2', 'We may also limit access to some features while a review or security check is in progress.'),
      section11Item3: t('terms.section11Item3', 'Some records may be kept for operational, safety, support, or legal reasons.'),

      section12Title: t('terms.section12Title', 'Third-Party Services'),
      section12Item1: t('terms.section12Item1', 'Some app features may connect to third-party services, providers, or information sources.'),
      section12Item2: t('terms.section12Item2', 'Those services may have their own rules, privacy policies, availability, and limitations.'),
      section12Item3: t('terms.section12Item3', 'We are not responsible for interruptions, changes, or losses caused by third-party services beyond our reasonable control.'),

      section13Title: t('terms.section13Title', 'Limitation of Liability'),
      section13Item1: t('terms.section13Item1', 'We aim to provide a reliable service, but we do not guarantee that the app will always be uninterrupted, error-free, or available at all times.'),
      section13Item2: t('terms.section13Item2', 'To the extent allowed by law, SwedBank is not responsible for indirect or unexpected losses caused by outages, delays, external providers, user mistakes, or events outside our reasonable control.'),
      section13Item3: t('terms.section13Item3', 'Your use of the app is at your own responsibility, subject to applicable law.'),

      section14Title: t('terms.section14Title', 'Privacy'),
      section14Item1: t('terms.section14Item1', 'Your use of the app is also subject to our Privacy Policy.'),
      section14Item2: t('terms.section14Item2', 'By using the app, you agree to how information is collected, used, and protected as described in the Privacy Policy.'),

      section15Title: t('terms.section15Title', 'Changes to These Terms'),
      section15Item1: t('terms.section15Item1', 'We may update these Terms and Conditions from time to time.'),
      section15Item2: t('terms.section15Item2', 'If we update them, the latest version will be shown in the app with a revised last updated date.'),
      section15Item3: t('terms.section15Item3', 'Your continued use of the app after changes means you accept the updated terms.'),

      section16Title: t('terms.section16Title', 'Contact and Support'),
      supportLine: t('terms.supportLine', 'Support email: info@swedbank.se'),
      supportReply: t('terms.supportReply', 'We aim to respond as soon as reasonably possible.'),
    }),
    []
  );

  const renderSectionTitle = (num: number, title: string) => (
    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
      {num}. {title}
    </Text>
  );

  const renderBullet = (text: string) => (
    <View style={[styles.bulletRow, isRTL && styles.bulletRowRTL]}>
      <Text style={[styles.bulletDot, isRTL && styles.bulletDotRTL]}>•</Text>
      <Text style={[styles.bulletItem, isRTL && styles.textRTL]}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F4F7FB', '#FFFFFF', '#F4F7FB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.topGlowOne} />
        <View style={styles.topGlowTwo} />

        <View style={styles.header}>
          <TouchableOpacity onPress={goBackSafe} style={styles.backButton} activeOpacity={0.85}>
            <Ionicons
              name={isRTL ? 'arrow-forward' : 'arrow-back'}
              size={22}
              color="#0A1F45"
            />
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
            colors={['#1E4280', '#0F2A5C', '#0A1F45']}
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
              <Text style={[styles.introText, isRTL && styles.textRTL]}>
                {UI_TEXT.intro}
              </Text>
            </View>

            <View style={styles.section}>
              {renderSectionTitle(1, UI_TEXT.section1Title)}
              {renderBullet(UI_TEXT.section1Item1)}
              {renderBullet(UI_TEXT.section1Item2)}
              {renderBullet(UI_TEXT.section1Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(2, UI_TEXT.section2Title)}
              {renderBullet(UI_TEXT.section2Item1)}
              {renderBullet(UI_TEXT.section2Item2)}
              {renderBullet(UI_TEXT.section2Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(3, UI_TEXT.section3Title)}
              {renderBullet(UI_TEXT.section3Item1)}
              {renderBullet(UI_TEXT.section3Item2)}
              {renderBullet(UI_TEXT.section3Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(4, UI_TEXT.section4Title)}
              {renderBullet(UI_TEXT.section4Item1)}
              {renderBullet(UI_TEXT.section4Item2)}
              {renderBullet(UI_TEXT.section4Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(5, UI_TEXT.section5Title)}
              <Text style={[styles.sectionText, isRTL && styles.textRTL]}>{UI_TEXT.section5Desc}</Text>
              {renderBullet(UI_TEXT.section5Item1)}
              {renderBullet(UI_TEXT.section5Item2)}
              {renderBullet(UI_TEXT.section5Item3)}
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
              <Text style={[styles.sectionText, isRTL && styles.textRTL]}>{UI_TEXT.section8Desc}</Text>
            </View>

            <View style={styles.section}>
              {renderSectionTitle(9, UI_TEXT.section9Title)}
              {renderBullet(UI_TEXT.section9Item1)}
              {renderBullet(UI_TEXT.section9Item2)}
              {renderBullet(UI_TEXT.section9Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(10, UI_TEXT.section10Title)}
              {renderBullet(UI_TEXT.section10Item1)}
              {renderBullet(UI_TEXT.section10Item2)}
              {renderBullet(UI_TEXT.section10Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(11, UI_TEXT.section11Title)}
              {renderBullet(UI_TEXT.section11Item1)}
              {renderBullet(UI_TEXT.section11Item2)}
              {renderBullet(UI_TEXT.section11Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(12, UI_TEXT.section12Title)}
              {renderBullet(UI_TEXT.section12Item1)}
              {renderBullet(UI_TEXT.section12Item2)}
              {renderBullet(UI_TEXT.section12Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(13, UI_TEXT.section13Title)}
              {renderBullet(UI_TEXT.section13Item1)}
              {renderBullet(UI_TEXT.section13Item2)}
              {renderBullet(UI_TEXT.section13Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(14, UI_TEXT.section14Title)}
              {renderBullet(UI_TEXT.section14Item1)}
              {renderBullet(UI_TEXT.section14Item2)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(15, UI_TEXT.section15Title)}
              {renderBullet(UI_TEXT.section15Item1)}
              {renderBullet(UI_TEXT.section15Item2)}
              {renderBullet(UI_TEXT.section15Item3)}
            </View>

            <View style={styles.section}>
              {renderSectionTitle(16, UI_TEXT.section16Title)}

              <View style={[styles.supportBox, isRTL && styles.supportBoxRTL]}>
                <View style={[styles.supportIcon, isRTL && styles.supportIconRTL]}>
                  <Ionicons name="mail-outline" size={18} color="#0F2A5C" />
                </View>

                <View style={styles.supportTextWrap}>
                  <Text style={[styles.supportText, isRTL && styles.textRTL]}>
                    {UI_TEXT.supportLine}
                  </Text>
                  <Text style={[styles.supportSubText, isRTL && styles.textRTL]}>
                    {UI_TEXT.supportReply}
                  </Text>
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
    backgroundColor: '#F4F7FB',
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
    paddingTop: Platform.OS === 'ios' ? 55 : 40,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A8B8CC',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F1B33',
    textAlign: 'center',
    marginHorizontal: 10,
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
    shadowColor: '#A8B8CC',
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
    padding: 20,
    borderWidth: 1,
    borderColor: '#E3E8F0',
    shadowColor: '#A8B8CC',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  section: {
    marginBottom: 20,
  },
  introText: {
    fontSize: 14.5,
    lineHeight: 24,
    color: '#0F1B33',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 4,
    color: '#0F1B33',
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 23,
    color: '#334155',
    fontWeight: '700',
    marginBottom: 6,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 4,
  },
  bulletRowRTL: {
    flexDirection: 'row-reverse',
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 22,
    color: '#0F2A5C',
    marginRight: 10,
    marginTop: 1,
    fontWeight: '900',
  },
  bulletDotRTL: {
    marginRight: 0,
    marginLeft: 10,
  },
  bulletItem: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#0F1B33',
    fontWeight: '700',
  },
  textRTL: {
    textAlign: 'right',
  },

  supportBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#E8EEF6',
    borderWidth: 1,
    borderColor: '#E3E8F0',
    marginTop: 8,
  },
  supportBoxRTL: {
    flexDirection: 'row-reverse',
  },
  supportIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8F0',
    marginRight: 12,
  },
  supportIconRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  supportTextWrap: {
    flex: 1,
  },
  supportText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0F1B33',
  },
  supportSubText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#5B6B82',
  },
});