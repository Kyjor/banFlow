import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { ipcRenderer } from 'electron';
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
  List,
  Segmented,
  Switch,
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
  CaretLeftOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  MergeOutlined,
  BranchesOutlined,
  WarningOutlined,
  CopyOutlined,
  SwapOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LeftOutlined,
  RightOutlined,
  CheckCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  tomorrow,
  prism,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useGit } from '../../../contexts/GitContext';
import './MergeConflictResolver.scss';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Parse conflict markers from file content
function parseConflicts(content) {
  const conflicts = [];
  const lines = content.split('\n');
  let currentConflict = null;
  let lineNumber = 0;
  let conflictId = 0;

  const nonConflictLines = [];
  let lastNonConflictEnd = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    lineNumber = i + 1;

    if (line.startsWith('<<<<<<<')) {
      // Start of conflict - capture context before
      const contextStart = Math.max(0, i - 3);
      const currentConflictId = conflictId;
      conflictId += 1;
      currentConflict = {
        id: `conflict-${currentConflictId}`,
        startLine: lineNumber,
        endLine: null,
        oursMarker: line,
        theirsMarker: null,
        oursLines: [],
        theirsLines: [],
        oursBranchName: line.replace('<<<<<<<', '').trim() || 'HEAD',
        theirsBranchName: '',
        contextBefore: lines.slice(contextStart, i),
        contextAfter: [],
        startIndex: i,
        endIndex: null,
        resolution: null, // 'ours', 'theirs', 'both', 'custom'
        customContent: null,
      };
      nonConflictLines.push({
        start: lastNonConflictEnd,
        end: i,
        lines: lines.slice(lastNonConflictEnd, i),
      });
    } else if (line.startsWith('=======') && currentConflict) {
      // Middle of conflict - switch from ours to theirs
      currentConflict.separator = lineNumber;
    } else if (line.startsWith('>>>>>>>') && currentConflict) {
      // End of conflict
      currentConflict.endLine = lineNumber;
      currentConflict.theirsMarker = line;
      currentConflict.theirsBranchName = line.replace('>>>>>>>', '').trim();
      currentConflict.endIndex = i;
      currentConflict.contextAfter = lines.slice(
        i + 1,
        Math.min(lines.length, i + 4),
      );
      conflicts.push(currentConflict);
      lastNonConflictEnd = i + 1;
      currentConflict = null;
    } else if (currentConflict) {
      // Inside a conflict
      if (currentConflict.separator) {
        currentConflict.theirsLines.push(line);
      } else {
        currentConflict.oursLines.push(line);
      }
    }
  }

  return conflicts;
}

// Build the resolved file content
function buildResolvedContent(originalContent, conflicts) {
  const lines = originalContent.split('\n');
  const result = [];
  let lastProcessedLine = 0;

  // Sort conflicts by start index
  const sortedConflicts = [...conflicts].sort(
    (a, b) => a.startIndex - b.startIndex,
  );

  for (const conflict of sortedConflicts) {
    // Add lines before this conflict
    result.push(...lines.slice(lastProcessedLine, conflict.startIndex));

    // Add resolved content for this conflict
    if (conflict.resolution === 'ours') {
      result.push(...conflict.oursLines);
    } else if (conflict.resolution === 'theirs') {
      result.push(...conflict.theirsLines);
    } else if (conflict.resolution === 'both-ours-first') {
      result.push(...conflict.oursLines);
      result.push(...conflict.theirsLines);
    } else if (conflict.resolution === 'both-theirs-first') {
      result.push(...conflict.theirsLines);
      result.push(...conflict.oursLines);
    } else if (conflict.resolution === 'custom') {
      result.push(...(conflict.customContent || '').split('\n'));
    } else {
      // Unresolved - keep conflict markers
      result.push(conflict.oursMarker);
      result.push(...conflict.oursLines);
      result.push('=======');
      result.push(...conflict.theirsLines);
      result.push(conflict.theirsMarker);
    }

    lastProcessedLine = conflict.endIndex + 1;
  }

  // Add remaining lines after last conflict
  result.push(...lines.slice(lastProcessedLine));

  return result.join('\n');
}

function MergeConflictResolver({
  file = null,
  onConflictResolved = null,
  onFileChange = null,
  theme = 'light',
}) {
  const {
    currentRepository,
    conflictedFiles,
    stageFiles,
    refreshRepositoryStatus,
    isLoading,
    operationInProgress,
  } = useGit();

  const [selectedFile, setSelectedFile] = useState(file);
  const [fileContent, setFileContent] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [resolutionHistory, setResolutionHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTutorial, setShowTutorial] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [customContent, setCustomContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side', 'inline', 'result'
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const editorRef = useRef(null);

  // Sync with file prop
  useEffect(() => {
    if (file !== selectedFile) {
      setSelectedFile(file);
    }
  }, [file]);

  // Load file content when selected file changes
  useEffect(() => {
    const loadFile = async () => {
      if (!selectedFile || !currentRepository) {
        setFileContent('');
        setConflicts([]);
        return;
      }

      try {
        const result = await ipcRenderer.invoke(
          'git:readFile',
          currentRepository,
          selectedFile,
        );
        if (result.success) {
          setFileContent(result.content);
          const parsedConflicts = parseConflicts(result.content);
          setConflicts(parsedConflicts);
          setCurrentConflictIndex(0);
          setResolutionHistory([]);
          setHistoryIndex(-1);
          setEditMode(false);
        } else {
          message.error('Failed to load file');
        }
      } catch (error) {
        console.error('Failed to load file:', error);
        message.error('Failed to load file');
      }
    };

    loadFile();
  }, [selectedFile, currentRepository]);

  // Select first conflicted file if none selected
  useEffect(() => {
    if (!selectedFile && conflictedFiles && conflictedFiles.length > 0) {
      setSelectedFile(conflictedFiles[0]);
    }
  }, [conflictedFiles, selectedFile]);

  const getCurrentConflict = useCallback(() => {
    return conflicts[currentConflictIndex] || null;
  }, [conflicts, currentConflictIndex]);

  const resolvedCount = useMemo(() => {
    return conflicts.filter((c) => c.resolution).length;
  }, [conflicts]);

  const isAllResolved = useMemo(() => {
    return conflicts.length > 0 && resolvedCount === conflicts.length;
  }, [conflicts, resolvedCount]);

  const getLanguageFromFilename = (filename) => {
    if (!filename) return 'text';
    const extension = filename.split('.').pop()?.toLowerCase();
    const languageMap = {
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      html: 'markup',
      xml: 'markup',
      css: 'css',
      scss: 'scss',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
    };
    return languageMap[extension] || 'text';
  };

  const resolveConflict = useCallback(
    (resolution, customText = null) => {
      const conflict = getCurrentConflict();
      if (!conflict) return;

      // Save to history for undo
      const previousState = { ...conflict };
      setResolutionHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({
          conflictId: conflict.id,
          previousState,
          newResolution: resolution,
        });
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);

      // Update conflict resolution
      setConflicts((prev) =>
        prev.map((c) => {
          if (c.id === conflict.id) {
            return {
              ...c,
              resolution,
              customContent: customText,
            };
          }
          return c;
        }),
      );

      const resolutionLabels = {
        ours: 'current changes',
        theirs: 'incoming changes',
        'both-ours-first': 'both (current first)',
        'both-theirs-first': 'both (incoming first)',
        custom: 'custom resolution',
      };
      message.success(`Accepted ${resolutionLabels[resolution] || resolution}`);

      // Auto-advance to next unresolved conflict
      if (autoAdvance) {
        const nextUnresolvedIndex = conflicts.findIndex(
          (c, index) => index > currentConflictIndex && !c.resolution,
        );

        if (nextUnresolvedIndex !== -1) {
          setCurrentConflictIndex(nextUnresolvedIndex);
        } else {
          // Check if all resolved
          const updatedConflicts = conflicts.map((c) =>
            c.id === conflict.id ? { ...c, resolution } : c,
          );
          if (updatedConflicts.every((c) => c.resolution)) {
            message.success(
              'All conflicts resolved! You can now save the file.',
            );
          }
        }
      }

      setEditMode(false);
    },
    [
      getCurrentConflict,
      conflicts,
      currentConflictIndex,
      historyIndex,
      autoAdvance,
    ],
  );

  const undoResolution = useCallback(() => {
    if (historyIndex < 0) return;

    const lastAction = resolutionHistory[historyIndex];
    setConflicts((prev) =>
      prev.map((c) => {
        if (c.id === lastAction.conflictId) {
          return lastAction.previousState;
        }
        return c;
      }),
    );

    setHistoryIndex((prev) => prev - 1);
    message.info('Resolution undone');
  }, [historyIndex, resolutionHistory]);

  const redoResolution = useCallback(() => {
    if (historyIndex >= resolutionHistory.length - 1) return;

    const nextAction = resolutionHistory[historyIndex + 1];
    setConflicts((prev) =>
      prev.map((c) => {
        if (c.id === nextAction.conflictId) {
          return { ...c, resolution: nextAction.newResolution };
        }
        return c;
      }),
    );

    setHistoryIndex((prev) => prev + 1);
    message.info('Resolution redone');
  }, [historyIndex, resolutionHistory]);

  const navigateConflict = useCallback(
    (direction) => {
      if (direction === 'prev') {
        setCurrentConflictIndex((prev) => Math.max(0, prev - 1));
      } else {
        setCurrentConflictIndex((prev) =>
          Math.min(conflicts.length - 1, prev + 1),
        );
      }
      setEditMode(false);
    },
    [conflicts.length],
  );

  const jumpToConflict = useCallback((index) => {
    setCurrentConflictIndex(index);
    setEditMode(false);
  }, []);

  const saveResolvedFile = useCallback(async () => {
    if (!isAllResolved) {
      message.warning('Please resolve all conflicts before saving');
      return;
    }

    setIsSaving(true);
    try {
      const resolvedContent = buildResolvedContent(fileContent, conflicts);
      const result = await ipcRenderer.invoke(
        'git:writeFile',
        currentRepository,
        selectedFile,
        resolvedContent,
      );

      if (result.success) {
        // Stage the file
        await stageFiles([selectedFile]);
        await refreshRepositoryStatus();

        message.success('File saved and staged successfully!');

        if (onConflictResolved) {
          onConflictResolved(conflicts.length);
        }
        if (onFileChange) {
          onFileChange();
        }
      } else {
        message.error('Failed to save file');
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      message.error('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  }, [
    isAllResolved,
    fileContent,
    conflicts,
    currentRepository,
    selectedFile,
    stageFiles,
    refreshRepositoryStatus,
    onConflictResolved,
    onFileChange,
  ]);

  const startCustomEdit = useCallback(() => {
    const conflict = getCurrentConflict();
    if (!conflict) return;

    // Pre-populate with merged content
    const mergedContent = [...conflict.oursLines, ...conflict.theirsLines].join(
      '\n',
    );
    setCustomContent(mergedContent);
    setEditMode(true);
  }, [getCurrentConflict]);

  const saveCustomEdit = useCallback(() => {
    resolveConflict('custom', customContent);
    setEditMode(false);
  }, [resolveConflict, customContent]);

  const copyToCustom = useCallback(
    (source) => {
      const conflict = getCurrentConflict();
      if (!conflict) return;

      if (source === 'ours') {
        setCustomContent(conflict.oursLines.join('\n'));
      } else if (source === 'theirs') {
        setCustomContent(conflict.theirsLines.join('\n'));
      } else if (source === 'both') {
        setCustomContent(
          [...conflict.oursLines, ...conflict.theirsLines].join('\n'),
        );
      }
    },
    [getCurrentConflict],
  );

  const renderFileSelector = () => {
    if (!conflictedFiles || conflictedFiles.length === 0) {
      return (
        <Alert
          message="No Conflicts"
          description="There are no files with merge conflicts in this repository."
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
        />
      );
    }

    return (
      <div className="file-selector">
        <Text strong style={{ marginBottom: 8, display: 'block' }}>
          Files with conflicts ({conflictedFiles.length})
        </Text>
        <List
          size="small"
          bordered
          dataSource={conflictedFiles}
          renderItem={(filePath) => {
            const isSelected = filePath === selectedFile;
            const fileConflicts = filePath === selectedFile ? conflicts : [];
            const fileResolved =
              fileConflicts.length > 0 &&
              fileConflicts.every((c) => c.resolution);

            return (
              <List.Item
                className={`file-item ${isSelected ? 'selected' : ''} ${fileResolved ? 'resolved' : ''}`}
                onClick={() => setSelectedFile(filePath)}
              >
                <Space>
                  <FileTextOutlined />
                  <Text strong={isSelected}>{filePath}</Text>
                </Space>
                {isSelected && conflicts.length > 0 && (
                  <Tag color={fileResolved ? 'success' : 'warning'}>
                    {resolvedCount}/{conflicts.length}
                  </Tag>
                )}
              </List.Item>
            );
          }}
        />
      </div>
    );
  };

  const renderConflictMinimap = () => {
    if (conflicts.length === 0) return null;

    return (
      <div className="conflict-minimap">
        <Text
          type="secondary"
          style={{ fontSize: 11, marginBottom: 4, display: 'block' }}
        >
          Conflicts
        </Text>
        <div className="minimap-items">
          {conflicts.map((conflict, index) => (
            <Tooltip
              key={conflict.id}
              title={`Conflict ${index + 1} (Line ${conflict.startLine})`}
            >
              <div
                className={`minimap-item ${conflict.resolution ? 'resolved' : ''} ${index === currentConflictIndex ? 'current' : ''}`}
                onClick={() => jumpToConflict(index)}
              >
                {conflict.resolution ? <CheckOutlined /> : index + 1}
              </div>
            </Tooltip>
          ))}
        </div>
      </div>
    );
  };

  const renderConflictPane = (title, lines, type, branchName) => {
    const conflict = getCurrentConflict();
    const isOurs = type === 'ours';
    const isTheirs = type === 'theirs';
    const isSelected =
      conflict?.resolution === type ||
      (conflict?.resolution === 'both-ours-first' && isOurs) ||
      (conflict?.resolution === 'both-theirs-first' && isTheirs);

    return (
      <div className={`conflict-pane ${type} ${isSelected ? 'selected' : ''}`}>
        <div className="pane-header">
          <Space>
            <Tag color={isOurs ? 'orange' : 'blue'}>
              {isOurs ? 'Current' : 'Incoming'}
            </Tag>
            <Text strong>{branchName}</Text>
            <Text type="secondary">({lines.length} lines)</Text>
          </Space>
          <Space>
            <Tooltip
              title={`Accept ${isOurs ? 'current' : 'incoming'} changes`}
            >
              <Button
                size="small"
                type={isSelected ? 'primary' : 'default'}
                icon={<CheckOutlined />}
                onClick={() => resolveConflict(type)}
              >
                Accept
              </Button>
            </Tooltip>
            <Tooltip title="Copy to editor">
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  copyToCustom(type);
                  setEditMode(true);
                }}
              />
            </Tooltip>
          </Space>
        </div>
        <div className="pane-content">
          <SyntaxHighlighter
            language={getLanguageFromFilename(selectedFile)}
            style={theme === 'dark' ? tomorrow : prism}
            showLineNumbers={showLineNumbers}
            startingLineNumber={conflict?.startLine || 1}
            customStyle={{
              margin: 0,
              padding: '12px',
              background: 'transparent',
              fontSize: '13px',
              lineHeight: '22px',
              minHeight: '200px',
            }}
          >
            {lines.join('\n') || ' '}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  };

  const renderInlineView = () => {
    const conflict = getCurrentConflict();
    if (!conflict) return null;

    return (
      <div className="inline-view">
        {/* Context Before */}
        {conflict.contextBefore.length > 0 && (
          <div className="context-lines before">
            {conflict.contextBefore.map((line, i) => (
              <div key={`before-${i}`} className="context-line">
                <span className="line-number">
                  {conflict.startLine - conflict.contextBefore.length + i}
                </span>
                <span className="line-content">{line}</span>
              </div>
            ))}
          </div>
        )}

        {/* Ours Section */}
        <div
          className={`conflict-section ours ${conflict.resolution === 'ours' || conflict.resolution?.includes('ours') ? 'selected' : ''}`}
          onClick={() => !conflict.resolution && resolveConflict('ours')}
        >
          <div className="section-header">
            <Tag color="orange">
              Current Changes ({conflict.oursBranchName})
            </Tag>
            {!conflict.resolution && (
              <Button size="small" type="primary" icon={<CheckOutlined />}>
                Accept Current
              </Button>
            )}
          </div>
          {conflict.oursLines.map((line, i) => (
            <div key={`ours-${i}`} className="conflict-line ours">
              <span className="line-marker">-</span>
              <span className="line-content">{line}</span>
            </div>
          ))}
        </div>

        {/* Theirs Section */}
        <div
          className={`conflict-section theirs ${conflict.resolution === 'theirs' || conflict.resolution?.includes('theirs') ? 'selected' : ''}`}
          onClick={() => !conflict.resolution && resolveConflict('theirs')}
        >
          <div className="section-header">
            <Tag color="blue">
              Incoming Changes ({conflict.theirsBranchName})
            </Tag>
            {!conflict.resolution && (
              <Button size="small" type="primary" icon={<CheckOutlined />}>
                Accept Incoming
              </Button>
            )}
          </div>
          {conflict.theirsLines.map((line, i) => (
            <div key={`theirs-${i}`} className="conflict-line theirs">
              <span className="line-marker">+</span>
              <span className="line-content">{line}</span>
            </div>
          ))}
        </div>

        {/* Context After */}
        {conflict.contextAfter.length > 0 && (
          <div className="context-lines after">
            {conflict.contextAfter.map((line, i) => (
              <div key={`after-${i}`} className="context-line">
                <span className="line-number">{conflict.endLine + 1 + i}</span>
                <span className="line-content">{line}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderResultPreview = () => {
    const resolvedContent = buildResolvedContent(fileContent, conflicts);

    return (
      <div className="result-preview">
        <div className="preview-header">
          <Space>
            <EyeOutlined />
            <Text strong>Resolved File Preview</Text>
          </Space>
          {isAllResolved && (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Ready to Save
            </Tag>
          )}
        </div>
        <div className="preview-content">
          <SyntaxHighlighter
            language={getLanguageFromFilename(selectedFile)}
            style={theme === 'dark' ? tomorrow : prism}
            showLineNumbers={showLineNumbers}
            customStyle={{
              margin: 0,
              padding: '12px',
              background: 'transparent',
              fontSize: '13px',
              lineHeight: '22px',
              maxHeight: '500px',
              overflow: 'auto',
            }}
          >
            {resolvedContent}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  };

  const renderCustomEditor = () => {
    return (
      <div className="custom-editor-panel">
        <div className="editor-header">
          <Space>
            <EditOutlined />
            <Text strong>Custom Resolution Editor</Text>
          </Space>
          <Space>
            <Tooltip title="Copy current changes">
              <Button size="small" onClick={() => copyToCustom('ours')}>
                <ArrowLeftOutlined /> Current
              </Button>
            </Tooltip>
            <Tooltip title="Copy incoming changes">
              <Button size="small" onClick={() => copyToCustom('theirs')}>
                Incoming <ArrowRightOutlined />
              </Button>
            </Tooltip>
            <Tooltip title="Copy both">
              <Button size="small" onClick={() => copyToCustom('both')}>
                <SwapOutlined /> Both
              </Button>
            </Tooltip>
          </Space>
        </div>
        <TextArea
          ref={editorRef}
          value={customContent}
          onChange={(e) => setCustomContent(e.target.value)}
          placeholder="Edit the merged content here..."
          autoSize={{ minRows: 10, maxRows: 25 }}
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            lineHeight: '22px',
          }}
        />
        <div className="editor-actions">
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={saveCustomEdit}
              disabled={!customContent.trim()}
            >
              Apply Custom Resolution
            </Button>
            <Button onClick={() => setEditMode(false)}>Cancel</Button>
          </Space>
        </div>
      </div>
    );
  };

  const renderResolutionControls = () => {
    const conflict = getCurrentConflict();
    if (!conflict || editMode) return null;

    return (
      <div className="resolution-controls">
        <div className="quick-actions">
          <Button
            type={conflict.resolution === 'ours' ? 'primary' : 'default'}
            icon={<ArrowLeftOutlined />}
            onClick={() => resolveConflict('ours')}
            style={{ borderColor: '#fa8c16' }}
          >
            Accept Current
          </Button>
          <Button
            type={conflict.resolution === 'theirs' ? 'primary' : 'default'}
            icon={<ArrowRightOutlined />}
            onClick={() => resolveConflict('theirs')}
            style={{ borderColor: '#1890ff' }}
          >
            Accept Incoming
          </Button>
          <Button
            type={
              conflict.resolution === 'both-ours-first' ? 'primary' : 'default'
            }
            icon={<MergeOutlined />}
            onClick={() => resolveConflict('both-ours-first')}
          >
            Accept Both
          </Button>
          <Button
            type={conflict.resolution === 'custom' ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={startCustomEdit}
          >
            Edit Manually
          </Button>
        </div>

        {conflict.resolution && (
          <div className="resolution-badge">
            <Tag color="success" icon={<CheckOutlined />}>
              Resolved:{' '}
              {conflict.resolution === 'ours'
                ? 'Current'
                : conflict.resolution === 'theirs'
                  ? 'Incoming'
                  : conflict.resolution === 'both-ours-first'
                    ? 'Both (Current First)'
                    : conflict.resolution === 'both-theirs-first'
                      ? 'Both (Incoming First)'
                      : 'Custom'}
            </Tag>
            <Button
              size="small"
              type="link"
              danger
              onClick={() => {
                setConflicts((prev) =>
                  prev.map((c) =>
                    c.id === conflict.id
                      ? { ...c, resolution: null, customContent: null }
                      : c,
                  ),
                );
              }}
            >
              Reset
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Empty state
  if (!currentRepository) {
    return (
      <Card className="merge-conflict-resolver">
        <Empty
          image={
            <FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />
          }
          description="No repository selected"
        />
      </Card>
    );
  }

  return (
    <div className={`merge-conflict-resolver ${theme}`}>
      <Card
        className="resolver-card"
        title={
          <Space>
            <MergeOutlined style={{ color: '#fa8c16' }} />
            <span>Merge Conflict Resolver</span>
            {selectedFile && <Tag>{selectedFile.split('/').pop()}</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Show tutorial">
              <Button
                icon={<InfoCircleOutlined />}
                onClick={() => setShowTutorial(true)}
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
            <Divider type="vertical" />
            <Switch
              checkedChildren="Auto-advance"
              unCheckedChildren="Manual"
              checked={autoAdvance}
              onChange={setAutoAdvance}
              size="small"
            />
          </Space>
        }
      >
        <Spin spinning={isLoading || isSaving}>
          <Row gutter={16}>
            {/* Left sidebar - file list */}
            <Col span={5}>
              {renderFileSelector()}
              {renderConflictMinimap()}
            </Col>

            {/* Main content */}
            <Col span={19}>
              {conflicts.length === 0 ? (
                <Empty
                  image={
                    <CheckOutlined
                      style={{ fontSize: '48px', color: '#52c41a' }}
                    />
                  }
                  description={
                    selectedFile
                      ? 'No conflicts found in this file'
                      : 'Select a file to resolve conflicts'
                  }
                />
              ) : (
                <>
                  {/* Progress bar */}
                  <div className="progress-section">
                    <div className="progress-info">
                      <Text>
                        <strong>{resolvedCount}</strong> of{' '}
                        <strong>{conflicts.length}</strong> conflicts resolved
                      </Text>
                      {isAllResolved && (
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          onClick={saveResolvedFile}
                          loading={isSaving}
                        >
                          Save & Stage File
                        </Button>
                      )}
                    </div>
                    <Progress
                      percent={Math.round(
                        (resolvedCount / conflicts.length) * 100,
                      )}
                      strokeColor={{
                        '0%': '#fa8c16',
                        '100%': '#52c41a',
                      }}
                      status={isAllResolved ? 'success' : 'active'}
                    />
                  </div>

                  {/* Navigation */}
                  <div className="navigation-section">
                    <Button
                      icon={<LeftOutlined />}
                      onClick={() => navigateConflict('prev')}
                      disabled={currentConflictIndex === 0}
                    >
                      Previous
                    </Button>
                    <Space>
                      <Text strong>
                        Conflict {currentConflictIndex + 1} / {conflicts.length}
                      </Text>
                      <Text type="secondary">
                        (Line {getCurrentConflict()?.startLine})
                      </Text>
                    </Space>
                    <Button
                      onClick={() => navigateConflict('next')}
                      disabled={currentConflictIndex === conflicts.length - 1}
                    >
                      Next <RightOutlined />
                    </Button>
                  </div>

                  {/* View mode selector */}
                  <div className="view-controls">
                    <Segmented
                      value={viewMode}
                      onChange={setViewMode}
                      options={[
                        { label: 'Side by Side', value: 'side-by-side' },
                        { label: 'Inline', value: 'inline' },
                        { label: 'Result Preview', value: 'result' },
                      ]}
                    />
                    <Switch
                      checkedChildren="Lines"
                      unCheckedChildren="Lines"
                      checked={showLineNumbers}
                      onChange={setShowLineNumbers}
                      size="small"
                    />
                  </div>

                  {/* Conflict view */}
                  <div className="conflict-view">
                    {editMode ? (
                      renderCustomEditor()
                    ) : viewMode === 'side-by-side' ? (
                      <Row gutter={16}>
                        <Col span={12}>
                          {renderConflictPane(
                            'Current Changes',
                            getCurrentConflict()?.oursLines || [],
                            'ours',
                            getCurrentConflict()?.oursBranchName || 'HEAD',
                          )}
                        </Col>
                        <Col span={12}>
                          {renderConflictPane(
                            'Incoming Changes',
                            getCurrentConflict()?.theirsLines || [],
                            'theirs',
                            getCurrentConflict()?.theirsBranchName || '',
                          )}
                        </Col>
                      </Row>
                    ) : viewMode === 'inline' ? (
                      renderInlineView()
                    ) : (
                      renderResultPreview()
                    )}
                  </div>

                  {/* Resolution controls */}
                  {renderResolutionControls()}
                </>
              )}
            </Col>
          </Row>
        </Spin>
      </Card>

      {/* Tutorial Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
            <span>How to Resolve Merge Conflicts</span>
          </Space>
        }
        open={showTutorial}
        onCancel={() => setShowTutorial(false)}
        footer={
          <Button type="primary" onClick={() => setShowTutorial(false)}>
            Got it!
          </Button>
        }
        width={700}
      >
        <div className="tutorial-content">
          <div className="tutorial-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <Text strong>Understand the Conflict</Text>
              <Paragraph type="secondary">
                <Tag color="orange">Current</Tag> shows your local changes
                (HEAD).
                <Tag color="blue">Incoming</Tag> shows changes from the branch
                being merged.
              </Paragraph>
            </div>
          </div>

          <div className="tutorial-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <Text strong>Choose a Resolution</Text>
              <Paragraph type="secondary">
                • <strong>Accept Current</strong> – Keep your local changes
                <br />• <strong>Accept Incoming</strong> – Use the incoming
                changes
                <br />• <strong>Accept Both</strong> – Keep both sets of changes
                <br />• <strong>Edit Manually</strong> – Create a custom
                combination
              </Paragraph>
            </div>
          </div>

          <div className="tutorial-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <Text strong>Review & Save</Text>
              <Paragraph type="secondary">
                Use the "Result Preview" tab to see the final file. Once all
                conflicts are resolved, click "Save & Stage File" to apply your
                changes.
              </Paragraph>
            </div>
          </div>

          <Alert
            message="Keyboard Shortcuts"
            description={
              <Space direction="vertical">
                <Text>
                  <Tag>←</Tag> / <Tag>→</Tag> Navigate between conflicts
                </Text>
                <Text>
                  <Tag>1</Tag> Accept current | <Tag>2</Tag> Accept incoming
                </Text>
                <Text>
                  <Tag>3</Tag> Accept both | <Tag>E</Tag> Edit manually
                </Text>
              </Space>
            }
            type="info"
          />
        </div>
      </Modal>
    </div>
  );
}

export default MergeConflictResolver;
