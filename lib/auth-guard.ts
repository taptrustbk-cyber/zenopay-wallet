import { supabase } from '@/lib/supabase';

export type AuthGuardResult = {
  route: 'LOGIN' | 'KYC_WAIT' | 'DASHBOARD';
  profile?: any;
};

export async function authGuard(): Promise<AuthGuardResult> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { route: 'LOGIN' };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('kyc_status, full_name, role')
    .maybeSingle();

  if (error) {
    await supabase.auth.signOut();
    return { route: 'LOGIN' };
  }

  if (!profile) {
    await supabase.auth.signOut();
    return { route: 'LOGIN' };
  }

  if (profile.kyc_status !== 'approved') {
    return {
      route: 'KYC_WAIT',
      profile,
    };
  }

  return { route: 'DASHBOARD', profile };
}
