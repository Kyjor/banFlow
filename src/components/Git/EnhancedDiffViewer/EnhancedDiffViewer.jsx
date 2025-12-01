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
  Modal,
  List,
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
  EditOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  HistoryOutlined
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
    discardLines,
    getFileHistory,
    getFileAtCommit,
    getCommitDiff
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
  const [viewFullFile, setViewFullFile] = useState(false);
  const [fullFileContent, setFullFileContent] = useState('');
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [allFiles, setAllFiles] = useState([]);
  const [fileSearchTerm, setFileSearchTerm] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [inlineEditMode, setInlineEditMode] = useState(false);
  const [inlineEdits, setInlineEdits] = useState({}); // { lineKey: newContent }
  const [editingLineKey, setEditingLineKey] = useState(null);
  const [fileHistory, setFileHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryCommit, setSelectedHistoryCommit] = useState(null);
  const [historicalContent, setHistoricalContent] = useState(null);
  const editorRef = useRef(null);
  const fileSearchInputRef = useRef(null);
  const inlineEditInputRef = useRef(null);

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

  // Load full file content when viewFullFile mode is enabled
  useEffect(() => {
    const loadFullFile = async () => {
      if (viewFullFile && selectedFile && currentRepository) {
        try {
          const result = await ipcRenderer.invoke('git:readFile', currentRepository, selectedFile);
          if (result.success) {
            setFullFileContent(result.content);
          }
        } catch (error) {
          console.error('Failed to load full file:', error);
          message.error('Failed to load file content');
        }
      }
    };
    loadFullFile();
  }, [viewFullFile, selectedFile, currentRepository]);

  // Keyboard shortcut for Ctrl+P file picker
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (currentRepository && !readOnly) {
          openFilePicker();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRepository, readOnly]);

  // Focus search input when file picker opens
  useEffect(() => {
    if (showFilePicker && fileSearchInputRef.current) {
      setTimeout(() => fileSearchInputRef.current?.focus(), 100);
    }
  }, [showFilePicker]);

  // Load file history when file changes
  useEffect(() => {
    const loadHistory = async () => {
      if (selectedFile && currentRepository && !readOnly) {
        setLoadingHistory(true);
        try {
          const history = await getFileHistory(selectedFile);
          setFileHistory(history || []);
        } catch (error) {
          console.error('Failed to load file history:', error);
          setFileHistory([]);
        } finally {
          setLoadingHistory(false);
        }
      } else {
        setFileHistory([]);
      }
    };
    loadHistory();
    // Reset historical view when file changes
    setSelectedHistoryCommit(null);
    setHistoricalContent(null);
  }, [selectedFile, currentRepository, readOnly, getFileHistory]);

  // Load file content at selected historical commit
  const handleHistorySelect = useCallback(async (commitHash) => {
    if (!commitHash) {
      // "Current" selected - go back to normal diff view
      setSelectedHistoryCommit(null);
      setHistoricalContent(null);
      return;
    }
    
    setSelectedHistoryCommit(commitHash);
    try {
      const content = await getFileAtCommit(selectedFile, commitHash);
      setHistoricalContent(content);
    } catch (error) {
      console.error('Failed to load file at commit:', error);
      message.error('Failed to load historical version');
      setHistoricalContent(null);
    }
  }, [selectedFile, getFileAtCommit]);

  const formatHistoryDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openFilePicker = async () => {
    if (!currentRepository) return;
    setShowFilePicker(true);
    setFileSearchTerm('');
    setLoadingFiles(true);
    try {
      const files = await ipcRenderer.invoke('git:listFiles', currentRepository);
      setAllFiles(files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
      message.error('Failed to load file list');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFilePickerSelect = async (filePath) => {
    setShowFilePicker(false);
    setSelectedFile(filePath);
    // Load file for editing
    try {
      const result = await ipcRenderer.invoke('git:readFile', currentRepository, filePath);
      if (result.success) {
        setEditedContent(result.content);
        setOriginalFileContent(result.content);
        setEditMode(true);
        setViewFullFile(false);
      }
    } catch (error) {
      console.error('Failed to load file:', error);
      message.error('Failed to load file');
    }
  };

  const filteredPickerFiles = useMemo(() => {
    if (!fileSearchTerm) return allFiles.slice(0, 50); // Show first 50 by default
    const term = fileSearchTerm.toLowerCase();
    return allFiles.filter(f => f.toLowerCase().includes(term)).slice(0, 50);
  }, [allFiles, fileSearchTerm]);

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

  // Inline editing functions
  const hasInlineEdits = Object.keys(inlineEdits).length > 0;

  const handleInlineEditStart = useCallback((lineKey, currentContent) => {
    if (readOnly || staged) return;
    setEditingLineKey(lineKey);
    if (!inlineEdits[lineKey]) {
      setInlineEdits(prev => ({ ...prev, [lineKey]: currentContent }));
    }
    setTimeout(() => inlineEditInputRef.current?.focus(), 50);
  }, [readOnly, staged, inlineEdits]);

  const handleInlineEditChange = useCallback((lineKey, newContent) => {
    setInlineEdits(prev => ({ ...prev, [lineKey]: newContent }));
  }, []);

  const handleInlineEditBlur = useCallback(() => {
    setEditingLineKey(null);
  }, []);

  const handleSaveInlineEdits = useCallback(async () => {
    if (!selectedFile || !currentRepository || !hasInlineEdits) return;
    setIsSaving(true);
    try {
      // Load the current file content
      const result = await ipcRenderer.invoke('git:readFile', currentRepository, selectedFile);
      if (!result.success) throw new Error('Failed to read file');
      
      let lines = result.content.split('\n');
      
      // Apply edits - we need to map line keys back to actual line numbers
      // For simplicity, we'll rebuild the file based on the modified content
      // The rightLines (modified side) represent the new file state
      
      // Get the current file content and apply inline edits
      const fileContent = result.content;
      const fileLines = fileContent.split('\n');
      
      // For each inline edit, we need to find which line number it corresponds to
      // This is complex because the diff shows line numbers, not array indices
      // We'll use a simpler approach: rebuild from the modified pane
      
      // Actually, the easiest approach is to load the file, parse the hunks,
      // and apply the edits based on the new line numbers
      Object.entries(inlineEdits).forEach(([lineKey, newContent]) => {
        const [hunkIdx, lineIdx] = lineKey.split('-').map(Number);
        const hunk = selectedDiff?.hunks?.[hunkIdx];
        if (!hunk) return;
        
        // Find the line in the hunk
        const line = hunk.lines[lineIdx];
        if (!line) return;
        
        // Calculate the actual line number in the new file
        const headerMatch = hunk.header.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);
        if (!headerMatch) return;
        
        let newLineNum = parseInt(headerMatch[1]);
        for (let i = 0; i < lineIdx; i++) {
          const prevLine = hunk.lines[i];
          if (prevLine.type === 'added' || prevLine.type === 'context') {
            newLineNum++;
          }
        }
        
        // Only apply if this is an added or context line (modifiable)
        if (line.type === 'added' || line.type === 'context') {
          const arrayIdx = newLineNum - 1;
          if (arrayIdx >= 0 && arrayIdx < fileLines.length) {
            fileLines[arrayIdx] = newContent;
          }
        }
      });
      
      const newContent = fileLines.join('\n');
      const writeResult = await ipcRenderer.invoke('git:writeFile', currentRepository, selectedFile, newContent);
      if (writeResult.success) {
        message.success('Changes saved');
        setInlineEdits({});
        setEditingLineKey(null);
        setInlineEditMode(false);
        loadDiff(selectedFile);
      }
    } catch (error) {
      console.error('Failed to save inline edits:', error);
      message.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [selectedFile, currentRepository, hasInlineEdits, inlineEdits, selectedDiff, loadDiff]);

  const handleDiscardInlineEdits = useCallback(() => {
    setInlineEdits({});
    setEditingLineKey(null);
    setInlineEditMode(false);
  }, []);

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
    const isEditable = inlineEditMode && (line.type === 'added' || line.type === 'context');
    const isEditing = editingLineKey === lineKey;
    const lineContent = line.content.substring(1);
    const editedValue = inlineEdits[lineKey] ?? lineContent;
    
    return (
      <div 
        key={lineIndex}
        className={`diff-line diff-line-${line.type} ${isSelected ? 'selected' : ''} ${isLineSelected ? 'line-selected' : ''} ${isEditable ? 'editable' : ''} ${isEditing ? 'editing' : ''}`}
        onClick={() => {
          if (isEditable && !isEditing) {
            handleInlineEditStart(lineKey, lineContent);
          } else {
            setSelectedHunk(lineKey);
          }
        }}
      >
        {/* Checkbox for line selection */}
        {showStagingControls && !staged && isChangedLine && !inlineEditMode && (
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
          {isEditing ? (
            <input
              ref={inlineEditInputRef}
              type="text"
              value={editedValue}
              onChange={(e) => handleInlineEditChange(lineKey, e.target.value)}
              onBlur={handleInlineEditBlur}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleInlineEditBlur();
                if (e.key === 'Enter') handleInlineEditBlur();
              }}
              style={{
                flex: 1,
                border: 'none',
                background: 'rgba(24, 144, 255, 0.1)',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: '20px',
                padding: '0 8px',
                outline: '2px solid #1890ff'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <SyntaxHighlighter
              language={getLanguageFromFilename(selectedFile)}
              style={theme === 'dark' ? tomorrow : prism}
              customStyle={{
                margin: 0,
                padding: '0 8px',
                background: inlineEdits[lineKey] !== undefined ? 'rgba(250, 173, 20, 0.15)' : 'transparent',
                fontSize: '13px',
                lineHeight: '20px',
                whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                cursor: isEditable ? 'text' : 'default'
              }}
              PreTag="span"
              wrapLines={wordWrap}
            >
              {(inlineEdits[lineKey] ?? lineContent) || ' '}
            </SyntaxHighlighter>
          )}
        </div>
        
        {/* Line-level staging controls */}
        {showStagingControls && !staged && isChangedLine && !inlineEditMode && (
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
      const isEditable = isRight && inlineEditMode && (line.type === 'added' || line.type === 'context');
      const isEditing = editingLineKey === lineKey;
      const editedValue = inlineEdits[lineKey] ?? line.content;
      
      return (
        <div
          key={index}
          className={`diff-line diff-line-${line.type} ${isLineSelected ? 'line-selected' : ''} ${isEditable ? 'editable' : ''} ${isEditing ? 'editing' : ''}`}
          onClick={() => {
            if (isEditable && !isEditing) {
              handleInlineEditStart(lineKey, line.content);
            } else {
              setSelectedHunk(lineKey);
            }
          }}
        >
          {/* Checkbox for line selection (only on deleted lines in left pane or added lines in right pane) */}
          {showStagingControls && !staged && isChangedLine && !inlineEditMode && (
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
            {isEditing ? (
              <input
                ref={inlineEditInputRef}
                type="text"
                value={editedValue}
                onChange={(e) => handleInlineEditChange(lineKey, e.target.value)}
                onBlur={handleInlineEditBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    handleInlineEditBlur();
                  }
                  if (e.key === 'Enter') {
                    handleInlineEditBlur();
                  }
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'rgba(24, 144, 255, 0.1)',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: '20px',
                  padding: '0 8px',
                  outline: '2px solid #1890ff'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <SyntaxHighlighter
                language={getLanguageFromFilename(selectedFile)}
                style={theme === 'dark' ? tomorrow : prism}
                customStyle={{
                  margin: 0,
                  padding: '0 8px',
                  background: inlineEdits[lineKey] !== undefined ? 'rgba(250, 173, 20, 0.15)' : 'transparent',
                  fontSize: '13px',
                  lineHeight: '20px',
                  whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                  cursor: isEditable ? 'text' : 'default'
                }}
                PreTag="span"
                wrapLines={wordWrap}
              >
                {(inlineEdits[lineKey] ?? line.content) || ' '}
              </SyntaxHighlighter>
            )}
          </div>
          
          {/* Line actions */}
          {showStagingControls && !staged && isChangedLine && !inlineEditMode && (
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
            {selectedFile && fileHistory.length > 0 && !readOnly && (
              <Select
                size="small"
                style={{ minWidth: 200 }}
                placeholder="History"
                value={selectedHistoryCommit}
                onChange={handleHistorySelect}
                loading={loadingHistory}
                allowClear
                dropdownMatchSelectWidth={false}
              >
                <Option value={null}>
                  <Space>
                    <HistoryOutlined />
                    <Text>Current (Working)</Text>
                  </Space>
                </Option>
                {fileHistory.map((commit) => (
                  <Option key={commit.hash} value={commit.hash}>
                    <Space direction="vertical" size={0} style={{ lineHeight: 1.2 }}>
                      <Text ellipsis style={{ maxWidth: 300 }}>{commit.message}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {commit.hash.substring(0, 7)} • {formatHistoryDate(commit.date)}
                      </Text>
                    </Space>
                  </Option>
                ))}
              </Select>
            )}
            {selectedHistoryCommit && (
              <Tag color="purple">Viewing {selectedHistoryCommit.substring(0, 7)}</Tag>
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

            {/* View Full File toggle */}
            {selectedFile && !editMode && !inlineEditMode && (
              <Tooltip title={viewFullFile ? "Show diff view" : "View full file"}>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => setViewFullFile(!viewFullFile)}
                  type={viewFullFile ? 'primary' : 'default'}
                  size="small"
                />
              </Tooltip>
            )}

            {/* Inline Edit toggle */}
            {selectedFile && !staged && !readOnly && !editMode && !viewFullFile && selectedDiff && (
              <Tooltip title={inlineEditMode ? "Exit inline edit" : "Edit in diff view"}>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    if (inlineEditMode && hasInlineEdits) {
                      handleDiscardInlineEdits();
                    } else {
                      setInlineEditMode(!inlineEditMode);
                    }
                  }}
                  type={inlineEditMode ? 'primary' : 'default'}
                  size="small"
                />
              </Tooltip>
            )}

            {/* Full file Edit mode toggle */}
            {selectedFile && !staged && !readOnly && !inlineEditMode && (
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

            {/* Quick Open File (Ctrl+P) */}
            {!readOnly && (
              <Tooltip title="Quick open file (Ctrl+P)">
                <Button
                  icon={<FileSearchOutlined />}
                  onClick={openFilePicker}
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
                  {inlineEditMode && (
                    <Tag color={hasInlineEdits ? 'orange' : 'cyan'}>
                      {hasInlineEdits ? `${Object.keys(inlineEdits).length} edits` : 'Inline Edit Mode'}
                    </Tag>
                  )}
                </Space>
              </div>

              {/* Inline edit action bar */}
              {inlineEditMode && (
                <div className="inline-edit-actions">
                  <Alert
                    type="info"
                    showIcon
                    message={
                      <Space>
                        <Text>
                          {viewMode === 'side-by-side' 
                            ? 'Click on lines in the Modified pane to edit' 
                            : 'Click on added or context lines to edit'}
                        </Text>
                        {hasInlineEdits && (
                          <>
                            <Button
                              size="small"
                              type="primary"
                              icon={<CheckOutlined />}
                              onClick={handleSaveInlineEdits}
                              loading={isSaving}
                            >
                              Save Changes
                            </Button>
                            <Button
                              size="small"
                              icon={<CloseOutlined />}
                              onClick={handleDiscardInlineEdits}
                            >
                              Discard
                            </Button>
                          </>
                        )}
                        {!hasInlineEdits && (
                          <Button
                            size="small"
                            onClick={() => setInlineEditMode(false)}
                          >
                            Exit Edit Mode
                          </Button>
                        )}
                      </Space>
                    }
                  />
                </div>
              )}
              
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
              ) : selectedHistoryCommit && historicalContent !== null ? (
                <div className="full-file-container">
                  <div className="full-file-header">
                    <Space>
                      <Tag color="purple">Historical Version</Tag>
                      <Tag>{selectedHistoryCommit.substring(0, 7)}</Tag>
                      <Text type="secondary">{historicalContent.split('\n').length} lines</Text>
                      <Button 
                        size="small" 
                        onClick={() => { setSelectedHistoryCommit(null); setHistoricalContent(null); }}
                      >
                        Back to Current
                      </Button>
                    </Space>
                  </div>
                  <div className="full-file-content">
                    <SyntaxHighlighter
                      language={getLanguageFromFilename(selectedFile)}
                      style={theme === 'dark' ? tomorrow : prism}
                      showLineNumbers={showLineNumbers}
                      wrapLines={wordWrap}
                      customStyle={{
                        margin: 0,
                        borderRadius: '4px',
                        fontSize: '13px',
                        maxHeight: '600px',
                        overflow: 'auto'
                      }}
                    >
                      {historicalContent}
                    </SyntaxHighlighter>
                  </div>
                </div>
              ) : viewFullFile ? (
                <div className="full-file-container">
                  <div className="full-file-header">
                    <Space>
                      <Tag color="blue">Full File View</Tag>
                      <Text type="secondary">{fullFileContent.split('\n').length} lines</Text>
                    </Space>
                  </div>
                  <div className="full-file-content">
                    <SyntaxHighlighter
                      language={getLanguageFromFilename(selectedFile)}
                      style={theme === 'dark' ? tomorrow : prism}
                      showLineNumbers={showLineNumbers}
                      wrapLines={wordWrap}
                      customStyle={{
                        margin: 0,
                        borderRadius: '4px',
                        fontSize: '13px',
                        maxHeight: '600px',
                        overflow: 'auto'
                      }}
                    >
                      {fullFileContent || '// Loading...'}
                    </SyntaxHighlighter>
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

      {/* Quick Open File Modal (Ctrl+P) */}
      <Modal
        title={
          <Space>
            <FileSearchOutlined />
            <span>Quick Open File</span>
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
                  <Text ellipsis style={{ maxWidth: 500 }}>{filePath}</Text>
                </Space>
              </List.Item>
            )}
            locale={{ emptyText: fileSearchTerm ? 'No files match your search' : 'No files found' }}
          />
          {allFiles.length > 50 && (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
              Showing {Math.min(50, filteredPickerFiles.length)} of {fileSearchTerm ? filteredPickerFiles.length : allFiles.length} files
            </Text>
          )}
        </Spin>
      </Modal>
    </div>
  );
}

export default EnhancedDiffViewer;
