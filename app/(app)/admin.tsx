import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  LogOut,
  LayoutDashboard,
  Smartphone,
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  PlusCircle,
  MinusCircle,
  FileText,
  ReceiptText,
  CreditCard,
  ClipboardList,
} from 'lucide-react-native';

export const options = { headerShown: false };

const ADMIN_EMAILS = ['taptrust.bk@gmail.com'];

const UI = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardSoft: '#F1F5F9',
  text: '#0F172A',
  text2: '#64748B',
  border: '#E2E8F0',

  green: '#16A34A',
  greenSoft: '#DCFCE7',

  blue: '#2563EB',
  blueSoft: '#DBEAFE',

  red: '#DC2626',
  redSoft: '#FEE2E2',

  gold: '#B45309',
  goldSoft: '#FEF3C7',

  shadow: 'rgba(15, 23, 42, 0.08)',
};

type MenuItemProps = {
  label: string;
  subLabel: string;
  onPress: () => void;
  icon: React.ReactNode;
  tone?: 'green' | 'blue' | 'gold';
};

export default function AdminScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email || '');

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.deniedWrap}>
          <Text style={styles.deniedTitle}>Access Denied</Text>
          <Text style={styles.deniedText}>You don&apos;t have permission to access this page.</Text>

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const MenuItem = ({ label, subLabel, onPress, icon, tone = 'blue' }: MenuItemProps) => {
    const iconBg =
      tone === 'green' ? UI.greenSoft : tone === 'gold' ? UI.goldSoft : UI.blueSoft;

    const glowColor =
      tone === 'green' ? UI.green : tone === 'gold' ? UI.gold : UI.blue;

    return (
      <TouchableOpacity style={styles.menuCard} onPress={onPress} activeOpacity={0.9}>
        <View style={[styles.menuIconWrap, { backgroundColor: iconBg }]}>
          {icon}
        </View>

        <Text style={styles.menuTitle} numberOfLines={2}>
          {label}
        </Text>

        <Text style={styles.menuSub} numberOfLines={2}>
          {subLabel}
        </Text>

        <View style={[styles.menuGlow, { backgroundColor: glowColor, opacity: 0.08 }]} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.push('/dashboard' as any)}
          activeOpacity={0.85}
        >
          <Home size={18} color={UI.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSub}>Control center</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() =>
            Alert.alert('Logout', 'Are you sure you want to logout?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: signOut },
            ])
          }
          activeOpacity={0.9}
        >
          <LogOut size={15} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>ADMIN</Text>
          </View>

          <Text style={styles.heroTitle}>Welcome to your admin menu</Text>
          <Text style={styles.heroText}>
            Open each section in a separate page. This screen is only for navigation and design.
          </Text>
        </View>

        <View style={styles.grid}>
          <MenuItem
            label="Dashboard"
            subLabel="Overview & stats"
            onPress={() => router.push('/dashboardadmin' as any)}
            icon={<LayoutDashboard size={18} color={UI.blue} />}
            tone="blue"
          />

          <MenuItem
            label="Mobile Products"
            subLabel="Shop products"
            onPress={() => router.push('/mobileproductsadmin' as any)}
            icon={<Smartphone size={18} color={UI.green} />}
            tone="green"
          />

          <MenuItem
            label="SIM Cards"
            subLabel="Add, edit and manage mobile cards"
            onPress={() => router.push('/admin-sim-cards' as any)}
            icon={<CreditCard size={18} color={UI.gold} />}
            tone="gold"
          />

          <MenuItem
            label="Top-Up Orders"
            subLabel="Review orders and add PIN codes"
            onPress={() => router.push('/admin-topup-orders' as any)}
            icon={<ClipboardList size={18} color={UI.gold} />}
            tone="gold"
          />

          <MenuItem
            label="Account Approval"
            subLabel="Approve users"
            onPress={() => router.push('/accountapprovaladmin' as any)}
            icon={<ShieldCheck size={18} color={UI.blue} />}
            tone="blue"
          />

          <MenuItem
            label="Deposits"
            subLabel="Deposit requests"
            onPress={() => router.push('/depositsadmin' as any)}
            icon={<ArrowDownToLine size={18} color={UI.green} />}
            tone="green"
          />

          <MenuItem
            label="Withdrawals"
            subLabel="Withdraw requests"
            onPress={() => router.push('/withdrawalsadmin' as any)}
            icon={<ArrowUpFromLine size={18} color={UI.blue} />}
            tone="blue"
          />

          <MenuItem
            label="Add Balance"
            subLabel="Increase wallet"
            onPress={() => router.push('/addbalanceadmin' as any)}
            icon={<PlusCircle size={18} color={UI.green} />}
            tone="green"
          />

          <MenuItem
            label="Withdraw Balance"
            subLabel="Decrease wallet"
            onPress={() => router.push('/withdrawbalanceadmin' as any)}
            icon={<MinusCircle size={18} color={UI.blue} />}
            tone="blue"
          />

          <MenuItem
            label="KYC Document"
            subLabel="User verification"
            onPress={() => router.push('/kycdocumentsadmin' as any)}
            icon={<FileText size={18} color={UI.green} />}
            tone="green"
          />

          <MenuItem
            label="Transactions"
            subLabel="History & logs"
            onPress={() => router.push('/transactionsadmin' as any)}
            icon={<ReceiptText size={18} color={UI.blue} />}
            tone="blue"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.bg,
  },

  header: {
    backgroundColor: UI.card,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: UI.cardSoft,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: UI.text,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 11,
    color: UI.text2,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.red,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
  },
  logoutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },

  heroCard: {
    backgroundColor: UI.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 14,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: UI.greenSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  heroBadgeText: {
    color: UI.green,
    fontSize: 11,
    fontWeight: '900',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 6,
  },
  heroText: {
    fontSize: 13,
    lineHeight: 19,
    color: UI.text2,
    fontWeight: '600',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  menuCard: {
    width: '48.3%',
    minHeight: 128,
    backgroundColor: UI.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: UI.text,
    marginBottom: 4,
  },
  menuSub: {
    fontSize: 11,
    lineHeight: 16,
    color: UI.text2,
    fontWeight: '700',
    maxWidth: '92%',
  },
  menuGlow: {
    position: 'absolute',
    right: -14,
    bottom: -14,
    width: 70,
    height: 70,
    borderRadius: 999,
  },

  deniedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deniedTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: UI.red,
    marginBottom: 10,
  },
  deniedText: {
    fontSize: 14,
    color: UI.text2,
    textAlign: 'center',
    marginBottom: 18,
  },
  backBtn: {
    backgroundColor: UI.blue,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});