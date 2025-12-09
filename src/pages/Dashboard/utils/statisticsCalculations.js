/**
 * Utility functions for calculating project statistics
 */

/**
 * Format seconds to HH:MM:SS
 */
export const formatTime = (seconds) => {
  if (!seconds || seconds === 0) return '00:00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format seconds to human readable format
 */
export const formatTimeHuman = (seconds) => {
  if (!seconds || seconds === 0) return '0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && hours === 0) parts.push(`${secs}s`);
  
  return parts.join(' ') || '0s';
};

/**
 * Calculate total time spent from nodes
 */
export const calculateTotalTimeSpent = (nodes) => {
  if (!nodes || !Array.isArray(nodes)) return 0;
  return nodes.reduce((total, node) => {
    return total + (node.timeSpent || 0);
  }, 0);
};

/**
 * Calculate time spent by parent/status
 */
export const calculateTimeByParent = (nodes, parents) => {
  const timeByParent = {};
  
  if (!nodes || !Array.isArray(nodes)) return timeByParent;
  
  nodes.forEach((node) => {
    const parentId = node.parent || 'unassigned';
    const parent = parents?.find(p => p.id === parentId);
    const parentName = parent?.title || parentId;
    
    if (!timeByParent[parentName]) {
      timeByParent[parentName] = 0;
    }
    timeByParent[parentName] += node.timeSpent || 0;
  });
  
  return timeByParent;
};

/**
 * Calculate time spent by tag
 */
export const calculateTimeByTag = (nodes) => {
  const timeByTag = {};
  
  if (!nodes || !Array.isArray(nodes)) return timeByTag;
  
  nodes.forEach((node) => {
    const tags = node.tags || [];
    if (tags.length === 0) {
      if (!timeByTag['No Tag']) {
        timeByTag['No Tag'] = 0;
      }
      timeByTag['No Tag'] += node.timeSpent || 0;
    } else {
      tags.forEach((tag) => {
        const tagName = typeof tag === 'string' ? tag : (tag.title || tag.name || 'Unknown');
        if (!timeByTag[tagName]) {
          timeByTag[tagName] = 0;
        }
        timeByTag[tagName] += node.timeSpent || 0;
      });
    }
  });
  
  return timeByTag;
};

/**
 * Calculate time spent by iteration
 */
export const calculateTimeByIteration = (nodes, iterations) => {
  const timeByIteration = {};
  
  if (!nodes || !Array.isArray(nodes)) return timeByIteration;
  
  nodes.forEach((node) => {
    const iterationId = node.iterationId || node.iteration || null;
    let iterationName = 'No Iteration';
    
    if (iterationId && iterations) {
      const iteration = iterations.find(i => i.id === iterationId);
      iterationName = iteration?.title || iterationId;
    }
    
    if (!timeByIteration[iterationName]) {
      timeByIteration[iterationName] = 0;
    }
    timeByIteration[iterationName] += node.timeSpent || 0;
  });
  
  return timeByIteration;
};

/**
 * Calculate node statistics
 */
export const calculateNodeStats = (nodes) => {
  if (!nodes || !Array.isArray(nodes)) {
    return {
      total: 0,
      completed: 0,
      incomplete: 0,
      completionRate: 0,
      byParent: {},
      byTag: {},
      byIteration: {},
    };
  }
  
  const stats = {
    total: nodes.length,
    completed: 0,
    incomplete: 0,
    completionRate: 0,
    byParent: {},
    byTag: {},
    byIteration: {},
  };
  
  nodes.forEach((node) => {
    if (node.isComplete) {
      stats.completed += 1;
    } else {
      stats.incomplete += 1;
    }
    
    // By parent
    const parentId = node.parent || 'unassigned';
    if (!stats.byParent[parentId]) {
      stats.byParent[parentId] = 0;
    }
    stats.byParent[parentId] += 1;
    
    // By tag
    const tags = node.tags || [];
    if (tags.length === 0) {
      if (!stats.byTag['No Tag']) {
        stats.byTag['No Tag'] = 0;
      }
      stats.byTag['No Tag'] += 1;
    } else {
      tags.forEach((tag) => {
        const tagName = typeof tag === 'string' ? tag : (tag.title || tag.name || 'Unknown');
        if (!stats.byTag[tagName]) {
          stats.byTag[tagName] = 0;
        }
        stats.byTag[tagName] += 1;
      });
    }
    
    // By iteration
    const iterationId = node.iterationId || node.iteration || 'No Iteration';
    if (!stats.byIteration[iterationId]) {
      stats.byIteration[iterationId] = 0;
    }
    stats.byIteration[iterationId] += 1;
  });
  
  stats.completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;
  
  return stats;
};

/**
 * Calculate average session duration
 */
export const calculateAverageSessionDuration = (nodes) => {
  if (!nodes || !Array.isArray(nodes)) return 0;
  
  let totalSessions = 0;
  let totalDuration = 0;
  
  nodes.forEach((node) => {
    const sessions = node.sessionHistory || [];
    sessions.forEach((session) => {
      if (session.length) {
        totalDuration += session.length;
        totalSessions += 1;
      }
    });
  });
  
  return totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
};

/**
 * Calculate time spent in date range
 */
export const calculateTimeInDateRange = (nodes, startDate, endDate) => {
  if (!nodes || !Array.isArray(nodes)) return 0;
  
  const start = startDate ? new Date(startDate).getTime() : 0;
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  
  let totalTime = 0;
  
  nodes.forEach((node) => {
    const sessions = node.sessionHistory || [];
    sessions.forEach((session) => {
      if (session.startDateTime) {
        const sessionStart = new Date(session.startDateTime).getTime();
        if (sessionStart >= start && sessionStart <= end) {
          totalTime += session.length || 0;
        }
      }
    });
  });
  
  return totalTime;
};

/**
 * Get recent activity (last N days)
 */
export const getRecentActivity = (nodes, days = 7) => {
  if (!nodes || !Array.isArray(nodes)) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffTime = cutoffDate.getTime();
  
  const activities = [];
  
  nodes.forEach((node) => {
    const sessions = node.sessionHistory || [];
    sessions.forEach((session) => {
      if (session.startDateTime) {
        const sessionStart = new Date(session.startDateTime).getTime();
        if (sessionStart >= cutoffTime) {
          activities.push({
            nodeId: node.id,
            nodeTitle: node.title,
            startDateTime: session.startDateTime,
            length: session.length || 0,
            parent: session.parent,
          });
        }
      }
    });
  });
  
  return activities.sort((a, b) => 
    new Date(b.startDateTime) - new Date(a.startDateTime)
  );
};

/**
 * Calculate project health metrics
 */
export const calculateProjectHealth = (nodes, parents) => {
  const stats = calculateNodeStats(nodes);
  const totalTime = calculateTotalTimeSpent(nodes);
  
  // Calculate overdue items
  const now = new Date();
  let overdueCount = 0;
  
  nodes.forEach((node) => {
    if (node.estimatedDate && !node.isComplete) {
      const estimatedDate = new Date(node.estimatedDate);
      if (estimatedDate < now) {
        overdueCount += 1;
      }
    }
  });
  
  // Calculate average time per node
  const avgTimePerNode = stats.total > 0 
    ? Math.round(totalTime / stats.total) 
    : 0;
  
  // Calculate nodes by parent with names
  const nodesByParent = {};
  if (parents) {
    parents.forEach((parent) => {
      const count = stats.byParent[parent.id] || 0;
      nodesByParent[parent.title] = count;
    });
  }
  
  return {
    completionRate: stats.completionRate,
    totalNodes: stats.total,
    completedNodes: stats.completed,
    incompleteNodes: stats.incomplete,
    overdueCount,
    totalTimeSpent: totalTime,
    avgTimePerNode,
    nodesByParent,
  };
};

