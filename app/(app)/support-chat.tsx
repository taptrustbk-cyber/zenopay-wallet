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
  text: '#111827',
  text2: '#6B7280',
  border: '#E5E7EB',
  green: '#16A34A',
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

function withTimeout(fetchPromise: Promise<Response>, ms = 15000) {
  let timeoutId: any;
  const timeout = new Promise<Response>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Request timeout')), ms);
  });
  return Promise.race([fetchPromise, timeout]).finally(() => clearTimeout(timeoutId));
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
  const [text, setText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);

  const lang = useMemo(() => normalizeLang(getCurrentLanguage()), []);
  const listRef = useRef<FlatList<ChatMsg> | null>(null);

  // ✅ IMPORTANT: Put the exact function URL here
  // Must be: https://<project-ref>.supabase.co/functions/v1/<function-name>
  const functionUrl = useMemo(() => {
    const raw = 'https://wzjnwgygmiznavrdgppo.supabase.co/functions/v1/supabase-functions-new-support_ai';
    return raw.replace(/\/+$/, '');
  }, []);

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
          return;
        }

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
      } catch (e) {
        console.error('Boot chat error:', e);
      }
    };

    boot();
  }, [lang]);

  const sendMessage = async () => {
    const msg = text.trim();
    if (!msg || sending) return;

    const userLocal: ChatMsg = {
      id: uuidLike(),
      role: 'user',
      lang,
      created_at: new Date().toISOString(),
      text: msg,
    };

    setSending(true);
    setTyping(true);
    setMessages((prev) => [...prev, userLocal]);
    setText('');
    setTimeout(scrollToEnd, 30);

    try {
      if (!functionUrl.startsWith('https://') || !functionUrl.includes('/functions/v1/')) {
        throw new Error('Function URL is invalid. Check your Edge Function URL.');
      }

      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;

      const res = await withTimeout(
        fetch(functionUrl, {
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
        }),
        20000
      );

      const raw = await res.text();
      let json: any = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = { error: raw || 'Invalid JSON response' };
      }

      if (!res.ok) {
        // show more info for debugging
        const status = `${res.status} ${res.statusText}`;
        throw new Error(json?.error ? `${status}: ${json.error}` : `${status}: Request failed`);
      }

      const sid = (json?.session_id as string | undefined) || undefined;
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

      // ✅ Better message for "Failed to fetch" (CORS/URL/Network)
      const isFailedFetch =
        String(e?.message || '').toLowerCase().includes('failed to fetch') ||
        String(e?.message || '').toLowerCase().includes('network request failed');

      const details =
        isFailedFetch
          ? lang === 'kmr'
            ? `Failed to fetch.\n1) URL ـی function راستە؟\n2) ل Edge Function CORS هەیە؟\n3) device internet هەیە؟\n\nURL: ${functionUrl}`
            : lang === 'ckb'
            ? `Failed to fetch.\n1) URL ـی function دروستە؟\n2) CORS هەیە؟\n3) ئینتەرنێت هەیە؟\n\nURL: ${functionUrl}`
            : lang === 'ar'
            ? `Failed to fetch.\n1) هل رابط الوظيفة صحيح؟\n2) هل يوجد CORS؟\n3) هل الانترنت يعمل؟\n\nURL: ${functionUrl}`
            : `Failed to fetch.\n1) Is function URL correct?\n2) CORS enabled on Edge Function?\n3) Internet working?\n\nURL: ${functionUrl}`
          : (e?.message || 'Unknown error');

      const errMsg: ChatMsg = {
        id: uuidLike(),
        role: 'assistant',
        lang,
        created_at: new Date().toISOString(),
        text:
          lang === 'kmr'
            ? `هەڵە: ${details}\nپەیوەندی: info@zenopay.bond`
            : lang === 'ckb'
            ? `هەڵە: ${details}\nپەیوەندی: info@zenopay.bond`
            : lang === 'ar'
            ? `خطأ: ${details}\nتواصل: info@zenopay.bond`
            : `Error: ${details}\nContact: info@zenopay.bond`,
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
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
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
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: UI.green,
    alignItems: 'center',
    justifyContent: 'center',
  },

  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  helpText: { color: UI.text2, fontSize: 12.5, fontWeight: '700' as const },
  helpEmail: { color: UI.green, fontWeight: '900' as const },
});
