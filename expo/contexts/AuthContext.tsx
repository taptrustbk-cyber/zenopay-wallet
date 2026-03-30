import createContextHook from '@nkzw/create-context-hook';
import { Session, User } from '@supabase/supabase-js';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import * as Linking from 'expo-linking';
import { useQueryClient } from '@tanstack/react-query';

// ✅ notifications
import {
  registerAndSavePushToken,
  deactivateCurrentUserTokens,
} from '@/lib/notifications';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const router = useRouter();
  const segments = useSegments();
  const queryClient = useQueryClient();

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const isLoadingProfileRef = useRef(false);
  const isMountedRef = useRef(true);
  const pendingNavigationRef = useRef<string | null>(null);

  const ensureWalletExists = useCallback(async (userId: string) => {
    try {
      const { data: existingWallet, error: fetchError } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingWallet) return;
      if (fetchError) return;

      const { error: createError } = await supabase.from('wallets').insert({
        user_id: userId,
        balance: 0,
        currency: 'IQD', // ✅ changed
      });

      if (createError) throw createError;
    } catch {}
  }, []);

  const loadProfile = useCallback(
    async (userId: string, bypassCache = false) => {
      if (isLoadingProfileRef.current) {
        console.log('[AuthContext] Profile already loading, skipping');
        return;
      }

      isLoadingProfileRef.current = true;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select([
            'id',
            'email',
            'full_name',
            'role',
            'kyc_status',
            'approval_pending_until',
            'approved_at',
            'force_active',
            'created_at',
            'avatar_url',
            'country',
            'city',
            'phone',
            'phone_number',
            'date_of_brith',
            'date_of_birth',
          ].join(', '))
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          setProfile(null);
          setLoading(false);
          isLoadingProfileRef.current = false;
          return;
        }

        if (!data) {
          const { data: authData } = await supabase.auth.getUser();

          await supabase.from('profiles').insert({
            id: userId,
            email: authData.user.email,
            kyc_status: 'not_started',
          });

          setProfile({
            id: userId,
            email: authData.user.email || '',
            created_at: new Date().toISOString(),
            approved_at: null,
            force_active: null,
            full_name: null,
            role: null,
            kyc_status: 'not_started',
            approval_pending_until: null,
            avatar_url: null,
            country: null,
            city: null,
            phone: null,
            phone_number: null,
            date_of_brith: null,
            date_of_birth: null,
            id_front: null,
            id_back: null,
            selfie: null,
          } as any);

          setLoading(false);
          isLoadingProfileRef.current = false;
          pendingNavigationRef.current = '/(auth)/waiting-review';
          return;
        }

        const normalized: any = {
          ...(data as any),
          phone: data.phone ?? data.phone_number ?? null,
          phone_number: data.phone_number ?? data.phone ?? null,
          date_of_brith: data.date_of_brith ?? data.date_of_birth ?? null,
          date_of_birth: data.date_of_birth ?? data.date_of_brith ?? null,
        };

        setProfile(normalized);

        await ensureWalletExists(userId);

        if (bypassCache) {
          queryClient.invalidateQueries({ queryKey: ['wallet', userId] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }

        setLoading(false);
        isLoadingProfileRef.current = false;
      } catch {
        setProfile(null);
        setLoading(false);
        isLoadingProfileRef.current = false;
      }
    },
    [ensureWalletExists, queryClient]
  );

  useEffect(() => {
    let mounted = true;

    setTimeout(() => {
      if (!mounted) return;
      setIsReady(true);
    }, 50);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // ✅ notifications
        registerAndSavePushToken(session.user.id);

        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (_event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // ✅ notifications
        registerAndSavePushToken(session.user.id);

        loadProfile(session.user.id).catch(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = async () => {
    try {
      if (user?.id) {
        await deactivateCurrentUserTokens(user.id); // ✅ notifications
      }

      await supabase.auth.signOut();
      setProfile(null);
      queryClient.clear();
    } catch {}
  };

  const hardRefresh = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      queryClient.clear();
      await loadProfile(user.id, true);
    } finally {
      setLoading(false);
    }
  }, [user, queryClient, loadProfile]);

  return {
    session,
    user,
    profile,
    loading,
    signOut,
    refreshProfile: () => {
      if (user) {
        loadProfile(user.id, true).catch(() => {});
      }
    },
    hardRefresh,
  };
});