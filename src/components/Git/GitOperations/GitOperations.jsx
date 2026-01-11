import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  Tabs,
  Button,
  Input,
  List,
  Checkbox,
  Space,
  Tag,
  Typography,
  Form,
  Modal,
  Select,
  Tooltip,
  Badge,
  Popconfirm,
  Row,
  Col,
  Alert,
  Collapse,
} from 'antd';
import {
  CloudUploadOutlined,
  CloudDownloadOutlined,
  BranchesOutlined,
  MergeOutlined,
  PlusOutlined,
  DeleteOutlined,
  UndoOutlined,
  SaveOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CodeOutlined,
  HistoryOutlined,
  InboxOutlined,
  EyeOutlined,
  FileAddOutlined,
  FileDeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useGit } from '../../../contexts/GitContext';
import './GitOperations.scss';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Component for expand icon to avoid defining during render
function ExpandIcon({ isActive }) {
  return <EyeOutlined rotate={isActive ? 90 : 0} />;
}

ExpandIcon.propTypes = {
  isActive: PropTypes.bool,
};

ExpandIcon.defaultProps = {
  isActive: false,
};
const { TabPane } = Tabs;
const { Option } = Select;
const { Panel } = Collapse;

function GitOperations({ onViewDiff }) {
  const {
    currentRepository,
    repositoryStatus,
    branches,
    currentBranch,
    stagedFiles,
    modifiedFiles,
    untrackedFiles,
    deletedFiles,
    conflictedFiles,
    stashList,
    operationInProgress,
    operationHistory,
    // Operations
    stageFiles,
    unstageFiles,
    commit,
    pull,
    push,
    createBranch,
    switchBranch,
    deleteBranch,
    mergeBranch,
    stashChanges,
    applyStash,
    popStash,
    getStashList,
    getStashFiles,
    undoLastOperation,
    refreshRepositoryStatus,
    discardChanges,
    deleteUntrackedFiles,
  } = useGit();

  const [activeTab, setActiveTab] = useState('staging');
  const [commitForm] = Form.useForm();
  const [branchForm] = Form.useForm();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showStashModal, setShowStashModal] = useState(false);
  const [stashMessage, setStashMessage] = useState('');
  const [pullStrategy, setPullStrategy] = useState('merge');
  const [expandedStashes, setExpandedStashes] = useState(new Set());
  const [stashFiles, setStashFiles] = useState({});

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

  // Load operation history when repository changes
  useEffect(() => {
    if (currentRepository) {
      // loadOperationHistory functionality not implemented
    }
  }, [currentRepository]);

  useEffect(() => {
    if (currentRepository) {
      getStashList();
    }
  }, [currentRepository, getStashList]);

  const handleStageFiles = async (files) => {
    try {
      await stageFiles(files);
      setSelectedFiles([]);
      // loadOperationHistory functionality not implemented
    } catch (error) {
      // Error handled by context
    }
  };

  const handleUnstageFiles = async (files) => {
    try {
      await unstageFiles(files);
      // loadOperationHistory functionality not implemented
    } catch (error) {
      // Error handled by context
    }
  };

  const handleDiscardChanges = async (files) => {
    try {
      await discardChanges(files);
      // loadOperationHistory functionality not implemented
    } catch (error) {
      // Error handled by context
    }
  };

  const handleDeleteUntracked = async (files) => {
    try {
      await deleteUntrackedFiles(files);
      // loadOperationHistory functionality not implemented
    } catch (error) {
      // Error handled by context
    }
  };

  const handleCommit = async (values) => {
    try {
      await commit(values.message, values.description);
      commitForm.resetFields();
      setShowCommitModal(false);
      // loadOperationHistory functionality not implemented
    } catch (error) {
      // Error handled by context
    }
  };

  const handleCreateBranch = async (values) => {
    try {
      await createBranch(values.branchName, values.startPoint);
      branchForm.resetFields();
      setShowBranchModal(false);
      // loadOperationHistory functionality not implemented
    } catch (error) {
      // Error handled by context
    }
  };

  const handleStashChanges = async () => {
    try {
      await stashChanges(stashMessage || null);
      setStashMessage('');
      setShowStashModal(false);
      // loadOperationHistory functionality not implemented
    } catch (error) {
      // Error handled by context
    }
  };

  const loadStashFiles = async (stashIndex) => {
    if (stashFiles[stashIndex]) return; // Already loaded

    try {
      const files = await getStashFiles(stashIndex);
      setStashFiles((prev) => ({
        ...prev,
        [stashIndex]: files,
      }));
    } catch (error) {
      console.error('Failed to load stash files:', error);
    }
  };

  const handleStashExpand = (stashIndex, expanded) => {
    const newExpanded = new Set(expandedStashes);
    if (expanded) {
      newExpanded.add(stashIndex);
      loadStashFiles(stashIndex);
    } else {
      newExpanded.delete(stashIndex);
    }
    setExpandedStashes(newExpanded);
  };

  const getFileIcon = (filename) => {
    if (filename.includes('.')) {
      return <FileTextOutlined />;
    }
    return <FileTextOutlined />;
  };

  const getFileStatusColor = (status) => {
    switch (status) {
      case 'staged':
        return 'success';
      case 'modified':
        return 'warning';
      case 'deleted':
        return 'error';
      case 'untracked':
        return 'processing';
      case 'conflicted':
        return 'error';
      default:
        return 'default';
    }
  };

  const renderFileList = (files, status, actions = true) => {
    if (!files || files.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          <InboxOutlined style={{ fontSize: '24px' }} />
          <div>No {status} files</div>
        </div>
      );
    }

    return (
      <List
        size="small"
        dataSource={files}
        renderItem={(file) => (
          <List.Item
            key={file}
            actions={
              actions
                ? [
                    status === 'staged' ? (
                      <Button
                        size="small"
                        onClick={() => handleUnstageFiles([file])}
                        loading={operationInProgress}
                      >
                        Unstage
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => handleStageFiles([file])}
                        loading={operationInProgress}
                      >
                        Stage
                      </Button>
                    ),
                    onViewDiff &&
                      (status === 'modified' || status === 'staged') && (
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => onViewDiff(file)}
                          title="View Diff"
                        />
                      ),
                    status === 'modified' && (
                      <Popconfirm
                        title="Discard changes to this file?"
                        onConfirm={() => handleDiscardChanges([file])}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          size="small"
                          icon={<UndoOutlined />}
                          danger
                          loading={operationInProgress}
                          title="Discard Changes"
                        />
                      </Popconfirm>
                    ),
                    status === 'untracked' && (
                      <Popconfirm
                        title="Delete this untracked file?"
                        onConfirm={() => handleDeleteUntracked([file])}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          size="small"
                          icon={<DeleteOutlined />}
                          danger
                          loading={operationInProgress}
                          title="Delete File"
                        />
                      </Popconfirm>
                    ),
                  ].filter(Boolean)
                : []
            }
          >
            <List.Item.Meta
              avatar={
                <Checkbox
                  checked={selectedFiles.includes(file)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFiles([...selectedFiles, file]);
                    } else {
                      setSelectedFiles(selectedFiles.filter((f) => f !== file));
                    }
                  }}
                />
              }
              title={
                <Space>
                  {getFileIcon(file)}
                  <Text>{file}</Text>
                  <Tag color={getFileStatusColor(status)} size="small">
                    {status}
                  </Tag>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  if (!currentRepository) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <CodeOutlined style={{ fontSize: '48px', color: '#ccc' }} />
          <Title level={4} type="secondary">
            No Repository Selected
          </Title>
          <Paragraph type="secondary">
            Please select a Git repository to access Git operations.
          </Paragraph>
        </div>
      </Card>
    );
  }

  return (
    <div className="git-operations">
      <Card
        title={
          <Space>
            <CodeOutlined />
            <Title level={4} style={{ margin: 0 }}>
              Git Operations
            </Title>
            {currentBranch && (
              <Tag icon={<BranchesOutlined />} color="green">
                {currentBranch}
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Refresh status">
              <Button
                icon={<SyncOutlined />}
                onClick={refreshRepositoryStatus}
                loading={operationInProgress}
              />
            </Tooltip>
            <Tooltip title="Undo last operation">
              <Button
                icon={<UndoOutlined />}
                onClick={async () => {
                  try {
                    await undoLastOperation();
                  } catch (e) {
                    // errors are handled in context
                  }
                }}
                disabled={operationHistory.length === 0}
                loading={operationInProgress}
              />
            </Tooltip>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* Staging Area */}
          <TabPane
            tab={
              <Space>
                <SaveOutlined />
                Staging
                {stagedFiles.length +
                  modifiedFiles.length +
                  untrackedFiles.length >
                  0 && (
                  <Badge
                    count={
                      stagedFiles.length +
                      modifiedFiles.length +
                      untrackedFiles.length
                    }
                  />
                )}
              </Space>
            }
            key="staging"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Card
                  size="small"
                  title="Changes to Commit"
                  className="staged-files"
                >
                  <div style={{ marginBottom: '8px' }}>
                    <Space>
                      <Button
                        size="small"
                        disabled={stagedFiles.length === 0}
                        onClick={() => setShowCommitModal(true)}
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        loading={operationInProgress}
                      >
                        Commit ({stagedFiles.length})
                      </Button>
                      {stagedFiles.length > 0 && (
                        <Button
                          size="small"
                          onClick={() => handleUnstageFiles(stagedFiles)}
                          loading={operationInProgress}
                        >
                          Unstage All
                        </Button>
                      )}
                    </Space>
                  </div>
                  {renderFileList(stagedFiles, 'staged')}
                </Card>
              </Col>

              <Col span={12}>
                <Card size="small" title="Working Directory Changes">
                  <div style={{ marginBottom: '8px' }}>
                    <Space>
                      <Button
                        size="small"
                        disabled={
                          modifiedFiles.length + untrackedFiles.length === 0
                        }
                        onClick={() =>
                          handleStageFiles([
                            ...modifiedFiles,
                            ...untrackedFiles,
                          ])
                        }
                        loading={operationInProgress}
                      >
                        Stage All (
                        {modifiedFiles.length + untrackedFiles.length})
                      </Button>
                      {modifiedFiles.length + untrackedFiles.length > 0 && (
                        <Button
                          size="small"
                          onClick={() => setShowStashModal(true)}
                          icon={<InboxOutlined />}
                        >
                          Stash Changes
                        </Button>
                      )}
                    </Space>
                  </div>

                  <Collapse size="small" ghost>
                    <Panel
                      header={`Modified Files (${modifiedFiles.length})`}
                      key="modified"
                    >
                      {renderFileList(modifiedFiles, 'modified')}
                    </Panel>
                    <Panel
                      header={`New Files (${untrackedFiles.length})`}
                      key="untracked"
                    >
                      {renderFileList(untrackedFiles, 'untracked')}
                    </Panel>
                    {deletedFiles.length > 0 && (
                      <Panel
                        header={`Deleted Files (${deletedFiles.length})`}
                        key="deleted"
                      >
                        {renderFileList(deletedFiles, 'deleted')}
                      </Panel>
                    )}
                    {conflictedFiles.length > 0 && (
                      <Panel
                        header={`Conflicted Files (${conflictedFiles.length})`}
                        key="conflicted"
                      >
                        {renderFileList(conflictedFiles, 'conflicted')}
                      </Panel>
                    )}
                  </Collapse>
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* Remote Operations */}
          <TabPane
            tab={
              <Space>
                <CloudUploadOutlined />
                Remote
                {repositoryStatus &&
                  (repositoryStatus.ahead > 0 ||
                    repositoryStatus.behind > 0) && (
                    <Badge
                      count={repositoryStatus.ahead + repositoryStatus.behind}
                    />
                  )}
              </Space>
            }
            key="remote"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {repositoryStatus &&
                (repositoryStatus.ahead > 0 || repositoryStatus.behind > 0) && (
                  <Alert
                    message="Repository Status"
                    description={
                      <Space>
                        {repositoryStatus.ahead > 0 && (
                          <Text>↑ {repositoryStatus.ahead} commits ahead</Text>
                        )}
                        {repositoryStatus.behind > 0 && (
                          <Text>
                            ↓ {repositoryStatus.behind} commits behind
                          </Text>
                        )}
                      </Space>
                    }
                    type="info"
                    showIcon
                  />
                )}

              <Row gutter={16}>
                <Col span={12}>
                  <Card size="small" title="Pull Changes">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Paragraph type="secondary">
                        Download changes from remote repository
                      </Paragraph>
                      <Select
                        value={pullStrategy}
                        onChange={setPullStrategy}
                        style={{ width: '100%', marginBottom: 8 }}
                        size="small"
                      >
                        <Option value="merge">
                          <Space>
                            <MergeOutlined />
                            <span>Merge (default)</span>
                          </Space>
                        </Option>
                        <Option value="rebase">
                          <Space>
                            <SyncOutlined />
                            <span>Rebase</span>
                          </Space>
                        </Option>
                        <Option value="ff-only">
                          <Space>
                            <CloudDownloadOutlined />
                            <span>Fast-forward only</span>
                          </Space>
                        </Option>
                      </Select>
                      <Button
                        type="primary"
                        icon={<CloudDownloadOutlined />}
                        onClick={() => pull('origin', null, pullStrategy)}
                        loading={operationInProgress}
                        block
                      >
                        Pull from Origin
                      </Button>
                    </Space>
                  </Card>
                </Col>

                <Col span={12}>
                  <Card size="small" title="Push Changes">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Paragraph type="secondary">
                        Upload your commits to remote repository
                      </Paragraph>
                      <Button
                        type="primary"
                        icon={<CloudUploadOutlined />}
                        onClick={() => push()}
                        loading={operationInProgress}
                        disabled={repositoryStatus?.ahead === 0}
                        block
                      >
                        Push to Origin
                      </Button>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </Space>
          </TabPane>

          {/* Branch Management */}
          <TabPane
            tab={
              <Space>
                <BranchesOutlined />
                Branches
                <Badge count={branches.length} />
              </Space>
            }
            key="branches"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Card
                  size="small"
                  title="Current Branch"
                  extra={
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setShowBranchModal(true)}
                    >
                      New Branch
                    </Button>
                  }
                >
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <BranchesOutlined
                      style={{ fontSize: '32px', color: '#52c41a' }}
                    />
                    <Title
                      level={4}
                      style={{ color: '#52c41a', margin: '8px 0' }}
                    >
                      {currentBranch}
                    </Title>
                    <Text type="secondary">Active branch</Text>
                  </div>
                </Card>
              </Col>

              <Col span={12}>
                <Card size="small" title="All Branches">
                  <List
                    size="small"
                    dataSource={branches.filter(
                      (branch) => branch !== currentBranch,
                    )}
                    renderItem={(branch) => (
                      <List.Item
                        key={branch}
                        actions={[
                          <Button
                            size="small"
                            onClick={() => switchBranch(branch)}
                            loading={operationInProgress}
                          >
                            Switch
                          </Button>,
                          <Popconfirm
                            title={`Merge "${branch}" into "${currentBranch}"?`}
                            description="This will merge the selected branch into your current branch."
                            onConfirm={async () => {
                              try {
                                await mergeBranch(branch);
                                await refreshRepositoryStatus();
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
                          </Popconfirm>,
                          <Popconfirm
                            title="Delete this branch?"
                            onConfirm={() => deleteBranch(branch)}
                            okText="Delete"
                            cancelText="Cancel"
                          >
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                            />
                          </Popconfirm>,
                        ]}
                      >
                        <Space>
                          <BranchesOutlined />
                          <Text>{branch}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* Stash Management */}
          <TabPane
            tab={
              <Space>
                <InboxOutlined />
                Stash
                <Badge count={stashList.length} />
              </Space>
            }
            key="stash"
          >
            <Card
              size="small"
              title="Stash List"
              extra={
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setShowStashModal(true)}
                  disabled={modifiedFiles.length + untrackedFiles.length === 0}
                >
                  Stash Changes
                </Button>
              }
            >
              <Collapse
                ghost
                onChange={(keys) => handleStashExpand(keys)}
                expandIcon={ExpandIcon}
              >
                {stashList.map((stash, index) => (
                  <Panel
                    key={`stash-${stash.index}`}
                    header={
                      <Space direction="vertical" size={0}>
                        <Text strong>
                          {stash.message || `stash@{${index}}`}
                        </Text>
                        <Space size="small">
                          <Text type="secondary">{stash.date}</Text>
                          <Text type="secondary">by {stash.author_name}</Text>
                          {stashFiles[index] && (
                            <Text type="secondary">
                              ({stashFiles[index].files.length} files)
                            </Text>
                          )}
                        </Space>
                      </Space>
                    }
                    extra={
                      <Space>
                        <Button
                          size="small"
                          onClick={() => applyStash(index)}
                          loading={operationInProgress}
                        >
                          Apply
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => popStash(index)}
                          loading={operationInProgress}
                        >
                          Pop
                        </Button>
                      </Space>
                    }
                  >
                    {stashFiles[index] ? (
                      <div>
                        <List
                          size="small"
                          dataSource={stashFiles[index].files}
                          renderItem={(file) => (
                            <List.Item>
                              <Space>
                                {file.status === 'added' && (
                                  <FileAddOutlined
                                    style={{ color: '#52c41a' }}
                                  />
                                )}
                                {file.status === 'modified' && (
                                  <EditOutlined style={{ color: '#faad14' }} />
                                )}
                                {file.status === 'deleted' && (
                                  <FileDeleteOutlined
                                    style={{ color: '#ff4d4f' }}
                                  />
                                )}
                                {file.status === 'renamed' && (
                                  <FileTextOutlined
                                    style={{ color: '#1890ff' }}
                                  />
                                )}
                                <Tag
                                  size="small"
                                  color={getStatusColor(file.status)}
                                >
                                  {file.status}
                                </Tag>
                                <Text>{file.filename}</Text>
                              </Space>
                            </List.Item>
                          )}
                        />
                        {stashFiles[index].stat && (
                          <div style={{ marginTop: 16 }}>
                            <Text
                              type="secondary"
                              style={{
                                fontSize: '12px',
                                fontFamily: 'monospace',
                              }}
                            >
                              {stashFiles[index].stat}
                            </Text>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Text type="secondary">Loading files...</Text>
                    )}
                  </Panel>
                ))}
              </Collapse>
            </Card>
          </TabPane>

          {/* Operation History */}
          <TabPane
            tab={
              <Space>
                <HistoryOutlined />
                History
                <Badge count={operationHistory.length} />
              </Space>
            }
            key="history"
          >
            <Card size="small" title="Recent Operations">
              <List
                dataSource={operationHistory.slice(0, 20)}
                renderItem={(operation) => (
                  <List.Item key={operation.timestamp}>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Tag color="blue">
                            {operation.type.replace(/_/g, ' ')}
                          </Tag>
                          <Text>
                            {new Date(operation.timestamp).toLocaleString()}
                          </Text>
                        </Space>
                      }
                      description={
                        <Text type="secondary">
                          {JSON.stringify(operation.data, null, 2)}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      {/* Commit Modal */}
      <Modal
        title="Commit Changes"
        open={showCommitModal}
        onCancel={() => setShowCommitModal(false)}
        footer={null}
        width={600}
      >
        <Form form={commitForm} onFinish={handleCommit} layout="vertical">
          <Form.Item
            name="message"
            label="Commit Message"
            rules={[
              { required: true, message: 'Please enter a commit message' },
            ]}
          >
            <Input placeholder="Brief description of changes" />
          </Form.Item>

          <Form.Item name="description" label="Description (Optional)">
            <TextArea
              rows={4}
              placeholder="Detailed description of what was changed and why..."
            />
          </Form.Item>

          <div style={{ marginBottom: '16px' }}>
            <Text strong>Files to commit ({stagedFiles.length}):</Text>
            <div
              style={{ maxHeight: '200px', overflow: 'auto', marginTop: '8px' }}
            >
              {renderFileList(stagedFiles, 'staged', false)}
            </div>
          </div>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={operationInProgress}
              >
                Commit Changes
              </Button>
              <Button onClick={() => setShowCommitModal(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Branch Modal */}
      <Modal
        title="Create New Branch"
        open={showBranchModal}
        onCancel={() => setShowBranchModal(false)}
        footer={null}
      >
        <Form form={branchForm} onFinish={handleCreateBranch} layout="vertical">
          <Form.Item
            name="branchName"
            label="Branch Name"
            rules={[{ required: true, message: 'Please enter a branch name' }]}
          >
            <Input placeholder="feature/new-feature" />
          </Form.Item>

          <Form.Item name="startPoint" label="Start Point (Optional)">
            <Select
              placeholder="Select branch or commit to start from"
              allowClear
            >
              {branches.map((branch) => (
                <Option key={branch} value={branch}>
                  {branch}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={operationInProgress}
              >
                Create Branch
              </Button>
              <Button onClick={() => setShowBranchModal(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Stash Modal */}
      <Modal
        title="Stash Changes"
        open={showStashModal}
        onOk={handleStashChanges}
        onCancel={() => setShowStashModal(false)}
        confirmLoading={operationInProgress}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Paragraph>
            Stash your current changes to work on them later.
          </Paragraph>
          <Input
            placeholder="Optional stash message"
            value={stashMessage}
            onChange={(e) => setStashMessage(e.target.value)}
          />
          <Text type="secondary">
            {modifiedFiles.length + untrackedFiles.length} files will be stashed
          </Text>
        </Space>
      </Modal>
    </div>
  );
}

GitOperations.propTypes = {
  onViewDiff: PropTypes.func,
};

GitOperations.defaultProps = {
  onViewDiff: () => {},
};

export default GitOperations;
