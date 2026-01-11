import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import { ipcRenderer } from 'electron';
import {
  Layout,
  Button,
  Space,
  Typography,
  Tag,
  Empty,
  Spin,
  Tooltip,
  Divider,
  Badge,
  message,
  Dropdown,
  Select,
  Input,
  Avatar,
  List,
  Popconfirm,
  Modal,
  Collapse,
} from 'antd';
import {
  BranchesOutlined,
  HistoryOutlined,
  SettingOutlined,
  ReloadOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  FileTextOutlined,
  PlusOutlined,
  MinusOutlined,
  CheckOutlined,
  UndoOutlined,
  RedoOutlined,
  GitlabOutlined,
  FolderOpenOutlined,
  InboxOutlined,
  DeleteOutlined,
  ExportOutlined,
  UserOutlined,
  CodeOutlined,
  WarningOutlined,
  SyncOutlined,
  FileSearchOutlined,
  SearchOutlined,
  MergeOutlined,
  FileAddOutlined,
  EditOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import { useGit } from '../../../contexts/GitContext';
import EnhancedDiffViewer from '../EnhancedDiffViewer/EnhancedDiffViewer';
import MergeConflictResolver from '../MergeConflictResolver/MergeConflictResolver';
import PRList from '../PullRequests/PRList';
import PRCreate from '../PullRequests/PRCreate';
import PRReview from '../PullRequests/PRReview';
import StashModal from '../StashModal/StashModal';
import './GitClient.scss';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { Option } = Select;

// Helper function to normalize file status for icon display
const getNormalizedStatus = (status) => {
  switch (status) {
    case 'added':
      return 'untracked';
    case 'deleted':
      return 'modified';
    default:
      return 'modified';
  }
};

// Helper function to get status color
const getStatusColor = (status) => {
  switch (status) {
    case 'added':
      return 'success';
    case 'modified':
      return 'warning';
    case 'deleted':
      return 'error';
    default:
      return 'default';
  }
};

// DiffViewer component for displaying color-coded diffs
function DiffViewer({ diff }) {
  const renderDiffLine = (line, index) => {
    const style = {
      fontFamily: 'monospace',
      fontSize: '12px',
      lineHeight: '1.45',
      whiteSpace: 'pre',
      margin: 0,
      padding: '2px 4px',
      borderRadius: '3px',
    };

    if (line.startsWith('+') && !line.startsWith('+++')) {
      // Addition (green)
      return (
        <div
          key={index}
          style={{
            ...style,
            backgroundColor: '#f0f9f0',
            color: '#22863a',
            borderLeft: '3px solid #28a745',
          }}
        >
          {line}
        </div>
      );
    }
    if (line.startsWith('-') && !line.startsWith('---')) {
      // Deletion (red)
      return (
        <div
          key={index}
          style={{
            ...style,
            backgroundColor: '#ffeef0',
            color: '#cb2431',
            borderLeft: '3px solid #cb2431',
          }}
        >
          {line}
        </div>
      );
    }
    if (line.startsWith('@@')) {
      // Hunk header (blue)
      return (
        <div
          key={index}
          style={{
            ...style,
            backgroundColor: '#f1f8ff',
            color: '#0366d6',
            borderLeft: '3px solid #0366d6',
            fontWeight: 'bold',
          }}
        >
          {line}
        </div>
      );
    }
    if (
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('---') ||
      line.startsWith('+++')
    ) {
      // Metadata (gray)
      return (
        <div
          key={index}
          style={{
            ...style,
            backgroundColor: '#f6f8fa',
            color: '#586069',
            borderLeft: '3px solid #d1d9e0',
          }}
        >
          {line}
        </div>
      );
    }
    // Context lines (neutral)
    return (
      <div
        key={index}
        style={{
          ...style,
          backgroundColor: 'transparent',
          color: '#24292e',
          borderLeft: '3px solid transparent',
        }}
      >
        {line}
      </div>
    );
  };

  const diffLines = diff.split('\n').filter((line) => line.trim() !== '');

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #d1d9e0',
        borderRadius: '6px',
        overflow: 'auto',
        maxHeight: '400px',
      }}
    >
      {diffLines.map((line, index) => renderDiffLine(line, index))}
    </div>
  );
}

DiffViewer.propTypes = {
  diff: PropTypes.string.isRequired,
};

const { TextArea } = Input;

function GitClient() {
  const {
    currentRepository,
    repositories,
    repositoryStatus,
    currentBranch,
    stagedFiles,
    modifiedFiles,
    untrackedFiles,
    deletedFiles,
    conflictedFiles,
    commitHistory,
    isLoading,
    operationInProgress,
    stageFiles,
    unstageFiles,
    commit,
    fetch,
    pull,
    push,
    popStash,
    applyStash,
    dropStash,
    getStashList,
    getStashFiles,
    getStashFileDiff,
    stashList,
    discardChanges,
    deleteUntrackedFiles,
    switchRepository,
    selectRepository,
    switchBranch,
    mergeBranch,
    getBranchesWithDates,
    getCommitHistory,
    getCommitFiles,
    getCommitDiff,
    refreshRepositoryStatus,
    undoLastOperation,
    createBranch,
    cloneRepository,
    initRepository,
    selectDirectory,
    // GitHub integration
    isGitHubAuthenticated,
    githubUser,
    githubRepositories,
    githubRepoInfo,
    authenticateGitHub,
    loadGitHubRepositories,
    logoutGitHub,
    loadGitHubRepoInfo,
    // Pull Requests
    loadPullRequests,
  } = useGit();

  // UI State
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileStaged, setSelectedFileStaged] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [commitDescription, setCommitDescription] = useState('');
  const [branchesWithDates, setBranchesWithDates] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [recentRepositories, setRecentRepositories] = useState([]);
  const [hasTriedAutoOpen, setHasTriedAutoOpen] = useState(false);
  const [pullStrategy, setPullStrategy] = useState('merge');
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showStashModal, setShowStashModal] = useState(false);
  const [showPopStashModal, setShowPopStashModal] = useState(false);
  const [popStashFiles, setPopStashFiles] = useState({});
  const [stashFileDiffs, setStashFileDiffs] = useState({});
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchError, setNewBranchError] = useState('');
  const [commitFiles, setCommitFiles] = useState([]);
  const [commitDiff, setCommitDiff] = useState(null);
  const [loadingCommitFiles, setLoadingCommitFiles] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [allFiles, setAllFiles] = useState([]);
  const [showPRView, setShowPRView] = useState(false);
  const [showPRCreate, setShowPRCreate] = useState(false);
  const [selectedPR, setSelectedPR] = useState(null);
  const [fileSearchTerm, setFileSearchTerm] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneTargetPath, setCloneTargetPath] = useState('');
  const [initTargetPath, setInitTargetPath] = useState('');
  const fileSearchInputRef = useRef(null);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [authenticatingGitHub, setAuthenticatingGitHub] = useState(false);
  const [githubRepoSearchTerm, setGithubRepoSearchTerm] = useState('');
  const [personalAccessToken, setPersonalAccessToken] = useState('');

  // Load GitHub repo info when repository changes
  useEffect(() => {
    if (currentRepository && isGitHubAuthenticated) {
      loadGitHubRepoInfo();
    }
  }, [currentRepository, isGitHubAuthenticated, loadGitHubRepoInfo]);

  // Load recent repositories from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('gitRecentRepositories');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentRepositories(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load recent repositories:', error);
    }
  }, []);

  // Auto-open most recent repository on startup
  useEffect(() => {
    const autoOpenRecent = async () => {
      if (hasTriedAutoOpen || currentRepository) return;
      setHasTriedAutoOpen(true);

      try {
        const stored = localStorage.getItem('gitRecentRepositories');
        if (stored) {
          const recent = JSON.parse(stored);
          if (Array.isArray(recent) && recent.length > 0) {
            await switchRepository(recent[0].path);
            await refreshRepositoryStatus();
          }
        }
      } catch (error) {
        console.error('Failed to auto-open recent repository:', error);
      }
    };
    autoOpenRecent();
  }, [
    hasTriedAutoOpen,
    currentRepository,
    switchRepository,
    refreshRepositoryStatus,
  ]);

  // Save current repository to recent list
  useEffect(() => {
    if (currentRepository) {
      const repoName = currentRepository.split('/').pop();
      const newEntry = {
        path: currentRepository,
        name: repoName,
        lastOpened: new Date().toISOString(),
      };
      setRecentRepositories((prev) => {
        const filtered = prev.filter((r) => r.path !== currentRepository);
        const updated = [newEntry, ...filtered].slice(0, 10);
        localStorage.setItem('gitRecentRepositories', JSON.stringify(updated));
        return updated;
      });
    }
  }, [currentRepository]);

  // Load commit history when repository changes
  useEffect(() => {
    if (currentRepository) {
      getCommitHistory({ maxCount: 100 });
    }
  }, [currentRepository, getCommitHistory]);

  // Load branches when repository changes
  useEffect(() => {
    const loadBranches = async () => {
      if (currentRepository) {
        try {
          setLoadingBranches(true);
          const branchesData = await getBranchesWithDates();
          setBranchesWithDates(branchesData || []);
        } catch (error) {
          console.error('Failed to load branches:', error);
        } finally {
          setLoadingBranches(false);
        }
      }
    };
    loadBranches();
  }, [currentRepository, currentBranch, getBranchesWithDates]);

  // Unstaged files - show modified, untracked, conflicted, and deleted files
  const unstagedFiles = useMemo(() => {
    const files = [];
    (modifiedFiles || []).forEach((f) => {
      files.push({ path: f, status: 'modified' });
    });
    (untrackedFiles || []).forEach((f) => {
      files.push({ path: f, status: 'untracked' });
    });
    (conflictedFiles || []).forEach((f) => {
      files.push({ path: f, status: 'conflicted' });
    });
    (deletedFiles || []).forEach((f) => {
      files.push({ path: f, status: 'deleted' });
    });
    return files;
  }, [modifiedFiles, untrackedFiles, conflictedFiles, deletedFiles]);

  const hasChanges = stagedFiles?.length > 0 || unstagedFiles.length > 0;
  const hasStagedChanges = stagedFiles && stagedFiles.length > 0;
  const hasConflicts = conflictedFiles && conflictedFiles.length > 0;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleFileSelect = useCallback((file, isStaged = false) => {
    console.log('File selected:', file, 'staged:', isStaged);
    setSelectedFile(file);
    setSelectedFileStaged(isStaged);
    setEditingFile(null);
    setEditedContent('');
    setOriginalContent('');
  }, []);

  const handleCommitSelect = useCallback(
    async (commitData) => {
      setSelectedCommit(commitData);
      setSelectedFile(null);
      setSelectedFileStaged(false);
      setCommitDiff(null);
      setCommitFiles([]);
      setEditingFile(null);
      setEditedContent('');
      setOriginalContent('');

      if (commitData?.hash) {
        try {
          setLoadingCommitFiles(true);
          const files = await getCommitFiles(commitData.hash);
          setCommitFiles(files || []);
        } catch (error) {
          console.error('Failed to load commit files:', error);
        } finally {
          setLoadingCommitFiles(false);
        }
      }
    },
    [getCommitFiles],
  );

  const handleBackToChanges = useCallback(() => {
    setSelectedCommit(null);
    setSelectedFile(null);
    setSelectedFileStaged(false);
    setCommitFiles([]);
    setCommitDiff(null);
    setEditingFile(null);
    setEditedContent('');
    setOriginalContent('');
  }, []);

  const handleCommitFileSelect = useCallback(
    async (filePath) => {
      if (!selectedCommit?.hash) return;
      setSelectedFile(filePath);
      setCommitDiff(null);
      try {
        const diff = await getCommitDiff(selectedCommit.hash, filePath);
        setCommitDiff(diff);
      } catch (error) {
        console.error('Failed to load commit diff:', error);
      }
    },
    [selectedCommit, getCommitDiff],
  );

  const handleStageFile = useCallback(
    async (filePath) => {
      try {
        await stageFiles([filePath]);
      } catch (error) {
        console.error('Failed to stage file:', error);
      }
    },
    [stageFiles],
  );

  const handleUnstageFile = useCallback(
    async (filePath) => {
      try {
        await unstageFiles([filePath]);
      } catch (error) {
        console.error('Failed to unstage file:', error);
      }
    },
    [unstageFiles],
  );

  const handleStageAll = useCallback(async () => {
    const filesToStage = unstagedFiles
      .filter((f) => f.status !== 'conflicted')
      .map((f) => f.path);
    if (filesToStage.length > 0) {
      await stageFiles(filesToStage);
    }
  }, [unstagedFiles, stageFiles]);

  const handleUnstageAll = useCallback(async () => {
    if (stagedFiles && stagedFiles.length > 0) {
      await unstageFiles(stagedFiles);
    }
  }, [stagedFiles, unstageFiles]);

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) {
      message.warning('Please enter a commit message');
      return;
    }
    try {
      await commit(commitMessage, commitDescription);
      setCommitMessage('');
      setCommitDescription('');
      await getCommitHistory({ maxCount: 100 });
    } catch (error) {
      console.error('Failed to commit:', error);
    }
  }, [commitMessage, commitDescription, commit, getCommitHistory]);

  const handlePull = useCallback(async () => {
    try {
      await pull('origin', null, pullStrategy);
      await refreshRepositoryStatus();
      await getCommitHistory({ maxCount: 100 });
    } catch (error) {
      console.error('Failed to pull:', error);
    }
  }, [pull, pullStrategy, refreshRepositoryStatus, getCommitHistory]);

  const handlePush = useCallback(async () => {
    try {
      await push();
      await refreshRepositoryStatus();
      await getCommitHistory({ maxCount: 100 });
    } catch (error) {
      console.error('Failed to push:', error);
    }
  }, [push, refreshRepositoryStatus, getCommitHistory]);

  const handleDiscard = useCallback(
    async (filePath) => {
      try {
        await discardChanges([filePath]);
      } catch (error) {
        console.error('Failed to discard:', error);
      }
    },
    [discardChanges],
  );

  const handleDelete = useCallback(
    async (filePath) => {
      try {
        await deleteUntrackedFiles([filePath]);
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    },
    [deleteUntrackedFiles],
  );

  const handleBranchChange = useCallback(
    async (branchName) => {
      try {
        await switchBranch(branchName);
        await refreshRepositoryStatus();
        await getCommitHistory({ maxCount: 100 });
      } catch (error) {
        console.error('Failed to switch branch:', error);
      }
    },
    [switchBranch, refreshRepositoryStatus, getCommitHistory],
  );

  const handleCreateBranch = useCallback(async () => {
    const trimmedName = newBranchName.trim();
    if (!trimmedName) {
      setNewBranchError('Branch name is required');
      return;
    }
    // Check for duplicate
    const exists = branchesWithDates.some((b) => b.name === trimmedName);
    if (exists) {
      setNewBranchError(`Branch "${trimmedName}" already exists`);
      return;
    }
    try {
      await createBranch(trimmedName);
      setNewBranchName('');
      setNewBranchError('');
      // Refresh branches list
      const branchesData = await getBranchesWithDates();
      setBranchesWithDates(branchesData || []);
    } catch (error) {
      setNewBranchError(error.message || 'Failed to create branch');
    }
  }, [newBranchName, branchesWithDates, createBranch, getBranchesWithDates]);

  // File picker functions
  const openFilePicker = useCallback(async () => {
    if (!currentRepository) return;
    setShowFilePicker(true);
    setFileSearchTerm('');
    setLoadingFiles(true);
    try {
      const files = await ipcRenderer.invoke(
        'git:listFiles',
        currentRepository,
      );
      setAllFiles(files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
      message.error('Failed to load file list');
    } finally {
      setLoadingFiles(false);
    }
  }, [currentRepository]);

  const handleFilePickerSelect = useCallback(
    async (filePath) => {
      setShowFilePicker(false);
      setSelectedCommit(null); // Clear any selected commit
      setSelectedFile(null); // Clear regular file selection
      setSelectedFileStaged(false);
      try {
        const result = await ipcRenderer.invoke(
          'git:readFile',
          currentRepository,
          filePath,
        );
        if (result.success) {
          setEditingFile(filePath);
          setEditedContent(result.content);
          setOriginalContent(result.content);
        }
      } catch (error) {
        console.error('Failed to load file:', error);
        message.error('Failed to load file');
      }
    },
    [currentRepository],
  );

  const handleSaveFile = useCallback(async () => {
    if (!editingFile || !currentRepository) return;
    setIsSaving(true);
    try {
      const result = await ipcRenderer.invoke(
        'git:writeFile',
        currentRepository,
        editingFile,
        editedContent,
      );
      if (result.success) {
        message.success('File saved');
        setOriginalContent(editedContent);
        await refreshRepositoryStatus();
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      message.error('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  }, [editingFile, currentRepository, editedContent, refreshRepositoryStatus]);

  const handleCloseEditor = useCallback(() => {
    setEditingFile(null);
    setEditedContent('');
    setOriginalContent('');
  }, []);

  const filteredPickerFiles = useMemo(() => {
    if (!fileSearchTerm) return allFiles.slice(0, 50);
    const term = fileSearchTerm.toLowerCase();
    return allFiles.filter((f) => f.toLowerCase().includes(term)).slice(0, 50);
  }, [allFiles, fileSearchTerm]);

  const filteredGitHubRepos = useMemo(() => {
    if (!githubRepositories || githubRepositories.length === 0) return [];
    if (!githubRepoSearchTerm.trim()) return githubRepositories;
    const term = githubRepoSearchTerm.toLowerCase();
    return githubRepositories.filter(
      (repo) =>
        (repo.name && repo.name.toLowerCase().includes(term)) ||
        (repo.full_name && repo.full_name.toLowerCase().includes(term)) ||
        (repo.description && repo.description.toLowerCase().includes(term)),
    );
  }, [githubRepositories, githubRepoSearchTerm]);

  const hasUnsavedChanges = editingFile && editedContent !== originalContent;

  // Focus search input when file picker opens
  useEffect(() => {
    if (showFilePicker && fileSearchInputRef.current) {
      setTimeout(() => fileSearchInputRef.current?.focus(), 100);
    }
  }, [showFilePicker]);

  // Ctrl+P keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (currentRepository) {
          openFilePicker();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRepository, openFilePicker]);

  const handleClone = useCallback(async () => {
    if (!cloneUrl.trim() || !cloneTargetPath.trim()) {
      message.warning('Please enter a repository URL and target directory');
      return;
    }
    try {
      await cloneRepository(cloneUrl.trim(), cloneTargetPath.trim());
      setShowCloneModal(false);
      setCloneUrl('');
      setCloneTargetPath('');
      await refreshRepositoryStatus();
    } catch (error) {
      console.error('Failed to clone:', error);
    }
  }, [cloneUrl, cloneTargetPath, cloneRepository, refreshRepositoryStatus]);

  const handleInit = useCallback(async () => {
    if (!initTargetPath.trim()) {
      message.warning('Please select a directory');
      return;
    }
    try {
      await initRepository(initTargetPath.trim());
      setShowInitModal(false);
      setInitTargetPath('');
      await refreshRepositoryStatus();
    } catch (error) {
      console.error('Failed to init:', error);
    }
  }, [initTargetPath, initRepository, refreshRepositoryStatus]);

  const handleSelectCloneDirectory = useCallback(async () => {
    const dir = await selectDirectory();
    if (dir) {
      setCloneTargetPath(dir);
    }
  }, [selectDirectory]);

  const handleSelectInitDirectory = useCallback(async () => {
    const dir = await selectDirectory();
    if (dir) {
      setInitTargetPath(dir);
    }
  }, [selectDirectory]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'staged':
        return <CheckOutlined style={{ color: '#52c41a' }} />;
      case 'modified':
        return <SyncOutlined style={{ color: '#fa8c16' }} />;
      case 'untracked':
        return <PlusOutlined style={{ color: '#1890ff' }} />;
      case 'deleted':
        return <MinusOutlined style={{ color: '#f5222d' }} />;
      case 'conflicted':
        return <WarningOutlined style={{ color: '#f5222d' }} />;
      default:
        return <FileTextOutlined />;
    }
  };

  // Toolbar
  const renderToolbar = () => (
    <Header className="git-toolbar">
      <div className="toolbar-left">
        <Dropdown
          menu={{
            items: [
              ...(repositories || []).map((repo) => ({
                key: repo.path,
                label: (
                  <Space>
                    <GitlabOutlined />
                    {repo.name}
                  </Space>
                ),
                onClick: () =>
                  switchRepository(repo.path).then(() =>
                    refreshRepositoryStatus(),
                  ),
              })),
              ...(recentRepositories.filter(
                (r) =>
                  !(repositories || []).some((repo) => repo.path === r.path),
              ).length > 0
                ? [
                    { type: 'divider' },
                    ...recentRepositories
                      .filter(
                        (r) =>
                          !(repositories || []).some(
                            (repo) => repo.path === r.path,
                          ),
                      )
                      .map((repo) => ({
                        key: `recent-${repo.path}`,
                        label: (
                          <Space>
                            <HistoryOutlined />
                            {repo.name}
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              {formatDate(repo.lastOpened)}
                            </Text>
                          </Space>
                        ),
                        onClick: async () => {
                          try {
                            await switchRepository(repo.path);
                            await refreshRepositoryStatus();
                          } catch (e) {
                            message.error('Failed to open repository');
                          }
                        },
                      })),
                  ]
                : []),
              { type: 'divider' },
              {
                key: 'add',
                label: (
                  <Space>
                    <FolderOpenOutlined />
                    Add Repository
                  </Space>
                ),
                onClick: () =>
                  selectRepository().then(() => refreshRepositoryStatus()),
              },
              {
                key: 'clone',
                label: (
                  <Space>
                    <CloudDownloadOutlined />
                    Clone Repository
                  </Space>
                ),
                onClick: () => setShowCloneModal(true),
              },
              {
                key: 'init',
                label: (
                  <Space>
                    <PlusOutlined />
                    Init New Repository
                  </Space>
                ),
                onClick: () => setShowInitModal(true),
              },
            ],
          }}
          trigger={['click']}
        >
          <Button className="repo-button">
            <Space>
              <GitlabOutlined />
              <span>
                {currentRepository
                  ? currentRepository.split('/').pop()
                  : 'Select Repository'}
              </span>
            </Space>
          </Button>
        </Dropdown>

        {currentRepository && (
          <Select
            value={currentBranch}
            onChange={handleBranchChange}
            loading={loadingBranches}
            className="branch-select"
            suffixIcon={<BranchesOutlined />}
            dropdownMatchSelectWidth={false}
          >
            {branchesWithDates.map((branch) => (
              <Option key={branch.name} value={branch.name}>
                <Space>
                  <span>{branch.name}</span>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {formatDate(branch.lastCommitDate)}
                  </Text>
                </Space>
              </Option>
            ))}
          </Select>
        )}
      </div>

      <div className="toolbar-center">
        <Space size={4}>
          <Tooltip title="Undo">
            <Button
              icon={<UndoOutlined />}
              onClick={undoLastOperation}
              disabled={operationInProgress}
            />
          </Tooltip>
          <Tooltip title="Redo">
            <Button icon={<RedoOutlined />} disabled />
          </Tooltip>

          <Divider type="vertical" />

          <Tooltip title="Fetch">
            <Button
              icon={<SyncOutlined />}
              onClick={() => fetch()}
              loading={operationInProgress}
            />
          </Tooltip>
          <Tooltip title={`Pull (${pullStrategy})`}>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'merge',
                    label: 'Pull (Merge)',
                    onClick: () => {
                      setPullStrategy('merge');
                      pull('origin', null, 'merge');
                    },
                  },
                  {
                    key: 'rebase',
                    label: 'Pull (Rebase)',
                    onClick: () => {
                      setPullStrategy('rebase');
                      pull('origin', null, 'rebase');
                    },
                  },
                  {
                    key: 'ff',
                    label: 'Pull (Fast-forward)',
                    onClick: () => {
                      setPullStrategy('ff-only');
                      pull('origin', null, 'ff-only');
                    },
                  },
                ],
              }}
              trigger={['contextMenu']}
            >
              <Button
                icon={<CloudDownloadOutlined />}
                onClick={handlePull}
                loading={operationInProgress}
              />
            </Dropdown>
          </Tooltip>
          <Tooltip title="Push">
            <Button
              icon={<CloudUploadOutlined />}
              onClick={handlePush}
              loading={operationInProgress}
              disabled={!repositoryStatus?.ahead}
            >
              {repositoryStatus?.ahead > 0 && (
                <Badge count={repositoryStatus.ahead} size="small" />
              )}
            </Button>
          </Tooltip>

          <Divider type="vertical" />

          <Tooltip title="Branch">
            <Button
              icon={<BranchesOutlined />}
              onClick={() => setShowBranchModal(true)}
            />
          </Tooltip>
          <Tooltip title="Stash">
            <Button
              icon={<InboxOutlined />}
              onClick={() => setShowStashModal(true)}
              disabled={!hasChanges || operationInProgress}
            />
          </Tooltip>
          <Tooltip title="Pop Stash">
            <Button
              icon={<ExportOutlined />}
              onClick={() => {
                getStashList();
                setShowPopStashModal(true);
              }}
              disabled={operationInProgress}
            />
          </Tooltip>

          <Divider type="vertical" />

          <Tooltip title="Open File (Ctrl+P)">
            <Button icon={<FileSearchOutlined />} onClick={openFilePicker} />
          </Tooltip>
        </Space>
      </div>

      <div className="toolbar-right">
        {githubRepoInfo && isGitHubAuthenticated && (
          <Tooltip title="Pull Requests">
            <Button
              icon={<MergeOutlined />}
              onClick={() => setShowPRView(!showPRView)}
              type={showPRView ? 'primary' : 'default'}
            >
              Pull Requests
            </Button>
          </Tooltip>
        )}
        <Tooltip
          title={
            isGitHubAuthenticated ? 'GitHub connected' : 'Connect to GitHub'
          }
        >
          <Button
            icon={<GitlabOutlined />}
            onClick={() => setShowGitHubModal(true)}
          >
            {isGitHubAuthenticated && githubUser?.login
              ? githubUser.login
              : 'GitHub'}
          </Button>
        </Tooltip>
        <Tooltip title="Refresh">
          <Button
            icon={<ReloadOutlined />}
            onClick={async () => {
              await refreshRepositoryStatus();
              await getCommitHistory({ maxCount: 100 });
            }}
            loading={isLoading}
          />
        </Tooltip>
        <Tooltip title="Settings">
          <Button icon={<SettingOutlined />} />
        </Tooltip>
      </div>
    </Header>
  );

  // LEFT: Commit history
  const renderCommitHistory = () => (
    <div className="commit-history">
      <div className="history-header">
        <Text strong>Commits</Text>
      </div>

      {hasChanges && (
        <div
          className={`commit-item uncommitted ${!selectedCommit ? 'active' : ''}`}
          onClick={handleBackToChanges}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleBackToChanges();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="commit-graph">
            <div className="graph-line" />
            <div className="graph-node uncommitted" />
          </div>
          <div className="commit-info">
            <Text className="commit-msg">Uncommitted Changes</Text>
            <Text className="commit-meta">
              {(stagedFiles?.length || 0) + unstagedFiles.length} files changed
            </Text>
          </div>
        </div>
      )}

      <div className="commit-list">
        {(commitHistory || []).map((c) => (
          <div
            key={c.hash}
            className={`commit-item ${selectedCommit?.hash === c.hash ? 'active' : ''}`}
            onClick={() => handleCommitSelect(c)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCommitSelect(c);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="commit-graph">
              <div className="graph-line" />
              <div className="graph-node" />
            </div>
            <div className="commit-info">
              <Text className="commit-msg" ellipsis={{ tooltip: c.message }}>
                {c.message}
              </Text>
              <Text className="commit-meta">
                {c.author_name} • {formatDate(c.date)}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Check if a file is untracked
  const isFileUntracked = useCallback(
    (file) => {
      return untrackedFiles && untrackedFiles.includes(file);
    },
    [untrackedFiles],
  );

  // MIDDLE: Diff viewer
  const renderMiddlePanel = () => {
    // Editing a file from file picker
    if (editingFile) {
      return (
        <div className="middle-panel has-file">
          <div className="file-header">
            <Space>
              <FileTextOutlined />
              <Text strong>{editingFile}</Text>
              {hasUnsavedChanges && <Tag color="orange">Unsaved</Tag>}
            </Space>
            <Space>
              <Button
                type="primary"
                size="small"
                onClick={handleSaveFile}
                loading={isSaving}
                disabled={!hasUnsavedChanges}
              >
                Save
              </Button>
              <Button size="small" onClick={handleCloseEditor}>
                Close
              </Button>
            </Space>
          </div>
          <div
            className="diff-wrapper"
            style={{ height: 'calc(100% - 50px)', overflow: 'hidden' }}
          >
            <Input.TextArea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: '1.6',
                height: '100%',
                resize: 'none',
                border: 'none',
                borderRadius: 0,
                padding: '12px',
              }}
            />
          </div>
        </div>
      );
    }

    if (hasConflicts) {
      return (
        <div className="middle-panel">
          <MergeConflictResolver
            file={conflictedFiles[0]}
            onConflictResolved={() => refreshRepositoryStatus()}
            theme="light"
          />
        </div>
      );
    }

    if (selectedFile) {
      // Viewing a file from a historical commit
      if (selectedCommit) {
        const fileInfo = commitFiles.find((f) => f.path === selectedFile);
        return (
          <div className="middle-panel has-file">
            <div className="file-header">
              <Space>
                <FileTextOutlined />
                <Text strong>{selectedFile}</Text>
                {fileInfo && <Tag color="blue">{fileInfo.status}</Tag>}
                <Tag>{selectedCommit.hash?.substring(0, 7)}</Tag>
              </Space>
              <Button
                size="small"
                onClick={() => {
                  setSelectedFile(null);
                  setCommitDiff(null);
                }}
              >
                Close
              </Button>
            </div>
            <div className="diff-wrapper">
              {commitDiff ? (
                <EnhancedDiffViewer
                  diffData={commitDiff}
                  showFileSelector={false}
                  theme="light"
                  showStagingControls={false}
                  readOnly
                />
              ) : (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Spin tip="Loading diff..." />
                </div>
              )}
            </div>
          </div>
        );
      }

      // Viewing uncommitted changes
      const isUntracked = isFileUntracked(selectedFile);

      return (
        <div className="middle-panel has-file">
          <div className="file-header">
            <Space>
              <FileTextOutlined />
              <Text strong>{selectedFile}</Text>
              {selectedFileStaged && <Tag color="green">Staged</Tag>}
              {isUntracked && <Tag color="blue">New File</Tag>}
            </Space>
            <Button
              size="small"
              onClick={() => {
                setSelectedFile(null);
                setSelectedFileStaged(false);
              }}
            >
              Close
            </Button>
          </div>
          <div className="diff-wrapper">
            {isUntracked ? (
              <div className="untracked-notice">
                <Empty
                  image={
                    <PlusOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                  }
                  description={
                    <Space direction="vertical">
                      <Text>This is a new untracked file</Text>
                      <Text type="secondary">
                        Stage it to include in your next commit
                      </Text>
                    </Space>
                  }
                >
                  <Button
                    type="primary"
                    onClick={() => handleStageFile(selectedFile)}
                  >
                    Stage File
                  </Button>
                </Empty>
              </div>
            ) : (
              <EnhancedDiffViewer
                file={selectedFile}
                staged={selectedFileStaged}
                showFileSelector={false}
                theme="light"
                showStagingControls={!selectedCommit}
              />
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="middle-panel empty">
        <Empty
          image={<CodeOutlined style={{ fontSize: 48, color: '#bbb' }} />}
          description={
            <div>
              <Text style={{ color: '#666' }}>
                Select a file to view changes
              </Text>
            </div>
          }
        />
      </div>
    );
  };

  // RIGHT: File list + commit info + commit message
  const renderRightPanel = () => (
    <div className="right-panel">
      {/* Commit details when viewing a historical commit */}
      {selectedCommit && (
        <>
          <div className="commit-details">
            <div className="section-header">
              <Text strong>Commit Info</Text>
              <Button size="small" type="link" onClick={handleBackToChanges}>
                Back to changes
              </Button>
            </div>
            <div className="details-body">
              <div className="detail-row">
                <Text type="secondary">Hash</Text>
                <Text code copyable={{ text: selectedCommit.hash }}>
                  {selectedCommit.hash?.substring(0, 8)}
                </Text>
              </div>
              <div className="detail-row">
                <Text type="secondary">Author</Text>
                <Text>{selectedCommit.author_name}</Text>
              </div>
              <div className="detail-row">
                <Text type="secondary">Date</Text>
                <Text>{new Date(selectedCommit.date).toLocaleString()}</Text>
              </div>
              <div className="detail-row message">
                <Text>{selectedCommit.message}</Text>
              </div>
            </div>
          </div>

          <div className="file-section">
            <div className="section-header">
              <Space>
                <Text strong>Changed Files</Text>
                <Badge
                  count={commitFiles.length}
                  style={{ backgroundColor: '#1890ff' }}
                />
              </Space>
            </div>
            <Spin spinning={loadingCommitFiles}>
              <div className="file-list">
                {commitFiles.map(({ path, status }) => (
                  <div
                    key={path}
                    className={`file-item ${selectedFile === path ? 'active' : ''}`}
                    onClick={() => handleCommitFileSelect(path)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCommitFileSelect(path);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {getStatusIcon(getNormalizedStatus(status))}
                    <Text className="filename" ellipsis>
                      {path}
                    </Text>
                    <Tag size="small" style={{ marginLeft: 'auto' }}>
                      {status}
                    </Tag>
                  </div>
                ))}
                {!loadingCommitFiles && commitFiles.length === 0 && (
                  <Empty
                    description="No files changed"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </div>
            </Spin>
          </div>
        </>
      )}

      {/* File sections - only show when viewing uncommitted changes */}
      {!selectedCommit && (
        <>
          {/* Staged files */}
          {stagedFiles && stagedFiles.length > 0 && (
            <div className="file-section">
              <div className="section-header">
                <Space>
                  <Text strong className="staged-label">
                    Staged
                  </Text>
                  <Badge
                    count={stagedFiles.length}
                    style={{ backgroundColor: '#52c41a' }}
                  />
                </Space>
                <Button size="small" onClick={handleUnstageAll}>
                  Unstage All
                </Button>
              </div>
              <div className="file-list">
                {stagedFiles.map((file) => (
                  <div
                    key={`staged-${file}`}
                    className={`file-item ${selectedFile === file && selectedFileStaged ? 'active' : ''}`}
                    onClick={() => handleFileSelect(file, true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleFileSelect(file, true);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {getStatusIcon('staged')}
                    <Text className="filename" ellipsis>
                      {file}
                    </Text>
                    <div className="actions">
                      <Tooltip title="Unstage">
                        <Button
                          size="small"
                          type="text"
                          icon={<MinusOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnstageFile(file);
                          }}
                        />
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unstaged changes */}
          {unstagedFiles.length > 0 && (
            <div className="file-section">
              <div className="section-header">
                <Space>
                  <Text strong className="unstaged-label">
                    Unstaged Changes
                  </Text>
                  <Badge
                    count={unstagedFiles.length}
                    style={{ backgroundColor: '#fa8c16' }}
                  />
                </Space>
                <Button size="small" onClick={handleStageAll}>
                  Stage All
                </Button>
              </div>
              <div className="file-list">
                {unstagedFiles.map(({ path, status }) => (
                  <div
                    key={`unstaged-${path}`}
                    className={`file-item ${selectedFile === path && !selectedFileStaged ? 'active' : ''}`}
                    onClick={() => handleFileSelect(path, false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleFileSelect(path, false);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {getStatusIcon(status)}
                    <Text className="filename" ellipsis>
                      {path}
                    </Text>
                    <div className="actions">
                      {status !== 'conflicted' && (
                        <Tooltip title="Stage">
                          <Button
                            size="small"
                            type="text"
                            icon={<PlusOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStageFile(path);
                            }}
                          />
                        </Tooltip>
                      )}
                      {status === 'modified' && (
                        <Popconfirm
                          title="Discard changes?"
                          onConfirm={() => handleDiscard(path)}
                        >
                          <Button
                            size="small"
                            type="text"
                            danger
                            icon={<UndoOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      )}
                      {status === 'untracked' && (
                        <Popconfirm
                          title="Delete file?"
                          onConfirm={() => handleDelete(path)}
                        >
                          <Button
                            size="small"
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No changes */}
          {!hasChanges && (
            <div className="no-changes">
              <CheckOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              <Text type="secondary">Working tree clean</Text>
            </div>
          )}
        </>
      )}

      {/* Commit message - always at bottom when not viewing a commit */}
      {!selectedCommit && (
        <div className="commit-form">
          <div className="section-header">
            <Text strong>Commit</Text>
            {hasStagedChanges && (
              <Tag color="green">{stagedFiles.length} staged</Tag>
            )}
          </div>
          <Input
            placeholder="Commit message"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (
                (e.ctrlKey || e.metaKey) &&
                e.key === 'Enter' &&
                hasStagedChanges &&
                commitMessage.trim()
              ) {
                e.preventDefault();
                handleCommit();
              }
            }}
            className="commit-input"
          />
          <TextArea
            placeholder="Description (optional)"
            value={commitDescription}
            onChange={(e) => setCommitDescription(e.target.value)}
            onKeyDown={(e) => {
              if (
                (e.ctrlKey || e.metaKey) &&
                e.key === 'Enter' &&
                hasStagedChanges &&
                commitMessage.trim()
              ) {
                e.preventDefault();
                handleCommit();
              }
            }}
            autoSize={{ minRows: 2, maxRows: 4 }}
            className="commit-desc"
          />
          <Button
            type="primary"
            block
            onClick={handleCommit}
            disabled={!hasStagedChanges || !commitMessage.trim()}
            loading={operationInProgress}
          >
            Commit Changes
          </Button>
        </div>
      )}
    </div>
  );

  // No repository
  if (!currentRepository) {
    return (
      <div className="git-client">
        {renderToolbar()}
        <div className="empty-state">
          <Empty
            image={
              <GitlabOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            }
            description={
              <Space direction="vertical">
                <Text strong>No Repository Selected</Text>
                <Text type="secondary">Add a repository to get started</Text>
              </Space>
            }
          >
            <Button
              type="primary"
              icon={<FolderOpenOutlined />}
              onClick={() =>
                selectRepository().then(() => refreshRepositoryStatus())
              }
            >
              Add Repository
            </Button>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="git-client">
      {renderToolbar()}

      <Layout className="git-layout">
        <Sider width={260} className="left-sider">
          <Spin spinning={isLoading}>{renderCommitHistory()}</Spin>
        </Sider>

        <Content className="middle-content">
          <Spin spinning={operationInProgress}>
            {showPRView && selectedPR && (
              <PRReview
                pr={selectedPR}
                onClose={() => setSelectedPR(null)}
                onRefresh={() => {
                  if (githubRepoInfo) {
                    loadPullRequests(githubRepoInfo.owner, githubRepoInfo.repo);
                  }
                }}
              />
            )}

            {showPRView && !selectedPR && (
              <PRList
                onCreatePR={() => setShowPRCreate(true)}
                onViewPR={(pr) => setSelectedPR(pr)}
              />
            )}

            {!showPRView && renderMiddlePanel()}
          </Spin>
        </Content>

        <Sider width={280} className="right-sider">
          {renderRightPanel()}
        </Sider>
      </Layout>

      <Modal
        title="Branches"
        open={showBranchModal}
        onCancel={() => {
          setShowBranchModal(false);
          setNewBranchName('');
          setNewBranchError('');
        }}
        footer={null}
      >
        <div style={{ marginBottom: 16 }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="New branch name"
              value={newBranchName}
              onChange={(e) => {
                setNewBranchName(e.target.value);
                setNewBranchError('');
              }}
              onPressEnter={handleCreateBranch}
              status={newBranchError ? 'error' : undefined}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateBranch}
              loading={operationInProgress}
            >
              Create
            </Button>
          </Space.Compact>
          {newBranchError && (
            <Text type="danger" style={{ fontSize: 12 }}>
              {newBranchError}
            </Text>
          )}
        </div>
        <List
          dataSource={branchesWithDates}
          renderItem={(branch) => (
            <List.Item
              actions={[
                branch.name !== currentBranch && (
                  <Popconfirm
                    key="merge"
                    title={`Merge "${branch.name}" into "${currentBranch}"?`}
                    description="This will merge the selected branch into your current branch."
                    onConfirm={async () => {
                      try {
                        await mergeBranch(branch.name);
                        await refreshRepositoryStatus();
                        setShowBranchModal(false);
                      } catch (error) {
                        // Error handled by context
                      }
                    }}
                    okText="Merge"
                    cancelText="Cancel"
                  >
                    <Button
                      size="small"
                      icon={<MergeOutlined />}
                      loading={operationInProgress}
                    >
                      Merge
                    </Button>
                  </Popconfirm>
                ),
                <Button
                  key="checkout"
                  type={branch.name === currentBranch ? 'primary' : 'default'}
                  size="small"
                  onClick={() => {
                    handleBranchChange(branch.name);
                    setShowBranchModal(false);
                  }}
                >
                  {branch.name === currentBranch ? 'Current' : 'Checkout'}
                </Button>,
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={<BranchesOutlined />}
                title={branch.name}
                description={formatDate(branch.lastCommitDate)}
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* GitHub Integration Modal */}
      <Modal
        title={
          <Space>
            <GitlabOutlined />
            <span>GitHub Repositories</span>
          </Space>
        }
        open={showGitHubModal}
        onCancel={() => {
          setShowGitHubModal(false);
          setGithubRepoSearchTerm('');
        }}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {!isGitHubAuthenticated && (
            <>
              <Text>
                Connect to GitHub using OAuth to list your repositories, create
                pull requests, and more.
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                This will open your browser to authorize banFlow. No personal
                access token needed.
              </Text>
              <Button
                type="primary"
                size="large"
                block
                loading={authenticatingGitHub || isLoading}
                onClick={async () => {
                  setAuthenticatingGitHub(true);
                  try {
                    await authenticateGitHub();
                    await loadGitHubRepositories();
                  } catch (error) {
                    // errors are surfaced via context message
                  } finally {
                    setAuthenticatingGitHub(false);
                  }
                }}
                icon={<GitlabOutlined />}
              >
                Connect with GitHub
              </Button>
              <Divider>OR</Divider>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Prefer using a personal access token?
              </Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input.Password
                  placeholder="Enter GitHub Personal Access Token"
                  value={personalAccessToken}
                  onChange={(e) => setPersonalAccessToken(e.target.value)}
                  onPressEnter={async () => {
                    if (!personalAccessToken.trim()) return;
                    setAuthenticatingGitHub(true);
                    try {
                      await authenticateGitHub(personalAccessToken.trim());
                      await loadGitHubRepositories();
                    } catch {
                      // errors are surfaced via context message
                    } finally {
                      setAuthenticatingGitHub(false);
                    }
                  }}
                />
                <Button
                  block
                  type="primary"
                  loading={authenticatingGitHub || isLoading}
                  disabled={!personalAccessToken.trim()}
                  onClick={async () => {
                    if (!personalAccessToken.trim()) return;
                    setAuthenticatingGitHub(true);
                    try {
                      await authenticateGitHub(personalAccessToken.trim());
                      await loadGitHubRepositories();
                    } catch {
                      // errors are surfaced via context message
                    } finally {
                      setAuthenticatingGitHub(false);
                    }
                  }}
                >
                  Use Personal Access Token
                </Button>
              </Space>
            </>
          )}

          {isGitHubAuthenticated && (
            <>
              <Space
                align="center"
                style={{ width: '100%', justifyContent: 'space-between' }}
              >
                <Space align="center">
                  <Avatar
                    src={githubUser?.avatar_url}
                    icon={<UserOutlined />}
                  />
                  <div>
                    <Text strong>{githubUser?.login || 'GitHub User'}</Text>
                    {githubUser?.name && (
                      <div>
                        <Text type="secondary">{githubUser.name}</Text>
                      </div>
                    )}
                  </div>
                </Space>
                <Button
                  size="small"
                  danger
                  onClick={async () => {
                    await logoutGitHub();
                    setGithubRepoSearchTerm('');
                  }}
                >
                  Logout
                </Button>
              </Space>

              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text type="secondary">
                  Repositories ({filteredGitHubRepos?.length || 0}
                  {githubRepoSearchTerm &&
                    githubRepositories?.length > 0 &&
                    ` of ${githubRepositories.length}`}
                  )
                </Text>
                <Button
                  size="small"
                  onClick={async () => {
                    try {
                      await loadGitHubRepositories();
                    } catch (e) {
                      // handled via context
                    }
                  }}
                  loading={isLoading}
                  icon={<ReloadOutlined />}
                >
                  Refresh
                </Button>
              </Space>

              <Input
                placeholder="Search repositories by name or description..."
                prefix={<SearchOutlined />}
                value={githubRepoSearchTerm}
                onChange={(e) => setGithubRepoSearchTerm(e.target.value)}
                allowClear
                style={{ marginBottom: 8 }}
              />

              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {filteredGitHubRepos && filteredGitHubRepos.length > 0 ? (
                  <List
                    size="small"
                    dataSource={filteredGitHubRepos}
                    renderItem={(repo) => (
                      <List.Item
                        key={repo.id}
                        actions={[
                          <Button
                            key="clone"
                            size="small"
                            type="link"
                            onClick={() => {
                              setCloneUrl(repo.clone_url || repo.ssh_url || '');
                              setShowGitHubModal(false);
                              setShowCloneModal(true);
                            }}
                          >
                            Clone
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={repo.full_name || repo.name}
                          description={
                            <Text type="secondary">
                              {repo.description || 'No description'}
                            </Text>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty
                    description={
                      githubRepoSearchTerm && githubRepositories?.length > 0
                        ? `No repositories match "${githubRepoSearchTerm}"`
                        : 'No repositories loaded'
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </div>
            </>
          )}
        </Space>
      </Modal>

      {/* Quick Open File Modal */}
      <Modal
        title={
          <Space>
            <FileSearchOutlined />
            <span>Open File</span>
            <Tag>Ctrl+P</Tag>
          </Space>
        }
        open={showFilePicker}
        onCancel={() => setShowFilePicker(false)}
        footer={null}
        width={600}
      >
        <Input
          ref={fileSearchInputRef}
          placeholder="Type to search files..."
          value={fileSearchTerm}
          onChange={(e) => setFileSearchTerm(e.target.value)}
          prefix={<SearchOutlined />}
          allowClear
          style={{ marginBottom: 12 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filteredPickerFiles.length > 0) {
              handleFilePickerSelect(filteredPickerFiles[0]);
            }
            if (e.key === 'Escape') {
              setShowFilePicker(false);
            }
          }}
        />
        <Spin spinning={loadingFiles}>
          <List
            size="small"
            dataSource={filteredPickerFiles}
            style={{ maxHeight: 400, overflow: 'auto' }}
            renderItem={(filePath) => (
              <List.Item
                style={{ cursor: 'pointer', padding: '8px 12px' }}
                onClick={() => handleFilePickerSelect(filePath)}
                className="file-picker-item"
              >
                <Space>
                  <FileTextOutlined />
                  <Text ellipsis style={{ maxWidth: 500 }}>
                    {filePath}
                  </Text>
                </Space>
              </List.Item>
            )}
            locale={{
              emptyText: fileSearchTerm ? 'No files match' : 'No files found',
            }}
          />
          {allFiles.length > 50 && (
            <Text
              type="secondary"
              style={{ display: 'block', textAlign: 'center', marginTop: 8 }}
            >
              Showing {Math.min(50, filteredPickerFiles.length)} of{' '}
              {allFiles.length} files
            </Text>
          )}
        </Spin>
      </Modal>

      {/* Clone Repository Modal */}
      <Modal
        title={
          <Space>
            <CloudDownloadOutlined />
            <span>Clone Repository</span>
          </Space>
        }
        open={showCloneModal}
        onCancel={() => {
          setShowCloneModal(false);
          setCloneUrl('');
          setCloneTargetPath('');
        }}
        onOk={handleClone}
        okText="Clone"
        confirmLoading={isLoading}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>Repository URL</Text>
            <Input
              placeholder="https://github.com/user/repo.git"
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Text strong>Clone to Directory</Text>
            <Space.Compact style={{ width: '100%', marginTop: 4 }}>
              <Input
                placeholder="Select target directory..."
                value={cloneTargetPath}
                onChange={(e) => setCloneTargetPath(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button
                icon={<FolderOpenOutlined />}
                onClick={handleSelectCloneDirectory}
              >
                Browse
              </Button>
            </Space.Compact>
          </div>
        </Space>
      </Modal>

      {/* Pull Request Create Modal */}
      <PRCreate
        visible={showPRCreate}
        onCancel={() => setShowPRCreate(false)}
        onSuccess={(pr) => {
          setShowPRCreate(false);
          setSelectedPR(pr);
          setShowPRView(true);
        }}
      />

      {/* Init Repository Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            <span>Initialize New Repository</span>
          </Space>
        }
        open={showInitModal}
        onCancel={() => {
          setShowInitModal(false);
          setInitTargetPath('');
        }}
        onOk={handleInit}
        okText="Initialize"
        confirmLoading={isLoading}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>Directory</Text>
            <Space.Compact style={{ width: '100%', marginTop: 4 }}>
              <Input
                placeholder="Select directory to initialize..."
                value={initTargetPath}
                onChange={(e) => setInitTargetPath(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button
                icon={<FolderOpenOutlined />}
                onClick={handleSelectInitDirectory}
              >
                Browse
              </Button>
            </Space.Compact>
            <Text
              type="secondary"
              style={{ fontSize: 12, marginTop: 4, display: 'block' }}
            >
              This will create a new Git repository in the selected directory.
            </Text>
          </div>
        </Space>
      </Modal>

      {/* Stash Modal */}
      <StashModal
        visible={showStashModal}
        onCancel={() => setShowStashModal(false)}
        onSuccess={() => setShowStashModal(false)}
      />

      {/* Pop Stash Modal */}
      <Modal
        title="Stash List"
        open={showPopStashModal}
        onCancel={() => {
          setShowPopStashModal(false);
          setPopStashFiles({});
          setStashFileDiffs({});
        }}
        footer={null}
        width={700}
      >
        {stashList && stashList.length > 0 ? (
          <Collapse
            accordion
            onChange={async (key) => {
              if (key && !popStashFiles[key]) {
                try {
                  const files = await getStashFiles(parseInt(key, 10));
                  setPopStashFiles((prev) => ({ ...prev, [key]: files }));
                } catch (e) {
                  console.error('Failed to load stash files:', e);
                }
              }
            }}
          >
            {stashList.map((stash, index) => (
              <Collapse.Panel
                key={`stash-${stash.index}`}
                header={
                  <Space
                    direction="vertical"
                    size={0}
                    style={{ width: '100%' }}
                  >
                    <Text strong>{stash.message || `stash@{${index}}`}</Text>
                    <Space size="small">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {stash.date}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        by {stash.author_name}
                      </Text>
                    </Space>
                  </Space>
                }
                extra={
                  <Space onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="small"
                      onClick={() => {
                        applyStash(index);
                        getStashList();
                        setStashFileDiffs({});
                      }}
                      loading={operationInProgress}
                    >
                      Apply
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      onClick={async () => {
                        try {
                          await popStash(index);
                          setShowPopStashModal(false);
                          setPopStashFiles({});
                          setStashFileDiffs({});
                        } catch (error) {
                          console.error('Failed to pop stash:', error);
                        }
                      }}
                      loading={operationInProgress}
                    >
                      Pop
                    </Button>
                    <Popconfirm
                      title="Delete this stash?"
                      description="This will permanently delete the stash. This action cannot be undone."
                      onConfirm={async () => {
                        try {
                          await dropStash(index);
                          getStashList();
                          setPopStashFiles({});
                          setStashFileDiffs({});
                        } catch (error) {
                          console.error('Failed to drop stash:', error);
                        }
                      }}
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        loading={operationInProgress}
                      />
                    </Popconfirm>
                  </Space>
                }
              >
                {popStashFiles[index] ? (
                  <Collapse
                    size="small"
                    ghost
                    onChange={async (keys) => {
                      // Handle file diff expansion
                      await Promise.all(
                        keys.map(async (key) => {
                          if (!stashFileDiffs[`${index}-${key}`]) {
                            try {
                              const diff = await getStashFileDiff(index, key);
                              setStashFileDiffs((prev) => ({
                                ...prev,
                                [`${index}-${key}`]: diff,
                              }));
                            } catch (e) {
                              console.error('Failed to load file diff:', e);
                            }
                          }
                        }),
                      );
                    }}
                  >
                    {(popStashFiles[index].files || []).map((file) => (
                      <Collapse.Panel
                        key={file.filename}
                        header={
                          <Space>
                            {file.status === 'added' && (
                              <FileAddOutlined style={{ color: '#52c41a' }} />
                            )}
                            {file.status === 'modified' && (
                              <EditOutlined style={{ color: '#faad14' }} />
                            )}
                            {file.status === 'deleted' && (
                              <FileExcelOutlined style={{ color: '#ff4d4f' }} />
                            )}
                            {!['added', 'modified', 'deleted'].includes(
                              file.status,
                            ) && <FileTextOutlined />}
                            <Tag
                              size="small"
                              color={getStatusColor(file.status)}
                            >
                              {file.status}
                            </Tag>
                            <Text>{file.filename}</Text>
                          </Space>
                        }
                      >
                        {stashFileDiffs[`${index}-${file.filename}`] ? (
                          <DiffViewer
                            diff={stashFileDiffs[`${index}-${file.filename}`]}
                          />
                        ) : (
                          <Spin size="small" />
                        )}
                      </Collapse.Panel>
                    ))}
                  </Collapse>
                ) : (
                  <Spin size="small" />
                )}
              </Collapse.Panel>
            ))}
          </Collapse>
        ) : (
          <Empty description="No stashes found" />
        )}
      </Modal>
    </div>
  );
}

export default GitClient;
