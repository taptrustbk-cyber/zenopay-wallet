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

      if (existingWallet) {
        return;
      }

      if (fetchError) {
        return;
      }
      
      const { error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          balance: 0,
          currency: 'USD',
        });

      if (createError) {
        throw createError;
      }
    } catch {
      // Wallet creation failed silently
    }
  }, []);

  const loadProfile = useCallback(async (userId: string, bypassCache = false) => {
    if (isLoadingProfileRef.current) {
      console.log('[AuthContext] Profile already loading, skipping');
      return;
    }
    
    isLoadingProfileRef.current = true;
    console.log('[AuthContext] Starting profile load for userId:', userId);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, kyc_status, approval_pending_until, approved_at, force_active, wait_time_minutes, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error(
          '[AuthContext] Profile fetch error:',
          JSON.stringify(error, null, 2)
        );
        setProfile(null);
        setLoading(false);
        isLoadingProfileRef.current = false;
        return;
      }
      
      if (!data) {
        console.log('[AuthContext] No profile found, creating new profile');
        const { data: authData } = await supabase.auth.getUser();
        
        if (!authData?.user) {
          console.error('[AuthContext] No auth user found');
          setLoading(false);
          isLoadingProfileRef.current = false;
          return;
        }

        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
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
        setProfile({
          id: userId,
          email: authData.user.email || '',
          created_at: new Date().toISOString(),
          approved_at: null,
          force_active: null,
          wait_time_minutes: null,
          full_name: null,
          date_of_birth: null,
          country: null,
          city: null,
          phone_number: null,
          role: null,
          kyc_status: 'not_started',
          kyc_front_photo: null,
          kyc_back_photo: null,
          kyc_selfie_photo: null,
          approval_pending_until: null,
        });
        setLoading(false);
        isLoadingProfileRef.current = false;
        pendingNavigationRef.current = '/(auth)/waiting-review';
        return;
      }
      
      console.log('[AuthContext] Profile loaded successfully:', data.email);
      setProfile({
        ...data,
        date_of_birth: null,
        country: null,
        city: null,
        phone_number: null,
        kyc_front_photo: null,
        kyc_back_photo: null,
        kyc_selfie_photo: null,
      });
      
      console.log('[AuthContext] Ensuring wallet exists');
      await ensureWalletExists(userId);
      console.log('[AuthContext] Wallet check complete');
      
      if (bypassCache) {
        queryClient.invalidateQueries({ queryKey: ['wallet', userId] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }
    } catch (error: any) {
      console.error(
        '[AuthContext] Profile load error:',
        JSON.stringify(error, null, 2)
      );

      setProfile(null);
      setLoading(false);
      isLoadingProfileRef.current = false;

      return;
    } finally {
      console.log('[AuthContext] Profile load complete');
    }
  }, [ensureWalletExists, queryClient]);

  useEffect(() => {
    isMountedRef.current = true;
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
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      if (_event === 'PASSWORD_RECOVERY') {
        setTimeout(() => {
          try {
            router.replace('/(auth)/reset-password' as any);
          } catch {
            // Navigation error suppressed
          }
        }, 100);
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id).catch(() => {
          setLoading(false);
        });
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
            } catch {
              // Navigation error suppressed
            }
          }, 100);
        }
      }
    };

    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url && mounted) {
        handleDeepLink({ url });
      }
    }).catch(() => {
      // Initial URL error suppressed
    });

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
        } catch {
          // Navigation error suppressed
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, router, isReady]);

  useEffect(() => {
    if (loading || !isReady) return;

    const inAppGroup = (segments as string[])[0] === '(app)';
    const inAuthGroup = (segments as string[])[0] === '(auth)';
    const currentScreen = (segments as string[])[1];

    const protectedAuthScreens = ['splash', 'waiting-review', 'waiting-timer', 'email-verification', 'create-account', 'kyc-wait', 'reset-password', 'signup', 'forgot-password'];

    if (inAuthGroup && protectedAuthScreens.includes(currentScreen)) {
      return;
    }

    if (!session && inAppGroup) {
      router.replace('/(auth)/login' as any);
      return;
    }

    if (session && !profile) {
      return;
    }

    if (session && profile && currentScreen === 'login') {
      if (profile.kyc_status === 'approved') {
        router.replace('/(app)/dashboard' as any);
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
    } catch {
      // Sign out error suppressed
    }
  };

  const hardRefresh = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      queryClient.clear();
      await loadProfile(user.id, true);
    } catch {
      // Hard refresh failed silently
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
        loadProfile(user.id, true).catch(() => {
          // Profile refresh failed silently
        });
      }
    },
    hardRefresh,
  };
});
