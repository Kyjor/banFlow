import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
// Pages
import Dashboard from '../pages/Dashboard/Dashboard';
import ProjectPage from '../pages/ProjectPage/ProjectPage';
import NotFound from '../pages/NotFound/NotFound';
import ProjectSettings from '../pages/ProjectSettings/ProjectSettings';
import AppSettings from '../pages/AppSettings/AppSettings';
import SheetPage from '../pages/SheetPage/SheetPage';
import Game from '../pages/Game/Game';
import TextEditor from '../components/TextEditor/TextEditor';
import ChartPage from '../components/ChartPage/ChartPage';
import GitRepositoriesPage from '../pages/Git/GitRepositoriesPage';
import GitOperationsPage from '../pages/Git/GitOperationsPage';
// Context
import { GitProvider } from '../contexts/GitContext';

function AppRoutes() {
  return (
    <GitProvider>
      <HashRouter>
        <Routes>
          {/* Use element with JSX in React Router v6 */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projectPage/:name" element={<ProjectPage />} />
          <Route path="/sheets/:name" element={<SheetPage />} />
          <Route path="/charts/:name" element={<ChartPage />} />
          <Route path="/git/repositories" element={<GitRepositoriesPage />} />
          <Route path="/git/operations" element={<GitOperationsPage />} />
          <Route path="/projectSettings/:name" element={<ProjectSettings />} />
          <Route path="/settings" element={<AppSettings />} />
          <Route path="/docs/:name" element={<TextEditor />} />
          <Route path="/game/:name" element={<Game />} />
          {/* Default 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </GitProvider>
  );
}

export default AppRoutes;
