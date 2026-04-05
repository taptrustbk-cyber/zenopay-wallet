import createContextHook from '@nkzw/create-context-hook';
import { Session, User } from '@supabase/supabase-js';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';

import { useQueryClient } from '@tanstack/react-query';

// ✅ notifications
import {
  registerAndSavePushToken,
  deactivateCurrentUserTokens,
} from '@/lib/notifications';

export const [AuthProvider, useAuth] = createContextHook(function useAuthContext() {
  const _router = useRouter();
  const _segments = useSegments();
  const queryClient = useQueryClient();

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const isLoadingProfileRef = useRef(false);
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
      if (!userId) {
        setLoading(false);
        return;
      }
      
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
          console.log('[AuthContext] Profile load error:', error.message);
          setProfile(null);
          setLoading(false);
          isLoadingProfileRef.current = false;
          return;
        }

        if (!data) {
          // Create new profile for user
          let userEmail = '';
          try {
            const { data: authData } = await supabase.auth.getUser();
            userEmail = authData?.user?.email || '';
          } catch {}

          if (userEmail) {
            try {
              await supabase.from('profiles').insert({
                id: userId,
                email: userEmail,
                kyc_status: 'not_started',
              });
            } catch {}
          }

          setProfile({
            id: userId,
            email: userEmail,
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

        const dataAny = data as any;
        const normalized: any = {
          ...dataAny,
          phone: dataAny?.phone ?? dataAny?.phone_number ?? null,
          phone_number: dataAny?.phone_number ?? dataAny?.phone ?? null,
          date_of_brith: dataAny?.date_of_brith ?? dataAny?.date_of_birth ?? null,
          date_of_birth: dataAny?.date_of_birth ?? dataAny?.date_of_brith ?? null,
        };

        setProfile(normalized);

        await ensureWalletExists(userId);

        if (bypassCache) {
          void queryClient.invalidateQueries({ queryKey: ['wallet', userId] });
          void queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }

        setLoading(false);
        isLoadingProfileRef.current = false;
      } catch (err) {
        console.log('[AuthContext] Profile load exception:', err);
        setProfile(null);
        setLoading(false);
        isLoadingProfileRef.current = false;
      }
    },
    [ensureWalletExists, queryClient]
  );

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // ✅ notifications
        void registerAndSavePushToken(session.user.id);

        void loadProfile(session.user.id);
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
        void registerAndSavePushToken(session.user.id);

        void loadProfile(session.user.id).catch(() => setLoading(false));
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

  const signOut = useCallback(async () => {
    try {
      if (user?.id) {
        await deactivateCurrentUserTokens(user.id).catch(() => {}); // ✅ notifications - safe
      }

      // Clear local state first for immediate UI feedback
      setProfile(null);
      setSession(null);
      setUser(null);
      
      // Clear query cache
      queryClient.clear();
      
      // Then sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.log('Sign out error:', error);
      // Still clear local state even if server fails
      setProfile(null);
      setSession(null);
      setUser(null);
    }
  }, [user?.id, queryClient]);

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

  const authValue = useMemo(() => ({
    session,
    user,
    profile,
    loading,
    signOut,
    refreshProfile: () => {
      if (user) {
        void loadProfile(user.id, true);
      }
    },
    hardRefresh,
  }), [session, user, profile, loading, signOut, hardRefresh, loadProfile]);

  return authValue;
});