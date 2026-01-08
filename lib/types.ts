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
  id_front: string | null;
  id_back: string | null;
  selfie: string | null;
  approval_pending_until: string | null;
  approved_at: string | null;
  force_active: boolean | null;
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
  balance_after?: number;
  description?: string;
  from_profile?: {
    email: string;
    full_name: string | null;
  };
  to_profile?: {
    email: string;
    full_name: string | null;
  };
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
