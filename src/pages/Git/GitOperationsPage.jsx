import React from 'react';
import Layout from '../../layouts/App';
import GitOperations from '../../components/Git/GitOperations/GitOperations';

function GitOperationsPage() {
  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <GitOperations />
      </div>
    </Layout>
  );
}

export default GitOperationsPage; 