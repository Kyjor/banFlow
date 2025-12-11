/**
 * Generic Event System for decoupling game logic from business logic
 * This allows the app to fire events without knowing about game mechanics
 */

class EventSystem {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event
   * @param {Function} callback - Function to call when event fires
   * @returns {Function} Unsubscribe function
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Fire an event
   * @param {string} eventName - Name of the event
   * @param {Object} data - Data to pass to listeners
   */
  emit(eventName, data = {}) {
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} eventName - Name of the event
   */
  off(eventName) {
    this.listeners.delete(eventName);
  }

  /**
   * Remove all listeners
   */
  clear() {
    this.listeners.clear();
  }
}

// Create singleton instance
const eventSystem = new EventSystem();

// Export both the instance and the class
export default eventSystem;
export { EventSystem };

// Event names constants
export const EVENTS = {
  SESSION_COMPLETED: 'session:completed',
  SESSION_STARTED: 'session:started',
  NODE_COMPLETED: 'node:completed',
  NODE_CREATED: 'node:created',
  TIME_SPENT: 'time:spent',
  TASK_COMPLETED: 'task:completed',
};

