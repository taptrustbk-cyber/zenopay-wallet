import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

type TopupOrder = {
  id: string;
  user_id: string;
  card_title: string | null;
  provider: string | null;
  amount_iqd: number | null;
  price_usd: number | null;
  price_iqd: number | null;
  status: string | null;
  pin_code: string | null;
  notes: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  user_city: string | null;
  created_at: string | null;
};

function formatIQD(value?: number | null) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default function AdminTopupOrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<TopupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<Record<string, { status: string; pin_code: string; notes: string }>>({});

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('topup_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data || []) as TopupOrder[];
      setOrders(rows);

      const next: Record<string, { status: string; pin_code: string; notes: string }> = {};
      rows.forEach((row) => {
        next[row.id] = {
          status: row.status || 'pending',
          pin_code: row.pin_code || '',
          notes: row.notes || '',
        };
      });
      setEditState(next);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((item) =>
      item.card_title?.toLowerCase().includes(q) ||
      item.provider?.toLowerCase().includes(q) ||
      item.user_name?.toLowerCase().includes(q) ||
      item.user_email?.toLowerCase().includes(q) ||
      item.user_city?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const setField = (id: string, key: 'status' | 'pin_code' | 'notes', value: string) => {
    setEditState((prev) => ({
      ...prev,
      [id]: {
        status: prev[id]?.status || 'pending',
        pin_code: prev[id]?.pin_code || '',
        notes: prev[id]?.notes || '',
        [key]: value,
      },
    }));
  };

  const handleSave = async (order: TopupOrder) => {
    try {
      const draft = editState[order.id];
      if (!draft) return;

      if (draft.status === 'success' && !draft.pin_code.trim()) {
        Alert.alert('Error', 'PIN code is required when status is success.');
        return;
      }

      setSavingId(order.id);

      const { error } = await supabase
        .from('topup_orders')
        .update({
          status: draft.status,
          pin_code: draft.pin_code.trim() || null,
          notes: draft.notes.trim() || null,
        })
        .eq('id', order.id);

      if (error) throw error;

      await fetchOrders();
      Alert.alert('Success', 'Order updated successfully.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not update order.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={22} color="#5A4700" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Top-Up Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <Text style={styles.sectionTitle}>Orders</Text>
          <TextInput
            style={styles.input}
            placeholder="Search by name, email, city, provider..."
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <ActivityIndicator color="#B08900" />
        ) : (
          filteredOrders.map((order) => {
            const draft = editState[order.id] || { status: 'pending', pin_code: '', notes: '' };

            return (
              <View key={order.id} style={styles.orderCard}>
                <Text style={styles.orderTitle}>{order.card_title || 'Unknown Card'}</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>User:</Text>
                  <Text style={styles.infoValue}>{order.user_name || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{order.user_email || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{order.user_phone || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>City:</Text>
                  <Text style={styles.infoValue}>{order.user_city || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Provider:</Text>
                  <Text style={styles.infoValue}>{order.provider || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Amount:</Text>
                  <Text style={styles.infoValue}>{formatIQD(order.amount_iqd)} IQD</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Price:</Text>
                  <Text style={styles.infoValue}>{formatIQD(order.price_iqd)} IQD / ${order.price_usd || 0}</Text>
                </View>

                <Text style={styles.inputLabel}>Status</Text>
                <View style={styles.statusRow}>
                  {['pending', 'success', 'cancelled'].map((status) => {
                    const active = draft.status === status;
                    return (
                      <TouchableOpacity
                        key={status}
                        onPress={() => setField(order.id, 'status', status)}
                        style={[styles.statusBtn, active && styles.statusBtnActive]}
                      >
                        <Text style={[styles.statusBtnText, active && styles.statusBtnTextActive]}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.inputLabel}>PIN Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter pin code..."
                  value={draft.pin_code}
                  onChangeText={(v) => setField(order.id, 'pin_code', v)}
                />

                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  placeholder="Admin notes..."
                  value={draft.notes}
                  onChangeText={(v) => setField(order.id, 'notes', v)}
                />

                <TouchableOpacity
                  onPress={() => handleSave(order)}
                  style={styles.saveButton}
                  disabled={savingId === order.id}
                >
                  {savingId === order.id ? (
                    <ActivityIndicator color="#5A4700" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF8' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF9E8',
    borderBottomWidth: 1,
    borderBottomColor: '#F2E4B4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#F0E1AF', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', marginHorizontal: 10, fontSize: 18, fontWeight: '900', color: '#2A2412' },
  contentContainer: { padding: 16, paddingBottom: 30 },
  topCard: {
    borderRadius: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EFE3B3', padding: 16, marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#211B10', marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: '#6B6452', marginBottom: 6, marginTop: 10 },
  input: {
    minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff',
    paddingHorizontal: 14, fontSize: 14, color: '#111827', marginBottom: 10,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top', paddingTop: 14 },
  orderCard: {
    borderRadius: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EFE3B3',
    padding: 16, marginBottom: 14,
  },
  orderTitle: { fontSize: 18, fontWeight: '900', color: '#211B10', marginBottom: 12 },
  infoRow: { flexDirection: 'row', marginBottom: 6 },
  infoLabel: { width: 80, fontSize: 13, fontWeight: '800', color: '#8A7B49' },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '700', color: '#111827' },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statusBtn: {
    flex: 1, height: 42, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  statusBtnActive: { backgroundColor: '#FDE68A', borderColor: '#F4D461' },
  statusBtnText: { fontSize: 13, fontWeight: '800', color: '#374151' },
  statusBtnTextActive: { color: '#5A4700' },
  saveButton: {
    marginTop: 12, height: 50, borderRadius: 16, backgroundColor: '#FDE68A',
    borderWidth: 1, borderColor: '#F4D461', alignItems: 'center', justifyContent: 'center',
  },
  saveButtonText: { fontSize: 15, fontWeight: '900', color: '#5A4700' },
});
