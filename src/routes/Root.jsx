import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
// Pages
import Dashboard from '../pages/Dashboard/Dashboard';
import ProjectPage from '../pages/ProjectPage/ProjectPage';
import NotFound from '../pages/NotFound/NotFound';
import ProjectSettings from '../pages/ProjectSettings/ProjectSettings';
import SheetPage from '../pages/SheetPage/SheetPage';

function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        {/* Use element with JSX in React Router v6 */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projectPage/:name" element={<ProjectPage />} />
        <Route path="/sheets/:name" element={<SheetPage />} />
        <Route path="/projectSettings/:name" element={<ProjectSettings />} />
        {/* Default 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}

export default AppRoutes;
