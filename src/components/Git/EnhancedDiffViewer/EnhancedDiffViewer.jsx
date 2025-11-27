import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Input
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
  CaretDownOutlined
} from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useGit } from '../../../contexts/GitContext';
import './EnhancedDiffViewer.scss';

const { Title, Text } = Typography;
const { Option } = Select;

function EnhancedDiffViewer({ 
  file = null, 
  staged = false, 
  compact = false,
  showFileSelector = true,
  theme = 'light',
  onStageHunk = null,
  onUnstageHunk = null,
  showStagingControls = false
}) {
  const {
    currentRepository,
    currentDiff,
    modifiedFiles,
    stagedFiles,
    getDiff,
    isLoading
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

  // Sync selectedFile with file prop when it changes
  useEffect(() => {
    if (file && file !== selectedFile) {
      setSelectedFile(file);
      setSelectedDiff(null); // Clear previous diff while loading new one
    }
  }, [file]);

  useEffect(() => {
    if (selectedFile && currentRepository) {
      loadDiff(selectedFile);
    }
  }, [selectedFile, staged, currentRepository]);

  useEffect(() => {
    if (currentDiff && currentDiff.length > 0 && selectedFile) {
      const fileDiff = currentDiff.find(diff => diff.name === selectedFile);
      setSelectedDiff(fileDiff || null);
    } else if (!currentDiff || currentDiff.length === 0) {
      setSelectedDiff(null);
    }
  }, [currentDiff, selectedFile]);

  const loadDiff = async (filename) => {
    try {
      await getDiff(filename, staged);
    } catch (error) {
      console.error('Failed to load diff:', error);
    }
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
      <div 
        className="hunk-header"
        onClick={() => toggleHunkExpansion(hunkIndex)}
        style={{ cursor: 'pointer' }}
      >
        <Space>
          {isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
          <Text code style={{ fontSize: '12px' }}>{hunk.header}</Text>
          {addedLines > 0 && <Tag color="green" size="small">+{addedLines}</Tag>}
          {deletedLines > 0 && <Tag color="red" size="small">-{deletedLines}</Tag>}
        </Space>
      </div>
    );
  };

  const renderLineWithStaging = (line, lineIndex, hunkIndex, oldLineNum = null, newLineNum = null) => {
    const isSelected = selectedHunk === `${hunkIndex}-${lineIndex}`;
    
    return (
      <div 
        key={lineIndex}
        className={`diff-line diff-line-${line.type} ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedHunk(`${hunkIndex}-${lineIndex}`)}
      >
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
        {showStagingControls && (line.type === 'added' || line.type === 'deleted') && (
          <div className="staging-controls">
            <Tooltip title={line.type === 'added' ? 'Stage this line' : 'Unstage this line'}>
              <Button
                size="small"
                type={line.type === 'added' ? 'primary' : 'default'}
                icon={line.type === 'added' ? <PlusOutlined /> : <MinusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (line.type === 'added' && onStageHunk) {
                    onStageHunk(hunkIndex, lineIndex);
                  } else if (line.type === 'deleted' && onUnstageHunk) {
                    onUnstageHunk(hunkIndex, lineIndex);
                  }
                }}
              />
            </Tooltip>
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

    return (
      <div className="side-by-side-diff">
        <Row gutter={1}>
          <Col span={12} className="diff-pane left-pane">
            <div className="diff-pane-header">
              <Text strong>Original</Text>
              <Tag color="red">-{diff.deleted}</Tag>
            </div>
            <div className="diff-content">
              {leftLines.map((line, index) => (
                <div
                  key={index}
                  className={`diff-line diff-line-${line.type}`}
                  onClick={() => setSelectedHunk(`${line.hunkIndex}-${line.lineIndex}`)}
                >
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
                </div>
              ))}
            </div>
          </Col>
          
          <Col span={12} className="diff-pane right-pane">
            <div className="diff-pane-header">
              <Text strong>Modified</Text>
              <Tag color="green">+{diff.added}</Tag>
            </div>
            <div className="diff-content">
              {rightLines.map((line, index) => (
                <div
                  key={index}
                  className={`diff-line diff-line-${line.type}`}
                  onClick={() => setSelectedHunk(`${line.hunkIndex}-${line.lineIndex}`)}
                >
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
                </div>
              ))}
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
            <Title level={4} style={{ margin: 0 }}>Enhanced Diff Viewer</Title>
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
                </Space>
              </div>
              
              <div className="diff-content-wrapper">
                {viewMode === 'side-by-side' 
                  ? renderSideBySideDiff(selectedDiff)
                  : renderUnifiedDiff(selectedDiff)
                }
              </div>
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
