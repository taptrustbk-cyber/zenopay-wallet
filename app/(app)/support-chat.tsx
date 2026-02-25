// /(app)/ai-chat.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import i18n, { getCurrentLanguage } from '@/lib/i18n';

type Role = 'user' | 'assistant';
type Lang = 'en' | 'ar' | 'ckb' | 'kmr';

type ChatMsg = {
  id: string;
  role: Role;
  text: string;
  lang: Lang;
  created_at: string;
};

const UI = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111827',
  text2: '#6B7280',
  border: '#E5E7EB',
  green: '#16A34A',
  greenSoft: '#EAF7EF',
  inputBg: '#F9FAFB',
};

function normalizeLang(l: string): Lang {
  const v = (l || 'en').toLowerCase();
  if (v.includes('ar')) return 'ar';
  if (v.includes('ckb')) return 'ckb';
  if (v.includes('kmr')) return 'kmr';
  return 'en';
}

function uuidLike() {
  return `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function TypingDots() {
  const a1 = useRef(new Animated.Value(0.3)).current;
  const a2 = useRef(new Animated.Value(0.3)).current;
  const a3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(a1, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(a2, { toValue: 0.3, duration: 280, useNativeDriver: true }),
          Animated.timing(a3, { toValue: 0.3, duration: 280, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(a1, { toValue: 0.3, duration: 280, useNativeDriver: true }),
          Animated.timing(a2, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(a3, { toValue: 0.3, duration: 280, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(a1, { toValue: 0.3, duration: 280, useNativeDriver: true }),
          Animated.timing(a2, { toValue: 0.3, duration: 280, useNativeDriver: true }),
          Animated.timing(a3, { toValue: 1, duration: 280, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [a1, a2, a3]);

  return (
    <View style={styles.typingDotsRow}>
      <Animated.View style={[styles.dot, { opacity: a1 }]} />
      <Animated.View style={[styles.dot, { opacity: a2 }]} />
      <Animated.View style={[styles.dot, { opacity: a3 }]} />
    </View>
  );
}

export default function AiChatScreen() {
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState<string>('');
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [typing, setTyping] = useState<boolean>(false);

  const lang = useMemo(() => normalizeLang(getCurrentLanguage()), []);

  const listRef = useRef<FlatList<ChatMsg> | null>(null);

  // ✅ FIX: Do NOT use process.env.<URL> (invalid)
  // Option A: hardcode (works now)
  const functionUrl = useMemo(() => {
    const url = 'https://wzjnwgygmiznavrdgppo.supabase.co/functions/v1/supabase-functions-new-support_ai';
    return url;
  }, []);

  // ✅ Optional (better): use env variable
  // Put in .env:
  // EXPO_PUBLIC_SUPPORT_AI_URL=https://wzjnwgygmiznavrdgppo.supabase.co/functions/v1/supabase-functions-new-support_ai
  // then replace above with:
  // const functionUrl = useMemo(() => (process.env.EXPO_PUBLIC_SUPPORT_AI_URL || '').trim(), []);

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToEnd({ animated: true });
      } catch {}
    });
  };

  const loadHistory = async (sid: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('support_chat_messages')
        .select('id, role, text, lang, created_at')
        .eq('session_id', sid)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as any);
      setTimeout(scrollToEnd, 50);
    } catch (e) {
      console.error('Load chat history error:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        const { data: s } = await supabase
          .from('support_chat_sessions')
          .select('id, created_at')
          .order('created_at', { ascending: false })
          .limit(1);

        const last = s?.[0]?.id;
        if (last) {
          setSessionId(last);
          await loadHistory(last);
        } else {
          const hello: ChatMsg = {
            id: uuidLike(),
            role: 'assistant',
            lang,
            created_at: new Date().toISOString(),
            text:
              lang === 'kmr'
                ? 'سلاڤ 👋 من AI پشتگیریێ ZenoPay ـم. بپرسە هەر شتێک لسەر دانانا پارە، راکێشان، KYC، کارت…'
                : lang === 'ckb'
                ? 'سڵاو 👋 من پشتگیری AI ی ZenoPay ـم. پرسیار بکە لەسەر دانان، راکێشان، KYC، کارت…'
                : lang === 'ar'
                ? 'مرحباً 👋 أنا دعم ZenoPay الذكي. اسألني عن الإيداع، السحب، KYC، البطاقات…'
                : 'Hi 👋 I’m ZenoPay Support AI. Ask me about deposit, withdraw, KYC, cards…',
          };
          setMessages([hello]);
        }
      } catch (e) {
        console.error('Boot chat error:', e);
      }
    };

    boot();
  }, [lang]);

  const sendMessage = async () => {
    const msg = text.trim();
    if (!msg || sending) return;

    if (!functionUrl) {
      const warning: ChatMsg = {
        id: uuidLike(),
        role: 'assistant',
        lang,
        created_at: new Date().toISOString(),
        text:
          lang === 'kmr'
            ? 'URL ـێ function نەدیت. تکایە URL دروست بکە.'
            : lang === 'ckb'
            ? 'URL ـی function دانەنراوە.'
            : lang === 'ar'
            ? 'رابط الوظيفة غير مضبوط.'
            : 'Function URL is missing.',
      };
      setMessages((prev) => [
        ...prev,
        { id: uuidLike(), role: 'user', lang, created_at: new Date().toISOString(), text: msg },
        warning,
      ]);
      setText('');
      setTimeout(scrollToEnd, 30);
      return;
    }

    setSending(true);
    setTyping(true);

    const userLocal: ChatMsg = {
      id: uuidLike(),
      role: 'user',
      lang,
      created_at: new Date().toISOString(),
      text: msg,
    };

    setMessages((prev) => [...prev, userLocal]);
    setText('');
    setTimeout(scrollToEnd, 30);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;

      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-app-lang': lang,
        },
        body: JSON.stringify({
          message: msg,
          session_id: sessionId,
          lang,
        }),
      });

      // safer JSON parse
      const raw = await res.text();
      let json: any = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = { error: raw || 'Invalid JSON response' };
      }

      if (!res.ok) throw new Error(json?.error || 'Request failed');

      const sid = json?.session_id as string | undefined;
      if (sid && sid !== sessionId) setSessionId(sid);

      const answerText = String(json?.answer || '').trim();

      const botMsg: ChatMsg = {
        id: uuidLike(),
        role: 'assistant',
        lang,
        created_at: new Date().toISOString(),
        text:
          answerText ||
          (lang === 'kmr'
            ? 'ببورە، من نەتوانی جواب بدەم. تکایە دوبارە هەول بدە یان info@zenopay.bond پەیوەندی بکە.'
            : lang === 'ckb'
            ? 'ببورە، ناتوانم وەڵام بدەم. دووبارە هەوڵ بدە یان پەیوەندی بکە: info@zenopay.bond'
            : lang === 'ar'
            ? 'عذراً، لم أستطع الرد. جرّب مرة أخرى أو تواصل: info@zenopay.bond'
            : 'Sorry, I could not answer. Please try again or contact info@zenopay.bond'),
      };

      setMessages((prev) => [...prev, botMsg]);
      setTimeout(scrollToEnd, 60);

      if (sid) setTimeout(() => loadHistory(sid), 250);
    } catch (e: any) {
      console.error('Send chat error:', e);
      const errMsg: ChatMsg = {
        id: uuidLike(),
        role: 'assistant',
        lang,
        created_at: new Date().toISOString(),
        text:
          lang === 'kmr'
            ? `هەڵە: ${e?.message || 'Unknown'}\nئەگەر کێشە بەردەوامە، پەیوەندی بکە: info@zenopay.bond`
            : lang === 'ckb'
            ? `هەڵە: ${e?.message || 'Unknown'}\nپەیوەندی: info@zenopay.bond`
            : lang === 'ar'
            ? `خطأ: ${e?.message || 'Unknown'}\nتواصل: info@zenopay.bond`
            : `Error: ${e?.message || 'Unknown'}\nContact: info@zenopay.bond`,
      };
      setMessages((prev) => [...prev, errMsg]);
      setTimeout(scrollToEnd, 60);
    } finally {
      setTyping(false);
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: ChatMsg }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextBot]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={22} color={UI.green} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{i18n.t('supportChat') || 'Support Chat'}</Text>

        <View style={{ width: 28 }} />
      </View>

      <SafeAreaView style={styles.safe} edges={['bottom'] as any}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.listWrap}>
            {loadingHistory ? (
              <View style={styles.center}>
                <ActivityIndicator color={UI.green} />
              </View>
            ) : (
              <FlatList
                ref={(r) => (listRef.current = r)}
                data={messages}
                keyExtractor={(it) => it.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={scrollToEnd}
              />
            )}

            {typing ? (
              <View style={[styles.msgRow, styles.msgRowLeft, { paddingBottom: 6 }]}>
                <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                  <TypingDots />
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.composer}>
            <View style={styles.inputWrap}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={i18n.t('typeMessage') || 'Type a message...'}
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                multiline
                maxLength={1200}
              />
              <TouchableOpacity
                onPress={sendMessage}
                activeOpacity={0.9}
                disabled={sending || !text.trim()}
                style={[styles.sendBtn, (sending || !text.trim()) && { opacity: 0.5 }]}
              >
                {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>

            <View style={styles.helpRow}>
              <Ionicons name="mail" size={14} color={UI.green} />
              <Text style={styles.helpText}>
                {i18n.t('needHelp') || 'Need Help?'} <Text style={styles.helpEmail}>info@zenopay.bond</Text>
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.bg },
  flex: { flex: 1 },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 54 : 46,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
    backgroundColor: UI.bg,
  },
  backBtn: { padding: 6, borderRadius: 10 },
  headerTitle: { fontSize: 18, fontWeight: '900' as const, color: UI.text },

  listWrap: { flex: 1, backgroundColor: UI.bg },
  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  msgRow: { width: '100%', marginBottom: 10, flexDirection: 'row' },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },

  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  bubbleUser: {
    backgroundColor: UI.green,
    borderColor: UI.green,
    borderTopRightRadius: 6,
  },
  bubbleBot: {
    backgroundColor: '#FFFFFF',
    borderColor: UI.border,
    borderTopLeftRadius: 6,
  },
  msgText: { fontSize: 14.5, lineHeight: 20, fontWeight: '700' as const },
  msgTextUser: { color: '#FFFFFF' },
  msgTextBot: { color: UI.text },

  typingBubble: { paddingVertical: 12, paddingHorizontal: 14 },

  typingDotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#9CA3AF' },

  composer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: UI.border,
    backgroundColor: UI.bg,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: UI.inputBg,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 22,
    maxHeight: 120,
    fontSize: 15,
    color: UI.text,
    fontWeight: '700' as const,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: UI.green, alignItems: 'center', justifyContent: 'center' },

  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  helpText: { color: UI.text2, fontSize: 12.5, fontWeight: '700' as const },
  helpEmail: { color: UI.green, fontWeight: '900' as const },
});
