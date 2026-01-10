import React, { useState, useEffect } from 'react';
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
} from 'antd';
import { FileTextOutlined, CopyOutlined, EyeOutlined } from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  tomorrow,
  prism,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useGit } from '../../../contexts/GitContext';
import './DiffViewer.scss';

const { Title, Text } = Typography;
const { Option } = Select;

function DiffViewer({
  file = null,
  staged = false,
  compact = false,
  showFileSelector = true,
  theme = 'light',
}) {
  const {
    currentRepository,
    currentDiff,
    modifiedFiles,
    stagedFiles,
    getDiff,
    isLoading,
  } = useGit();

  const [selectedFile, setSelectedFile] = useState(file);

  useEffect(() => {
    console.log('DiffViewer file prop changed:', { file, selectedFile });
    if (file) {
      setSelectedFile(file);
    }
  }, [file]);
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side', 'unified', 'split'
  const [showWhitespace, setShowWhitespace] = useState(false);
  const [selectedDiff, setSelectedDiff] = useState(null);

  useEffect(() => {
    console.log('DiffViewer useEffect triggered:', {
      selectedFile,
      currentRepository,
      staged,
    });
    if (selectedFile && currentRepository) {
      loadDiff(selectedFile);
    }
  }, [selectedFile, staged, currentRepository]);

  useEffect(() => {
    if (currentDiff && currentDiff.length > 0) {
      const fileDiff = currentDiff.find((diff) => diff.name === selectedFile);
      setSelectedDiff(fileDiff);
    }
  }, [currentDiff, selectedFile]);

  const loadDiff = async (filename) => {
    console.log('DiffViewer loadDiff called with:', {
      filename,
      staged,
      currentRepository,
    });
    try {
      const result = await getDiff(filename, staged);
      console.log('DiffViewer getDiff result:', result);
    } catch (error) {
      console.error('Failed to load diff:', error);
    }
  };

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
      sass: 'sass',
      less: 'less',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
      zsh: 'bash',
      ps1: 'powershell',
      dockerfile: 'dockerfile',
    };

    return languageMap[extension] || 'text';
  };

  const getFileIcon = () => {
    return <FileTextOutlined style={{ color: '#1890ff' }} />;
  };

  const renderUnifiedDiff = (diff) => {
    if (!diff || !diff.hunks) return null;

    return (
      <div className="unified-diff">
        {diff.hunks.map((hunk, hunkIndex) => (
          <div key={hunkIndex} className="diff-hunk">
            <div className="hunk-header">
              <Text code>{hunk.header}</Text>
            </div>
            <div className="hunk-content">
              {hunk.lines.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  className={`diff-line diff-line-${line.type}`}
                >
                  <span className="line-prefix">
                    {line.type === 'added'
                      ? '+'
                      : line.type === 'deleted'
                        ? '-'
                        : ' '}
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
                    }}
                    PreTag="span"
                  >
                    {line.content.substring(1) || ' '}
                  </SyntaxHighlighter>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSideBySideDiff = (diff) => {
    if (!diff || !diff.hunks) return null;

    const leftLines = [];
    const rightLines = [];
    let leftLineNum = 1;
    let rightLineNum = 1;

    diff.hunks.forEach((hunk) => {
      // Parse hunk header to get line numbers
      const headerMatch = hunk.header.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (headerMatch) {
        leftLineNum = parseInt(headerMatch[1], 10);
        rightLineNum = parseInt(headerMatch[2], 10);
      }

      hunk.lines.forEach((line) => {
        if (line.type === 'deleted') {
          const currentLeft = leftLineNum;
          leftLineNum += 1;
          leftLines.push({
            number: currentLeft,
            content: line.content.substring(1),
            type: 'deleted',
          });
          rightLines.push({
            number: null,
            content: '',
            type: 'empty',
          });
        } else if (line.type === 'added') {
          leftLines.push({
            number: null,
            content: '',
            type: 'empty',
          });
          const currentRight = rightLineNum;
          rightLineNum += 1;
          rightLines.push({
            number: currentRight,
            content: line.content.substring(1),
            type: 'added',
          });
        } else {
          const currentLeft = leftLineNum;
          leftLineNum += 1;
          const currentRight = rightLineNum;
          rightLineNum += 1;
          leftLines.push({
            number: currentLeft,
            content: line.content.substring(1),
            type: 'context',
          });
          rightLines.push({
            number: currentRight,
            content: line.content.substring(1),
            type: 'context',
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
                  key={`left-${index}`}
                  className={`diff-line diff-line-${line.type}`}
                >
                  <span className="line-number">{line.number || ''}</span>
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
                      }}
                      PreTag="span"
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
                  key={`right-${index}`}
                  className={`diff-line diff-line-${line.type}`}
                >
                  <span className="line-number">{line.number || ''}</span>
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
                      }}
                      PreTag="span"
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

  const availableFiles = staged
    ? stagedFiles
    : [...new Set([...(modifiedFiles || []), ...(stagedFiles || [])])];

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

  if (compact) {
    return (
      <div className="diff-viewer-compact">
        {selectedDiff ? (
          <div className="compact-diff">{renderUnifiedDiff(selectedDiff)}</div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Text type="secondary">Select a file to view diff</Text>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="diff-viewer">
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <Title level={4} style={{ margin: 0 }}>
              Diff Viewer
            </Title>
            {selectedFile && (
              <Tag icon={getFileIcon(selectedFile)}>{selectedFile}</Tag>
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
              >
                {availableFiles.map((file) => (
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
                      .map(
                        (hunk) =>
                          `${hunk.header}\n${hunk.lines.map((line) => line.content).join('\n')}`,
                      )
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
                </Space>
              </div>

              <div className="diff-content-wrapper">
                {viewMode === 'side-by-side'
                  ? renderSideBySideDiff(selectedDiff)
                  : renderUnifiedDiff(selectedDiff)}
              </div>
            </div>
          ) : (
            <Empty
              image={
                <FileTextOutlined style={{ fontSize: '48px', color: '#ccc' }} />
              }
              description={
                availableFiles.length === 0
                  ? 'No modified files to compare'
                  : 'Select a file to view differences'
              }
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}

export default DiffViewer;
