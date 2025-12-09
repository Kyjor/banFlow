/**
 * Utility functions for aggregating data across multiple projects
 */

import {
  calculateTotalTimeSpent,
  calculateTimeByParent,
  calculateTimeByTag,
  calculateTimeByIteration,
  calculateNodeStats,
  calculateProjectHealth,
  getRecentActivity,
  calculateTimeInDateRange,
} from './statisticsCalculations';

/**
 * Aggregate statistics across multiple projects
 */
export const aggregateProjectStats = (projectsData) => {
  if (!projectsData || !Array.isArray(projectsData) || projectsData.length === 0) {
    return {
      totalTimeSpent: 0,
      totalNodes: 0,
      totalCompleted: 0,
      totalIncomplete: 0,
      overallCompletionRate: 0,
      activeProjects: 0,
      timeByParent: {},
      timeByTag: {},
      timeByIteration: {},
      nodesByParent: {},
      nodesByTag: {},
      nodesByIteration: {},
      projectCount: 0,
    };
  }
  
  const aggregate = {
    totalTimeSpent: 0,
    totalNodes: 0,
    totalCompleted: 0,
    totalIncomplete: 0,
    overallCompletionRate: 0,
    activeProjects: 0,
    timeByParent: {},
    timeByTag: {},
    timeByIteration: {},
    nodesByParent: {},
    nodesByTag: {},
    nodesByIteration: {},
    projectCount: projectsData.length,
    projectDetails: [],
  };
  
  projectsData.forEach((projectData) => {
    const { projectName, nodes = [], parents = [], iterations = [] } = projectData;
    
    // Calculate project-specific stats
    const nodeStats = calculateNodeStats(nodes);
    const totalTime = calculateTotalTimeSpent(nodes);
    const timeByParent = calculateTimeByParent(nodes, parents);
    const timeByTag = calculateTimeByTag(nodes);
    const timeByIteration = calculateTimeByIteration(nodes, iterations);
    const health = calculateProjectHealth(nodes, parents);
    
    // Aggregate totals
    aggregate.totalTimeSpent += totalTime;
    aggregate.totalNodes += nodeStats.total;
    aggregate.totalCompleted += nodeStats.completed;
    aggregate.totalIncomplete += nodeStats.incomplete;
    
    // Check if project is active (has recent activity or nodes)
    if (nodes.length > 0 || totalTime > 0) {
      aggregate.activeProjects += 1;
    }
    
    // Aggregate time by parent
    Object.keys(timeByParent).forEach((parentName) => {
      if (!aggregate.timeByParent[parentName]) {
        aggregate.timeByParent[parentName] = 0;
      }
      aggregate.timeByParent[parentName] += timeByParent[parentName];
    });
    
    // Aggregate time by tag
    Object.keys(timeByTag).forEach((tagName) => {
      if (!aggregate.timeByTag[tagName]) {
        aggregate.timeByTag[tagName] = 0;
      }
      aggregate.timeByTag[tagName] += timeByTag[tagName];
    });
    
    // Aggregate time by iteration
    Object.keys(timeByIteration).forEach((iterationName) => {
      if (!aggregate.timeByIteration[iterationName]) {
        aggregate.timeByIteration[iterationName] = 0;
      }
      aggregate.timeByIteration[iterationName] += timeByIteration[iterationName];
    });
    
    // Aggregate nodes by parent
    Object.keys(nodeStats.byParent).forEach((parentId) => {
      const parent = parents.find(p => p.id === parentId);
      const parentName = parent?.title || parentId;
      if (!aggregate.nodesByParent[parentName]) {
        aggregate.nodesByParent[parentName] = 0;
      }
      aggregate.nodesByParent[parentName] += nodeStats.byParent[parentId];
    });
    
    // Aggregate nodes by tag
    Object.keys(nodeStats.byTag).forEach((tagName) => {
      if (!aggregate.nodesByTag[tagName]) {
        aggregate.nodesByTag[tagName] = 0;
      }
      aggregate.nodesByTag[tagName] += nodeStats.byTag[tagName];
    });
    
    // Aggregate nodes by iteration
    Object.keys(nodeStats.byIteration).forEach((iterationId) => {
      if (!aggregate.nodesByIteration[iterationId]) {
        aggregate.nodesByIteration[iterationId] = 0;
      }
      aggregate.nodesByIteration[iterationId] += nodeStats.byIteration[iterationId];
    });
    
    // Store project details
    aggregate.projectDetails.push({
      projectName,
      totalTime,
      totalNodes: nodeStats.total,
      completed: nodeStats.completed,
      incomplete: nodeStats.incomplete,
      completionRate: nodeStats.completionRate,
      health,
    });
  });
  
  // Calculate overall completion rate
  aggregate.overallCompletionRate = aggregate.totalNodes > 0
    ? Math.round((aggregate.totalCompleted / aggregate.totalNodes) * 100)
    : 0;
  
  return aggregate;
};

/**
 * Get aggregate recent activity across projects
 */
export const getAggregateRecentActivity = (projectsData, days = 7) => {
  if (!projectsData || !Array.isArray(projectsData)) return [];
  
  const allActivities = [];
  
  projectsData.forEach((projectData) => {
    const { projectName, nodes = [] } = projectData;
    const activities = getRecentActivity(nodes, days);
    
    activities.forEach((activity) => {
      allActivities.push({
        ...activity,
        projectName,
      });
    });
  });
  
  return allActivities.sort((a, b) => 
    new Date(b.startDateTime) - new Date(a.startDateTime)
  );
};

/**
 * Get aggregate time in date range across projects
 */
export const getAggregateTimeInDateRange = (projectsData, startDate, endDate) => {
  if (!projectsData || !Array.isArray(projectsData)) return 0;
  
  let totalTime = 0;
  
  projectsData.forEach((projectData) => {
    const { nodes = [] } = projectData;
    totalTime += calculateTimeInDateRange(nodes, startDate, endDate);
  });
  
  return totalTime;
};

/**
 * Compare projects side by side
 */
export const compareProjects = (projectsData) => {
  if (!projectsData || !Array.isArray(projectsData)) return [];
  
  return projectsData.map((projectData) => {
    const { projectName, nodes = [], parents = [], iterations = [] } = projectData;
    const nodeStats = calculateNodeStats(nodes);
    const totalTime = calculateTotalTimeSpent(nodes);
    const health = calculateProjectHealth(nodes, parents);
    const recentActivity = getRecentActivity(nodes, 7);
    
    return {
      projectName,
      totalTime,
      totalNodes: nodeStats.total,
      completed: nodeStats.completed,
      incomplete: nodeStats.incomplete,
      completionRate: nodeStats.completionRate,
      overdueCount: health.overdueCount,
      recentActivityCount: recentActivity.length,
      avgTimePerNode: health.avgTimePerNode,
      health,
    };
  }).sort((a, b) => b.totalTime - a.totalTime); // Sort by total time descending
};

