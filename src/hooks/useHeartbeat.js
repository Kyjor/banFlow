import { useEffect, useRef } from 'react';
import HeartbeatService from '../services/HeartbeatService';

/**
 * React hook for using the HeartbeatService
 *
 * @param {string} name - Name for this heartbeat (for debugging)
 * @param {Function} callback - Function to call on each interval
 * @param {number} intervalMs - Interval in milliseconds
 * @param {Object} options - Additional options
 * @param {boolean} options.immediate - Execute callback immediately (default: false)
 * @param {boolean} options.enabled - Whether heartbeat is enabled (default: true)
 *
 * @example
 * useHeartbeat('my-polling', async () => {
 *   await fetchData();
 * }, 5000, { immediate: true });
 */
export function useHeartbeat(name, callback, intervalMs, options = {}) {
  const heartbeatIdRef = useRef(null);
  const heartbeatService = HeartbeatService.getInstance();
  const callbackRef = useRef(callback);
  const { enabled = true, immediate = false } = options;

  // Keep callback ref in sync
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Clean up existing heartbeat first
    if (heartbeatIdRef.current !== null) {
      heartbeatService.unregister(heartbeatIdRef.current);
      heartbeatIdRef.current = null;
    }

    if (!enabled) {
      return undefined;
    }

    // Register heartbeat with wrapper that uses current callback
    heartbeatIdRef.current = heartbeatService.register(
      name,
      () => callbackRef.current(),
      intervalMs,
      { immediate },
    );

    // Cleanup on unmount or when dependencies change
    return () => {
      if (heartbeatIdRef.current !== null) {
        heartbeatService.unregister(heartbeatIdRef.current);
        heartbeatIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, intervalMs, enabled, immediate]); // Exclude callback and heartbeatService from deps

  // Return control functions
  return {
    pause: () => {
      if (heartbeatIdRef.current !== null) {
        heartbeatService.pause(heartbeatIdRef.current);
      }
    },
    resume: () => {
      if (heartbeatIdRef.current !== null) {
        heartbeatService.resume(heartbeatIdRef.current);
      }
    },
    isActive: () => {
      return (
        heartbeatIdRef.current !== null &&
        heartbeatService.isRegistered(heartbeatIdRef.current)
      );
    },
  };
}

export default useHeartbeat;
