import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  Button,
  Space,
  Typography,
  Tag,
  Empty,
  Spin,
  Tooltip,
  Row,
  Col,
  Progress,
  Alert,
  Modal,
  Checkbox,
  Divider,
  Badge,
  Popconfirm,
  message,
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  EyeOutlined,
  UndoOutlined,
  RedoOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useGit } from '../../../contexts/GitContext';
import './ChunkStaging.scss';

const { Title, Text, Paragraph } = Typography;

function ChunkStaging({
  file = null,
  onStagingChange = null,
  showPreview = true,
  compact = false,
}) {
  const {
    currentRepository,
    currentDiff,
    getDiff,
    isLoading,
    operationInProgress,
  } = useGit();

  const [selectedFile] = useState(file);
  const [stagedChunks, setStagedChunks] = useState(new Set());
  const [unstagedChunks, setUnstagedChunks] = useState(new Set());
  const [selectedChunks, setSelectedChunks] = useState(new Set());
  const [stagingHistory, setStagingHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const loadFileDiff = async (filename) => {
    try {
      await getDiff(filename, false); // Load unstaged changes
    } catch (error) {
      console.error('Failed to load file diff:', error);
    }
  };

  const initializeChunkStates = (fileDiff) => {
    if (!fileDiff || !fileDiff.hunks) return;

    const allChunks = new Set();
    fileDiff.hunks.forEach((hunk, hunkIndex) => {
      allChunks.add(`hunk-${hunkIndex}`);
    });

    setUnstagedChunks(allChunks);
    setStagedChunks(new Set());
  };

  useEffect(() => {
    if (selectedFile && currentRepository) {
      loadFileDiff(selectedFile);
    }
  }, [selectedFile, currentRepository, loadFileDiff]);

  useEffect(() => {
    if (currentDiff && currentDiff.length > 0) {
      const fileDiff = currentDiff.find((diff) => diff.name === selectedFile);
      if (fileDiff) {
        initializeChunkStates(fileDiff);
      }
    }
  }, [currentDiff, selectedFile]);

  const getFileDiff = useCallback(() => {
    if (!currentDiff || !selectedFile) return null;
    return currentDiff.find((diff) => diff.name === selectedFile);
  }, [currentDiff, selectedFile]);

  const getChunkInfo = (hunkIndex) => {
    const fileDiff = getFileDiff();
    if (!fileDiff || !fileDiff.hunks[hunkIndex]) return null;

    const hunk = fileDiff.hunks[hunkIndex];
    const addedLines = hunk.lines.filter(
      (line) => line.type === 'added',
    ).length;
    const deletedLines = hunk.lines.filter(
      (line) => line.type === 'deleted',
    ).length;

    return {
      added: addedLines,
      deleted: deletedLines,
      total: hunk.lines.length,
      header: hunk.header,
    };
  };

  const stageChunk = useCallback(
    (hunkIndex) => {
      const chunkId = `hunk-${hunkIndex}`;

      setStagingHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({
          action: 'stage',
          chunkId,
          hunkIndex,
          timestamp: Date.now(),
        });
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);

      setUnstagedChunks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(chunkId);
        return newSet;
      });

      setStagedChunks((prev) => {
        const newSet = new Set(prev);
        newSet.add(chunkId);
        return newSet;
      });

      if (onStagingChange) {
        onStagingChange({
          staged: Array.from(stagedChunks).concat([chunkId]),
          unstaged: Array.from(unstagedChunks).filter((id) => id !== chunkId),
        });
      }

      message.success('Chunk staged successfully');
    },
    [stagedChunks, unstagedChunks, historyIndex, onStagingChange],
  );

  const unstageChunk = useCallback(
    (hunkIndex) => {
      const chunkId = `hunk-${hunkIndex}`;

      setStagingHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({
          action: 'unstage',
          chunkId,
          hunkIndex,
          timestamp: Date.now(),
        });
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);

      setStagedChunks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(chunkId);
        return newSet;
      });

      setUnstagedChunks((prev) => {
        const newSet = new Set(prev);
        newSet.add(chunkId);
        return newSet;
      });

      if (onStagingChange) {
        onStagingChange({
          staged: Array.from(stagedChunks).filter((id) => id !== chunkId),
          unstaged: Array.from(unstagedChunks).concat([chunkId]),
        });
      }

      message.success('Chunk unstaged successfully');
    },
    [stagedChunks, unstagedChunks, historyIndex, onStagingChange],
  );

  const stageAllChunks = useCallback(() => {
    const fileDiff = getFileDiff();
    if (!fileDiff) return;

    const allChunkIds = fileDiff.hunks.map((_, index) => `hunk-${index}`);

    setStagingHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({
        action: 'stageAll',
        chunkIds: allChunkIds,
        timestamp: Date.now(),
      });
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);

    setStagedChunks(new Set(allChunkIds));
    setUnstagedChunks(new Set());

    if (onStagingChange) {
      onStagingChange({
        staged: allChunkIds,
        unstaged: [],
      });
    }

    message.success('All chunks staged successfully');
  }, [historyIndex, onStagingChange, getFileDiff]);

  const unstageAllChunks = useCallback(() => {
    const fileDiff = getFileDiff();
    if (!fileDiff) return;

    const allChunkIds = fileDiff.hunks.map((_, index) => `hunk-${index}`);

    setStagingHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({
        action: 'unstageAll',
        chunkIds: allChunkIds,
        timestamp: Date.now(),
      });
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);

    setUnstagedChunks(new Set(allChunkIds));
    setStagedChunks(new Set());

    if (onStagingChange) {
      onStagingChange({
        staged: [],
        unstaged: allChunkIds,
      });
    }

    message.success('All chunks unstaged successfully');
  }, [historyIndex, onStagingChange, getFileDiff]);

  const undoStaging = useCallback(() => {
    if (historyIndex < 0) return;

    const lastAction = stagingHistory[historyIndex];

    switch (lastAction.action) {
      case 'stage':
        unstageChunk(lastAction.hunkIndex);
        break;
      case 'unstage':
        stageChunk(lastAction.hunkIndex);
        break;
      case 'stageAll':
        unstageAllChunks();
        break;
      case 'unstageAll':
        stageAllChunks();
        break;
      default:
        break;
    }

    setHistoryIndex((prev) => prev - 1);
  }, [
    historyIndex,
    stagingHistory,
    stageChunk,
    unstageChunk,
    stageAllChunks,
    unstageAllChunks,
  ]);

  const redoStaging = useCallback(() => {
    if (historyIndex >= stagingHistory.length - 1) return;

    const nextAction = stagingHistory[historyIndex + 1];

    switch (nextAction.action) {
      case 'stage':
        stageChunk(nextAction.hunkIndex);
        break;
      case 'unstage':
        unstageChunk(nextAction.hunkIndex);
        break;
      case 'stageAll':
        stageAllChunks();
        break;
      case 'unstageAll':
        unstageAllChunks();
        break;
      default:
        break;
    }

    setHistoryIndex((prev) => prev + 1);
  }, [
    historyIndex,
    stagingHistory,
    stageChunk,
    unstageChunk,
    stageAllChunks,
    unstageAllChunks,
  ]);

  const toggleChunkSelection = useCallback((hunkIndex) => {
    const chunkId = `hunk-${hunkIndex}`;
    setSelectedChunks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chunkId)) {
        newSet.delete(chunkId);
      } else {
        newSet.add(chunkId);
      }
      return newSet;
    });
  }, []);

  const stageSelectedChunks = useCallback(() => {
    selectedChunks.forEach((chunkId) => {
      const hunkIndex = parseInt(chunkId.split('-')[1], 10);
      stageChunk(hunkIndex);
    });
    setSelectedChunks(new Set());
  }, [selectedChunks, stageChunk]);

  const unstageSelectedChunks = useCallback(() => {
    selectedChunks.forEach((chunkId) => {
      const hunkIndex = parseInt(chunkId.split('-')[1], 10);
      unstageChunk(hunkIndex);
    });
    setSelectedChunks(new Set());
  }, [selectedChunks, unstageChunk]);

  const renderChunkCard = (hunkIndex) => {
    const chunkId = `hunk-${hunkIndex}`;
    const chunkInfo = getChunkInfo(hunkIndex);
    const isStaged = stagedChunks.has(chunkId);
    const isSelected = selectedChunks.has(chunkId);

    if (!chunkInfo) return null;

    return (
      <Card
        key={chunkId}
        size="small"
        className={`chunk-card ${isStaged ? 'staged' : 'unstaged'} ${isSelected ? 'selected' : ''}`}
        hoverable
        onClick={() => toggleChunkSelection(hunkIndex)}
      >
        <div className="chunk-header">
          <Space>
            <Checkbox
              checked={isSelected}
              onChange={() => toggleChunkSelection(hunkIndex)}
              onClick={(e) => e.stopPropagation()}
            />
            <Text code style={{ fontSize: '11px' }}>
              {chunkInfo.header}
            </Text>
            <Tag color="green" size="small">
              +{chunkInfo.added}
            </Tag>
            <Tag color="red" size="small">
              -{chunkInfo.deleted}
            </Tag>
            <Tag color={isStaged ? 'success' : 'warning'} size="small">
              {isStaged ? 'Staged' : 'Unstaged'}
            </Tag>
          </Space>
        </div>

        <div className="chunk-actions">
          <Space>
            {isStaged ? (
              <Tooltip title="Unstage this chunk">
                <Button
                  size="small"
                  icon={<MinusOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    unstageChunk(hunkIndex);
                  }}
                  loading={operationInProgress}
                >
                  Unstage
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="Stage this chunk">
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    stageChunk(hunkIndex);
                  }}
                  loading={operationInProgress}
                >
                  Stage
                </Button>
              </Tooltip>
            )}

            {showPreview && (
              <Tooltip title="Preview chunk changes">
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPreviewModal(true);
                  }}
                />
              </Tooltip>
            )}
          </Space>
        </div>
      </Card>
    );
  };

  const fileDiff = getFileDiff();
  const totalChunks = fileDiff?.hunks?.length || 0;
  const stagedCount = stagedChunks.size;
  const unstagedCount = unstagedChunks.size;
  const selectedCount = selectedChunks.size;

  if (!currentRepository) {
    return (
      <Card>
        <Empty
          image={
            <FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />
          }
          description="No repository selected"
        />
      </Card>
    );
  }

  if (!selectedFile) {
    return (
      <Card>
        <Empty
          image={
            <FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />
          }
          description="Select a file to view chunks"
        />
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="chunk-staging-compact">
        <div className="chunk-summary">
          <Space>
            <Badge count={stagedCount} style={{ backgroundColor: '#52c41a' }}>
              <Tag color="success">Staged</Tag>
            </Badge>
            <Badge count={unstagedCount} style={{ backgroundColor: '#faad14' }}>
              <Tag color="warning">Unstaged</Tag>
            </Badge>
          </Space>
        </div>
        <Progress
          percent={totalChunks > 0 ? (stagedCount / totalChunks) * 100 : 0}
          strokeColor="#52c41a"
          showInfo={false}
        />
      </div>
    );
  }

  return (
    <div className="chunk-staging">
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <Title level={4} style={{ margin: 0 }}>
              Chunk Staging
            </Title>
            {selectedFile && <Tag>{selectedFile}</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Help">
              <Button
                icon={<InfoCircleOutlined />}
                onClick={() => setShowHelp(true)}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Undo">
              <Button
                icon={<UndoOutlined />}
                onClick={undoStaging}
                disabled={historyIndex < 0}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Redo">
              <Button
                icon={<RedoOutlined />}
                onClick={redoStaging}
                disabled={historyIndex >= stagingHistory.length - 1}
                size="small"
              />
            </Tooltip>
          </Space>
        }
      >
        <Spin spinning={isLoading}>
          {fileDiff ? (
            <div className="chunk-staging-content">
              {/* Summary */}
              <div className="staging-summary">
                <Row gutter={16}>
                  <Col span={8}>
                    <Card size="small" className="summary-card">
                      <div className="summary-item">
                        <Text strong>Total Chunks</Text>
                        <Badge
                          count={totalChunks}
                          style={{ backgroundColor: '#1890ff' }}
                        />
                      </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" className="summary-card staged">
                      <div className="summary-item">
                        <Text strong>Staged</Text>
                        <Badge
                          count={stagedCount}
                          style={{ backgroundColor: '#52c41a' }}
                        />
                      </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" className="summary-card unstaged">
                      <div className="summary-item">
                        <Text strong>Unstaged</Text>
                        <Badge
                          count={unstagedCount}
                          style={{ backgroundColor: '#faad14' }}
                        />
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Progress
                  percent={
                    totalChunks > 0 ? (stagedCount / totalChunks) * 100 : 0
                  }
                  strokeColor="#52c41a"
                  showInfo
                  format={() => `${stagedCount}/${totalChunks} chunks staged`}
                />
              </div>

              {/* Bulk Actions */}
              {selectedCount > 0 && (
                <Alert
                  message={`${selectedCount} chunks selected`}
                  description={
                    <Space>
                      <Button
                        size="small"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={stageSelectedChunks}
                      >
                        Stage Selected
                      </Button>
                      <Button
                        size="small"
                        icon={<MinusOutlined />}
                        onClick={unstageSelectedChunks}
                      >
                        Unstage Selected
                      </Button>
                    </Space>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              {/* Bulk Actions */}
              <div className="bulk-actions">
                <Space>
                  <Popconfirm
                    title="Stage all chunks?"
                    onConfirm={stageAllChunks}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      icon={<PlusOutlined />}
                      disabled={unstagedCount === 0}
                      loading={operationInProgress}
                    >
                      Stage All
                    </Button>
                  </Popconfirm>

                  <Popconfirm
                    title="Unstage all chunks?"
                    onConfirm={unstageAllChunks}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      icon={<MinusOutlined />}
                      disabled={stagedCount === 0}
                      loading={operationInProgress}
                    >
                      Unstage All
                    </Button>
                  </Popconfirm>
                </Space>
              </div>

              <Divider />

              {/* Chunk List */}
              <div className="chunk-list">
                {fileDiff.hunks.map((_, hunkIndex) =>
                  renderChunkCard(hunkIndex),
                )}
              </div>
            </div>
          ) : (
            <Empty
              image={
                <FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />
              }
              description="No changes found in this file"
            />
          )}
        </Spin>
      </Card>

      {/* Help Modal */}
      <Modal
        title="Chunk Staging Help"
        open={showHelp}
        onCancel={() => setShowHelp(false)}
        footer={null}
        width={600}
      >
        <div className="help-content">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Title level={5}>What is Chunk Staging?</Title>
              <Paragraph>
                Chunk staging allows you to stage specific parts of your changes
                instead of entire files. This gives you fine-grained control
                over what gets committed.
              </Paragraph>
            </div>

            <div>
              <Title level={5}>How to Use:</Title>
              <ul>
                <li>
                  <strong>Click a chunk</strong> to select it (checkbox will
                  appear)
                </li>
                <li>
                  <strong>Stage button</strong> - adds the chunk to your commit
                </li>
                <li>
                  <strong>Unstage button</strong> - removes the chunk from your
                  commit
                </li>
                <li>
                  <strong>Bulk actions</strong> - stage/unstage multiple chunks
                  at once
                </li>
                <li>
                  <strong>Undo/Redo</strong> - reverse your staging decisions
                </li>
              </ul>
            </div>

            <div>
              <Title level={5}>Visual Indicators:</Title>
              <Space direction="vertical">
                <Space>
                  <Tag color="success">Staged</Tag> - Ready to be committed
                </Space>
                <Space>
                  <Tag color="warning">Unstaged</Tag> - Not included in commit
                </Space>
                <Space>
                  <Tag color="green">+N</Tag> - N lines added
                </Space>
                <Space>
                  <Tag color="red">-N</Tag> - N lines deleted
                </Space>
              </Space>
            </div>
          </Space>
        </div>
      </Modal>
    </div>
  );
}

ChunkStaging.propTypes = {
  file: PropTypes.string,
  onStagingChange: PropTypes.func,
  showPreview: PropTypes.bool,
  compact: PropTypes.bool,
};

export default ChunkStaging;
