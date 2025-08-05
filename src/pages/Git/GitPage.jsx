import React, { useState } from 'react';
import { Row, Col, Card } from 'antd';
import Layout from '../../layouts/App';
import RepositoryManager from '../../components/Git/RepositoryManager/RepositoryManager';
import GitOperations from '../../components/Git/GitOperations/GitOperations';
import DiffViewer from '../../components/Git/DiffViewer/DiffViewer';
import { useGit } from '../../contexts/GitContext';
import './GitPage.scss';

function GitPage() {
  const { currentRepository } = useGit();
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleViewDiff = (file) => {
    setSelectedFile(file);
    setShowDiffViewer(true);
  };

  return (
    <Layout>
      <div className="git-page" style={{ padding: '24px' }}>
        {/* Repository Management Header */}
        <div className="git-header" style={{ marginBottom: '24px' }}>
          <RepositoryManager compact={true} />
        </div>

        {/* Main Git Interface */}
        {currentRepository ? (
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
        ) : (
          /* No Repository Selected State */
          <div className="no-repository-state">
            <Card>
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }}>
                  📁
                </div>
                <h3 style={{ color: '#666', marginBottom: '8px' }}>
                  No Git Repository Selected
                </h3>
                <p style={{ color: '#999', marginBottom: '24px' }}>
                  Add a repository using the controls above to start managing your Git workflow
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default GitPage; 