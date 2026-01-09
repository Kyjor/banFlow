/**
 * Game Service - Handles game mechanics, rewards, and inventory
 * This service listens to events and manages game state
 */

import { ipcRenderer } from 'electron';
import eventSystem, { EVENTS } from './EventSystem';

class GameService {
  constructor() {
    this.isEnabled = false;
    this.inventory = {
      gold: 0,
      items: [],
    };
    this.stats = {
      totalSessions: 0,
      totalTimeSpent: 0, // in seconds
      totalTasksCompleted: 0,
    };
    this.rewardRules = {
      // Gold per second of work (e.g., 0.1 gold per second = 6 gold per minute)
      goldPerSecond: 0.1,
      // Minimum session length to earn rewards (in seconds)
      minSessionLength: 60, // 1 minute
      // Bonus multipliers
      bonuses: {
        longSession: {
          threshold: 3600, // 1 hour
          multiplier: 1.5,
        },
        veryLongSession: {
          threshold: 7200, // 2 hours
          multiplier: 2.0,
        },
      },
    };

    // Load game state
    this.loadGameState();

    // Subscribe to events
    this.setupEventListeners();
  }

  /**
   * Load game state from storage
   */
  async loadGameState() {
    try {
      const state = await ipcRenderer.invoke('game:getState');
      if (state) {
        this.inventory = state.inventory || this.inventory;
        this.stats = state.stats || this.stats;
        this.isEnabled = state.isEnabled || false;
      }
    } catch (error) {
      console.error('Error loading game state:', error);
    }
  }

  /**
   * Save game state to storage
   */
  async saveGameState() {
    try {
      await ipcRenderer.invoke('game:saveState', {
        inventory: this.inventory,
        stats: this.stats,
        isEnabled: this.isEnabled,
      });
    } catch (error) {
      console.error('Error saving game state:', error);
    }
  }

  /**
   * Enable or disable game mode
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    this.saveGameState();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for session completion
    eventSystem.on(EVENTS.SESSION_COMPLETED, (data) => {
      if (this.isEnabled) {
        this.handleSessionCompleted(data);
      }
    });

    // Listen for node completion
    eventSystem.on(EVENTS.NODE_COMPLETED, (data) => {
      if (this.isEnabled) {
        this.handleNodeCompleted(data);
      }
    });

    // Listen for time spent updates
    eventSystem.on(EVENTS.TIME_SPENT, (data) => {
      if (this.isEnabled) {
        this.handleTimeSpent(data);
      }
    });
  }

  /**
   * Handle session completion event
   */
  handleSessionCompleted(data) {
    const { duration, nodeId, nodeTitle } = data; // duration in seconds

    if (!duration || duration < this.rewardRules.minSessionLength) {
      return; // Session too short, no reward
    }

    // Calculate base gold
    let goldEarned = duration * this.rewardRules.goldPerSecond;

    // Apply bonuses for long sessions
    if (duration >= this.rewardRules.bonuses.veryLongSession.threshold) {
      goldEarned *= this.rewardRules.bonuses.veryLongSession.multiplier;
    } else if (duration >= this.rewardRules.bonuses.longSession.threshold) {
      goldEarned *= this.rewardRules.bonuses.longSession.multiplier;
    }

    // Round to 2 decimal places
    goldEarned = Math.round(goldEarned * 100) / 100;

    // Add gold to inventory
    this.inventory.gold += goldEarned;
    this.stats.totalSessions += 1;
    this.stats.totalTimeSpent += duration;

    // Save state
    this.saveGameState();

    // Emit reward event for notifications
    eventSystem.emit('game:reward', {
      type: 'gold',
      amount: goldEarned,
      reason: 'session_completed',
      sessionDuration: duration,
      nodeTitle,
    });

    return goldEarned;
  }

  /**
   * Handle node completion event
   */
  handleNodeCompleted(data) {
    const { nodeId, nodeTitle, timeSpent } = data;

    this.stats.totalTasksCompleted += 1;

    // Bonus gold for completing a task
    const bonusGold = 10; // Fixed bonus for task completion
    this.inventory.gold += bonusGold;
    this.saveGameState();

    eventSystem.emit('game:reward', {
      type: 'gold',
      amount: bonusGold,
      reason: 'task_completed',
      nodeTitle,
    });

    return bonusGold;
  }

  /**
   * Handle time spent updates
   */
  handleTimeSpent(data) {
    // Could track incremental time updates here if needed
    // For now, we mainly use session completion
  }

  /**
   * Get current inventory
   */
  getInventory() {
    return { ...this.inventory };
  }

  /**
   * Get current stats
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Add item to inventory
   */
  addItem(item) {
    this.inventory.items.push(item);
    this.saveGameState();
  }

  /**
   * Spend gold
   */
  spendGold(amount) {
    if (this.inventory.gold >= amount) {
      this.inventory.gold -= amount;
      this.saveGameState();
      return true;
    }
    return false;
  }

  /**
   * Check if game mode is enabled
   */
  isGameModeEnabled() {
    return this.isEnabled;
  }
}

// Create singleton instance
const gameService = new GameService();

export default gameService;
