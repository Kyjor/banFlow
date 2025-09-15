import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Input,
  Divider,
  Badge,
  message,
  Steps,
  Collapse,
  Select
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  EditOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  MergeOutlined,
  BranchesOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useGit } from '../../../contexts/GitContext';
import './MergeConflictResolver.scss';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { Step } = Steps;

function MergeConflictResolver({ 
  file = null,
  onConflictResolved = null,
  showTutorial = true
}) {
  const {
    currentRepository,
    conflictedFiles,
    getDiff,
    isLoading,
    operationInProgress
  } = useGit();

  const [selectedFile, setSelectedFile] = useState(file);
  const [conflicts, setConflicts] = useState([]);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [resolvedConflicts, setResolvedConflicts] = useState(new Set());
  const [resolutionHistory, setResolutionHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTutorialModal, setShowTutorialModal] = useState(showTutorial);
  const [editingMode, setEditingMode] = useState(false);
  const [customResolution, setCustomResolution] = useState('');
  const [resolutionType, setResolutionType] = useState('incoming'); // 'incoming', 'current', 'both', 'custom'

  useEffect(() => {
    if (selectedFile && currentRepository) {
      loadFileConflicts(selectedFile);
    }
  }, [selectedFile, currentRepository]);

  const loadFileConflicts = async (filename) => {
    try {
      // In a real implementation, this would load the actual conflict markers
      // For now, we'll simulate conflict data
      const mockConflicts = [
        {
          id: 'conflict-1',
          startLine: 10,
          endLine: 15,
          incomingLines: [
            'function newFeature() {',
            '  console.log("New implementation");',
            '  return true;',
            '}'
          ],
          currentLines: [
            'function newFeature() {',
            '  console.log("Old implementation");',
            '  return false;',
            '}'
          ],
          context: {
            before: ['// Feature implementation', ''],
            after: ['', '// End of feature']
          }
        },
        {
          id: 'conflict-2',
          startLine: 25,
          endLine: 30,
          incomingLines: [
            'const config = {',
            '  apiUrl: "https://new-api.com",',
            '  timeout: 5000',
            '};'
          ],
          currentLines: [
            'const config = {',
            '  apiUrl: "https://old-api.com",',
            '  timeout: 3000',
            '};'
          ],
          context: {
            before: ['// Configuration settings', ''],
            after: ['', 'export default config;']
          }
        }
      ];
      
      setConflicts(mockConflicts);
    } catch (error) {
      console.error('Failed to load file conflicts:', error);
    }
  };

  const getCurrentConflict = () => {
    return conflicts[currentConflictIndex] || null;
  };

  const getLanguageFromFilename = (filename) => {
    if (!filename) return 'text';
    
    const extension = filename.split('.').pop()?.toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'html': 'markup',
      'xml': 'markup',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'ps1': 'powershell',
      'dockerfile': 'dockerfile',
      'jl': 'julia'
    };
    
    return languageMap[extension] || 'text';
  };

  const resolveConflict = useCallback((resolution) => {
    const conflict = getCurrentConflict();
    if (!conflict) return;

    const resolutionData = {
      conflictId: conflict.id,
      resolution,
      timestamp: Date.now(),
      customContent: resolution === 'custom' ? customResolution : null
    };

    setResolutionHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(resolutionData);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);

    setResolvedConflicts(prev => {
      const newSet = new Set(prev);
      newSet.add(conflict.id);
      return newSet;
    });

    message.success(`Conflict resolved using ${resolution} version`);
    
    // Move to next unresolved conflict
    const nextUnresolvedIndex = conflicts.findIndex((c, index) => 
      index > currentConflictIndex && !resolvedConflicts.has(c.id)
    );
    
    if (nextUnresolvedIndex !== -1) {
      setCurrentConflictIndex(nextUnresolvedIndex);
    } else {
      // All conflicts resolved
      if (onConflictResolved) {
        onConflictResolved(conflicts.length);
      }
    }
  }, [getCurrentConflict, customResolution, historyIndex, resolvedConflicts, conflicts, currentConflictIndex, onConflictResolved]);

  const undoResolution = useCallback(() => {
    if (historyIndex < 0) return;
    
    const lastResolution = resolutionHistory[historyIndex];
    setResolvedConflicts(prev => {
      const newSet = new Set(prev);
      newSet.delete(lastResolution.conflictId);
      return newSet;
    });
    
    setHistoryIndex(prev => prev - 1);
    message.success('Resolution undone');
  }, [historyIndex, resolutionHistory]);

  const redoResolution = useCallback(() => {
    if (historyIndex >= resolutionHistory.length - 1) return;
    
    const nextResolution = resolutionHistory[historyIndex + 1];
    setResolvedConflicts(prev => {
      const newSet = new Set(prev);
      newSet.add(nextResolution.conflictId);
      return newSet;
    });
    
    setHistoryIndex(prev => prev + 1);
    message.success('Resolution redone');
  }, [historyIndex, resolutionHistory]);

  const navigateToConflict = useCallback((index) => {
    setCurrentConflictIndex(index);
    setEditingMode(false);
    setCustomResolution('');
    setResolutionType('incoming');
  }, []);

  const getResolutionContent = (conflict, type) => {
    switch (type) {
      case 'incoming':
        return conflict.incomingLines;
      case 'current':
        return conflict.currentLines;
      case 'both':
        return [...conflict.currentLines, ...conflict.incomingLines];
      case 'custom':
        return customResolution.split('\n');
      default:
        return conflict.incomingLines;
    }
  };

  const renderConflictPane = (title, content, type, color) => (
    <div className={`conflict-pane ${type}`}>
      <div className="pane-header">
        <Space>
          <Text strong>{title}</Text>
          <Tag color={color}>{content.length} lines</Tag>
        </Space>
      </div>
      <div className="pane-content">
        <SyntaxHighlighter
          language={getLanguageFromFilename(selectedFile)}
          style={theme === 'dark' ? tomorrow : prism}
          customStyle={{
            margin: 0,
            padding: '12px',
            background: 'transparent',
            fontSize: '13px',
            lineHeight: '20px'
          }}
          showLineNumbers
        >
          {content.join('\n')}
        </SyntaxHighlighter>
      </div>
    </div>
  );

  const renderThreePaneView = () => {
    const conflict = getCurrentConflict();
    if (!conflict) return null;

    const incomingContent = getResolutionContent(conflict, 'incoming');
    const currentContent = getResolutionContent(conflict, 'current');
    const resultContent = getResolutionContent(conflict, resolutionType);

    return (
      <div className="three-pane-view">
        <Row gutter={8}>
          <Col span={8}>
            {renderConflictPane('Incoming Changes', incomingContent, 'incoming', 'blue')}
          </Col>
          <Col span={8}>
            {renderConflictPane('Current Changes', currentContent, 'current', 'orange')}
          </Col>
          <Col span={8}>
            {renderConflictPane('Resolution Result', resultContent, 'result', 'green')}
          </Col>
        </Row>
      </div>
    );
  };

  const renderConflictNavigation = () => {
    return (
      <div className="conflict-navigation">
        <Space>
          <Button
            icon={<CaretRightOutlined />}
            onClick={() => navigateToConflict(Math.max(0, currentConflictIndex - 1))}
            disabled={currentConflictIndex === 0}
          >
            Previous
          </Button>
          
          <Text>
            Conflict {currentConflictIndex + 1} of {conflicts.length}
          </Text>
          
          <Button
            icon={<CaretRightOutlined />}
            onClick={() => navigateToConflict(Math.min(conflicts.length - 1, currentConflictIndex + 1))}
            disabled={currentConflictIndex === conflicts.length - 1}
          >
            Next
          </Button>
        </Space>
        
        <Progress
          percent={(currentConflictIndex + 1) / conflicts.length * 100}
          showInfo={false}
          strokeColor="#1890ff"
        />
      </div>
    );
  };

  const renderResolutionControls = () => {
    const conflict = getCurrentConflict();
    if (!conflict) return null;

    return (
      <div className="resolution-controls">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Choose Resolution:</Text>
          </div>
          
          <Row gutter={16}>
            <Col span={12}>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => resolveConflict('incoming')}
                block
                style={{ marginBottom: 8 }}
              >
                Accept Incoming
              </Button>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Use the incoming changes (from the branch being merged)
              </Text>
            </Col>
            
            <Col span={12}>
              <Button
                icon={<CheckOutlined />}
                onClick={() => resolveConflict('current')}
                block
                style={{ marginBottom: 8 }}
              >
                Accept Current
              </Button>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Keep your current changes
              </Text>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Button
                icon={<MergeOutlined />}
                onClick={() => resolveConflict('both')}
                block
                style={{ marginBottom: 8 }}
              >
                Accept Both
              </Button>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Keep both sets of changes
              </Text>
            </Col>
            
            <Col span={12}>
              <Button
                icon={<EditOutlined />}
                onClick={() => setEditingMode(true)}
                block
                style={{ marginBottom: 8 }}
              >
                Edit Manually
              </Button>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Create a custom resolution
              </Text>
            </Col>
          </Row>
        </Space>
      </div>
    );
  };

  const renderCustomEditor = () => {
    if (!editingMode) return null;

    const conflict = getCurrentConflict();
    if (!conflict) return null;

    return (
      <div className="custom-editor">
        <div className="editor-header">
          <Space>
            <Text strong>Custom Resolution</Text>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => resolveConflict('custom')}
              disabled={!customResolution.trim()}
            >
              Save Resolution
            </Button>
            <Button
              onClick={() => setEditingMode(false)}
            >
              Cancel
            </Button>
          </Space>
        </div>
        
        <TextArea
          value={customResolution}
          onChange={(e) => setCustomResolution(e.target.value)}
          placeholder="Enter your custom resolution here..."
          rows={10}
          style={{ fontFamily: 'monospace' }}
        />
        
        <div className="editor-help">
          <Alert
            message="Custom Resolution"
            description="Edit the content manually to create your own resolution. You can combine parts from both versions or write something completely new."
            type="info"
            showIcon
            style={{ marginTop: 12 }}
          />
        </div>
      </div>
    );
  };

  const totalConflicts = conflicts.length;
  const resolvedCount = resolvedConflicts.size;
  const isAllResolved = totalConflicts > 0 && resolvedCount === totalConflicts;

  if (!currentRepository) {
    return (
      <Card>
        <Empty
          image={<FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />}
          description="No repository selected"
        />
      </Card>
    );
  }

  if (!selectedFile) {
    return (
      <Card>
        <Empty
          image={<FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />}
          description="Select a file with conflicts to resolve"
        />
      </Card>
    );
  }

  if (conflicts.length === 0) {
    return (
      <Card>
        <Empty
          image={<CheckOutlined style={{ fontSize: '48px', color: '#52c41a' }} />}
          description="No conflicts found in this file"
        />
      </Card>
    );
  }

  return (
    <div className="merge-conflict-resolver">
      <Card
        title={
          <Space>
            <MergeOutlined />
            <Title level={4} style={{ margin: 0 }}>Merge Conflict Resolver</Title>
            {selectedFile && (
              <Tag>{selectedFile}</Tag>
            )}
            {isAllResolved && (
              <Tag color="success">All Resolved</Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Help">
              <Button
                icon={<InfoCircleOutlined />}
                onClick={() => setShowTutorialModal(true)}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Undo">
              <Button
                icon={<UndoOutlined />}
                onClick={undoResolution}
                disabled={historyIndex < 0}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Redo">
              <Button
                icon={<RedoOutlined />}
                onClick={redoResolution}
                disabled={historyIndex >= resolutionHistory.length - 1}
                size="small"
              />
            </Tooltip>
          </Space>
        }
      >
        <Spin spinning={isLoading}>
          <div className="conflict-resolver-content">
            {/* Progress Summary */}
            <div className="conflict-summary">
              <Row gutter={16}>
                <Col span={8}>
                  <Card size="small" className="summary-card">
                    <div className="summary-item">
                      <Text strong>Total Conflicts</Text>
                      <Badge count={totalConflicts} style={{ backgroundColor: '#ff4d4f' }} />
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" className="summary-card resolved">
                    <div className="summary-item">
                      <Text strong>Resolved</Text>
                      <Badge count={resolvedCount} style={{ backgroundColor: '#52c41a' }} />
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" className="summary-card remaining">
                    <div className="summary-item">
                      <Text strong>Remaining</Text>
                      <Badge count={totalConflicts - resolvedCount} style={{ backgroundColor: '#faad14' }} />
                    </div>
                  </Card>
                </Col>
              </Row>
              
              <Progress
                percent={totalConflicts > 0 ? (resolvedCount / totalConflicts) * 100 : 0}
                strokeColor="#52c41a"
                showInfo={true}
                format={(percent) => `${resolvedCount}/${totalConflicts} conflicts resolved`}
              />
            </div>

            {/* Conflict Navigation */}
            {renderConflictNavigation()}

            <Divider />

            {/* Three Pane View */}
            {renderThreePaneView()}

            <Divider />

            {/* Resolution Controls */}
            {renderResolutionControls()}

            {/* Custom Editor */}
            {renderCustomEditor()}

            {/* Completion Message */}
            {isAllResolved && (
              <Alert
                message="All Conflicts Resolved!"
                description="You have successfully resolved all conflicts in this file. You can now commit your changes."
                type="success"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        </Spin>
      </Card>

      {/* Tutorial Modal */}
      <Modal
        title="Merge Conflict Resolution Tutorial"
        open={showTutorialModal}
        onCancel={() => setShowTutorialModal(false)}
        footer={null}
        width={800}
      >
        <div className="tutorial-content">
          <Steps direction="vertical" size="small">
            <Step
              title="Understand the Conflict"
              description="The three-pane view shows incoming changes (left), your current changes (middle), and the resolution result (right)."
              icon={<InfoCircleOutlined />}
            />
            <Step
              title="Choose a Resolution"
              description="Select one of the resolution options: Accept Incoming, Accept Current, Accept Both, or Edit Manually."
              icon={<CheckOutlined />}
            />
            <Step
              title="Review the Result"
              description="The right pane shows how your resolution will look. Make sure it's what you want before proceeding."
              icon={<EyeOutlined />}
            />
            <Step
              title="Navigate Conflicts"
              description="Use Previous/Next buttons to move between conflicts. All conflicts must be resolved before committing."
              icon={<CaretRightOutlined />}
            />
          </Steps>
          
          <Divider />
          
          <Alert
            message="Tips for Resolving Conflicts"
            description={
              <ul>
                <li><strong>Accept Incoming:</strong> Use when the incoming changes are better</li>
                <li><strong>Accept Current:</strong> Keep your local changes</li>
                <li><strong>Accept Both:</strong> When you need both sets of changes</li>
                <li><strong>Edit Manually:</strong> For complex resolutions requiring custom logic</li>
              </ul>
            }
            type="info"
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
}

export default MergeConflictResolver;
