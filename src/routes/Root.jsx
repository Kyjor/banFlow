import React from 'react';
import { HashRouter, Outlet, Route, Routes, useParams } from 'react-router-dom';
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
// Context — only wrap Git UI so heartbeat/state updates do not re-render the whole app (e.g. App Settings).
import { GitProvider } from '../contexts/GitContext';

function decodeGitRouteProject(name) {
  if (!name) return null;
  try {
    return decodeURIComponent(name.replace(/[@]/g, '/'));
  } catch {
    return name.replace(/[@]/g, '/');
  }
}

function GitRoutesLayout() {
  const { name } = useParams();
  const scopeKey = decodeGitRouteProject(name) ?? '__global__';
  return (
    <GitProvider key={scopeKey}>
      <Outlet />
    </GitProvider>
  );
}

function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<GitRoutesLayout />}>
          <Route path="/git" element={<GitPage />} />
          <Route path="/git/:name" element={<GitPage />} />
        </Route>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projectPage/:name" element={<ProjectPage />} />
        <Route path="/sheets/:name" element={<SheetPage />} />
        <Route path="/charts/:name" element={<ChartPage />} />
        <Route path="/projectSettings/:name" element={<ProjectSettings />} />
        <Route path="/settings" element={<AppSettings />} />
        <Route path="/docs/:name" element={<DocsPage />} />
        <Route path="/game/:name" element={<Game />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}

export default AppRoutes;
