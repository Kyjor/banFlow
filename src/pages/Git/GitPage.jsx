import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../layouts/App';
import { useGit } from '../../contexts/GitContext';
import GitClient from '../../components/Git/GitClient/GitClient';
import './GitPage.scss';

function decodeProjectName(raw) {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.replace(/[@]/g, '/'));
  } catch {
    return raw.replace(/[@]/g, '/');
  }
}

function GitPage() {
  const { name: routeProject } = useParams();
  const { loadProjectRepositories, loadGlobalRepositories } = useGit();

  useEffect(() => {
    const projectName = decodeProjectName(routeProject);
    if (projectName) {
      localStorage.setItem('currentProject', projectName);
    }
  }, [routeProject]);

  useEffect(() => {
    const loadRepositories = async () => {
      try {
        const projectName = decodeProjectName(routeProject);
        if (projectName) {
          await loadProjectRepositories(projectName);
        } else {
          await loadGlobalRepositories();
        }
      } catch (error) {
        console.error('Failed to load git repositories:', error);
      }
    };

    loadRepositories();
  }, [loadProjectRepositories, loadGlobalRepositories, routeProject]);

  return (
    <Layout>
      <div className="git-page">
        <GitClient />
      </div>
    </Layout>
  );
}

export default GitPage;
