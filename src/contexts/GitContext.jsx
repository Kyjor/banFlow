import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { ipcRenderer } from 'electron';
import { message } from 'antd';
import HeartbeatService from '../services/HeartbeatService';

// Git Context State Structure
const initialState = {
  // Repository Management
  repositories: [],
  currentRepository: null,
  repositoryStatus: null,
  
  // Git Operations State
  isLoading: false,
  operationInProgress: false,
  operationHistory: [],
  
  // Branch Management
  branches: [],
  currentBranch: null,
  
  // File Status
  stagedFiles: [],
  modifiedFiles: [],
  untrackedFiles: [],
  deletedFiles: [],
  conflictedFiles: [],
  
  // Stash Management
  stashList: [],
  
  // Commit History
  commitHistory: [],
  
  // GitHub Integration
  isGitHubAuthenticated: false,
  githubUser: null,
  githubRepositories: [],
  
  // Diff and Comparison
  currentDiff: null,
  
  // Error Handling
  lastError: null,
  errorHistory: []
};

// Action Types for Git Operations
const GitActionTypes = {
  // Loading States
  SET_LOADING: 'SET_LOADING',
  SET_OPERATION_IN_PROGRESS: 'SET_OPERATION_IN_PROGRESS',
  
  // Repository Management
  SET_REPOSITORIES: 'SET_REPOSITORIES',
  SET_CURRENT_REPOSITORY: 'SET_CURRENT_REPOSITORY',
  ADD_REPOSITORY: 'ADD_REPOSITORY',
  UPDATE_REPOSITORY_STATUS: 'UPDATE_REPOSITORY_STATUS',
  
  // Branch Operations
  SET_BRANCHES: 'SET_BRANCHES',
  SET_CURRENT_BRANCH: 'SET_CURRENT_BRANCH',
  
  // File Operations
  UPDATE_FILE_STATUS: 'UPDATE_FILE_STATUS',
  
  // Stash Operations
  SET_STASH_LIST: 'SET_STASH_LIST',
  
  // Commit History
  SET_COMMIT_HISTORY: 'SET_COMMIT_HISTORY',
  
  // GitHub Integration
  SET_GITHUB_AUTH: 'SET_GITHUB_AUTH',
  SET_GITHUB_REPOSITORIES: 'SET_GITHUB_REPOSITORIES',
  
  // Diff Operations
  SET_CURRENT_DIFF: 'SET_CURRENT_DIFF',
  
  // Operation History
  ADD_OPERATION: 'ADD_OPERATION',
  SET_OPERATION_HISTORY: 'SET_OPERATION_HISTORY',
  
  // Error Handling
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Git Reducer for State Management
function gitReducer(state, action) {
  switch (action.type) {
    case GitActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
      
    case GitActionTypes.SET_OPERATION_IN_PROGRESS:
      return { ...state, operationInProgress: action.payload };
      
    case GitActionTypes.SET_REPOSITORIES:
      return { ...state, repositories: action.payload };
      
    case GitActionTypes.ADD_REPOSITORY:
      return { 
        ...state, 
        repositories: [...state.repositories, action.payload] 
      };
      
    case GitActionTypes.SET_CURRENT_REPOSITORY:
      return { ...state, currentRepository: action.payload };
      
    case GitActionTypes.UPDATE_REPOSITORY_STATUS:
      return { 
        ...state, 
        repositoryStatus: action.payload,
        stagedFiles: action.payload?.staged || [],
        modifiedFiles: action.payload?.modified || [],
        untrackedFiles: action.payload?.created || [],
        deletedFiles: action.payload?.deleted || [],
        conflictedFiles: action.payload?.conflicted || [],
        currentBranch: action.payload?.currentBranch,
        branches: action.payload?.branches || []
      };
      
    case GitActionTypes.SET_BRANCHES:
      return { ...state, branches: action.payload };
      
    case GitActionTypes.SET_CURRENT_BRANCH:
      return { ...state, currentBranch: action.payload };
      
    case GitActionTypes.UPDATE_FILE_STATUS:
      return {
        ...state,
        stagedFiles: action.payload.staged || state.stagedFiles,
        modifiedFiles: action.payload.modified || state.modifiedFiles,
        untrackedFiles: action.payload.created || state.untrackedFiles,
        deletedFiles: action.payload.deleted || state.deletedFiles,
        conflictedFiles: action.payload.conflicted || state.conflictedFiles
      };
      
    case GitActionTypes.SET_STASH_LIST:
      return { ...state, stashList: action.payload };
      
    case GitActionTypes.SET_COMMIT_HISTORY:
      return { ...state, commitHistory: action.payload };
      
    case GitActionTypes.SET_GITHUB_AUTH:
      return { 
        ...state, 
        isGitHubAuthenticated: action.payload.authenticated,
        githubUser: action.payload.user 
      };
      
    case GitActionTypes.SET_GITHUB_REPOSITORIES:
      return { ...state, githubRepositories: action.payload };
      
    case GitActionTypes.SET_CURRENT_DIFF:
      return { ...state, currentDiff: action.payload };
      
    case GitActionTypes.ADD_OPERATION:
      return { 
        ...state, 
        operationHistory: [action.payload, ...state.operationHistory.slice(0, 49)] 
      };
      
    case GitActionTypes.SET_OPERATION_HISTORY:
      return { ...state, operationHistory: action.payload };
      
    case GitActionTypes.SET_ERROR:
      return { 
        ...state, 
        lastError: action.payload,
        errorHistory: [action.payload, ...state.errorHistory.slice(0, 9)]
      };
      
    case GitActionTypes.CLEAR_ERROR:
      return { ...state, lastError: null };
      
    default:
      return state;
  }
}

// Create Git Context
const GitContext = createContext();

// Git Context Provider Component
export function GitProvider({ children }) {
  const [state, dispatch] = useReducer(gitReducer, initialState);
  const heartbeatIdRef = useRef(null);
  const heartbeatService = HeartbeatService.getInstance();
  const stateRef = useRef(state);
  const refreshRepositoryStatusRef = useRef(null);
  
  // Keep state ref in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // Configuration: Heartbeat interval in milliseconds (default: 5 seconds)
  // Can be overridden via environment variable or settings
  const HEARTBEAT_INTERVAL_MS = parseInt(
    process.env.REACT_APP_GIT_HEARTBEAT_INTERVAL || 
    localStorage.getItem('gitHeartbeatInterval') || 
    '5000',
    10
  );

  // Error Handling Helper
  const handleError = useCallback((error, operation) => {
    console.error(`Git ${operation} error:`, error);
    const errorInfo = {
      message: error.message || 'Unknown error occurred',
      operation,
      timestamp: new Date().toISOString()
    };
    dispatch({ type: GitActionTypes.SET_ERROR, payload: errorInfo });
    message.error(`Git ${operation} failed: ${errorInfo.message}`);
  }, []);

  // Success Message Helper
  const showSuccess = useCallback((operation, details = '') => {
    const successMessage = details ? `${operation} ${details}` : operation;
    message.success(successMessage);
  }, []);

  // Repository Management Functions
  const addRepository = useCallback(async (repoPath) => {
    try {
      dispatch({ type: GitActionTypes.SET_LOADING, payload: true });
      const repoInfo = await ipcRenderer.invoke('git:addRepository', repoPath);
      dispatch({ type: GitActionTypes.ADD_REPOSITORY, payload: repoInfo });
      showSuccess('Repository added', repoInfo.name);
      return repoInfo;
    } catch (error) {
      handleError(error, 'add repository');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_LOADING, payload: false });
    }
  }, [handleError, showSuccess]);

  const switchRepository = useCallback(async (repoPath) => {
    try {
      dispatch({ type: GitActionTypes.SET_LOADING, payload: true });
      const status = await ipcRenderer.invoke('git:switchRepository', repoPath);
      dispatch({ type: GitActionTypes.SET_CURRENT_REPOSITORY, payload: repoPath });
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: status });
      showSuccess('Switched repository');
      return status;
    } catch (error) {
      handleError(error, 'switch repository');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_LOADING, payload: false });
    }
  }, [handleError, showSuccess]);

  const selectRepository = useCallback(async () => {
    try {
      const selectedPath = await ipcRenderer.invoke('git:selectRepository');
      if (selectedPath) {
        return await addRepository(selectedPath);
      }
      return null;
    } catch (error) {
      handleError(error, 'select repository');
      throw error;
    }
  }, [addRepository, handleError]);

  const refreshRepositoryStatus = useCallback(async () => {
    try {
      const status = await ipcRenderer.invoke('git:getRepositoryStatus');
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: status });
      return status;
    } catch (error) {
      handleError(error, 'refresh status');
      throw error;
    }
  }, [handleError]);

  // Keep refreshRepositoryStatus ref in sync (after function is defined)
  useEffect(() => {
    refreshRepositoryStatusRef.current = refreshRepositoryStatus;
  }, [refreshRepositoryStatus]);

  // Core Git Operations
  const createBranch = useCallback(async (branchName, startPoint = null) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:createBranch', branchName, startPoint);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result });
      showSuccess('Branch created', branchName);
      return result;
    } catch (error) {
      handleError(error, 'create branch');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const switchBranch = useCallback(async (branchName) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:switchBranch', branchName);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result });
      showSuccess('Switched to branch', branchName);
      return result;
    } catch (error) {
      handleError(error, 'switch branch');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const deleteBranch = useCallback(async (branchName, force = false) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:deleteBranch', branchName, force);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result });
      showSuccess('Branch deleted', branchName);
      return result;
    } catch (error) {
      handleError(error, 'delete branch');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const getBranchesWithDates = useCallback(async () => {
    try {
      const branches = await ipcRenderer.invoke('git:getBranchesWithDates');
      return branches;
    } catch (error) {
      handleError(error, 'get branches with dates');
      throw error;
    }
  }, [handleError]);

  const stageFiles = useCallback(async (files) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:stageFiles', files);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result });
      showSuccess('Files staged', `${files.length} file(s)`);
      return result;
    } catch (error) {
      handleError(error, 'stage files');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const unstageFiles = useCallback(async (files) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:unstageFiles', files);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result });
      showSuccess('Files unstaged', `${files.length} file(s)`);
      return result;
    } catch (error) {
      handleError(error, 'unstage files');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const commit = useCallback(async (message, description = '') => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:commit', message, description);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result.status });
      showSuccess('Committed changes', result.commit?.substring(0, 7));
      return result;
    } catch (error) {
      handleError(error, 'commit');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const pull = useCallback(async (remote = 'origin', branch = null, strategy = 'merge') => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:pull', remote, branch, strategy);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result.status });
      const strategyLabel = strategy === 'rebase' ? '(rebased)' : strategy === 'ff-only' ? '(fast-forward)' : '';
      showSuccess('Pulled changes', `from ${remote} ${strategyLabel}`.trim());
      return result;
    } catch (error) {
      handleError(error, 'pull');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const push = useCallback(async (remote = 'origin', branch = null) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:push', remote, branch);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result.status });
      showSuccess('Pushed changes', `to ${remote}`);
      return result;
    } catch (error) {
      handleError(error, 'push');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  // Stash Operations
  const stashChanges = useCallback(async (message = null) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:stashChanges', message);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result.status });
      showSuccess('Changes stashed');
      return result;
    } catch (error) {
      handleError(error, 'stash changes');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const getStashList = useCallback(async () => {
    try {
      const stashList = await ipcRenderer.invoke('git:getStashList');
      dispatch({ type: GitActionTypes.SET_STASH_LIST, payload: stashList });
      return stashList;
    } catch (error) {
      handleError(error, 'get stash list');
      throw error;
    }
  }, [handleError]);

  const applyStash = useCallback(async (stashIndex = 0) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:applyStash', stashIndex);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result.status });
      showSuccess('Stash applied', `stash@{${stashIndex}}`);
      return result;
    } catch (error) {
      handleError(error, 'apply stash');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const popStash = useCallback(async (stashIndex = 0) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:popStash', stashIndex);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result.status });
      showSuccess('Stash popped', `stash@{${stashIndex}}`);
      return result;
    } catch (error) {
      handleError(error, 'pop stash');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  // Diff and History Operations
  const getDiff = useCallback(async (file = null, staged = false) => {
    try {
      const diff = await ipcRenderer.invoke('git:getDiff', file, staged);
      dispatch({ type: GitActionTypes.SET_CURRENT_DIFF, payload: diff });
      return diff;
    } catch (error) {
      handleError(error, 'get diff');
      throw error;
    }
  }, [handleError]);

  const getCommitHistory = useCallback(async (options = {}) => {
    try {
      dispatch({ type: GitActionTypes.SET_LOADING, payload: true });
      const history = await ipcRenderer.invoke('git:getCommitHistory', options);
      dispatch({ type: GitActionTypes.SET_COMMIT_HISTORY, payload: history });
      return history;
    } catch (error) {
      handleError(error, 'get commit history');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_LOADING, payload: false });
    }
  }, [handleError]);

  // Undo System
  const undoLastOperation = useCallback(async () => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:undoLastOperation');
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result });
      showSuccess('Operation undone');
      return result;
    } catch (error) {
      handleError(error, 'undo operation');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  // GitHub Integration
  const authenticateGitHub = useCallback(async (token) => {
    try {
      dispatch({ type: GitActionTypes.SET_LOADING, payload: true });
      const result = await ipcRenderer.invoke('git:authenticateGitHub', token);
      dispatch({ type: GitActionTypes.SET_GITHUB_AUTH, payload: result });
      showSuccess('GitHub authenticated', result.user?.login);
      return result;
    } catch (error) {
      handleError(error, 'GitHub authentication');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_LOADING, payload: false });
    }
  }, [handleError, showSuccess]);

  const cloneRepository = useCallback(async (repoUrl, targetPath) => {
    try {
      dispatch({ type: GitActionTypes.SET_LOADING, payload: true });
      const result = await ipcRenderer.invoke('git:cloneRepository', repoUrl, targetPath);
      dispatch({ type: GitActionTypes.ADD_REPOSITORY, payload: result });
      showSuccess('Repository cloned', result.name);
      return result;
    } catch (error) {
      handleError(error, 'clone repository');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_LOADING, payload: false });
    }
  }, [handleError, showSuccess]);

  // Project-specific repository management
  const getProjectRepositoryStats = useCallback(async () => {
    try {
      const stats = await ipcRenderer.invoke('git:getProjectRepositoryStats');
      return stats;
    } catch (error) {
      handleError(error, 'get project repository stats');
      return null;
    }
  }, [handleError]);

  const cleanupProjectRepositories = useCallback(async () => {
    try {
      const removedPaths = await ipcRenderer.invoke('git:cleanupProjectRepositories');
      if (removedPaths.length > 0) {
        showSuccess('Repositories cleaned up', `Removed ${removedPaths.length} non-existent repositories`);
      }
      return removedPaths;
    } catch (error) {
      handleError(error, 'cleanup project repositories');
      return [];
    }
  }, [handleError, showSuccess]);

  const loadProjectRepositories = useCallback(async () => {
    try {
      const repos = await ipcRenderer.invoke('git:loadProjectRepositories');
      dispatch({ type: GitActionTypes.SET_REPOSITORIES, payload: repos });
      return repos;
    } catch (error) {
      handleError(error, 'load project repositories');
      return [];
    }
  }, [handleError]);

  // Initialize repositories on mount
  useEffect(() => {
    const loadRepositories = async () => {
      try {
        const repos = await ipcRenderer.invoke('git:getRepositories');
        dispatch({ type: GitActionTypes.SET_REPOSITORIES, payload: repos });
        
        const currentRepo = await ipcRenderer.invoke('git:getCurrentRepository');
        if (currentRepo) {
          dispatch({ type: GitActionTypes.SET_CURRENT_REPOSITORY, payload: currentRepo.path });
        }
      } catch (error) {
        console.error('Failed to load repositories:', error);
      }
    };

    loadRepositories();
  }, []);

  // Heartbeat: Periodically check for repository status changes
  useEffect(() => {
    // Clean up any existing heartbeat
    if (heartbeatIdRef.current !== null) {
      heartbeatService.unregister(heartbeatIdRef.current);
      heartbeatIdRef.current = null;
    }

    // Only start heartbeat if we have a current repository
    if (state.currentRepository) {
      heartbeatIdRef.current = heartbeatService.register(
        'git-repository-status',
        async () => {
          // Only refresh if not currently performing an operation
          // Use refs to get current state and function to avoid stale closures
          const currentState = stateRef.current;
          const refreshFn = refreshRepositoryStatusRef.current;
          
          if (refreshFn && !currentState.operationInProgress && !currentState.isLoading && currentState.currentRepository) {
            try {
              await refreshFn();
            } catch (error) {
              // Silently fail - we don't want to spam errors for heartbeat failures
              // The error will be logged by refreshRepositoryStatus
              console.debug('Heartbeat refresh failed:', error);
            }
          }
        },
        HEARTBEAT_INTERVAL_MS,
        { immediate: true } // Run immediately, then every interval
      );
    }

    // Cleanup on unmount or when repository changes
    return () => {
      if (heartbeatIdRef.current !== null) {
        heartbeatService.unregister(heartbeatIdRef.current);
        heartbeatIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentRepository]); // Only re-run when repository changes

  // File Management Operations
  const discardChanges = useCallback(async (files) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:discardChanges', files);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result.status });
      showSuccess('Changes discarded', `${files.length} file(s)`);
      return result;
    } catch (error) {
      handleError(error, 'discard changes');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const deleteUntrackedFiles = useCallback(async (files) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:deleteUntrackedFiles', files);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result.status });
      showSuccess('Files deleted', `${files.length} untracked file(s)`);
      return result;
    } catch (error) {
      handleError(error, 'delete untracked files');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const cleanUntrackedFiles = useCallback(async (dryRun = false) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:cleanUntrackedFiles', dryRun);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result.status });
      showSuccess(dryRun ? 'Dry run completed' : 'Files cleaned', result.message);
      return result;
    } catch (error) {
      handleError(error, 'clean untracked files');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  // Hunk/Line level staging operations
  const stageHunk = useCallback(async (filePath, hunkIndex) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:stageHunk', filePath, hunkIndex);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result.status });
      showSuccess('Hunk staged', result.message);
      return result;
    } catch (error) {
      handleError(error, 'stage hunk');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const discardHunk = useCallback(async (filePath, hunkIndex) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:discardHunk', filePath, hunkIndex);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result.status });
      showSuccess('Hunk discarded', result.message);
      return result;
    } catch (error) {
      handleError(error, 'discard hunk');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const stageLines = useCallback(async (filePath, hunkIndex, lineIndices) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:stageLines', filePath, hunkIndex, lineIndices);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result.status });
      showSuccess('Lines staged', result.message);
      return result;
    } catch (error) {
      handleError(error, 'stage lines');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  const discardLines = useCallback(async (filePath, hunkIndex, lineIndices) => {
    try {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: true });
      const result = await ipcRenderer.invoke('git:discardLines', filePath, hunkIndex, lineIndices);
      dispatch({ type: GitActionTypes.UPDATE_REPOSITORY_STATUS, payload: result.status });
      showSuccess('Lines discarded', result.message);
      return result;
    } catch (error) {
      handleError(error, 'discard lines');
      throw error;
    } finally {
      dispatch({ type: GitActionTypes.SET_OPERATION_IN_PROGRESS, payload: false });
    }
  }, [handleError, showSuccess]);

  // Context Value
  const contextValue = {
    // State
    ...state,
    
    // Repository Management
    addRepository,
    switchRepository,
    selectRepository,
    refreshRepositoryStatus,
    
    // Core Git Operations
    createBranch,
    switchBranch,
    deleteBranch,
    getBranchesWithDates,
    stageFiles,
    unstageFiles,
    commit,
    pull,
    push,
    
    // Stash Operations
    stashChanges,
    getStashList,
    applyStash,
    popStash,
    
    // Diff and History
    getDiff,
    getCommitHistory,
    
    // Undo System
    undoLastOperation,
    
    // GitHub Integration
    authenticateGitHub,
    cloneRepository,
    
    // Project-specific Repository Management
    getProjectRepositoryStats,
    cleanupProjectRepositories,
    loadProjectRepositories,
    
    // File Management Operations
    discardChanges,
    deleteUntrackedFiles,
    cleanUntrackedFiles,
    
    // Hunk/Line Staging Operations
    stageHunk,
    discardHunk,
    stageLines,
    discardLines,
    
    // Utility Functions
    clearError: () => dispatch({ type: GitActionTypes.CLEAR_ERROR })
  };

  return (
    <GitContext.Provider value={contextValue}>
      {children}
    </GitContext.Provider>
  );
}

// Custom Hook for using Git Context
export function useGit() {
  const context = useContext(GitContext);
  if (!context) {
    throw new Error('useGit must be used within a GitProvider');
  }
  return context;
}

export default GitContext; 