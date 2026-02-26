import createContextHook from '@nkzw/create-context-hook';
import { Session, User } from '@supabase/supabase-js';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import * as Linking from 'expo-linking';
import { useQueryClient } from '@tanstack/react-query';

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
        currency: 'USD',
      });

      if (createError) throw createError;
    } catch {
      // silent
    }
  }, []);

  /**
   * ✅ IMPORTANT:
   * - We must SELECT avatar_url, country, phone, date_of_brith
   * - We must NOT overwrite them with null
   * - Normalize DB columns into the Profile object your screens expect
   */
  const loadProfile = useCallback(
    async (userId: string, bypassCache = false) => {
      if (isLoadingProfileRef.current) {
        console.log('[AuthContext] Profile already loading, skipping');
        return;
      }

      isLoadingProfileRef.current = true;
      console.log('[AuthContext] Starting profile load for userId:', userId);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            [
              'id',
              'email',
              'full_name',
              'role',
              'kyc_status',
              'approval_pending_until',
              'approved_at',
              'force_active',
              'created_at',
              // ✅ add these:
              'avatar_url',
              'country',
              'city',
              // Support both possibilities:
              'phone',
              'phone_number',
              'date_of_brith',
              'date_of_birth',
            ].join(', ')
          )
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('[AuthContext] Profile fetch error:', JSON.stringify(error, null, 2));
          setProfile(null);
          setLoading(false);
          isLoadingProfileRef.current = false;
          return;
        }

        // If no row -> create minimal profile row
        if (!data) {
          console.log('[AuthContext] No profile found, creating new profile');
          const { data: authData } = await supabase.auth.getUser();

          if (!authData?.user) {
            console.error('[AuthContext] No auth user found');
            setLoading(false);
            isLoadingProfileRef.current = false;
            return;
          }

          const { error: insertError } = await supabase.from('profiles').insert({
            id: userId,
            email: authData.user.email,
            kyc_status: 'not_started',
          });

          if (insertError) {
            console.error('[AuthContext] Profile insert error:', insertError);
            setLoading(false);
            isLoadingProfileRef.current = false;
            return;
          }

          console.log('[AuthContext] Profile created successfully');

          // ✅ Do NOT force null on fields that might exist later
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

            // ✅ keep as null for new user (fine)
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

        console.log('[AuthContext] Profile loaded successfully:', data.email);

        // ✅ Normalize:
        const normalized: any = {
          ...data,

          // Your UI uses phone; keep both if your type has both
          phone: (data as any).phone ?? (data as any).phone_number ?? null,
          phone_number: (data as any).phone_number ?? (data as any).phone ?? null,

          // Your UI requested date_of_brith:
          date_of_brith: (data as any).date_of_brith ?? (data as any).date_of_birth ?? null,
          date_of_birth: (data as any).date_of_birth ?? (data as any).date_of_brith ?? null,
        };

        // ✅ DO NOT overwrite avatar_url/country/phone/date with null here
        setProfile(normalized);

        console.log('[AuthContext] Ensuring wallet exists');
        await ensureWalletExists(userId);
        console.log('[AuthContext] Wallet check complete');

        if (bypassCache) {
          queryClient.invalidateQueries({ queryKey: ['wallet', userId] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }

        setLoading(false);
        isLoadingProfileRef.current = false;
      } catch (error: any) {
        console.error('[AuthContext] Profile load error:', JSON.stringify(error, null, 2));
        setProfile(null);
        setLoading(false);
        isLoadingProfileRef.current = false;
        return;
      } finally {
        console.log('[AuthContext] Profile load complete');
      }
    },
    [ensureWalletExists, queryClient]
  );

  useEffect(() => {
    isMountedRef.current = true;
    let mounted = true;

    setTimeout(() => {
      if (!mounted) return;
      setIsReady(true);
    }, 50);

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;

        if (error) {
          console.error('[AuthContext] Session error:', error.message);
          if (error.message?.includes('Invalid Refresh Token') || error.message?.includes('Refresh Token')) {
            console.log('[AuthContext] Clearing invalid session');
            supabase.auth.signOut().catch(() => {});
            setSession(null);
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[AuthContext] Get session failed:', err);
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      console.log('[AuthContext] Auth state changed:', _event);

      if (_event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] Token refreshed successfully');
      }

      if (_event === 'SIGNED_OUT') {
        console.log('[AuthContext] User signed out');
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (_event === 'PASSWORD_RECOVERY') {
        setTimeout(() => {
          try {
            router.replace('/(auth)/reset-password' as any);
          } catch {}
        }, 100);
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadProfile(session.user.id).catch(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    const handleDeepLink = async (event: { url: string }) => {
      if (!mounted) return;
      const url = event.url;
      if (url) {
        if (url.includes('#access_token') || url.includes('?access_token')) {
          const { data, error } = await supabase.auth.getSession();
          if (!error && data.session?.user?.email_confirmed_at) {
            await loadProfile(data.session.user.id, true);
          }
        }
        if (url.includes('reset-password') || url.includes('type=recovery')) {
          setTimeout(() => {
            try {
              router.replace('/(auth)/reset-password' as any);
            } catch {}
          }, 100);
        }
      }
    };

    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL()
      .then((url) => {
        if (url && mounted) handleDeepLink({ url });
      })
      .catch(() => {});

    return () => {
      mounted = false;
      isMountedRef.current = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, [loadProfile, router]);

  useEffect(() => {
    if (!pendingNavigationRef.current || loading || !isReady) return;

    const destination = pendingNavigationRef.current;
    pendingNavigationRef.current = null;

    if (isMountedRef.current) {
      const timer = setTimeout(() => {
        try {
          router.replace(destination as any);
        } catch {}
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, router, isReady]);

  useEffect(() => {
    if (loading || !isReady) return;

    const inAppGroup = (segments as string[])[0] === '(app)';
    const inAuthGroup = (segments as string[])[0] === '(auth)';
    const currentScreen = (segments as string[])[1];

    const protectedAuthScreens = [
      'splash',
      'waiting-review',
      'waiting-timer',
      'email-verification',
      'create-account',
      'kyc-wait',
      'reset-password',
      'signup',
      'forgot-password',
    ];

    if (inAuthGroup && protectedAuthScreens.includes(currentScreen)) return;

    if (!session && inAppGroup) {
      router.replace('/(auth)/login' as any);
      return;
    }

    if (session && !profile) return;

    if (session && profile && currentScreen === 'login') {
      if ((profile as any).role === 'admin') {
        router.replace('/(app)/admin' as any);
        return;
      }

      if (!(profile as any).kyc_status || (profile as any).kyc_status === 'not_started') {
        router.replace('/(auth)/kyc-wait' as any);
      } else if ((profile as any).kyc_status === 'pending') {
        router.replace('/(auth)/waiting-review' as any);
      } else if ((profile as any).kyc_status === 'approved') {
        router.replace('/(app)/dashboard' as any);
      } else if ((profile as any).kyc_status === 'rejected') {
        router.replace('/(auth)/kyc-wait' as any);
      } else {
        router.replace('/(auth)/kyc-wait' as any);
      }
      return;
    }
  }, [session, segments, loading, router, profile, isReady]);

  const signOut = async () => {
    try {
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
    } catch {
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
