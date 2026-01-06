import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import i18n from '@/lib/i18n';

export default function TermsConditionsScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{i18n.t('termsConditions')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerSection, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.mainTitle, { color: theme.colors.text }]}>Terms & Conditions</Text>
          <Text style={[styles.lastUpdated, { color: theme.colors.textSecondary }]}>Last Updated: January 2026</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.introText, { color: theme.colors.textSecondary }]}>
            Welcome to ZenoPay (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;). By accessing or using the ZenoPay application, website, and dashboard (collectively, the &quot;Service&quot;), you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>1. Eligibility</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• You must be at least 18 years old to use ZenoPay.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• By creating an account, you confirm that all information you provide is accurate and complete.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• You are responsible for complying with all applicable local laws and regulations.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>2. Account Registration & Security</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• To use ZenoPay, you must create an account using a valid email address.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• You are responsible for maintaining the confidentiality of your login credentials.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Any activity performed through your account is considered authorized by you.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• You must notify us immediately if you suspect unauthorized access.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>3. Login, Signup & Email Confirmation</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Users must complete the signup process and verify their email address before accessing full features.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• We may restrict or suspend accounts that fail verification or provide false information.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>4. Reset Password</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• ZenoPay provides a password reset feature via email.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• You are responsible for ensuring that your email address is secure.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• We are not liable for losses caused by unauthorized access due to compromised email accounts.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>5. Wallet Services</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>ZenoPay provides a digital wallet that allows users to:</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Add money</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Withdraw money</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Send money to other users</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>All wallet balances are shown for informational purposes and may be subject to verification.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>6. Add Money</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• You may add funds using supported payment methods.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Added funds may be subject to processing times and verification checks.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• We reserve the right to reject or delay transactions for security or compliance reasons.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>7. Withdraw Money</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Withdrawals are subject to identity verification and available balance.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Processing times may vary depending on the withdrawal method.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• ZenoPay is not responsible for delays caused by third-party payment providers.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>8. Send Money</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Users can send money to other ZenoPay users using valid recipient details.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Once a transaction is confirmed, it cannot be reversed.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• You are responsible for verifying recipient information before sending funds.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>9. Fees</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Some services may include transaction or processing fees.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• All applicable fees will be displayed before confirming a transaction.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Fees are non-refundable unless required by law.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>10. Prohibited Activities</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>You agree NOT to use ZenoPay for:</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Fraud, money laundering, or illegal activities</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Unauthorized access or hacking attempts</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Abusive, harmful, or deceptive behavior</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Violating any applicable laws or regulations</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>We reserve the right to suspend or terminate accounts involved in prohibited activities.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>11. Account Suspension & Termination</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• We may suspend or terminate your account at any time if we suspect violations of these Terms.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Remaining balances may be held temporarily for investigation or legal compliance.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>12. Limitation of Liability</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>ZenoPay is provided on an &quot;as is&quot; and &quot;as available&quot; basis.</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>We are not liable for:</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Loss of funds due to user error</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Service interruptions</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Delays caused by third-party services</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary, marginTop: 8 }]}>To the maximum extent permitted by law, ZenoPay shall not be liable for indirect or consequential damages.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>13. Privacy</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Your personal data is handled according to our Privacy Policy.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• By using ZenoPay, you consent to data processing required to provide our services.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>14. Changes to Terms</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• We may update these Terms & Conditions from time to time.</Text>
          <Text style={[styles.bulletItem, { color: theme.colors.textSecondary }]}>• Continued use of the Service after updates means you accept the revised terms.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>15. Contact & Support</Text>
          <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>If you have questions, issues, or need support, please contact us:</Text>
          <View style={[styles.contactBox, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="mail" size={20} color={theme.colors.primary} />
            <Text style={[styles.contactEmail, { color: theme.colors.primary }]}>info@zenopay.bond</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  content: {
    flex: 1,
  },
  headerSection: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center',
    lineHeight: 26,
  },
  lastUpdated: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  introText: {
    fontSize: 15,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  bulletList: {
    marginTop: 12,
    paddingLeft: 8,
  },
  bulletItem: {
    fontSize: 15,
    lineHeight: 26,
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  contactEmail: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
