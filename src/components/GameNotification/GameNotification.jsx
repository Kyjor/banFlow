/**
 * Game Notification Component
 * Displays notifications when the player earns rewards
 */

import React, { Component } from 'react';
import { notification } from 'antd';
import {
  DollarOutlined,
  GiftOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import eventSystem from '../../services/EventSystem';

class GameNotification extends Component {
  componentDidMount() {
    // Listen for game reward events
    this.unsubscribe = eventSystem.on('game:reward', (data) => {
      this.showRewardNotification(data);
    });
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  static formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  getRewardMessage(data) {
    const { type, amount, reason, sessionDuration, nodeTitle } = data;

    if (type === 'gold') {
      if (reason === 'session_completed') {
        const duration = GameNotification.formatDuration(sessionDuration);
        return `Earned ${amount} gold for completing a ${duration} session${nodeTitle ? ` on "${nodeTitle}"` : ''}!`;
      }
      if (reason === 'task_completed') {
        return `Earned ${amount} gold for completing task${nodeTitle ? ` "${nodeTitle}"` : ''}!`;
      }
    }

    return `Earned ${amount} ${type}!`;
  }

  static getRewardIcon(type) {
    switch (type) {
      case 'gold':
        return <DollarOutlined style={{ color: '#ffd700' }} />;
      case 'item':
        return <GiftOutlined style={{ color: '#52c41a' }} />;
      case 'achievement':
        return <TrophyOutlined style={{ color: '#faad14' }} />;
      default:
        return <GiftOutlined />;
    }
  }

  showRewardNotification(data) {
    const { type } = data;
    const message = this.getRewardMessage(data);
    const icon = GameNotification.getRewardIcon(type);

    notification.open({
      message: 'Reward Earned!',
      description: message,
      icon,
      placement: 'topRight',
      duration: 4,
      style: {
        borderLeft: `4px solid ${type === 'gold' ? '#ffd700' : '#52c41a'}`,
      },
    });
  }

  render() {
    return null; // This component doesn't render anything visible
  }
}

export default GameNotification;
