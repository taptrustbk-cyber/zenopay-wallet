import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import i18n from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications need a real device.');
      return null;
    }

    await setupNotificationChannel();

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;

    if (existing.status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.log('Missing EAS projectId for push notifications');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data ?? null;
  } catch (error) {
    console.log('registerForPushNotificationsAsync error:', error);
    return null;
  }
}

export async function saveUserPushToken(userId: string, token: string) {
  if (!userId || !token) return;

  const payload = {
    user_id: userId,
    expo_push_token: token,
    device_type: Platform.OS,
    is_active: true,
  };

  const { error } = await supabase
    .from('user_push_tokens')
    .upsert(payload, {
      onConflict: 'user_id,expo_push_token',
      ignoreDuplicates: false,
    });

  if (error) {
    console.log('saveUserPushToken error:', error.message);
    throw error;
  }
}

export async function syncUserPreferredLanguage(userId: string) {
  if (!userId) return;

  const currentLanguage =
    String((i18n as any)?.language || 'en').toLowerCase();

  const normalized =
    currentLanguage === 'ar'
      ? 'ar'
      : currentLanguage === 'cbk' || currentLanguage === 'ckb'
        ? 'cbk'
        : currentLanguage === 'kmr'
          ? 'kmr'
          : 'en';

  const { error } = await supabase
    .from('profiles')
    .update({ preferred_language: normalized })
    .eq('id', userId);

  if (error) {
    console.log('syncUserPreferredLanguage error:', error.message);
  }
}

export async function registerAndSavePushToken(userId: string) {
  try {
    if (!userId) return null;

    const token = await registerForPushNotificationsAsync();
    if (!token) return null;

    await saveUserPushToken(userId, token);
    await syncUserPreferredLanguage(userId);

    return token;
  } catch (error) {
    console.log('registerAndSavePushToken error:', error);
    return null;
  }
}

export async function deactivateCurrentUserTokens(userId: string) {
  if (!userId) return;

  const { error } = await supabase
    .from('user_push_tokens')
    .update({ is_active: false })
    .eq('user_id', userId);

  if (error) {
    console.log('deactivateCurrentUserTokens error:', error.message);
  }
}