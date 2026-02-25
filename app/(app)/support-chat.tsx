import React, { useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const UI = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  text: '#111827',
  text2: '#6B7280',
  border: '#E5E7EB',
  green: '#47B08A',
  greenSoft: '#EAF7F1',
};

type Msg = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  ts: number;
};

export default function SupportChatScreen() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'm0',
      role: 'ai',
      text: 'Hi 👋 I’m ZenoPay Support. How can I help you today?',
      ts: Date.now(),
    },
  ]);

  const listRef = useRef<FlatList<Msg>>(null);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const send = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      ts: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // ✅ demo AI reply (replace later with real AI API)
    setTimeout(() => {
      const aiMsg: Msg = {
        id: `a-${Date.now()}`,
        role: 'ai',
        text: "Thanks! I got your message. (AI live can be connected here.)",
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      listRef.current?.scrollToEnd({ animated: true });
    }, 500);

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const renderItem = ({ item }: { item: Msg }) => {
    const mine = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, mine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleAi]}>
          <Text style={[styles.bubbleText, mine ? { color: '#fff' } : { color: UI.text }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={22} color={UI.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.supportIcon}>
            <Ionicons name="headset" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Support Chat</Text>
            <Text style={styles.headerSub}>Online • AI Assistant</Text>
          </View>
        </View>

        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* input */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type your message..."
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              multiline
            />
          </View>

          <TouchableOpacity
            onPress={send}
            activeOpacity={0.9}
            disabled={!canSend}
            style={[styles.sendBtn, !canSend && { opacity: 0.5 }]}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },

  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    paddingTop: Platform.OS === 'ios' ? 54 : 46,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginLeft: 10 },
  supportIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: UI.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '900' as const, color: UI.text },
  headerSub: { fontSize: 12, fontWeight: '700' as const, color: UI.text2, marginTop: 2 },

  listContent: { paddingHorizontal: 14, paddingVertical: 12, paddingBottom: 10 },

  bubbleRow: { flexDirection: 'row', marginBottom: 10 },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: UI.green,
    borderColor: UI.green,
    borderTopRightRadius: 6,
  },
  bubbleAi: {
    backgroundColor: '#FFFFFF',
    borderColor: UI.border,
    borderTopLeftRadius: 6,
  },
  bubbleText: { fontSize: 14, fontWeight: '700' as const, lineHeight: 18 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: UI.border,
    backgroundColor: '#FFFFFF',
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    maxHeight: 120,
  },
  input: { fontSize: 14, fontWeight: '700' as const, color: UI.text },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: UI.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
