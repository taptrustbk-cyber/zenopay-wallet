import { supabase } from '@/lib/supabase';

type NotificationEventKey =
  | 'deposit_approved'
  | 'deposit_rejected'
  | 'withdrawal_approved'
  | 'withdrawal_rejected'
  | 'mobile_order_approved'
  | 'mobile_order_rejected'
  | 'gift_card_ready'
  | 'gift_card_rejected'
  | 'topup_ready'
  | 'topup_rejected'
  | 'sim_card_ready'
  | 'sim_card_rejected'
  | 'kyc_approved'
  | 'kyc_rejected';

export async function sendLocalizedNotification(params: {
  userId: string;
  eventKey: NotificationEventKey;
  data?: Record<string, any>;
  customTitle?: string;
  customBody?: string;
}) {
  const { userId, eventKey, data, customTitle, customBody } = params;

  const { data: response, error } = await supabase.functions.invoke(
    'send-localized-notification',
    {
      body: {
        user_id: userId,
        event_key: eventKey,
        data: data || {},
        custom_title: customTitle,
        custom_body: customBody,
      },
    }
  );

  if (error) {
    console.log('sendLocalizedNotification error:', error.message);
    throw error;
  }

  return response;
}