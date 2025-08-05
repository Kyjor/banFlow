import React from 'react';
import Layout from '../../layouts/App';
import RepositoryManager from '../../components/Git/RepositoryManager/RepositoryManager';

function GitRepositoriesPage() {
  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <RepositoryManager />
      </div>
    </Layout>
  );
}

export default GitRepositoriesPage; 