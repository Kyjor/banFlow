import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
// Pages
import Dashboard from '../pages/Dashboard/Dashboard';
import ProjectPage from '../pages/ProjectPage/ProjectPage';
import NotFound from '../pages/NotFound/NotFound';
import ProjectSettings from '../pages/ProjectSettings/ProjectSettings';
import SheetPage from '../pages/SheetPage/SheetPage';
import Game from '../pages/Game/Game';
import TextEditor from '../components/TextEditor/TextEditor';
import ChartPage from '../components/ChartPage/ChartPage';

function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        {/* Use element with JSX in React Router v6 */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projectPage/:name" element={<ProjectPage />} />
        <Route path="/sheets/:name" element={<SheetPage />} />
        <Route path="/charts/:name" element={<ChartPage />} />
        <Route path="/projectSettings/:name" element={<ProjectSettings />} />
        <Route path="/docs/:name" element={<TextEditor />} />
        <Route path="/game/:name" element={<Game />} />
        {/* Default 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}

export default AppRoutes;
