import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ipcRenderer } from 'electron';
import { 
  Card, 
  Select, 
  Button, 
  Space, 
  Typography, 
  Tag, 
  Empty, 
  Spin, 
  Tooltip, 
  Row, 
  Col,
  Switch,
  Slider,
  InputNumber,
  Divider,
  Badge,
  Progress,
  Alert,
  Input,
  message
} from 'antd';
import {
  FileTextOutlined,
  SwapOutlined,
  FullscreenOutlined,
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  MinusOutlined,
  PlusOutlined,
  SettingOutlined,
  SearchOutlined,
  BookOutlined,
  InfoCircleOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  CheckOutlined,
  CloseOutlined,
  UndoOutlined,
  EditOutlined
} from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useGit } from '../../../contexts/GitContext';
import { useHeartbeat } from '../../../hooks/useHeartbeat';
import './EnhancedDiffViewer.scss';

const { Title, Text } = Typography;
const { Option } = Select;

function EnhancedDiffViewer({ 
  file = null, 
  staged = false, 
  compact = false,
  showFileSelector = true,
  theme = 'light',
  showStagingControls = true,
  editable = false,
  diffData = null,
  readOnly = false
}) {
  const {
    currentRepository,
    currentDiff,
    modifiedFiles,
    stagedFiles,
    getDiff,
    isLoading,
    operationInProgress,
    stageFiles,
    unstageFiles,
    discardChanges,
    stageHunk,
    discardHunk,
    stageLines,
    discardLines
  } = useGit();

  const [selectedFile, setSelectedFile] = useState(file);
  const [viewMode, setViewMode] = useState('side-by-side');
  const [showWhitespace, setShowWhitespace] = useState(false);
  const [selectedDiff, setSelectedDiff] = useState(null);
  const [contextLines, setContextLines] = useState(3);
  const [expandedHunks, setExpandedHunks] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [selectedHunk, setSelectedHunk] = useState(null);
  const [selectedLines, setSelectedLines] = useState(new Set());
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [originalFileContent, setOriginalFileContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef(null);

  // Sync selectedFile with file prop when it changes
  useEffect(() => {
    if (file && file !== selectedFile) {
      setSelectedFile(file);
      setSelectedDiff(null); // Clear previous diff while loading new one
    }
  }, [file]);

  // Use provided diffData if available (for historical commits)
  useEffect(() => {
    if (diffData) {
      // diffData is already parsed, find the file diff or use first one
      if (Array.isArray(diffData) && diffData.length > 0) {
        const fileDiff = file ? diffData.find(d => d.name === file) : diffData[0];
        setSelectedDiff(fileDiff || diffData[0] || null);
      } else {
        setSelectedDiff(null);
      }
    }
  }, [diffData, file]);

  useEffect(() => {
    // Skip fetching if we have pre-loaded diffData
    if (diffData) return;
    if (selectedFile && currentRepository) {
      loadDiff(selectedFile);
    }
  }, [selectedFile, staged, currentRepository, diffData]);

  useEffect(() => {
    // Skip if we have pre-loaded diffData
    if (diffData) return;
    if (currentDiff && currentDiff.length > 0 && selectedFile) {
      const fileDiff = currentDiff.find(diff => diff.name === selectedFile);
      setSelectedDiff(fileDiff || null);
    } else if (!currentDiff || currentDiff.length === 0) {
      setSelectedDiff(null);
    }
  }, [currentDiff, selectedFile, diffData]);

  const loadDiff = async (filename) => {
    try {
      await getDiff(filename, staged);
    } catch (error) {
      console.error('Failed to load diff:', error);
    }
  };

  // Auto-refresh diff every 3 seconds when viewing a file (disabled for read-only/historical diffs)
  useHeartbeat(
    `diff-viewer-refresh-${selectedFile || 'none'}`,
    () => {
      if (selectedFile && currentRepository && !diffData) {
        loadDiff(selectedFile);
      }
    },
    3000,
    {
      enabled: !!selectedFile && !!currentRepository && !diffData && !readOnly,
      immediate: false
    }
  );

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

  const getFileIcon = (filename) => {
    return <FileTextOutlined style={{ color: '#1890ff' }} />;
  };

  const toggleHunkExpansion = useCallback((hunkIndex) => {
    setExpandedHunks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hunkIndex)) {
        newSet.delete(hunkIndex);
      } else {
        newSet.add(hunkIndex);
      }
      return newSet;
    });
  }, []);

  // Toggle line selection for batch operations
  const toggleLineSelection = useCallback((hunkIndex, lineIndex) => {
    const key = `${hunkIndex}-${lineIndex}`;
    setSelectedLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // Clear line selection
  const clearLineSelection = useCallback(() => {
    setSelectedLines(new Set());
  }, []);

  // Stage file handler
  const handleStageFile = useCallback(async () => {
    if (!selectedFile) return;
    try {
      await stageFiles([selectedFile]);
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to stage file:', error);
    }
  }, [selectedFile, stageFiles, loadDiff]);

  // Unstage file handler
  const handleUnstageFile = useCallback(async () => {
    if (!selectedFile) return;
    try {
      await unstageFiles([selectedFile]);
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to unstage file:', error);
    }
  }, [selectedFile, unstageFiles, loadDiff]);

  // Discard file handler
  const handleDiscardFile = useCallback(async () => {
    if (!selectedFile) return;
    try {
      await discardChanges([selectedFile]);
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to discard file:', error);
    }
  }, [selectedFile, discardChanges, loadDiff]);

  // Stage hunk handler
  const handleStageHunk = useCallback(async (hunkIndex) => {
    if (!selectedFile) return;
    try {
      await stageHunk(selectedFile, hunkIndex);
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to stage hunk:', error);
    }
  }, [selectedFile, stageHunk, loadDiff]);

  // Discard hunk handler
  const handleDiscardHunk = useCallback(async (hunkIndex) => {
    if (!selectedFile) return;
    try {
      await discardHunk(selectedFile, hunkIndex);
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to discard hunk:', error);
    }
  }, [selectedFile, discardHunk, loadDiff]);

  // Stage selected lines handler
  const handleStageSelectedLines = useCallback(async () => {
    if (!selectedFile || selectedLines.size === 0) return;
    
    // Group selected lines by hunk
    const hunkGroups = {};
    selectedLines.forEach(key => {
      const [hunkIndex, lineIndex] = key.split('-').map(Number);
      if (!hunkGroups[hunkIndex]) {
        hunkGroups[hunkIndex] = [];
      }
      hunkGroups[hunkIndex].push(lineIndex);
    });
    
    try {
      // Stage lines for each hunk
      for (const [hunkIndex, lineIndices] of Object.entries(hunkGroups)) {
        await stageLines(selectedFile, parseInt(hunkIndex), lineIndices);
      }
      clearLineSelection();
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to stage lines:', error);
    }
  }, [selectedFile, selectedLines, stageLines, clearLineSelection, loadDiff]);

  // Discard selected lines handler
  const handleDiscardSelectedLines = useCallback(async () => {
    if (!selectedFile || selectedLines.size === 0) return;
    
    // Group selected lines by hunk
    const hunkGroups = {};
    selectedLines.forEach(key => {
      const [hunkIndex, lineIndex] = key.split('-').map(Number);
      if (!hunkGroups[hunkIndex]) {
        hunkGroups[hunkIndex] = [];
      }
      hunkGroups[hunkIndex].push(lineIndex);
    });
    
    try {
      // Discard lines for each hunk
      for (const [hunkIndex, lineIndices] of Object.entries(hunkGroups)) {
        await discardLines(selectedFile, parseInt(hunkIndex), lineIndices);
      }
      clearLineSelection();
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to discard lines:', error);
    }
  }, [selectedFile, selectedLines, discardLines, clearLineSelection, loadDiff]);

  // Stage single line handler
  const handleStageLine = useCallback(async (hunkIndex, lineIndex) => {
    if (!selectedFile) return;
    try {
      await stageLines(selectedFile, hunkIndex, [lineIndex]);
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to stage line:', error);
    }
  }, [selectedFile, stageLines, loadDiff]);

  // Discard single line handler
  const handleDiscardLine = useCallback(async (hunkIndex, lineIndex) => {
    if (!selectedFile) return;
    try {
      await discardLines(selectedFile, hunkIndex, [lineIndex]);
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to discard line:', error);
    }
  }, [selectedFile, discardLines, loadDiff]);

  // Load file content for editing
  const loadFileForEditing = useCallback(async () => {
    if (!selectedFile || !currentRepository) return;
    try {
      const result = await ipcRenderer.invoke('git:readFile', currentRepository, selectedFile);
      if (result.success) {
        setEditedContent(result.content);
        setOriginalFileContent(result.content);
        setEditMode(true);
      }
    } catch (error) {
      console.error('Failed to load file for editing:', error);
      message.error('Failed to load file for editing');
    }
  }, [selectedFile, currentRepository]);

  // Save edited content
  const handleSaveEdit = useCallback(async () => {
    if (!selectedFile || !currentRepository) return;
    setIsSaving(true);
    try {
      const result = await ipcRenderer.invoke('git:writeFile', currentRepository, selectedFile, editedContent);
      if (result.success) {
        message.success('File saved successfully');
        setOriginalFileContent(editedContent);
        loadDiff(selectedFile);
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      message.error('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  }, [selectedFile, currentRepository, editedContent, loadDiff]);

  // Cancel edit mode
  const handleCancelEdit = useCallback(() => {
    setEditedContent(originalFileContent);
    setEditMode(false);
  }, [originalFileContent]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = editMode && editedContent !== originalFileContent;

  const filteredHunks = useMemo(() => {
    if (!selectedDiff || !searchTerm) return selectedDiff?.hunks || [];
    
    return selectedDiff.hunks.filter(hunk => 
      hunk.lines.some(line => 
        line.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [selectedDiff, searchTerm]);

  const renderHunkHeader = (hunk, hunkIndex) => {
    const isExpanded = expandedHunks.has(hunkIndex);
    const addedLines = hunk.lines.filter(line => line.type === 'added').length;
    const deletedLines = hunk.lines.filter(line => line.type === 'deleted').length;
    
    return (
      <div className="hunk-header">
        <div 
          className="hunk-header-info"
          onClick={() => toggleHunkExpansion(hunkIndex)}
          style={{ cursor: 'pointer', flex: 1 }}
        >
          <Space>
            {isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            <Text code style={{ fontSize: '12px' }}>{hunk.header}</Text>
            {addedLines > 0 && <Tag color="green" size="small">+{addedLines}</Tag>}
            {deletedLines > 0 && <Tag color="red" size="small">-{deletedLines}</Tag>}
          </Space>
        </div>
        {showStagingControls && !staged && (
          <div className="hunk-actions" onClick={(e) => e.stopPropagation()}>
            <Space size="small">
              <Tooltip title="Stage this hunk">
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleStageHunk(hunkIndex)}
                  loading={operationInProgress}
                >
                  Stage
                </Button>
              </Tooltip>
              <Tooltip title="Discard this hunk">
                <Button
                  size="small"
                  danger
                  icon={<UndoOutlined />}
                  onClick={() => handleDiscardHunk(hunkIndex)}
                  loading={operationInProgress}
                >
                  Discard
                </Button>
              </Tooltip>
            </Space>
          </div>
        )}
      </div>
    );
  };

  const renderLineWithStaging = (line, lineIndex, hunkIndex, oldLineNum = null, newLineNum = null) => {
    const lineKey = `${hunkIndex}-${lineIndex}`;
    const isSelected = selectedHunk === lineKey;
    const isLineSelected = selectedLines.has(lineKey);
    const isChangedLine = line.type === 'added' || line.type === 'deleted';
    
    return (
      <div 
        key={lineIndex}
        className={`diff-line diff-line-${line.type} ${isSelected ? 'selected' : ''} ${isLineSelected ? 'line-selected' : ''}`}
        onClick={() => setSelectedHunk(lineKey)}
      >
        {/* Checkbox for line selection */}
        {showStagingControls && !staged && isChangedLine && (
          <div className="line-checkbox" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isLineSelected}
              onChange={() => toggleLineSelection(hunkIndex, lineIndex)}
              title="Select line for batch operations"
            />
          </div>
        )}
        
        <div className="line-content">
          {showLineNumbers && (
            <span className="line-number">
              {oldLineNum !== null ? String(oldLineNum).padStart(4) : '    '} {newLineNum !== null ? String(newLineNum).padStart(4) : '    '}
            </span>
          )}
          <span className="line-prefix">
            {line.type === 'added' ? '+' : line.type === 'deleted' ? '-' : ' '}
          </span>
          <SyntaxHighlighter
            language={getLanguageFromFilename(selectedFile)}
            style={theme === 'dark' ? tomorrow : prism}
            customStyle={{
              margin: 0,
              padding: '0 8px',
              background: 'transparent',
              fontSize: '13px',
              lineHeight: '20px',
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre'
            }}
            PreTag="span"
            wrapLines={wordWrap}
          >
            {line.content.substring(1) || ' '}
          </SyntaxHighlighter>
        </div>
        
        {/* Line-level staging controls */}
        {showStagingControls && !staged && isChangedLine && (
          <div className="line-actions" onClick={(e) => e.stopPropagation()}>
            <Space size={2}>
              <Tooltip title="Stage this line">
                <Button
                  size="small"
                  type="text"
                  icon={<PlusOutlined style={{ color: '#52c41a', fontSize: '12px' }} />}
                  onClick={() => handleStageLine(hunkIndex, lineIndex)}
                  disabled={operationInProgress}
                />
              </Tooltip>
              <Tooltip title="Discard this line">
                <Button
                  size="small"
                  type="text"
                  icon={<CloseOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />}
                  onClick={() => handleDiscardLine(hunkIndex, lineIndex)}
                  disabled={operationInProgress}
                />
              </Tooltip>
            </Space>
          </div>
        )}
      </div>
    );
  };

  const renderUnifiedDiff = (diff) => {
    if (!diff || !diff.hunks) return null;

    // Calculate line numbers for unified view - track across all hunks
    let oldLineNum = 1;
    let newLineNum = 1;

    return (
      <div className="unified-diff">
        {filteredHunks.map((hunk, hunkIndex) => {
          // Parse hunk header to get starting line numbers
          const headerMatch = hunk.header.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
          if (headerMatch) {
            oldLineNum = parseInt(headerMatch[1]);
            newLineNum = parseInt(headerMatch[2]);
          }

          // Store line numbers for this hunk
          const hunkLineNumbers = hunk.lines.map((line) => {
            let oldLine = null;
            let newLine = null;
            
            if (line.type === 'deleted') {
              oldLine = oldLineNum++;
            } else if (line.type === 'added') {
              newLine = newLineNum++;
            } else if (line.type === 'context') {
              oldLine = oldLineNum++;
              newLine = newLineNum++;
            }

            return { oldLine, newLine };
          });

          return (
            <div key={hunkIndex} className="diff-hunk">
              {renderHunkHeader(hunk, hunkIndex)}
              {expandedHunks.has(hunkIndex) && (
                <div className="hunk-content">
                  {hunk.lines.map((line, lineIndex) => {
                    const lineNums = hunkLineNumbers[lineIndex];
                    return renderLineWithStaging(line, lineIndex, hunkIndex, lineNums.oldLine, lineNums.newLine);
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSideBySideDiff = (diff) => {
    if (!diff || !diff.hunks) return null;

    const leftLines = [];
    const rightLines = [];
    let leftLineNum = 1;
    let rightLineNum = 1;

    filteredHunks.forEach((hunk, hunkIndex) => {
      const headerMatch = hunk.header.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (headerMatch) {
        leftLineNum = parseInt(headerMatch[1]);
        rightLineNum = parseInt(headerMatch[2]);
      }

      hunk.lines.forEach((line, lineIndex) => {
        if (line.type === 'deleted') {
          leftLines.push({
            number: leftLineNum++,
            content: line.content.substring(1),
            type: 'deleted',
            hunkIndex,
            lineIndex
          });
          rightLines.push({
            number: null,
            content: '',
            type: 'empty',
            hunkIndex,
            lineIndex
          });
        } else if (line.type === 'added') {
          leftLines.push({
            number: null,
            content: '',
            type: 'empty',
            hunkIndex,
            lineIndex
          });
          rightLines.push({
            number: rightLineNum++,
            content: line.content.substring(1),
            type: 'added',
            hunkIndex,
            lineIndex
          });
        } else {
          leftLines.push({
            number: leftLineNum++,
            content: line.content.substring(1),
            type: 'context',
            hunkIndex,
            lineIndex
          });
          rightLines.push({
            number: rightLineNum++,
            content: line.content.substring(1),
            type: 'context',
            hunkIndex,
            lineIndex
          });
        }
      });
    });

    const renderSideBySideLine = (line, index, isRight = false) => {
      const lineKey = `${line.hunkIndex}-${line.lineIndex}`;
      const isLineSelected = selectedLines.has(lineKey);
      const isChangedLine = line.type === 'added' || line.type === 'deleted';
      
      return (
        <div
          key={index}
          className={`diff-line diff-line-${line.type} ${isLineSelected ? 'line-selected' : ''}`}
          onClick={() => setSelectedHunk(lineKey)}
        >
          {/* Checkbox for line selection (only on deleted lines in left pane or added lines in right pane) */}
          {showStagingControls && !staged && isChangedLine && (
            <div className="line-checkbox" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isLineSelected}
                onChange={() => toggleLineSelection(line.hunkIndex, line.lineIndex)}
                title="Select line"
              />
            </div>
          )}
          
          {showLineNumbers && (
            <span className="line-number">
              {line.number || ''}
            </span>
          )}
          <div className="line-content">
            <SyntaxHighlighter
              language={getLanguageFromFilename(selectedFile)}
              style={theme === 'dark' ? tomorrow : prism}
              customStyle={{
                margin: 0,
                padding: '0 8px',
                background: 'transparent',
                fontSize: '13px',
                lineHeight: '20px',
                whiteSpace: wordWrap ? 'pre-wrap' : 'pre'
              }}
              PreTag="span"
              wrapLines={wordWrap}
            >
              {line.content || ' '}
            </SyntaxHighlighter>
          </div>
          
          {/* Line actions */}
          {showStagingControls && !staged && isChangedLine && (
            <div className="line-actions" onClick={(e) => e.stopPropagation()}>
              <Space size={2}>
                <Tooltip title="Stage">
                  <Button
                    size="small"
                    type="text"
                    icon={<PlusOutlined style={{ color: '#52c41a', fontSize: '10px' }} />}
                    onClick={() => handleStageLine(line.hunkIndex, line.lineIndex)}
                    disabled={operationInProgress}
                  />
                </Tooltip>
                <Tooltip title="Discard">
                  <Button
                    size="small"
                    type="text"
                    icon={<CloseOutlined style={{ color: '#ff4d4f', fontSize: '10px' }} />}
                    onClick={() => handleDiscardLine(line.hunkIndex, line.lineIndex)}
                    disabled={operationInProgress}
                  />
                </Tooltip>
              </Space>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="side-by-side-diff">
        <Row gutter={1}>
          <Col span={12} className="diff-pane left-pane">
            <div className="diff-pane-header">
              <Text strong>Original</Text>
              <Tag color="red">-{diff.deleted}</Tag>
            </div>
            <div className="diff-content">
              {leftLines.map((line, index) => renderSideBySideLine(line, index, false))}
            </div>
          </Col>
          
          <Col span={12} className="diff-pane right-pane">
            <div className="diff-pane-header">
              <Text strong>Modified</Text>
              <Tag color="green">+{diff.added}</Tag>
            </div>
            <div className="diff-content">
              {rightLines.map((line, index) => renderSideBySideLine(line, index, true))}
            </div>
          </Col>
        </Row>
      </div>
    );
  };

  const availableFiles = staged ? stagedFiles : [...(modifiedFiles || []), ...(stagedFiles || [])];

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

  if (compact) {
    return (
      <div className="enhanced-diff-viewer-compact">
        {selectedDiff ? (
          <div className="compact-diff">
            {renderUnifiedDiff(selectedDiff)}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Text type="secondary">Select a file to view diff</Text>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="enhanced-diff-viewer">
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <Title level={4} style={{ margin: 0 }}>Diff Viewer</Title>
            {selectedFile && (
              <Tag icon={getFileIcon(selectedFile)}>
                {selectedFile}
              </Tag>
            )}
            {selectedDiff && (
              <Badge 
                count={selectedDiff.hunks?.length || 0} 
                style={{ backgroundColor: '#52c41a' }}
                title="Number of hunks"
              />
            )}
          </Space>
        }
        extra={
          <Space>
            {showFileSelector && (
              <Select
                value={selectedFile}
                onChange={setSelectedFile}
                placeholder="Select file to compare"
                style={{ minWidth: '200px' }}
                loading={isLoading}
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {availableFiles.map(file => (
                  <Option key={file} value={file}>
                    <Space>
                      {getFileIcon(file)}
                      <Text>{file}</Text>
                    </Space>
                  </Option>
                ))}
              </Select>
            )}
            
            <Select
              value={viewMode}
              onChange={setViewMode}
              style={{ minWidth: '120px' }}
            >
              <Option value="side-by-side">Side by Side</Option>
              <Option value="unified">Unified</Option>
            </Select>

            <Tooltip title="Search in diff">
              <Button
                icon={<SearchOutlined />}
                onClick={() => setSearchTerm('')}
                size="small"
              />
            </Tooltip>

            <Tooltip title="View settings">
              <Button
                icon={<SettingOutlined />}
                onClick={() => setShowSettings(!showSettings)}
                type={showSettings ? 'primary' : 'default'}
                size="small"
              />
            </Tooltip>

            <Tooltip title="Toggle whitespace visibility">
              <Button
                icon={<EyeOutlined />}
                onClick={() => setShowWhitespace(!showWhitespace)}
                type={showWhitespace ? 'primary' : 'default'}
                size="small"
              />
            </Tooltip>

            <Tooltip title="Copy diff to clipboard">
              <Button
                icon={<CopyOutlined />}
                onClick={() => {
                  if (selectedDiff) {
                    const diffText = selectedDiff.hunks
                      .map(hunk => `${hunk.header}\n${hunk.lines.map(line => line.content).join('\n')}`)
                      .join('\n\n');
                    navigator.clipboard.writeText(diffText);
                  }
                }}
                size="small"
              />
            </Tooltip>

            {/* Edit mode toggle */}
            {selectedFile && !staged && (
              <Tooltip title={editMode ? "Exit edit mode" : "Edit file directly"}>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    if (editMode) {
                      if (hasUnsavedChanges) {
                        // Prompt to save
                        handleCancelEdit();
                      } else {
                        setEditMode(false);
                      }
                    } else {
                      loadFileForEditing();
                    }
                  }}
                  type={editMode ? 'primary' : 'default'}
                  size="small"
                />
              </Tooltip>
            )}
          </Space>
        }
      >
        {showSettings && (
          <div className="diff-settings">
            <Row gutter={16}>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>Context Lines</Text>
                  <Slider
                    min={0}
                    max={10}
                    value={contextLines}
                    onChange={setContextLines}
                    marks={{ 0: '0', 3: '3', 5: '5', 10: '10' }}
                  />
                </Space>
              </Col>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>Display Options</Text>
                  <Space direction="vertical">
                    <Switch
                      checked={wordWrap}
                      onChange={setWordWrap}
                      checkedChildren="Wrap"
                      unCheckedChildren="No Wrap"
                    />
                    <Switch
                      checked={showLineNumbers}
                      onChange={setShowLineNumbers}
                      checkedChildren="Line #"
                      unCheckedChildren="No Line #"
                    />
                    <Switch
                      checked={highlightChanges}
                      onChange={setHighlightChanges}
                      checkedChildren="Highlight"
                      unCheckedChildren="No Highlight"
                    />
                  </Space>
                </Space>
              </Col>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>Search</Text>
                  <Input
                    placeholder="Search in diff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    prefix={<SearchOutlined />}
                    allowClear
                  />
                </Space>
              </Col>
            </Row>
            <Divider />
          </div>
        )}

        <Spin spinning={isLoading}>
          {selectedDiff ? (
            <div className={`diff-container ${viewMode} ${theme}`}>
              {/* File-level actions */}
              {showStagingControls && (
                <div className="file-actions">
                  <Space>
                    {!staged ? (
                      <>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={handleStageFile}
                          loading={operationInProgress}
                        >
                          Stage File
                        </Button>
                        <Button
                          danger
                          icon={<UndoOutlined />}
                          onClick={handleDiscardFile}
                          loading={operationInProgress}
                        >
                          Discard All Changes
                        </Button>
                      </>
                    ) : (
                      <Button
                        icon={<MinusOutlined />}
                        onClick={handleUnstageFile}
                        loading={operationInProgress}
                      >
                        Unstage File
                      </Button>
                    )}
                  </Space>
                </div>
              )}
              
              {/* Selected lines action bar */}
              {selectedLines.size > 0 && (
                <div className="selected-lines-actions">
                  <Alert
                    type="info"
                    message={
                      <Space>
                        <Text strong>{selectedLines.size} line(s) selected</Text>
                        <Button
                          size="small"
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={handleStageSelectedLines}
                          loading={operationInProgress}
                        >
                          Stage Selected
                        </Button>
                        <Button
                          size="small"
                          danger
                          icon={<CloseOutlined />}
                          onClick={handleDiscardSelectedLines}
                          loading={operationInProgress}
                        >
                          Discard Selected
                        </Button>
                        <Button
                          size="small"
                          onClick={clearLineSelection}
                        >
                          Clear Selection
                        </Button>
                      </Space>
                    }
                  />
                </div>
              )}
              
              <div className="diff-stats">
                <Space>
                  <Tag color="green">+{selectedDiff.added} additions</Tag>
                  <Tag color="red">-{selectedDiff.deleted} deletions</Tag>
                  <Text type="secondary">
                    Language: {getLanguageFromFilename(selectedFile)}
                  </Text>
                  {searchTerm && (
                    <Tag color="blue">
                      {filteredHunks.length} of {selectedDiff.hunks.length} hunks match
                    </Tag>
                  )}
                  {editMode && (
                    <Tag color={hasUnsavedChanges ? 'orange' : 'blue'}>
                      {hasUnsavedChanges ? 'Unsaved changes' : 'Edit Mode'}
                    </Tag>
                  )}
                </Space>
              </div>
              
              {/* Edit mode panel */}
              {editMode ? (
                <div className="edit-mode-container">
                  <div className="edit-mode-toolbar">
                    <Space>
                      <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={handleSaveEdit}
                        loading={isSaving}
                        disabled={!hasUnsavedChanges}
                      >
                        Save Changes
                      </Button>
                      <Button
                        icon={<CloseOutlined />}
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                      >
                        {hasUnsavedChanges ? 'Discard & Exit' : 'Exit Edit Mode'}
                      </Button>
                      {hasUnsavedChanges && (
                        <Button
                          icon={<UndoOutlined />}
                          onClick={() => setEditedContent(originalFileContent)}
                        >
                          Reset Changes
                        </Button>
                      )}
                    </Space>
                  </div>
                  <div className="edit-mode-editor">
                    <Input.TextArea
                      ref={editorRef}
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        minHeight: '400px',
                        resize: 'vertical'
                      }}
                      autoSize={{ minRows: 20, maxRows: 40 }}
                    />
                  </div>
                </div>
              ) : (
                <div className="diff-content-wrapper">
                  {viewMode === 'side-by-side' 
                    ? renderSideBySideDiff(selectedDiff)
                    : renderUnifiedDiff(selectedDiff)
                  }
                </div>
              )}
            </div>
          ) : availableFiles.length === 0 ? (
            <Empty
              image={<FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />}
              description="No modified files to compare"
            />
          ) : (
            <Empty
              image={<FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />}
              description="Select a file to view differences"
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}

export default EnhancedDiffViewer;
