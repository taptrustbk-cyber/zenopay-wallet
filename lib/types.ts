export type KYCStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

export type TransactionType = 'send' | 'receive' | 'deposit';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  date_of_birth: string | null;
  country: string | null;
  city: string | null;
  phone_number: string | null;
  role: string | null;
  kyc_status: KYCStatus;
  kyc_front_photo: string | null;
  kyc_back_photo: string | null;
  kyc_selfie_photo: string | null;
  approval_pending_until: string | null;
  approved_at: string | null;
  force_active: boolean | null;
  wait_time_minutes: number | null;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_locked?: boolean;
}

export interface Transaction {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  type: TransactionType;
  status?: 'completed' | 'pending' | 'failed';
  created_at: string;
  from_profile?: Profile;
  to_profile?: Profile;
}

export type DepositStatus = 'pending' | 'approved' | 'rejected';

export type CryptoType = 'BTC' | 'ETH' | 'USDT_TRC20' | 'XRP' | 'DOGE';

export interface DepositOrder {
  id: string;
  user_id: string;
  amount: number;
  crypto_type: CryptoType;
  transaction_id: string;
  screenshot_url: string | null;
  status: DepositStatus;
  created_at: string;
  profile?: Profile;
}

export interface WithdrawOrder {
  id: string;
  user_id: string;
  amount: number;
  crypto: string;
  destination: string;
  currency: string;
  status: DepositStatus;
  created_at: string;
  profile?: Profile;
}
