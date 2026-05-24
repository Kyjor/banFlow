import { tauriInvoke } from './tauri';

/** @returns {boolean} */
export function areDesktopNotificationsEnabled() {
  try {
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    return appSettings.showNotifications !== false;
  } catch {
    return true;
  }
}

async function sendViaTauriPlugin(title, body) {
  const { isTauri } = await import('@tauri-apps/api/core');
  if (!(await isTauri())) {
    return false;
  }

  const { sendNotification, isPermissionGranted, requestPermission } =
    await import('@tauri-apps/plugin-notification');
  let granted = await isPermissionGranted();
  if (!granted) {
    const permission = await requestPermission();
    granted = permission === 'granted';
  }
  if (!granted) {
    return false;
  }
  await sendNotification({ title, body });
  return true;
}

/**
 * Show a native OS notification.
 * Linux/Fedora: notify-send via Rust (most reliable on GNOME).
 */
export async function sendDesktopNotification(title, body) {
  if (!areDesktopNotificationsEnabled()) {
    return;
  }

  try {
    const { isTauri } = await import('@tauri-apps/api/core');
    if (await isTauri()) {
      try {
        await tauriInvoke('utils:showNotification', { title, body });
        return;
      } catch (linuxError) {
        console.warn(
          '[desktopNotification] notify-send failed, trying plugin:',
          linuxError,
        );
        if (await sendViaTauriPlugin(title, body)) {
          return;
        }
      }
    }
  } catch (error) {
    console.warn('[desktopNotification] Tauri path failed:', error);
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, { body });
    return;
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, { body });
    }
  }
}
