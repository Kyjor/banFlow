import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Card,
  Tabs,
  Button,
  Space,
  Typography,
  Tag,
  Empty,
  Spin,
  Tooltip,
  Row,
  Col,
  Divider,
  Badge,
  Alert,
  Modal,
  message,
  Drawer,
  Menu,
  Dropdown,
  Select
} from 'antd';
import {
  CodeOutlined,
  BranchesOutlined,
  MergeOutlined,
  HistoryOutlined,
  SettingOutlined,
  MenuOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  BookOutlined,
  GithubOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  FileTextOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  MinusOutlined,
  CheckOutlined,
  UndoOutlined,
  CloseOutlined,
  GitlabOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { useGit } from '../../../contexts/GitContext';
import EnhancedDiffViewer from '../EnhancedDiffViewer/EnhancedDiffViewer';
import MergeConflictResolver from '../MergeConflictResolver/MergeConflictResolver';
import IntegratedEditor from '../IntegratedEditor/IntegratedEditor';
import GitOperations from '../GitOperations/GitOperations';
import './GitClient.scss';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

function GitClient() {
  const {
    currentRepository,
    repositories,
    repositoryStatus,
    branches,
    currentBranch,
    stagedFiles,
    modifiedFiles,
    untrackedFiles,
    conflictedFiles,
    isLoading,
    operationInProgress,
    lastError,
    discardChanges,
    deleteUntrackedFiles,
    cleanUntrackedFiles,
    switchRepository,
    selectRepository,
    switchBranch,
    getBranchesWithDates,
    refreshRepositoryStatus
  } = useGit();

  const [activeTab, setActiveTab] = useState('changes');
  const [selectedFile, setSelectedFile] = useState(null);
  const [layout, setLayout] = useState('split'); // 'split', 'full', 'compact'
  const [showFileList, setShowFileList] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState('light');
  const [viewMode, setViewMode] = useState('side-by-side');
  const [branchesWithDates, setBranchesWithDates] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  useEffect(() => {
    // Auto-select first modified file if available
    if (modifiedFiles && modifiedFiles.length > 0 && !selectedFile) {
      setSelectedFile(modifiedFiles[0]);
    }
  }, [modifiedFiles, selectedFile]);

  // Load branches with dates when repository or branch changes
  useEffect(() => {
    const loadBranches = async () => {
      if (currentRepository) {
        try {
          setLoadingBranches(true);
          const branchesData = await getBranchesWithDates();
          setBranchesWithDates(branchesData || []);
        } catch (error) {
          console.error('Failed to load branches:', error);
          setBranchesWithDates([]);
        } finally {
          setLoadingBranches(false);
        }
      } else {
        setBranchesWithDates([]);
      }
    };

    loadBranches();
  }, [currentRepository, currentBranch, getBranchesWithDates]);

  const formatBranchDate = (dateString) => {
    if (!dateString) return 'No commits';
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

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setActiveTab('changes');
  }, []);

  const handleStagingChange = useCallback((stagingData) => {
    // Handle staging changes
    console.log('Staging changed:', stagingData);
  }, []);

  const handleConflictResolved = useCallback((resolvedCount) => {
    message.success(`Resolved ${resolvedCount} conflicts`);
  }, []);

  const handleFileChange = useCallback((content, hasChanges) => {
    // Handle file content changes
    console.log('File changed:', { content, hasChanges });
  }, []);

  const getFileStatusColor = (filename) => {
    if (stagedFiles.includes(filename)) return 'success';
    if (modifiedFiles.includes(filename)) return 'warning';
    if (untrackedFiles.includes(filename)) return 'processing';
    if (conflictedFiles.includes(filename)) return 'error';
    return 'default';
  };

  const getFileStatusText = (filename) => {
    if (stagedFiles.includes(filename)) return 'Staged';
    if (modifiedFiles.includes(filename)) return 'Modified';
    if (untrackedFiles.includes(filename)) return 'New';
    if (conflictedFiles.includes(filename)) return 'Conflict';
    return 'Unchanged';
  };

  const getFileType = (filename) => {
    if (stagedFiles.includes(filename)) return 'staged';
    if (modifiedFiles.includes(filename)) return 'modified';
    if (untrackedFiles.includes(filename)) return 'untracked';
    if (conflictedFiles.includes(filename)) return 'conflicted';
    return 'unchanged';
  };

  const handleDiscardChanges = useCallback(async (file) => {
    try {
      await discardChanges([file]);
    } catch (error) {
      console.error('Failed to discard changes:', error);
    }
  }, [discardChanges]);

  const handleDeleteUntracked = useCallback(async (file) => {
    try {
      await deleteUntrackedFiles([file]);
    } catch (error) {
      console.error('Failed to delete untracked file:', error);
    }
  }, [deleteUntrackedFiles]);

  const renderFileList = () => {
    const allFiles = [
      ...(stagedFiles || []),
      ...(modifiedFiles || []),
      ...(untrackedFiles || []),
      ...(conflictedFiles || [])
    ];

    if (allFiles.length === 0) {
      return (
        <Empty
          image={<FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />}
          description="No changes found"
        />
      );
    }

    return (
      <div className="file-list">
        {allFiles.map(file => {
          const fileType = getFileType(file);
          return (
            <div
              key={file}
              className={`file-item ${selectedFile === file ? 'selected' : ''}`}
              onClick={() => handleFileSelect(file)}
            >
              <div className="file-info">
                <Space>
                  <FileTextOutlined />
                  <Text>{file}</Text>
                  <Tag color={getFileStatusColor(file)} size="small">
                    {getFileStatusText(file)}
                  </Tag>
                </Space>
              </div>
              <div className="file-actions" onClick={(e) => e.stopPropagation()}>
                {fileType === 'modified' && (
                  <Tooltip title="Discard changes">
                    <Button
                      size="small"
                      icon={<UndoOutlined />}
                      onClick={() => handleDiscardChanges(file)}
                      loading={operationInProgress}
                      danger
                    />
                  </Tooltip>
                )}
                {fileType === 'untracked' && (
                  <Tooltip title="Delete file">
                    <Button
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => handleDeleteUntracked(file)}
                      loading={operationInProgress}
                      danger
                    />
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMainContent = () => {
    if (!currentRepository) {
      return (
        <div className="no-repository">
          <Empty
            image={<CodeOutlined style={{ fontSize: '64px', color: '#ccc' }} />}
            description="No Git repository selected"
          >
            <Button type="primary" size="large">
              Add Repository
            </Button>
          </Empty>
        </div>
      );
    }

    return (
      <div className="main-content">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          className="main-tabs"
        >
          <TabPane
            tab={
              <Space>
                <FileTextOutlined />
                Changes
                <Badge count={modifiedFiles?.length || 0} />
              </Space>
            }
            key="changes"
          >
            <Row gutter={16}>
              {showFileList && (
                <Col span={8}>
                  <Card
                    title="Files"
                    size="small"
                    className="file-list-card"
                    extra={
                      <Button
                        icon={<MenuOutlined />}
                        onClick={() => setShowFileList(false)}
                        size="small"
                        type="text"
                      />
                    }
                  >
                    {renderFileList()}
                  </Card>
                </Col>
              )}
              
              <Col span={showFileList ? 16 : 24}>
                {!showFileList && (
                  <div style={{ marginBottom: 8 }}>
                    <Button
                      icon={<MenuOutlined />}
                      onClick={() => setShowFileList(true)}
                      size="small"
                      type="dashed"
                    >
                      Show File List
                    </Button>
                  </div>
                )}
                {selectedFile ? (
                  <div className="file-content">
                    <EnhancedDiffViewer
                      file={selectedFile}
                      theme={theme}
                      showFileSelector={false}
                      showStagingControls={true}
                    />
                  </div>
                ) : (
                  <Empty
                    description="Select a file to view changes"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Col>
            </Row>
          </TabPane>

          <TabPane
            tab={
              <Space>
                <EditOutlined />
                Editor
                {selectedFile && <Tag size="small">{selectedFile}</Tag>}
              </Space>
            }
            key="editor"
          >
            {selectedFile ? (
              <IntegratedEditor
                file={selectedFile}
                onFileChange={handleFileChange}
                showStagingControls={true}
                autoSave={true}
                theme={theme}
              />
            ) : (
              <Empty
                description="Select a file to edit"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </TabPane>

          <TabPane
            tab={
              <Space>
                <MergeOutlined />
                Conflicts
                <Badge count={conflictedFiles?.length || 0} />
              </Space>
            }
            key="conflicts"
          >
            {conflictedFiles && conflictedFiles.length > 0 ? (
              <MergeConflictResolver
                file={conflictedFiles[0]}
                onConflictResolved={handleConflictResolved}
                showTutorial={true}
              />
            ) : (
              <Empty
                description="No merge conflicts found"
                image={<CheckOutlined style={{ fontSize: '48px', color: '#52c41a' }} />}
              />
            )}
          </TabPane>

          <TabPane
            tab={
              <Space>
                <BranchesOutlined />
                Operations
              </Space>
            }
            key="operations"
          >
            <GitOperations onViewDiff={handleFileSelect} />
          </TabPane>
        </Tabs>
      </div>
    );
  };

  const handleRepositoryChange = async (repoPath) => {
    try {
      await switchRepository(repoPath);
      await refreshRepositoryStatus();
    } catch (error) {
      console.error('Failed to switch repository:', error);
    }
  };

  const handleBranchChange = async (branchName) => {
    try {
      await switchBranch(branchName);
      await refreshRepositoryStatus();
    } catch (error) {
      console.error('Failed to switch branch:', error);
    }
  };

  const renderHeader = () => {
    return (
      <Header className="git-client-header">
        <div className="header-left">
          <Space size="middle" style={{ width: '100%' }}>
            <CodeOutlined style={{ fontSize: '24px', color: '#fff' }} />
            <Title level={4} style={{ margin: 0, color: '#fff' }}>
              Git
            </Title>
            
            {/* Repository Selector */}
            {currentRepository || (repositories && repositories.length > 0) ? (
              <Dropdown
                menu={{
                  items: [
                    ...(repositories || []).map(repo => ({
                      key: repo.path,
                      label: (
                        <Space>
                          <GitlabOutlined />
                          <span>{repo.name}</span>
                          {repo.path === currentRepository && (
                            <Tag color="blue" size="small">Active</Tag>
                          )}
                        </Space>
                      ),
                      onClick: () => handleRepositoryChange(repo.path)
                    })),
                    { type: 'divider' },
                    {
                      key: 'add-repo',
                      label: (
                        <Space>
                          <PlusOutlined />
                          <span>Add Repository</span>
                        </Space>
                      ),
                      onClick: async () => {
                        try {
                          await selectRepository();
                          await refreshRepositoryStatus();
                        } catch (error) {
                          console.error('Failed to add repository:', error);
                        }
                      }
                    }
                  ]
                }}
                trigger={['click']}
              >
                <Button
                  type="text"
                  style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                  icon={<GitlabOutlined />}
                >
                  {currentRepository 
                    ? currentRepository.split('/').pop() 
                    : 'Select Repository'}
                </Button>
              </Dropdown>
            ) : (
              <Button
                type="primary"
                icon={<FolderOpenOutlined />}
                onClick={async () => {
                  try {
                    await selectRepository();
                    await refreshRepositoryStatus();
                  } catch (error) {
                    console.error('Failed to add repository:', error);
                  }
                }}
                loading={isLoading}
              >
                Add Repository
              </Button>
            )}

            {/* Branch Selector */}
            {currentRepository && (
              <Select
                value={currentBranch}
                onChange={handleBranchChange}
                loading={loadingBranches}
                style={{ minWidth: 200 }}
                placeholder="Select branch"
                suffixIcon={<BranchesOutlined style={{ color: '#fff' }} />}
                dropdownStyle={{ color: '#000' }}
              >
                {branchesWithDates.map(branch => (
                  <Option key={branch.name} value={branch.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        {branch.isCurrent && <Tag color="green" size="small">Current</Tag>}
                        <Text strong={branch.isCurrent}>{branch.name}</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '11px', marginLeft: 8 }}>
                        {formatBranchDate(branch.lastCommitDate)}
                      </Text>
                    </div>
                  </Option>
                ))}
              </Select>
            )}
          </Space>
        </div>
        
        <div className="header-right">
          <Space>
            {activeTab === 'changes' && (
              <Tooltip title={showFileList ? "Hide File List" : "Show File List"}>
                <Button
                  icon={<MenuOutlined />}
                  onClick={() => setShowFileList(!showFileList)}
                  type="text"
                  style={{ color: '#fff' }}
                />
              </Tooltip>
            )}
            
            <Tooltip title="Refresh">
              <Button
                icon={<ReloadOutlined />}
                onClick={async () => {
                  await refreshRepositoryStatus();
                  const branchesData = await getBranchesWithDates();
                  setBranchesWithDates(branchesData || []);
                }}
                loading={operationInProgress}
                type="text"
                style={{ color: '#fff' }}
              />
            </Tooltip>
            
            <Tooltip title="Layout">
              <Dropdown
                menu={{
                  items: [
                    { key: 'split', label: 'Split View' },
                    { key: 'full', label: 'Full View' },
                    { key: 'compact', label: 'Compact View' }
                  ],
                  onClick: ({ key }) => setLayout(key)
                }}
              >
                <Button
                  icon={<FullscreenOutlined />}
                  type="text"
                  style={{ color: '#fff' }}
                />
              </Dropdown>
            </Tooltip>
            
            <Tooltip title="Settings">
              <Button
                icon={<SettingOutlined />}
                onClick={() => setShowSettings(true)}
                type="text"
                style={{ color: '#fff' }}
              />
            </Tooltip>
            
            <Tooltip title="Help">
              <Button
                icon={<QuestionCircleOutlined />}
                onClick={() => setShowHelp(true)}
                type="text"
                style={{ color: '#fff' }}
              />
            </Tooltip>
          </Space>
        </div>
      </Header>
    );
  };


  return (
    <div className="git-client">
      <Layout className="git-client-layout">
        {renderHeader()}
        
        <Layout>
          <Content className="git-client-content">
            <Spin spinning={isLoading}>
              {lastError && (
                <Alert
                  message="Git Error"
                  description={lastError.message}
                  type="error"
                  showIcon
                  closable
                  style={{ marginBottom: 16 }}
                />
              )}
              
              {renderMainContent()}
            </Spin>
          </Content>
        </Layout>
      </Layout>

      {/* Help Drawer */}
      <Drawer
        title="Git Client Help"
        placement="right"
        onClose={() => setShowHelp(false)}
        open={showHelp}
        width={400}
      >
        <div className="help-content">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Title level={5}>Getting Started</Title>
              <Paragraph>
                This Git client provides a visual interface for all your Git operations.
                Start by adding a repository using the sidebar.
              </Paragraph>
            </div>
            
            <div>
              <Title level={5}>Key Features</Title>
              <ul>
                <li><strong>Changes:</strong> View file differences with syntax highlighting</li>
                <li><strong>Editor:</strong> Edit files with integrated staging controls</li>
                <li><strong>Staging:</strong> Stage individual chunks or entire files</li>
                <li><strong>Conflicts:</strong> Resolve merge conflicts with a three-pane view</li>
                <li><strong>Operations:</strong> Perform Git operations like commit, push, pull</li>
              </ul>
            </div>
            
            <div>
              <Title level={5}>Keyboard Shortcuts</Title>
              <ul>
                <li><strong>Ctrl+S:</strong> Save file</li>
                <li><strong>Ctrl+Z:</strong> Undo</li>
                <li><strong>Ctrl+Y:</strong> Redo</li>
                <li><strong>Ctrl+F:</strong> Find and replace</li>
                <li><strong>Ctrl+/:</strong> Toggle comment</li>
              </ul>
            </div>
          </Space>
        </div>
      </Drawer>

      {/* Settings Modal */}
      <Modal
        title="Git Client Settings"
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={null}
        width={600}
      >
        <div className="settings-content">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Title level={5}>Appearance</Title>
              <Space>
                <Text>Theme:</Text>
                <Select
                  value={theme}
                  onChange={setTheme}
                  style={{ width: 120 }}
                >
                  <Option value="light">Light</Option>
                  <Option value="dark">Dark</Option>
                  <Option value="auto">Auto</Option>
                </Select>
              </Space>
            </div>
            
            <div>
              <Title level={5}>Editor</Title>
              <Space>
                <Text>Default View:</Text>
                <Select
                  value={viewMode}
                  onChange={setViewMode}
                  style={{ width: 150 }}
                >
                  <Option value="side-by-side">Side by Side</Option>
                  <Option value="unified">Unified</Option>
                </Select>
              </Space>
            </div>
            
            <div>
              <Title level={5}>Behavior</Title>
              <Space direction="vertical">
                <label>
                  <input type="checkbox" defaultChecked />
                  Auto-save files
                </label>
                <label>
                  <input type="checkbox" defaultChecked />
                  Show line numbers
                </label>
                <label>
                  <input type="checkbox" defaultChecked />
                  Enable syntax highlighting
                </label>
              </Space>
            </div>
          </Space>
        </div>
      </Modal>
    </div>
  );
}

export default GitClient;
