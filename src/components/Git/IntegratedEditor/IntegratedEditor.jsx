import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Input,
  Select,
  Modal,
  message,
  Divider,
  Badge,
  Popconfirm,
  Alert
} from 'antd';
import {
  SaveOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
  ReloadOutlined,
  UndoOutlined,
  RedoOutlined,
  PlusOutlined,
  MinusOutlined,
  CheckOutlined,
  CloseOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  BranchesOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { useGit } from '../../../contexts/GitContext';
import './IntegratedEditor.scss';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

function IntegratedEditor({ 
  file = null,
  onFileChange = null,
  showStagingControls = true,
  autoSave = true,
  theme = 'light'
}) {
  const {
    currentRepository,
    currentDiff,
    stagedFiles,
    modifiedFiles,
    getDiff,
    stageFiles,
    unstageFiles,
    isLoading,
    operationInProgress
  } = useGit();

  const [selectedFile, setSelectedFile] = useState(file);
  const [fileContent, setFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    showLineNumbers: true,
    showWhitespace: false,
    autoIndent: true,
    bracketMatching: true
  });
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isFileStaged, setIsFileStaged] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [diffMode, setDiffMode] = useState('inline'); // 'inline', 'side-by-side'
  
  const editorRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);

  useEffect(() => {
    if (selectedFile && currentRepository) {
      loadFileContent(selectedFile);
      checkFileStagingStatus(selectedFile);
    }
  }, [selectedFile, currentRepository]);

  useEffect(() => {
    if (autoSave && hasUnsavedChanges) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveFile();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, autoSave]);

  const loadFileContent = async (filename) => {
    try {
      // In a real implementation, this would load the actual file content
      // For now, we'll simulate file content
      const mockContent = `// Example file content
function exampleFunction() {
  console.log("Hello, World!");
  return true;
}

const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3
};

export default config;`;
      
      setFileContent(mockContent);
      setOriginalContent(mockContent);
      setHasUnsavedChanges(false);
      setUndoStack([mockContent]);
      setRedoStack([]);
    } catch (error) {
      console.error('Failed to load file content:', error);
      message.error('Failed to load file content');
    }
  };

  const checkFileStagingStatus = (filename) => {
    const isStaged = stagedFiles.includes(filename);
    setIsFileStaged(isStaged);
  };

  const handleContentChange = useCallback((newContent) => {
    setFileContent(newContent);
    setHasUnsavedChanges(newContent !== originalContent);
    
    // Add to undo stack
    setUndoStack(prev => [...prev, newContent]);
    setRedoStack([]);
    
    if (onFileChange) {
      onFileChange(newContent, newContent !== originalContent);
    }
  }, [originalContent, onFileChange]);

  const saveFile = useCallback(async () => {
    try {
      // In a real implementation, this would save the file to disk
      setOriginalContent(fileContent);
      setHasUnsavedChanges(false);
      message.success('File saved successfully');
      
      if (onFileChange) {
        onFileChange(fileContent, false);
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      message.error('Failed to save file');
    }
  }, [fileContent, onFileChange]);

  const undo = useCallback(() => {
    if (undoStack.length > 1) {
      const previousContent = undoStack[undoStack.length - 2];
      setRedoStack(prev => [...prev, fileContent]);
      setUndoStack(prev => prev.slice(0, -1));
      setFileContent(previousContent);
      setHasUnsavedChanges(previousContent !== originalContent);
    }
  }, [undoStack, fileContent, originalContent]);

  const redo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextContent = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, nextContent]);
      setRedoStack(prev => prev.slice(0, -1));
      setFileContent(nextContent);
      setHasUnsavedChanges(nextContent !== originalContent);
    }
  }, [redoStack, originalContent]);

  const findAndReplace = useCallback(() => {
    if (!searchTerm) return;
    
    const newContent = fileContent.replace(
      new RegExp(searchTerm, 'g'),
      replaceTerm
    );
    
    if (newContent !== fileContent) {
      handleContentChange(newContent);
      message.success(`Replaced ${(fileContent.match(new RegExp(searchTerm, 'g')) || []).length} occurrences`);
    } else {
      message.warning('No matches found');
    }
  }, [fileContent, searchTerm, replaceTerm, handleContentChange]);

  const goToLine = useCallback((lineNumber) => {
    // In a real implementation, this would scroll to the specified line
    setCursorPosition({ line: lineNumber, column: 1 });
    message.info(`Jumped to line ${lineNumber}`);
  }, []);

  const stageFile = useCallback(async () => {
    try {
      await stageFiles([selectedFile]);
      setIsFileStaged(true);
      message.success('File staged successfully');
    } catch (error) {
      console.error('Failed to stage file:', error);
      message.error('Failed to stage file');
    }
  }, [selectedFile, stageFiles]);

  const unstageFile = useCallback(async () => {
    try {
      await unstageFiles([selectedFile]);
      setIsFileStaged(false);
      message.success('File unstaged successfully');
    } catch (error) {
      console.error('Failed to unstage file:', error);
      message.error('Failed to unstage file');
    }
  }, [selectedFile, unstageFiles]);

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

  const renderEditor = () => {
    return (
      <div className="code-editor">
        <div className="editor-toolbar">
          <Space>
            <Button
              icon={<UndoOutlined />}
              onClick={undo}
              disabled={undoStack.length <= 1}
              size="small"
            >
              Undo
            </Button>
            <Button
              icon={<RedoOutlined />}
              onClick={redo}
              disabled={redoStack.length === 0}
              size="small"
            >
              Redo
            </Button>
            <Divider type="vertical" />
            <Button
              icon={<SearchOutlined />}
              onClick={() => setShowSearchReplace(!showSearchReplace)}
              size="small"
            >
              Find & Replace
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setShowSettings(!showSettings)}
              size="small"
            >
              Settings
            </Button>
            <Divider type="vertical" />
            <Button
              icon={<SaveOutlined />}
              onClick={saveFile}
              disabled={!hasUnsavedChanges}
              type="primary"
              size="small"
            >
              Save
            </Button>
          </Space>
        </div>
        
        {showSearchReplace && (
          <div className="search-replace-bar">
            <Space>
              <Input
                placeholder="Find..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 200 }}
              />
              <Input
                placeholder="Replace with..."
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                style={{ width: 200 }}
              />
              <Button
                type="primary"
                onClick={findAndReplace}
                disabled={!searchTerm}
              >
                Replace All
              </Button>
              <Button
                onClick={() => setShowSearchReplace(false)}
              >
                Close
              </Button>
            </Space>
          </div>
        )}
        
        {showSettings && (
          <div className="editor-settings">
            <Row gutter={16}>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>Font Size</Text>
                  <Input
                    type="number"
                    value={editorSettings.fontSize}
                    onChange={(e) => setEditorSettings(prev => ({
                      ...prev,
                      fontSize: parseInt(e.target.value) || 14
                    }))}
                    min={10}
                    max={24}
                  />
                </Space>
              </Col>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>Tab Size</Text>
                  <Input
                    type="number"
                    value={editorSettings.tabSize}
                    onChange={(e) => setEditorSettings(prev => ({
                      ...prev,
                      tabSize: parseInt(e.target.value) || 2
                    }))}
                    min={1}
                    max={8}
                  />
                </Space>
              </Col>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>Options</Text>
                  <Space direction="vertical">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.wordWrap}
                        onChange={(e) => setEditorSettings(prev => ({
                          ...prev,
                          wordWrap: e.target.checked
                        }))}
                      />
                      Word Wrap
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.showLineNumbers}
                        onChange={(e) => setEditorSettings(prev => ({
                          ...prev,
                          showLineNumbers: e.target.checked
                        }))}
                      />
                      Line Numbers
                    </label>
                  </Space>
                </Space>
              </Col>
            </Row>
          </div>
        )}
        
        <div className="editor-content">
          <TextArea
            ref={editorRef}
            value={fileContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start typing..."
            style={{
              fontFamily: 'SF Mono, Monaco, Inconsolata, Roboto Mono, Courier New, monospace',
              fontSize: `${editorSettings.fontSize}px`,
              lineHeight: '1.5',
              minHeight: '400px',
              resize: 'vertical'
            }}
            spellCheck={false}
          />
        </div>
        
        <div className="editor-status">
          <Space>
            <Text type="secondary">
              Line {cursorPosition.line}, Column {cursorPosition.column}
            </Text>
            <Text type="secondary">
              {fileContent.length} characters
            </Text>
            <Text type="secondary">
              {fileContent.split('\n').length} lines
            </Text>
            {hasUnsavedChanges && (
              <Tag color="orange">Unsaved changes</Tag>
            )}
          </Space>
        </div>
      </div>
    );
  };

  const renderStagingControls = () => {
    if (!showStagingControls) return null;
    
    return (
      <div className="staging-controls">
        <Space>
          <Text strong>Staging:</Text>
          {isFileStaged ? (
            <Button
              icon={<MinusOutlined />}
              onClick={unstageFile}
              loading={operationInProgress}
            >
              Unstage File
            </Button>
          ) : (
            <Button
              icon={<PlusOutlined />}
              onClick={stageFile}
              loading={operationInProgress}
              type="primary"
            >
              Stage File
            </Button>
          )}
          <Tag color={isFileStaged ? 'success' : 'warning'}>
            {isFileStaged ? 'Staged' : 'Unstaged'}
          </Tag>
        </Space>
      </div>
    );
  };

  const renderDiffView = () => {
    if (!showDiff) return null;
    
    return (
      <div className="diff-view">
        <div className="diff-header">
          <Space>
            <Text strong>Changes Preview</Text>
            <Select
              value={diffMode}
              onChange={setDiffMode}
              style={{ width: 120 }}
            >
              <Option value="inline">Inline</Option>
              <Option value="side-by-side">Side by Side</Option>
            </Select>
          </Space>
        </div>
        
        <div className="diff-content">
          {/* In a real implementation, this would show the actual diff */}
          <Alert
            message="Diff Preview"
            description="This would show the differences between the original and modified file content."
            type="info"
            showIcon
          />
        </div>
      </div>
    );
  };

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
          description="Select a file to edit"
        />
      </Card>
    );
  }

  return (
    <div className="integrated-editor">
      <Card
        title={
          <Space>
            <EditOutlined />
            <Title level={4} style={{ margin: 0 }}>Integrated Editor</Title>
            {selectedFile && (
              <Tag>{selectedFile}</Tag>
            )}
            {hasUnsavedChanges && (
              <Tag color="orange">Unsaved</Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Show diff">
              <Button
                icon={<EyeOutlined />}
                onClick={() => setShowDiff(!showDiff)}
                type={showDiff ? 'primary' : 'default'}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Reload file">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadFileContent(selectedFile)}
                size="small"
              />
            </Tooltip>
          </Space>
        }
      >
        <Spin spinning={isLoading}>
          <div className="editor-container">
            {renderStagingControls()}
            
            <Divider />
            
            {renderEditor()}
            
            {renderDiffView()}
          </div>
        </Spin>
      </Card>
    </div>
  );
}

export default IntegratedEditor;
