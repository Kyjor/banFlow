import React, { useEffect } from 'react';
import Layout from '../../layouts/App';
import { useGit } from '../../contexts/GitContext';
import GitClient from '../../components/Git/GitClient/GitClient';
import './GitPage.scss';

function GitPage() {
  const { loadProjectRepositories } = useGit();

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

  return (
    <Layout>
      <div className="git-page">
        <GitClient />
      </div>
    </Layout>
  );
}

export default GitPage; 