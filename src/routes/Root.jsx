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
import DocsPage from '../pages/DocsPage/DocsPage';
import ChartPage from '../pages/ChartPage/ChartPage';
import GitPage from '../pages/Git/GitPage';
import Analytics from '../pages/Analytics/Analytics';
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
          <Route path="/git" element={<GitPage />} />
          <Route path="/git/:name" element={<GitPage />} />
          <Route path="/projectSettings/:name" element={<ProjectSettings />} />
          <Route path="/settings" element={<AppSettings />} />
          <Route path="/docs/:name" element={<DocsPage />} />
          <Route path="/game/:name" element={<Game />} />
          <Route path="/analytics" element={<Analytics />} />
          {/* Default 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </GitProvider>
  );
}

export default AppRoutes;
