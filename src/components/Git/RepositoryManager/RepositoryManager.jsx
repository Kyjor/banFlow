import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Select, 
  Badge, 
  Typography, 
  Space, 
  Empty, 
  Tooltip, 
  Modal,
  Input,
  message,
  Spin,
  Tag,
  Divider
} from 'antd';
import {
  FolderOpenOutlined,
  GitlabOutlined,
  BranchesOutlined,
  SyncOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useGit } from '../../../contexts/GitContext';
import './RepositoryManager.scss';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

function RepositoryManager({ compact = false }) {
  const {
    repositories,
    currentRepository,
    repositoryStatus,
    isLoading,
    operationInProgress,
    lastError,
    addRepository,
    switchRepository,
    selectRepository,
    refreshRepositoryStatus,
    clearError,
    getProjectRepositoryStats,
    cleanupProjectRepositories
  } = useGit();

  const [showAddModal, setShowAddModal] = useState(false);
  const [repoPath, setRepoPath] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(currentRepository);
  const [projectStats, setProjectStats] = useState(null);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);

  useEffect(() => {
    setSelectedRepo(currentRepository);
  }, [currentRepository]);

  useEffect(() => {
    const loadProjectStats = async () => {
      try {
        const stats = await getProjectRepositoryStats();
        setProjectStats(stats);
      } catch (error) {
        console.error('Failed to load project stats:', error);
      }
    };

    loadProjectStats();
  }, [getProjectRepositoryStats]);

  // Persist repositories to localStorage whenever the list changes
  useEffect(() => {
    try {
      const paths = (repositories || []).map(r => r.path);
      localStorage.setItem('gitRepoPaths', JSON.stringify(paths));
    } catch (_) {
      // no-op
    }
  }, [repositories]);

  // Persist last active repository path
  useEffect(() => {
    if (currentRepository) {
      try {
        localStorage.setItem('gitLastActiveRepoPath', currentRepository);
      } catch (_) {
        // no-op
      }
    }
  }, [currentRepository]);

  // Restore repositories from localStorage on first mount
  useEffect(() => {
    if (restoredFromStorage) return;
    setRestoredFromStorage(true);
    try {
      const stored = JSON.parse(localStorage.getItem('gitRepoPaths') || '[]');
      const lastActive = localStorage.getItem('gitLastActiveRepoPath');
      if (Array.isArray(stored) && stored.length > 0) {
        const existingPaths = new Set((repositories || []).map(r => r.path));
        const toAdd = stored.filter(p => typeof p === 'string' && p && !existingPaths.has(p));
        const addAll = async () => {
          for (const p of toAdd) {
            try {
              // addRepository validates existence and repo status
              // Ignore failures silently
              // eslint-disable-next-line no-await-in-loop
              await addRepository(p);
            } catch (_) {}
          }
          if (lastActive) {
            try {
              await switchRepository(lastActive);
            } catch (_) {}
          }
        };
        addAll();
      } else if (lastActive) {
        // If no list but we have a last active, try to switch
        switchRepository(lastActive).catch(() => {});
      }
    } catch (_) {
      // no-op
    }
  // We only want this to run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddRepository = async () => {
    try {
      await addRepository(repoPath);
      setShowAddModal(false);
      setRepoPath('');
    } catch (error) {
      // Error handled by context
    }
  };

  const handleSelectRepository = async () => {
    try {
      await selectRepository();
    } catch (error) {
      // Error handled by context
    }
  };

  const handleSwitchRepository = async (repoPath) => {
    try {
      await switchRepository(repoPath);
      setSelectedRepo(repoPath);
    } catch (error) {
      // Error handled by context
    }
  };

  const handleCleanupRepositories = async () => {
    try {
      await cleanupProjectRepositories();
      setShowCleanupModal(false);
      // Refresh the repository list
      window.location.reload();
    } catch (error) {
      // Error handled by context
    }
  };

  const getCurrentRepoInfo = () => {
    return repositories.find(repo => repo.path === currentRepository);
  };

  const getStatusBadge = (status) => {
    if (!status) return null;

    const totalChanges = (status.staged?.length || 0) + 
                        (status.modified?.length || 0) + 
                        (status.created?.length || 0) + 
                        (status.deleted?.length || 0);

    if (totalChanges === 0) {
      return <Badge status="success" text="Clean" />;
    }

    const badges = [];
    if (status.staged?.length > 0) {
      badges.push(<Badge key="staged" status="processing" text={`${status.staged.length} staged`} />);
    }
    if (status.modified?.length > 0) {
      badges.push(<Badge key="modified" status="warning" text={`${status.modified.length} modified`} />);
    }
    if (status.created?.length > 0) {
      badges.push(<Badge key="created" status="success" text={`${status.created.length} new`} />);
    }
    if (status.deleted?.length > 0) {
      badges.push(<Badge key="deleted" status="error" text={`${status.deleted.length} deleted`} />);
    }

    return <Space direction="vertical" size="small">{badges}</Space>;
  };

  const formatLastAccessed = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <Card size="small" className="repository-manager-compact">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>Repository</Text>
            <Button 
              size="small" 
              icon={<PlusOutlined />} 
              onClick={handleSelectRepository}
              loading={isLoading}
            >
              Add
            </Button>
          </div>
          
          {repositories.length > 0 ? (
            <Select
              value={selectedRepo}
              onChange={handleSwitchRepository}
              style={{ width: '100%' }}
              size="small"
              placeholder="Select repository"
              loading={operationInProgress}
            >
              {repositories.map(repo => (
                <Option key={repo.path} value={repo.path}>
                  <Space>
                    <GitlabOutlined />
                    <Text>{repo.name}</Text>
                    {repo.path === currentRepository && <Tag color="blue" size="small">Active</Tag>}
                  </Space>
                </Option>
              ))}
            </Select>
          ) : (
            <Empty 
              description="No repositories added" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ margin: '8px 0' }}
            />
          )}

          {repositoryStatus && (
            <div style={{ marginTop: '8px' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Branch:</Text>
                  <Tag icon={<BranchesOutlined />} color="green">{repositoryStatus.currentBranch}</Tag>
                </div>
                {getStatusBadge(repositoryStatus)}
              </Space>
            </div>
          )}
        </Space>
      </Card>
    );
  }

  return (
    <div className="repository-manager">
      <Card
        title={
          <Space>
            <GitlabOutlined />
            <Title level={4} style={{ margin: 0 }}>Git Repositories</Title>
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Refresh status">
              <Button 
                icon={<SyncOutlined />} 
                onClick={refreshRepositoryStatus}
                loading={operationInProgress}
                disabled={!currentRepository}
              />
            </Tooltip>
            <Tooltip title="Cleanup non-existent repositories">
              <Button 
                icon={<DeleteOutlined />} 
                onClick={() => setShowCleanupModal(true)}
                danger
              />
            </Tooltip>
            <Button 
              type="primary" 
              icon={<FolderOpenOutlined />} 
              onClick={handleSelectRepository}
              loading={isLoading}
            >
              Add Repository
            </Button>
          </Space>
        }
        className="repository-card"
      >
        {lastError && (
          <div style={{ marginBottom: '16px' }}>
            <Badge status="error" text={lastError.message} />
            <Button size="small" type="link" onClick={clearError}>Dismiss</Button>
          </div>
        )}

        {/* Project Repository Stats */}
        {projectStats && (
          <Card 
            size="small" 
            title="Project Repository Stats" 
            className="project-stats-card"
            style={{ marginBottom: '16px' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Total Repositories:</Text>
                <Tag color="blue">{projectStats.total}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Active Repository:</Text>
                <Tag color="green">{projectStats.active}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Recently Accessed:</Text>
                <Tag color="orange">{projectStats.recentlyAccessed}</Tag>
              </div>
              {projectStats.lastAdded && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Last Added:</Text>
                  <Text type="secondary">{formatLastAccessed(projectStats.lastAdded.addedAt)}</Text>
                </div>
              )}
            </Space>
          </Card>
        )}

        {/* Current Repository Status */}
        {currentRepository && (
          <Card 
            size="small" 
            title="Current Repository" 
            className="current-repo-card"
            style={{ marginBottom: '16px' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>{getCurrentRepoInfo()?.name}</Text>
                <br />
                <Text type="secondary" copyable>{currentRepository}</Text>
              </div>
              
              {repositoryStatus && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Space>
                      <BranchesOutlined />
                      <Text>Branch:</Text>
                      <Tag color="green">{repositoryStatus.currentBranch}</Tag>
                    </Space>
                    {repositoryStatus.ahead > 0 && (
                      <Tag color="blue">↑{repositoryStatus.ahead}</Tag>
                    )}
                    {repositoryStatus.behind > 0 && (
                      <Tag color="orange">↓{repositoryStatus.behind}</Tag>
                    )}
                  </div>
                  
                  <div>
                    <Text type="secondary">Status:</Text>
                    <div style={{ marginTop: '4px' }}>
                      {getStatusBadge(repositoryStatus)}
                    </div>
                  </div>
                </>
              )}
            </Space>
          </Card>
        )}

        {/* Repository List */}
        <div className="repository-list">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <Title level={5} style={{ margin: 0 }}>All Repositories ({repositories.length})</Title>
          </div>

          {repositories.length === 0 ? (
            <Empty
              image={<GitlabOutlined style={{ fontSize: '48px', color: '#ccc' }} />}
              description={
                <div>
                  <Paragraph>No Git repositories added yet</Paragraph>
                  <Paragraph type="secondary">
                    Add your first repository to start using Git integration features
                  </Paragraph>
                </div>
              }
            >
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleSelectRepository}
                loading={isLoading}
              >
                Add Your First Repository
              </Button>
            </Empty>
          ) : (
            <List
              dataSource={repositories}
              loading={isLoading}
              renderItem={(repo) => (
                <List.Item
                  className={`repo-item ${repo.path === currentRepository ? 'active' : ''}`}
                  key={repo.path}
                  actions={[
                    <Tooltip title="Switch to this repository" key="switch">
                      <Button
                        type={repo.path === currentRepository ? "primary" : "default"}
                        size="small"
                        onClick={() => handleSwitchRepository(repo.path)}
                        loading={operationInProgress && selectedRepo === repo.path}
                        disabled={repo.path === currentRepository}
                      >
                        {repo.path === currentRepository ? 'Active' : 'Switch'}
                      </Button>
                    </Tooltip>,
                    <Tooltip title="Repository info" key="info">
                      <Button
                        size="small"
                        icon={<InfoCircleOutlined />}
                        onClick={() => message.info(`Repository: ${repo.name}\nPath: ${repo.path}\nBranches: ${repo.branches?.length || 0}`)}
                      />
                    </Tooltip>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{ textAlign: 'center' }}>
                        <GitlabOutlined style={{ fontSize: '24px', color: repo.path === currentRepository ? '#1890ff' : '#666' }} />
                        {repo.path === currentRepository && (
                          <div><Badge status="processing" /></div>
                        )}
                      </div>
                    }
                    title={
                      <Space>
                        <Text strong>{repo.name}</Text>
                        {repo.path === currentRepository && <Tag color="blue">Current</Tag>}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        <Text type="secondary" copyable={{ text: repo.path }}>
                          {repo.path}
                        </Text>
                        <Space size="small">
                          <Tag icon={<BranchesOutlined />}>
                            {repo.currentBranch || 'Unknown branch'}
                          </Tag>
                          <Tag icon={<ClockCircleOutlined />}>
                            {formatLastAccessed(repo.lastAccessed)}
                          </Tag>
                          {repo.branches && (
                            <Tag icon={<FileTextOutlined />}>
                              {repo.branches.length} branches
                            </Tag>
                          )}
                        </Space>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Card>

      {/* Add Repository Modal */}
      <Modal
        title="Add Git Repository"
        open={showAddModal}
        onOk={handleAddRepository}
        onCancel={() => {
          setShowAddModal(false);
          setRepoPath('');
        }}
        okText="Add Repository"
        cancelText="Cancel"
        confirmLoading={isLoading}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Paragraph>
            Enter the path to a Git repository or use the file selector to browse for one.
          </Paragraph>
          <Input
            placeholder="/path/to/your/git/repository"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            suffix={
              <Button 
                size="small" 
                icon={<FolderOpenOutlined />} 
                onClick={handleSelectRepository}
                type="link"
              >
                Browse
              </Button>
            }
          />
          <Text type="secondary">
            The selected directory must be a valid Git repository (contain .git folder).
          </Text>
        </Space>
      </Modal>

      {/* Cleanup Repositories Modal */}
      <Modal
        title="Cleanup Non-existent Repositories"
        open={showCleanupModal}
        onOk={handleCleanupRepositories}
        onCancel={() => setShowCleanupModal(false)}
        okText="Cleanup"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Paragraph>
            This will remove all repositories from the project that no longer exist on disk.
            This action cannot be undone.
          </Paragraph>
          <Text type="warning">
            ⚠️ Only repositories that have been moved or deleted will be removed.
            Valid repositories will remain in the project.
          </Text>
        </Space>
      </Modal>
    </div>
  );
}

export default RepositoryManager; 