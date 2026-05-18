/**
 * HeartbeatService - A reusable service for periodic polling/heartbeat operations
 *
 * This service allows components and services to register callbacks that will be
 * executed at specified intervals. It's useful for:
 * - Polling for changes (Git status, file changes, etc.)
 * - Periodic data synchronization
 * - Health checks
 * - Any recurring background tasks
 *
 * Usage:
 *   const heartbeat = HeartbeatService.getInstance();
 *   const id = heartbeat.register('my-task', () => {
 *     console.log('This runs every 5 seconds');
 *   }, 5000);
 *
 *   // Later, to stop:
 *   heartbeat.unregister(id);
 */

class HeartbeatService {
  constructor() {
    this.timers = new Map();
    this.nextId = 1;
  }

  /**
   * Get singleton instance
   * @returns {HeartbeatService}
   */
  static getInstance() {
    if (!HeartbeatService.instance) {
      HeartbeatService.instance = new HeartbeatService();
    }
    return HeartbeatService.instance;
  }

  /**
   * Register a new heartbeat callback
   * @param {string} name - Human-readable name for this heartbeat (for debugging)
   * @param {Function} callback - Function to call on each interval
   * @param {number} intervalMs - Interval in milliseconds
   * @param {Object} options - Additional options
   * @param {boolean} options.immediate - If true, execute callback immediately (default: false)
   * @param {boolean} options.runOnBackground - If true, continue running when window is hidden (default: true)
   * @returns {number} - Heartbeat ID (use this to unregister)
   */
  register(name, callback, intervalMs, options = {}) {
    if (typeof callback !== 'function') {
      throw new Error('HeartbeatService: callback must be a function');
    }
    if (typeof intervalMs !== 'number' || intervalMs <= 0) {
      throw new Error('HeartbeatService: intervalMs must be a positive number');
    }

    this.nextId += 1;
    const id = this.nextId;
    const { immediate = false } = options;

    // Execute immediately if requested
    if (immediate) {
      try {
        callback();
      } catch (error) {
        console.error(
          `HeartbeatService: Error in immediate execution of "${name}":`,
          error,
        );
      }
    }

    // Create interval
    const intervalId = setInterval(() => {
      try {
        callback();
      } catch (error) {
        console.error(`HeartbeatService: Error in heartbeat "${name}":`, error);
      }
    }, intervalMs);

    // Store timer info
    this.timers.set(id, {
      name,
      intervalId,
      callback,
      intervalMs,
      options,
      registeredAt: Date.now(),
    });

    console.log(
      `HeartbeatService: Registered "${name}" with interval ${intervalMs}ms (ID: ${id})`,
    );
    return id;
  }

  /**
   * Unregister a heartbeat
   * @param {number} id - Heartbeat ID returned from register()
   * @returns {boolean} - True if successfully unregistered, false if not found
   */
  unregister(id) {
    const timer = this.timers.get(id);
    if (!timer) {
      console.warn(
        `HeartbeatService: Attempted to unregister unknown heartbeat ID: ${id}`,
      );
      return false;
    }

    clearInterval(timer.intervalId);
    this.timers.delete(id);
    console.log(`HeartbeatService: Unregistered "${timer.name}" (ID: ${id})`);
    return true;
  }

  /**
   * Unregister all heartbeats with a given name
   * @param {string} name - Name of heartbeats to unregister
   * @returns {number} - Number of heartbeats unregistered
   */
  unregisterByName(name) {
    let count = 0;
    this.timers.forEach((timer, id) => {
      if (timer.name === name) {
        this.unregister(id);
        count += 1;
      }
    });
    return count;
  }

  /**
   * Unregister all heartbeats
   */
  unregisterAll() {
    const count = this.timers.size;
    this.timers.forEach((timer, id) => {
      this.unregister(id);
    });
    console.log(`HeartbeatService: Unregistered all ${count} heartbeats`);
  }

  /**
   * Check if a heartbeat is registered
   * @param {number} id - Heartbeat ID
   * @returns {boolean}
   */
  isRegistered(id) {
    return this.timers.has(id);
  }

  /**
   * Get information about a registered heartbeat
   * @param {number} id - Heartbeat ID
   * @returns {Object|null} - Timer info or null if not found
   */
  getInfo(id) {
    const timer = this.timers.get(id);
    if (!timer) return null;

    return {
      id,
      name: timer.name,
      intervalMs: timer.intervalMs,
      registeredAt: timer.registeredAt,
      uptime: Date.now() - timer.registeredAt,
    };
  }

  /**
   * Get all registered heartbeats
   * @returns {Array} - Array of heartbeat info objects
   */
  getAll() {
    return Array.from(this.timers.entries()).map(([id, timer]) => ({
      id,
      name: timer.name,
      intervalMs: timer.intervalMs,
      registeredAt: timer.registeredAt,
      uptime: Date.now() - timer.registeredAt,
    }));
  }

  /**
   * Pause a heartbeat (stops execution but keeps it registered)
   * @param {number} id - Heartbeat ID
   * @returns {boolean} - True if successfully paused
   */
  pause(id) {
    const timer = this.timers.get(id);
    if (!timer) return false;

    if (timer.paused) return true; // Already paused

    clearInterval(timer.intervalId);
    timer.paused = true;
    timer.pausedAt = Date.now();
    console.log(`HeartbeatService: Paused "${timer.name}" (ID: ${id})`);
    return true;
  }

  /**
   * Resume a paused heartbeat
   * @param {number} id - Heartbeat ID
   * @returns {boolean} - True if successfully resumed
   */
  resume(id) {
    const timer = this.timers.get(id);
    if (!timer || !timer.paused) return false;

    timer.intervalId = setInterval(() => {
      try {
        timer.callback();
      } catch (error) {
        console.error(
          `HeartbeatService: Error in heartbeat "${timer.name}":`,
          error,
        );
      }
    }, timer.intervalMs);

    timer.paused = false;
    const pausedDuration = Date.now() - timer.pausedAt;
    timer.registeredAt += pausedDuration; // Adjust registeredAt to account for pause
    console.log(`HeartbeatService: Resumed "${timer.name}" (ID: ${id})`);
    return true;
  }
}

export default HeartbeatService;
