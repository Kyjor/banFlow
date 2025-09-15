import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Space, Typography, Switch, Tooltip, Modal } from 'antd';
import { 
  RocketOutlined, 
  CodeOutlined, 
  BookOutlined, 
  QuestionCircleOutlined,
  KeyboardOutlined,
  BugOutlined
} from '@ant-design/icons';
import Layout from '../../layouts/App';
import RepositoryManager from '../../components/Git/RepositoryManager/RepositoryManager';
import GitOperations from '../../components/Git/GitOperations/GitOperations';
import DiffViewer from '../../components/Git/DiffViewer/DiffViewer';
import { useGit } from '../../contexts/GitContext';

// Enhanced components - adding back one by one
import GitClient from '../../components/Git/GitClient/GitClient';
// import AccessibilityProvider from '../../components/Git/Accessibility/AccessibilityProvider';
// import ErrorBoundary from '../../components/Git/ErrorHandling/ErrorBoundary';
// import KeyboardShortcuts from '../../components/Git/Accessibility/KeyboardShortcuts';
// import UserGuidance from '../../components/Git/ErrorHandling/UserGuidance';

import './GitPage.scss';

const { Title, Text } = Typography;

function GitPage() {
  const { currentRepository, loadProjectRepositories } = useGit();
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Enhanced interface state
  const [useEnhancedInterface, setUseEnhancedInterface] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showUserGuidance, setShowUserGuidance] = useState(false);
  const [userLevel, setUserLevel] = useState('beginner');

  // Load project repositories on page load
  useEffect(() => {
    const loadRepositories = async () => {
      try {
        await loadProjectRepositories();
      } catch (error) {
        console.error('Failed to load project repositories:', error);
      }
    };

    loadRepositories();
  }, [loadProjectRepositories]);

  // Check for saved interface preference
  useEffect(() => {
    const savedPreference = localStorage.getItem('gitUseEnhancedInterface');
    if (savedPreference !== null) {
      setUseEnhancedInterface(JSON.parse(savedPreference));
    } else {
      // Default to enhanced interface
      setUseEnhancedInterface(true);
    }
  }, []);

  // Save interface preference
  const handleInterfaceToggle = (checked) => {
    setUseEnhancedInterface(checked);
    localStorage.setItem('gitUseEnhancedInterface', JSON.stringify(checked));
  };

  const handleViewDiff = (file) => {
    setSelectedFile(file);
    setShowDiffViewer(true);
  };

  return (
    <Layout>
      <div className="git-page" style={{ padding: '24px' }}>
        {/* Interface Toggle Header */}
        <div className="git-header" style={{ marginBottom: '24px' }}>
          <Card size="small">
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <RepositoryManager compact={true} />
                </Space>
              </Col>
              <Col>
                <Space>
                  <Text type="secondary">Interface:</Text>
                  <Switch
                    checkedChildren={<RocketOutlined />}
                    unCheckedChildren={<CodeOutlined />}
                    checked={useEnhancedInterface}
                    onChange={handleInterfaceToggle}
                    style={{ marginLeft: '8px' }}
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {useEnhancedInterface ? 'Enhanced' : 'Classic'}
                  </Text>
                </Space>
              </Col>
            </Row>
          </Card>
        </div>

        {/* Main Git Interface */}
        {currentRepository ? (
          useEnhancedInterface ? (
            /* Enhanced Git Client Interface */
            <GitClient />
          ) : (
            /* Classic Git Interface (Original) */
            <Row gutter={[24, 24]}>
              {/* Git Operations - Main Panel */}
              <Col span={showDiffViewer ? 12 : 24}>
                <GitOperations onViewDiff={handleViewDiff} />
              </Col>
              
              {/* Diff Viewer - Side Panel (when active) */}
              {showDiffViewer && (
                <Col span={12}>
                  <Card
                    title="File Differences"
                    extra={
                      <a onClick={() => setShowDiffViewer(false)}>Close</a>
                    }
                    size="small"
                  >
                    <DiffViewer 
                      file={selectedFile}
                      compact={true}
                      showFileSelector={true}
                    />
                  </Card>
                </Col>
              )}
            </Row>
          )
        ) : (
          /* No Repository Selected State */
          <div className="no-repository-state">
            <Card>
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }}>
                  📁
                </div>
                <Title level={3} style={{ color: '#666', marginBottom: '8px' }}>
                  No Git Repository Selected
                </Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
                  Add a repository using the controls above to start managing your Git workflow
                </Text>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default GitPage; 