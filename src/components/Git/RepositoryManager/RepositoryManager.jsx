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
    clearError
  } = useGit();

  const [showAddModal, setShowAddModal] = useState(false);
  const [repoPath, setRepoPath] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(currentRepository);

  useEffect(() => {
    setSelectedRepo(currentRepository);
  }, [currentRepository]);

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
    </div>
  );
}

export default RepositoryManager; 