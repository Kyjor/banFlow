import { useEffect } from 'react';
import { usePlan } from '../contexts/PlanContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { ACTIVITY_LABELS } from '../types';
import { formatDistance } from '../utils/paceUtils';
import { today as todayIso } from '../utils/dateUtils';

/**
 * Get current notification permission status.
 * Returns 'granted' | 'denied' | 'default' | 'unknown'
 */
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'default' | 'unknown'> {
  try {
    const { isTauri } = await import('@tauri-apps/api/core');
    if (await isTauri()) {
      try {
        const { isPermissionGranted } = await import('@tauri-apps/plugin-notification');
        const granted = await isPermissionGranted();
        return granted ? 'granted' : 'denied';
      } catch (pluginError) {
        console.warn('[Notifications] Tauri notification plugin error:', pluginError);
        // Fall through to web API
      }
    }
  } catch (error) {
    console.warn('[Notifications] Failed to check Tauri status:', error);
    // Fall through to web API
  }

  // Fallback: Web Notification API
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission as 'granted' | 'denied' | 'default';
    }
  } catch (error) {
    console.warn('[Notifications] Web Notification API not available:', error);
  }

  return 'unknown';
}

/**
 * Request notification permission proactively (call on app startup if reminder is enabled).
 * Returns { granted: boolean, status: string, needsSettings: boolean }
 * needsSettings is true if permission was previously denied and user needs to go to iOS Settings.
 */
export async function requestNotificationPermission(): Promise<{ granted: boolean; status: string; needsSettings: boolean }> {
  // Try Tauri native notifications first (iOS / desktop)
  try {
    const { isTauri } = await import('@tauri-apps/api/core');
    if (isTauri()) {
      const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
      let granted = await isPermissionGranted();
      console.log('[Notifications] Current Tauri permission status:', granted ? 'granted' : 'denied');
      
      if (!granted) {
        console.log('[Notifications] Requesting Tauri notification permission...');
        try {
          const permission = await requestPermission();
          console.log('[Notifications] Tauri permission result:', permission);
          granted = permission === 'granted';
          
          // On iOS, if permission was previously denied, requestPermission() may return 'denied'
          // without showing a prompt. In that case, user needs to go to Settings.
          if (permission === 'denied') {
            return { granted: false, status: 'denied', needsSettings: true };
          }
          
          return { granted, status: permission, needsSettings: false };
        } catch (error) {
          console.error('[Notifications] Error requesting Tauri permission:', error);
          // If requestPermission throws, it might mean permission was previously denied
          return { granted: false, status: 'denied', needsSettings: true };
        }
      } else {
        console.log('[Notifications] Tauri permission already granted');
        return { granted: true, status: 'granted', needsSettings: false };
      }
    }
  } catch (error) {
    console.warn('[Notifications] Tauri notification plugin not available:', error);
  }

  // Fallback: Web Notification API
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      console.log('[Notifications] Web notification permission already granted');
      return { granted: true, status: 'granted', needsSettings: false };
    }
    if (Notification.permission === 'denied') {
      console.log('[Notifications] Web notification permission was previously denied');
      return { granted: false, status: 'denied', needsSettings: true };
    }
    if (Notification.permission === 'default') {
      console.log('[Notifications] Requesting web notification permission...');
      try {
        const permission = await Notification.requestPermission();
        console.log('[Notifications] Web permission result:', permission);
        return { granted: permission === 'granted', status: permission, needsSettings: false };
      } catch (error) {
        console.warn('[Notifications] Failed to request web notification permission:', error);
        return { granted: false, status: 'error', needsSettings: false };
      }
    }
  }

  return { granted: false, status: 'unknown', needsSettings: false };
}

const STORAGE_KEY_LAST_REMINDER = 'daily_training_reminder_last_fire_v1';

function loadLastFireDate(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY_LAST_REMINDER);
  } catch {
    return null;
  }
}

function saveLastFireDate(d: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_LAST_REMINDER, d);
  } catch {
    // ignore
  }
}

export function useDailyTrainingReminder() {
  const { todayActivity } = usePlan();
  const { settings } = useSettings();
  const { showToast } = useToast();

  // Request permission proactively when reminder is enabled
  useEffect(() => {
    if (!settings.daily_reminder_enabled) return;
    void requestNotificationPermission().then(({ granted, needsSettings }) => {
      if (!granted) {
        if (needsSettings) {
          console.warn('[Notifications] Permission was previously denied. User must enable in iOS Settings > Run With Friends > Notifications');
          showToast('Notification permission denied. Enable in Settings > Run With Friends > Notifications', 'info');
        } else {
          console.warn('[Notifications] Permission not granted; reminders will use in-app toasts');
        }
      }
    });
  }, [settings.daily_reminder_enabled, showToast]);

  useEffect(() => {
    if (!settings.daily_reminder_enabled) return;

    const time = settings.daily_reminder_time ?? '08:00';
    const [hStr, mStr] = time.split(':');
    const targetHour = parseInt(hStr, 10);
    const targetMinute = parseInt(mStr, 10);
    if (isNaN(targetHour) || isNaN(targetMinute)) return;

    async function fireReminder(message: string, today: string) {
      saveLastFireDate(today);

      // Prefer Tauri native notifications when available (iOS, desktop app)
      try {
        const { isTauri } = await import('@tauri-apps/api/core');
        if (isTauri()) {
          const { sendNotification, isPermissionGranted } = await import('@tauri-apps/plugin-notification');
          const granted = await isPermissionGranted();
          if (granted) {
            console.log('[Notifications] Sending Tauri notification:', message);
            await sendNotification({ title: "Today's training", body: message });
            return;
          } else {
            console.warn('[Notifications] Tauri permission not granted, falling back to toast');
          }
        }
      } catch (error) {
        console.warn('[Notifications] Tauri notification failed:', error);
        // fall through to web/Toast
      }

      // Fallback: web Notification API, then in-app toast
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification("Today's training", { body: message });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then(result => {
            if (result === 'granted') {
              new Notification("Today's training", { body: message });
            } else {
              showToast(message, 'info');
            }
          }).catch(() => {
            showToast(message, 'info');
          });
        } else {
          showToast(message, 'info');
        }
      } else {
        showToast(message, 'info');
      }
    }

    const interval = window.setInterval(() => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const targetMinutes = targetHour * 60 + targetMinute;

      const today = todayIso();
      const lastFire = loadLastFireDate();

      // Fire once per day, within a 5-minute window around the configured time
      if (lastFire === today) return;
      if (Math.abs(currentMinutes - targetMinutes) > 5) return;

      const planDay = todayActivity?.plan_day;
      if (!planDay || (planDay.activity_type !== 'cross_training' && planDay.activity_type === 'rest')) {
        // No scheduled training today (or rest only), skip
        return;
      }

      const label = ACTIVITY_LABELS[planDay.activity_type];
      let details = '';
      if (planDay.distance_value) {
        details = formatDistance(planDay.distance_value, planDay.distance_unit);
      } else if (planDay.duration_minutes) {
        details = `${planDay.duration_minutes} min`;
      }

      const message = details ? `${label} · ${details}` : label;
      void fireReminder(message, today);
    }, 60_000); // check every minute

    return () => window.clearInterval(interval);
  }, [settings.daily_reminder_enabled, settings.daily_reminder_time, todayActivity, showToast]);
}


